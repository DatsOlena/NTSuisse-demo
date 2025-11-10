import type { StationDataResponse } from '../api/waterData'

export function temperatureColor(value: number | null): string {
  if (value == null || Number.isNaN(value)) {
    return '#2563eb'
  }
  if (value <= 5) return '#1d4ed8'
  if (value <= 8) return '#3b82f6'
  if (value <= 10) return '#22c55e'
  if (value <= 12) return '#eab308'
  return '#ef4444'
}

export function findMeasurement(
  measurements: StationDataResponse['measurements'],
  keywords: string[],
) {
  return measurements.find((measurement) => {
    const compare = `${measurement.shortName ?? ''} ${measurement.label ?? ''}`.toLowerCase()
    return keywords.some((keyword) => compare.includes(keyword))
  })
}

export const sourceLabels: Record<string, string> = {
  'opendata.bs.ch': 'Basel Open Data (data.bs.ch)',
  'local-snapshot': 'Local CSV snapshot',
  foen: 'FOEN Hydrological API',
}

