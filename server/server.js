import express from 'express';
import cors from 'cors';
import initSqlJs from 'sql.js';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
import { queryAll, queryOne, execute, itemExists } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// FOEN water data configuration
const DEFAULT_STATIONS = [
  { id: '2061', name: 'Zürich / Limmat' },
  { id: '2141', name: 'Bern / Aare' },
  { id: '2155', name: 'Thun / Aare' },
  { id: '2325', name: 'Luzern / Reuss' },
  { id: '2409', name: 'Basel / Rhein' },
];

const LOCAL_WATER_DATA_PATH = join(__dirname, 'data', 'water_latest.csv');
let localWaterDataCache = null;
let localWaterDataLoadedAt = 0;
const LOCAL_WATER_DATA_MAX_AGE = 15 * 60 * 1000; // 15 minutes

function toNumber(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const num = Number(trimmed.replace(',', '.'));
  return Number.isFinite(num) ? num : null;
}

function loadLocalWaterData() {
  try {
    if (
      localWaterDataCache &&
      Date.now() - localWaterDataLoadedAt < LOCAL_WATER_DATA_MAX_AGE
    ) {
      return localWaterDataCache;
    }

    if (!existsSync(LOCAL_WATER_DATA_PATH)) {
      console.warn('Local water dataset not found at', LOCAL_WATER_DATA_PATH);
      localWaterDataCache = [];
      localWaterDataLoadedAt = Date.now();
      return localWaterDataCache;
    }

    const csv = readFileSync(LOCAL_WATER_DATA_PATH, 'utf-8');
    const lines = csv
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length <= 1) {
      localWaterDataCache = [];
      localWaterDataLoadedAt = Date.now();
      return localWaterDataCache;
    }

    const headers = lines.shift().split(',').map((header) => header.trim());
    const records = lines.map((line) => {
      const columns = line.split(',');
      const record = {};
      headers.forEach((header, index) => {
        record[header] = columns[index]?.trim() ?? '';
      });
      record.temperature_c = toNumber(record.temperature_c);
      record.discharge_m3s = toNumber(record.discharge_m3s);
      record.water_level_cm = toNumber(record.water_level_cm);
      return record;
    });

    localWaterDataCache = records;
    localWaterDataLoadedAt = Date.now();
    return localWaterDataCache;
  } catch (error) {
    console.error('Failed to load local water dataset:', error);
    localWaterDataCache = [];
    localWaterDataLoadedAt = Date.now();
    return localWaterDataCache;
  }
}

function getLocalStationList() {
  const dataset = loadLocalWaterData();
  if (!dataset.length) {
    return DEFAULT_STATIONS;
  }

  const seen = new Set();
  const stations = [];
  for (const entry of dataset) {
    const id = entry.station_id;
    if (!id || seen.has(id)) {
      continue;
    }
    seen.add(id);
    stations.push({ id, name: entry.station_name || id });
  }
  return stations.length ? stations : DEFAULT_STATIONS;
}

function getLocalStationData(stationId) {
  const dataset = loadLocalWaterData();
  const entry = dataset.find((row) => row.station_id === stationId);
  if (!entry) {
    return null;
  }

  const measurements = [
    {
      id: `${stationId}-temperature`,
      label: 'Water Temperature',
      shortName: 'temperature',
      unit: '°C',
      value: entry.temperature_c,
      timestamp: entry.timestamp || null,
    },
    {
      id: `${stationId}-discharge`,
      label: 'Discharge',
      shortName: 'discharge',
      unit: 'm³/s',
      value: entry.discharge_m3s,
      timestamp: entry.timestamp || null,
    },
    {
      id: `${stationId}-water-level`,
      label: 'Water Level',
      shortName: 'water_level',
      unit: 'cm',
      value: entry.water_level_cm,
      timestamp: entry.timestamp || null,
    },
  ].filter((measurement) => measurement.value !== null);

  return {
    station: {
      id: stationId,
      name: entry.station_name || stationId,
      waterBody: entry.water_body || null,
      canton: entry.canton || null,
      coordinates: null,
    },
    measurements,
    raw: entry,
  };
}

async function fetchStationData(stationId) {
  const foenUrl = `https://www.hydrodaten.admin.ch/lhg/sdi/api/station/${stationId}`;
  const response = await fetch(foenUrl, {
    headers: {
      Accept: 'application/json',
      'user-agent': 'WaterLab Demo / ntsuisse (contact: demo@example.com)',
    },
  });

  const rawBody = await response.text();
  if (!response.ok) {
    throw new Error(`FOEN API responded with ${response.status}. Body: ${rawBody.slice(0, 400)}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`FOEN API returned unexpected content-type (${contentType}). Body: ${rawBody.slice(0, 400)}`);
  }

  const parsed = JSON.parse(rawBody);
  const payload = Array.isArray(parsed) ? parsed[0] : parsed;
  const station = payload?.station ?? {};
  const timeseries = Array.isArray(payload?.timeseries) ? payload.timeseries : [];

  const measurements = timeseries.map((series) => {
    const parameter = series?.parameter ?? {};
    const current = series?.currentMeasurement ?? {};
    return {
      id: series?.id ?? null,
      label: parameter?.name ?? parameter?.shortName ?? 'Measurement',
      shortName: parameter?.shortName ?? null,
      unit: series?.unit ?? current?.unit ?? parameter?.unit ?? null,
      value: typeof current?.value === 'number' ? current.value : toNumber(current?.value),
      timestamp: current?.timestamp ?? null,
    };
  });

  return {
    station: {
      id: station?.id ?? stationId,
      name: station?.name ?? 'Unknown station',
      waterBody: station?.waterBody?.name ?? station?.waterBody?.waterBodyName ?? null,
      canton: station?.canton ?? null,
      coordinates: station?.coordinates ?? null,
    },
    measurements,
    raw: payload,
  };
}

app.get('/api/water/stations', (req, res) => {
  const stations = getLocalStationList();
  res.json(stations);
});

app.get('/api/water/stations/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const foenData = await fetchStationData(id);
    if (foenData && foenData.measurements && foenData.measurements.length) {
      return res.json(foenData);
    }
  } catch (error) {
    console.warn(`FOEN API unavailable for station ${id}:`, error.message);
  }

  const localData = getLocalStationData(id);
  if (!localData) {
    return res.status(404).json({ error: 'Station not found in local dataset' });
  }

  return res.json(localData);
});

// Database setup
let db;
const dbPath = join(__dirname, 'database.sqlite');

async function initDatabase() {
  // Load sql.js WASM file
  const wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm');
  const wasmBinary = readFileSync(wasmPath);
  
  const SQL = await initSqlJs({
    wasmBinary: wasmBinary
  });
  
  // Load existing database or create new one
  if (existsSync(dbPath)) {
    const buffer = readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Create table if it doesn't exist
  db.run(`
    CREATE TABLE IF NOT EXISTS data_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Save database to file
  saveDatabase();
}

function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    writeFileSync(dbPath, buffer);
  }
}

// Initialize database and start server
try {
  await initDatabase();
  console.log('Database initialized successfully');
} catch (error) {
  console.error('Failed to initialize database:', error);
  process.exit(1);
}

// Helper function to validate ID parameter
function validateId(id) {
  const numId = parseInt(id, 10);
  if (isNaN(numId) || numId <= 0) {
    return null;
  }
  return numId;
}

// Helper function to validate input
function validateInput(name, description) {
  if (!name || typeof name !== 'string' || !name.trim()) {
    return 'Name is required and must be a non-empty string';
  }
  if (!description || typeof description !== 'string' || !description.trim()) {
    return 'Description is required and must be a non-empty string';
  }
  if (name.trim().length > 255) {
    return 'Name must be 255 characters or less';
  }
  if (description.trim().length > 1000) {
    return 'Description must be 1000 characters or less';
  }
  return null;
}

// Routes
// Get all items
app.get('/api/data', (req, res) => {
  try {
    const items = queryAll(db, 'SELECT * FROM data_items ORDER BY createdAt DESC');
    res.json(items);
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// Get single item
app.get('/api/data/:id', (req, res) => {
  try {
    const id = validateId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Invalid ID parameter' });
    }
    
    const item = queryOne(db, 'SELECT * FROM data_items WHERE id = ?', [id]);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json(item);
  } catch (error) {
    console.error('Error fetching item:', error);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

// Create new item
app.post('/api/data', (req, res) => {
  try {
    const { name, description } = req.body;
    const validationError = validateInput(name, description);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }
    
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();
    
    execute(db, 'INSERT INTO data_items (name, description) VALUES (?, ?)', [
      trimmedName,
      trimmedDescription,
    ]);
    saveDatabase();
    
    // Get the inserted item
    const newItem = queryOne(db, 'SELECT * FROM data_items WHERE id = last_insert_rowid()');
    
    res.status(201).json(newItem);
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// Update item
app.put('/api/data/:id', (req, res) => {
  try {
    const id = validateId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Invalid ID parameter' });
    }
    
    const { name, description } = req.body;
    const validationError = validateInput(name, description);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }
    
    // Check if item exists
    if (!itemExists(db, id)) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    // Update the item
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();
    
    execute(db, 'UPDATE data_items SET name = ?, description = ? WHERE id = ?', [
      trimmedName,
      trimmedDescription,
      id,
    ]);
    saveDatabase();
    
    // Get the updated item
    const updatedItem = queryOne(db, 'SELECT * FROM data_items WHERE id = ?', [id]);
    
    res.json(updatedItem);
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Delete item
app.delete('/api/data/:id', (req, res) => {
  try {
    const id = validateId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Invalid ID parameter' });
    }
    
    // Check if item exists
    if (!itemExists(db, id)) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    // Delete the item
    execute(db, 'DELETE FROM data_items WHERE id = ?', [id]);
    saveDatabase();
    
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please either:`);
    console.error(`  1. Kill the process using port ${PORT}: lsof -ti:${PORT} | xargs kill`);
    console.error(`  2. Use a different port: PORT=5002 npm run dev`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});

