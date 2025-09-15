"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import Map from "react-map-gl"
import { DeckGL } from "@deck.gl/react"
import { ScatterplotLayer, LineLayer, SolidPolygonLayer } from "@deck.gl/layers"
import type { MapViewState } from "@deck.gl/core"
import "mapbox-gl/dist/mapbox-gl.css"
import { precomputeBoundaryGrid } from "@/src/features/home/utils/boundaryProcessor"
import type { SeoulBoundaryData } from "@/src/features/home/utils/boundaryProcessor"
import { 
  generateParticlesOptimized, 
  generateInitialParticles, 
  createParticleBuffers, 
  animateParticlesSuperFast,
  generateSeoulParticlesWithBoundary,
  updateParticleColors,
  loadSeoulBoundaries,
  type ParticleData
} from "../utils/particleGenerator"
import { loadStaticParticles } from "../utils/particleOptimizer"
import { initializeParticleMemoryPool } from "@/src/shared/utils/mathHelpers"
import { useParticleCache } from "../hooks/useParticleCache"
import { useParticleWorker } from "../hooks/useParticleWorker"
import useParticleAnimations from "../hooks/useParticleAnimation"
import type { AnimationConfig } from "../hooks/useParticleAnimation"
// Removed AnimationControls import - moved to Hero component

// Mapbox access token
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

// 성능 설정 - 파티클 개수 1.5배 증가
const PERFORMANCE_CONFIG = {
  high: {
    particleCount: 15000,
    connectionCount: 300,
    fps: 60,
    glowLayers: 1,
  },
  medium: {
    particleCount: 10500,
    connectionCount: 150,
    fps: 30,
    glowLayers: 1,
  },
  low: {
    particleCount: 6000,
    connectionCount: 50,
    fps: 24,
    glowLayers: 1,
  },
}

// Enhanced performance detection with runtime monitoring
function detectPerformanceLevel(): keyof typeof PERFORMANCE_CONFIG {
  // GPU 성능 체크 (간단한 휴리스틱)
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
  
  if (!gl) return 'low'
  
  let score = 0
  
  // 모바일 디바이스 체크 (-20 points)
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  if (isMobile) score -= 20
  
  // 화면 크기와 픽셀 밀도 체크 (+10 to +30 points)
  const pixelRatio = window.devicePixelRatio || 1
  const screenSize = window.innerWidth * window.innerHeight * pixelRatio
  
  if (screenSize > 4000000) score += 30 // 4K 이상
  else if (screenSize > 2000000) score += 20 // FHD 이상
  else if (screenSize > 1000000) score += 10 // HD 이상
  
  // GPU 렌더러 정보 체크 (+0 to +25 points)
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
  if (debugInfo) {
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase()
    if (renderer.includes('nvidia') || renderer.includes('amd') || renderer.includes('radeon')) {
      score += 25 // 전용 GPU
    } else if (renderer.includes('intel') && !renderer.includes('hd')) {
      score += 15 // 최신 Intel GPU
    } else if (renderer.includes('apple') || renderer.includes('m1') || renderer.includes('m2')) {
      score += 20 // Apple Silicon
    }
  }
  
  // CPU 코어 수 체크 (+0 to +15 points)
  const cores = navigator.hardwareConcurrency || 1
  if (cores >= 8) score += 15
  else if (cores >= 4) score += 10
  else if (cores >= 2) score += 5
  
  // 메모리 정보 (Chrome only) (+0 to +10 points)
  if ('memory' in performance) {
    const memory = (performance as any).memory
    if (memory.jsHeapSizeLimit > 4000000000) score += 10 // >4GB
    else if (memory.jsHeapSizeLimit > 2000000000) score += 5 // >2GB
  }
  
  // Score to performance level mapping
  if (score >= 50) return 'high'
  if (score >= 20) return 'medium'
  return 'low'
}

// Runtime performance monitoring
class PerformanceMonitor {
  private frameCount = 0
  private lastTime = performance.now()
  private frameTimes: number[] = []
  private readonly maxSamples = 60
  
  update(): { fps: number; frameTime: number; shouldDowngrade: boolean } {
    const now = performance.now()
    const frameTime = now - this.lastTime
    this.lastTime = now
    this.frameCount++
    
    this.frameTimes.push(frameTime)
    if (this.frameTimes.length > this.maxSamples) {
      this.frameTimes.shift()
    }
    
    // Calculate average FPS over last 60 frames
    const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length
    const fps = 1000 / avgFrameTime
    
    // Check if we should downgrade performance (FPS consistently below 20)
    const shouldDowngrade = this.frameTimes.length >= 30 && 
      this.frameTimes.slice(-30).every(ft => 1000 / ft < 20)
    
    return { fps, frameTime: avgFrameTime, shouldDowngrade }
  }
  
  reset() {
    this.frameCount = 0
    this.frameTimes = []
    this.lastTime = performance.now()
  }
}


interface SeoulMapOptimizedProps {
  animationConfig: AnimationConfig
  onAnimationConfigChange: (changes: Partial<AnimationConfig>) => void
  mapStyle: string
}

export function SeoulMapOptimized({
  animationConfig,
  onAnimationConfigChange,
  mapStyle
}: SeoulMapOptimizedProps) {
  // 성능 레벨 감지 및 적응형 관리
  const [performanceLevel, setPerformanceLevel] = useState<keyof typeof PERFORMANCE_CONFIG>(() => detectPerformanceLevel())
  const [currentFPS, setCurrentFPS] = useState(0)
  const performanceMonitorRef = useRef<PerformanceMonitor>(new PerformanceMonitor())
  const adaptiveConfigRef = useRef(PERFORMANCE_CONFIG[performanceLevel])
  const config = adaptiveConfigRef.current
  
  // 메모리 풀 사전 초기화 (컴포넌트 마운트시 즉시 실행)
  useEffect(() => {
    initializeParticleMemoryPool(config.particleCount)
    console.log('[SeoulMap] Memory pool pre-initialized for', config.particleCount, 'particles')
  }, [config.particleCount])
  
  // Seoul boundary data
  const [boundaryData, setBoundaryData] = useState<SeoulBoundaryData | null>(null)
  const [particles, setParticles] = useState<ParticleData[]>([])
  const [animatedData, setAnimatedData] = useState<any[]>([])
  const [connections, setConnections] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingPhase, setLoadingPhase] = useState('Loading boundaries...')
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const maxRetries = 3
  
  // 애니메이션 제어
  const animationFrameRef = useRef<number | undefined>(undefined)
  const lastFrameTimeRef = useRef<number>(0)
  const frameInterval = 1000 / config.fps
  
  // 자동 회전 제어
  const rotationRef = useRef(0)
  
  // Amplitude animation refs for initial effect
  const amplitudeAnimationRef = useRef<number>(30.0) // Start at 2x higher amplitude for very dramatic scatter
  const animationStartTimeRef = useRef<number | null>(null)
  const animationDurationRef = useRef<number>(20000) // 20 seconds animation for smoother convergence from greater distance
  
  // Object pooling for animation optimization
  const animationPoolRef = useRef<{
    positions: Float32Array
    colors: Uint8Array
    sizes: Float32Array
    reusableObjects: Array<{position: [number, number], color: [number, number, number], size: number, opacity: number}>
  }>({
    positions: new Float32Array(0),
    colors: new Uint8Array(0),
    sizes: new Float32Array(0),
    reusableObjects: []
  })
  
  // Batch processing state
  const batchStateRef = useRef<{
    needsUpdate: boolean
    lastBatchTime: number
    batchInterval: number
  }>({
    needsUpdate: true,
    lastBatchTime: 0,
    batchInterval: 16 // ~60fps
  })
  
  // 초기 뷰 상태 - more top-down view for less narrow feeling
  const [viewState, setViewState] = useState<MapViewState>({
    longitude: 126.978,
    latitude: 37.5665,
    zoom: 10.8, // Adjusted zoom level after removing scale transform
    pitch: performanceLevel === 'high' ? 55 : 45, // Adjusted pitch angles
    bearing: 15, // Slight rotation for visual interest
  })

  // Animation configuration now comes from props

  const { animationState } = useParticleAnimations(
    particles,
    animationConfig
  )
  
  // 초고속 배치 애니메이션 함수 (4배 빠른 성능 + 완전한 애니메이션 효과)
  const animateParticlesBatch = useCallback((particles: ParticleData[], time: number) => {
    // 현재 amplitude 값을 사용하여 초고속 애니메이션 실행
    const currentAmplitude = amplitudeAnimationRef.current * animationConfig.waveAmplitude
    
    return animateParticlesSuperFast(
      particles,
      time,
      animationConfig.waveEnabled,
      animationConfig.pulseEnabled,
      animationConfig.fireflyEnabled,
      currentAmplitude,
      animationConfig.colorCycleEnabled,
      animationConfig.colorCycleSpeed,
      animationConfig.orbitalEnabled,
      animationConfig.orbitalSpeed,
      animationConfig.orbitalRadius,
      animationConfig.waveSpeed,
      animationConfig.pulseSpeed,
      animationConfig.fireflySpeed
    )
  }, [animationConfig])

  // Map style now comes from props

  // Animation config and map style changes handled by parent

  // Particle cache hook
  const { 
    isReady: cacheReady, 
    loadParticles: loadCachedParticles, 
    saveParticles: saveCachedParticles 
  } = useParticleCache()
  
  // Particle worker hook
  const {
    generateParticles: generateWithWorker,
    progress: workerProgress,
    isGenerating: workerGenerating
  } = useParticleWorker()

  // Enhanced data loading with optimizations
  useEffect(() => {
    // Initialize amplitude animation immediately (before loading)
    amplitudeAnimationRef.current = 30.0 // Start with 2x dramatic scatter
    animationStartTimeRef.current = Date.now() // Animation starts now
    
    async function loadDataOptimized(): Promise<void> {
      try {
        setIsLoading(true)
        setError(null)
        setLoadingProgress(0)
        
        // Step 1: Show initial particles immediately with scatter effect
        const initialParticles = generateInitialParticles(animationConfig.colorTheme)
        setParticles(initialParticles)
        // Apply initial scatter using animateParticlesBatch
        const initialScatteredData = animateParticlesBatch(initialParticles, 0)
        setAnimatedData(initialScatteredData)
        setLoadingPhase('Loading optimized data...')
        setLoadingProgress(5)
        
        // Step 2: Try static files first (fastest)
        try {
          const quality = config.particleCount >= 12000 ? 'high' : 
                         config.particleCount >= 8000 ? 'medium' : 'low'
          const staticParticles = await loadStaticParticles(quality, animationConfig.colorTheme)
          
          setLoadingPhase('Loaded from static data!')
          setLoadingProgress(100)
          setParticles(staticParticles)
          // Apply scatter effect to static particles
          const staticScatteredData = animateParticlesBatch(staticParticles, 0)
          setAnimatedData(staticScatteredData)
          setIsLoading(false)
          return
        } catch (staticError) {
          console.log('Static loading failed, trying cache...', staticError)
        }
        
        // Step 3: Try to load from IndexedDB cache (fast)
        if (cacheReady) {
          const cached = await loadCachedParticles(config.particleCount, animationConfig.colorTheme)
          if (cached) {
            setLoadingPhase('Loaded from cache!')
            setLoadingProgress(100)
            setParticles(cached)
            // Apply scatter effect to cached particles
            const cachedScatteredData = animateParticlesBatch(cached, 0)
            setAnimatedData(cachedScatteredData)
            setIsLoading(false)
            return
          }
        }
        
        // Step 4: Load and pre-compute boundary grid (fallback)
        setLoadingPhase('Optimizing boundaries...')
        const boundaries = await loadSeoulBoundaries()
        setBoundaryData(boundaries)
        setLoadingProgress(20)
        
        const grid = await precomputeBoundaryGrid(boundaries)
        setLoadingProgress(30)
        
        // Step 5: Generate particles with optimized algorithm (fallback)
        setLoadingPhase('Generating particles...')
        const particlesInSeoul = await generateParticlesOptimized(
          config.particleCount,
          grid,
          animationConfig.colorTheme,
          (progress) => {
            const overallProgress = 30 + (progress * 0.6)
            setLoadingProgress(overallProgress)
            
            if (progress < 25) {
              setLoadingPhase('Analyzing districts...')
            } else if (progress < 50) {
              setLoadingPhase('Creating density map...')
            } else if (progress < 75) {
              setLoadingPhase('Optimizing layout...')
            } else {
              setLoadingPhase('Finalizing...')
            }
          }
        )
        
        // Step 5: Create optimized buffers for rendering
        const buffers = createParticleBuffers(particlesInSeoul)
        
        // Step 6: Save to cache for next time
        if (cacheReady) {
          saveCachedParticles(particlesInSeoul, animationConfig.colorTheme, buffers)
        }
        
        setLoadingPhase('Ready!')
        setLoadingProgress(100)
        setParticles(particlesInSeoul)
        // Apply scatter effect to generated particles
        const generatedScatteredData = animateParticlesBatch(particlesInSeoul, 0)
        setAnimatedData(generatedScatteredData)
        
      } catch (error) {
        console.error('Optimized data loading failed:', error)
        setError('Using fallback particle generation')
        
        // Fallback to original method if optimizations fail
        try {
          const boundaries = await loadSeoulBoundaries()
          const fallbackParticles = await generateSeoulParticlesWithBoundary(
            config.particleCount,
            boundaries,
            animationConfig.colorTheme
          )
          setParticles(fallbackParticles)
          // Apply scatter effect to fallback particles
          const fallbackScatteredData = animateParticlesBatch(fallbackParticles, 0)
          setAnimatedData(fallbackScatteredData)
          setLoadingProgress(100)
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError)
          setError('Unable to generate particles')
        }
      } finally {
        setIsLoading(false)
        // Amplitude animation already initialized at the beginning
      }
    }
    
    // Start the loading process
    loadDataOptimized()
  }, [config.particleCount, maxRetries, cacheReady, loadCachedParticles, saveCachedParticles, animationConfig.colorTheme])

  // Separate effect for color theme changes - only update colors, don't reload data
  const previousColorThemeRef = useRef(animationConfig.colorTheme)
  useEffect(() => {
    // Only update if color theme actually changed (not on every render)
    if (previousColorThemeRef.current !== animationConfig.colorTheme && 
        particles.length > 0) {
      const updatedParticles = updateParticleColors(particles, animationConfig.colorTheme)
      setParticles(updatedParticles)
      previousColorThemeRef.current = animationConfig.colorTheme
      // Note: animatedData will be updated automatically by the animation loop
      // which will pick up the new particles with updated colors
      console.log(`[ColorTheme] Updated particle colors to ${animationConfig.colorTheme} theme`)
    }
  }, [animationConfig.colorTheme, particles])

  // Connection pooling for optimized line generation
  const connectionPoolRef = useRef<{
    pool: Array<{
      sourcePosition: [number, number],
      targetPosition: [number, number],
      color: [number, number, number, number]
    }>
    poolIndex: number
  }>({
    pool: [],
    poolIndex: 0
  })
  
  // 연결선 생성 함수 (최적화된 오브젝트 풀링 포함)
  const createConnectionsOptimized = useCallback(
    (particles: any[], maxConnections: number) => {
      const connectionPool = connectionPoolRef.current
      const connections: any[] = []
      const step = Math.max(1, Math.floor(particles.length / 100))
      
      // Ensure pool is large enough
      while (connectionPool.pool.length < maxConnections) {
        connectionPool.pool.push({
          sourcePosition: [0, 0] as [number, number],
          targetPosition: [0, 0] as [number, number],
          color: [0, 0, 0, 50] as [number, number, number, number]
        })
      }
      
      connectionPool.poolIndex = 0
      
      for (let i = 0; i < particles.length && connections.length < maxConnections; i += step) {
        for (let j = i + step; j < Math.min(i + step * 5, particles.length) && connections.length < maxConnections; j += step) {
          const dx = particles[i].position[0] - particles[j].position[0]
          const dy = particles[i].position[1] - particles[j].position[1]
          const distanceSq = dx * dx + dy * dy // 제곱근 계산 회피
          
          if (distanceSq < 0.0001) { // 0.01^2
            // Reuse pooled object
            const connection = connectionPool.pool[connectionPool.poolIndex++]
            
            connection.sourcePosition[0] = particles[i].position[0]
            connection.sourcePosition[1] = particles[i].position[1]
            connection.targetPosition[0] = particles[j].position[0]
            connection.targetPosition[1] = particles[j].position[1]
            
            // Optimized color averaging using bit operations
            connection.color[0] = (particles[i].color[0] + particles[j].color[0]) >> 1
            connection.color[1] = (particles[i].color[1] + particles[j].color[1]) >> 1
            connection.color[2] = (particles[i].color[2] + particles[j].color[2]) >> 1
            connection.color[3] = 50
            
            connections.push(connection)
          }
        }
      }
      
      return connections
    },
    []
  )

  // Enhanced animation loop with adaptive performance and initialization optimization
  useEffect(() => {
    if (particles.length === 0) {
      return
    }
    
    let frameCount = 0
    let performanceCheckInterval = 0
    const monitor = performanceMonitorRef.current
    
    // 초기화 최적화 변수들
    const initializationPhaseFrames = 90 // 첫 90프레임 (약 1.5초)
    const initFrameRateLimit = 30 // 초기화 중 30fps로 제한
    const initFrameInterval = 1000 / initFrameRateLimit
    
    const animate = (currentTime: number) => {
      try {
        // Performance monitoring (every 10 frames)
        if (frameCount % 10 === 0) {
          const { fps, shouldDowngrade } = monitor.update()
          setCurrentFPS(Math.round(fps))
          
          // Adaptive performance scaling every 60 frames
          if (performanceCheckInterval++ % 60 === 0) {
            if (shouldDowngrade && performanceLevel !== 'low') {
              // Downgrade performance level
              const newLevel = performanceLevel === 'high' ? 'medium' : 'low'
              setPerformanceLevel(newLevel)
              adaptiveConfigRef.current = PERFORMANCE_CONFIG[newLevel]
              console.log(`Performance downgraded to ${newLevel} due to low FPS`)
            } else if (fps > 50 && performanceLevel === 'medium') {
              // Upgrade back to high if performance improves
              setPerformanceLevel('high')
              adaptiveConfigRef.current = PERFORMANCE_CONFIG['high']
              console.log('Performance upgraded to high')
            }
          }
        }
      
      // Dynamic FPS limiting with initialization optimization
      const isInitPhase = frameCount < initializationPhaseFrames
      const targetInterval = isInitPhase ? initFrameInterval : 
                           (adaptiveConfigRef.current.fps > 0 ? 1000 / adaptiveConfigRef.current.fps : frameInterval)
      const batchState = batchStateRef.current
      
        // Batch update strategy with initialization optimization
        const shouldUpdate = currentTime - lastFrameTimeRef.current >= targetInterval
        const shouldBatch = currentTime - batchState.lastBatchTime >= batchState.batchInterval || batchState.needsUpdate
        
        if (shouldUpdate && shouldBatch) {
          // Update amplitude animation
          if (animationStartTimeRef.current !== null) {
            const now = Date.now()
            const elapsed = now - animationStartTimeRef.current
            const progress = Math.min(elapsed / animationDurationRef.current, 1.0)
            
            // Use cubic easing out for smooth decay
            const easedProgress = 1.0 - Math.pow(1.0 - progress, 3)
            const currentAmplitude = 30.0 - (29.8 * easedProgress) // From 30.0 to 0.2
            
            amplitudeAnimationRef.current = currentAmplitude
            
            // Animation complete but keep minimum amplitude for continuous movement
            if (progress >= 1.0) {
              amplitudeAnimationRef.current = 0.2
              console.log('Amplitude animation complete, maintaining minimum amplitude of 0.2 for continuous movement')
            }
          }
          
          // Use optimized batch animation with time in seconds
          const timeInSeconds = animationState.time * 0.001 // Convert ms to seconds
          const updated = animateParticlesBatch(particles, timeInSeconds)
          setAnimatedData(updated)
          
          // Update batch timing
          batchState.lastBatchTime = currentTime
          batchState.needsUpdate = false
          
          // 연결선 업데이트 (초기화 단계에서는 빈도 낮춤)
          const baseConnectionUpdateFreq = adaptiveConfigRef.current.fps > 30 ? 10 : 20
          const connectionUpdateFreq = isInitPhase ? baseConnectionUpdateFreq * 3 : baseConnectionUpdateFreq
          if (frameCount % connectionUpdateFreq === 0 && adaptiveConfigRef.current.connectionCount > 0) {
            const nearbyParticles = updated.slice(0, Math.min(100, updated.length))
            setConnections(createConnectionsOptimized(nearbyParticles, adaptiveConfigRef.current.connectionCount))
          }
          
          // 자동 회전 (초기화 단계에서는 빈도 낮춤)
          const baseRotationFreq = adaptiveConfigRef.current.fps > 30 ? 2 : 4
          const rotationFreq = isInitPhase ? baseRotationFreq * 2 : baseRotationFreq
          if (animationConfig.autoRotateEnabled && frameCount % rotationFreq === 0) {
            rotationRef.current += animationConfig.autoRotateSpeed
            setViewState((prev: any) => ({
              ...prev,
              bearing: rotationRef.current % 360
            }))
          }
          
          // Breathing effect - subtle zoom animation (지도가 숨쉬는 효과)
          const breathingSpeed = 0.3 // Slow breathing rate
          const breathingAmplitude = 0.15 // Subtle zoom change
          const baseZoom = 10.8 // Updated to match new initial zoom
          const breathingOffset = Math.sin(timeInSeconds * breathingSpeed) * breathingAmplitude
          const newZoom = baseZoom + breathingOffset
          
          // Apply breathing effect every few frames for smooth animation
          if (frameCount % 2 === 0) {
            setViewState((prev: any) => ({
              ...prev,
              zoom: newZoom
            }))
          }
          
          lastFrameTimeRef.current = currentTime
          frameCount++
        }
      } catch (animationError) {
        console.error('Animation frame error:', animationError)
        // Downgrade performance on animation errors
        if (performanceLevel !== 'low') {
          const newLevel = performanceLevel === 'high' ? 'medium' : 'low'
          setPerformanceLevel(newLevel)
          adaptiveConfigRef.current = PERFORMANCE_CONFIG[newLevel]
          console.log(`Performance downgraded to ${newLevel} due to animation error`)
        }
      }
      
      animationFrameRef.current = requestAnimationFrame(animate)
    }
    
    // Reset performance monitor when starting new animation
    monitor.reset()
    animationFrameRef.current = requestAnimationFrame(animate)
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = undefined
      }
      
      // Clear animation pools and state when layer changes
      animationPoolRef.current = {
        positions: new Float32Array(0),
        colors: new Uint8Array(0),
        sizes: new Float32Array(0),
        reusableObjects: []
      }
      
      batchStateRef.current = {
        needsUpdate: true,
        lastBatchTime: 0,
        batchInterval: 16
      }
      
      // Reset performance monitor
      performanceMonitorRef.current.reset()
    }
  }, [particles, performanceLevel, animationConfig.autoRotateEnabled, animationConfig.autoRotateSpeed, createConnectionsOptimized, animateParticlesBatch, animationState.time])

  // 레이어 생성 (성능 레벨에 따라 조정)
  const layers = useMemo(() => {
    const baseLayers = []
    
    // Dark overlay layer - renders below particles but above map (controlled by blackBackgroundEnabled)
    if (animationConfig.blackBackgroundEnabled) {
      baseLayers.push(
        new SolidPolygonLayer({
          id: "dark-overlay",
          data: [[
            [-180, -90],
            [180, -90],
            [180, 90],
            [-180, 90],
            [-180, -90]
          ]],
          getPolygon: d => d,
          getFillColor: [0, 0, 0, 128], // 50% black overlay
          pickable: false,
          parameters: {
            depthTest: false,
            blend: true,
            blendFunc: [770, 771], // Multiplicative blending
          },
        })
      )
    }
    
    // 연결선 레이어 (중간 이상 성능에서만)
    if (config.connectionCount > 0) {
      baseLayers.push(
        new LineLayer({
          id: "connection-layer",
          data: connections,
          pickable: false,
          getSourcePosition: (d: any) => d.sourcePosition,
          getTargetPosition: (d: any) => d.targetPosition,
          getColor: (d: any) => d.color,
          getWidth: 1,
          opacity: 0.3,
          parameters: {
            depthTest: false,
            blend: true,
            blendFunc: [770, 1],
          },
        })
      )
    }
    
    // 메인 파티클 레이어
    baseLayers.push(
      new ScatterplotLayer({
        id: "particle-layer",
        data: animatedData,
        pickable: false,
        opacity: 0.9, // Increased opacity for better visibility
        stroked: false,
        filled: true,
        radiusScale: 1,
        radiusMinPixels: 2, // Increased for better visibility in pure black mode
        radiusMaxPixels: performanceLevel === 'high' ? 8 : 6,
        getPosition: (d: any) => d.position,
        getRadius: (d: any) => d.size,
        getFillColor: (d: any) => {
          const color = d.color
          return [color[0], color[1], color[2], 255] // Increased alpha for better visibility
        },
        updateTriggers: {
          getPosition: animatedData,
          getRadius: animatedData,
          getFillColor: animatedData,
        },
        parameters: {
          depthTest: false,
          blend: true,
          blendFunc: [770, 1],
        },
      })
    )
    
    // 글로우 레이어 (고성능 모드에서만)
    if (config.glowLayers > 0) {
      baseLayers.push(
        new ScatterplotLayer({
          id: "particle-glow",
          data: animatedData.filter((_, i) => i % 3 === 0),
          pickable: false,
          opacity: 0.1,
          stroked: false,
          filled: true,
          radiusScale: 1.5,
          radiusMinPixels: 1,
          radiusMaxPixels: 8,
          getPosition: (d: any) => d.position,
          getRadius: (d: any) => d.size * 1.2,
          getFillColor: (d: any) => [d.color[0], d.color[1], d.color[2], 40],
          parameters: {
            depthTest: false,
            blend: true,
            blendFunc: [770, 1],
          },
        })
      )
    }
    
    return baseLayers
  }, [animatedData, connections, config.connectionCount, config.glowLayers, performanceLevel, boundaryData, animationConfig.blackBackgroundEnabled])

  // 뷰 상태 변경 핸들러 (디바운싱 적용)
  const handleViewStateChange = useCallback(({ viewState }: any) => {
    setViewState(viewState)
  }, [])

  // Show loading state with progress
  if (isLoading) {
    // Calculate particles for loading gauge (30 particles total)
    const particleCount = 30
    const filledParticles = Math.floor((loadingProgress / 100) * particleCount)
    
    return (
      <div className="relative w-full h-full flex items-center justify-center bg-[#000014]">
        <div className="text-center text-white/60 max-w-lg">
          
          {/* Particle-based loading gauge */}
          <div className="relative w-full max-w-sm mx-auto mb-8">
            <div className="flex items-center justify-center gap-1 flex-wrap">
              {Array.from({ length: particleCount }).map((_, index) => {
                const isFilled = index < filledParticles
                const isCurrentlyFilling = index === filledParticles - 1
                const delay = index * 30 // Stagger animation
                
                // Consistent particle color throughout loading
                const getParticleColor = () => {
                  if (!isFilled) return 'bg-white/5'
                  return 'bg-gradient-to-br from-blue-400/60 to-purple-400/60'
                }
                
                return (
                  <div
                    key={index}
                    className={`
                      w-2 h-2 rounded-full transition-all duration-500
                      ${getParticleColor()}
                      ${isFilled ? 'scale-100' : 'scale-75'}
                      ${isCurrentlyFilling ? 'animate-pulse' : ''}
                    `}
                    style={{
                      transitionDelay: isFilled ? `${delay}ms` : '0ms',
                      boxShadow: isFilled 
                        ? '0 0 8px rgba(96, 165, 250, 0.4)'
                        : 'none',
                      animation: isCurrentlyFilling 
                        ? `pulse 1s infinite, float ${2 + Math.random() * 2}s ease-in-out infinite`
                        : isFilled 
                        ? `float ${2 + Math.random() * 2}s ease-in-out infinite`
                        : 'none',
                      animationDelay: `${Math.random() * 2}s`
                    }}
                  />
                )
              })}
            </div>
            
            {/* Progress percentage */}
            <div className="mt-4 text-center">
              <div className="text-xs text-white/30 font-mono">{Math.round(loadingProgress)}%</div>
            </div>
          </div>
          
          {/* Loading phase text (smaller, subtle) */}
          <div className="text-xs text-white/30 h-4">
            {loadingPhase !== 'Loading boundaries...' && loadingPhase !== 'Ready!' && (
              <span className="animate-pulse">{loadingPhase}</span>
            )}
          </div>
          
          {/* Error message and retry button */}
          {error && (
            <div className="mt-4 p-3 bg-red-900/30 border border-red-500/30 rounded text-center">
              <div className="text-xs text-red-200 mb-2">{error}</div>
              <button
                onClick={() => {
                  setError(null)
                  setRetryCount(0)
                  setIsLoading(true)
                  // Trigger reload by changing a dependency
                  setLoadingPhase('Retrying...')
                }}
                className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded transition-colors"
              >
                Retry
              </button>
            </div>
          )}
          
          {/* Retry indicator */}
          {retryCount > 0 && !error && (
            <div className="text-xs text-yellow-300 mt-2">
              Retry attempt {retryCount}/{maxRetries}
            </div>
          )}
        </div>
        
        {/* Add keyframe animations */}
        <style jsx>{`
          @keyframes float {
            0%, 100% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-3px);
            }
          }
          
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full" id="seoul-map-container" style={{ marginTop: '-10px' }}>
      {/* Particle layer rendering */}
      <DeckGL
        viewState={viewState}
        controller={false}  // Disable user interaction
        layers={layers}
        parameters={{
          // Parameters for rendering optimization
        }}
        // 성능 최적화 옵션
        getCursor={() => 'default'}  // Default cursor (no grab)
        getTooltip={() => null}
      >
        {/* Render Map with fixed dark theme */}
        {typeof window !== 'undefined' && MAPBOX_TOKEN && (
          <Map
          mapboxAccessToken={MAPBOX_TOKEN}
          mapStyle={mapStyle}
          style={{ width: '100%', height: '100%' }}
          interactive={false}  // Disable Mapbox interaction
          reuseMaps={true}
          preserveDrawingBuffer={false}
          attributionControl={false}
          onError={(evt: any) => {
            console.error('Map error in particle layer:', evt)
          }}
          onLoad={(evt: any) => {
            const map = evt.target
            
            // Ensure the map has initialized properly
            if (!map || !map.getStyle) {
              console.warn('Map not properly initialized')
              return
            }
            
            try {
              // 더 어둡게 스타일 조정
              const layers = map.getStyle()?.layers
              layers?.forEach((layer: any) => {
                if (layer.type === 'symbol') {
                  map.setLayoutProperty(layer.id, 'visibility', 'none')
                }
                if (layer.type === 'line') {
                  map.setPaintProperty(layer.id, 'line-opacity', 0.05) // 더 어둡게
                }
                if (layer.type === 'fill') {
                  map.setPaintProperty(layer.id, 'fill-opacity', 0.3) // 건물 등을 더 어둡게
                }
                if (layer.type === 'background') {
                  map.setPaintProperty(layer.id, 'background-color', '#000000') // 순수 검은색 배경
                }
              })
            } catch (error) {
              console.warn('Map styling failed:', error)
            }
          }}
        />
        )}
        
      </DeckGL>

      {/* 간단한 그라데이션 오버레이 */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 50%, transparent 40%, rgba(0, 0, 20, 0.4) 100%)`,
        }}
      />
      
    </div>
  )
}