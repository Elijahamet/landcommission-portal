// Lands Commission EX DATA Front-End Logic
document.addEventListener('DOMContentLoaded', () => {
  // Storage Keys for 100% Persistent Local Vault (supports 1000+ documents)
  const STORAGE_KEYS = {
    ACTIVE_DRAFT: 'landscommission_active_draft_v3',
    SAVED_RECORDS: 'landscommission_saved_records_v3'
  };

  // State
  let networkInfo = { localIp: '127.0.0.1', port: 5000, lanUrl: 'http://localhost:5000' };
  let currentBeacons = [
    { beaconIndex: 'SGGA CORS/2025/4', x: '434768.62', y: '1230591.872' }
  ];
  let allRecords = [];

  // DOM Elements - Form
  const form = document.getElementById('recordForm');
  const refIdInput = document.getElementById('referenceId');
  const regionalNoInput = document.getElementById('regionalNumber');
  const vCodeInput = document.getElementById('verificationCode');
  const dateInput = document.getElementById('recordDate');
  const pointsInput = document.getElementById('processedPoints');
  const clientNameInput = document.getElementById('clientName');
  const regionSelect = document.getElementById('region');
  const localityInput = document.getElementById('locality');
  const amountInput = document.getElementById('amountPaid');
  const surveyorInput = document.getElementById('surveyorName');
  const stationLocationInput = document.getElementById('stationLocation');
  const smdOfficerInput = document.getElementById('smdOfficerName');
  const baseUrlInput = document.getElementById('baseUrlInput');
  const beaconsBody = document.getElementById('beaconsEditorBody');

  // DOM Elements - Buttons
  const btnLoadSample = document.getElementById('btnLoadSample');
  const btnNewRecord = document.getElementById('btnNewRecord');
  const btnGenRef = document.getElementById('btnGenRef');
  const btnGenVCode = document.getElementById('btnGenVCode');
  const btnAddBeacon = document.getElementById('btnAddBeaconRow');
  const btnUsePublic = document.getElementById('btnUsePublic');
  const btnUseWifiIp = document.getElementById('btnUseWifiIp');
  const btnUseLocalhost = document.getElementById('btnUseLocalhost');
  const tunnelStatusBadge = document.getElementById('tunnelStatusBadge');
  const btnSaveNewRecord = document.getElementById('btnSaveNewRecord');
  const btnSaveRecord = document.getElementById('btnSaveRecord');
  const btnDownloadPdf = document.getElementById('btnDownloadPdf');
  const btnPrintSlip = document.getElementById('btnPrintSlip');
  const btnTestVerification = document.getElementById('btnTestVerification');
  const btnToolbarDownload = document.getElementById('btnToolbarDownload');
  const btnToolbarPrint = document.getElementById('btnToolbarPrint');

  // Auto-Save UI Elements
  const autoSaveIndicator = document.getElementById('autoSaveIndicator');
  const autoSaveText = document.getElementById('autoSaveText');

  // Modals & Archive Elements
  const btnOpenRecords = document.getElementById('btnOpenRecords');
  const btnCloseRecords = document.getElementById('btnCloseRecords');
  const recordsModal = document.getElementById('recordsModal');
  const recordsListContainer = document.getElementById('recordsListContainer');
  const recordSearchInput = document.getElementById('recordSearchInput');
  const recordsCountBadge = document.getElementById('recordsCount');
  const archiveCountPill = document.getElementById('archiveCountPill');
  const btnExportRecords = document.getElementById('btnExportRecords');
  const importBackupInput = document.getElementById('importBackupInput');
  const btnImportRecordsTrigger = document.getElementById('btnImportRecordsTrigger');

  const btnOpenQrModal = document.getElementById('btnOpenQrModal');
  const btnCloseQrModal = document.getElementById('btnCloseQrModal');
  const qrAssistantModal = document.getElementById('qrAssistantModal');
  const modalQrImg = document.getElementById('modalQrImg');
  const modalQrUrlText = document.getElementById('modalQrUrlText');
  const modalIpDisplay = document.getElementById('modalIpDisplay');

  // Sample data matching official document (Image 1)
  const SAMPLE_DATA = {
    referenceId: 'GX7109723',
    regionalNumber: 'SGGA. G5098 26',
    verificationCode: 'SGGA CORS/2025/4/26/11/03/150-65',
    date: '03 November 2026',
    processedPoints: 4,
    clientName: 'ALBERT WALE & AKUA SEKYERAA APPIAH',
    region: 'Greater Accra',
    locality: 'MIOTSO-PRAMPRAM',
    stationLocation: 'GWCL, DODOWA',
    amountPaid: 'GHS 150.00',
    surveyorName: 'AISSI KÉVINOS',
    smdOfficerName: '',
    beacons: [
      { beaconIndex: 'SGGA CORS/2025/4', x: '434768.62', y: '1230591.872' }
    ]
  };

  // Helper to generate a unique Reference ID
  function generateUniqueRefId() {
    return `GX${Math.floor(1000000 + Math.random() * 9000000)}`;
  }

  // Helper to generate a unique Verification Code
  function generateVerificationCode(beaconIdx) {
    const b = beaconIdx || (currentBeacons[0] && currentBeacons[0].beaconIndex) || 'SGGA CORS/2025/4';
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const salt1 = Math.floor(100 + Math.random() * 900);
    const salt2 = Math.floor(10 + Math.random() * 90);
    return `${b}/${yy}/${mm}/${dd}/${salt1}-${salt2}`;
  }

  // Format today's date
  function getTodayString() {
    return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  // Helper to collect current form values into a clean record object
  function getCurrentFormData() {
    const refId = (refIdInput.value || '').trim() || generateUniqueRefId();
    return {
      id: refId,
      referenceId: refId,
      regionalNumber: (regionalNoInput.value || '').trim(),
      verificationCode: (vCodeInput.value || '').trim(),
      date: (dateInput.value || '').trim() || getTodayString(),
      processedPoints: parseInt(pointsInput.value, 10) || currentBeacons.length,
      clientName: (clientNameInput.value || '').trim(),
      region: regionSelect.value || 'Greater Accra',
      locality: (localityInput.value || '').trim(),
      amountPaid: (amountInput.value || 'GHS 150.00').trim(),
      surveyorName: (surveyorInput.value || '').trim(),
      stationLocation: (stationLocationInput ? stationLocationInput.value : '').trim() || 'GWCL, DODOWA',
      smdOfficerName: (smdOfficerInput.value || '').trim(),
      beacons: JSON.parse(JSON.stringify(currentBeacons)),
      baseUrl: (baseUrlInput.value || '').trim(),
      status: 'ACTIVE_VERIFIED',
      updatedAt: new Date().toISOString()
    };
  }

  // Auto-Save UI Indicator Helper
  function setAutoSaveStatus(state, msg) {
    if (!autoSaveIndicator || !autoSaveText) return;
    if (state === 'saving') {
      autoSaveIndicator.classList.add('saving');
      autoSaveText.textContent = msg || 'Auto-saving...';
    } else {
      autoSaveIndicator.classList.remove('saving');
      autoSaveText.textContent = msg || '✓ Auto-saved';
    }
  }

  // 1. Initialize Network Information
  async function initNetwork() {
    if (window.location.protocol === 'https:' || window.location.hostname.includes('vercel.app')) {
      baseUrlInput.value = window.location.origin;
      const statusEl = document.getElementById('netStatusText');
      if (statusEl) statusEl.textContent = `🌐 Vercel Production Online`;
      if (tunnelStatusBadge) {
        tunnelStatusBadge.innerHTML = `
          <span style="display: inline-block; width: 8px; height: 8px; background: #10b981; border-radius: 50%; box-shadow: 0 0 6px #10b981;"></span>
          <span><strong>Vercel Production Active:</strong> Live at ${window.location.host}! Scannable anywhere worldwide.</span>
        `;
      }
    }

    try {
      const res = await fetch('/api/network-info');
      if (res.ok) {
        networkInfo = await res.json();
        
        if (window.location.protocol === 'https:' || window.location.hostname.includes('vercel.app')) {
          baseUrlInput.value = window.location.origin;
        } else if (networkInfo.publicUrl) {
          const statusEl = document.getElementById('netStatusText');
          if (statusEl) statusEl.textContent = `🌐 Worldwide Public Online`;
          baseUrlInput.value = networkInfo.publicUrl;
          if (tunnelStatusBadge) {
            tunnelStatusBadge.innerHTML = `
              <span style="display: inline-block; width: 8px; height: 8px; background: #10b981; border-radius: 50%; box-shadow: 0 0 6px #10b981;"></span>
              <span><strong>Worldwide Public Link Active:</strong> Scannable anywhere on mobile data (4G/5G) or any Wi-Fi!</span>
            `;
          }
        } else {
          const statusEl = document.getElementById('netStatusText');
          if (statusEl) statusEl.textContent = `Connecting Public Link...`;
          baseUrlInput.value = networkInfo.lanUrl;
          pollPublicTunnel();
        }

        if (modalIpDisplay) modalIpDisplay.textContent = networkInfo.localIp;
        updateLivePreview();
      }
    } catch (e) {
      baseUrlInput.value = window.location.origin;
    }
  }

  // Poll for Cloudflare public tunnel ready (when running locally)
  function pollPublicTunnel() {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      if (attempts > 15) { clearInterval(interval); return; }
      try {
        const res = await fetch('/api/network-info');
        if (res.ok) {
          const data = await res.json();
          if (data.publicUrl) {
            networkInfo.publicUrl = data.publicUrl;
            const statusEl = document.getElementById('netStatusText');
            if (statusEl) statusEl.textContent = `🌐 Worldwide Public Online`;
            
            if (!baseUrlInput.dataset.userEdited || baseUrlInput.value === networkInfo.lanUrl || baseUrlInput.value.includes('localhost')) {
              baseUrlInput.value = data.publicUrl;
              updateLivePreview();
            }
            if (tunnelStatusBadge) {
              tunnelStatusBadge.innerHTML = `
                <span style="display: inline-block; width: 8px; height: 8px; background: #10b981; border-radius: 50%; box-shadow: 0 0 6px #10b981;"></span>
                <span><strong>Worldwide Public Link Active:</strong> Scannable anywhere on mobile data (4G/5G) or any Wi-Fi!</span>
              `;
            }
            clearInterval(interval);
          }
        }
      } catch (err) {}
    }, 1500);
  }

  // 2. Initialize a Brand New Clean Record
  function initCleanNewPerson() {
    const newRefId = generateUniqueRefId();
    const defaultBeacon = 'SGGA CORS/2025/4';
    
    refIdInput.value = newRefId;
    regionalNoInput.value = '';
    vCodeInput.value = generateVerificationCode(defaultBeacon);
    dateInput.value = getTodayString();
    pointsInput.value = '1';
    clientNameInput.value = '';
    regionSelect.value = 'Greater Accra';
    localityInput.value = '';
    amountInput.value = 'GHS 150.00';
    surveyorInput.value = '';
    if (stationLocationInput) stationLocationInput.value = 'GWCL, DODOWA';
    smdOfficerInput.value = '';

    currentBeacons = [
      { beaconIndex: defaultBeacon, x: '', y: '' }
    ];

    renderBeaconsEditor();
    updateLivePreview();
    try {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_DRAFT);
    } catch (e) {}
    setAutoSaveStatus('ready', '✓ Clean form ready');
  }

  // Load specific data into form
  function loadData(data) {
    refIdInput.value = data.referenceId || generateUniqueRefId();
    regionalNoInput.value = data.regionalNumber || '';
    vCodeInput.value = data.verificationCode || generateVerificationCode(data.beacons && data.beacons[0] ? data.beacons[0].beaconIndex : '');
    dateInput.value = data.date || getTodayString();
    pointsInput.value = data.processedPoints || (data.beacons ? data.beacons.length : 1);
    clientNameInput.value = data.clientName || '';
    regionSelect.value = data.region || 'Greater Accra';
    localityInput.value = data.locality || '';
    amountInput.value = data.amountPaid || 'GHS 150.00';
    surveyorInput.value = data.surveyorName || '';
    if (stationLocationInput) stationLocationInput.value = data.stationLocation || 'GWCL, DODOWA';
    smdOfficerInput.value = data.smdOfficerName || '';

    currentBeacons = data.beacons && data.beacons.length > 0 
      ? JSON.parse(JSON.stringify(data.beacons))
      : [{ beaconIndex: 'SGGA CORS/2025/4', x: '', y: '' }];

    renderBeaconsEditor();
    updateLivePreview();
    triggerAutoSave();
  }

  // 3. Render Beacons in Editor
  function renderBeaconsEditor() {
    beaconsBody.innerHTML = '';
    currentBeacons.forEach((b, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input type="text" class="beacon-index-input" data-index="${index}" value="${escapeHtml(b.beaconIndex || '')}" placeholder="e.g. SGGA CORS/2025/4"></td>
        <td><input type="text" class="beacon-x-input" data-index="${index}" value="${escapeHtml(String(b.x || ''))}" placeholder="e.g. 434768.62"></td>
        <td><input type="text" class="beacon-y-input" data-index="${index}" value="${escapeHtml(String(b.y || ''))}" placeholder="e.g. 1230591.872"></td>
        <td style="text-align: center;">
          ${currentBeacons.length > 1 ? `<button type="button" class="btn-remove-row" data-index="${index}" title="Remove point">&times;</button>` : ''}
        </td>
      `;
      beaconsBody.appendChild(tr);
    });

    pointsInput.value = currentBeacons.length;

    // Row input events
    beaconsBody.querySelectorAll('input').forEach(input => {
      input.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        if (e.target.classList.contains('beacon-index-input')) currentBeacons[idx].beaconIndex = e.target.value;
        if (e.target.classList.contains('beacon-x-input')) currentBeacons[idx].x = e.target.value;
        if (e.target.classList.contains('beacon-y-input')) currentBeacons[idx].y = e.target.value;
        updateLivePreview();
        triggerAutoSave();
      });
    });

    // Row remove events
    beaconsBody.querySelectorAll('.btn-remove-row').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        currentBeacons.splice(idx, 1);
        renderBeaconsEditor();
        updateLivePreview();
        triggerAutoSave();
      });
    });
  }

  // Add new beacon row
  btnAddBeacon.addEventListener('click', () => {
    const nextNum = currentBeacons.length + 1;
    currentBeacons.push({
      beaconIndex: `SGGA CORS/2025/${nextNum}`,
      x: '',
      y: ''
    });
    renderBeaconsEditor();
    updateLivePreview();
    triggerAutoSave();
  });

  // 4. Update Live Preview (Both Slip 1 and Slip 2)
  let qrDebounceTimer = null;
  function updateLivePreview() {
    const refId = refIdInput.value.trim() || 'GX-------';
    const regNo = regionalNoInput.value.trim() || '------------------';
    const vCode = vCodeInput.value.trim() || '------------------';
    const recDate = dateInput.value.trim() || getTodayString();
    const points = pointsInput.value.trim() || String(currentBeacons.length);
    const clientName = clientNameInput.value.trim() || '----------------------------------------';
    const region = regionSelect.value.trim() || 'Greater Accra';
    const locality = localityInput.value.trim() || '------------------';
    const amount = amountInput.value.trim() || 'GHS 150.00';
    const surveyor = surveyorInput.value.trim() || '------------------';
    const smdOfficer = smdOfficerInput.value.trim();

    // Update preview labels
    document.querySelectorAll('.preview-ref-id').forEach(el => el.textContent = refId);
    document.querySelectorAll('.preview-regional-no').forEach(el => el.textContent = regNo);
    document.querySelectorAll('.preview-verification-code').forEach(el => el.textContent = vCode);
    document.querySelectorAll('.preview-date').forEach(el => el.textContent = recDate);
    document.querySelectorAll('.preview-points').forEach(el => el.textContent = points);
    document.querySelectorAll('.preview-client-name').forEach(el => el.textContent = clientName);
    document.querySelectorAll('.preview-region').forEach(el => el.textContent = region);
    document.querySelectorAll('.preview-locality').forEach(el => el.textContent = locality);
    document.querySelectorAll('.preview-amount').forEach(el => el.textContent = amount);
    document.querySelectorAll('.preview-surveyor').forEach(el => el.textContent = surveyor);
    document.querySelectorAll('.preview-smd-officer').forEach(el => el.textContent = smdOfficer);

    // Beacons Table update across both slips
    document.querySelectorAll('.doc-beacons-tbody').forEach(tbody => {
      tbody.innerHTML = '';
      currentBeacons.forEach(b => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${escapeHtml(b.beaconIndex || 'SGGA CORS/2025/4')}</td>
          <td>${escapeHtml(String(b.x || '-'))}</td>
          <td>${escapeHtml(String(b.y || '-'))}</td>
        `;
        tbody.appendChild(tr);
      });
    });

    // Update QR Code with debouncing
    clearTimeout(qrDebounceTimer);
    qrDebounceTimer = setTimeout(() => {
      updateQrCode();
    }, 200);
  }

  // Encode compact pipe-delimited token so verification page renders 100% reliably even on cold serverless instances
  function buildCompactToken(r) {
    try {
      const b0 = (r.beacons && r.beacons[0]) || {};
      const parts = [
        r.clientName || '',
        r.regionalNumber || '',
        r.verificationCode || '',
        r.locality || '',
        r.stationLocation || 'GWCL, DODOWA',
        r.date || '03 November 2026',
        r.surveyorName || '',
        String(r.processedPoints || 4),
        String(b0.x || '434768.62'),
        String(b0.y || '1230591.872'),
        b0.beaconIndex || 'SGGA CORS/2025/4',
        r.referenceId || r.id || '',
        r.amountPaid || 'GHS 150.00',
        r.region || 'Greater Accra'
      ];
      return window.btoa(unescape(encodeURIComponent(parts.join('|'))))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    } catch (e) {
      return '';
    }
  }

  // Update QR Code image source with compact token for instant scanning and zero record-not-found
  function updateQrCode() {
    const currentRec = getCurrentFormData();
    const baseUrl = (baseUrlInput.value.trim() || networkInfo.lanUrl).replace(/\/$/, '');
    const refId = currentRec.referenceId;
    const compactToken = buildCompactToken(currentRec);
    
    const targetUrl = compactToken
      ? `${baseUrl}/verify/${encodeURIComponent(refId)}?d=${compactToken}`
      : `${baseUrl}/verify/${encodeURIComponent(refId)}`;
    const qrSrc = `/api/qr?text=${encodeURIComponent(targetUrl)}&size=300`;

    document.querySelectorAll('.preview-qr-img').forEach(img => {
      img.src = qrSrc;
    });

    if (modalQrImg) modalQrImg.src = `/api/qr?text=${encodeURIComponent(targetUrl)}&size=360`;
    if (modalQrUrlText) modalQrUrlText.textContent = targetUrl;
  }

  // Auto Generator Buttons
  btnGenRef.addEventListener('click', () => {
    refIdInput.value = generateUniqueRefId();
    updateLivePreview();
    triggerAutoSave();
    showToast('New Reference ID: ' + refIdInput.value);
  });

  btnGenVCode.addEventListener('click', () => {
    vCodeInput.value = generateVerificationCode();
    updateLivePreview();
    triggerAutoSave();
    showToast('New Verification Code generated');
  });

  // Base URL Switches
  if (btnUsePublic) {
    btnUsePublic.addEventListener('click', () => {
      if (networkInfo.publicUrl) {
        baseUrlInput.value = networkInfo.publicUrl;
        baseUrlInput.dataset.userEdited = 'true';
        updateLivePreview();
        triggerAutoSave();
        showToast('Set to Worldwide Public Link (works without Wi-Fi!)', 'success');
      } else {
        showToast('Public link is connecting... please wait a moment', 'info');
      }
    });
  }

  btnUseWifiIp.addEventListener('click', () => {
    baseUrlInput.value = networkInfo.lanUrl;
    baseUrlInput.dataset.userEdited = 'true';
    updateLivePreview();
    triggerAutoSave();
    showToast('Base URL set to Wi-Fi IP (requires same Wi-Fi)');
  });

  btnUseLocalhost.addEventListener('click', () => {
    baseUrlInput.value = `http://localhost:${networkInfo.port}`;
    baseUrlInput.dataset.userEdited = 'true';
    updateLivePreview();
    triggerAutoSave();
    showToast('Base URL set to Localhost (this PC only)');
  });

  baseUrlInput.addEventListener('input', () => {
    baseUrlInput.dataset.userEdited = 'true';
    triggerAutoSave();
  });

  // Form input listeners for live preview AND auto-saving
  form.querySelectorAll('input, select').forEach(el => {
    el.addEventListener('input', () => {
      updateLivePreview();
      triggerAutoSave();
    });
    el.addEventListener('change', () => {
      updateLivePreview();
      triggerAutoSave();
    });
  });

  // Load sample button
  btnLoadSample.addEventListener('click', () => {
    loadData(SAMPLE_DATA);
    showToast('Loaded sample EX DATA for testing');
  });

  // New record button
  btnNewRecord.addEventListener('click', () => {
    initCleanNewPerson();
    clientNameInput.focus();
    showToast('New clean form ready with fresh unique Reference ID!');
  });

  // =========================================================================
  // PERSISTENCE ENGINE (LOCALSTORAGE VAULT + SERVER SYNC)
  // Supports unlimited (1000+) recorded documents
  // =========================================================================

  let autoSaveTimer = null;
  function triggerAutoSave() {
    setAutoSaveStatus('saving');
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(async () => {
      await executeAutoSave();
      setAutoSaveStatus('ready');
    }, 450);
  }

  async function executeAutoSave() {
    const currentRec = getCurrentFormData();

    // Save active working draft into localStorage
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_DRAFT, JSON.stringify(currentRec));
    } catch (e) {}

    // If clientName is filled, also commit to persistent saved registry
    if (currentRec.clientName && currentRec.clientName.trim().length > 1) {
      saveRecordToLocalStorage(currentRec, false);
      // Background sync to server API
      try {
        await fetch('/api/records', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(currentRec)
        });
      } catch (e) {}
      refreshRecordsBadge();
    }
  }

  function getLocalRecords() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SAVED_RECORDS);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  // Save record to local vault. If forceNew is true, it guarantees a brand new entry!
  function saveRecordToLocalStorage(rec, forceNew = false) {
    try {
      let records = getLocalRecords();
      const cleanRef = String(rec.referenceId || rec.id).trim().toLowerCase();
      const existingIdx = records.findIndex(r => String(r.referenceId || r.id).trim().toLowerCase() === cleanRef);

      if (forceNew || existingIdx < 0) {
        // If forceNew and refId already taken, assign a fresh new Reference ID
        if (existingIdx >= 0 && forceNew) {
          rec.referenceId = generateUniqueRefId();
          rec.id = rec.referenceId;
          refIdInput.value = rec.referenceId;
          updateLivePreview();
        }
        records.unshift({ ...rec, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      } else {
        // Update existing record
        records[existingIdx] = { ...records[existingIdx], ...rec, updatedAt: new Date().toISOString() };
      }

      localStorage.setItem(STORAGE_KEYS.SAVED_RECORDS, JSON.stringify(records));
      return rec;
    } catch (e) {
      return rec;
    }
  }

  function deleteRecordFromLocalStorage(id) {
    try {
      let records = getLocalRecords();
      const cleanId = String(id).trim().toLowerCase();
      const filtered = records.filter(r => String(r.referenceId || r.id).trim().toLowerCase() !== cleanId);
      localStorage.setItem(STORAGE_KEYS.SAVED_RECORDS, JSON.stringify(filtered));
    } catch (e) {}
  }

  function refreshRecordsBadge() {
    const local = getLocalRecords();
    const count = Math.max(local.length, allRecords.length);
    if (recordsCountBadge) recordsCountBadge.textContent = count;
    if (archiveCountPill) archiveCountPill.textContent = `${count} Documents`;
  }

  // 5A. Save as Brand New Record (Guarantees infinite/1000+ entries without overwriting!)
  if (btnSaveNewRecord) {
    btnSaveNewRecord.addEventListener('click', async () => {
      if (!clientNameInput.value.trim()) {
        showToast('Please enter Client Name before saving', 'error');
        clientNameInput.focus();
        return;
      }

      try {
        btnSaveNewRecord.disabled = true;
        btnSaveNewRecord.textContent = 'Saving...';
        
        let currentRec = getCurrentFormData();
        
        // Check if referenceId is already taken by an existing document in registry
        const local = getLocalRecords();
        const isTaken = local.some(r => String(r.referenceId || r.id).trim().toLowerCase() === currentRec.referenceId.toLowerCase());
        if (isTaken) {
          // Auto-generate fresh unique Reference ID for the new document
          currentRec.referenceId = generateUniqueRefId();
          currentRec.id = currentRec.referenceId;
          refIdInput.value = currentRec.referenceId;
          updateLivePreview();
        }

        const savedRec = saveRecordToLocalStorage(currentRec, true);

        // Sync with server API
        try {
          await fetch('/api/records', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(savedRec)
          });
          // Bulk sync full vault
          await syncFullVaultWithServer();
        } catch (serverErr) {}

        await fetchRecordsList();
        showToast(`✓ New Document Saved as "${savedRec.referenceId}" for ${savedRec.clientName}! Total: ${allRecords.length}`, 'success');
      } catch (e) {
        showToast('Error saving: ' + e.message, 'error');
      } finally {
        btnSaveNewRecord.disabled = false;
        btnSaveNewRecord.textContent = '💾 Save New Document';
        setAutoSaveStatus('ready', '✓ Saved');
      }
    });
  }

  // 5B. Update Currently Loaded Document
  btnSaveRecord.addEventListener('click', async () => {
    if (!clientNameInput.value.trim()) {
      showToast('Please enter Client Name before updating', 'error');
      clientNameInput.focus();
      return;
    }

    try {
      btnSaveRecord.disabled = true;
      btnSaveRecord.textContent = 'Updating...';
      const currentRec = getCurrentFormData();
      saveRecordToLocalStorage(currentRec, false);

      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentRec)
      });
      await syncFullVaultWithServer();
      await fetchRecordsList();
      showToast(`✓ Updated record "${currentRec.referenceId}" for ${currentRec.clientName}!`, 'success');
    } catch (e) {
      showToast(`✓ Updated locally (Server sync: ${e.message})`, 'info');
    } finally {
      btnSaveRecord.disabled = false;
      btnSaveRecord.textContent = '✏️ Update';
      setAutoSaveStatus('ready', '✓ Updated');
    }
  });

  // Sync full local vault to server so all 1000+ documents are backed up on server
  async function syncFullVaultWithServer() {
    const local = getLocalRecords();
    if (!local || local.length === 0) return;
    try {
      await fetch('/api/records/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(local)
      });
    } catch (e) {}
  }

  // 6. Universal PDF Download Function (Server vector PDF with instant browser HTML2PDF fallback)
  async function downloadPdfForRecord(rec, triggeringBtn = null) {
    if (!rec) return;
    const originalContent = triggeringBtn ? triggeringBtn.innerHTML : null;
    if (triggeringBtn) {
      triggeringBtn.disabled = true;
      triggeringBtn.innerHTML = '⏳ Generating...';
    }

    try {
      let downloaded = false;

      // Step 1: Server-side high quality vector PDF
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 7000);
        const res = await fetch('/api/generate-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(rec),
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (res.ok) {
          const blob = await res.blob();
          if (blob && blob.size > 1000) {
            triggerBlobDownload(blob, `${rec.referenceId || rec.id || 'EX_DATA'}.pdf`);
            downloaded = true;
            showToast(`✓ PDF downloaded (${rec.referenceId}.pdf)`, 'success');
          }
        }
      } catch (srvErr) {
        console.warn('Server PDF generation failed or timed out:', srvErr.message);
      }

      if (downloaded) return;

      // Step 2: High-res client-side fallback using html2pdf
      showToast('Generating official PDF in browser...', 'info');
      const activeDraft = getCurrentFormData();
      loadData(rec);
      // Wait for QR code image and DOM to settle
      await new Promise(resolve => setTimeout(resolve, 80));

      const element = document.getElementById('printableA4Document');
      const opt = {
        margin: 0,
        filename: `${rec.referenceId || rec.id || 'EX_DATA'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      if (window.html2pdf) {
        await window.html2pdf().set(opt).from(element).save();
        showToast(`✓ PDF downloaded (${rec.referenceId}.pdf)`, 'success');
      } else {
        window.print();
      }

      // Restore previously edited draft if it was different
      if (activeDraft && activeDraft.referenceId !== rec.referenceId) {
        setTimeout(() => loadData(activeDraft), 600);
      }
    } catch (err) {
      console.error('Download PDF error:', err);
      showToast('Could not download PDF: ' + err.message, 'error');
    } finally {
      if (triggeringBtn) {
        triggeringBtn.disabled = false;
        triggeringBtn.innerHTML = originalContent || '📥 PDF';
      }
    }
  }

  function triggerBlobDownload(blob, filename) {
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    }, 1200);
  }

  // 6b. Download PDF from Form / Toolbar
  async function downloadPdf() {
    if (!clientNameInput.value.trim()) {
      showToast('Please enter Client Name before generating PDF', 'error');
      clientNameInput.focus();
      return;
    }

    const currentRec = getCurrentFormData();
    await executeAutoSave();
    await downloadPdfForRecord(currentRec, btnDownloadPdf);
  }

  btnDownloadPdf.addEventListener('click', downloadPdf);
  btnToolbarDownload.addEventListener('click', downloadPdf);

  // 7. Print Slip
  async function printSlip() {
    if (clientNameInput.value.trim()) {
      try {
        await executeAutoSave();
      } catch (e) {}
    }
    window.print();
  }

  btnPrintSlip.addEventListener('click', printSlip);
  btnToolbarPrint.addEventListener('click', printSlip);

  // 8. Test Verification Page
  btnTestVerification.addEventListener('click', async () => {
    try {
      const currentRec = getCurrentFormData();
      await executeAutoSave();
      const baseUrl = (baseUrlInput.value.trim() || networkInfo.lanUrl).replace(/\/$/, '');
      const refId = currentRec.referenceId;
      const verifyUrl = `${baseUrl}/verify/${encodeURIComponent(refId)}`;
      window.open(verifyUrl, '_blank');
    } catch (e) {
      showToast('Error opening verification: ' + e.message, 'error');
    }
  });

  // 9. QR Assistant Modal
  btnOpenQrModal.addEventListener('click', () => {
    updateQrCode();
    qrAssistantModal.classList.add('active');
  });

  btnCloseQrModal.addEventListener('click', () => {
    qrAssistantModal.classList.remove('active');
  });

  // 10. Saved Records & PDFs Archive Modal
  btnOpenRecords.addEventListener('click', () => {
    fetchRecordsList();
    recordsModal.classList.add('active');
  });

  btnCloseRecords.addEventListener('click', () => {
    recordsModal.classList.remove('active');
  });

  window.addEventListener('click', (e) => {
    if (e.target === recordsModal) recordsModal.classList.remove('active');
    if (e.target === qrAssistantModal) qrAssistantModal.classList.remove('active');
  });

  // Fetch and display saved records (merges local + server records)
  async function fetchRecordsList() {
    const localRecords = getLocalRecords();
    let serverRecords = [];
    try {
      const res = await fetch('/api/records');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.records) {
          serverRecords = data.records;
        }
      }
    } catch (e) {}

    // Merge and deduplicate by referenceId
    const recordMap = new Map();
    serverRecords.forEach(r => {
      const key = String(r.referenceId || r.id || '').trim().toLowerCase();
      if (key) recordMap.set(key, r);
    });
    localRecords.forEach(r => {
      const key = String(r.referenceId || r.id || '').trim().toLowerCase();
      if (key) {
        const existing = recordMap.get(key);
        if (!existing || new Date(r.updatedAt || 0) >= new Date(existing.updatedAt || 0)) {
          recordMap.set(key, r);
        }
      }
    });

    allRecords = Array.from(recordMap.values());
    allRecords.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));

    // Save unified merged list to localStorage
    try {
      localStorage.setItem(STORAGE_KEYS.SAVED_RECORDS, JSON.stringify(allRecords));
    } catch (e) {}

    refreshRecordsBadge();
    renderRecordsList(allRecords);
  }

  function renderRecordsList(records) {
    recordsListContainer.innerHTML = '';
    if (records.length === 0) {
      recordsListContainer.innerHTML = `
        <div style="text-align: center; color: #94a3b8; padding: 40px 20px;">
          <div style="font-size: 2.5rem; margin-bottom: 8px;">📂</div>
          <p style="font-weight: 600; font-size: 1rem; color: #475569;">No saved documents in archive yet</p>
          <p style="font-size: 0.85rem;">Fill out the form and click "💾 Save New Document" to store your records here.</p>
        </div>
      `;
      return;
    }

    records.forEach(r => {
      const item = document.createElement('div');
      item.className = 'record-item';
      const refId = escapeHtml(r.referenceId || r.id);
      item.innerHTML = `
        <div class="record-meta" style="flex: 1; min-width: 200px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <span style="background: #1e3a8a; color: #fff; font-size: 0.75rem; font-weight: 700; padding: 2px 8px; border-radius: 4px;">${refId}</span>
            <h4 style="margin: 0; font-size: 0.95rem; font-weight: 700; color: #0f172a;">${escapeHtml(r.clientName || 'Unnamed Client')}</h4>
          </div>
          <p style="margin: 0; font-size: 0.8rem; color: #64748b;">
            📍 <strong>${escapeHtml(r.locality || 'Locality unassigned')}</strong>, ${escapeHtml(r.region || '')} • 
            📅 ${escapeHtml(r.date || '')} • 
            💰 ${escapeHtml(r.amountPaid || 'GHS 150.00')} • 
            📐 ${escapeHtml(r.surveyorName || 'N/A')}
          </p>
        </div>
        <div class="record-actions" style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
          <button class="btn btn-primary btn-sm btn-download-pdf-row" data-id="${refId}" title="Download Official A4 PDF">
            📥 PDF
          </button>
          <button class="btn btn-secondary btn-sm btn-load-record" data-id="${refId}" title="Open in Live Preview & Editor">
            👁️ View
          </button>
          <a href="/verify/${refId}" target="_blank" class="btn btn-secondary btn-sm" title="Open Verification Gateway" style="text-decoration: none;">
            📱 Verify
          </a>
          <button class="btn btn-secondary btn-sm btn-delete-record" data-id="${refId}" style="color: #ef4444;" title="Delete this record">
            🗑️
          </button>
        </div>
      `;
      recordsListContainer.appendChild(item);
    });

    // Row: Download PDF handler
    recordsListContainer.querySelectorAll('.btn-download-pdf-row').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const btnEl = e.currentTarget;
        const id = btnEl.dataset.id;
        const rec = allRecords.find(r => r.id === id || r.referenceId === id);
        if (!rec) return;

        await downloadPdfForRecord(rec, btnEl);
      });
    });

    // Row: Load into form handler
    recordsListContainer.querySelectorAll('.btn-load-record').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        const rec = allRecords.find(r => r.id === id || r.referenceId === id);
        if (rec) {
          loadData(rec);
          recordsModal.classList.remove('active');
          showToast(`Loaded record for ${rec.clientName} (${rec.referenceId})`);
        }
      });
    });

    // Row: Delete handler
    recordsListContainer.querySelectorAll('.btn-delete-record').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        if (confirm(`Are you sure you want to delete record ${id}?`)) {
          deleteRecordFromLocalStorage(id);
          try {
            await fetch(`/api/records/${encodeURIComponent(id)}`, { method: 'DELETE' });
          } catch (err) {}
          await fetchRecordsList();
          showToast(`Record ${id} deleted`);
        }
      });
    });
  }

  // Filter records in archive
  recordSearchInput.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    if (!q) {
      renderRecordsList(allRecords);
      return;
    }
    const filtered = allRecords.filter(r => 
      (r.referenceId && r.referenceId.toLowerCase().includes(q)) ||
      (r.clientName && r.clientName.toLowerCase().includes(q)) ||
      (r.locality && r.locality.toLowerCase().includes(q)) ||
      (r.regionalNumber && r.regionalNumber.toLowerCase().includes(q)) ||
      (r.date && r.date.toLowerCase().includes(q)) ||
      (r.surveyorName && r.surveyorName.toLowerCase().includes(q)) ||
      (r.verificationCode && r.verificationCode.toLowerCase().includes(q))
    );
    renderRecordsList(filtered);
  });

  // Backup Export: Download all records as JSON file
  if (btnExportRecords) {
    btnExportRecords.addEventListener('click', () => {
      const records = getLocalRecords();
      if (!records || records.length === 0) {
        showToast('No records to export yet', 'info');
        return;
      }
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(records, null, 2));
      const dlAnchor = document.createElement('a');
      dlAnchor.setAttribute('href', dataStr);
      const dateStr = new Date().toISOString().slice(0, 10);
      dlAnchor.setAttribute('download', `landscommission_records_backup_${dateStr}.json`);
      document.body.appendChild(dlAnchor);
      dlAnchor.click();
      dlAnchor.remove();
      showToast(`Exported ${records.length} records to backup file!`, 'success');
    });
  }

  // Backup Import: Upload JSON file and merge into registry
  if (btnImportRecordsTrigger && importBackupInput) {
    btnImportRecordsTrigger.addEventListener('click', () => {
      importBackupInput.click();
    });

    importBackupInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const imported = JSON.parse(event.target.result);
          if (Array.isArray(imported)) {
            let local = getLocalRecords();
            const map = new Map();
            local.forEach(r => map.set(String(r.referenceId || r.id).trim().toLowerCase(), r));
            imported.forEach(r => {
              if (r.referenceId || r.id) {
                map.set(String(r.referenceId || r.id).trim().toLowerCase(), r);
              }
            });
            const merged = Array.from(map.values());
            localStorage.setItem(STORAGE_KEYS.SAVED_RECORDS, JSON.stringify(merged));
            await syncFullVaultWithServer();
            await fetchRecordsList();
            showToast(`✓ Successfully imported ${imported.length} records!`, 'success');
          } else {
            showToast('Invalid backup file format (expected array of records)', 'error');
          }
        } catch (err) {
          showToast('Failed to parse backup file: ' + err.message, 'error');
        }
      };
      reader.readAsText(file);
      importBackupInput.value = '';
    });
  }

  // Toast notification helper
  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // INITIAL BOOT: Sync with server, restore active draft if available, or create fresh
  initNetwork().then(async () => {
    // 1. Sync local vault with server immediately on startup
    await syncFullVaultWithServer();
    await fetchRecordsList();

    // 2. Restore active working draft if exists
    try {
      const savedDraftRaw = localStorage.getItem(STORAGE_KEYS.ACTIVE_DRAFT);
      if (savedDraftRaw) {
        const savedDraft = JSON.parse(savedDraftRaw);
        if (savedDraft && (savedDraft.clientName || savedDraft.referenceId)) {
          loadData(savedDraft);
          setAutoSaveStatus('ready', '✓ Draft restored');
        } else {
          initCleanNewPerson();
        }
      } else {
        initCleanNewPerson();
      }
    } catch (e) {
      initCleanNewPerson();
    }
  });

});
