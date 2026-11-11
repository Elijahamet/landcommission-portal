const fs = require('fs');
const path = require('path');
const os = require('os');

// Persistent Cloud Registry Endpoints for multi-device zero-latency sync & cold-start persistence
const CLOUD_REGISTRY_ENDPOINTS = [
  'https://superjsonblob.com/api/jsonBlob/0982252b-ce42-4468-8e09-e3c675a93ffe',
  'https://superjsonblob.com/api/jsonBlob/9820d961-f55d-4909-b839-a3a17f63da80'
];

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

function normalizeReg(str) {
  return String(str || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

async function fetchCloudRecords() {
  for (const url of CLOUD_REGISTRY_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object') {
          return Array.isArray(data) ? data : Object.values(data);
        }
      }
    } catch (e) {}
  }
  return [];
}

async function pushCloudRecords(records) {
  try {
    const all = records || readRecords();
    const map = {};
    all.forEach(r => {
      const k = String(r.referenceId || r.id).trim().toUpperCase();
      if (k) map[k] = r;
    });
    const bodyStr = JSON.stringify(map);
    const promises = CLOUD_REGISTRY_ENDPOINTS.map(async url => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4500);
        const res = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: bodyStr,
          signal: controller.signal
        });
        clearTimeout(timeout);
        return res.ok;
      } catch (e) {
        return false;
      }
    });
    await Promise.allSettled(promises);
  } catch (err) {}
}

let syncTimer = null;
function pushCloudRecordsDebounced() {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    await pushCloudRecords();
  }, 300);
}

const db = {
  getAll() {
    return readRecords();
  },

  findDuplicateRegionalNumber(regionalNumber, excludeId = null) {
    if (!regionalNumber) return null;
    const target = normalizeReg(regionalNumber);
    if (!target) return null;
    const cleanExclude = excludeId ? String(excludeId).trim().toLowerCase() : null;
    const records = readRecords();

    return records.find(r => {
      const rId = String(r.referenceId || r.id || '').trim().toLowerCase();
      if (cleanExclude && rId && rId === cleanExclude) {
        return false;
      }
      return normalizeReg(r.regionalNumber) === target;
    }) || null;
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

  async getByIdAsync(id) {
    let found = this.getById(id);
    if (found) return found;

    // Check persistent cloud store across serverless cold starts
    try {
      const cloudList = await fetchCloudRecords();
      if (Array.isArray(cloudList) && cloudList.length > 0) {
        this.syncMany(cloudList);
        found = this.getById(id);
      }
    } catch (e) {}
    return found || null;
  },

  save(record) {
    if (record) {
      if (record.verificationUrl) {
        let vUrl = record.verificationUrl.split('?')[0];
        if (vUrl.includes('landcommission-portal.vercel.app') || vUrl.includes('trycloudflare.com') || vUrl.includes('localhost') || vUrl.includes('127.0.0.1')) {
          record.verificationUrl = `https://ghanacorsnet-verify.vercel.app/verify/${record.referenceId || record.id}`;
        }
      }
      if (record.baseUrl) {
        if (record.baseUrl.includes('landcommission-portal.vercel.app') || record.baseUrl.includes('trycloudflare.com') || record.baseUrl.includes('localhost') || record.baseUrl.includes('127.0.0.1')) {
          record.baseUrl = 'https://ghanacorsnet-verify.vercel.app';
        }
      }
    }
    const cleanId = String(record.id || record.referenceId || Date.now()).trim();

    // Enforce Regional Number uniqueness
    if (record.regionalNumber) {
      const duplicate = this.findDuplicateRegionalNumber(record.regionalNumber, cleanId);
      if (duplicate) {
        const err = new Error(`Regional Number "${record.regionalNumber}" is already in use by "${duplicate.clientName || 'Another Client'}" (${duplicate.referenceId || duplicate.id}). Each Regional Number must be unique.`);
        err.code = 'DUPLICATE_REGIONAL_NUMBER';
        err.duplicateRecord = duplicate;
        throw err;
      }
    }

    const records = readRecords();
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
    pushCloudRecordsDebounced();
    return record;
  },

  async saveAsync(record) {
    const saved = this.save(record);
    try {
      await pushCloudRecords();
    } catch (e) {}
    return saved;
  },

  delete(id) {
    const records = readRecords();
    const cleanId = String(id).trim().toLowerCase();
    const filtered = records.filter(r => 
      String(r.id || '').toLowerCase() !== cleanId && 
      String(r.referenceId || '').toLowerCase() !== cleanId
    );
    writeRecords(filtered);
    pushCloudRecordsDebounced();
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
      if (r.verificationUrl && (r.verificationUrl.includes('landcommission-portal.vercel.app') || r.verificationUrl.includes('trycloudflare.com') || r.verificationUrl.includes('localhost'))) {
        r.verificationUrl = `https://ghanacorsnet-verify.vercel.app/verify/${r.referenceId || r.id}`;
      }
      if (r.baseUrl && (r.baseUrl.includes('landcommission-portal.vercel.app') || r.baseUrl.includes('trycloudflare.com') || r.baseUrl.includes('localhost'))) {
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
    pushCloudRecordsDebounced();
    return merged;
  },

  async syncManyAsync(incomingRecords) {
    const merged = this.syncMany(incomingRecords);
    try {
      await pushCloudRecords(merged);
    } catch (e) {}
    return merged;
  },

  pushCloudRecords
};

initDb();
// Background initial sync with persistent cloud store
fetchCloudRecords().then(list => {
  if (Array.isArray(list) && list.length > 0) {
    db.syncMany(list);
  }
}).catch(() => {});

module.exports = db;
