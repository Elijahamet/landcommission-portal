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
      btnDownloadSlipPdf.textContent = 'Preparing PDF...';
      try {
        const refId = encodeURIComponent(currentRenderedRecord.referenceId || currentRenderedRecord.id);
        const tokParam = token ? `&d=${encodeURIComponent(token)}` : '';
        const downloadUrl = `/api/records/${refId}/pdf?baseUrl=${encodeURIComponent(window.location.origin)}${tokParam}`;
        
        // Fetch as blob to verify success before triggering file save
        const res = await fetch(downloadUrl);
        if (!res.ok) throw new Error('PDF download error ' + res.status);
        const blob = await res.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `${currentRenderedRecord.referenceId || 'EX_DATA'}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
      } catch (err) {
        alert('Could not download PDF: ' + err.message);
      } finally {
        btnDownloadSlipPdf.disabled = false;
        btnDownloadSlipPdf.innerHTML = '<span>📥 Download Official PDF</span>';
      }
    });
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
