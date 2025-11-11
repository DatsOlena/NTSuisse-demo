import { renderHook, waitFor } from '@testing-library/react'
import { useWaterMapData } from './useWaterMapData'
import type { StationDataResponse } from '../api/waterData'

const mockFetchStations = jest.fn()
const mockFetchStationData = jest.fn()

jest.mock('../api/waterData', () => ({
  fetchStations: () => mockFetchStations(),
  fetchStationData: (id: string) => mockFetchStationData(id),
}))

describe('useWaterMapData', () => {
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    mockFetchStations.mockReset()
    mockFetchStationData.mockReset()
    global.fetch = jest.fn()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('loads stations and measurements successfully', async () => {
    const geojsonResponse = {
      ok: true,
      json: async () => ({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { id: '2061', name: 'Zürich / Limmat', river: 'Limmat', canton: 'ZH' },
            geometry: { type: 'Point', coordinates: [8.55, 47.37] },
          },
        ],
      }),
    }

    ;(global.fetch as jest.Mock).mockResolvedValue(geojsonResponse)

    mockFetchStations.mockResolvedValue([{ id: '2061', name: 'Zürich / Limmat' }])

    const measurement: StationDataResponse = {
      station: {
        id: '2061',
        name: 'Zürich / Limmat',
        waterBody: 'Limmat',
        canton: 'ZH',
      },
      measurements: [
        { id: 'temp', label: 'Water temperature', value: 8.5, unit: '°C', shortName: 'Temp' },
      ],
      source: 'local-snapshot',
      timestamp: new Date().toISOString(),
    }

    mockFetchStationData.mockResolvedValue(measurement)

    const { result } = renderHook(() => useWaterMapData())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBeNull()
    expect(result.current.mapStations).toHaveLength(1)
    expect(result.current.mapStations[0]).toMatchObject({
      id: '2061',
      name: 'Zürich / Limmat',
      river: 'Limmat',
      canton: 'ZH',
      source: 'local-snapshot',
    })
    expect(mockFetchStations).toHaveBeenCalledTimes(1)
    expect(mockFetchStationData).toHaveBeenCalledWith('2061')
  })

  it('handles failures gracefully', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: false })
    mockFetchStations.mockResolvedValue([{ id: '2061', name: 'Zürich / Limmat' }])
    mockFetchStationData.mockResolvedValue(null)

    const { result } = renderHook(() => useWaterMapData())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('Unable to load map data.')
    expect(result.current.mapStations).toHaveLength(0)
  })
})

