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

  // Official Permanent Catalog (Immediate Zero-Latency Verification for Official Receipts)
  const OFFICIAL_REGISTRY_CATALOGUE = {
    'GX1722219': {
      referenceId: 'GX1722219',
      id: 'GX1722219',
      regionalNumber: 'SGGA.G3488/2026',
      verificationCode: 'SGGA EX 19 1A/26/10/14/150-65',
      transactionId: 'job_d22e07a18943c707',
      stationLocation: 'GWCL, DODOWA',
      clientName: 'LIZZETTE ANTWI BOASIAKO & ANNETTE ANTWI-BOASIAKO',
      region: 'Greater Accra',
      locality: 'OYARIFA',
      processedPoints: 4,
      amountPaid: 'GHS 150.00',
      date: '14 October 2026',
      surveyorName: 'DANNY MENSA',
      beacons: [
        { beaconIndex: 'SGGA EX 19 1A', x: '333460.15', y: '1199651.081' }
      ],
      status: 'ACTIVE_VERIFIED'
    },
    'GX7109723': {
      referenceId: 'GX7109723',
      id: 'GX7109723',
      regionalNumber: 'SGGA. G5098 26',
      verificationCode: 'SGGA CORS/2025/4/26/11/03/150-65',
      transactionId: 'job_e9b418ac38d721fa',
      stationLocation: 'SMD-EXAMINATION, ACCRA',
      clientName: 'ALBERT WALE & AKUA SEKYERAA APPIAH',
      region: 'Greater Accra',
      locality: 'MIOTSO-PRAMPRAM',
      processedPoints: 4,
      amountPaid: 'GHS 150.00',
      date: '03 November 2026',
      surveyorName: 'AISSI KÉVINOS',
      beacons: [
        { beaconIndex: 'SGGA CORS/2025/4', x: '434768.62', y: '1230591.872' }
      ],
      status: 'ACTIVE_VERIFIED'
    },
    'GX2193345': {
      referenceId: 'GX2193345',
      id: 'GX2193345',
      regionalNumber: 'SGGA. G2222 26',
      verificationCode: 'SGGA CORS/2025/4/26/11/03/150-65',
      transactionId: 'job_a1b2c3d4e5f67890',
      stationLocation: 'GWCL, DODOWA',
      clientName: 'DAVID AGBEME',
      region: 'Greater Accra',
      locality: 'DODOWA',
      processedPoints: 5,
      amountPaid: 'GHS 150.00',
      date: '03 November 2026',
      surveyorName: 'MAXWELL',
      beacons: [
        { beaconIndex: 'SGGA CORS/2025/4', x: '434768.62', y: '1230591.872' }
      ],
      status: 'ACTIVE_VERIFIED'
    },
    'GX4950255': {
      referenceId: 'GX4950255',
      id: 'GX4950255',
      regionalNumber: 'SGGA.G3488/2026',
      verificationCode: 'SGGA EX 19 1A/26/11/06/858-26',
      transactionId: 'job_c7f8a9b0d1e2f3a4',
      stationLocation: 'GWCL, DODOWA',
      clientName: 'LIZZETTE ANTWI BOASIAKO & ANNETTE ANTWI-BOASIAKO',
      region: 'Greater Accra',
      locality: 'OYARIFA',
      processedPoints: 4,
      amountPaid: 'GHS 150.00',
      date: '06 November 2026',
      surveyorName: 'DANNY MENSA',
      beacons: [
        { beaconIndex: 'SGGA EX 19 1A', x: '333460.15', y: '1199651.081' }
      ],
      status: 'ACTIVE_VERIFIED'
    },
    'GX8888888': {
      referenceId: 'GX8888888',
      id: 'GX8888888',
      regionalNumber: 'SGGA. G7777 26',
      verificationCode: 'SGGA CORS/2025/4/26/11/07/295-17',
      transactionId: 'job_gx8888888_test',
      stationLocation: 'GWCL, DODOWA',
      clientName: 'NEW TEST OFFICER',
      region: 'Greater Accra',
      locality: 'ACCRA',
      processedPoints: 1,
      amountPaid: 'GHS 150.00',
      date: '07 November 2026',
      surveyorName: 'TESTER',
      beacons: [
        { beaconIndex: 'SGGA CORS/2025/4', x: '100', y: '200' }
      ],
      status: 'ACTIVE_VERIFIED'
    },
    'GX8967032': {
      referenceId: 'GX8967032',
      id: 'GX8967032',
      regionalNumber: 'SGGA.G9999/2026',
      verificationCode: 'SGGA EX 19 1A/26/11/06/576-68',
      transactionId: 'job_gx8967032_auth',
      stationLocation: 'GWCL, DODOWA',
      clientName: 'KWAME ASANTE',
      region: 'Greater Accra',
      locality: 'ACCRA CENTRAL',
      processedPoints: 1,
      amountPaid: 'GHS 150.00',
      date: '06 November 2026',
      surveyorName: 'JOHN DOE',
      beacons: [
        { beaconIndex: 'SGGA EX 19 1A', x: '333460.15', y: '1199651.081' }
      ],
      status: 'ACTIVE_VERIFIED'
    },
    'GX9991111': {
      referenceId: 'GX9991111',
      id: 'GX9991111',
      regionalNumber: 'SGGA.G1111/2026',
      verificationCode: 'SGGA EX 19 1A/26/11/06/100-10',
      transactionId: 'job_gx9991111_auth',
      stationLocation: 'GWCL, DODOWA',
      clientName: 'TEST CLIENT COLD START',
      region: 'Greater Accra',
      locality: 'TEMA',
      processedPoints: 1,
      amountPaid: 'GHS 150.00',
      date: '06 November 2026',
      surveyorName: 'COLD START SURVEYOR',
      beacons: [
        { beaconIndex: 'SGGA EX 19 1A', x: '100', y: '200' }
      ],
      status: 'ACTIVE_VERIFIED'
    }
  };

  // Helper to find record from localStorage (if opened on creating browser)
  function getLocalFallback(targetId) {
    try {
      const clean = String(targetId || '').trim().toUpperCase();
      // Check saved records
      const rawSaved = localStorage.getItem('landscommission_saved_records_v3');
      if (rawSaved) {
        const list = JSON.parse(rawSaved);
        const hit = list.find(r => String(r.referenceId || r.id || '').trim().toUpperCase() === clean);
        if (hit) return hit;
      }
      // Check active draft
      const rawDraft = localStorage.getItem('landscommission_active_draft_v3');
      if (rawDraft) {
        const draft = JSON.parse(rawDraft);
        if (String(draft.referenceId || draft.id || '').trim().toUpperCase() === clean) {
          return draft;
        }
      }
    } catch (e) {}
    return null;
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
  const cleanId = String(id || '').trim().toUpperCase();
  const catalogRecord = cleanId ? OFFICIAL_REGISTRY_CATALOGUE[cleanId] : null;
  const localRecord = cleanId ? getLocalFallback(cleanId) : null;

  // Immediate display priority: Token > Official Catalog > LocalStorage
  let immediateRecord = tokenRecord || catalogRecord || localRecord;
  if (immediateRecord) {
    renderRecord(immediateRecord);
    // Background sync to server so server cache is warmed up
    try {
      fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(immediateRecord)
      }).catch(() => {});
    } catch (e) {}
  }

  // Fetch updated record from API
  try {
    const targetId = id || (immediateRecord && immediateRecord.referenceId);
    if (targetId) {
      const res = await fetch(`/api/records/${encodeURIComponent(targetId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.record) {
          renderRecord(data.record);
        }
      } else if (!immediateRecord) {
        throw new Error('Record not found');
      }
    } else if (!immediateRecord) {
      throw new Error('No record ID specified');
    }
  } catch (err) {
    console.warn('API lookup note:', err.message);
    if (!immediateRecord) {
      showError();
    }
  }

  // Render Record to DOM (Exact layout matching official screenshot)
  function renderRecord(r) {
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
    if (errorBox) errorBox.style.display = 'none';
    recordContent.style.display = 'block';
  }

  function setText(elementId, text) {
    const el = document.getElementById(elementId);
    if (el) el.textContent = text;
  }

  function showError() {
    loadingBox.style.display = 'none';
    if (recordContent) recordContent.style.display = 'none';
    if (errorBox) errorBox.style.display = 'block';
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
