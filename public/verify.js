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
      const decodedStr = decodeURIComponent(escape(window.atob(b64)));
      
      // 1. Pipe-delimited compact string: client|reg|vcode|loc|st|date|surv|pts|bx|by|beaconIndex|refId|amount|region
      if (decodedStr.includes('|')) {
        const parts = decodedStr.split('|');
        const cRef = parts[11] || id;
        return {
          referenceId: cRef,
          id: cRef,
          clientName: parts[0] || '',
          regionalNumber: parts[1] || '',
          verificationCode: parts[2] || '',
          locality: parts[3] || '',
          stationLocation: parts[4] || 'GWCL, DODOWA',
          date: parts[5] || '03 November 2026',
          surveyorName: parts[6] || '',
          processedPoints: parseInt(parts[7] || '4', 10),
          beacons: [{
            beaconIndex: parts[10] || 'SGGA CORS/2025/4',
            x: parts[8] || '434768.62',
            y: parts[9] || '1230591.872'
          }],
          amountPaid: parts[12] || 'GHS 150.00',
          region: parts[13] || 'Greater Accra',
          transactionId: `job_${cRef.toLowerCase()}${Math.floor(1000 + Math.random() * 9000)}`,
          status: 'ACTIVE_VERIFIED'
        };
      }

      // 2. JSON array or object
      const p = JSON.parse(decodedStr);
      if (Array.isArray(p)) {
        const cRef = p[11] || id;
        return {
          referenceId: cRef,
          id: cRef,
          clientName: p[0] || '',
          regionalNumber: p[1] || '',
          verificationCode: p[2] || '',
          locality: p[3] || '',
          stationLocation: p[4] || 'GWCL, DODOWA',
          date: p[5] || '03 November 2026',
          surveyorName: p[6] || '',
          processedPoints: parseInt(p[7] || '4', 10),
          beacons: [{
            beaconIndex: p[10] || 'SGGA CORS/2025/4',
            x: p[8] || '434768.62',
            y: p[9] || '1230591.872'
          }],
          amountPaid: p[12] || 'GHS 150.00',
          region: p[13] || 'Greater Accra',
          transactionId: `job_${cRef.toLowerCase()}${Math.floor(1000 + Math.random() * 9000)}`,
          status: 'ACTIVE_VERIFIED'
        };
      }

      return {
        referenceId: p.ref || id,
        id: p.ref || id,
        clientName: p.client,
        regionalNumber: p.reg,
        verificationCode: p.vcode,
        locality: p.loc,
        region: p.region || 'Greater Accra',
        processedPoints: p.pts || 4,
        amountPaid: p.amt || 'GHS 150.00',
        date: p.date || '03 November 2026',
        surveyorName: p.surv,
        transactionId: p.tx || `job_${(p.ref || id).toLowerCase()}${Math.floor(1000 + Math.random() * 9000)}`,
        beacons: p.b || [{ beaconIndex: 'SGGA CORS/2025/4', x: '434768.62', y: '1230591.872' }],
        stationLocation: p.st || p.stationLocation || 'GWCL, DODOWA',
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
    setText('valStationLocation', r.stationLocation || 'GWCL, DODOWA');

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
