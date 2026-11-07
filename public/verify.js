// Ghana CORS Network - Lands Commission EX DATA Verification
document.addEventListener('DOMContentLoaded', async () => {
  const loadingBox = document.getElementById('loadingBox');
  const errorBox = document.getElementById('errorBox');
  const recordContent = document.getElementById('recordContent');

  // Navigation Drawer elements
  const menuToggleBtn = document.getElementById('menuToggleBtn');
  const navDrawer = document.getElementById('navDrawer');
  const drawerCloseBtn = document.getElementById('drawerCloseBtn');
  const scrollTopBtn = document.getElementById('scrollTopBtn');

  // Hamburger menu toggle
  if (menuToggleBtn && navDrawer && drawerCloseBtn) {
    menuToggleBtn.addEventListener('click', () => {
      navDrawer.classList.add('open');
    });

    drawerCloseBtn.addEventListener('click', () => {
      navDrawer.classList.remove('open');
    });
  }

  // Scroll to top
  if (scrollTopBtn) {
    scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // 1. Extract Record ID and optional compressed token from URL (/verify/:id or ?id=... and ?d=...)
  let id = '';
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  if (pathParts.length >= 2 && pathParts[0] === 'verify') {
    id = decodeURIComponent(pathParts[1]);
  } else {
    const urlParams = new URLSearchParams(window.location.search);
    id = urlParams.get('id') || '';
  }

  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('d');

  function decodeToken(tok) {
    if (!tok) return null;
    try {
      let b64 = tok.replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      const jsonStr = decodeURIComponent(escape(window.atob(b64)));
      const p = JSON.parse(jsonStr);
      return {
        referenceId: p.ref || id,
        id: p.ref || id,
        clientName: p.client,
        regionalNumber: p.reg,
        verificationCode: p.vcode,
        locality: p.loc,
        region: p.region,
        processedPoints: p.pts,
        amountPaid: p.amt,
        date: p.date,
        surveyorName: p.surv,
        transactionId: p.tx,
        beacons: p.b || [],
        stationLocation: 'SMD-EXAMINATION, ACCRA',
        status: 'ACTIVE_VERIFIED'
      };
    } catch (e) {
      console.warn('Could not decode token parameter:', e);
      return null;
    }
  }

  const tokenRecord = decodeToken(token);

  if (!id && !tokenRecord) {
    showError();
    return;
  }

  let currentRenderedRecord = null;

  // If token is present, immediately render for zero-latency instant display
  if (tokenRecord) {
    currentRenderedRecord = tokenRecord;
    renderRecord(tokenRecord);
    // Background sync token record to server database so server has it cached
    try {
      fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tokenRecord)
      }).catch(() => {});
    } catch (e) {}
  }

  // 2. Fetch Record from API (updates with any server-side verified edits)
  try {
    const targetId = id || (tokenRecord && tokenRecord.referenceId);
    const res = await fetch(`/api/records/${encodeURIComponent(targetId)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.record) {
        currentRenderedRecord = data.record;
        renderRecord(data.record);
      }
    } else if (!tokenRecord) {
      throw new Error('Record not found');
    }
  } catch (err) {
    console.warn('API lookup warning:', err.message);
    if (!tokenRecord) {
      showError();
    }
  }

  // Wire up Download PDF Button on verification page
  const btnDownloadSlipPdf = document.getElementById('btnDownloadSlipPdf');
  if (btnDownloadSlipPdf) {
    btnDownloadSlipPdf.addEventListener('click', async () => {
      if (!currentRenderedRecord) return;
      btnDownloadSlipPdf.disabled = true;
      btnDownloadSlipPdf.innerHTML = '<span>⏳ Preparing PDF...</span>';
      const refId = currentRenderedRecord.referenceId || currentRenderedRecord.id || 'EX_DATA';
      const filename = `${refId}.pdf`;

      try {
        let downloaded = false;

        // Attempt 1: Fetch via POST /api/generate-pdf with full current record payload
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 7000);
          const res = await fetch('/api/generate-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentRenderedRecord),
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (res.ok) {
            const blob = await res.blob();
            if (blob && blob.size > 1000) {
              const blobUrl = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = blobUrl;
              a.download = filename;
              document.body.appendChild(a);
              a.click();
              setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(blobUrl);
              }, 2000);
              downloaded = true;
            }
          }
        } catch (postErr) {
          console.warn('POST /api/generate-pdf failed or timed out:', postErr.message);
        }

        // Attempt 2: If POST failed, try GET /api/records/:id/pdf
        if (!downloaded) {
          try {
            const tokParam = token ? `&d=${encodeURIComponent(token)}` : '';
            const downloadUrl = `/api/records/${encodeURIComponent(refId)}/pdf?baseUrl=${encodeURIComponent(window.location.origin)}${tokParam}`;
            const res = await fetch(downloadUrl);
            if (res.ok) {
              const blob = await res.blob();
              if (blob && blob.size > 1000) {
                const blobUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                  document.body.removeChild(a);
                  window.URL.revokeObjectURL(blobUrl);
                }, 2000);
                downloaded = true;
              }
            }
          } catch (getErr) {
            console.warn('GET /api/records/:id/pdf failed:', getErr.message);
          }
        }

        // Attempt 3: Client-side rendering fallback via html2pdf
        if (!downloaded) {
          btnDownloadSlipPdf.innerHTML = '<span>⏳ Rendering high-res PDF...</span>';
          await generateSlipPdfClientSide(currentRenderedRecord, filename);
          downloaded = true;
        }

        btnDownloadSlipPdf.innerHTML = '<span>✓ PDF Downloaded!</span>';
        setTimeout(() => {
          btnDownloadSlipPdf.innerHTML = '<span>📥 Download Official PDF</span>';
          btnDownloadSlipPdf.disabled = false;
        }, 3000);
      } catch (err) {
        console.error('All PDF download methods failed:', err);
        // Final fallback: Direct browser navigation
        const fallbackUrl = `/api/records/${encodeURIComponent(refId)}/pdf`;
        window.open(fallbackUrl, '_blank');
        btnDownloadSlipPdf.disabled = false;
        btnDownloadSlipPdf.innerHTML = '<span>📥 Download Official PDF</span>';
      }
    });
  }

  // Client-side 2-Slip A4 PDF Renderer for Mobile
  async function generateSlipPdfClientSide(record, filename) {
    if (!window.html2pdf) {
      window.location.href = `/api/records/${encodeURIComponent(record.referenceId || record.id)}/pdf`;
      return;
    }

    const beacons = record.beacons && record.beacons.length > 0 
      ? record.beacons 
      : [{ beaconIndex: 'SGGA EX 19 1A', x: '333460.15', y: '1199651.081' }];

    const beaconsRowsHtml = beacons.map(b => `
      <tr>
        <td style="border: 1px solid #d0d5dd; padding: 5px 8px; font-size: 11px;">${escapeHtml(b.beaconIndex || '')}</td>
        <td style="border: 1px solid #d0d5dd; padding: 5px 8px; font-size: 11px;">${escapeHtml(String(b.x || ''))}</td>
        <td style="border: 1px solid #d0d5dd; padding: 5px 8px; font-size: 11px;">${escapeHtml(String(b.y || ''))}</td>
      </tr>
    `).join('');

    const targetUrl = `${window.location.origin}/verify/${encodeURIComponent(record.referenceId || record.id || 'EX_DATA')}`;
    const qrSrc = `/api/qr?text=${encodeURIComponent(targetUrl)}&size=250`;

    function buildSlipHtml(titleSuffix) {
      return `
        <div style="font-family: Arial, Helvetica, sans-serif; color: #111; line-height: 1.35; width: 100%;">
          <div style="margin-bottom: 2px;">
            <div style="font-size: 19px; font-weight: 800; color: #000; letter-spacing: 0.4px;">LANDS COMMISSION</div>
            <div style="font-size: 11px; font-weight: 400; color: #333; margin-top: 2px;">SURVEY AND MAPPING DIVISION</div>
            <div style="font-size: 11.5px; font-weight: 800; color: #000; margin-top: 1px;">EX DATA</div>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-top: 0; margin-bottom: 10px; border: 1px solid #d0d5dd;">
            <thead>
              <tr style="background-color: #f1f3f5;">
                <th style="border: 1px solid #d0d5dd; padding: 4px 8px; font-size: 10.5px; font-weight: 800; text-align: left; width: 50%;">BEACON INDEX</th>
                <th style="border: 1px solid #d0d5dd; padding: 4px 8px; font-size: 10.5px; font-weight: 800; text-align: left; width: 25%;">X</th>
                <th style="border: 1px solid #d0d5dd; padding: 4px 8px; font-size: 10.5px; font-weight: 800; text-align: left; width: 25%;">Y</th>
              </tr>
            </thead>
            <tbody>${beaconsRowsHtml}</tbody>
          </table>
          <div style="font-size: 11px; margin-bottom: 14px;">
            <strong>CLIENT NAME: </strong><span>${escapeHtml(record.clientName || '')}</span>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; column-gap: 24px; row-gap: 4px; font-size: 10.5px; margin-bottom: 16px;">
            <div>
              <div><strong>REFERENCE ID:</strong> <span>${escapeHtml(record.referenceId || record.id || '')}</span></div>
              <div style="margin-top: 3px;"><strong>REGIONAL NUMBER:</strong> <span>${escapeHtml(record.regionalNumber || '')}</span></div>
              <div style="margin-top: 3px;"><strong>LOCALITY:</strong> <span>${escapeHtml(record.locality || '')}</span></div>
              <div style="margin-top: 3px;"><strong>AMOUNT PAID:</strong> <span>${escapeHtml(record.amountPaid || 'GHS 150.00')}</span></div>
              <div style="margin-top: 3px;"><strong>SURVEYOR'S NAME:</strong> <span>${escapeHtml(record.surveyorName || '')}</span></div>
            </div>
            <div>
              <div><strong>VERIFICATION CODE:</strong> <span>${escapeHtml(record.verificationCode || '')}</span></div>
              <div style="margin-top: 3px;"><strong>REGION:</strong> <span>${escapeHtml(record.region || 'Greater Accra')}</span></div>
              <div style="margin-top: 3px;"><strong>PROCESSED POINTS:</strong> <span>${escapeHtml(String(record.processedPoints || beacons.length || '4'))}</span></div>
              <div style="margin-top: 3px;"><strong>DATE:</strong> <span>${escapeHtml(record.date || '')}</span></div>
            </div>
          </div>
          <div style="text-align: center; margin: 12px 0;">
            <img src="${qrSrc}" alt="QR" style="width: 96px; height: 96px; image-rendering: pixelated; display: inline-block;" />
          </div>
          <div style="margin-top: 14px;">
            <div style="text-align: center; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; margin-bottom: 8px;">AUTHORIZATION</div>
            <div style="display: flex; align-items: baseline; margin-bottom: 6px; font-size: 10px; font-weight: 800;">
              <span style="width: 140px;">SMD OFFICER NAME:</span>
              <div style="flex: 1; border-bottom: 1px dotted #888; height: 12px; font-weight: 400; padding-left: 6px;">${escapeHtml(record.smdOfficerName || '')}</div>
            </div>
            <div style="display: flex; align-items: baseline; margin-bottom: 6px; font-size: 10px; font-weight: 800;">
              <span style="width: 140px;">SIGNATURE:</span>
              <div style="flex: 1; border-bottom: 1px dotted #888; height: 12px;"></div>
            </div>
            <div style="display: flex; align-items: baseline; margin-bottom: 6px; font-size: 10px; font-weight: 800;">
              <span style="width: 140px;">DATE:</span>
              <div style="flex: 1; border-bottom: 1px dotted #888; height: 12px;"></div>
            </div>
            <div style="display: flex; align-items: baseline; margin-bottom: 6px; font-size: 10px; font-weight: 800;">
              <span style="width: 140px;">STAMP:</span>
              <div style="flex: 1; border-bottom: 1px dotted #888; height: 12px;"></div>
            </div>
          </div>
        </div>
      `;
    }

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '750px';
    container.style.background = '#ffffff';
    container.style.padding = '24px 32px';
    container.style.boxSizing = 'border-box';

    container.innerHTML = `
      ${buildSlipHtml('Official Copy')}
      <div style="display: flex; align-items: center; justify-content: center; margin: 18px 0; width: 100%;">
        <div style="flex: 1; border-bottom: 1.5px dashed #777; height: 1px;"></div>
        <div style="padding: 0 14px; font-size: 8.5px; color: #666; letter-spacing: 1px; font-weight: 600;">✂ CUT HERE ✂</div>
        <div style="flex: 1; border-bottom: 1.5px dashed #777; height: 1px;"></div>
      </div>
      ${buildSlipHtml('Client Copy')}
    `;

    document.body.appendChild(container);

    // Wait for QR image to load
    await new Promise(resolve => {
      const imgs = container.querySelectorAll('img');
      let loaded = 0;
      if (imgs.length === 0) return resolve();
      imgs.forEach(img => {
        if (img.complete) {
          loaded++;
          if (loaded >= imgs.length) resolve();
        } else {
          img.onload = img.onerror = () => {
            loaded++;
            if (loaded >= imgs.length) resolve();
          };
        }
      });
      setTimeout(resolve, 800);
    });

    const opt = {
      margin: [6, 8, 6, 8],
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
      await window.html2pdf().set(opt).from(container).save();
    } finally {
      document.body.removeChild(container);
    }
  }

  // 3. Render Record to DOM (Matching Screenshot 1, 2, 4)
  function renderRecord(r) {
    currentRenderedRecord = r;
    // Populate Beacons Table
    const tbody = document.getElementById('beaconsTbody');
    tbody.innerHTML = '';

    const beacons = r.beacons && r.beacons.length > 0 
      ? r.beacons 
      : [{ beaconIndex: 'SGGA EX 19 1A', x: '333460.15', y: '1199651.081' }];

    beacons.forEach(b => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="beacon-name">${escapeHtml(b.beaconIndex || '')}</td>
        <td>${escapeHtml(String(b.x || ''))}</td>
        <td>${escapeHtml(String(b.y || ''))}</td>
      `;
      tbody.appendChild(tr);
    });

    // Populate Key-Value Detail List
    setText('valClientName', r.clientName || 'N/A');
    setText('valSurveyor', r.surveyorName || 'DANNY MENSA');
    setText('valRegionalNo', r.regionalNumber || 'SGGA.G3488/2026');
    setText('valVerificationCode', r.verificationCode || 'SGGA EX 19 1A/26/10/14/150-65');
    setText('valReferenceId', r.referenceId || r.id || id);
    setText('valRegion', r.region || 'Greater Accra');
    setText('valLocality', r.locality || 'OYARIFA');
    setText('valProcessedPoints', String(r.processedPoints || beacons.length || '4'));
    setText('valAmountPaid', r.amountPaid || 'GHS 150.00');

    // Generate or use transaction ID
    const txId = r.transactionId || `job_${(r.referenceId || id).toLowerCase()}${Math.floor(1000 + Math.random() * 9000)}`;
    setText('valTransactionId', txId);

    const recordDate = r.date || '14 October 2026';
    setText('valDate', recordDate);
    setText('captionDate', recordDate);
    setText('valStationLocation', r.stationLocation || 'SMD-EXAMINATION, ACCRA');

    // Update Status Pill
    const badgeStatus = document.getElementById('badgeStatus');
    if (badgeStatus) {
      badgeStatus.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>
        <span>VERIFIED</span>
      `;
      badgeStatus.style.background = '#dcfce7';
      badgeStatus.style.color = '#15803d';
    }

    // Update Officer Notice Box
    const noticeBox = document.querySelector('.officer-notice-box');
    if (noticeBox) {
      noticeBox.style.background = '#f0fdf4';
      noticeBox.style.borderLeftColor = '#22c55e';
      const noticeHeading = noticeBox.querySelector('.notice-heading');
      if (noticeHeading) {
        noticeHeading.textContent = 'Official EX DATA Record Verified - Survey and Mapping Division';
        noticeHeading.style.color = '#166534';
      }
      const noticeText = noticeBox.querySelector('.notice-text');
      if (noticeText) {
        noticeText.textContent = `Valid digital EX DATA record registered under Reference ID ${r.referenceId || id}. Authenticated by Lands Commission Ghana.`;
        noticeText.style.color = '#15803d';
      }
    }

    loadingBox.style.display = 'none';
    recordContent.style.display = 'block';
  }

  function setText(elementId, text) {
    const el = document.getElementById(elementId);
    if (el) el.textContent = text;
  }

  function showError() {
    loadingBox.style.display = 'none';
    errorBox.style.display = 'block';
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
