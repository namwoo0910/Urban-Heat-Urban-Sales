"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import Map from "react-map-gl"
import { DeckGL } from "@deck.gl/react"
import { ScatterplotLayer, LineLayer, SolidPolygonLayer } from "@deck.gl/layers"
import type { MapViewState } from "@deck.gl/core"
import "mapbox-gl/dist/mapbox-gl.css"
import { generateSeoulParticles, generateSeoulParticlesWithBoundary, updateParticleColors } from "@/utils/particle-data"
import type { ParticleData } from "@/utils/particle-data"
import { loadSeoulBoundaries } from "@/utils/seoul-boundaries"
import type { SeoulBoundaryData } from "@/utils/seoul-boundaries"
import { precomputeBoundaryGrid } from "@/utils/seoul-boundaries-optimized"
import { generateParticlesOptimized, generateInitialParticles, createParticleBuffers } from "@/utils/particle-data-optimized"
import { useParticleCache } from "@/hooks/use-particle-cache"
import { useParticleWorker } from "@/hooks/use-particle-worker"
import useParticleAnimations from "@/hooks/use-particle-animations"
import type { AnimationConfig } from "@/hooks/use-particle-animations"
import { WaveLayer } from "@/components/wave-layer-integrated"
// Removed AnimationControls import - moved to Hero component

// Mapbox access token
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "pk.eyJ1IjoieXN1MTUxNiIsImEiOiJjbWRyMHR2bTQwOTB2MmlzOGdlZmFldnVnIn0.Rv_I_4s0u88CYd7r9JbZDA"

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
  onMapStyleChange: (style: string) => void
}

export function SeoulMapOptimized({
  animationConfig,
  onAnimationConfigChange,
  mapStyle,
  onMapStyleChange
}: SeoulMapOptimizedProps) {
  // 성능 레벨 감지 및 적응형 관리
  const [performanceLevel, setPerformanceLevel] = useState<keyof typeof PERFORMANCE_CONFIG>(() => detectPerformanceLevel())
  const [currentFPS, setCurrentFPS] = useState(0)
  const performanceMonitorRef = useRef<PerformanceMonitor>(new PerformanceMonitor())
  const adaptiveConfigRef = useRef(PERFORMANCE_CONFIG[performanceLevel])
  const config = adaptiveConfigRef.current
  
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
  const amplitudeAnimationRef = useRef<number>(15.0) // Start at much higher amplitude for very dramatic scatter
  const animationStartTimeRef = useRef<number | null>(null)
  const animationDurationRef = useRef<number>(15000) // 15 seconds animation
  
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
  
  // 초기 뷰 상태 - 80% side view angle and adjusted zoom for 90% scale
  const [viewState, setViewState] = useState<MapViewState>({
    longitude: 126.978,
    latitude: 37.5665,
    zoom: 11.0, // Slightly reduced zoom for 90% scale effect
    pitch: performanceLevel === 'high' ? 72 : 52, // Changed from top view to 80% side view
    bearing: 15, // Slight rotation for side view effect
  })

  // Animation configuration now comes from props

  const { animationState } = useParticleAnimations(
    particles,
    animationConfig
  )
  
  // Optimized batch animation function with config integration
  const animateParticlesBatch = useCallback((particles: ParticleData[], time: number) => {
    const pool = animationPoolRef.current
    const particleCount = particles.length
    
    // Resize arrays if needed (object pooling)
    if (pool.positions.length !== particleCount * 2) {
      pool.positions = new Float32Array(particleCount * 2)
      pool.colors = new Uint8Array(particleCount * 3)
      pool.sizes = new Float32Array(particleCount)
      
      // Pre-allocate reusable objects
      pool.reusableObjects = new Array(particleCount)
      for (let i = 0; i < particleCount; i++) {
        pool.reusableObjects[i] = {
          position: [0, 0] as [number, number],
          color: [0, 0, 0] as [number, number, number],
          size: 0,
          opacity: 0
        }
      }
    }
    
    // Batch process particles using typed arrays for better performance
    for (let i = 0; i < particleCount; i++) {
      const particle = particles[i]
      const obj = pool.reusableObjects[i]
      
      // Calculate animation offsets based on config
      let offsetX = 0
      let offsetY = 0
      let sizePulse = 1
      
      // Wave animation with animated amplitude
      if (animationConfig.waveEnabled) {
        // Use the animated amplitude value multiplied by the config amplitude
        const currentAmplitude = amplitudeAnimationRef.current * animationConfig.waveAmplitude
        
        offsetX += Math.sin(time * animationConfig.waveSpeed + particle.phase) * currentAmplitude
        offsetY += Math.cos(time * animationConfig.waveSpeed * 0.7 + particle.phase) * currentAmplitude * 0.7
      }
      
      // Pulse animation
      if (animationConfig.pulseEnabled) {
        sizePulse = 0.8 + Math.sin(time * animationConfig.pulseSpeed + particle.phase) * animationConfig.pulseIntensity
      }
      
      // Firefly effect
      if (animationConfig.fireflyEnabled) {
        const fireflyPhase = time * animationConfig.fireflySpeed + particle.phase * animationConfig.fireflyRandomness
        offsetX += Math.sin(fireflyPhase * 3.7) * 0.0005 * animationConfig.fireflyRandomness
        offsetY += Math.cos(fireflyPhase * 2.3) * 0.0005 * animationConfig.fireflyRandomness
      }
      
      // Update position
      obj.position[0] = particle.position[0] + offsetX
      obj.position[1] = particle.position[1] + offsetY
      
      // Update color with subtle color cycle animation
      if (animationConfig.colorCycleEnabled) {
        // Subtle color variation that preserves original palette
        const hueShift = Math.sin(time * animationConfig.colorCycleSpeed) * 0.2 // -0.2 to 0.2 range
        const brightnessShift = Math.cos(time * animationConfig.colorCycleSpeed * 0.7) * 0.1 // -0.1 to 0.1 range
        
        // Apply subtle color modulation while preserving original colors
        obj.color[0] = Math.max(0, Math.min(255, particle.color[0] * (1 + hueShift + brightnessShift)))
        obj.color[1] = Math.max(0, Math.min(255, particle.color[1] * (1 - hueShift * 0.5 + brightnessShift)))
        obj.color[2] = Math.max(0, Math.min(255, particle.color[2] * (1 + hueShift * 0.3 + brightnessShift)))
      } else {
        obj.color[0] = particle.color[0]
        obj.color[1] = particle.color[1]
        obj.color[2] = particle.color[2]
      }
      
      // Update size with pulsing effect
      obj.size = particle.size * sizePulse
      obj.opacity = 255
      
      // Store in typed arrays for deck.gl optimization
      const idx2 = i * 2
      const idx3 = i * 3
      
      pool.positions[idx2] = obj.position[0]
      pool.positions[idx2 + 1] = obj.position[1]
      
      pool.colors[idx3] = obj.color[0]
      pool.colors[idx3 + 1] = obj.color[1]
      pool.colors[idx3 + 2] = obj.color[2]
      
      pool.sizes[i] = obj.size
    }
    
    return pool.reusableObjects
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
    async function loadDataOptimized(): Promise<void> {
      try {
        setIsLoading(true)
        setError(null)
        setLoadingProgress(0)
        
        // Step 1: Show initial particles immediately (instant feedback)
        const initialParticles = generateInitialParticles(animationConfig.colorTheme)
        setParticles(initialParticles)
        setAnimatedData(initialParticles.map(p => ({
          position: p.position,
          color: p.color,
          size: p.size,
          opacity: 255
        })))
        setLoadingPhase('Loading optimized data...')
        setLoadingProgress(5)
        
        // Step 2: Try to load from IndexedDB cache first (ultra-fast)
        if (cacheReady) {
          const cached = await loadCachedParticles(config.particleCount, animationConfig.colorTheme)
          if (cached) {
            setLoadingPhase('Loaded from cache!')
            setLoadingProgress(100)
            setParticles(cached)
            setAnimatedData(cached.map(p => ({
              position: p.position,
              color: p.color,
              size: p.size,
              opacity: 255
            })))
            setIsLoading(false)
            return
          }
        }
        
        // Step 3: Load and pre-compute boundary grid
        setLoadingPhase('Optimizing boundaries...')
        const boundaries = await loadSeoulBoundaries()
        setBoundaryData(boundaries)
        setLoadingProgress(20)
        
        const grid = await precomputeBoundaryGrid(boundaries)
        setLoadingProgress(30)
        
        // Step 4: Generate particles with optimized algorithm
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
        setAnimatedData(particlesInSeoul.map(p => ({
          position: p.position,
          color: p.color,
          size: p.size,
          opacity: 255
        })))
        
      } catch (error) {
        console.error('Optimized data loading failed:', error)
        setError('Using fallback particle generation')
        
        // Fallback to original method if optimizations fail
        try {
          const boundaries = await loadSeoulBoundaries()
          const fallbackParticles = await generateSeoulParticlesWithBoundary(
            config.particleCount,
            boundaries,
            undefined,
            animationConfig.colorTheme
          )
          setParticles(fallbackParticles)
          setAnimatedData(fallbackParticles.map(p => ({
            position: p.position,
            color: p.color,
            size: p.size,
            opacity: 255
          })))
          setLoadingProgress(100)
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError)
          setError('Unable to generate particles')
        }
      } finally {
        setIsLoading(false)
        // Initialize amplitude animation when particles are loaded
        amplitudeAnimationRef.current = 15.0 // Reset to much higher amplitude for very dramatic scatter effect
        animationStartTimeRef.current = Date.now() // Start time for animation
      }
    }
    
    // Start the loading process
    loadDataOptimized()
  }, [config.particleCount, maxRetries, cacheReady, loadCachedParticles, saveCachedParticles, animationConfig.colorTheme])

  // Separate effect for color theme changes - only update colors, don't reload data
  useEffect(() => {
    if (particles.length > 0 && animationConfig.layerType === 'particle' && animatedData.length > 0) {
      const updatedParticles = updateParticleColors(particles, animationConfig.colorTheme)
      setParticles(updatedParticles)
      // Update animatedData with new colors but keep current positions (no scatter)
      setAnimatedData(prevAnimated => 
        prevAnimated.map((a, i) => ({
          ...a,
          color: updatedParticles[i]?.color || a.color
        }))
      )
    }
  }, [animationConfig.colorTheme, animationConfig.layerType])

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

  // Enhanced animation loop with adaptive performance
  useEffect(() => {
    if (particles.length === 0 || animationConfig.layerType !== 'particle') {
      // Clear animatedData when switching away from particle layer
      if (animationConfig.layerType !== 'particle') {
        setAnimatedData([])
      }
      return
    }
    
    let frameCount = 0
    let performanceCheckInterval = 0
    const monitor = performanceMonitorRef.current
    
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
      
      // Dynamic FPS limiting based on current performance
      const dynamicInterval = adaptiveConfigRef.current.fps > 0 ? 1000 / adaptiveConfigRef.current.fps : frameInterval
      const batchState = batchStateRef.current
      
        // Batch update strategy - only update when needed or interval passed
        const shouldUpdate = currentTime - lastFrameTimeRef.current >= dynamicInterval
        const shouldBatch = currentTime - batchState.lastBatchTime >= batchState.batchInterval || batchState.needsUpdate
        
        if (shouldUpdate && shouldBatch) {
          // Update amplitude animation
          if (animationStartTimeRef.current !== null) {
            const now = Date.now()
            const elapsed = now - animationStartTimeRef.current
            const progress = Math.min(elapsed / animationDurationRef.current, 1.0)
            
            // Use cubic easing out for smooth decay
            const easedProgress = 1.0 - Math.pow(1.0 - progress, 3)
            const currentAmplitude = 15.0 - (14.8 * easedProgress) // From 15.0 to 0.2
            
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
          
          // 연결선 업데이트 (빈도를 성능에 따라 조정)
          const connectionUpdateFreq = adaptiveConfigRef.current.fps > 30 ? 10 : 20
          if (frameCount % connectionUpdateFreq === 0 && adaptiveConfigRef.current.connectionCount > 0) {
            const nearbyParticles = updated.slice(0, Math.min(100, updated.length))
            setConnections(createConnectionsOptimized(nearbyParticles, adaptiveConfigRef.current.connectionCount))
          }
          
          // 자동 회전 (애니메이션 설정에 따라)
          const rotationFreq = adaptiveConfigRef.current.fps > 30 ? 2 : 4
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
          const baseZoom = 11.0 // Updated to match new initial zoom
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
  }, [particles, performanceLevel, animationConfig.layerType, animationConfig.autoRotateEnabled, animationConfig.autoRotateSpeed, createConnectionsOptimized, animateParticlesBatch, animationState.time])

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
    <div className="relative w-full h-full" id="seoul-map-container">
      {/* Conditional rendering based on layer type */}
      {animationConfig.layerType === 'particle' ? (
        <div style={{ transform: 'scale(0.9)', transformOrigin: 'center center', width: '111.11%', height: '111.11%', marginLeft: '-5.56%', marginTop: '-5.56%' }}>
        <DeckGL
          viewState={viewState}
          onViewStateChange={handleViewStateChange}
          controller={true}
          layers={layers}
          parameters={{
            // Parameters for rendering optimization
          }}
          // 성능 최적화 옵션
          getCursor={() => 'grab'}
          getTooltip={() => null}
        >
        {/* Render Map with fixed dark theme */}
        {typeof window !== 'undefined' && MAPBOX_TOKEN && (
          <Map
          mapboxAccessToken={MAPBOX_TOKEN}
          mapStyle={mapStyle}
          style={{ width: '100%', height: '100%' }}
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
        </div>
      ) : (
        // Wave Layer with Mapbox background - scaled to 90%
        <div style={{ transform: 'scale(0.9)', transformOrigin: 'center center', width: '111.11%', height: '111.11%', marginLeft: '-5.56%', marginTop: '-5.56%' }}>
          {/* Mapbox map as background */}
          <div className="w-full h-full" id="wave-map-container">
            {typeof window !== 'undefined' && MAPBOX_TOKEN && (
              <Map
              mapboxAccessToken={MAPBOX_TOKEN}
              mapStyle={mapStyle}
              initialViewState={viewState}
              reuseMaps={true}
              preserveDrawingBuffer={false}
              attributionControl={false}
              style={{ width: '100%', height: '100%' }}
              onError={(evt: any) => {
                console.error('Map error in wave layer:', evt)
              }}
              onMove={(evt: any) => {
                const { viewState } = evt
                if (viewState) {
                  setViewState(viewState)
                }
              }}
              onLoad={(evt: any) => {
                const map = evt.target
                
                // Ensure the map has initialized properly
                if (!map || !map.getStyle) {
                  console.warn('Map not properly initialized')
                  return
                }
                
                try {
                  // 더 어둡게 스타일 조정 (particle layer와 동일)
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
          </div>
          

          {/* Wave Layer on top */}
          <WaveLayer 
            animationConfig={animationConfig}
            mapboxCameraPos={{
              longitude: viewState.longitude || 126.978,
              latitude: viewState.latitude || 37.5665,
              zoom: viewState.zoom || 11.2,
              pitch: viewState.pitch || 72,
              bearing: viewState.bearing || 0
            }}
          />
        </div>
      )}

      {/* Animation controls moved to Hero component for proper z-index handling */}

      {/* 성능 정보 표시 (개발 모드에서만) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm rounded px-3 py-2 text-xs text-white/80 space-y-1">
          <div>Performance: {performanceLevel.toUpperCase()}</div>
          <div>Particles: {config.particleCount}</div>
          <div>Target FPS: {config.fps}</div>
          <div className={`${currentFPS < 25 ? 'text-red-400' : currentFPS < 45 ? 'text-yellow-400' : 'text-green-400'}`}>
            Current FPS: {currentFPS}
          </div>
          <div>Connections: {config.connectionCount}</div>
          <div>Glow: {config.glowLayers > 0 ? 'ON' : 'OFF'}</div>
        </div>
      )}
      
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