import { useEffect, useMemo, useState } from 'react'
import type { LatLngExpression } from 'leaflet'
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet'
import Loader from './Loader'
import { fetchStationData, fetchStations, StationDataResponse, StationSummary } from '../api/waterData'

interface GeoJsonFeature {
  type: 'Feature'
  properties: {
    id: string
    name?: string
    river?: string
    canton?: string
  }
  geometry: {
    type: 'Point'
    coordinates: [number, number]
  }
}

interface GeoJsonFeatureCollection {
  type: 'FeatureCollection'
  features: GeoJsonFeature[]
}

interface MapStation {
  id: string
  name: string
  lat: number
  lon: number
  river?: string
  canton?: string
  measurements: StationDataResponse['measurements']
  source?: string
}

const SWISS_CENTER: LatLngExpression = [46.8, 8.2]
const FALLBACK_STATIONS: StationSummary[] = [
  { id: '2061', name: 'Zürich / Limmat' },
  { id: '2141', name: 'Bern / Aare' },
  { id: '2409', name: 'Basel / Rhein' },
  { id: '2106', name: 'Birs / Hofmatt' },
]

function temperatureColor(value: number | null): string {
  if (value == null || Number.isNaN(value)) {
    return '#2563eb'
  }
  if (value <= 5) return '#1d4ed8'
  if (value <= 8) return '#3b82f6'
  if (value <= 10) return '#22c55e'
  if (value <= 12) return '#eab308'
  return '#ef4444'
}

function findMeasurement(
  measurements: StationDataResponse['measurements'],
  keywords: string[],
) {
  return measurements.find((measurement) => {
    const compare = `${measurement.shortName ?? ''} ${measurement.label ?? ''}`.toLowerCase()
    return keywords.some((keyword) => compare.includes(keyword))
  })
}

const sourceLabels: Record<string, string> = {
  'opendata.bs.ch': 'Basel Open Data (data.bs.ch)',
  'local-snapshot': 'Local CSV snapshot',
  foen: 'FOEN Hydrological API',
}

export default function WaterMap() {
  const [mapStations, setMapStations] = useState<MapStation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [geoResponse, list] = await Promise.all([
          fetch('/data/stations.geojson'),
          fetchStations().catch(() => FALLBACK_STATIONS),
        ])

        if (!geoResponse.ok) {
          throw new Error('Failed to load station coordinates')
        }

        const geojson: GeoJsonFeatureCollection = await geoResponse.json()
        const stationsList = Array.isArray(list) && list.length ? list : FALLBACK_STATIONS

        const measurementsEntries = await Promise.all(
          stationsList.map(async (station) => {
            try {
              const data = await fetchStationData(station.id)
              return [station.id, data] as const
            } catch (err) {
              console.warn('Map: failed to load station data', station.id, err)
              return [station.id, null] as const
            }
          }),
        )

        const measurementMap = new Map<string, StationDataResponse | null>(measurementsEntries)

        const combinedStations = geojson.features.reduce<MapStation[]>((acc, feature) => {
          const stationId = feature.properties.id
          if (!stationId || feature.geometry.type !== 'Point') {
            return acc
          }

          const measurement = measurementMap.get(stationId) || null
          const [lon, lat] = feature.geometry.coordinates as [number, number]
          const measurementList: StationDataResponse['measurements'] =
            measurement?.measurements ?? ([] as StationDataResponse['measurements'])

          acc.push({
            id: stationId,
            name: feature.properties.name || measurement?.station.name || stationId,
            lat,
            lon,
            river: feature.properties.river || (measurement?.station.waterBody ?? undefined),
            canton: feature.properties.canton || (measurement?.station.canton ?? undefined),
            measurements: measurementList,
            source: measurement?.source ?? undefined,
          })
          return acc
        }, [])

        setMapStations(combinedStations)
      } catch (err) {
        console.error('Failed to initialise water map', err)
        setError('Unable to load map data.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const stationsWithMeasurements = useMemo(() => mapStations.filter((station) => station.measurements.length), [mapStations])

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-theme-lg p-6 flex items-center justify-center min-h-[320px]">
        <Loader />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-theme-lg p-6 text-red-600">
        {error}
      </div>
    )
  }

  if (!stationsWithMeasurements.length) {
    return (
      <div className="bg-white rounded-xl shadow-theme-lg p-6 text-secondary">
        No stations available for map view.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-theme-lg overflow-hidden">
      <MapContainer center={SWISS_CENTER} zoom={7} className="h-[420px] w-full">
        <TileLayer
          attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a>"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {stationsWithMeasurements.map((station) => {
          const temperature = findMeasurement(station.measurements, ['temperature', 'temperatur'])
          const discharge = findMeasurement(station.measurements, ['discharge', 'durchfluss', 'abfluss'])
          const waterLevel = findMeasurement(station.measurements, ['water level', 'wasserstand', 'pegel', 'level'])
          const sourceLabel = station.source ? sourceLabels[station.source] ?? station.source : 'Unknown source'
          const markerPosition: LatLngExpression = [station.lat, station.lon]

          return (
            <CircleMarker
              key={station.id}
              center={markerPosition}
              radius={10}
              pathOptions={{ color: temperatureColor(temperature?.value ?? null), fillOpacity: 0.8 }}
            >
              <Tooltip direction="top" offset={[0, -6] as [number, number]} opacity={1} className="tooltip-custom">
                <div className="space-y-1">
                  <p className="font-semibold text-sm">{station.name}</p>
                  {station.river && (
                    <p className="text-xs text-secondary">River: {station.river}</p>
                  )}
                  {station.canton && (
                    <p className="text-xs text-secondary">Canton: {station.canton}</p>
                  )}
                  {temperature && (
                    <p className="text-xs">Temperature: {temperature.value?.toFixed(1)} {temperature.unit ?? '°C'}</p>
                  )}
                  {waterLevel && (
                    <p className="text-xs">Water level: {waterLevel.value ?? '—'} {waterLevel.unit ?? ''}</p>
                  )}
                  {discharge && (
                    <p className="text-xs">Discharge: {discharge.value ?? '—'} {discharge.unit ?? ''}</p>
                  )}
                  <p className="text-[10px] text-secondary/80">Source: {sourceLabel}</p>
                </div>
              </Tooltip>
            </CircleMarker>
          )
        })}
      </MapContainer>
    </div>
  )
}
