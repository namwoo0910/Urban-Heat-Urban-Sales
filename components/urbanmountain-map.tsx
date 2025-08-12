"use client"

import { useState, useEffect, useRef } from "react"
import Map from "react-map-gl"
import type { MapRef } from "react-map-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import { convertUrbanMountainData } from "@/utils/urbanmountain-data-converter"

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "pk.eyJ1IjoieXN1MTUxNiIsImEiOiJjbWRyMHR2bTQwOTB2MmlzOGdlZmFldnVnIn0.Rv_I_4s0u88CYd7r9JbZDA"

interface UrbanMountainMapProps {
  className?: string
}

export function UrbanMountainMap({ className = "" }: UrbanMountainMapProps) {
  const mapRef = useRef<MapRef>(null)
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const [currentHour, setCurrentHour] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const animationFrameRef = useRef<number | null>(null)
  const lastUpdateRef = useRef<number>(0)
  
  // WebGL support detection
  const [webglSupport, setWebglSupport] = useState<{
    supported: boolean
    version: number
    performanceLevel: string
  }>({
    supported: false,
    version: 0,
    performanceLevel: 'low'
  })

  // Check WebGL support
  useEffect(() => {
    const checkWebGL = () => {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
      
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
        let performanceLevel = 'medium'
        
        if (debugInfo) {
          const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase()
          if (renderer.includes('nvidia') || renderer.includes('amd') || renderer.includes('radeon')) {
            performanceLevel = 'high'
          } else if (renderer.includes('intel')) {
            performanceLevel = 'medium'
          }
        }
        
        setWebglSupport({
          supported: true,
          version: gl.getParameter(gl.VERSION).includes('WebGL 2') ? 2 : 1,
          performanceLevel
        })
      } else {
        console.error('WebGL not supported')
      }
    }
    
    checkWebGL()
  }, [])

  // Load population data
  useEffect(() => {
    if (!isMapLoaded || !mapRef.current) return

    const map = mapRef.current.getMap()
    if (!map) return

    // Load Seoul boundary data
    fetch('/seoul_boundary.geojson')
      .then(res => res.json())
      .then(boundary => {
        // Add Seoul boundary source
        if (!map.getSource('seoul-boundary')) {
          map.addSource('seoul-boundary', {
            type: 'geojson',
            data: boundary
          })
        }

        // Add boundary outline layer
        if (!map.getLayer('seoul-boundary-outline')) {
          map.addLayer({
            id: 'seoul-boundary-outline',
            type: 'line',
            source: 'seoul-boundary',
            paint: {
              'line-color': '#667eea',
              'line-width': 2,
              'line-opacity': 0.6
            }
          })
        }
      })
      .catch(err => console.error('Error loading boundary:', err))

    // Load population grid data from processed data
    Promise.all([
      fetch('/urbanmountain/processed_data/grid_coordinates.json').then(res => res.json()),
      fetch('/urbanmountain/processed_data/grid_population.json').then(res => res.json())
    ])
      .then(([coordinates, population]) => {
        // Convert data to GeoJSON format
        const processedData = convertUrbanMountainData(coordinates, population, currentHour)

        // Add population data source
        if (!map.getSource('population-grid')) {
          map.addSource('population-grid', {
            type: 'geojson',
            data: processedData
          })
        } else {
          const source = map.getSource('population-grid') as any
          source.setData(processedData)
        }

        // Add 3D extrusion layer
        if (!map.getLayer('population-3d')) {
          map.addLayer({
            id: 'population-3d',
            type: 'fill-extrusion',
            source: 'population-grid',
            paint: {
              'fill-extrusion-color': [
                'interpolate',
                ['linear'],
                ['get', 'population'],
                0, '#440154',
                10, '#482878',
                25, '#3e4989',
                50, '#31688e',
                100, '#26828e',
                200, '#1f9e89',
                500, '#35b779',
                1000, '#6ece58',
                2000, '#b5de2b',
                5000, '#fde725'
              ],
              'fill-extrusion-height': ['get', 'height'],
              'fill-extrusion-base': 0,
              'fill-extrusion-opacity': 0.8
            }
          })
        }

        // Add glow effect layer (for high performance mode)
        if (webglSupport.performanceLevel === 'high' && !map.getLayer('population-glow')) {
          map.addLayer({
            id: 'population-glow',
            type: 'fill-extrusion',
            source: 'population-grid',
            paint: {
              'fill-extrusion-color': '#667eea',
              'fill-extrusion-height': ['*', ['get', 'height'], 1.1],
              'fill-extrusion-base': 0,
              'fill-extrusion-opacity': 0.2
            }
          })
        }
      })
      .catch(err => console.error('Error loading population data:', err))
  }, [isMapLoaded, currentHour, webglSupport.performanceLevel])

  // Update data when hour changes
  useEffect(() => {
    if (!isMapLoaded || !mapRef.current) return

    const map = mapRef.current.getMap()
    if (!map || !map.getSource('population-grid')) return

    // Fetch and update data for new hour
    Promise.all([
      fetch('/urbanmountain/processed_data/grid_coordinates.json').then(res => res.json()),
      fetch('/urbanmountain/processed_data/grid_population.json').then(res => res.json())
    ])
      .then(([coordinates, population]) => {
        // Convert data to GeoJSON format
        const processedData = convertUrbanMountainData(coordinates, population, currentHour)

        const source = map.getSource('population-grid') as any
        source.setData(processedData)
      })
      .catch(err => console.error('Error updating data:', err))
  }, [currentHour, isMapLoaded])

  // Animation loop
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      return
    }

    const animate = (timestamp: number) => {
      if (timestamp - lastUpdateRef.current > 1000) { // Update every second
        setCurrentHour(prev => (prev + 1) % 24)
        lastUpdateRef.current = timestamp
      }
      
      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isPlaying])

  if (!webglSupport.supported) {
    return (
      <div className={`flex items-center justify-center h-full bg-black text-white ${className}`}>
        <div className="text-center">
          <h2 className="text-2xl mb-4">WebGL Not Supported</h2>
          <p>This visualization requires WebGL support.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Header */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
        <div className="bg-black/80 backdrop-blur-sm px-6 py-3 rounded-lg">
          <h1 className="text-white text-2xl font-bold">
            서울 시간대별 인구 밀도 3D 시각화
          </h1>
        </div>
      </div>

      {/* Time controls */}
      <div className="absolute bottom-4 right-4 z-10">
        <div className="bg-black/80 backdrop-blur-sm p-4 rounded-lg text-white">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
            >
              {isPlaying ? '⏸ 일시정지' : '▶ 재생'}
            </button>
            
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="23"
                value={currentHour}
                onChange={(e) => setCurrentHour(Number(e.target.value))}
                className="w-48"
              />
              <span className="text-xl font-bold min-w-[80px] text-center">
                {String(currentHour).padStart(2, '0')}:00
              </span>
            </div>
          </div>
          
          <div className="mt-2 text-sm opacity-70">
            WebGL {webglSupport.version}.0 | Performance: {webglSupport.performanceLevel}
          </div>
        </div>
      </div>

      {/* Map */}
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          longitude: 126.978,
          latitude: 37.5665,
          zoom: 11.5,
          pitch: 60,
          bearing: -20
        }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        reuseMaps={true}
        preserveDrawingBuffer={false}
        attributionControl={false}
        fog={{
          color: 'rgb(186, 210, 235)',
          'high-color': 'rgb(36, 92, 223)',
          'horizon-blend': 0.02,
          'space-color': 'rgb(11, 11, 25)',
          'star-intensity': 0.6
        }}
        onLoad={() => setIsMapLoaded(true)}
        onError={(evt) => {
          if (evt && evt.error) {
            console.error('UrbanMountain map error:', evt.error)
          }
        }}
      />
    </div>
  )
}