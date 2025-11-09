// Swiss water analytics router. Serves station lists and measurement payloads
// by blending Socrata feeds with a local CSV snapshot.
import { Router } from 'express'
import fetch from 'node-fetch'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

// Basel stations we always expose, regardless of upstream availability.
const DEFAULT_STATIONS = [
  { id: '2061', name: 'Zürich / Limmat' },
  { id: '2141', name: 'Bern / Aare' },
  { id: '2155', name: 'Thun / Aare' },
  { id: '2325', name: 'Luzern / Reuss' },
  { id: '2409', name: 'Basel / Rhein' },
]

// Socrata endpoints for live data. Easy to extend with more stations.
const SOCRATA_SOURCES = {
  '2106': {
    stationId: '2106',
    name: 'Birs / Hofmatt',
    waterBody: 'Birs',
    canton: 'BS',
    url: 'https://data.bs.ch/api/v2/catalog/datasets/100236/records?limit=100',
  },
}

const socrataCache = new Map()
const SOCRATA_CACHE_MAX_AGE = 5 * 60 * 1000 // 5 minutes

// ----------------------------- Utility helpers -----------------------------

// Converts optional numeric fields ("120", "") into floats while tolerating blanks.
function toNumber(value) {
  if (value === undefined || value === null) return null
  const trimmed = String(value).trim()
  if (!trimmed) return null
  const num = Number(trimmed.replace(',', '.'))
  return Number.isFinite(num) ? num : null
}

// Tries multiple timestamp formats (German, ISO, etc.) and returns a Date.
function parseTimestamp(value) {
  if (!value) {
    return null
  }

  const candidates = [
    String(value),
    String(value).replace(' ', 'T'),
    String(value).replace(/\./g, '-'),
    String(value).replace(/\./g, '-').replace(' ', 'T'),
  ]
  for (const candidate of candidates) {
    const trimmed = candidate.trim()
    if (!trimmed) {
      continue
    }
    const parsed = new Date(trimmed)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed
    }
  }
  return null
}

// Extracts a field from an object by scanning for keyword matches (handles
// multilingual Socrata keys like "temperatur" and "temperature").
function getFieldByKeywords(record, keywords) {
  if (!record) {
    return undefined
  }
  const entries = Object.entries(record)
  const match = entries.find(([key]) => {
    const lowerKey = key.toLowerCase()
    return keywords.some((keyword) => lowerKey.includes(keyword))
  })
  return match ? match[1] : undefined
}

// Wraps CSV loading in a closure so the data is cached between requests.
function createLocalDataLoader(csvPath) {
  let cache = null
  let loadedAt = 0
  const MAX_AGE = 15 * 60 * 1000 // 15 minutes

  return function loadLocalWaterData() {
    try {
      if (cache && Date.now() - loadedAt < MAX_AGE) {
        return cache
      }

      if (!existsSync(csvPath)) {
        console.warn('Local water dataset not found at', csvPath)
        cache = []
        loadedAt = Date.now()
        return cache
      }

      const csv = readFileSync(csvPath, 'utf-8')
      const lines = csv
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)

      if (lines.length <= 1) {
        cache = []
        loadedAt = Date.now()
        return cache
      }

      const headers = lines.shift().split(',').map((header) => header.trim())
      const records = lines.map((line) => {
        const columns = line.split(',')
        const record = {}
        headers.forEach((header, index) => {
          record[header] = columns[index]?.trim() ?? ''
        })
        record.temperature_c = toNumber(record.temperature_c)
        record.discharge_m3s = toNumber(record.discharge_m3s)
        record.water_level_cm = toNumber(record.water_level_cm)
        return record
      })

      cache = records
      loadedAt = Date.now()
      return cache
    } catch (error) {
      console.error('Failed to load local water dataset:', error)
      cache = []
      loadedAt = Date.now()
      return cache
    }
  }
}

// Pulls live measurements for Basel stations from the Socrata API.
async function fetchSocrataStationData(stationId) {
  const source = SOCRATA_SOURCES[stationId]
  if (!source) {
    return null
  }

  const cached = socrataCache.get(stationId)
  if (cached && Date.now() - cached.loadedAt < SOCRATA_CACHE_MAX_AGE) {
    return cached.data
  }

  const response = await fetch(source.url, {
    headers: {
      Accept: 'application/json',
      'user-agent': 'WaterLab Demo / ntsuisse (contact: demo@example.com)',
    },
  })

  if (!response.ok) {
    throw new Error(`Socrata endpoint responded with ${response.status}`)
  }

  const body = await response.json()
  const records = body?.records
  if (!Array.isArray(records)) {
    throw new Error('Unexpected Socrata JSON format')
  }
  if (!records.length) {
    throw new Error('Socrata dataset returned no records')
  }

  let latestFields = null
  let latestTimestamp = null

  records.forEach((item) => {
    const fields = item?.record?.fields || {}
    const ts = parseTimestamp(getFieldByKeywords(fields, ['zeit', 'timestamp', 'datum', 'time']))

    if (!latestFields || (ts && (!latestTimestamp || ts > latestTimestamp))) {
      latestFields = fields
      latestTimestamp = ts
    }
  })

  if (!latestFields) {
    throw new Error('Socrata dataset did not include parsable timestamps')
  }

  const temperature = toNumber(
    getFieldByKeywords(latestFields, ['temperatur', 'temperature', 'temp']),
  )
  const discharge = toNumber(
    getFieldByKeywords(latestFields, ['abfluss', 'durchfluss', 'discharge', 'fluss']),
  )
  const waterLevel = toNumber(
    getFieldByKeywords(latestFields, ['wasserstand', 'pegel', 'level']),
  )
  const waterBody = getFieldByKeywords(latestFields, ['gewässer', 'gewaesser', 'fluss', 'river'])
  const stationName = getFieldByKeywords(latestFields, ['station', 'standort', 'messstelle', 'site'])
  const canton = getFieldByKeywords(latestFields, ['kanton', 'canton'])

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
  ].filter((measurement) => measurement.value !== null)

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
  }

  socrataCache.set(stationId, { data: payload, loadedAt: Date.now() })
  return payload
}

// Adds a "source" flag so the frontend can display whether data came from Socrata
// or the local CSV snapshot.
function withSource(payload, source) {
  if (!payload) {
    return null
  }
  return { ...payload, source }
}

// ------------------------------- Router setup -------------------------------

export default function createWaterRouter({ dataPath }) {
  const router = Router()
  const csvPath = dataPath ?? join(process.cwd(), 'server', 'data', 'water_latest.csv')
  const loadLocalWaterData = createLocalDataLoader(csvPath)

  function getStationList() {
    const stationsById = new Map()

    DEFAULT_STATIONS.forEach((station) => {
      stationsById.set(station.id, {
        id: station.id,
        name: station.name,
        source: 'default',
      })
    })

    Object.values(SOCRATA_SOURCES).forEach((source) => {
      stationsById.set(source.stationId, {
        id: source.stationId,
        name: source.name,
        source: 'opendata.bs.ch',
      })
    })

    const dataset = loadLocalWaterData()
    dataset.forEach((entry) => {
      const id = entry.station_id
      if (!id) {
        return
      }
      const existing = stationsById.get(id)
      stationsById.set(id, {
        id,
        name: entry.station_name || existing?.name || id,
        source: existing?.source ?? 'local-snapshot',
      })
    })

    return Array.from(stationsById.values())
  }

  function getLocalStationData(stationId) {
    const dataset = loadLocalWaterData()
    const entry = dataset.find((row) => row.station_id === stationId)
    if (!entry) {
      return null
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
    ].filter((measurement) => measurement.value !== null)

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
    }
  }

  async function fetchStationData() {
    // FOEN integration disabled – placeholder left for future reactivation.
    return null
  }

  router.get('/stations', (req, res) => {
    try {
      const stations = getStationList()
      res.json(stations)
    } catch (err) {
      console.error('Failed to build station list:', err)
      res.status(500).json({ error: 'Failed to fetch station list' })
    }
  })

  router.get('/stations/:id', async (req, res) => {
    const { id } = req.params

    try {
      const foenData = await fetchStationData(id)
      if (foenData && Array.isArray(foenData.measurements) && foenData.measurements.length) {
        console.log(`✅ Responding with foen for station ${id}`)
        return res.json(withSource(foenData, 'foen'))
      }
    } catch (error) {
      console.warn(`FOEN API unavailable for station ${id}:`, error?.message ?? error)
    }

    try {
      const socrataData = await fetchSocrataStationData(id)
      if (socrataData && Array.isArray(socrataData.measurements) && socrataData.measurements.length) {
        console.log(`✅ Responding with opendata.bs.ch for station ${id}`)
        return res.json(withSource(socrataData, 'opendata.bs.ch'))
      }
    } catch (error) {
      console.warn(`Socrata source unavailable for station ${id}:`, error?.message ?? error)
    }

    const localData = getLocalStationData(id)
    if (localData) {
      console.log(`✅ Responding with local-snapshot for station ${id}`)
      return res.json(withSource(localData, 'local-snapshot'))
    }

    return res.status(404).json({ error: 'Station not found in any data source' })
  })

  return router
}
