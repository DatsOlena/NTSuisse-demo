import { useEffect, useMemo, useState } from 'react'
import { fetchStationData, fetchStations, StationDataResponse, StationSummary } from '../api/waterData'
import Loader from '../components/Shared/Loader'
import WaterMap from '../components/WaterMap'

const FALLBACK_STATIONS: StationSummary[] = [
  { id: '2061', name: 'Zürich / Limmat' },
  { id: '2141', name: 'Bern / Aare' },
  { id: '2409', name: 'Basel / Rhein' },
  { id: '2106', name: 'Birs / Hofmatt' },
]

const SOURCE_LABELS: Record<string, string> = {
  'opendata.bs.ch': 'Basel Open Data (data.bs.ch)',
  'local-snapshot': 'Local CSV snapshot',
  foen: 'FOEN Hydrological API',
}

function sourceLabel(source?: string) {
  if (!source) return 'Unknown source'
  return SOURCE_LABELS[source] ?? source
}

export default function Dashboard() {
  const [stations, setStations] = useState<StationSummary[]>(FALLBACK_STATIONS)
  const [selectedStation, setSelectedStation] = useState<string>('2061')
  const [stationData, setStationData] = useState<StationDataResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStations()
      .then((list) => {
        if (Array.isArray(list) && list.length > 0) {
          setStations(list)
          if (!list.some((station) => station.id === selectedStation)) {
            setSelectedStation(list[0].id)
          }
        }
      })
      .catch((err) => {
        console.warn('Failed to load station list, falling back to defaults', err)
      })
  }, [])

  useEffect(() => {
    if (!selectedStation) {
      return
    }

    setLoading(true)
    setError(null)

    fetchStationData(selectedStation)
      .then((data) => {
        setStationData(data)
      })
      .catch((err) => {
        console.error('Failed to load station data', err)
        setError('Unable to load water analytics for this station.')
        setStationData(null)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [selectedStation])

  const summaryMeasurements = useMemo(() => {
    if (!stationData) return []
    return stationData.measurements
      .filter((m) => typeof m.value === 'number')
      .slice(0, 6)
  }, [stationData])

  return (
    <div className="min-h-screen bg-gray-50 py-12 bg-secondary">
      <div className="max-w-6xl mx-auto px-6 space-y-12">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold color-primary mb-2">Swiss Water Analytics</h1>
            <p className="text-secondary max-w-2xl">
              Live hydrological measurements curated from Swiss open-data sources. Explore the latest water levels,
              discharge, and temperature readings for key monitoring stations.
              <div className="mt-3">
                <a className="text-secondary underline" href="https://www.hydrodaten.admin.ch/de/aktuelle-lage" target="_blank" rel="noreferrer">
                  View official Swiss water map (FOEN)
                </a>
              </div>
              <div className="mt-3">
                Basel river stations are updated in real time
                via the{' '}
                <a
                  href="https://data.bs.ch/explore/dataset/100236/"
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  Basel-Stadt open data portal.
                </a>
              </div>
            </p>

          </div>
          <div className="flex flex-col gap-2 md:w-64">
            <label htmlFor="station" className="text-sm font-medium color-primary uppercase tracking-wide">
              Monitoring station
            </label>
            <select
              id="station"
              value={selectedStation}
              onChange={(event) => setSelectedStation(event.target.value)}
              className="border bg-primary text-secondary border-secondary rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-color-info"
            >
              {stations.map((station) => (
                <option key={station.id} value={station.id}>
                  {station.name}
                </option>
              ))}
            </select>
          </div>
        </header>

        <section className="relative z-0 mt-6">
          <WaterMap />
        </section>

        {loading ? (
          <Loader />
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-4 rounded">
            {error}
          </div>
        ) : stationData ? (
          <>
            <section className="grid gap-6 md:grid-cols-3">
              {summaryMeasurements.map((measurement) => (
                <div key={measurement.id ?? measurement.label} className="bg-primary rounded-xl shadow-theme-md p-6">
                  <h2 className="text-sm uppercase text-secondary tracking-wide mb-2">
                    {measurement.label}
                  </h2>
                  <p className="text-3xl font-semibold text-primary mb-1">
                    {typeof measurement.value === 'number' ? measurement.value.toFixed(2) : '—'}
                    {measurement.unit ? <span className="ml-1 text-sm text-secondary">{measurement.unit}</span> : null}
                  </p>
                  <p className="text-xs text-secondary">
                    {measurement.timestamp
                      ? `Updated ${new Date(measurement.timestamp).toLocaleString()}`
                      : 'Timestamp unavailable'}
                  </p>
                </div>
              ))}
            </section>

            <section className="bg-primary rounded-xl shadow-theme-lg p-8">
              <h3 className="text-xl font-semibold text-primary mb-4">
                Station details
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-secondary uppercase tracking-wide mb-1">Station</p>
                  <p className="text-lg font-medium text-primary">{stationData.station.name}</p>
                  {stationData.station.waterBody && (
                    <p className="text-secondary">Water body: {stationData.station.waterBody}</p>
                  )}
                  {stationData.station.canton && (
                    <p className="text-secondary">Canton: {stationData.station.canton}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-secondary uppercase tracking-wide mb-1">Measurements</p>
                  <ul className="list-disc list-inside text-secondary space-y-1">
                    {stationData.measurements.slice(0, 6).map((m) => (
                      <li key={m.id ?? `${m.label}-${m.timestamp}`}>
                        {m.label}: {typeof m.value === 'number' ? m.value : '—'}
                        {m.unit ? ` ${m.unit}` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <p className="text-xs text-secondary mt-6">
                Data source: {sourceLabel(stationData.source)}
              </p>
            </section>
          </>
        ) : (
          <div className="bg-white rounded-xl shadow-theme-md p-6 text-center text-secondary">
            No station data available.
          </div>
        )}
      </div>
    </div>
  )
}
