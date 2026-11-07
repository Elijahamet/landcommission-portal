const fs = require('fs');
const path = require('path');
const os = require('os');

const isVercel = Boolean(process.env.VERCEL);
const DATA_DIR = isVercel ? path.join(os.tmpdir(), 'data') : path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'records.json');

let inMemoryRecords = [];

// Ensure data folder exists
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {}

function initDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const seedFile = path.join(__dirname, 'data', 'records.json');
      if (fs.existsSync(seedFile)) {
        const content = fs.readFileSync(seedFile, 'utf-8');
        fs.writeFileSync(DB_FILE, content, 'utf-8');
        inMemoryRecords = JSON.parse(content);
      } else {
        fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2), 'utf-8');
      }
    }
  } catch (err) {
    // Graceful fallback to memory on restricted environments
  }
}

function readRecords() {
  initDb();
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      inMemoryRecords = parsed;
      return parsed;
    }
  } catch (err) {
    console.warn('Read records file warning, using memory:', err.message);
  }
  return inMemoryRecords;
}

function writeRecords(records) {
  inMemoryRecords = records;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(records, null, 2), 'utf-8');
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
    const records = readRecords();
    const cleanId = String(id).trim().toLowerCase();
    return records.find(r => 
      String(r.id || '').toLowerCase() === cleanId || 
      String(r.referenceId || '').toLowerCase() === cleanId
    ) || null;
  },

  save(record) {
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
