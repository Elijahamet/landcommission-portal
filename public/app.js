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
  let currentLoadedVerificationUrl = '';

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
  const btnUseGhanaCorsNet = document.getElementById('btnUseGhanaCorsNet');
  const btnUseLandPortal = document.getElementById('btnUseLandPortal');
  const btnUsePublic = document.getElementById('btnUsePublic') || btnUseGhanaCorsNet;
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

  // Official Preloaded CORS Stations (Greater Accra Region)
  const PRELOADED_CORS_STATIONS = [
    {
      corsId: 'SGGA EX 19 1',
      aliases: ['SGGA EX 19 1', 'SGGA EX 19 1A', 'EX1A', 'SGGA EX 19'],
      stationId: 'EX1A',
      x: '333460.15',
      y: '1199651.081',
      location: 'SMD-EXAMINATION, ACCRA'
    },
    {
      corsId: 'SGGA CORS/2025/3',
      aliases: ['SGGA CORS/2025/3', 'SG03', 'CORS/2025/3'],
      stationId: 'SG03',
      x: '303825.126',
      y: '1133357.319',
      location: 'KOKROBITE, ACCRA'
    },
    {
      corsId: 'SGGA CORS/2025/4',
      aliases: ['SGGA CORS/2025/4', 'SG04', 'CORS/2025/4'],
      stationId: 'SG04',
      x: '434768.62',
      y: '1230591.872',
      location: 'GWCL, DODOWA'
    },
    {
      corsId: 'SGGA CORS/2025/5',
      aliases: ['SGGA CORS/2025/5', 'SG05', 'CORS/2025/5'],
      stationId: 'SG05',
      x: '421208.928',
      y: '1486533.813',
      location: 'GWCL, BIG ADA'
    },
    {
      corsId: 'SGGA CORS/2025/6',
      aliases: ['SGGA CORS/2025/6', 'SG06', 'CORS/2025/6'],
      stationId: 'SG06',
      x: '431019.659',
      y: '1358904.391',
      location: 'DAWA INDUSTRIAL ENCLAVE'
    },
    {
      corsId: 'SGGA CORS/2025/7',
      aliases: ['SGGA CORS/2025/7', 'SG07', 'CORS/2025/7'],
      stationId: 'SG07',
      x: '341275.809',
      y: '1219526.117',
      location: 'LEKMA HOSPITAL MANET ROAD'
    },
    {
      corsId: 'LSHQ',
      aliases: ['LSHQ'],
      stationId: 'LSHQ',
      x: '326433.22',
      y: '1203050.817',
      location: 'LISAG HOUSE, LABONE'
    }
  ];

  function findCorsStation(query) {
    if (!query) return null;
    const q = String(query).trim().toUpperCase();
    return PRELOADED_CORS_STATIONS.find(s => 
      s.corsId.toUpperCase() === q ||
      s.stationId.toUpperCase() === q ||
      s.location.toUpperCase() === q ||
      (s.aliases && s.aliases.some(a => a.toUpperCase() === q))
    ) || null;
  }

  // Official permanent archive of verified documents matching saved PDFs
  const OFFICIAL_SAVED_RECORDS = [
    {
      referenceId: 'GX1722219',
      id: 'GX1722219',
      regionalNumber: 'SGGA.G3488/2026',
      verificationCode: 'SGGA EX 19 1A/26/10/14/150-65',
      date: '14 October 2026',
      processedPoints: 4,
      clientName: 'LIZZETTE ANTWI BOASIAKO & ANNETTE ANTWI-BOASIAKO',
      region: 'Greater Accra',
      locality: 'OYARIFA',
      stationLocation: 'GWCL, DODOWA',
      amountPaid: 'GHS 150.00',
      surveyorName: 'DANNY MENSA',
      beacons: [
        { beaconIndex: 'SGGA EX 19 1A', x: '333460.15', y: '1199651.081' }
      ],
      status: 'ACTIVE_VERIFIED',
      verificationUrl: 'https://ghanacorsnet-verify.vercel.app/verify/GX1722219'
    },
    {
      referenceId: 'GX7109723',
      id: 'GX7109723',
      regionalNumber: 'SGGA. G5098 26',
      verificationCode: 'SGGA CORS/2025/4/26/11/03/150-65',
      date: '03 November 2026',
      processedPoints: 4,
      clientName: 'ALBERT WALE & AKUA SEKYERAA APPIAH',
      region: 'Greater Accra',
      locality: 'MIOTSO-PRAMPRAM',
      stationLocation: 'SMD-EXAMINATION, ACCRA',
      amountPaid: 'GHS 150.00',
      surveyorName: 'AISSI KÉVINOS',
      beacons: [
        { beaconIndex: 'SGGA CORS/2025/4', x: '434768.62', y: '1230591.872' }
      ],
      status: 'ACTIVE_VERIFIED',
      verificationUrl: 'https://ghanacorsnet-verify.vercel.app/verify/GX7109723'
    },
    {
      referenceId: 'GX2193345',
      id: 'GX2193345',
      regionalNumber: 'SGGA. G2222 26',
      verificationCode: 'SGGA CORS/2025/4/26/11/03/150-65',
      date: '03 November 2026',
      processedPoints: 5,
      clientName: 'DAVID AGBEME',
      region: 'Greater Accra',
      locality: 'DODOWA',
      stationLocation: 'GWCL, DODOWA',
      amountPaid: 'GHS 170.00',
      surveyorName: 'MAXWELL',
      beacons: [
        { beaconIndex: 'SGGA CORS/2025/4', x: '434768.62', y: '1230591.872' }
      ],
      status: 'ACTIVE_VERIFIED',
      verificationUrl: 'https://ghanacorsnet-verify.vercel.app/verify/GX2193345'
    },
    {
      referenceId: 'GX4950255',
      id: 'GX4950255',
      regionalNumber: 'SGGA.G3488/2026',
      verificationCode: 'SGGA EX 19 1A/26/11/06/858-26',
      date: '06 November 2026',
      processedPoints: 4,
      clientName: 'LIZZETTE ANTWI BOASIAKO & ANNETTE ANTWI-BOASIAKO',
      region: 'Greater Accra',
      locality: 'OYARIFA',
      stationLocation: 'GWCL, DODOWA',
      amountPaid: 'GHS 150.00',
      surveyorName: 'DANNY MENSA',
      beacons: [
        { beaconIndex: 'SGGA EX 19 1A', x: '333460.15', y: '1199651.081' }
      ],
      status: 'ACTIVE_VERIFIED',
      verificationUrl: 'https://ghanacorsnet-verify.vercel.app/verify/GX4950255'
    },
    {
      referenceId: 'GX8888888',
      id: 'GX8888888',
      regionalNumber: 'SGGA. G7777 26',
      verificationCode: 'SGGA CORS/2025/4/26/11/07/295-17',
      date: '07 November 2026',
      processedPoints: 4,
      clientName: 'NEW TEST OFFICER',
      region: 'Greater Accra',
      locality: 'ACCRA',
      stationLocation: 'GWCL, DODOWA',
      amountPaid: 'GHS 150.00',
      surveyorName: 'TESTER',
      beacons: [
        { beaconIndex: 'SGGA CORS/2025/4', x: '100', y: '200' }
      ],
      status: 'ACTIVE_VERIFIED',
      verificationUrl: 'https://ghanacorsnet-verify.vercel.app/verify/GX8888888'
    },
    {
      referenceId: 'GX8967032',
      id: 'GX8967032',
      regionalNumber: 'SGGA.G9999/2026',
      verificationCode: 'SGGA EX 19 1A/26/11/06/576-68',
      date: '06 November 2026',
      processedPoints: 4,
      clientName: 'KWAME ASANTE',
      region: 'Greater Accra',
      locality: 'ACCRA CENTRAL',
      stationLocation: 'GWCL, DODOWA',
      amountPaid: 'GHS 150.00',
      surveyorName: 'JOHN DOE',
      beacons: [
        { beaconIndex: 'SGGA EX 19 1A', x: '333460.15', y: '1199651.081' }
      ],
      status: 'ACTIVE_VERIFIED',
      verificationUrl: 'https://ghanacorsnet-verify.vercel.app/verify/GX8967032'
    },
    {
      referenceId: 'GX9991111',
      id: 'GX9991111',
      regionalNumber: 'SGGA.G1111/2026',
      verificationCode: 'SGGA EX 19 1A/26/11/06/100-10',
      date: '06 November 2026',
      processedPoints: 4,
      clientName: 'TEST CLIENT COLD START',
      region: 'Greater Accra',
      locality: 'TEMA',
      stationLocation: 'GWCL, DODOWA',
      amountPaid: 'GHS 150.00',
      surveyorName: 'COLD START SURVEYOR',
      beacons: [
        { beaconIndex: 'SGGA EX 19 1A', x: '100', y: '200' }
      ],
      status: 'ACTIVE_VERIFIED',
      verificationUrl: 'https://ghanacorsnet-verify.vercel.app/verify/GX9991111'
    }
  ];

  // Default sample data matching official reference PDF (GX1722219)
  const SAMPLE_DATA = OFFICIAL_SAVED_RECORDS[0];

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

  // Calculate amount based on processed points: 150Ghc (4 points base) + 20 per additional point
  function calculateAmountForPoints(points) {
    const pts = Math.max(4, parseInt(points, 10) || 4);
    return 150 + Math.max(0, pts - 4) * 20;
  }

  function updateAmountFromPoints() {
    let pts = parseInt(pointsInput.value, 10);
    if (isNaN(pts) || pts < 4) {
      pts = 4;
    }
    const amt = calculateAmountForPoints(pts);
    amountInput.value = `GHS ${amt.toFixed(2)}`;

    const calcHint = document.getElementById('amountCalcHint');
    if (calcHint) {
      if (pts === 4) {
        calcHint.textContent = '150 Ghc (4 points base)';
      } else {
        const extra = pts - 4;
        calcHint.textContent = `150 Ghc + ${extra} × 20 Ghc = GHS ${amt.toFixed(2)}`;
      }
    }
  }

  // Validate beacon coordinates: If coordinates of beacon index have not been entered, display error and don't save document
  function validateBeaconCoordinates(options = { showUiErrors: true }) {
    const errorNotice = document.getElementById('beaconCoordErrorNotice');
    if (errorNotice) errorNotice.style.display = 'none';
    document.querySelectorAll('.coord-input-error').forEach(el => el.classList.remove('coord-input-error'));

    if (!currentBeacons || currentBeacons.length === 0) {
      if (options.showUiErrors) {
        showToast('Please add at least one beacon point with coordinates before saving.', 'error');
        if (errorNotice) {
          errorNotice.textContent = '⚠️ Please add at least one beacon point with X and Y coordinates before saving.';
          errorNotice.style.display = 'block';
        }
      }
      return false;
    }

    for (let i = 0; i < currentBeacons.length; i++) {
      const b = currentBeacons[i];
      const bName = (b.beaconIndex || `Point #${i + 1}`).trim();
      const xVal = (b.x !== undefined && b.x !== null) ? String(b.x).trim() : '';
      const yVal = (b.y !== undefined && b.y !== null) ? String(b.y).trim() : '';

      const xInput = document.querySelector(`.beacon-x-input[data-index="${i}"]`);
      const yInput = document.querySelector(`.beacon-y-input[data-index="${i}"]`);

      if (!xVal || !yVal) {
        if (options.showUiErrors) {
          if (!xVal && xInput) xInput.classList.add('coord-input-error');
          if (!yVal && yInput) yInput.classList.add('coord-input-error');

          let msg = '';
          if (!xVal && !yVal) {
            msg = `Coordinates for beacon index "${bName}" have not been entered.`;
          } else if (!xVal) {
            msg = `X coordinate (Easting) for beacon index "${bName}" is missing.`;
          } else {
            msg = `Y coordinate (Northing) for beacon index "${bName}" is missing.`;
          }

          showToast(msg, 'error');
          if (errorNotice) {
            errorNotice.textContent = `⚠️ ${msg} Enter coordinates before saving.`;
            errorNotice.style.display = 'block';
          }

          if (!xVal && xInput) xInput.focus();
          else if (!yVal && yInput) yInput.focus();
        }
        return false;
      }
    }

    return true;
  }

  // Helper to collect current form values into a clean record object
  function getCurrentFormData() {
    const refId = (refIdInput.value || '').trim() || generateUniqueRefId();
    let pts = parseInt(pointsInput.value, 10);
    if (isNaN(pts) || pts < 4) pts = 4;
    const calcAmt = `GHS ${calculateAmountForPoints(pts).toFixed(2)}`;
    let vUrl = '';
    if (currentLoadedVerificationUrl && currentLoadedVerificationUrl.includes(refId)) {
      vUrl = currentLoadedVerificationUrl;
    }
    return {
      id: refId,
      referenceId: refId,
      regionalNumber: (regionalNoInput.value || '').trim(),
      verificationCode: (vCodeInput.value || '').trim(),
      date: (dateInput.value || '').trim() || getTodayString(),
      processedPoints: pts,
      clientName: (clientNameInput.value || '').trim(),
      region: regionSelect.value || 'Greater Accra',
      locality: (localityInput.value || '').trim(),
      amountPaid: (amountInput.value || '').trim() || calcAmt,
      surveyorName: (surveyorInput.value || '').trim(),
      stationLocation: (stationLocationInput ? stationLocationInput.value : '').trim() || 'GWCL, DODOWA',
      smdOfficerName: (smdOfficerInput.value || '').trim(),
      beacons: JSON.parse(JSON.stringify(currentBeacons)),
      baseUrl: (baseUrlInput.value || '').trim(),
      verificationUrl: vUrl,
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
    // Official Ghana CORS Verification Domain (displays "ghanacorsnet-verify..." on mobile scan)
    const defaultVerificationOrigin = 'https://ghanacorsnet-verify.vercel.app';
    baseUrlInput.value = defaultVerificationOrigin;

    const statusEl = document.getElementById('netStatusText');
    if (statusEl) statusEl.textContent = `🌐 ghanacorsnet-verify Active`;
    if (tunnelStatusBadge) {
      tunnelStatusBadge.innerHTML = `
        <span style="display: inline-block; width: 8px; height: 8px; background: #10b981; border-radius: 50%; box-shadow: 0 0 6px #10b981;"></span>
        <span><strong>ghanacorsnet-verify Active:</strong> Mobile scans will display <code>ghanacorsnet-verify...</code></span>
      `;
    }

    try {
      const res = await fetch('/api/network-info');
      if (res.ok) {
        networkInfo = await res.json();
        if (modalIpDisplay) modalIpDisplay.textContent = networkInfo.localIp;
        updateLivePreview();
      }
    } catch (e) {
      // Keep official domain as default
      baseUrlInput.value = defaultVerificationOrigin;
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
    pointsInput.value = '4';
    clientNameInput.value = '';
    regionSelect.value = 'Greater Accra';
    localityInput.value = '';
    updateAmountFromPoints();
    surveyorInput.value = '';
    if (stationLocationInput) stationLocationInput.value = 'GWCL, DODOWA';
    smdOfficerInput.value = '';

    currentBeacons = [
      { beaconIndex: defaultBeacon, x: '434768.62', y: '1230591.872' }
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
    currentLoadedVerificationUrl = data.verificationUrl || '';
    refIdInput.value = data.referenceId || generateUniqueRefId();
    regionalNoInput.value = data.regionalNumber || '';
    vCodeInput.value = data.verificationCode || generateVerificationCode(data.beacons && data.beacons[0] ? data.beacons[0].beaconIndex : '');
    dateInput.value = data.date || getTodayString();
    
    // Process points must be from 4 upward
    const pts = Math.max(4, parseInt(data.processedPoints, 10) || (data.beacons ? data.beacons.length : 4));
    pointsInput.value = pts;
    
    clientNameInput.value = data.clientName || '';
    regionSelect.value = data.region || 'Greater Accra';
    localityInput.value = data.locality || '';
    
    updateAmountFromPoints();
    if (data.amountPaid && data.amountPaid !== 'GHS 150.00') {
      amountInput.value = data.amountPaid;
    }

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
        <td><input type="text" list="corsStationsDatalist" class="beacon-index-input" data-index="${index}" value="${escapeHtml(b.beaconIndex || '')}" placeholder="Select or type CORS ID"></td>
        <td><input type="text" class="beacon-x-input" data-index="${index}" value="${escapeHtml(String(b.x || ''))}" placeholder="e.g. 434768.62" required></td>
        <td><input type="text" class="beacon-y-input" data-index="${index}" value="${escapeHtml(String(b.y || ''))}" placeholder="e.g. 1230591.872" required></td>
        <td style="text-align: center;">
          ${currentBeacons.length > 1 ? `<button type="button" class="btn-remove-row" data-index="${index}" title="Remove point">&times;</button>` : ''}
        </td>
      `;
      beaconsBody.appendChild(tr);
    });

    // Process points must be from 4 upward and at least currentBeacons.length
    const currentPts = parseInt(pointsInput.value, 10) || 4;
    const finalPts = Math.max(4, currentBeacons.length, currentPts);
    pointsInput.value = finalPts;
    updateAmountFromPoints();

    // Row input events
    beaconsBody.querySelectorAll('input').forEach(input => {
      input.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        e.target.classList.remove('coord-input-error');
        const errNotice = document.getElementById('beaconCoordErrorNotice');
        if (errNotice) errNotice.style.display = 'none';

        if (e.target.classList.contains('beacon-index-input')) {
          currentBeacons[idx].beaconIndex = e.target.value;
          
          // Auto-fill coordinates and station location when matching preloaded station is typed or selected
          const matchedStation = findCorsStation(e.target.value);
          if (matchedStation) {
            currentBeacons[idx].beaconIndex = matchedStation.corsId;
            currentBeacons[idx].x = matchedStation.x;
            currentBeacons[idx].y = matchedStation.y;

            const xInput = beaconsBody.querySelector(`.beacon-x-input[data-index="${idx}"]`);
            const yInput = beaconsBody.querySelector(`.beacon-y-input[data-index="${idx}"]`);
            if (xInput) {
              xInput.value = matchedStation.x;
              xInput.classList.remove('coord-input-error');
            }
            if (yInput) {
              yInput.value = matchedStation.y;
              yInput.classList.remove('coord-input-error');
            }

            if (stationLocationInput) {
              stationLocationInput.value = matchedStation.location;
            }

            if (idx === 0) {
              vCodeInput.value = generateVerificationCode(matchedStation.corsId);
            }

            showToast(`✓ Auto-loaded coordinates & location: ${matchedStation.location}`);
          }
        }
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
    if (currentBeacons.length > parseInt(pointsInput.value, 10)) {
      pointsInput.value = currentBeacons.length;
      updateAmountFromPoints();
    }
    updateLivePreview();
    triggerAutoSave();
  });

  // 4. Update Live Preview (Both Slip 1 and Slip 2)
  let qrDebounceTimer = null;
  function updateLivePreview(immediate = false) {
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
    if (immediate) {
      clearTimeout(qrDebounceTimer);
      updateQrCode();
    } else {
      clearTimeout(qrDebounceTimer);
      qrDebounceTimer = setTimeout(() => {
        updateQrCode();
      }, 150);
    }
  }

  function toBase64(str) {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  function toBase64Url(str) {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  
  // Encode compact pipe-delimited token so verification page renders 100% reliably anywhere
  function buildCompactToken(r) {
    try {
      const id = String(r.referenceId || r.id || '').trim().toUpperCase();
      const client = String(r.clientName || '').trim().toUpperCase();
      const officialClients = {
        'GX1722219': 'LIZZETTE ANTWI BOASIAKO & ANNETTE ANTWI-BOASIAKO',
        'GX7109723': 'ALBERT WALE & AKUA SEKYERAA APPIAH',
        'GX2193345': 'DAVID AGBEME',
        'GX4950255': 'LIZZETTE ANTWI BOASIAKO & ANNETTE ANTWI-BOASIAKO',
        'GX8888888': 'NEW TEST OFFICER',
        'GX8967032': 'KWAME ASANTE',
        'GX9991111': 'TEST CLIENT COLD START'
      };
      if (officialClients[id] && (!client || officialClients[id].toUpperCase() === client)) {
        return ''; // Clean official URL matching official reference PDF
      }

      const beacons = Array.isArray(r.beacons) && r.beacons.length > 0 
        ? r.beacons 
        : [{ beaconIndex: 'SGGA CORS/2025/4', x: '434768.62', y: '1230591.872' }];
      const b0 = beacons[0] || {};
      const beaconsStr = beacons.map(b => `${(b.beaconIndex || '').trim()}:${(b.x || '').trim()}:${(b.y || '').trim()}`).join(';');
      
      const parts = [
        r.clientName || '',
        r.regionalNumber || '',
        r.verificationCode || '',
        r.locality || '',
        r.stationLocation || 'GWCL, DODOWA',
        r.date || '03 November 2026',
        r.surveyorName || '',
        String(r.processedPoints || beacons.length || 4),
        String(b0.x || '434768.62'),
        String(b0.y || '1230591.872'),
        beaconsStr || b0.beaconIndex || 'SGGA CORS/2025/4',
        r.referenceId || r.id || '',
        r.amountPaid || 'GHS 150.00',
        r.region || 'Greater Accra',
        r.transactionId || '',
        r.smdOfficerName || ''
      ];
      return toBase64Url(parts.join('|'));
    } catch (e) {
      return '';
    }
  }

  function constructVerificationUrl(r, customBase) {
    if (r && r.verificationUrl && typeof r.verificationUrl === 'string' && r.verificationUrl.startsWith('http')) {
      if (customBase && !r.verificationUrl.startsWith(customBase.replace(/\/$/, ''))) {
        try {
          const parsed = new URL(r.verificationUrl);
          return `${customBase.replace(/\/$/, '')}${parsed.pathname}${parsed.search}`;
        } catch (e) {}
      }
      return r.verificationUrl;
    }
    const baseUrl = (customBase || baseUrlInput.value.trim() || networkInfo.lanUrl).replace(/\/$/, '');
    const refId = (r.referenceId || r.id || '').trim();
    const compactToken = buildCompactToken(r);
    return compactToken
      ? `${baseUrl}/verify/${encodeURIComponent(refId)}?d=${compactToken}`
      : `${baseUrl}/verify/${encodeURIComponent(refId)}`;
  }

  // Dedicated offscreen container for instant zero-latency client-side QR generation
  const offscreenQrDiv = document.createElement('div');
  offscreenQrDiv.style.position = 'absolute';
  offscreenQrDiv.style.left = '-9999px';
  offscreenQrDiv.style.top = '-9999px';
  document.body.appendChild(offscreenQrDiv);

  function getQrDataUrlOrSrc(targetUrl) {
    if (!targetUrl) {
      targetUrl = 'https://ghanacorsnet-verify.vercel.app/verify/GX1722219';
    }
    // 1. Try instant client-side QR code generation as 100% vector SVG
    if (window.QRCode && typeof window.QRCode === 'function') {
      try {
        offscreenQrDiv.innerHTML = '';
        const qrInstance = new window.QRCode(offscreenQrDiv, {
          text: targetUrl,
          width: 256,
          height: 256,
          correctLevel: window.QRCode.CorrectLevel.L
        });

        // Generate razor-sharp vector SVG directly from QR modules
        if (qrInstance && qrInstance._oQRCode && typeof qrInstance._oQRCode.getModuleCount === 'function') {
          const qrModel = qrInstance._oQRCode;
          const count = qrModel.getModuleCount();
          const margin = 4;
          const total = count + margin * 2;
          const rects = [];
          for (let r = 0; r < count; r++) {
            for (let c = 0; c < count; c++) {
              if (qrModel.isDark(r, c)) {
                rects.push(`<rect x="${c + margin}" y="${r + margin}" width="1" height="1" fill="#000000"/>`);
              }
            }
          }
          const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="100%" height="100%" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#ffffff"/>${rects.join('')}</svg>`;
          try {
            return `data:image/svg+xml;base64,${toBase64(svgStr)}`;
          } catch (e) {
            return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgStr)}`;
          }
        }
      } catch (e) {
        console.warn('Client QR render note:', e.message);
      }
    }

    // 2. High-res vector SVG endpoint fallback (works across local and production hosts)
    const isFileProto = window.location.protocol === 'file:';
    const apiOrigin = isFileProto ? 'https://ghanacorsnet-verify.vercel.app' : '';
    return `${apiOrigin}/api/qr?text=${encodeURIComponent(targetUrl)}&format=svg`;
  }

  // Update QR Code image source (always carries stateless token so phone scans never 404)
  function updateQrCode() {
    const currentRec = getCurrentFormData();
    const targetUrl = constructVerificationUrl(currentRec);
    const finalQrSrc = getQrDataUrlOrSrc(targetUrl);

    document.querySelectorAll('.preview-qr-img').forEach(img => {
      img.onerror = () => {
        img.onerror = null;
        img.src = `https://ghanacorsnet-verify.vercel.app/api/qr?text=${encodeURIComponent(targetUrl)}&format=svg`;
      };
      img.src = finalQrSrc;
    });

    if (modalQrImg) modalQrImg.src = finalQrSrc;
    if (modalQrUrlText) modalQrUrlText.textContent = targetUrl;
    return targetUrl;
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
  if (btnUseGhanaCorsNet) {
    btnUseGhanaCorsNet.addEventListener('click', () => {
      baseUrlInput.value = 'https://ghanacorsnet-verify.vercel.app';
      baseUrlInput.dataset.userEdited = 'true';
      updateLivePreview();
      triggerAutoSave();
      showToast('Set to ghanacorsnet-verify.vercel.app (Official)', 'success');
    });
  }

  if (btnUseLandPortal) {
    btnUseLandPortal.addEventListener('click', () => {
      baseUrlInput.value = 'https://landcommission-portal.vercel.app';
      baseUrlInput.dataset.userEdited = 'true';
      updateLivePreview();
      triggerAutoSave();
      showToast('Set to landcommission-portal.vercel.app (Fallback)', 'info');
    });
  }

  if (btnUsePublic && btnUsePublic !== btnUseGhanaCorsNet) {
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

  // Smart collision prevention: When editing a client name,
  // if current referenceId already belongs to a previously saved different client, auto-generate fresh unique Reference ID!
  clientNameInput.addEventListener('blur', () => {
    const val = clientNameInput.value.trim();
    if (!val) return;
    const local = getLocalRecords();
    const currentRef = (refIdInput.value || '').trim().toUpperCase();
    const conflict = local.find(r => 
      String(r.referenceId || r.id).trim().toUpperCase() === currentRef &&
      r.clientName &&
      r.clientName.trim().toLowerCase() !== val.toLowerCase()
    );
    if (conflict) {
      const newRef = generateUniqueRefId();
      refIdInput.value = newRef;
      vCodeInput.value = generateVerificationCode(currentBeacons[0] ? currentBeacons[0].beaconIndex : '');
      updateLivePreview(true);
      showToast(`✨ Generated fresh Reference ID ${newRef} for new client: ${val}`, 'info');
    }
  });

  // Process points input events: from 4 upward, automatically calculates amount
  pointsInput.addEventListener('input', () => {
    const raw = parseInt(pointsInput.value, 10);
    if (!isNaN(raw) && raw >= 4) {
      updateAmountFromPoints();
      updateLivePreview();
      triggerAutoSave();
    }
  });

  pointsInput.addEventListener('change', () => {
    let raw = parseInt(pointsInput.value, 10);
    if (isNaN(raw) || raw < 4) {
      pointsInput.value = 4;
      showToast('Processed points must be from 4 upward (set to minimum 4)', 'info');
    }
    updateAmountFromPoints();
    updateLivePreview();
    triggerAutoSave();
  });

  pointsInput.addEventListener('blur', () => {
    let raw = parseInt(pointsInput.value, 10);
    if (isNaN(raw) || raw < 4) {
      pointsInput.value = 4;
    }
    updateAmountFromPoints();
    updateLivePreview();
    triggerAutoSave();
  });

  // Quick Saved PDFs & Documents Selector
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

  // Preloaded CORS Stations Quick Selector (Greater Accra Region)
  const selectCorsStation = document.getElementById('selectCorsStation');
  const btnApplyCorsStation = document.getElementById('btnApplyCorsStation');

  function applySelectedStation(val) {
    const stationId = val || (selectCorsStation ? selectCorsStation.value : '');
    if (!stationId) return;
    const station = findCorsStation(stationId);
    if (!station) return;

    if (!currentBeacons || currentBeacons.length === 0) {
      currentBeacons = [{ beaconIndex: station.corsId, x: station.x, y: station.y }];
    } else {
      let targetIdx = currentBeacons.findIndex(b => !b.x && !b.y);
      if (targetIdx === -1) targetIdx = 0;
      currentBeacons[targetIdx].beaconIndex = station.corsId;
      currentBeacons[targetIdx].x = station.x;
      currentBeacons[targetIdx].y = station.y;
    }

    if (stationLocationInput) {
      stationLocationInput.value = station.location;
    }

    vCodeInput.value = generateVerificationCode(station.corsId);

    renderBeaconsEditor();
    updateLivePreview();
    triggerAutoSave();
    showToast(`✓ Loaded ${station.corsId}: Northing ${station.x}, Easting ${station.y} (${station.location})`, 'success');
  }

  if (selectCorsStation) {
    selectCorsStation.addEventListener('change', () => {
      applySelectedStation(selectCorsStation.value);
    });
  }

  if (btnApplyCorsStation) {
    btnApplyCorsStation.addEventListener('click', () => {
      applySelectedStation(selectCorsStation ? selectCorsStation.value : '');
    });
  }

  // Auto-link Station Location datalist selection to matching CORS station
  if (stationLocationInput) {
    stationLocationInput.addEventListener('change', () => {
      const locVal = stationLocationInput.value.trim().toUpperCase();
      const matched = PRELOADED_CORS_STATIONS.find(s => s.location.toUpperCase() === locVal);
      if (matched && currentBeacons.length > 0) {
        const b0 = currentBeacons[0];
        if (!b0.x || !b0.y || PRELOADED_CORS_STATIONS.some(s => s.corsId === b0.beaconIndex)) {
          b0.beaconIndex = matched.corsId;
          b0.x = matched.x;
          b0.y = matched.y;
          vCodeInput.value = generateVerificationCode(matched.corsId);
          renderBeaconsEditor();
          updateLivePreview();
          triggerAutoSave();
          showToast(`✓ Auto-loaded ${matched.corsId} for ${matched.location}`);
        }
      }
    });
  }

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

    // Only commit to persistent saved registry and server if both clientName AND beacon coordinates are entered!
    const coordsValid = validateBeaconCoordinates({ showUiErrors: false });
    if (currentRec.clientName && currentRec.clientName.trim().length > 1 && coordsValid) {
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
      const keys = [
        'landscommission_saved_records_v3',
        'landscommission_saved_records_v2',
        'landscommission_saved_records_v1',
        'landscommission_saved_records'
      ];
      const map = new Map();
      keys.forEach(k => {
        try {
          const raw = localStorage.getItem(k);
          if (raw) {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
              list.forEach(r => {
                const idKey = String(r.referenceId || r.id || '').trim().toLowerCase();
                if (idKey && !map.has(idKey)) {
                  map.set(idKey, r);
                }
              });
            }
          }
        } catch (e) {}
      });
      return Array.from(map.values());
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

  // Automatically migrate ALL existing saved forms across all storage versions
  // Regenerates QR representations with new SVG vector standard, preserves all user data, IDs, and destination URLs
  function migrateAllExistingSavedForms() {
    try {
      const keys = [
        'landscommission_saved_records_v3',
        'landscommission_saved_records_v2',
        'landscommission_saved_records_v1',
        'landscommission_saved_records'
      ];
      const recordMap = new Map();

      // 1. Preload official saved records
      OFFICIAL_SAVED_RECORDS.forEach(r => {
        const idKey = String(r.referenceId || r.id || '').trim().toLowerCase();
        if (idKey) {
          const cleanRec = { ...r };
          cleanRec.verificationUrl = cleanRec.verificationUrl || `https://ghanacorsnet-verify.vercel.app/verify/${cleanRec.referenceId || cleanRec.id}`;
          recordMap.set(idKey, cleanRec);
        }
      });

      // 2. Scan every storage key in localStorage
      keys.forEach(k => {
        try {
          const raw = localStorage.getItem(k);
          if (raw) {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
              list.forEach(r => {
                const idKey = String(r.referenceId || r.id || '').trim().toLowerCase();
                if (idKey) {
                  const existing = recordMap.get(idKey);
                  // Merge preserving all user-entered form details
                  const merged = existing ? { ...existing, ...r } : { ...r };

                  // Ensure destination URL is strictly preserved
                  if (!merged.verificationUrl || typeof merged.verificationUrl !== 'string' || !merged.verificationUrl.startsWith('http')) {
                    merged.verificationUrl = constructVerificationUrl(merged);
                  }

                  // Purge any stale raster image data to guarantee pure vector SVG rendering
                  delete merged.qrCode;
                  delete merged.qrDataUrl;
                  delete merged.qrImage;
                  delete merged.rasterQr;
                  delete merged.qrCanvas;

                  merged.status = 'ACTIVE_VERIFIED';
                  recordMap.set(idKey, merged);
                }
              });
            }
          }
        } catch (e) {}
      });

      // 3. Purge raster data from working drafts
      const draftKeys = [
        'landscommission_active_draft_v3',
        'landscommission_active_draft_v2',
        'landscommission_active_draft'
      ];
      draftKeys.forEach(dk => {
        try {
          const raw = localStorage.getItem(dk);
          if (raw) {
            const draft = JSON.parse(raw);
            if (draft && typeof draft === 'object') {
              delete draft.qrCode;
              delete draft.qrDataUrl;
              delete draft.qrImage;
              delete draft.rasterQr;
              delete draft.qrCanvas;
              if (!draft.verificationUrl && draft.referenceId) {
                draft.verificationUrl = constructVerificationUrl(draft);
              }
              localStorage.setItem(dk, JSON.stringify(draft));
            }
          }
        } catch (e) {}
      });

      const migratedList = Array.from(recordMap.values());
      if (migratedList.length > 0) {
        localStorage.setItem(STORAGE_KEYS.SAVED_RECORDS, JSON.stringify(migratedList));
      }
      return migratedList;
    } catch (err) {
      console.warn('Migration note:', err);
      return [];
    }
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

      // 1. If coordinates of beacon index have not been entered, display error and don't save document
      if (!validateBeaconCoordinates({ showUiErrors: true })) {
        return; // Don't save document!
      }

      // 2. Process points should be from 4 upward
      let pts = parseInt(pointsInput.value, 10);
      if (isNaN(pts) || pts < 4) {
        pointsInput.value = 4;
        updateAmountFromPoints();
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

    // 1. If coordinates of beacon index have not been entered, display error and don't save document
    if (!validateBeaconCoordinates({ showUiErrors: true })) {
      return; // Don't save document!
    }

    // 2. Process points should be from 4 upward
    let pts = parseInt(pointsInput.value, 10);
    if (isNaN(pts) || pts < 4) {
      pointsInput.value = 4;
      updateAmountFromPoints();
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
      updateLivePreview(true);

      // Force preview QR images to load current record's QR and wait for load
      const qrTargetUrl = constructVerificationUrl(rec);
      const qrSrc = getQrDataUrlOrSrc(qrTargetUrl);
      const qrImages = document.querySelectorAll('.preview-qr-img');
      await Promise.all(Array.from(qrImages).map(img => {
        return new Promise(resolve => {
          if (img.src === qrSrc && img.complete) {
            return resolve();
          }
          img.onload = resolve;
          img.onerror = resolve;
          img.src = qrSrc;
          setTimeout(resolve, 300);
        });
      }));

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

  // Collision protection helper: ensures no two different clients share the same reference ID
  function ensureUniqueRefIdForCurrentClient() {
    const local = getLocalRecords();
    const cleanRef = (refIdInput.value || '').trim().toUpperCase();
    const clientNameVal = clientNameInput.value.trim().toLowerCase();
    const existingWithDiffClient = local.find(r => 
      String(r.referenceId || r.id).trim().toUpperCase() === cleanRef &&
      r.clientName && 
      r.clientName.trim().toLowerCase() !== clientNameVal
    );
    if (existingWithDiffClient) {
      const newRef = generateUniqueRefId();
      refIdInput.value = newRef;
      vCodeInput.value = generateVerificationCode(currentBeacons[0] ? currentBeacons[0].beaconIndex : '');
      updateLivePreview(true);
      showToast(`✓ Assigned unique Reference ID: ${newRef} for ${clientNameInput.value.trim()}`, 'info');
    }
  }

  // 6b. Download PDF from Form / Toolbar
  async function downloadPdf() {
    if (!clientNameInput.value.trim()) {
      showToast('Please enter Client Name before generating PDF', 'error');
      clientNameInput.focus();
      return;
    }

    // Coordinates of beacon index must be entered
    if (!validateBeaconCoordinates({ showUiErrors: true })) {
      return;
    }

    ensureUniqueRefIdForCurrentClient();
    const currentRec = getCurrentFormData();
    await executeAutoSave();
    await downloadPdfForRecord(currentRec, btnDownloadPdf);
  }

  btnDownloadPdf.addEventListener('click', downloadPdf);
  btnToolbarDownload.addEventListener('click', downloadPdf);

  // 7. Print Slip
  async function printSlip() {
    // Coordinates of beacon index must be entered
    if (!validateBeaconCoordinates({ showUiErrors: true })) {
      return;
    }

    if (clientNameInput.value.trim()) {
      ensureUniqueRefIdForCurrentClient();
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
      const verifyUrl = constructVerificationUrl(currentRec);
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

    // 1. Always ensure all official saved documents & PDFs are in the catalog
    OFFICIAL_SAVED_RECORDS.forEach(r => {
      const key = String(r.referenceId || r.id || '').trim().toLowerCase();
      if (key) recordMap.set(key, r);
    });

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
      const vUrl = constructVerificationUrl(r);
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
          <a href="${vUrl}" target="_blank" class="btn btn-secondary btn-sm" title="Open Verification Gateway" style="text-decoration: none;">
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

  // INITIAL BOOT: Sync with server, restore active draft if available, or load official record
  initNetwork().then(async () => {
    // 0. Automatically migrate all existing saved forms across all storage versions to new vector QR standard
    migrateAllExistingSavedForms();

    // 1. Sync local vault with server immediately on startup
    await syncFullVaultWithServer();
    await fetchRecordsList();

    // 2. Restore active working draft from any version (v3, v2, v1)
    let savedDraft = null;
    const draftKeys = [
      'landscommission_active_draft_v3',
      'landscommission_active_draft_v2',
      'landscommission_active_draft'
    ];
    for (const dk of draftKeys) {
      try {
        const raw = localStorage.getItem(dk);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && (parsed.clientName || parsed.referenceId)) {
            savedDraft = parsed;
            break;
          }
        }
      } catch (e) {}
    }

    if (savedDraft && savedDraft.clientName && savedDraft.referenceId) {
      loadData(savedDraft);
      setAutoSaveStatus('ready', '✓ Draft restored');
    } else {
      const refDoc = (allRecords && allRecords.find(r => r.referenceId === 'GX1722219')) || SAMPLE_DATA;
      loadData(refDoc);
      setAutoSaveStatus('ready', '✓ Official Reference Document loaded');
    }
    updateQrCode();
  });

});
