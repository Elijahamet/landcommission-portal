const fs = require('fs');
const path = require('path');
const os = require('os');

// Statically bundle records so Vercel @vercel/nft bundler ALWAYS includes all official documents
let bundledRecords = [];
try {
  bundledRecords = require('./data/records.json');
} catch (e) {
  try {
    const raw = fs.readFileSync(path.join(__dirname, 'data', 'records.json'), 'utf-8');
    bundledRecords = JSON.parse(raw);
  } catch (e2) {
    bundledRecords = [];
  }
}

const isVercel = Boolean(process.env.VERCEL);
const DATA_DIR = isVercel ? path.join(os.tmpdir(), 'data') : path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'records.json');

let inMemoryRecords = Array.isArray(bundledRecords) ? [...bundledRecords] : [];

// Ensure data folder exists
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {}

function initDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(bundledRecords, null, 2), 'utf-8');
      inMemoryRecords = Array.isArray(bundledRecords) ? [...bundledRecords] : [];
    }
  } catch (err) {
    // Graceful fallback to memory on restricted environments
  }
}

function mergeWithBundled(records) {
  const map = new Map();
  // First load bundled official records
  if (Array.isArray(bundledRecords)) {
    bundledRecords.forEach(r => {
      const key = String(r.referenceId || r.id || '').trim().toLowerCase();
      if (key) map.set(key, r);
    });
  }
  // Then overlay or add runtime records
  if (Array.isArray(records)) {
    records.forEach(r => {
      const key = String(r.referenceId || r.id || '').trim().toLowerCase();
      if (key) {
        if (r.verificationUrl && r.verificationUrl.includes('landcommission-portal.vercel.app')) {
          r.verificationUrl = r.verificationUrl.replace('landcommission-portal.vercel.app', 'ghanacorsnet-verify.vercel.app');
        }
        if (r.baseUrl && r.baseUrl.includes('landcommission-portal.vercel.app')) {
          r.baseUrl = 'https://ghanacorsnet-verify.vercel.app';
        }
        const existing = map.get(key);
        map.set(key, { ...(existing || {}), ...r });
      }
    });
  }
  return Array.from(map.values());
}

function readRecords() {
  initDb();
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      inMemoryRecords = mergeWithBundled(parsed);
      return inMemoryRecords;
    }
  } catch (err) {
    console.warn('Read records file warning, using memory:', err.message);
  }
  inMemoryRecords = mergeWithBundled(inMemoryRecords);
  return inMemoryRecords;
}

function writeRecords(records) {
  inMemoryRecords = mergeWithBundled(records);
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(inMemoryRecords, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Write records file warning (persisted in memory):', err.message);
  }
}

const db = {
  getAll() {
    return readRecords();
  },

  getById(id) {
    if (!id) return null;
    const cleanId = String(id).trim().toLowerCase();
    const records = readRecords();
    let found = records.find(r => 
      String(r.id || '').toLowerCase() === cleanId || 
      String(r.referenceId || '').toLowerCase() === cleanId
    );
    if (!found && Array.isArray(bundledRecords)) {
      found = bundledRecords.find(r => 
        String(r.id || '').toLowerCase() === cleanId || 
        String(r.referenceId || '').toLowerCase() === cleanId
      );
    }
    return found || null;
  },

  save(record) {
    if (record) {
      if (record.verificationUrl && record.verificationUrl.includes('landcommission-portal.vercel.app')) {
        record.verificationUrl = record.verificationUrl.replace('landcommission-portal.vercel.app', 'ghanacorsnet-verify.vercel.app');
      }
      if (record.baseUrl && record.baseUrl.includes('landcommission-portal.vercel.app')) {
        record.baseUrl = 'https://ghanacorsnet-verify.vercel.app';
      }
    }
    const records = readRecords();
    const cleanId = String(record.id || record.referenceId || Date.now()).trim();
    record.id = cleanId;
    record.referenceId = record.referenceId || cleanId;
    record.updatedAt = new Date().toISOString();

    const existingIndex = records.findIndex(r => 
      String(r.id || '').toLowerCase() === cleanId.toLowerCase() ||
      String(r.referenceId || '').toLowerCase() === cleanId.toLowerCase()
    );

    if (existingIndex >= 0) {
      records[existingIndex] = { ...records[existingIndex], ...record };
    } else {
      record.createdAt = record.createdAt || new Date().toISOString();
      records.unshift(record);
    }

    writeRecords(records);
    return record;
  },

  delete(id) {
    const records = readRecords();
    const cleanId = String(id).trim().toLowerCase();
    const filtered = records.filter(r => 
      String(r.id || '').toLowerCase() !== cleanId && 
      String(r.referenceId || '').toLowerCase() !== cleanId
    );
    writeRecords(filtered);
    return filtered.length < records.length;
  },

  syncMany(incomingRecords) {
    if (!Array.isArray(incomingRecords)) return readRecords();
    const records = readRecords();
    const map = new Map();

    // Index existing records
    records.forEach(r => {
      const key = String(r.referenceId || r.id || '').trim().toLowerCase();
      if (key) map.set(key, r);
    });

    // Merge incoming records
    incomingRecords.forEach(r => {
      const key = String(r.referenceId || r.id || '').trim().toLowerCase();
      if (!key) return;
      if (r.verificationUrl && r.verificationUrl.includes('landcommission-portal.vercel.app')) {
        r.verificationUrl = r.verificationUrl.replace('landcommission-portal.vercel.app', 'ghanacorsnet-verify.vercel.app');
      }
      if (r.baseUrl && r.baseUrl.includes('landcommission-portal.vercel.app')) {
        r.baseUrl = 'https://ghanacorsnet-verify.vercel.app';
      }
      const existing = map.get(key);
      if (!existing || new Date(r.updatedAt || 0) >= new Date(existing.updatedAt || 0)) {
        map.set(key, { ...existing, ...r });
      }
    });

    const merged = Array.from(map.values());
    merged.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
    writeRecords(merged);
    return merged;
  }
};

initDb();

module.exports = db;
