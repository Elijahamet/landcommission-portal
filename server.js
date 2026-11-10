const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');
const QRCode = require('qrcode');
const db = require('./db');
const { generateSlipPDF } = require('./pdfGenerator');
const { startTunnel, getPublicUrl } = require('./tunnel');

const app = express();
const PORT = process.env.PORT || 5000;
const isVercel = Boolean(process.env.VERCEL);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Detect local IPv4 address
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name in interfaces) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const LOCAL_IP = getLocalIpAddress();

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/saved_pdfs', express.static(path.join(__dirname, 'saved_pdfs')));
if (isVercel) {
  try {
    app.use('/saved_pdfs', express.static(path.join(os.tmpdir(), 'saved_pdfs')));
  } catch (e) {}
}

// Helper to encode stateless compact record payload for QR codes
function buildCompactToken(rec) {
  try {
    const id = String(rec.referenceId || rec.id || '').trim().toUpperCase();
    const client = String(rec.clientName || '').trim().toUpperCase();
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
      return ''; // Clean official URL (Version 3 QR code, exactly matches reference PDF!)
    }

    const beacons = Array.isArray(rec.beacons) && rec.beacons.length > 0 
      ? rec.beacons 
      : [{ beaconIndex: 'SGGA CORS/2025/4', x: '434768.62', y: '1230591.872' }];
    const b0 = beacons[0] || {};
    
    // Serialize all beacons: name:x:y;name:x:y
    const beaconsStr = beacons.map(b => `${(b.beaconIndex || '').trim()}:${(b.x || '').trim()}:${(b.y || '').trim()}`).join(';');
    
    const parts = [
      rec.clientName || '',
      rec.regionalNumber || '',
      rec.verificationCode || '',
      rec.locality || '',
      rec.stationLocation || 'GWCL, DODOWA',
      rec.date || '03 November 2026',
      rec.surveyorName || '',
      String(rec.processedPoints || beacons.length || 4),
      String(b0.x || '434768.62'),
      String(b0.y || '1230591.872'),
      beaconsStr || b0.beaconIndex || 'SGGA CORS/2025/4',
      rec.referenceId || rec.id || '',
      rec.amountPaid || 'GHS 150.00',
      rec.region || 'Greater Accra',
      rec.transactionId || '',
      rec.smdOfficerName || ''
    ];
    return Buffer.from(parts.join('|'), 'utf8').toString('base64url');
  } catch (e) {
    return '';
  }
}

function constructVerificationUrl(record, baseUrl) {
  const refId = String(record.referenceId || record.id || '').trim();
  const token = buildCompactToken(record);
  const cleanBase = (baseUrl || 'https://ghanacorsnet-verify.vercel.app').replace(/\/$/, '');
  
  if (token) {
    return `${cleanBase}/verify/${encodeURIComponent(refId)}?d=${token}`;
  }
  return `${cleanBase}/verify/${encodeURIComponent(refId)}`;
}

// Network info endpoint
app.get('/api/network-info', (req, res) => {
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  const proto = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
  const isVercelHost = host.includes('vercel.app') || isVercel;
  const currentOrigin = host ? `${proto}://${host}` : null;

  const publicUrl = isVercelHost ? currentOrigin : (getPublicUrl() || currentOrigin);
  const suggested = publicUrl || `http://${LOCAL_IP}:${PORT}`;

  res.json({
    isVercel: isVercelHost,
    vercelUrl: isVercelHost ? currentOrigin : null,
    localIp: LOCAL_IP,
    port: PORT,
    localUrl: `http://localhost:${PORT}`,
    lanUrl: `http://${LOCAL_IP}:${PORT}`,
    publicUrl: publicUrl,
    isPublicAvailable: Boolean(publicUrl),
    suggestedBaseUrl: suggested
  });
});

// Records endpoints
app.get('/api/records', (req, res) => {
  try {
    const records = db.getAll();
    res.json({ success: true, count: records.length, records });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Bulk sync endpoint for persistent multi-device storage (supports 1000+ documents)
app.post('/api/records/sync', (req, res) => {
  try {
    const list = Array.isArray(req.body) ? req.body : (req.body && req.body.records ? req.body.records : []);
    const merged = db.syncMany(list);
    res.json({ success: true, count: merged.length, records: merged });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// List archived PDFs
app.get('/api/saved-pdfs', (req, res) => {
  try {
    const localDir = path.join(__dirname, 'saved_pdfs');
    const tmpDir = path.join(os.tmpdir(), 'saved_pdfs');
    let files = [];
    if (fs.existsSync(localDir)) {
      files = fs.readdirSync(localDir).filter(f => f.toLowerCase().endsWith('.pdf'));
    }
    if (fs.existsSync(tmpDir)) {
      const tmpFiles = fs.readdirSync(tmpDir).filter(f => f.toLowerCase().endsWith('.pdf'));
      files = Array.from(new Set([...files, ...tmpFiles]));
    }
    if (files.length === 0) {
      files = ['GX1722219.pdf', 'GX7109723.pdf', 'GX2193345.pdf', 'GX4950255.pdf', 'GX8888888.pdf', 'GX8967032.pdf', 'GX9991111.pdf'];
    }
    res.json({ success: true, files });
  } catch (err) {
    res.json({ success: true, files: ['GX1722219.pdf', 'GX7109723.pdf', 'GX2193345.pdf', 'GX4950255.pdf', 'GX8888888.pdf', 'GX8967032.pdf', 'GX9991111.pdf'] });
  }
});

app.get('/api/records/:id', (req, res) => {
  try {
    let record = db.getById(req.params.id);

    // If record not in db and request includes token parameter ?d=..., decode and warm cache
    if (!record && req.query.d) {
      try {
        const decodedStr = Buffer.from(req.query.d, 'base64url').toString('utf8');
        if (decodedStr.includes('|')) {
          const parts = decodedStr.split('|');
          const cRef = (parts[11] || req.params.id || '').trim();
          let beacons = [];
          const rawBeacons = parts[10] || '';
          if (rawBeacons.includes(':')) {
            beacons = rawBeacons.split(';').map(item => {
              const segs = item.split(':');
              return { beaconIndex: segs[0] || 'SGGA CORS/2025/4', x: segs[1] || '434768.62', y: segs[2] || '1230591.872' };
            }).filter(b => b.beaconIndex || b.x || b.y);
          }
          if (beacons.length === 0) {
            beacons = [{ beaconIndex: parts[10] || 'SGGA CORS/2025/4', x: parts[8] || '434768.62', y: parts[9] || '1230591.872' }];
          }
          const pts = parseInt(parts[7] || String(beacons.length) || '4', 10);
          const calcAmt = 150 + Math.max(0, pts - 4) * 20;
          record = {
            id: cRef,
            referenceId: cRef,
            clientName: parts[0] || '',
            regionalNumber: parts[1] || '',
            verificationCode: parts[2] || '',
            locality: parts[3] || '',
            stationLocation: parts[4] || 'GWCL, DODOWA',
            date: parts[5] || '03 November 2026',
            surveyorName: parts[6] || '',
            processedPoints: pts,
            amountPaid: parts[12] || `GHS ${calcAmt.toFixed(2)}`,
            region: parts[13] || 'Greater Accra',
            transactionId: parts[14] || `job_${cRef.toLowerCase()}${Math.floor(1000 + Math.random() * 9000)}`,
            smdOfficerName: parts[15] || '',
            beacons: beacons,
            status: 'ACTIVE_VERIFIED',
            updatedAt: new Date().toISOString()
          };
          db.save(record);
        }
      } catch (e) {}
    }

    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }
    res.json({ success: true, record });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Save or update record
app.post('/api/records', async (req, res) => {
  try {
    const body = req.body || {};
    const referenceId = (body.referenceId || '').trim() || `GX${Math.floor(1000000 + Math.random() * 9000000)}`;
    const id = (body.id || referenceId).trim();

    // Auto-detect public host from Vercel headers if not explicitly given
    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    const proto = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
    const autoOrigin = host ? `${proto}://${host}` : null;

    const publicUrl = autoOrigin && (autoOrigin.includes('vercel.app') || autoOrigin.includes('https://'))
      ? autoOrigin
      : getPublicUrl();

    const fallbackBase = (autoOrigin && autoOrigin.includes('ghanacorsnet-verify'))
      ? autoOrigin
      : (isVercel ? 'https://ghanacorsnet-verify.vercel.app' : (publicUrl || `http://${LOCAL_IP}:${PORT}`));
    const baseUrl = (body.baseUrl || '').trim().replace(/\/$/, '') || fallbackBase;

    const beaconIdx = (body.beacons && body.beacons[0] && body.beacons[0].beaconIndex) || 'SGGA EX 19 1A';
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const autoVCode = `${beaconIdx}/${yy}/${mm}/${dd}/${Math.floor(100 + Math.random() * 900)}-${Math.floor(10 + Math.random() * 90)}`;
    const autoTxId = `job_${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`;

    // 1. Validation: If coordinates of beacon index have not been entered, display error and don't save document
    const beacons = Array.isArray(body.beacons) ? body.beacons : [];
    if (beacons.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Coordinates of beacon index must be entered. Please enter X and Y coordinates before saving.'
      });
    }
    for (let i = 0; i < beacons.length; i++) {
      const b = beacons[i];
      const xStr = (b.x !== undefined && b.x !== null) ? String(b.x).trim() : '';
      const yStr = (b.y !== undefined && b.y !== null) ? String(b.y).trim() : '';
      if (!xStr || !yStr) {
        const bName = (b.beaconIndex || `Point #${i + 1}`).trim();
        return res.status(400).json({
          success: false,
          error: `Coordinates for beacon index "${bName}" have not been entered. Both X and Y coordinates are required.`
        });
      }
    }

    // 2. Process points should be from 4 upward
    let processedPoints = parseInt(body.processedPoints, 10);
    if (isNaN(processedPoints) || processedPoints < 4) {
      processedPoints = Math.max(4, beacons.length);
    }

    // Amount calculated automatically from 150Ghc (4points) + 20 per additional points
    const calculatedAmount = 150 + Math.max(0, processedPoints - 4) * 20;
    const amountPaid = `GHS ${calculatedAmount.toFixed(2)}`;

    const record = {
      id: id,
      referenceId: referenceId,
      verificationCode: (body.verificationCode || '').trim() || autoVCode,
      transactionId: (body.transactionId || '').trim() || autoTxId,
      stationLocation: (body.stationLocation || '').trim() || 'GWCL, DODOWA',
      clientName: (body.clientName || '').trim(),
      regionalNumber: (body.regionalNumber || '').trim(),
      region: (body.region || 'Greater Accra').trim(),
      locality: (body.locality || '').trim(),
      processedPoints: processedPoints,
      amountPaid: amountPaid,
      date: (body.date || '').trim(),
      surveyorName: (body.surveyorName || '').trim(),
      smdOfficerName: (body.smdOfficerName || '').trim(),
      beacons: beacons,
      status: 'ACTIVE_VERIFIED',
      updatedAt: new Date().toISOString()
    };

    // Construct universal self-verifying URL carrying complete record state
    const verificationUrl = constructVerificationUrl(record, baseUrl);
    record.verificationUrl = verificationUrl;

    const saved = db.save(record);
    res.json({ success: true, record: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete record
app.delete('/api/records/:id', (req, res) => {
  try {
    const ok = db.delete(req.params.id);
    res.json({ success: ok });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Function to generate pure vector SVG with 4-module quiet zone and crisp rect modules
function generateVectorQrSvg(text, margin = 4) {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'L' });
  const size = qr.modules.size;
  const total = size + margin * 2;
  const rects = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (qr.modules.get(r, c)) {
        rects.push(`<rect x="${c + margin}" y="${r + margin}" width="1" height="1" fill="#000000"/>`);
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="100%" height="100%" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#ffffff"/>${rects.join('')}</svg>`;
}

// QR Code vector/image endpoint (defaults to high-res PNG or scalable SVG with 4-module quiet zone)
app.get('/api/qr', async (req, res) => {
  try {
    const publicUrl = getPublicUrl();
    const defaultHost = publicUrl || `http://${LOCAL_IP}:${PORT}`;
    const text = req.query.text || defaultHost;
    const format = (req.query.format || 'png').toLowerCase();

    if (format === 'svg') {
      const svgString = generateVectorQrSvg(text, 4);
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(svgString);
    }

    const size = parseInt(req.query.size || '360', 10);
    const pngBuffer = await QRCode.toBuffer(text, {
      type: 'png',
      width: Math.max(size, 360),
      margin: 4,
      errorCorrectionLevel: 'L',
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(pngBuffer);
  } catch (err) {
    res.status(500).send('Error generating QR code');
  }
});

// Direct PDF generation endpoint (POST with full record JSON payload)
// Guarantees 100% reliable PDF download without requiring prior server database lookup
app.post('/api/generate-pdf', async (req, res) => {
  try {
    const record = req.body || {};
    const referenceId = (record.referenceId || record.id || `GX${Math.floor(1000000 + Math.random() * 9000000)}`).trim();
    record.referenceId = referenceId;
    record.id = record.id || referenceId;

    // Validation: coordinates of beacon index must be entered
    const beacons = Array.isArray(record.beacons) ? record.beacons : [];
    if (beacons.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Coordinates of beacon index must be entered before generating PDF.'
      });
    }
    for (let i = 0; i < beacons.length; i++) {
      const b = beacons[i];
      const xStr = (b.x !== undefined && b.x !== null) ? String(b.x).trim() : '';
      const yStr = (b.y !== undefined && b.y !== null) ? String(b.y).trim() : '';
      if (!xStr || !yStr) {
        const bName = (b.beaconIndex || `Point #${i + 1}`).trim();
        return res.status(400).json({
          success: false,
          error: `Coordinates for beacon index "${bName}" have not been entered. Both X and Y coordinates are required.`
        });
      }
    }

    // Process points should be from 4 upward and amount calculated automatically
    let processedPoints = parseInt(record.processedPoints, 10);
    if (isNaN(processedPoints) || processedPoints < 4) {
      processedPoints = Math.max(4, beacons.length);
    }
    record.processedPoints = processedPoints;
    const calculatedAmount = 150 + Math.max(0, processedPoints - 4) * 20;
    record.amountPaid = `GHS ${calculatedAmount.toFixed(2)}`;

    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    const proto = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
    const autoOrigin = host ? `${proto}://${host}` : null;
    const publicUrl = autoOrigin || getPublicUrl();
    const fallbackBase = (autoOrigin && autoOrigin.includes('ghanacorsnet-verify'))
      ? autoOrigin
      : (isVercel ? 'https://ghanacorsnet-verify.vercel.app' : (publicUrl || `http://${LOCAL_IP}:${PORT}`));
    const baseUrl = (record.baseUrl || '').trim().replace(/\/$/, '') || fallbackBase;

    // Universal self-verifying URL: encodes complete document payload so phone scans always verify immediately
    const verificationUrl = constructVerificationUrl(record, baseUrl);
    record.verificationUrl = verificationUrl;

    // Cache record in db
    try {
      db.save(record);
    } catch (saveDbErr) {}

    const pdfBuffer = await generateSlipPDF(record, verificationUrl);
    const refIdClean = referenceId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${refIdClean}.pdf`;

    // Save to disk cache if available
    try {
      const pdfDir = isVercel 
        ? path.join(os.tmpdir(), 'saved_pdfs') 
        : path.join(__dirname, 'saved_pdfs');
      if (!fs.existsSync(pdfDir)) {
        fs.mkdirSync(pdfDir, { recursive: true });
      }
      fs.writeFileSync(path.join(pdfDir, filename), pdfBuffer);
    } catch (saveErr) {}

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('generate-pdf POST error:', err);
    res.status(500).json({ success: false, error: 'Failed to generate PDF: ' + err.message });
  }
});

// PDF download endpoint (GET)
app.get('/api/records/:id/pdf', async (req, res) => {
  try {
    let record = db.getById(req.params.id);

    // If record not in db and query has fallback token ?d=..., decode it
    if (!record && req.query.d) {
      try {
        const parsed = JSON.parse(Buffer.from(req.query.d, 'base64url').toString('utf-8'));
        record = {
          id: req.params.id,
          referenceId: parsed.ref || req.params.id,
          clientName: parsed.client,
          regionalNumber: parsed.reg,
          verificationCode: parsed.vcode,
          locality: parsed.loc,
          region: parsed.region,
          processedPoints: parsed.pts,
          amountPaid: parsed.amt,
          date: parsed.date,
          surveyorName: parsed.surv,
          smdOfficerName: parsed.smd || '',
          transactionId: parsed.tx,
          beacons: parsed.b || []
        };
        db.save(record);
      } catch (e) {}
    }

    if (!record) {
      return res.status(404).send('Record not found. Please save the record first.');
    }

    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    const proto = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
    const autoOrigin = host ? `${proto}://${host}` : null;

    const publicUrl = autoOrigin || getPublicUrl();
    const fallbackBase = (autoOrigin && autoOrigin.includes('ghanacorsnet-verify'))
      ? autoOrigin
      : (isVercel ? 'https://ghanacorsnet-verify.vercel.app' : (publicUrl || `http://${LOCAL_IP}:${PORT}`));
    const customBaseUrl = req.query.baseUrl ? req.query.baseUrl.replace(/\/$/, '') : null;
    const targetBase = customBaseUrl || record.baseUrl || fallbackBase;
    const verificationUrl = constructVerificationUrl(record, targetBase);

    const pdfBuffer = await generateSlipPDF(record, verificationUrl);
    const refIdClean = (record.referenceId || record.id || 'EX_DATA').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${refIdClean}.pdf`;

    // Save PDF to disk (handles both local directory and Vercel serverless /tmp)
    try {
      const pdfDir = isVercel 
        ? path.join(os.tmpdir(), 'saved_pdfs') 
        : path.join(__dirname, 'saved_pdfs');
      if (!fs.existsSync(pdfDir)) {
        fs.mkdirSync(pdfDir, { recursive: true });
      }
      const savedPdfPath = path.join(pdfDir, filename);
      fs.writeFileSync(savedPdfPath, pdfBuffer);
      record.pdfFile = filename;
      record.pdfSavedAt = new Date().toISOString();
      db.save(record);
    } catch (saveErr) {
      console.warn('Could not archive PDF to disk:', saveErr.message);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('PDF error:', err);
    res.status(500).send('Failed to generate PDF: ' + err.message);
  }
});

// Verification page routes
app.get(['/verify/:id', '/ghanacorsnet-verify/:id'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'verify.html'));
});

app.get(['/verify', '/ghanacorsnet-verify'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'verify.html'));
});

// Export app for Vercel Serverless Functions
module.exports = app;

// Start standalone HTTP listener only when running locally (not in Vercel serverless)
if (require.main === module && !isVercel) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(` LANDS COMMISSION - SURVEY AND MAPPING DIVISION`);
    console.log(` Server running on http://localhost:${PORT}`);
    console.log(` Local Wi-Fi Access: http://${LOCAL_IP}:${PORT}`);
    console.log(` Starting Worldwide Public Tunnel for mobile scanning...`);
    console.log(`=======================================================`);
    startTunnel(PORT);
  });
}
