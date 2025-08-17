"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Map, { Popup } from "react-map-gl"
import type { MapRef } from "react-map-gl"
import "mapbox-gl/dist/mapbox-gl.css"

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

interface UrbanMountainCompleteProps {
  className?: string
}

interface GridData {
  grid_id: number
  lng: number
  lat: number
  row: number
  col: number
  bounds: {
    minLng: number
    maxLng: number
    minLat: number
    maxLat: number
  }
  size_meters: {
    width: number
    height: number
  }
}

interface PopulationData {
  [timeKey: string]: {
    [gridId: string]: number
  }
}

interface ViewType {
  pitch: number
  bearing: number
  zoom: number
}

const VIEW_PRESETS: Record<string, ViewType> = {
  top: { pitch: 0, bearing: 0, zoom: 13 },
  angle: { pitch: 60, bearing: 45, zoom: 13 },
  side: { pitch: 75, bearing: 90, zoom: 14 },
  bird: { pitch: 70, bearing: 30, zoom: 12 }
}

export function UrbanMountainComplete({ className = "" }: UrbanMountainCompleteProps) {
  const mapRef = useRef<MapRef>(null)
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const [gridData, setGridData] = useState<GridData[]>([])
  const [populationData, setPopulationData] = useState<PopulationData>({})
  const [currentHour, setCurrentHour] = useState(12)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeView, setActiveView] = useState('bird')
  const [statsCollapsed, setStatsCollapsed] = useState(false)
  const [popupInfo, setPopupInfo] = useState<{
    longitude: number
    latitude: number
    population: number
    height: number
    gridId: number
  } | null>(null)
  const [stats, setStats] = useState({
    total: 0,
    average: 0,
    maximum: 0,
    activeGrids: 0
  })
  
  const animationRef = useRef<number | null>(null)
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Add compression headers for better performance
      const fetchOptions = {
        headers: {
          'Accept-Encoding': 'gzip, deflate, br'
        }
      }

      const [coordsResponse, popResponse] = await Promise.all([
        fetch('/urbanmountain/processed_data/grid_coordinates.json', fetchOptions),
        fetch('/urbanmountain/processed_data/grid_population.json', fetchOptions)
      ])

      if (!coordsResponse.ok || !popResponse.ok) {
        throw new Error('Failed to load data files')
      }

      // Progressive loading with streaming
      const coords = await coordsResponse.json()
      setGridData(coords)
      
      // Load population data after coordinates
      const pop = await popResponse.json()
      setPopulationData(pop)
      
      setIsLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
      setIsLoading(false)
    }
  }

  // Color calculation
  const getColorByPopulation = useCallback((population: number): string => {
    if (population >= 25000) return '#a63603'
    if (population >= 20000) return '#d94801'
    if (population >= 15000) return '#f16913'
    if (population >= 10000) return '#fd8d3c'
    if (population >= 5000) return '#fdae6b'
    return '#fdd0a2'
  }, [])

  // Height calculation
  const getHeightByPopulation = useCallback((population: number): number => {
    const minHeight = 10
    const maxHeight = 1500
    const normalizedPop = Math.max(0, population)
    const maxPop = 30000
    
    const normalizedRatio = Math.sqrt(normalizedPop / maxPop)
    return minHeight + (maxHeight - minHeight) * normalizedRatio
  }, [])

  // Bilinear interpolation
  const bilinearInterpolation = useCallback((x: number, y: number, x1: number, y1: number, x2: number, y2: number, q11: number, q12: number, q21: number, q22: number): number => {
    const r1 = ((x2 - x) / (x2 - x1)) * q11 + ((x - x1) / (x2 - x1)) * q21
    const r2 = ((x2 - x) / (x2 - x1)) * q12 + ((x - x1) / (x2 - x1)) * q22
    return ((y2 - y) / (y2 - y1)) * r1 + ((y - y1) / (y2 - y1)) * r2
  }, [])

  // Create population matrix
  const createPopulationMatrix = useCallback((hourlyPopulation: { [key: string]: number }) => {
    // Calculate matrix size
    const maxRow = Math.max(...gridData.map(grid => grid.row || 0))
    const maxCol = Math.max(...gridData.map(grid => grid.col || 0))
    
    // Initialize matrix
    const matrix = Array(maxRow + 1).fill(null).map(() => Array(maxCol + 1).fill(0))
    const bounds = {
      minLng: Infinity, maxLng: -Infinity,
      minLat: Infinity, maxLat: -Infinity
    }
    
    // Fill data
    gridData.forEach((grid, index) => {
      const population = hourlyPopulation[index.toString()] || 0
      const row = grid.row || 0
      const col = grid.col || 0
      
      matrix[row][col] = population
      
      // Calculate bounds
      bounds.minLng = Math.min(bounds.minLng, grid.lng)
      bounds.maxLng = Math.max(bounds.maxLng, grid.lng)
      bounds.minLat = Math.min(bounds.minLat, grid.lat)
      bounds.maxLat = Math.max(bounds.maxLat, grid.lat)
    })
    
    return { matrix, bounds, rows: maxRow + 1, cols: maxCol + 1 }
  }, [gridData])

  // Create interpolated grid
  const createInterpolatedGrid = useCallback((matrix: number[][], bounds: any, rows: number, cols: number, interpolationFactor: number = 4) => {
    const features = []
    const stepLng = (bounds.maxLng - bounds.minLng) / (cols * interpolationFactor)
    const stepLat = (bounds.maxLat - bounds.minLat) / (rows * interpolationFactor)
    
    for (let i = 0; i < rows * interpolationFactor - 1; i++) {
      for (let j = 0; j < cols * interpolationFactor - 1; j++) {
        // Current position coordinates
        const lng = bounds.minLng + j * stepLng
        const lat = bounds.minLat + i * stepLat
        
        // Position in original grid
        const origRow = i / interpolationFactor
        const origCol = j / interpolationFactor
        
        // Indices of surrounding 4 grids
        const r1 = Math.floor(origRow)
        const r2 = Math.min(r1 + 1, rows - 1)
        const c1 = Math.floor(origCol)
        const c2 = Math.min(c1 + 1, cols - 1)
        
        // Values to interpolate
        const q11 = matrix[r1] && matrix[r1][c1] ? matrix[r1][c1] : 0
        const q12 = matrix[r2] && matrix[r2][c1] ? matrix[r2][c1] : 0
        const q21 = matrix[r1] && matrix[r1][c2] ? matrix[r1][c2] : 0
        const q22 = matrix[r2] && matrix[r2][c2] ? matrix[r2][c2] : 0
        
        // Calculate interpolated value
        let interpolatedValue
        if (r1 === r2 && c1 === c2) {
          interpolatedValue = q11
        } else if (r1 === r2) {
          interpolatedValue = q11 + (q21 - q11) * (origCol - c1)
        } else if (c1 === c2) {
          interpolatedValue = q11 + (q12 - q11) * (origRow - r1)
        } else {
          interpolatedValue = bilinearInterpolation(
            origCol, origRow, c1, r1, c2, r2, q11, q12, q21, q22
          )
        }
        
        // Apply minimum threshold
        if (interpolatedValue < 100) continue
        
        // Create smooth rectangle
        const cellSize = Math.min(stepLng, stepLat) * 0.9
        const coordinates = [[
          [lng, lat],
          [lng + cellSize, lat],
          [lng + cellSize, lat + cellSize],
          [lng, lat + cellSize],
          [lng, lat]
        ]]

        features.push({
          type: 'Feature' as const,
          geometry: {
            type: 'Polygon' as const,
            coordinates
          },
          properties: {
            grid_id: `interpolated_${i}_${j}`,
            population: interpolatedValue,
            height: getHeightByPopulation(interpolatedValue),
            color: getColorByPopulation(interpolatedValue),
            center: [lng + cellSize/2, lat + cellSize/2],
            row: i,
            col: j,
            interpolated: true
          }
        })
      }
    }
    
    return features
  }, [bilinearInterpolation, getHeightByPopulation, getColorByPopulation])

  // Create GeoJSON data with interpolation
  const createGeoJSONData = useCallback((hour: number) => {
    const timeKey = `${String(hour).padStart(2, '0')}:00`
    const hourlyData = populationData[timeKey] || {}

    if (Object.keys(hourlyData).length === 0) {
      return { type: 'FeatureCollection' as const, features: [] }
    }

    // Create matrix and interpolated grid
    const { matrix, bounds, rows, cols } = createPopulationMatrix(hourlyData)
    const interpolatedFeatures = createInterpolatedGrid(matrix, bounds, rows, cols, 4)

    return {
      type: 'FeatureCollection' as const,
      features: interpolatedFeatures
    }
  }, [populationData, createPopulationMatrix, createInterpolatedGrid])

  // Update visualization
  const updateVisualization = useCallback((hour: number) => {
    if (!isMapLoaded || !mapRef.current || gridData.length === 0) return

    const map = mapRef.current.getMap()
    const geoJsonData = createGeoJSONData(hour)

    if (map.getSource('population-data')) {
      (map.getSource('population-data') as any).setData(geoJsonData)
    } else {
      map.addSource('population-data', {
        type: 'geojson',
        data: geoJsonData
      })

      map.addLayer({
        id: 'population-bars',
        type: 'fill-extrusion',
        source: 'population-data',
        paint: {
          'fill-extrusion-color': ['get', 'color'],
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.85,
          'fill-extrusion-ambient-occlusion-intensity': 0.4,
          'fill-extrusion-ambient-occlusion-radius': 4.0
        }
      })

      // Add click and hover events
      map.on('click', 'population-bars', (e) => {
        if (e.features && e.features[0]) {
          const properties = e.features[0].properties
          const center = properties?.center ? JSON.parse(properties.center) : [127.0, 37.5]
          
          setPopupInfo({
            longitude: center[0],
            latitude: center[1],
            population: properties?.population || 0,
            height: properties?.height || 0,
            gridId: properties?.grid_id || 0
          })
        }
      })

      // Change cursor on hover
      map.on('mouseenter', 'population-bars', () => {
        map.getCanvas().style.cursor = 'pointer'
      })

      map.on('mouseleave', 'population-bars', () => {
        map.getCanvas().style.cursor = ''
      })
    }

    // Update stats with interpolated data
    const populations = geoJsonData.features.map(f => f.properties.population).filter(pop => pop >= 100)
    
    if (populations.length > 0) {
      const total = populations.reduce((sum, pop) => sum + pop, 0)
      const average = total / populations.length
      const maximum = Math.max(...populations)
      
      setStats({
        total,
        average,
        maximum,
        activeGrids: populations.length
      })
    }
  }, [isMapLoaded, gridData, createGeoJSONData, populationData])

  // Update when hour changes
  useEffect(() => {
    updateVisualization(currentHour)
  }, [currentHour, updateVisualization])

  // Change view
  const changeView = useCallback((viewType: string) => {
    if (!mapRef.current) return
    
    const view = VIEW_PRESETS[viewType]
    if (!view) return
    
    setActiveView(viewType)
    mapRef.current.easeTo({
      pitch: view.pitch,
      bearing: view.bearing,
      zoom: view.zoom,
      duration: 1500
    })
  }, [])

  // Toggle play
  const togglePlay = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false)
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current)
      }
    } else {
      setIsPlaying(true)
      playIntervalRef.current = setInterval(() => {
        setCurrentHour(prev => (prev + 1) % 24)
      }, 1000)
    }
  }, [isPlaying])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current)
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gridData.length === 0) return
      
      switch (e.code) {
        case 'ArrowLeft':
          e.preventDefault()
          if (!isPlaying) setCurrentHour(prev => Math.max(0, prev - 1))
          break
        case 'ArrowRight':
          e.preventDefault()
          if (!isPlaying) setCurrentHour(prev => Math.min(23, prev + 1))
          break
        case 'Space':
          e.preventDefault()
          togglePlay()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isPlaying, gridData.length, togglePlay])

  if (isLoading) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-black ${className}`}>
        <div className="text-center text-white">
          <div className="w-16 h-16 border-4 border-white border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <div>데이터를 로딩중입니다...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-black ${className}`}>
        <div className="text-center text-white">
          <h3 className="text-xl mb-4 text-red-400">❌ 데이터 로드 실패</h3>
          <p className="text-gray-300">{error}</p>
          <button
            onClick={loadData}
            className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative w-full h-full ${className}`}>

      {/* Map */}
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        initialViewState={{
          longitude: 127.0,
          latitude: 37.5,
          zoom: 13,
          pitch: 70,
          bearing: 30
        }}
        style={{ width: '100%', height: '100%' }}
        onLoad={() => {
          setIsMapLoaded(true)
          const map = mapRef.current?.getMap()
          if (map) {
            map.addSource('mapbox-dem', {
              type: 'raster-dem',
              url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
              tileSize: 512,
              maxzoom: 14
            })
            map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 })
          }
        }}
        terrain={{ source: 'mapbox-dem', exaggeration: 1.5 }}
        onClick={() => setPopupInfo(null)}
      >
        {/* Popup */}
        {popupInfo && (
          <Popup
            longitude={popupInfo.longitude}
            latitude={popupInfo.latitude}
            anchor="bottom"
            onClose={() => setPopupInfo(null)}
            closeButton={true}
            closeOnClick={true}
            className="population-popup"
          >
            <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg min-w-[180px]">
              <div className="font-bold mb-2 text-center">
                🏢 격자 정보
              </div>
              <div className="space-y-1 text-sm">
                <div>
                  <strong>인구수:</strong> {popupInfo.population.toLocaleString()}명
                </div>
                <div>
                  <strong>높이:</strong> {Math.round(popupInfo.height)}m
                </div>
                <div>
                  <strong>시간:</strong> {String(currentHour).padStart(2, '0')}:00
                </div>
                <div>
                  <strong>격자 ID:</strong> {popupInfo.gridId}
                </div>
              </div>
            </div>
          </Popup>
        )}
      </Map>

      {/* Legend */}
      <div className="absolute top-20 right-5 bg-black/85 backdrop-blur-md p-6 rounded-xl text-white z-[1000] min-w-[200px]">
        <h4 className="text-center mb-4 font-bold">🏙️ 인구 수</h4>
        <div className="text-center mb-3 text-sm">명</div>
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="w-4 h-3" style={{ backgroundColor: '#a63603' }}></div>
            <span>30,000</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <div className="w-4 h-3" style={{ backgroundColor: '#d94801' }}></div>
            <span>25,000</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <div className="w-4 h-3" style={{ backgroundColor: '#f16913' }}></div>
            <span>20,000</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <div className="w-4 h-3" style={{ backgroundColor: '#fd8d3c' }}></div>
            <span>15,000</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <div className="w-4 h-3" style={{ backgroundColor: '#fdae6b' }}></div>
            <span>10,000</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <div className="w-4 h-3" style={{ backgroundColor: '#fdd0a2' }}></div>
            <span>5,000</span>
          </div>
        </div>
        <div className="text-center mt-3 text-xs text-gray-400">
          높이는 인구수에 비례
        </div>
      </div>

      {/* Statistics Panel */}
      <div className={`absolute top-24 left-5 bg-black/85 backdrop-blur-md rounded-xl text-white z-[1000] transition-all duration-300 ${statsCollapsed ? 'w-16' : 'min-w-[200px]'}`}>
        <h4 
          className="flex items-center justify-between p-4 cursor-pointer bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-xl"
          onClick={() => setStatsCollapsed(!statsCollapsed)}
        >
          <span>📊 실시간 통계</span>
          <span className={`transform transition-transform ${statsCollapsed ? 'rotate-180' : ''}`}>▼</span>
        </h4>
        {!statsCollapsed && (
          <div className="p-5 space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">총 인구:</span>
              <span className="font-bold">{stats.total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">평균 인구:</span>
              <span className="font-bold">{Math.round(stats.average).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">최대 인구:</span>
              <span className="font-bold">{stats.maximum.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">활성 격자:</span>
              <span className="font-bold">{stats.activeGrids.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>

      {/* Floating Controls */}
      <div className="absolute bottom-5 left-5 bg-black/85 backdrop-blur-md p-4 rounded-xl z-[1000] flex flex-col gap-3">
        {/* View Controls */}
        <div className="flex gap-2">
          {Object.entries(VIEW_PRESETS).map(([key, view]) => (
            <button
              key={key}
              onClick={() => changeView(key)}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                activeView === key 
                  ? 'bg-gradient-to-r from-red-500 to-red-600' 
                  : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
              } text-white`}
            >
              {key === 'top' && '🏢 Top'}
              {key === 'angle' && '📐 Angle'}
              {key === 'side' && '📏 Side'}
              {key === 'bird' && '🦅 Bird'}
            </button>
          ))}
        </div>

        {/* Time Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 flex items-center justify-center text-white font-bold transition-all"
            title="자동 재생"
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          
          <input
            type="range"
            min="0"
            max="23"
            value={currentHour}
            onChange={(e) => !isPlaying && setCurrentHour(parseInt(e.target.value))}
            className="w-32 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
            disabled={isPlaying}
          />
          
          <div className="bg-white text-blue-600 font-bold px-3 py-2 rounded-lg text-sm min-w-[60px] text-center">
            {String(currentHour).padStart(2, '0')}:00
          </div>
        </div>
      </div>
    </div>
  )
}