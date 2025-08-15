/**
 * Adaptive Particle System Hook
 * Dynamically adjusts particle count and performance based on device capabilities
 */

import { useState, useEffect, useCallback, useRef } from 'react'

export interface AdaptiveParticleConfig {
  particleCount: number
  connectionCount: number
  fps: number
  glowLayers: number
  renderDistance: number
  animationComplexity: 'low' | 'medium' | 'high'
  enableEffects: {
    wave: boolean
    pulse: boolean
    firefly: boolean
    trail: boolean
    glow: boolean
  }
}

export interface PerformanceMetrics {
  fps: number
  frameTime: number
  memoryUsage: number
  drawCalls: number
  lastUpdate: number
}

export interface DeviceCapabilities {
  level: 'low' | 'medium' | 'high'
  gpu: string
  cores: number
  memory: number
  isMobile: boolean
  pixelRatio: number
  screenArea: number
}

/**
 * Enhanced performance detection with detailed capabilities analysis
 */
function detectDeviceCapabilities(): DeviceCapabilities {
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
  
  let score = 0
  let gpu = 'unknown'
  
  // GPU detection and scoring
  if (gl) {
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
    if (debugInfo) {
      gpu = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase()
      
      if (gpu.includes('nvidia') && (gpu.includes('rtx') || gpu.includes('gtx'))) {
        score += 40 // High-end NVIDIA
      } else if (gpu.includes('nvidia')) {
        score += 25 // Other NVIDIA
      } else if (gpu.includes('amd') && gpu.includes('radeon')) {
        score += 30 // AMD Radeon
      } else if (gpu.includes('apple') || gpu.includes('m1') || gpu.includes('m2')) {
        score += 35 // Apple Silicon
      } else if (gpu.includes('intel') && !gpu.includes('hd')) {
        score += 15 // Modern Intel GPU
      } else if (gpu.includes('intel')) {
        score += 5 // Intel HD
      }
    }
  }
  
  // Device type detection
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  if (isMobile) score -= 20
  
  // CPU cores
  const cores = navigator.hardwareConcurrency || 1
  if (cores >= 8) score += 15
  else if (cores >= 4) score += 10
  else if (cores >= 2) score += 5
  
  // Memory detection (Chrome only)
  let memory = 4000 // Default assumption: 4GB
  if ('memory' in performance) {
    const memInfo = (performance as any).memory
    memory = memInfo.jsHeapSizeLimit / 1024 / 1024 // Convert to MB
    if (memory > 8000) score += 15
    else if (memory > 4000) score += 10
    else if (memory > 2000) score += 5
  }
  
  // Screen resolution and pixel density
  const pixelRatio = window.devicePixelRatio || 1
  const screenArea = window.innerWidth * window.innerHeight * pixelRatio
  
  if (screenArea > 8000000) score += 20 // 4K+
  else if (screenArea > 4000000) score += 15 // QHD
  else if (screenArea > 2000000) score += 10 // FHD
  else if (screenArea > 1000000) score += 5 // HD
  
  // Determine performance level
  let level: 'low' | 'medium' | 'high'
  if (score >= 60) level = 'high'
  else if (score >= 30) level = 'medium'
  else level = 'low'
  
  return {
    level,
    gpu,
    cores,
    memory,
    isMobile,
    pixelRatio,
    screenArea
  }
}

/**
 * Performance monitoring system
 */
class PerformanceMonitor {
  private frameCount = 0
  private lastTime = performance.now()
  private frameTimes: number[] = []
  private maxSamples = 60 // 1 second at 60fps
  
  updateFrame(): PerformanceMetrics {
    const now = performance.now()
    const frameTime = now - this.lastTime
    
    this.frameCount++
    this.frameTimes.push(frameTime)
    
    // Keep only recent samples
    if (this.frameTimes.length > this.maxSamples) {
      this.frameTimes.shift()
    }
    
    // Calculate average FPS
    const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length
    const fps = Math.round(1000 / avgFrameTime)
    
    // Memory usage (Chrome only)
    let memoryUsage = 0
    if ('memory' in performance) {
      const memInfo = (performance as any).memory
      memoryUsage = memInfo.usedJSHeapSize / 1024 / 1024 // MB
    }
    
    this.lastTime = now
    
    return {
      fps,
      frameTime: avgFrameTime,
      memoryUsage,
      drawCalls: 0, // Would need WebGL context to measure accurately
      lastUpdate: now
    }
  }
  
  reset(): void {
    this.frameCount = 0
    this.frameTimes = []
    this.lastTime = performance.now()
  }
}

/**
 * Adaptive particle configuration generator
 */
function generateAdaptiveConfig(
  capabilities: DeviceCapabilities,
  targetFPS: number = 60
): AdaptiveParticleConfig {
  const configs = {
    low: {
      particleCount: 2000,
      connectionCount: 30,
      fps: 30,
      glowLayers: 0,
      renderDistance: 100,
      animationComplexity: 'low' as const,
      enableEffects: {
        wave: true,
        pulse: false,
        firefly: false,
        trail: false,
        glow: false
      }
    },
    medium: {
      particleCount: 5000,
      connectionCount: 100,
      fps: 45,
      glowLayers: 1,
      renderDistance: 150,
      animationComplexity: 'medium' as const,
      enableEffects: {
        wave: true,
        pulse: true,
        firefly: true,
        trail: false,
        glow: true
      }
    },
    high: {
      particleCount: 8000,
      connectionCount: 200,
      fps: 60,
      glowLayers: 2,
      renderDistance: 200,
      animationComplexity: 'high' as const,
      enableEffects: {
        wave: true,
        pulse: true,
        firefly: true,
        trail: true,
        glow: true
      }
    }
  }
  
  const baseConfig = configs[capabilities.level]
  
  // Adjust for mobile devices
  if (capabilities.isMobile) {
    baseConfig.particleCount = Math.floor(baseConfig.particleCount * 0.6)
    baseConfig.connectionCount = Math.floor(baseConfig.connectionCount * 0.5)
    baseConfig.enableEffects.trail = false
    baseConfig.glowLayers = Math.max(0, baseConfig.glowLayers - 1)
  }
  
  // Adjust for high DPI displays
  if (capabilities.pixelRatio > 2) {
    baseConfig.particleCount = Math.floor(baseConfig.particleCount * 0.8)
  }
  
  return baseConfig
}

/**
 * Main adaptive particles hook
 */
export function useAdaptiveParticles(initialTargetFPS: number = 60) {
  const [capabilities] = useState<DeviceCapabilities>(() => detectDeviceCapabilities())
  const [config, setConfig] = useState<AdaptiveParticleConfig>(() => 
    generateAdaptiveConfig(capabilities, initialTargetFPS)
  )
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    frameTime: 16.67,
    memoryUsage: 0,
    drawCalls: 0,
    lastUpdate: performance.now()
  })
  const [isAdaptiveMode, setIsAdaptiveMode] = useState(true)
  const [targetFPS, setTargetFPS] = useState(initialTargetFPS)
  
  const monitorRef = useRef<PerformanceMonitor>(new PerformanceMonitor())
  const adaptiveIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const lastAdaptationRef = useRef<number>(0)
  
  // Performance monitoring and adaptation
  const updatePerformance = useCallback(() => {
    const newMetrics = monitorRef.current.updateFrame()
    setMetrics(newMetrics)
    
    // Adaptive adjustment (every 3 seconds minimum)
    const now = performance.now()
    if (isAdaptiveMode && now - lastAdaptationRef.current > 3000) {
      const fpsDiff = newMetrics.fps - targetFPS
      
      // If FPS is significantly below target, reduce quality
      if (fpsDiff < -10 && config.particleCount > 1000) {
        setConfig(prev => ({
          ...prev,
          particleCount: Math.max(1000, Math.floor(prev.particleCount * 0.8)),
          connectionCount: Math.max(20, Math.floor(prev.connectionCount * 0.8)),
          glowLayers: Math.max(0, prev.glowLayers - 1)
        }))
        lastAdaptationRef.current = now
      }
      // If FPS is consistently above target, gradually increase quality
      else if (fpsDiff > 10 && config.particleCount < (capabilities.level === 'high' ? 8000 : 5000)) {
        setConfig(prev => ({
          ...prev,
          particleCount: Math.min(8000, Math.floor(prev.particleCount * 1.1)),
          connectionCount: Math.min(200, Math.floor(prev.connectionCount * 1.1))
        }))
        lastAdaptationRef.current = now
      }
    }
  }, [isAdaptiveMode, targetFPS, config.particleCount, capabilities.level])
  
  // Manual configuration override
  const overrideConfig = useCallback((newConfig: Partial<AdaptiveParticleConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }))
    setIsAdaptiveMode(false) // Disable auto-adaptation when manually configured
  }, [])
  
  // Reset to adaptive mode
  const resetToAdaptive = useCallback(() => {
    const newConfig = generateAdaptiveConfig(capabilities, targetFPS)
    setConfig(newConfig)
    setIsAdaptiveMode(true)
    monitorRef.current.reset()
  }, [capabilities, targetFPS])
  
  // Change target FPS
  const setTargetFPSAndAdapt = useCallback((newTargetFPS: number) => {
    setTargetFPS(newTargetFPS)
    if (isAdaptiveMode) {
      resetToAdaptive()
    }
  }, [isAdaptiveMode, resetToAdaptive])
  
  // Start/stop monitoring
  useEffect(() => {
    if (adaptiveIntervalRef.current) {
      clearInterval(adaptiveIntervalRef.current)
    }
    
    // Update performance metrics every frame (when possible)
    const animationFrame = () => {
      updatePerformance()
      requestAnimationFrame(animationFrame)
    }
    requestAnimationFrame(animationFrame)
    
    return () => {
      if (adaptiveIntervalRef.current) {
        clearInterval(adaptiveIntervalRef.current)
      }
    }
  }, [updatePerformance])
  
  return {
    // Current configuration
    config,
    capabilities,
    metrics,
    
    // State
    isAdaptiveMode,
    targetFPS,
    
    // Controls
    overrideConfig,
    resetToAdaptive,
    setTargetFPS: setTargetFPSAndAdapt,
    toggleAdaptiveMode: () => setIsAdaptiveMode(prev => !prev),
    
    // Utilities
    getPerformanceLevel: () => capabilities.level,
    getRecommendedConfig: () => generateAdaptiveConfig(capabilities, targetFPS),
    
    // Debug info
    getDebugInfo: () => ({
      capabilities,
      config,
      metrics,
      isAdaptiveMode,
      targetFPS
    })
  }
}

export default useAdaptiveParticles