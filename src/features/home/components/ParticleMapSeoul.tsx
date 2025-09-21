"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { Map } from "react-map-gl"
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
  generateDamienHirstPattern,
  interpolateParticlePatterns,
  interpolateParticlePatternWithScatter,
  generateUnifiedParticles,
  interpolateUnifiedParticles,
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
  displayMode?: 'circular' | 'transitioning' | 'map'
  onDisplayModeChange?: (mode: 'circular' | 'transitioning' | 'map') => void
}

export function SeoulMapOptimized({
  animationConfig,
  onAnimationConfigChange,
  mapStyle,
  displayMode: propDisplayMode = 'circular',
  onDisplayModeChange
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

  // Display mode state
  const [displayMode, setDisplayMode] = useState<'circular' | 'transitioning' | 'map'>(propDisplayMode)
  const [unifiedParticles, setUnifiedParticles] = useState<ParticleData[]>([]) // Unified particles with both positions
  const transitionStartTimeRef = useRef<number | null>(null)
  const transitionDurationRef = useRef<number>(10000) // 10 seconds transition for slower convergence
  const scatterOffsetsRef = useRef<{ x: number; y: number }[] | null>(null)
  
  // 애니메이션 제어
  const animationFrameRef = useRef<number | undefined>(undefined)
  const lastFrameTimeRef = useRef<number>(0)
  const frameInterval = 1000 / config.fps
  
  // 자동 회전 제어
  const rotationRef = useRef(0)

  // Amplitude animation refs for initial effect
  const amplitudeAnimationRef = useRef<number>(0.2) // Start with minimal amplitude for circular pattern
  const animationStartTimeRef = useRef<number | null>(null)
  const animationDurationRef = useRef<number>(10000) // 10 seconds animation for smoother convergence from greater distance
  
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
  
  // 초기 뷰 상태 - top-down view for circular mode, angled for map mode
  const [viewState, setViewState] = useState<MapViewState>({
    longitude: 126.978,
    latitude: 37.5665,
    zoom: displayMode === 'circular' ? 11.2 : 10.8, // Slightly zoomed out for circular
    pitch: displayMode === 'circular' ? 0 : (performanceLevel === 'high' ? 55 : 45), // Top-down for circular
    bearing: displayMode === 'circular' ? 0 : 15, // True north for circular
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

  // Handle display mode change
  useEffect(() => {
    if (propDisplayMode !== displayMode) {
      if (propDisplayMode === 'transitioning' && displayMode === 'circular') {
        // Start transition from circular to map
        // Make sure unified particles are loaded before transitioning
        if (unifiedParticles.length > 0) {
          setDisplayMode('transitioning')
          transitionStartTimeRef.current = Date.now()
          amplitudeAnimationRef.current = 0.2 // Start from low amplitude for circular
          animationStartTimeRef.current = Date.now()
          animationDurationRef.current = 10000 // 10 seconds for slower transition
        } else {
          console.warn('Unified particles not ready for transition, waiting...')
          // Will retry when unifiedParticles are loaded
        }
      } else if (propDisplayMode === 'map' && displayMode === 'transitioning') {
        // Transition complete - switch to map positions
        setDisplayMode('map')
        // Set particles to use map positions
        if (unifiedParticles.length > 0) {
          const mapPositionedParticles = unifiedParticles.map(p => ({
            ...p,
            x: p.mapPos![0],
            y: p.mapPos![1],
            position: p.mapPos  // Update position array to match x,y coordinates
          }))
          setParticles(mapPositionedParticles)
        }
        amplitudeAnimationRef.current = 0.2 // Maintain small amplitude for continuous movement
      } else {
        setDisplayMode(propDisplayMode)
      }
    }
  }, [propDisplayMode, displayMode, unifiedParticles])

  // Retry transition when unified particles are loaded
  useEffect(() => {
    if (propDisplayMode === 'transitioning' && displayMode === 'circular' && unifiedParticles.length > 0) {
      console.log('Unified particles loaded, starting transition now')
      setDisplayMode('transitioning')
      transitionStartTimeRef.current = Date.now()
      amplitudeAnimationRef.current = 0.2
      animationStartTimeRef.current = Date.now()
      animationDurationRef.current = 8000
    }
  }, [unifiedParticles, propDisplayMode, displayMode])

  // Update camera view when display mode changes
  useEffect(() => {
    if (displayMode === 'circular') {
      // Top-down view for circular pattern (garden view from true north)
      setViewState(prev => ({
        ...prev,
        zoom: 11.2,
        pitch: 0,  // Perfect top-down view
        bearing: 0 // True north orientation
      }))
    } else if (displayMode === 'transitioning') {
      // Enhanced camera animation during transition
      const startTime = Date.now()
      const duration = 10000 // Match extended transition duration

      const animateCamera = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)

        // Easing function for smooth camera movement
        const easeInOutCubic = (t: number) => {
          return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
        }

        let zoom: number, pitch: number, bearing: number

        if (progress < 0.15) {
          // Phase 1: Keep camera stable during initial explosion
          zoom = 11.2
          pitch = 0
          bearing = 0

        } else if (progress < 0.6) {
          // Phase 2: Slow gradual camera movement during scatter
          const cameraProgress = (progress - 0.15) / 0.45  // 45% of total time (3.6 seconds)
          const eased = easeInOutCubic(cameraProgress)     // Smooth acceleration/deceleration

          const targetPitch = performanceLevel === 'high' ? 55 : 45

          zoom = 11.2 + (10.8 - 11.2) * eased     // Gradual zoom adjustment
          pitch = 0 + targetPitch * eased         // Gradual pitch adjustment
          bearing = 0 + 15 * eased                // Gradual rotation

        } else {
          // Phase 3: Camera fixed, particles converging to Seoul
          const targetPitch = performanceLevel === 'high' ? 55 : 45

          zoom = 10.8
          pitch = targetPitch
          bearing = 15
        }

        setViewState(prev => ({
          ...prev,
          zoom,
          pitch,
          bearing
        }))

        if (progress < 1) {
          requestAnimationFrame(animateCamera)
        }
      }

      animateCamera()
    } else if (displayMode === 'map') {
      // Angled view for map mode
      setViewState(prev => ({
        ...prev,
        zoom: 10.8,
        pitch: performanceLevel === 'high' ? 55 : 45,
        bearing: 15
      }))
    }
  }, [displayMode, performanceLevel])

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
    // Skip if particles are already loaded - prevent re-initialization
    if (unifiedParticles.length > 0) {
      console.log('Particles already loaded, skipping re-initialization')
      return
    }

    // Initialize amplitude animation - always start with minimal movement
    amplitudeAnimationRef.current = 0.2 // Minimal amplitude for subtle animation
    animationStartTimeRef.current = Date.now() // Animation starts now

    async function loadDataOptimized(): Promise<void> {
      try {
        setIsLoading(true)
        setError(null)
        setLoadingProgress(0)

        // Step 1: Generate unified particles with both circular and map positions
        setLoadingPhase('Generating unified particles...')
        const unified = await generateUnifiedParticles() // Uses damienHirst theme by default
        setUnifiedParticles(unified)

        // Start with circular positions
        const initialParticles = unified.map(p => ({
          ...p,
          x: p.circularPos![0],
          y: p.circularPos![1]
        }))
        setParticles(initialParticles)

        // Apply minimal animation to circular pattern
        const circularAnimatedData = animateParticlesBatch(initialParticles, 0)
        setAnimatedData(circularAnimatedData)
        setLoadingPhase('Particles ready!')
        setLoadingProgress(100)

        // Unified particles already contain both circular and map positions
        // No need to load separate map particles
        
      } catch (error) {
        console.error('Unified particle generation failed:', error)
        setError('Unable to generate unified particles')

        // Fallback to original circular pattern at least
        try {
          const fallbackCircular = generateDamienHirstPattern(config.particleCount) // Uses damienHirst theme by default
          setParticles(fallbackCircular)
          const fallbackAnimatedData = animateParticlesBatch(fallbackCircular, 0)
          setAnimatedData(fallbackAnimatedData)
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
  }, [config.particleCount, maxRetries, cacheReady, loadCachedParticles, saveCachedParticles, unifiedParticles.length, displayMode])

  // Color theme is now forced to damienHirst for optimal vibrancy
  // Dynamic color switching logic removed to ensure consistent vibrant colors

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
  
  // 링 기반 연결선 생성 함수 (원형 패턴용)
  const createRingConnections = useCallback(
    (particles: any[]) => {
      const connections: any[] = []

      // Group particles by ring
      const rings: Map<number, any[]> = new Map()

      particles.forEach(particle => {
        if (particle.ringIndex !== undefined) {
          if (!rings.has(particle.ringIndex)) {
            rings.set(particle.ringIndex, [])
          }
          rings.get(particle.ringIndex)!.push(particle)
        }
      })

      // Create connections for each ring
      rings.forEach((ring, ringIndex) => {
        // Sort particles by ringPosition to ensure proper ordering
        ring.sort((a, b) => (a.ringPosition || 0) - (b.ringPosition || 0))

        for (let i = 0; i < ring.length; i++) {
          const current = ring[i]
          const next = ring[(i + 1) % ring.length] // Connect last to first

          // Convert color to array format if needed
          let colorArray: [number, number, number, number]
          if (Array.isArray(current.color)) {
            colorArray = [current.color[0], current.color[1], current.color[2], 150] // Higher opacity for ring lines
          } else {
            // Parse rgba string if needed (fallback)
            colorArray = [88, 166, 255, 150] // Default blue with higher opacity
          }

          connections.push({
            sourcePosition: [current.position[0], current.position[1]] as [number, number],
            targetPosition: [next.position[0], next.position[1]] as [number, number],
            color: colorArray
          })
        }
      })

      return connections
    },
    []
  )

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
          let updated: any[]

          // Handle different display modes
          if (displayMode === 'transitioning' && transitionStartTimeRef.current !== null) {
            // Calculate transition progress
            const now = Date.now()
            const elapsed = now - transitionStartTimeRef.current
            const progress = Math.min(elapsed / transitionDurationRef.current, 1.0)

            // Interpolate between circular and map positions using unified particles
            if (unifiedParticles.length > 0) {
              // Use unified interpolation function with explosion phases
              updated = interpolateUnifiedParticles(unifiedParticles, progress)

              // Check if transition is complete
              if (progress >= 1.0) {
                setDisplayMode('map')
                // Set particles to final map positions
                const finalMapParticles = unifiedParticles.map(p => ({
                  ...p,
                  x: p.mapPos![0],
                  y: p.mapPos![1],
                  position: p.mapPos  // Update position array to match x,y coordinates
                }))
                setParticles(finalMapParticles)
                amplitudeAnimationRef.current = 0.2 // Maintain small amplitude for continuous movement
                // No need to reset animationStartTimeRef since we're not using scatter in map mode
                if (onDisplayModeChange) {
                  onDisplayModeChange('map')
                }
                console.log('Transition to map complete')
              }
            } else {
              // Fallback to current particles if transition data not ready
              const timeInSeconds = animationState.time * 0.001
              updated = animateParticlesBatch(particles, timeInSeconds)
            }
          } else if (displayMode === 'circular') {
            // Animate circular pattern with minimal movement
            const timeInSeconds = animationState.time * 0.001
            amplitudeAnimationRef.current = 0.2 // Keep minimal amplitude
            updated = animateParticlesBatch(particles, timeInSeconds)
          } else {
            // Map mode - simple animation without scatter effect
            // amplitude is already set to 0.2 when transition completes
            const timeInSeconds = animationState.time * 0.001
            updated = animateParticlesBatch(particles, timeInSeconds)
          }

          setAnimatedData(updated)
          
          // Update batch timing
          batchState.lastBatchTime = currentTime
          batchState.needsUpdate = false
          
          // 연결선 업데이트 (초기화 단계에서는 빈도 낮춤)
          // Reduced frequency to prevent excessive setState calls
          const baseConnectionUpdateFreq = adaptiveConfigRef.current.fps > 30 ? 30 : 60
          const connectionUpdateFreq = isInitPhase ? baseConnectionUpdateFreq * 2 : baseConnectionUpdateFreq

          if (frameCount % connectionUpdateFreq === 0) {
            // Use ring connections for circular mode, optimized connections for map mode
            if (displayMode === 'circular') {
              // Only update if particles have ringIndex
              const hasRingData = updated.some(p => p.ringIndex !== undefined)
              if (hasRingData) {
                setConnections(createRingConnections(updated))
              }
            } else if (adaptiveConfigRef.current.connectionCount > 0) {
              const nearbyParticles = updated.slice(0, Math.min(100, updated.length))
              setConnections(createConnectionsOptimized(nearbyParticles, adaptiveConfigRef.current.connectionCount))
            }
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
          // DISABLED to prevent infinite setState calls
          // Breathing effect can cause performance issues and infinite loops
          // Only enable for specific display modes and reduce frequency
          const enableBreathing = false // Temporarily disabled

          if (enableBreathing && displayMode === 'map' && frameCount % 60 === 0) {
            const breathingSpeed = 0.3
            const breathingAmplitude = 0.15
            const baseZoom = 10.8
            const timeInSecondsForBreathing = animationState.time * 0.001
            const breathingOffset = Math.sin(timeInSecondsForBreathing * breathingSpeed) * breathingAmplitude
            const newZoom = baseZoom + breathingOffset

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
      
      // Clear batch state to prevent pending updates
      if (batchStateRef.current) {
        batchStateRef.current.needsUpdate = false
        batchStateRef.current.lastBatchTime = 0
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
  }, [particles, performanceLevel, animationConfig.autoRotateEnabled, animationConfig.autoRotateSpeed, createConnectionsOptimized, animateParticlesBatch, animationState.time, displayMode, unifiedParticles, onDisplayModeChange])

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
    
    // 연결선 레이어 (원형 모드에서는 항상 표시, 맵 모드에서는 성능 설정에 따라)
    if (displayMode === 'circular' || config.connectionCount > 0) {
      baseLayers.push(
        new LineLayer({
          id: "connection-layer",
          data: connections,
          pickable: false,
          getSourcePosition: (d: any) => d.sourcePosition,
          getTargetPosition: (d: any) => d.targetPosition,
          getColor: (d: any) => d.color,
          getWidth: displayMode === 'circular' ? 2 : 1, // Thicker lines for circular mode
          opacity: displayMode === 'circular' ? 0.6 : 0.3, // Higher opacity for circular mode
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