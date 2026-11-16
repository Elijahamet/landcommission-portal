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
const DELETED_FILE = path.join(DATA_DIR, 'deleted_ids.json');

let bundledDeletedList = [];
try {
  bundledDeletedList = require('./data/deleted_ids.json');
} catch (e) {
  try {
    bundledDeletedList = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'deleted_ids.json'), 'utf-8'));
  } catch (e2) {
    bundledDeletedList = [];
  }
}

let inMemoryRecords = Array.isArray(bundledRecords) ? [...bundledRecords] : [];

function getDeletedIds() {
  const set = new Set();
  if (Array.isArray(bundledDeletedList)) {
    bundledDeletedList.forEach(id => {
      if (id) set.add(String(id).trim().toLowerCase());
    });
  }
  try {
    if (fs.existsSync(DELETED_FILE)) {
      const raw = fs.readFileSync(DELETED_FILE, 'utf-8');
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        list.forEach(id => {
          if (id) set.add(String(id).trim().toLowerCase());
        });
      }
    }
  } catch (e) {}
  return set;
}

function saveDeletedIds(deletedSet) {
  try {
    const arr = Array.from(deletedSet);
    fs.writeFileSync(DELETED_FILE, JSON.stringify(arr, null, 2), 'utf-8');
    const repoDeletedFile = path.join(__dirname, 'data', 'deleted_ids.json');
    if (repoDeletedFile !== DELETED_FILE) {
      try {
        fs.writeFileSync(repoDeletedFile, JSON.stringify(arr, null, 2), 'utf-8');
      } catch (e) {}
    }
  } catch (e) {}
}

// Ensure data folder exists
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {}

function initDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(bundledRecords || [], null, 2), 'utf-8');
      inMemoryRecords = Array.isArray(bundledRecords) ? [...bundledRecords] : [];
    }
  } catch (err) {
    // Graceful fallback to memory on restricted environments
  }
}

function readRecords() {
  initDb();
  const deletedSet = getDeletedIds();
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        inMemoryRecords = parsed.filter(r => {
          const k = String(r.referenceId || r.id || '').trim().toLowerCase();
          return k && !deletedSet.has(k);
        });
        return inMemoryRecords;
      }
    }
  } catch (err) {
    console.warn('Read records file warning, using memory:', err.message);
  }
  inMemoryRecords = (inMemoryRecords || []).filter(r => {
    const k = String(r.referenceId || r.id || '').trim().toLowerCase();
    return k && !deletedSet.has(k);
  });
  return inMemoryRecords;
}

function writeRecords(records) {
  const deletedSet = getDeletedIds();
  inMemoryRecords = (records || []).filter(r => {
    const k = String(r.referenceId || r.id || '').trim().toLowerCase();
    return k && !deletedSet.has(k);
  });
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(inMemoryRecords, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Write records file warning (persisted in memory):', err.message);
  }
}

function normalizeStr(str) {
  return String(str || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function normalizeReg(str) {
  return normalizeStr(str);
}

function normalizeCode(str) {
  return normalizeStr(str);
}

function normalizeRef(str) {
  return String(str || '').trim().toUpperCase();
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

  findDuplicateReferenceId(referenceId, excludeId = null) {
    if (!referenceId) return null;
    const target = normalizeRef(referenceId);
    if (!target) return null;
    const cleanExclude = excludeId ? normalizeRef(excludeId) : null;
    const records = readRecords();

    return records.find(r => {
      const rId = normalizeRef(r.referenceId || r.id);
      if (cleanExclude && rId && rId === cleanExclude) {
        return false;
      }
      return rId === target;
    }) || null;
  },

  findDuplicateRegionalNumber(regionalNumber, excludeId = null) {
    if (!regionalNumber) return null;
    const target = normalizeReg(regionalNumber);
    if (!target) return null;
    const cleanExclude = excludeId ? normalizeRef(excludeId) : null;
    const records = readRecords();

    return records.find(r => {
      const rId = normalizeRef(r.referenceId || r.id);
      if (cleanExclude && rId && rId === cleanExclude) {
        return false;
      }
      return normalizeReg(r.regionalNumber) === target;
    }) || null;
  },

  findDuplicateVerificationCode(verificationCode, excludeId = null) {
    if (!verificationCode) return null;
    const target = normalizeCode(verificationCode);
    if (!target) return null;
    const cleanExclude = excludeId ? normalizeRef(excludeId) : null;
    const records = readRecords();

    return records.find(r => {
      const rId = normalizeRef(r.referenceId || r.id);
      if (cleanExclude && rId && rId === cleanExclude) {
        return false;
      }
      return normalizeCode(r.verificationCode) === target;
    }) || null;
  },

  getConflicts() {
    const records = readRecords();
    const regGroups = new Map();
    const verGroups = new Map();

    records.forEach(r => {
      const reg = normalizeReg(r.regionalNumber);
      if (reg) {
        if (!regGroups.has(reg)) regGroups.set(reg, []);
        regGroups.get(reg).push(r);
      }
      const ver = normalizeCode(r.verificationCode);
      if (ver) {
        if (!verGroups.has(ver)) verGroups.set(ver, []);
        verGroups.get(ver).push(r);
      }
    });

    const regionalConflicts = [];
    for (const [key, list] of regGroups.entries()) {
      if (list.length > 1) {
        regionalConflicts.push({ value: list[0].regionalNumber, count: list.length, records: list });
      }
    }

    const verificationConflicts = [];
    for (const [key, list] of verGroups.entries()) {
      if (list.length > 1) {
        verificationConflicts.push({ value: list[0].verificationCode, count: list.length, records: list });
      }
    }

    return {
      totalRecords: records.length,
      regionalConflicts,
      verificationConflicts
    };
  },

  getById(id) {
    if (!id) return null;
    const cleanId = String(id).trim().toLowerCase();
    const deletedSet = getDeletedIds();
    if (deletedSet.has(cleanId)) return null;

    const records = readRecords();
    let found = records.find(r => 
      String(r.id || '').trim().toLowerCase() === cleanId || 
      String(r.referenceId || '').trim().toLowerCase() === cleanId
    );
    if (!found && Array.isArray(bundledRecords)) {
      found = bundledRecords.find(r => 
        (String(r.id || '').trim().toLowerCase() === cleanId || 
         String(r.referenceId || '').trim().toLowerCase() === cleanId) &&
        !deletedSet.has(String(r.id || '').trim().toLowerCase()) &&
        !deletedSet.has(String(r.referenceId || '').trim().toLowerCase())
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

  save(record, options = {}) {
    if (!record) return null;
    const isNew = Boolean(options.isNew);
    let cleanId = String(record.referenceId || record.id || '').trim().toUpperCase();
    if (!cleanId || cleanId === 'UNDEFINED' || cleanId === 'NULL') {
      cleanId = `GX${Math.floor(1000000 + Math.random() * 9000000)}`;
    }

    // Un-delete if cleanId was previously marked as deleted
    const deletedSet = getDeletedIds();
    if (deletedSet.delete(cleanId.toLowerCase())) {
      saveDeletedIds(deletedSet);
    }

    const records = readRecords();
    const existingIndex = records.findIndex(r => 
      String(r.id || '').trim().toUpperCase() === cleanId ||
      String(r.referenceId || '').trim().toUpperCase() === cleanId
    );

    // 1. Strict Duplicate Reference ID check for new records:
    if (isNew && existingIndex >= 0) {
      const existing = records[existingIndex];
      const err = new Error(`Reference ID "${cleanId}" is already registered to "${existing.clientName || 'Another Client'}". Duplicate Reference IDs are not permitted.`);
      err.code = 'DUPLICATE_REFERENCE_ID';
      err.duplicateRecord = existing;
      throw err;
    }

    // 2. Enforce Regional Number uniqueness
    if (record.regionalNumber) {
      const duplicate = this.findDuplicateRegionalNumber(record.regionalNumber, cleanId);
      if (duplicate) {
        const err = new Error(`Regional Number "${record.regionalNumber}" is already in use by "${duplicate.clientName || 'Another Client'}" (${duplicate.referenceId || duplicate.id}). Each Regional Number must be unique.`);
        err.code = 'DUPLICATE_REGIONAL_NUMBER';
        err.duplicateRecord = duplicate;
        throw err;
      }
    }

    // 3. Enforce Verification Code uniqueness
    if (record.verificationCode) {
      const duplicateVer = this.findDuplicateVerificationCode(record.verificationCode, cleanId);
      if (duplicateVer) {
        const err = new Error(`Verification Code "${record.verificationCode}" is already in use by "${duplicateVer.clientName || 'Another Client'}" (${duplicateVer.referenceId || duplicateVer.id}). Each Verification Code must be unique.`);
        err.code = 'DUPLICATE_VERIFICATION_CODE';
        err.duplicateRecord = duplicateVer;
        throw err;
      }
    }

    record.id = cleanId;
    record.referenceId = cleanId;
    record.verificationUrl = `https://ghanacorsnet-verify.vercel.app/verify/${cleanId}`;
    record.baseUrl = 'https://ghanacorsnet-verify.vercel.app';
    record.status = record.status || 'ACTIVE_VERIFIED';
    record.updatedAt = new Date().toISOString();

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

  async saveAsync(record, options = {}) {
    const saved = this.save(record, options);
    try {
      await pushCloudRecords();
    } catch (e) {}
    return saved;
  },

  delete(id) {
    if (!id) return false;
    const cleanId = String(id).trim().toLowerCase();
    const deletedSet = getDeletedIds();
    deletedSet.add(cleanId);
    saveDeletedIds(deletedSet);

    // Also remove from bundledRecords in memory
    if (Array.isArray(bundledRecords)) {
      bundledRecords = bundledRecords.filter(r => {
        const k = String(r.referenceId || r.id || '').trim().toLowerCase();
        return k !== cleanId;
      });
    }

    const records = readRecords();
    const filtered = records.filter(r => 
      String(r.id || '').trim().toLowerCase() !== cleanId && 
      String(r.referenceId || '').trim().toLowerCase() !== cleanId
    );
    writeRecords(filtered);
    pushCloudRecordsDebounced();
    return true;
  },

  deleteMany(ids) {
    if (!Array.isArray(ids) || ids.length === 0) return { deletedCount: 0 };
    const cleanIdSet = new Set(ids.map(id => String(id || '').trim().toLowerCase()).filter(Boolean));
    if (cleanIdSet.size === 0) return { deletedCount: 0 };

    const deletedSet = getDeletedIds();
    cleanIdSet.forEach(id => deletedSet.add(id));
    saveDeletedIds(deletedSet);

    // Also remove from bundledRecords in memory
    if (Array.isArray(bundledRecords)) {
      bundledRecords = bundledRecords.filter(r => {
        const k = String(r.referenceId || r.id || '').trim().toLowerCase();
        return !cleanIdSet.has(k);
      });
    }

    const records = readRecords();
    const filtered = records.filter(r => 
      !cleanIdSet.has(String(r.id || '').trim().toLowerCase()) && 
      !cleanIdSet.has(String(r.referenceId || '').trim().toLowerCase())
    );
    const deletedCount = records.length - filtered.length;
    writeRecords(filtered);
    pushCloudRecordsDebounced();
    return { deletedCount: Math.max(deletedCount, cleanIdSet.size) };
  },

  syncMany(incomingRecords) {
    if (!Array.isArray(incomingRecords)) return readRecords();
    const records = readRecords();
    const deletedSet = getDeletedIds();
    const map = new Map();

    // Index existing records
    records.forEach(r => {
      const key = String(r.referenceId || r.id || '').trim().toLowerCase();
      if (key && !deletedSet.has(key)) map.set(key, r);
    });

    // Merge incoming records
    incomingRecords.forEach(r => {
      const key = String(r.referenceId || r.id || '').trim().toLowerCase();
      if (!key || deletedSet.has(key)) return;
      const upperKey = String(r.referenceId || r.id || '').trim().toUpperCase();
      r.id = upperKey;
      r.referenceId = upperKey;
      r.verificationUrl = `https://ghanacorsnet-verify.vercel.app/verify/${upperKey}`;
      r.baseUrl = 'https://ghanacorsnet-verify.vercel.app';
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
