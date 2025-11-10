import { useEffect, useState } from 'react'
import {
  fetchStationData,
  fetchStations,
  type StationDataResponse,
  type StationSummary,
} from '../api/waterData'
import type { GeoJsonFeatureCollection, MapStation } from '../types/waterMap'
import { FALLBACK_STATIONS } from '../types/waterMap'

interface UseWaterMapDataResult {
  loading: boolean
  error: string | null
  mapStations: MapStation[]
}

async function loadMeasurements(stations: StationSummary[]) {
  const measurementEntries = await Promise.all(
    stations.map(async (station) => {
      try {
        const data = await fetchStationData(station.id)
        return [station.id, data] as const
      } catch (err) {
        console.warn('Water map: failed to load station data', station.id, err)
        return [station.id, null] as const
      }
    }),
  )
  return new Map<string, StationDataResponse | null>(measurementEntries)
}

function combineStations(
  geojson: GeoJsonFeatureCollection,
  measurements: Map<string, StationDataResponse | null>,
): MapStation[] {
  return geojson.features.reduce<MapStation[]>((acc, feature) => {
    const stationId = feature.properties.id
    if (!stationId || feature.geometry.type !== 'Point') {
      return acc
    }

    const measurement = measurements.get(stationId) || null
    const [lon, lat] = feature.geometry.coordinates
    const measurementList: StationDataResponse['measurements'] =
      measurement?.measurements ?? ([] as StationDataResponse['measurements'])

    acc.push({
      id: stationId,
      name: feature.properties.name || measurement?.station.name || stationId,
      lat,
      lon,
      river: feature.properties.river || measurement?.station.waterBody || undefined,
      canton: feature.properties.canton || measurement?.station.canton || undefined,
      measurements: measurementList,
      source: measurement?.source ?? undefined,
    })
    return acc
  }, [])
}

export function useWaterMapData(): UseWaterMapDataResult {
  const [mapStations, setMapStations] = useState<MapStation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isCancelled = false

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
        const measurementMap = await loadMeasurements(stationsList)
        const combinedStations = combineStations(geojson, measurementMap)

        if (!isCancelled) {
          setMapStations(combinedStations)
        }
      } catch (err) {
        console.error('Failed to initialise water map', err)
        if (!isCancelled) {
          setError('Unable to load map data.')
          setMapStations([])
        }
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      isCancelled = true
    }
  }, [])

  return { loading, error, mapStations }
}

