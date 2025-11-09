/**
 * WaterLab / Water Data Demo Server
 * --------------------------------
 * Hybrid backend combining:
 *  - Basel Open Data JSON (Socrata API)
 *  - Local CSV snapshot fallback (for offline mode)
 *  - (Disabled) FOEN API integration (reactivate when JSON access is restored)
 * Provides a unified REST API for the React frontend to visualize Swiss water metrics.
 */
import express from 'express';
import cors from 'cors';
import initSqlJs from 'sql.js';
import fetch from 'node-fetch';
import RSSParser from 'rss-parser';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
import { queryAll, queryOne, execute, itemExists } from './db.js';

const rssParser = new RSSParser({
  headers: {
    'User-Agent': 'WaterLab Demo RSS/1.0 (+https://localhost)',
  },
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

const app = express();
const PORT = process.env.PORT || 5001;

// --- Global middleware -----------------------------------------------------
app.use(cors());
app.use(express.json());

// --- RSS aggregation configuration -----------------------------------------
const NEWS_SOURCES = [
  {
    url: 'https://www.unwater.org/rss.xml',
    source: 'UN Water',
  },
];

let newsCache = {
  items: [],
  fetchedAt: 0,
};

const NEWS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Extracts the best thumbnail URL from an RSS item, resolving relative paths
function extractImageFromItem(item) {
  const articleLink = item.link ?? '';
  const baseUrl = (() => {
    try {
      return articleLink ? new URL(articleLink).origin : null;
    } catch (err) {
      return null;
    }
  })();

  function normalise(urlValue) {
    if (!urlValue || typeof urlValue !== 'string') {
      return null;
    }
    const trimmed = urlValue.trim();
    if (!trimmed) {
      return null;
    }
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    if (baseUrl) {
      try {
        return new URL(trimmed, baseUrl).toString();
      } catch (err) {
        return null;
      }
    }
    return null;
  }

  function fromHtml(html) {
    if (!html || typeof html !== 'string') {
      return null;
    }
    const match = html.match(/<img[^>]+src\s*=\s*["']([^"'>]+)["']/i);
    if (match && match[1]) {
      return normalise(match[1]);
    }
    return null;
  }

  const enclosure = item.enclosure;
  if (enclosure) {
    if (Array.isArray(enclosure)) {
      const match = enclosure.find((entry) => entry?.url);
      const url = match?.url;
      const normalised = normalise(url);
      if (normalised) return normalised;
    } else if (typeof enclosure === 'object' && enclosure.url) {
      const normalised = normalise(enclosure.url);
      if (normalised) return normalised;
    }
  }

  const mediaContent = item['media:content'];
  if (mediaContent) {
    if (Array.isArray(mediaContent)) {
      const match = mediaContent.find((entry) => entry?.url || entry?.['$']?.url);
      const candidate = match?.url ?? match?.['$']?.url;
      const normalised = normalise(candidate);
      if (normalised) return normalised;
    } else if (mediaContent?.url) {
      const normalised = normalise(mediaContent.url);
      if (normalised) return normalised;
    } else if (mediaContent?.['$']?.url) {
      const normalised = normalise(mediaContent['$'].url);
      if (normalised) return normalised;
    }
  }

  const mediaThumbnail = item['media:thumbnail'];
  if (mediaThumbnail) {
    if (Array.isArray(mediaThumbnail)) {
      const match = mediaThumbnail.find((entry) => entry?.url || entry?.['$']?.url);
      const candidate = match?.url ?? match?.['$']?.url;
      const normalised = normalise(candidate);
      if (normalised) return normalised;
    } else if (mediaThumbnail?.url) {
      const normalised = normalise(mediaThumbnail.url);
      if (normalised) return normalised;
    } else if (mediaThumbnail?.['$']?.url) {
      const normalised = normalise(mediaThumbnail['$'].url);
      if (normalised) return normalised;
    }
  }

  if (item.image) {
    const candidate = Array.isArray(item.image) ? item.image[0] : item.image;
    const normalised = normalise(candidate);
    if (normalised) return normalised;
  }

  const htmlFields = [item['content:encoded'], item.content, item.summary, item.contentSnippet];
  for (const html of htmlFields) {
    const normalised = fromHtml(html);
    if (normalised) {
      return normalised;
    }
  }

  return null;
}

// Fetches and caches headlines from every configured RSS feed
async function fetchLatestNews() {
  const now = Date.now();
  if (newsCache.items.length && now - newsCache.fetchedAt < NEWS_CACHE_TTL) {
    return newsCache.items;
  }

  const results = await Promise.allSettled(
    NEWS_SOURCES.map(async (source) => {
      const feed = await rssParser.parseURL(source.url);
      return feed.items.map((item) => ({
        title: item.title ?? 'Untitled article',
        link: item.link ?? source.url,
        date: item.isoDate ?? item.pubDate ?? null,
        summary: item.contentSnippet ?? item.content ?? '',
        source: source.source,
        image: extractImageFromItem(item),
      }));
    }),
  );

  const articles = results
    .flatMap((result, index) => {
      const sourceMeta = NEWS_SOURCES[index];
      if (result.status === 'fulfilled') {
        console.log(`Fetched ${result.value.length} items from ${sourceMeta?.source ?? 'unknown source'}`);
        return result.value;
      }
      console.warn(`News source failed (${sourceMeta?.source ?? 'unknown'}):`, result.reason?.message ?? result.reason);
      return [];
    })
    .sort((a, b) => {
      const timeA = a.date ? new Date(a.date).getTime() : 0;
      const timeB = b.date ? new Date(b.date).getTime() : 0;
      return timeB - timeA;
    })
    .filter((article, index, arr) => arr.findIndex((item) => item.link === article.link) === index)
    .slice(0, 8);

  if (!articles.length) {
    console.warn('No news articles available from configured sources.');
  }

  newsCache = { items: articles, fetchedAt: now };
  return newsCache.items;
}

// --- Water analytics data sources ------------------------------------------
const DEFAULT_STATIONS = [
  { id: '2061', name: 'Zürich / Limmat' },
  { id: '2141', name: 'Bern / Aare' },
  { id: '2155', name: 'Thun / Aare' },
  { id: '2325', name: 'Luzern / Reuss' },
  { id: '2409', name: 'Basel / Rhein' },
];

const SOCRATA_SOURCES = {
  '2106': {
    stationId: '2106',
    name: 'Birs / Hofmatt',
    waterBody: 'Birs',
    canton: 'BS',
    url: 'https://data.bs.ch/api/v2/catalog/datasets/100236/records?limit=100',
  },
};

const socrataCache = new Map();
const SOCRATA_CACHE_MAX_AGE = 5 * 60 * 1000; // 5 minutes

const LOCAL_WATER_DATA_PATH = join(__dirname, 'data', 'water_latest.csv');
let localWaterDataCache = null;
let localWaterDataLoadedAt = 0;
const LOCAL_WATER_DATA_MAX_AGE = 15 * 60 * 1000; // 15 minutes

// Converts optional numeric fields (e.g. "120") into floats while tolerating blanks
function toNumber(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const num = Number(trimmed.replace(',', '.'));
  return Number.isFinite(num) ? num : null;
}

// Lazily loads the CSV snapshot used as an offline fallback
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

// Merges defaults, Socrata entries, and CSV fallback into one station list
function getStationList() {
  const stationsById = new Map();

  DEFAULT_STATIONS.forEach((station) => {
    stationsById.set(station.id, {
      id: station.id,
      name: station.name,
      source: 'default',
    });
  });

  Object.values(SOCRATA_SOURCES).forEach((source) => {
    stationsById.set(source.stationId, {
      id: source.stationId,
      name: source.name,
      source: 'opendata.bs.ch',
    });
  });

  const dataset = loadLocalWaterData();
  dataset.forEach((entry) => {
    const id = entry.station_id;
    if (!id) {
      return;
    }
    const existing = stationsById.get(id);
    stationsById.set(id, {
      id,
      name: entry.station_name || existing?.name || id,
      source: existing?.source ?? 'local-snapshot',
    });
  });

  return Array.from(stationsById.values());
}

// Retrieves all measurements available for a station from the CSV snapshot
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

// Attempts to parse a timestamp from multilingual field names
function parseTimestamp(value) {
  if (!value) {
    return null;
  }

  const candidates = [String(value), String(value).replace(' ', 'T'), String(value).replace(/\./g, '-'), String(value).replace(/\./g, '-').replace(' ', 'T')];
  for (const candidate of candidates) {
    const trimmed = candidate.trim();
    if (!trimmed) {
      continue;
    }
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return null;
}

// Finds a value in a Socrata record by scanning related keywords
function getFieldByKeywords(record, keywords) {
  if (!record) {
    return undefined;
  }
  const entries = Object.entries(record);
  const match = entries.find(([key]) => {
    const lowerKey = key.toLowerCase();
    return keywords.some((keyword) => lowerKey.includes(keyword));
  });
  return match ? match[1] : undefined;
}

// Pulls live measurements for Basel stations from the Socrata API
async function fetchSocrataStationData(stationId) {
  const source = SOCRATA_SOURCES[stationId];
  if (!source) {
    return null;
  }

  const cached = socrataCache.get(stationId);
  if (cached && Date.now() - cached.loadedAt < SOCRATA_CACHE_MAX_AGE) {
    return cached.data;
  }

  const response = await fetch(source.url, {
    headers: {
      Accept: 'application/json',
      'user-agent': 'WaterLab Demo / ntsuisse (contact: demo@example.com)',
    },
  });

  if (!response.ok) {
    throw new Error(`Socrata endpoint responded with ${response.status}`);
  }

  const body = await response.json();
  const records = body?.records;
  if (!Array.isArray(records)) {
    throw new Error('Unexpected Socrata JSON format');
  }
  if (!records.length) {
    throw new Error('Socrata dataset returned no records');
  }

  let latestFields = null;
  let latestTimestamp = null;

  records.forEach((item) => {
    const fields = item?.record?.fields || {};
    const ts = parseTimestamp(
      getFieldByKeywords(fields, ['zeit', 'timestamp', 'datum', 'time'])
    );

    if (!latestFields || (ts && (!latestTimestamp || ts > latestTimestamp))) {
      latestFields = fields;
      latestTimestamp = ts;
    }
  });

  if (!latestFields) {
    throw new Error('Socrata dataset did not include parsable timestamps');
  }

  const temperature = toNumber(
    getFieldByKeywords(latestFields, ['temperatur', 'temperature', 'temp'])
  );
  const discharge = toNumber(
    getFieldByKeywords(latestFields, ['abfluss', 'durchfluss', 'discharge', 'fluss'])
  );
  const waterLevel = toNumber(
    getFieldByKeywords(latestFields, ['wasserstand', 'pegel', 'level'])
  );
  const waterBody = getFieldByKeywords(latestFields, ['gewässer', 'gewaesser', 'fluss', 'river']);
  const stationName = getFieldByKeywords(latestFields, ['station', 'standort', 'messstelle', 'site']);
  const canton = getFieldByKeywords(latestFields, ['kanton', 'canton']);

  const measurements = [
    {
      id: `${stationId}-temperature`,
      label: 'Water Temperature',
      shortName: 'temperature',
      unit: '°C',
      value: temperature,
      timestamp: latestTimestamp ? latestTimestamp.toISOString() : null,
    },
    {
      id: `${stationId}-discharge`,
      label: 'Discharge',
      shortName: 'discharge',
      unit: 'm³/s',
      value: discharge,
      timestamp: latestTimestamp ? latestTimestamp.toISOString() : null,
    },
    {
      id: `${stationId}-water-level`,
      label: 'Water Level',
      shortName: 'water_level',
      unit: 'cm',
      value: waterLevel,
      timestamp: latestTimestamp ? latestTimestamp.toISOString() : null,
    },
  ].filter((measurement) => measurement.value !== null);

  const payload = {
    station: {
      id: source.stationId,
      name: stationName || source.name,
      waterBody: waterBody || source.waterBody || null,
      canton: canton || source.canton || null,
      coordinates: null,
    },
    measurements,
    raw: latestFields,
  };

  socrataCache.set(stationId, { data: payload, loadedAt: Date.now() });
  return payload;
}

// Tags payloads with their upstream source for the frontend UI
function withSource(payload, source) {
  if (!payload) {
    return null;
  }
  return { ...payload, source };
}

// Placeholder for FOEN integration (kept disabled until JSON access is restored)
async function fetchStationData(stationId) {
  // FOEN integration is currently disabled because the public JSON endpoint requires
  // access credentials. This placeholder exists so existing callers can await it safely.
  // When FOEN access is restored, implement the HTTP request and return the station data.
  return null;
}

// --- REST API routes --------------------------------------------------------
app.get('/api/news', async (req, res) => {
  try {
    const articles = await fetchLatestNews();
    res.json(articles);
  } catch (err) {
    console.error('Failed to fetch news feed:', err);
    res.status(500).json({ error: 'Unable to fetch water news' });
  }
});

app.get('/api/water/stations', (req, res) => {
  try {
    const stations = getStationList();
    res.json(stations);
  } catch (err) {
    console.error('Failed to build station list:', err);
    res.status(500).json({ error: 'Failed to fetch station list' });
  }
});

app.get('/api/water/stations/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const foenData = await fetchStationData(id);
    if (foenData && Array.isArray(foenData.measurements) && foenData.measurements.length) {
      console.log(`✅ Responding with foen for station ${id}`);
      return res.json(withSource(foenData, 'foen'));
    }
  } catch (error) {
    console.warn(`FOEN API unavailable for station ${id}:`, error?.message ?? error);
  }

  try {
    const socrataData = await fetchSocrataStationData(id);
    if (socrataData && Array.isArray(socrataData.measurements) && socrataData.measurements.length) {
      console.log(`✅ Responding with opendata.bs.ch for station ${id}`);
      return res.json(withSource(socrataData, 'opendata.bs.ch'));
    }
  } catch (error) {
    console.warn(`Socrata source unavailable for station ${id}:`, error?.message ?? error);
  }

  const localData = getLocalStationData(id);
  if (localData) {
    console.log(`✅ Responding with local-snapshot for station ${id}`);
    return res.json(withSource(localData, 'local-snapshot'));
  }

  return res.status(404).json({ error: 'Station not found in any data source' });
});

// --- SQLite bootstrap & CRUD endpoints -------------------------------------
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

// Persists the in-memory SQL.js database to disk after each write
function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    writeFileSync(dbPath, buffer);
  }
}

try {
  await initDatabase();
  console.log('Database initialized successfully');
} catch (error) {
  console.error('Failed to initialize database:', error);
  process.exit(1);
}

// Validates numeric ID parameters coming from the URL
function validateId(id) {
  const numId = parseInt(id, 10);
  if (Number.isNaN(numId) || numId <= 0) {
    return null;
  }
  return numId;
}

// Ensures create/update payloads meet our minimal requirements
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

// CRUD: list all data items
app.get('/api/data', (req, res) => {
  try {
    const items = queryAll(db, 'SELECT * FROM data_items ORDER BY createdAt DESC');
    res.json(items);
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// CRUD: fetch a single item by ID
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

// CRUD: create a new item
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

// CRUD: update an existing item
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

// CRUD: delete an item
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

// --- Server startup ---------------------------------------------------------
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