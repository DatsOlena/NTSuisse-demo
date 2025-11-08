export interface StationSummary {
  id: string
  name: string
}

export interface StationMeasurement {
  id: string | null
  label: string
  shortName: string | null
  unit: string | null
  value: number | null
  timestamp: string | null
}

export interface StationDataResponse {
  station: {
    id: string | number
    name: string
    waterBody: string | null
    canton: string | null
    coordinates: unknown
  }
  measurements: StationMeasurement[]
}

const BASE_URL = '/api/water'

export async function fetchStations(): Promise<StationSummary[]> {
  const response = await fetch(`${BASE_URL}/stations`)
  if (!response.ok) {
    throw new Error('Failed to fetch station list')
  }
  return response.json()
}

export async function fetchStationData(stationId: string): Promise<StationDataResponse> {
  const response = await fetch(`${BASE_URL}/stations/${stationId}`)
  if (!response.ok) {
    throw new Error('Failed to fetch station data')
  }
  return response.json()
}
