import type { LatLngExpression } from 'leaflet'
import type { StationDataResponse, StationSummary } from '../api/waterData'

export interface GeoJsonFeature {
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

export interface GeoJsonFeatureCollection {
  type: 'FeatureCollection'
  features: GeoJsonFeature[]
}

export interface MapStation {
  id: string
  name: string
  lat: number
  lon: number
  river?: string
  canton?: string
  measurements: StationDataResponse['measurements']
  source?: string
}

export const SWISS_CENTER: LatLngExpression = [46.8, 8.2]

export const FALLBACK_STATIONS: StationSummary[] = [
  { id: '2061', name: 'Zürich / Limmat' },
  { id: '2141', name: 'Bern / Aare' },
  { id: '2409', name: 'Basel / Rhein' },
  { id: '2106', name: 'Birs / Hofmatt' },
]

