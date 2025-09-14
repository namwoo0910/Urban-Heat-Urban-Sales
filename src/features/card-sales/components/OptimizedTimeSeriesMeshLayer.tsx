/**
 * Optimized Time Series Mesh Layer
 * High-performance version with lazy loading, caching, and progressive enhancement
 */

import { SimpleMeshLayer } from '@deck.gl/mesh-layers'
import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { generateGridMesh, type MeshGeometry } from '../utils/meshGenerator'
import { Play, Pause, SkipForward, SkipBack, Calendar, Loader2, Zap } from 'lucide-react'
import { getOptimizedLoader, BinaryTimeSeriesData, binaryToMap } from '../utils/optimizedDataLoader'
import { getSeasonalMeshColor } from '../utils/seasonalMeshColors'
import { getCachedTimeSeriesData } from '../utils/timeSeriesDataLoader'

interface OptimizedTimeSeriesProps {
  districtData: any[] // GeoJSON features
  dongBoundaries: any[] // Dong boundary features
  months?: string[] // Specific months to load
  visible?: boolean
  autoPlay?: boolean
  playSpeed?: number // Seconds per transition
  transitionDuration?: number // Animation duration in ms
  onMonthChange?: (month: string) => void
  salesHeightScale?: number
  initialResolution?: number // Start with low resolution for fast load
  targetResolution?: number // Target high resolution
  enableProgressive?: boolean // Enable progressive loading
  enablePreloading?: boolean // Enable adjacent month preloading
}

interface LoadingState {
  isLoading: boolean
  progress: number
  currentAction: string
}

interface PerformanceMetrics {
  lastLoadTime: number
  averageLoadTime: number
  cacheHitRate: number
  totalLoads: number
  cacheHits: number
}

/**
 * Optimized mesh layer with on-demand loading and caching
 */
export function OptimizedTimeSeriesMeshLayer({
  districtData,
  dongBoundaries,
  months,
  visible = true,
  autoPlay = false,
  playSpeed = 3,
  transitionDuration = 1500,
  onMonthChange,
  salesHeightScale = 100000000,
  initialResolution = 30,
  targetResolution = 90,
  enableProgressive = true,
  enablePreloading = false // Disabled by default to prevent background processing
}: OptimizedTimeSeriesProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(autoPlay)
  const [currentMesh, setCurrentMesh] = useState<MeshGeometry | null>(null)
  const [currentResolution, setCurrentResolution] = useState(initialResolution)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [animationProgress, setAnimationProgress] = useState(0)
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    progress: 0,
    currentAction: ''
  })
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    lastLoadTime: 0,
    averageLoadTime: 0,
    cacheHitRate: 0,
    totalLoads: 0,
    cacheHits: 0
  })
  
  const dataLoader = useRef(getOptimizedLoader())
  const meshCache = useRef<Map<string, MeshGeometry>>(new Map())
  const playIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const animationRef = useRef<number | undefined>(undefined)
  const transitionStartRef = useRef<number>(0)
  const prevMeshRef = useRef<MeshGeometry | null>(null)
  const targetMeshRef = useRef<MeshGeometry | null>(null)
  // Refs for previous/target meshes during transition
  const availableMonths = useMemo(() => 
    months || dataLoader.current.getAvailableMonths(),
    [months]
  )
  
  // Load data and mesh for current month
  const loadMonthData = useCallback(async (monthIndex: number) => {
    const month = availableMonths[monthIndex]
    if (!month) return

    // Notify parent about target month
    if (onMonthChange) {
      onMonthChange(month)
    }
    
    const startTime = performance.now()
    setLoadingState({
      isLoading: true,
      progress: 10,
      currentAction: `Loading ${month} data...`
    })
    
    try {
      // Load sales data with cache
      const binaryData = await dataLoader.current.loadMonth(month)
      if (!binaryData) {
        console.error(`No data for ${month}`)
        return
      }
      
      setLoadingState(prev => ({
        ...prev,
        progress: 40,
        currentAction: `Generating mesh for ${month}...`
      }))
      
      // Convert binary data back to Map for mesh generation
      const dongSalesMap = binaryToMap(binaryData)
      
      // Ensure target meshes exist at both current and target resolutions
      const currentResKey = `${month}_${currentResolution}`
      const targetResKey = `${month}_${targetResolution}`

      // Generate or reuse mesh at the CURRENT resolution for smooth transition
      let nextMeshAtCurrentRes = meshCache.current.get(currentResKey)
      if (!nextMeshAtCurrentRes) {
        setLoadingState(prev => ({
          ...prev,
          progress: 50,
          currentAction: 'Generating mesh (match resolution)...'
        }))
        nextMeshAtCurrentRes = generateGridMesh(districtData, {
          resolution: currentResolution,
          heightScale: 1,
          smoothing: true,
          dongBoundaries,
          dongSalesMap,
          salesHeightScale
        })
        meshCache.current.set(currentResKey, nextMeshAtCurrentRes)
      }

      // Begin smooth transition if possible (matching vertex layout)
      if (currentMesh && nextMeshAtCurrentRes && currentMesh.positions.length === nextMeshAtCurrentRes.positions.length) {
        prevMeshRef.current = currentMesh
        targetMeshRef.current = nextMeshAtCurrentRes
        startTransition()
      } else {
        // Fallback: direct swap
        setCurrentMesh(nextMeshAtCurrentRes)
      }

      // Optionally prepare high-res for the same month and promote after transition
      if (enableProgressive && targetResolution !== currentResolution) {
        setLoadingState(prev => ({
          ...prev,
          progress: 70,
          currentAction: 'Enhancing quality...'
        }))
        let highRes = meshCache.current.get(targetResKey)
        if (!highRes) {
          highRes = generateGridMesh(districtData, {
            resolution: targetResolution,
            heightScale: 1,
            smoothing: true,
            dongBoundaries,
            dongSalesMap,
            salesHeightScale
          })
          meshCache.current.set(targetResKey, highRes)
        }
        // Promote to high-res shortly after transition completes
        setTimeout(() => {
          setCurrentMesh(highRes!)
          setCurrentResolution(targetResolution)
        }, Math.max(transitionDuration - 100, 0))
      } else {
        // No progressive upgrade needed
        setCurrentResolution(currentResolution)
      }

      // Limit cache size to prevent memory issues
      if (meshCache.current.size > 10) {
        const firstKey = meshCache.current.keys().next().value
        if (firstKey) {
          meshCache.current.delete(firstKey)
        }
      }
      
      // Update performance metrics
      const loadTime = performance.now() - startTime
      const isCacheHit = loadTime < 100 // Cache hits are typically < 100ms
      
      setPerformanceMetrics(prev => {
        const totalLoads = prev.totalLoads + 1
        const cacheHits = prev.cacheHits + (isCacheHit ? 1 : 0)
        const avgTime = (prev.averageLoadTime * prev.totalLoads + loadTime) / totalLoads
        
        return {
          lastLoadTime: loadTime,
          averageLoadTime: avgTime,
          cacheHitRate: (cacheHits / totalLoads) * 100,
          totalLoads,
          cacheHits
        }
      })
      
      console.log(`[OptimizedLayer] Loaded ${month} in ${loadTime.toFixed(2)}ms (${isCacheHit ? 'cache hit' : 'generated'})`)
      
      // Preload adjacent months in background (only if explicitly enabled)
      if (enablePreloading) {
        dataLoader.current.preloadAdjacent(month, true) // Pass enabled flag
      }
      
      // Notify parent of month change
      if (onMonthChange) {
        onMonthChange(month)
      }
    } finally {
      setLoadingState({
        isLoading: false,
        progress: 100,
        currentAction: ''
      })
    }
  }, [
    availableMonths,
    districtData,
    dongBoundaries,
    salesHeightScale,
    initialResolution,
    targetResolution,
    enableProgressive,
    enablePreloading,
    onMonthChange,
    currentMesh,
    currentResolution,
    transitionDuration
  ])

  // Smooth easing for height interpolation
  const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

  // Start transition between prevMeshRef and targetMeshRef using in-place interpolation
  const startTransition = useCallback(() => {
    if (!prevMeshRef.current || !targetMeshRef.current) return
    if (isTransitioning) return

    const from = prevMeshRef.current.positions
    const to = targetMeshRef.current.positions
    if (from.length !== to.length) {
      setCurrentMesh(targetMeshRef.current)
      return
    }

    setIsTransitioning(true)
    setAnimationProgress(0)
    transitionStartRef.current = performance.now()

    const step = () => {
      const elapsed = performance.now() - transitionStartRef.current
      const p = Math.min(elapsed / transitionDuration, 1)
      const e = easeInOutCubic(p)

      setAnimationProgress(e)

      if (p < 1) {
        animationRef.current = requestAnimationFrame(step)
      } else {
        setCurrentMesh(targetMeshRef.current)
        setIsTransitioning(false)
        setAnimationProgress(0)
        prevMeshRef.current = null
        targetMeshRef.current = null
      }
    }

    animationRef.current = requestAnimationFrame(step)
  }, [isTransitioning, transitionDuration])
  
  // Load initial month
  useEffect(() => {
    loadMonthData(currentIndex)
  }, [currentIndex, loadMonthData])
  
  // Handle automatic playback
  useEffect(() => {
    if (isPlaying && !loadingState.isLoading) {
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
  }, [isPlaying, loadingState.isLoading, playSpeed])
  
  // Control handlers
  const handlePlayPause = () => {
    setIsPlaying(!isPlaying)
  }
  
  const handleNext = () => {
    const nextIndex = (currentIndex + 1) % availableMonths.length
    setCurrentIndex(nextIndex)
  }
  
  const handlePrevious = () => {
    const prevIndex = (currentIndex - 1 + availableMonths.length) % availableMonths.length
    setCurrentIndex(prevIndex)
  }
  
  const handleMonthSelect = (index: number) => {
    if (index !== currentIndex && !loadingState.isLoading) {
      setCurrentIndex(index)
    }
  }
  
  // Create optimized mesh layer
  const meshLayer = useMemo(() => {
    if (!visible || !currentMesh) {
      return null
    }
    
    // Create mesh object for deck.gl
    // Helper to compute interpolated positions per frame
    const computeInterpolatedPositions = () => {
      if (
        isTransitioning &&
        prevMeshRef.current &&
        targetMeshRef.current &&
        prevMeshRef.current.positions.length === currentMesh.positions.length &&
        targetMeshRef.current.positions.length === currentMesh.positions.length
      ) {
        const from = prevMeshRef.current.positions
        const to = targetMeshRef.current.positions
        const out = new Float32Array(from.length)
        for (let i = 0; i < from.length; i += 3) {
          out[i] = from[i]
          out[i + 1] = from[i + 1]
          out[i + 2] = from[i + 2] + (to[i + 2] - from[i + 2]) * animationProgress
        }
        return out
      }
      return currentMesh.positions
    }

    const meshObject = {
      attributes: {
        POSITION: {
          value: computeInterpolatedPositions(),
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
    
    // Compute seasonal color for current month (YYYYMM)
    const currentMonth = availableMonths[currentIndex]
    const seasonalColor = getSeasonalMeshColor(currentMonth)

    return new SimpleMeshLayer({
      id: 'optimized-time-series-mesh',
      data: [{ position: [centerX, centerY, 0] }],
      mesh: meshObject as any,
      sizeScale: 1,
      wireframe: currentResolution <= 30, // Wireframe for low-res
      getPosition: (d: any) => d.position,
      getColor: currentResolution > 30 
        ? seasonalColor         // Seasonal color for high-res frames
        : [255, 255, 0, 180],   // Yellow for low-res (loading indicator)
      material: {
        ambient: 0.8,
        diffuse: 1.0,
        shininess: 48,
        specularColor: [100, 200, 255]
      },
      pickable: false, // Disable picking for performance
      parameters: {
        depthTest: true,
        blend: false,
        cullFace: true
      },
      // Trigger re-evaluation during animation or resolution change
      updateTriggers: {
        mesh: [animationProgress, currentResolution],
        // Ensure color updates when the month index changes
        getColor: [currentIndex, currentResolution]
      }
    })
  }, [visible, currentMesh, currentResolution, districtData, isTransitioning, animationProgress, currentIndex, availableMonths])
  
  // Cleanup
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
  
  return {
    layer: meshLayer,
    controls: {
      isPlaying,
      currentIndex,
      isLoading: loadingState.isLoading,
      loadingProgress: loadingState.progress,
      currentAction: loadingState.currentAction,
      isTransitioning,
      currentResolution,
      performanceMetrics,
      handlePlayPause,
      handleNext,
      handlePrevious,
      handleMonthSelect
    }
  }
}

/**
 * Enhanced timeline controls with performance metrics
 */
export function OptimizedTimelineControls({
  months,
  controls,
  className = ''
}: {
  months: string[]
  controls: ReturnType<typeof OptimizedTimeSeriesMeshLayer>['controls']
  className?: string
}) {
  const { 
    isPlaying, 
    currentIndex, 
    isLoading,
    loadingProgress,
    currentAction,
    currentResolution,
    performanceMetrics,
    handlePlayPause, 
    handleNext, 
    handlePrevious,
    handleMonthSelect 
  } = controls
  
  const getMonthLabel = (month: string) => {
    const year = month.slice(0, 4)
    const monthNum = parseInt(month.slice(4))
    return `${year}년 ${monthNum}월`
  }
  
  return (
    <div className={`bg-black/90 backdrop-blur-md rounded-lg p-4 ${className}`}>
      {/* Performance metrics badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Zap className={`w-4 h-4 ${performanceMetrics.cacheHitRate > 50 ? 'text-green-400' : 'text-yellow-400'}`} />
          <span className="text-xs text-gray-400">
            {performanceMetrics.lastLoadTime.toFixed(0)}ms
            {performanceMetrics.cacheHitRate > 0 && 
              ` • ${performanceMetrics.cacheHitRate.toFixed(0)}% cached`}
          </span>
        </div>
        <div className="text-xs text-gray-400">
          Resolution: {currentResolution}×{currentResolution}
        </div>
      </div>
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              <span className="text-xs text-gray-400">{currentAction}</span>
            </div>
            <span className="text-xs text-gray-400">{loadingProgress}%</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-1">
            <div 
              className="bg-cyan-400 h-1 rounded-full transition-all duration-300"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Current month display */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-cyan-400" />
          <span className="text-white font-medium">
            {months[currentIndex] ? getMonthLabel(months[currentIndex]) : ''}
          </span>
        </div>
        <div className="text-sm text-gray-400">
          {currentIndex + 1} / {months.length}
        </div>
      </div>
      
      {/* Playback controls */}
      <div className="flex items-center justify-center space-x-4 mb-4">
        <button
          onClick={handlePrevious}
          disabled={isLoading}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
          title="Previous month"
        >
          <SkipBack className="w-5 h-5 text-gray-300" />
        </button>
        
        <button
          onClick={handlePlayPause}
          disabled={isLoading}
          className="p-3 bg-cyan-500/20 hover:bg-cyan-500/30 rounded-lg transition-colors disabled:opacity-50"
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
          disabled={isLoading}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
          title="Next month"
        >
          <SkipForward className="w-5 h-5 text-gray-300" />
        </button>
      </div>
      
      {/* Month selector grid */}
      <div className="grid grid-cols-6 gap-1">
        {months.map((month, index) => {
          const monthNum = parseInt(month.slice(4))
          return (
            <button
              key={month}
              onClick={() => handleMonthSelect(index)}
              disabled={isLoading}
              className={`
                px-2 py-1 text-xs rounded transition-all disabled:opacity-50
                ${index === currentIndex 
                  ? 'bg-cyan-500 text-white' 
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }
              `}
              title={getMonthLabel(month)}
            >
              {monthNum}월
            </button>
          )
        })}
      </div>
    </div>
  )
}
