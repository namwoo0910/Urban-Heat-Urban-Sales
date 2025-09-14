/**
 * Animated Time Series Mesh Layer
 * Displays card sales data over time with smooth height transitions
 */

import { SimpleMeshLayer } from '@deck.gl/mesh-layers'
import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { generateGridMesh, type MeshGeometry } from '../utils/meshGenerator'
import { Play, Pause, SkipForward, SkipBack, Calendar } from 'lucide-react'
import { getSeasonalMeshColor } from '../utils/seasonalMeshColors'

interface TimeSeriesData {
  month: string // YYYYMM format
  dongSalesMap: Map<number, number>
  label: string // Display label like "2024년 1월"
}

interface AnimatedTimeSeriesMeshLayerProps {
  districtData: any[] // GeoJSON features
  dongBoundaries: any[] // Dong boundary features
  timeSeriesData: TimeSeriesData[] // Monthly sales data
  visible?: boolean
  autoPlay?: boolean
  playSpeed?: number // Seconds per transition (default: 3)
  transitionDuration?: number // Animation duration in ms (default: 1500)
  onMonthChange?: (month: string) => void
  salesHeightScale?: number
}

/**
 * Interpolate between two Float32Arrays
 */
function interpolatePositions(
  from: Float32Array,
  to: Float32Array,
  progress: number
): Float32Array {
  const result = new Float32Array(from.length)
  
  for (let i = 0; i < from.length; i += 3) {
    // X and Y stay the same
    result[i] = from[i]
    result[i + 1] = from[i + 1]
    // Z (height) is interpolated
    result[i + 2] = from[i + 2] + (to[i + 2] - from[i + 2]) * progress
  }
  
  return result
}

/**
 * Animated mesh layer with time series support
 */
export function AnimatedTimeSeriesMeshLayer({
  districtData,
  dongBoundaries,
  timeSeriesData,
  visible = true,
  autoPlay = false,
  playSpeed = 3,
  transitionDuration = 1500,
  onMonthChange,
  salesHeightScale = 100000000
}: AnimatedTimeSeriesMeshLayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(autoPlay)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [animationProgress, setAnimationProgress] = useState(0)
  const [meshCache, setMeshCache] = useState<Map<string, MeshGeometry>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  
  const animationRef = useRef<number>(0)
  const transitionStartRef = useRef<number>(0)
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // OPTIMIZATION: Disabled pre-generation - now using on-demand loading
  // This was causing 2-5 second initial load delays
  useEffect(() => {
    // Only generate mesh for current month on demand
    const generateCurrentMesh = async () => {
      if (timeSeriesData.length === 0 || districtData.length === 0) return
      
      const currentData = timeSeriesData[currentIndex]
      if (!currentData || meshCache.has(currentData.month)) return
      
      setIsLoading(true)
      console.log('[AnimatedMesh] Generating mesh for current month:', currentData.month)
      
      const mesh = generateGridMesh(districtData, {
        resolution: 100,
        heightScale: 1,
        smoothing: true,
        dongBoundaries,
        dongSalesMap: currentData.dongSalesMap,
        salesHeightScale
      })
      
      const newCache = new Map(meshCache)
      newCache.set(currentData.month, mesh)
      
      // Limit cache size to prevent memory issues
      if (newCache.size > 5) {
        const firstKey = newCache.keys().next().value
        if (firstKey) {
          newCache.delete(firstKey)
        }
      }
      
      setMeshCache(newCache)
      setIsLoading(false)
      console.log('[AnimatedMesh] Mesh generated for', currentData.month)
    }
    
    generateCurrentMesh()
  }, [currentIndex, timeSeriesData, districtData, dongBoundaries, salesHeightScale, meshCache])
  
  // Handle automatic playback
  useEffect(() => {
    if (isPlaying && !isLoading && !isTransitioning) {
      playIntervalRef.current = setInterval(() => {
        handleNext()
      }, playSpeed * 1000)
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current)
      }
    }
    
    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current)
      }
    }
  }, [isPlaying, isLoading, isTransitioning, playSpeed, currentIndex])
  
  // Handle month changes
  useEffect(() => {
    if (timeSeriesData[currentIndex] && onMonthChange) {
      onMonthChange(timeSeriesData[currentIndex].month)
    }
  }, [currentIndex, timeSeriesData, onMonthChange])
  
  // Animation loop for smooth transitions
  const animate = useCallback((targetIndex: number) => {
    if (isTransitioning) return
    
    setIsTransitioning(true)
    transitionStartRef.current = performance.now()
    
    const animateFrame = () => {
      const elapsed = performance.now() - transitionStartRef.current!
      const progress = Math.min(elapsed / transitionDuration, 1)
      
      setAnimationProgress(progress)
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animateFrame)
      } else {
        setCurrentIndex(targetIndex)
        setIsTransitioning(false)
        setAnimationProgress(0)
      }
    }
    
    animationRef.current = requestAnimationFrame(animateFrame)
  }, [isTransitioning, transitionDuration])
  
  // Control handlers
  const handlePlayPause = () => {
    setIsPlaying(!isPlaying)
  }
  
  const handleNext = () => {
    const nextIndex = (currentIndex + 1) % timeSeriesData.length
    animate(nextIndex)
  }
  
  const handlePrevious = () => {
    const prevIndex = (currentIndex - 1 + timeSeriesData.length) % timeSeriesData.length
    animate(prevIndex)
  }
  
  const handleMonthSelect = (index: number) => {
    if (index !== currentIndex && !isTransitioning) {
      animate(index)
    }
  }
  
  // Create animated mesh layer
  const meshLayer = useMemo(() => {
    if (!visible || isLoading || meshCache.size === 0) {
      return null
    }
    
    const currentMonth = timeSeriesData[currentIndex]
    const currentMesh = meshCache.get(currentMonth.month)
    
    if (!currentMesh) {
      console.warn('[AnimatedMesh] No mesh found for', currentMonth.month)
      return null
    }
    
    // If transitioning, interpolate positions
    let positions = currentMesh.positions
    if (isTransitioning && animationProgress > 0) {
      const targetIndex = (currentIndex + 1) % timeSeriesData.length
      const targetMonth = timeSeriesData[targetIndex]
      const targetMesh = meshCache.get(targetMonth.month)
      
      if (targetMesh) {
        positions = interpolatePositions(
          currentMesh.positions,
          targetMesh.positions,
          animationProgress
        )
      }
    }
    
    // Create mesh object with animated positions
    const meshObject = {
      attributes: {
        POSITION: {
          value: positions,
          size: 3
        },
        NORMAL: {
          value: currentMesh.normals,
          size: 3
        },
        TEXCOORD_0: {
          value: currentMesh.texCoords,
          size: 2
        }
      },
      indices: currentMesh.indices
    }
    
    // Calculate center
    let centerX = 126.974139
    let centerY = 37.564876
    
    if (districtData.length > 0) {
      const bounds = districtData.reduce((acc, feature) => {
        const coords = feature.geometry.coordinates
        // Handle different geometry types
        const flatCoords = coords.flat(Infinity)
        for (let i = 0; i < flatCoords.length; i += 2) {
          acc.minX = Math.min(acc.minX, flatCoords[i])
          acc.maxX = Math.max(acc.maxX, flatCoords[i])
          acc.minY = Math.min(acc.minY, flatCoords[i + 1])
          acc.maxY = Math.max(acc.maxY, flatCoords[i + 1])
        }
        return acc
      }, { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity })
      
      centerX = (bounds.minX + bounds.maxX) / 2
      centerY = (bounds.minY + bounds.maxY) / 2
    }
    
    // Determine seasonal color by current month (YYYYMM)
    const seasonalColor = getSeasonalMeshColor(currentMonth.month)

    return new SimpleMeshLayer({
      id: 'animated-time-series-mesh',
      data: [{ position: [centerX, centerY, 0] }],
      mesh: meshObject as any,
      sizeScale: 1,
      wireframe: false,
      getPosition: (d: any) => d.position,
      getColor: seasonalColor,
      material: {
        ambient: 0.8,
        diffuse: 1.0,
        shininess: 48,
        specularColor: [100, 200, 255]
      },
      pickable: false,
      parameters: {
        depthTest: true,
        blend: false,
        cullFace: true
      },
      // Use updateTriggers to force re-render on animation
      updateTriggers: {
        mesh: [animationProgress, currentIndex],
        // Re-evaluate color when month index changes
        getColor: [currentIndex]
      }
    })
  }, [
    visible,
    isLoading,
    meshCache,
    currentIndex,
    isTransitioning,
    animationProgress,
    timeSeriesData,
    districtData
  ])
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current)
      }
    }
  }, [])
  
  return {
    layer: meshLayer,
    controls: {
      isPlaying,
      currentIndex,
      isLoading,
      isTransitioning,
      handlePlayPause,
      handleNext,
      handlePrevious,
      handleMonthSelect
    }
  }
}

/**
 * Timeline controls component
 */
export function TimelineControls({
  timeSeriesData,
  controls,
  className = ''
}: {
  timeSeriesData: TimeSeriesData[]
  controls: ReturnType<typeof AnimatedTimeSeriesMeshLayer>['controls']
  className?: string
}) {
  const { 
    isPlaying, 
    currentIndex, 
    isLoading,
    handlePlayPause, 
    handleNext, 
    handlePrevious,
    handleMonthSelect 
  } = controls
  
  if (isLoading) {
    return (
      <div className={`bg-black/90 backdrop-blur-md rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400"></div>
          <span className="ml-3 text-gray-400">Loading time series data...</span>
        </div>
      </div>
    )
  }
  
  return (
    <div className={`bg-black/90 backdrop-blur-md rounded-lg p-4 ${className}`}>
      {/* Current month display */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-cyan-400" />
          <span className="text-white font-medium">
            {timeSeriesData[currentIndex]?.label}
          </span>
        </div>
        <div className="text-sm text-gray-400">
          {currentIndex + 1} / {timeSeriesData.length}
        </div>
      </div>
      
      {/* Playback controls */}
      <div className="flex items-center justify-center space-x-4 mb-4">
        <button
          onClick={handlePrevious}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          title="Previous month"
        >
          <SkipBack className="w-5 h-5 text-gray-300" />
        </button>
        
        <button
          onClick={handlePlayPause}
          className="p-3 bg-cyan-500/20 hover:bg-cyan-500/30 rounded-lg transition-colors"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6 text-cyan-400" />
          ) : (
            <Play className="w-6 h-6 text-cyan-400" />
          )}
        </button>
        
        <button
          onClick={handleNext}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          title="Next month"
        >
          <SkipForward className="w-5 h-5 text-gray-300" />
        </button>
      </div>
      
      {/* Month selector */}
      <div className="grid grid-cols-6 gap-1">
        {timeSeriesData.map((data, index) => {
          const monthNum = parseInt(data.month.slice(4))
          return (
            <button
              key={data.month}
              onClick={() => handleMonthSelect(index)}
              className={`
                px-2 py-1 text-xs rounded transition-all
                ${index === currentIndex 
                  ? 'bg-cyan-500 text-white' 
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }
              `}
              title={data.label}
            >
              {monthNum}월
            </button>
          )
        })}
      </div>
    </div>
  )
}
