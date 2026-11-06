// Lands Commission EX DATA Front-End Logic
document.addEventListener('DOMContentLoaded', () => {
  // Storage Keys for 100% Persistence across Vercel Restarts
  const STORAGE_KEYS = {
    ACTIVE_DRAFT: 'landscommission_active_draft_v2',
    SAVED_RECORDS: 'landscommission_saved_records_v2'
  };

  // State
  let networkInfo = { localIp: '127.0.0.1', port: 5000, lanUrl: 'http://localhost:5000' };
  let currentBeacons = [
    { beaconIndex: 'SGGA EX 19 1A', x: '', y: '' }
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
  const btnSaveRecord = document.getElementById('btnSaveRecord');
  const btnDownloadPdf = document.getElementById('btnDownloadPdf');
  const btnPrintSlip = document.getElementById('btnPrintSlip');
  const btnTestVerification = document.getElementById('btnTestVerification');
  const btnToolbarDownload = document.getElementById('btnToolbarDownload');
  const btnToolbarPrint = document.getElementById('btnToolbarPrint');

  // Auto-Save UI Elements
  const autoSaveIndicator = document.getElementById('autoSaveIndicator');
  const autoSaveText = document.getElementById('autoSaveText');

  // Modals
  const btnOpenRecords = document.getElementById('btnOpenRecords');
  const btnCloseRecords = document.getElementById('btnCloseRecords');
  const recordsModal = document.getElementById('recordsModal');
  const recordsListContainer = document.getElementById('recordsListContainer');
  const recordSearchInput = document.getElementById('recordSearchInput');
  const recordsCountBadge = document.getElementById('recordsCount');

  const btnOpenQrModal = document.getElementById('btnOpenQrModal');
  const btnCloseQrModal = document.getElementById('btnCloseQrModal');
  const qrAssistantModal = document.getElementById('qrAssistantModal');
  const modalQrImg = document.getElementById('modalQrImg');
  const modalQrUrlText = document.getElementById('modalQrUrlText');
  const modalIpDisplay = document.getElementById('modalIpDisplay');

  // Sample data for quick testing
  const SAMPLE_DATA = {
    referenceId: 'GX1722219',
    regionalNumber: 'SGGA.G3488/2026',
    verificationCode: 'SGGA EX 19 1A/26/10/14/150-65',
    date: '14 October 2026',
    processedPoints: 4,
    clientName: 'LIZZETTE ANTWI BOASIAKO & ANNETTE ANTWI-BOASIAKO',
    region: 'Greater Accra',
    locality: 'OYARIFA',
    amountPaid: 'GHS 150.00',
    surveyorName: 'DANNY MENSA',
    smdOfficerName: '',
    beacons: [
      { beaconIndex: 'SGGA EX 19 1A', x: '333460.15', y: '1199651.081' }
    ]
  };

  // Helper to generate a unique Reference ID
  function generateUniqueRefId() {
    return `GX${Math.floor(1000000 + Math.random() * 9000000)}`;
  }

  // Helper to generate a unique Verification Code
  function generateVerificationCode(beaconIdx) {
    const b = beaconIdx || (currentBeacons[0] && currentBeacons[0].beaconIndex) || 'SGGA EX 19 1A';
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

  // Helper to encode stateless compact record payload for resilient QR codes
  function encodeStatelessToken(rec) {
    try {
      const compact = {
        ref: rec.referenceId,
        client: rec.clientName,
        reg: rec.regionalNumber,
        vcode: rec.verificationCode,
        loc: rec.locality,
        region: rec.region,
        pts: rec.processedPoints,
        amt: rec.amountPaid,
        date: rec.date,
        surv: rec.surveyorName,
        smd: rec.smdOfficerName || '',
        tx: rec.transactionId,
        b: rec.beacons
      };
      const jsonStr = unescape(encodeURIComponent(JSON.stringify(compact)));
      return btoa(jsonStr).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } catch (e) {
      return '';
    }
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
    const defaultBeacon = 'SGGA EX 19 1A';
    
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
    smdOfficerInput.value = '';

    currentBeacons = [
      { beaconIndex: defaultBeacon, x: '', y: '' }
    ];

    renderBeaconsEditor();
    updateLivePreview();
    // Clear active draft from local storage when explicitly starting a new record
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
    smdOfficerInput.value = data.smdOfficerName || '';

    currentBeacons = data.beacons && data.beacons.length > 0 
      ? JSON.parse(JSON.stringify(data.beacons))
      : [{ beaconIndex: 'SGGA EX 19 1A', x: '', y: '' }];

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
        <td><input type="text" class="beacon-index-input" data-index="${index}" value="${escapeHtml(b.beaconIndex || '')}" placeholder="e.g. SGGA EX 19 1A"></td>
        <td><input type="text" class="beacon-x-input" data-index="${index}" value="${escapeHtml(String(b.x || ''))}" placeholder="e.g. 333460.15"></td>
        <td><input type="text" class="beacon-y-input" data-index="${index}" value="${escapeHtml(String(b.y || ''))}" placeholder="e.g. 1199651.081"></td>
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
      beaconIndex: `SGGA EX 19 ${nextNum}A`,
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
          <td>${escapeHtml(b.beaconIndex || 'SGGA EX 19 1A')}</td>
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

  // Update QR Code image source with stateless self-contained token
  function updateQrCode() {
    const currentRec = getCurrentFormData();
    const baseUrl = (baseUrlInput.value.trim() || networkInfo.lanUrl).replace(/\/$/, '');
    const refId = currentRec.referenceId;
    const token = encodeStatelessToken(currentRec);
    
    // Always include token so verification is 100% resilient on Vercel serverless!
    const targetUrl = token
      ? `${baseUrl}/verify/${encodeURIComponent(refId)}?d=${token}`
      : `${baseUrl}/verify/${encodeURIComponent(refId)}`;
      
    const qrSrc = `/api/qr?text=${encodeURIComponent(targetUrl)}&size=180`;

    document.querySelectorAll('.preview-qr-img').forEach(img => {
      img.src = qrSrc;
    });

    if (modalQrImg) modalQrImg.src = `/api/qr?text=${encodeURIComponent(targetUrl)}&size=300`;
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
    showToast('New clean form ready. A unique QR code has been generated!');
  });

  // =========================================================================
  // AUTOMATIC RECORD PERSISTENCE ENGINE (LOCALSTORAGE + SERVER SYNC)
  // Ensures records NEVER disappear even across Vercel serverless cold starts
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

    // 1. Always save active working draft into localStorage
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_DRAFT, JSON.stringify(currentRec));
    } catch (e) {}

    // 2. If clientName is partially filled, also commit to persistent saved registry
    if (currentRec.clientName && currentRec.clientName.trim().length > 1) {
      saveRecordToLocalStorage(currentRec);
      // Background sync to server API
      try {
        await fetch('/api/records', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(currentRec)
        });
      } catch (e) {
        // Silent server sync fallback; localStorage keeps it 100% safe
      }
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

  function saveRecordToLocalStorage(rec) {
    try {
      let records = getLocalRecords();
      const cleanRef = String(rec.referenceId || rec.id).trim().toLowerCase();
      const existingIdx = records.findIndex(r => String(r.referenceId || r.id).trim().toLowerCase() === cleanRef);
      if (existingIdx >= 0) {
        records[existingIdx] = { ...records[existingIdx], ...rec, updatedAt: new Date().toISOString() };
      } else {
        records.unshift({ ...rec, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      }
      localStorage.setItem(STORAGE_KEYS.SAVED_RECORDS, JSON.stringify(records));
    } catch (e) {}
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
  }

  // 5. Explicit Save Button
  btnSaveRecord.addEventListener('click', async () => {
    if (!clientNameInput.value.trim()) {
      showToast('Please enter the Client Name before saving', 'error');
      clientNameInput.focus();
      return;
    }

    try {
      btnSaveRecord.disabled = true;
      btnSaveRecord.textContent = 'Saving...';
      const currentRec = getCurrentFormData();
      saveRecordToLocalStorage(currentRec);

      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentRec)
      });
      const data = await res.json();
      fetchRecordsList();
      showToast(`✓ Record for "${currentRec.clientName}" saved! Verification QR is active.`, 'success');
    } catch (e) {
      showToast(`✓ Saved to local registry (Server sync: ${e.message})`, 'info');
    } finally {
      btnSaveRecord.disabled = false;
      btnSaveRecord.textContent = '💾 Save & Update Record';
      setAutoSaveStatus('ready', '✓ Saved');
    }
  });

  // 6. Download PDF (100% Reliable via Direct POST and Client-Side Fallback)
  async function downloadPdf() {
    const currentRec = getCurrentFormData();
    if (!currentRec.clientName) {
      showToast('Please enter Client Name before downloading PDF', 'error');
      clientNameInput.focus();
      return;
    }

    const btn = btnDownloadPdf;
    const originalText = btn.innerHTML;
    try {
      btn.disabled = true;
      btn.innerHTML = '⏳ Generating PDF...';
      showToast('Preparing official vector PDF with scannable QR...', 'info');

      // 1. Ensure latest record data is auto-saved
      await executeAutoSave();

      // 2. Request PDF directly with full record payload (guarantees serverless cold start resilience)
      const res = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentRec)
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${currentRec.referenceId || 'EX_DATA'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);

      showToast(`✓ PDF downloaded as "${currentRec.referenceId}.pdf"!`, 'success');
    } catch (err) {
      console.warn('Server PDF error, triggering high-res client renderer:', err);
      try {
        showToast('Rendering high-res PDF in browser...', 'info');
        const element = document.getElementById('printableA4Document');
        const opt = {
          margin: 0,
          filename: `${currentRec.referenceId || 'EX_DATA'}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        await html2pdf().set(opt).from(element).save();
        showToast(`✓ PDF downloaded as "${currentRec.referenceId}.pdf"!`, 'success');
      } catch (fallbackErr) {
        showToast('Download error: ' + fallbackErr.message, 'error');
      }
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
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
      const token = encodeStatelessToken(currentRec);
      const verifyUrl = token
        ? `${baseUrl}/verify/${encodeURIComponent(refId)}?d=${token}`
        : `${baseUrl}/verify/${encodeURIComponent(refId)}`;
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

  // 10. Saved Records History Modal
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
        // If local record is newer or not in server, keep local
        const existing = recordMap.get(key);
        if (!existing || new Date(r.updatedAt || 0) >= new Date(existing.updatedAt || 0)) {
          recordMap.set(key, r);
        }
      }
    });

    allRecords = Array.from(recordMap.values());
    allRecords.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));

    if (recordsCountBadge) recordsCountBadge.textContent = allRecords.length;
    renderRecordsList(allRecords);
  }

  function renderRecordsList(records) {
    recordsListContainer.innerHTML = '';
    if (records.length === 0) {
      recordsListContainer.innerHTML = '<p style="text-align:center; color:#94a3b8; padding:20px;">No saved records yet. Fill the form to create your first official EX DATA record.</p>';
      return;
    }

    records.forEach(r => {
      const item = document.createElement('div');
      item.className = 'record-item';
      const refId = escapeHtml(r.referenceId || r.id);
      const token = encodeStatelessToken(r);
      const tokParam = token ? `?d=${encodeURIComponent(token)}` : '';
      item.innerHTML = `
        <div class="record-meta">
          <h4>${refId} - ${escapeHtml(r.clientName || 'Unnamed')}</h4>
          <p>📍 ${escapeHtml(r.locality || 'Locality unassigned')}, ${escapeHtml(r.region || '')} • 📅 ${escapeHtml(r.date || '')}</p>
        </div>
        <div class="record-actions">
          <button class="btn btn-secondary btn-sm btn-load-record" data-id="${refId}">Load</button>
          <a href="/api/records/${refId}/pdf${tokParam}" class="btn btn-primary btn-sm" download="${refId}.pdf">PDF</a>
          <button class="btn btn-secondary btn-sm btn-delete-record" data-id="${refId}" style="color:#ef4444;">Delete</button>
        </div>
      `;
      recordsListContainer.appendChild(item);
    });

    recordsListContainer.querySelectorAll('.btn-load-record').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        const rec = allRecords.find(r => r.id === id || r.referenceId === id);
        if (rec) {
          loadData(rec);
          recordsModal.classList.remove('active');
          showToast(`Loaded record for ${rec.clientName}`);
        }
      });
    });

    recordsListContainer.querySelectorAll('.btn-delete-record').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        if (confirm(`Delete record ${id}?`)) {
          deleteRecordFromLocalStorage(id);
          try {
            await fetch(`/api/records/${encodeURIComponent(id)}`, { method: 'DELETE' });
          } catch (err) {}
          fetchRecordsList();
          showToast(`Record ${id} deleted`);
        }
      });
    });
  }

  // Filter records in modal
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
      (r.verificationCode && r.verificationCode.toLowerCase().includes(q))
    );
    renderRecordsList(filtered);
  });

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

  // INITIAL BOOT: Restore active draft from localStorage if available, or create fresh
  initNetwork().then(() => {
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
    fetchRecordsList();
  });

});
