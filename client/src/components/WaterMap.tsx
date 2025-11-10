import { useMemo } from 'react'
import type { LatLngExpression } from 'leaflet'
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet'
import Loader from './Shared/Loader'
import { SWISS_CENTER } from '../types/waterMap'
import { useWaterMapData } from '../hooks/useWaterMapData'
import { findMeasurement, sourceLabels, temperatureColor } from '../utils/waterMap'

export default function WaterMap() {
  const { loading, error, mapStations } = useWaterMapData()
  const stationsWithMeasurements = useMemo(
    () => mapStations.filter((station) => station.measurements.length),
    [mapStations],
  )

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

          return (
            <CircleMarker
              key={station.id}
              center={[station.lat, station.lon] as LatLngExpression}
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
