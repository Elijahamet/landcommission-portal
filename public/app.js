// Lands Commission EX DATA Front-End Logic
document.addEventListener('DOMContentLoaded', () => {
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

  // Sample data kept ONLY for the "Load Sample" button if the user wants to test with 1 click
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

  // Helper to generate a new unique Reference ID for each person
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

  // 1. Initialize Network Information (Detects both LAN IP, Vercel Production, and Public Tunnel)
  async function initNetwork() {
    // If running in browser on Vercel or any HTTPS domain, use the current origin immediately
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
          document.getElementById('netStatusText').textContent = `🌐 Worldwide Public Online`;
          baseUrlInput.value = networkInfo.publicUrl;
          if (tunnelStatusBadge) {
            tunnelStatusBadge.innerHTML = `
              <span style="display: inline-block; width: 8px; height: 8px; background: #10b981; border-radius: 50%; box-shadow: 0 0 6px #10b981;"></span>
              <span><strong>Worldwide Public Link Active:</strong> Scannable anywhere on mobile data (4G/5G) or any Wi-Fi!</span>
            `;
          }
        } else {
          document.getElementById('netStatusText').textContent = `Connecting Public Link...`;
          baseUrlInput.value = networkInfo.lanUrl;
          pollPublicTunnel();
        }

        if (modalIpDisplay) modalIpDisplay.textContent = networkInfo.localIp;
        updateLivePreview();
      }
    } catch (e) {
      console.warn('Network info fetch error:', e);
      baseUrlInput.value = window.location.origin;
    }
  }

  // Poll for Cloudflare public tunnel ready
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
            document.getElementById('netStatusText').textContent = `🌐 Worldwide Public Online`;
            
            // Auto upgrade base URL if user hasn't typed their own custom host
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

  // 2. Initialize a Brand New, Clean Record (No Mock Data)
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
  }

  // Load specific data (used by Sample button or Saved Records loader)
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

    // Auto-update points count
    pointsInput.value = currentBeacons.length;

    // Attach row input events
    beaconsBody.querySelectorAll('input').forEach(input => {
      input.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        if (e.target.classList.contains('beacon-index-input')) currentBeacons[idx].beaconIndex = e.target.value;
        if (e.target.classList.contains('beacon-x-input')) currentBeacons[idx].x = e.target.value;
        if (e.target.classList.contains('beacon-y-input')) currentBeacons[idx].y = e.target.value;
        updateLivePreview();
      });
    });

    // Attach row remove events
    beaconsBody.querySelectorAll('.btn-remove-row').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        currentBeacons.splice(idx, 1);
        renderBeaconsEditor();
        updateLivePreview();
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

  // Update QR Code image source for the current person's specific link
  function updateQrCode() {
    const baseUrl = (baseUrlInput.value.trim() || networkInfo.lanUrl).replace(/\/$/, '');
    const refId = refIdInput.value.trim() || 'GX0000000';
    const targetUrl = `${baseUrl}/verify/${encodeURIComponent(refId)}`;
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
    showToast('New Reference ID: ' + refIdInput.value);
  });

  btnGenVCode.addEventListener('click', () => {
    vCodeInput.value = generateVerificationCode();
    updateLivePreview();
    showToast('New Verification Code generated');
  });

  // Base URL Switches
  if (btnUsePublic) {
    btnUsePublic.addEventListener('click', () => {
      if (networkInfo.publicUrl) {
        baseUrlInput.value = networkInfo.publicUrl;
        baseUrlInput.dataset.userEdited = 'true';
        updateLivePreview();
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
    showToast('Base URL set to Wi-Fi IP (requires same Wi-Fi)');
  });

  btnUseLocalhost.addEventListener('click', () => {
    baseUrlInput.value = `http://localhost:${networkInfo.port}`;
    baseUrlInput.dataset.userEdited = 'true';
    updateLivePreview();
    showToast('Base URL set to Localhost (this PC only)');
  });

  baseUrlInput.addEventListener('input', () => {
    baseUrlInput.dataset.userEdited = 'true';
  });

  // Form input listeners for live syncing
  form.querySelectorAll('input, select').forEach(el => {
    el.addEventListener('input', updateLivePreview);
    el.addEventListener('change', updateLivePreview);
  });

  // Load sample button
  btnLoadSample.addEventListener('click', () => {
    loadData(SAMPLE_DATA);
    showToast('Loaded sample EX DATA for testing');
  });

  // New record button: Generates a brand new person with a fresh unique QR Code
  btnNewRecord.addEventListener('click', () => {
    initCleanNewPerson();
    clientNameInput.focus();
    showToast('New clean form ready. A unique QR code has been generated!');
  });

  // Helper to persist current record to backend
  async function persistCurrentRecord() {
    const refId = refIdInput.value.trim() || generateUniqueRefId();
    refIdInput.value = refId;

    const payload = {
      referenceId: refId,
      regionalNumber: regionalNoInput.value.trim(),
      verificationCode: vCodeInput.value.trim(),
      date: dateInput.value.trim() || getTodayString(),
      processedPoints: parseInt(pointsInput.value, 10) || currentBeacons.length,
      clientName: clientNameInput.value.trim(),
      region: regionSelect.value,
      locality: localityInput.value.trim(),
      amountPaid: amountInput.value.trim(),
      surveyorName: surveyorInput.value.trim(),
      smdOfficerName: smdOfficerInput.value.trim(),
      beacons: currentBeacons,
      baseUrl: baseUrlInput.value.trim()
    };

    const res = await fetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to save record');
    fetchRecordsList();
    return data.record;
  }

  // 5. Save Record Explicitly
  btnSaveRecord.addEventListener('click', async () => {
    if (!clientNameInput.value.trim()) {
      showToast('Please enter the Client Name before saving', 'error');
      clientNameInput.focus();
      return;
    }

    try {
      btnSaveRecord.disabled = true;
      btnSaveRecord.textContent = 'Saving...';
      const saved = await persistCurrentRecord();
      showToast(`✓ Record for "${saved.clientName}" saved! Verification QR is active.`, 'success');
    } catch (e) {
      showToast('Error saving: ' + e.message, 'error');
    } finally {
      btnSaveRecord.disabled = false;
      btnSaveRecord.textContent = '💾 Save & Update Record';
    }
  });

  // 6. Download PDF (Always auto-saves first so the QR code scannable link is guaranteed to work!)
  async function downloadPdf() {
    if (!clientNameInput.value.trim()) {
      showToast('Please enter Client Name before downloading PDF', 'error');
      clientNameInput.focus();
      return;
    }

    try {
      showToast('Preparing official PDF...', 'info');
      // 1. Ensure record is saved to registry first!
      const saved = await persistCurrentRecord();
      const refId = encodeURIComponent(saved.referenceId);
      const baseUrl = encodeURIComponent(baseUrlInput.value.trim());

      // 2. Trigger download of the server-generated vector PDF named after the unique Reference ID
      const downloadUrl = `/api/records/${refId}/pdf?baseUrl=${baseUrl}`;
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${saved.referenceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      showToast(`✓ PDF archived on server & downloaded as "${saved.referenceId}.pdf"!`, 'success');

      // Clear the form and generate fresh unique IDs for the next entry
      setTimeout(() => {
        initCleanNewPerson();
        showToast('Form cleared. Ready for next person with new unique ID!', 'info');
      }, 1600);
    } catch (e) {
      showToast('Download error: ' + e.message, 'error');
    }
  }

  btnDownloadPdf.addEventListener('click', downloadPdf);
  btnToolbarDownload.addEventListener('click', downloadPdf);

  // 7. Print Slip (Auto-saves first so printed QR is verified!)
  async function printSlip() {
    if (clientNameInput.value.trim()) {
      try {
        await persistCurrentRecord();
      } catch (e) {}
    }
    window.print();
  }

  btnPrintSlip.addEventListener('click', printSlip);
  btnToolbarPrint.addEventListener('click', printSlip);

  // 8. Test Verification Page
  btnTestVerification.addEventListener('click', async () => {
    try {
      if (clientNameInput.value.trim()) {
        await persistCurrentRecord();
      }
      const baseUrl = (baseUrlInput.value.trim() || networkInfo.lanUrl).replace(/\/$/, '');
      const refId = refIdInput.value.trim();
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

  // Fetch and display saved records
  async function fetchRecordsList() {
    try {
      const res = await fetch('/api/records');
      const data = await res.json();
      if (data.success && data.records) {
        allRecords = data.records;
        recordsCountBadge.textContent = allRecords.length;
        renderRecordsList(allRecords);
      }
    } catch (e) {
      console.error('Error fetching records:', e);
    }
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
      item.innerHTML = `
        <div class="record-meta">
          <h4>${escapeHtml(r.referenceId || r.id)} - ${escapeHtml(r.clientName || 'Unnamed')}</h4>
          <p>📍 ${escapeHtml(r.locality || 'Locality unassigned')}, ${escapeHtml(r.region || '')} • 📅 ${escapeHtml(r.date || '')}</p>
        </div>
        <div class="record-actions">
          <button class="btn btn-secondary btn-sm btn-load-record" data-id="${escapeHtml(r.id || r.referenceId)}">Load</button>
          <a href="/api/records/${encodeURIComponent(r.referenceId || r.id)}/pdf" class="btn btn-primary btn-sm" download>PDF</a>
          <button class="btn btn-secondary btn-sm btn-delete-record" data-id="${escapeHtml(r.id || r.referenceId)}" style="color:#ef4444;">Delete</button>
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
          await fetch(`/api/records/${encodeURIComponent(id)}`, { method: 'DELETE' });
          fetchRecordsList();
          showToast(`Record ${id} deleted`);
        }
      });
    });
  }

  // Filter records
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

  // INITIAL BOOT: Clean, clear form with unique IDs!
  initNetwork().then(() => {
    initCleanNewPerson();
    fetchRecordsList();
  });

});
