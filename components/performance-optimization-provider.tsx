/**
 * Performance Optimization Provider
 * Global performance management and optimization coordinator
 */

"use client"

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { useServiceWorker } from '@/utils/service-worker-manager'
import { useAdaptiveParticles } from '@/hooks/use-adaptive-particles'
import type { AdaptiveParticleConfig, PerformanceMetrics, DeviceCapabilities } from '@/hooks/use-adaptive-particles'

export interface PerformanceOptimizationContext {
  // Performance state
  capabilities: DeviceCapabilities
  particleConfig: AdaptiveParticleConfig
  metrics: PerformanceMetrics
  isOptimized: boolean
  
  // Service Worker state
  serviceWorker: {
    isActive: boolean
    updateAvailable: boolean
    offlineReady: boolean
  }
  
  // Controls
  optimizeForPerformance: () => void
  resetOptimizations: () => void
  updateServiceWorker: () => Promise<void>
  clearCache: () => Promise<boolean>
  prefetchData: () => Promise<void>
  
  // Monitoring
  getDebugInfo: () => any
  enablePerformanceMode: (enabled: boolean) => void
}

const PerformanceContext = createContext<PerformanceOptimizationContext | null>(null)

export function usePerformanceOptimization(): PerformanceOptimizationContext {
  const context = useContext(PerformanceContext)
  if (!context) {
    throw new Error('usePerformanceOptimization must be used within PerformanceOptimizationProvider')
  }
  return context
}

export interface PerformanceOptimizationProviderProps {
  children: ReactNode
  enableAutoOptimization?: boolean
  targetFPS?: number
}

export function PerformanceOptimizationProvider({
  children,
  enableAutoOptimization = true,
  targetFPS = 60
}: PerformanceOptimizationProviderProps) {
  // Adaptive particles hook
  const {
    config: particleConfig,
    capabilities,
    metrics,
    isAdaptiveMode,
    overrideConfig,
    resetToAdaptive,
    toggleAdaptiveMode,
    getDebugInfo: getParticleDebugInfo
  } = useAdaptiveParticles(targetFPS)
  
  // Service worker hook
  const {
    status: swStatus,
    updateAvailable,
    offlineReady,
    updateServiceWorker,
    clearCache,
    prefetchData
  } = useServiceWorker()
  
  // Performance optimization state
  const [isOptimized, setIsOptimized] = useState(false)
  const [performanceModeEnabled, setPerformanceModeEnabled] = useState(enableAutoOptimization)
  
  // Initialize performance optimizations
  useEffect(() => {
    if (performanceModeEnabled) {
      initializeOptimizations()
    }
  }, [performanceModeEnabled])
  
  // Monitor performance and auto-optimize
  useEffect(() => {
    if (!performanceModeEnabled) return
    
    const monitorInterval = setInterval(() => {
      // Auto-optimize if performance is poor
      if (metrics.fps < targetFPS * 0.7 && !isOptimized) {
        optimizeForPerformance()
      }
      
      // Reset optimizations if performance is consistently good
      if (metrics.fps > targetFPS * 0.9 && isOptimized) {
        const shouldReset = checkIfOptimizationCanBeReset()
        if (shouldReset) {
          resetOptimizations()
        }
      }
    }, 5000) // Check every 5 seconds
    
    return () => clearInterval(monitorInterval)
  }, [metrics.fps, targetFPS, isOptimized, performanceModeEnabled])
  
  /**
   * Initialize performance optimizations
   */
  const initializeOptimizations = useCallback(async () => {
    try {
      // Prefetch critical data
      await prefetchData()
      
      // Initialize service worker caching
      if (swStatus.isSupported && !swStatus.isActive) {
        console.log('[Performance] Initializing service worker...')
      }
      
      // Set up performance monitoring
      if ('performance' in window && 'observe' in PerformanceObserver.prototype) {
        setupPerformanceObserver()
      }
      
      console.log('[Performance] Optimizations initialized')
    } catch (error) {
      console.warn('[Performance] Failed to initialize optimizations:', error)
    }
  }, [prefetchData, swStatus])
  
  /**
   * Optimize for performance (emergency mode)
   */
  const optimizeForPerformance = useCallback(() => {
    console.log('[Performance] Activating emergency performance mode')
    
    // Reduce particle system complexity
    overrideConfig({
      particleCount: Math.max(1000, particleConfig.particleCount * 0.5),
      connectionCount: Math.max(20, particleConfig.connectionCount * 0.5),
      glowLayers: 0,
      enableEffects: {
        wave: true,
        pulse: false,
        firefly: false,
        trail: false,
        glow: false
      }
    })
    
    // Disable heavy animations
    document.documentElement.style.setProperty('--animation-duration', '0s')
    
    // Reduce image quality
    const images = document.querySelectorAll('img')
    images.forEach(img => {
      img.style.imageRendering = 'pixelated'
    })
    
    setIsOptimized(true)
  }, [overrideConfig, particleConfig])
  
  /**
   * Reset optimizations to normal
   */
  const resetOptimizations = useCallback(() => {
    console.log('[Performance] Resetting to normal performance mode')
    
    // Reset particle system
    resetToAdaptive()
    
    // Reset animations
    document.documentElement.style.removeProperty('--animation-duration')
    
    // Reset image quality
    const images = document.querySelectorAll('img')
    images.forEach(img => {
      img.style.removeProperty('image-rendering')
    })
    
    setIsOptimized(false)
  }, [resetToAdaptive])
  
  /**
   * Check if optimization can be reset
   */
  const checkIfOptimizationCanBeReset = useCallback((): boolean => {
    // Only reset if performance has been good for a while
    const performanceGoodDuration = 10000 // 10 seconds
    const now = performance.now()
    
    // This would need to track performance history
    // For now, just return true after some time
    return now - metrics.lastUpdate > performanceGoodDuration
  }, [metrics.lastUpdate])
  
  /**
   * Set up performance observer
   */
  const setupPerformanceObserver = useCallback(() => {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        
        for (const entry of entries) {
          // Monitor long tasks (> 50ms)
          if (entry.entryType === 'longtask' && entry.duration > 50) {
            console.warn('[Performance] Long task detected:', entry.duration + 'ms')
            
            // Auto-optimize if too many long tasks
            if (!isOptimized && performanceModeEnabled) {
              optimizeForPerformance()
            }
          }
          
          // Monitor layout shifts
          if (entry.entryType === 'layout-shift' && (entry as any).value > 0.1) {
            console.warn('[Performance] Layout shift detected:', (entry as any).value)
          }
        }
      })
      
      // Observe long tasks and layout shifts
      observer.observe({ entryTypes: ['longtask', 'layout-shift'] })
      
      return () => observer.disconnect()
    } catch (error) {
      console.warn('[Performance] Performance observer not supported:', error)
    }
  }, [isOptimized, performanceModeEnabled, optimizeForPerformance])
  
  /**
   * Get comprehensive debug information
   */
  const getDebugInfo = useCallback(() => {
    return {
      performance: {
        capabilities,
        particleConfig,
        metrics,
        isOptimized,
        performanceModeEnabled
      },
      serviceWorker: {
        status: swStatus,
        updateAvailable,
        offlineReady
      },
      particles: getParticleDebugInfo(),
      browser: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        cores: navigator.hardwareConcurrency,
        memory: 'memory' in performance ? (performance as any).memory : null
      }
    }
  }, [
    capabilities, particleConfig, metrics, isOptimized, performanceModeEnabled,
    swStatus, updateAvailable, offlineReady, getParticleDebugInfo
  ])
  
  /**
   * Enable/disable performance mode
   */
  const enablePerformanceMode = useCallback((enabled: boolean) => {
    setPerformanceModeEnabled(enabled)
    
    if (!enabled && isOptimized) {
      resetOptimizations()
    }
  }, [isOptimized, resetOptimizations])
  
  const contextValue: PerformanceOptimizationContext = {
    // Performance state
    capabilities,
    particleConfig,
    metrics,
    isOptimized,
    
    // Service Worker state
    serviceWorker: {
      isActive: swStatus.isActive,
      updateAvailable,
      offlineReady
    },
    
    // Controls
    optimizeForPerformance,
    resetOptimizations,
    updateServiceWorker,
    clearCache,
    prefetchData,
    
    // Monitoring
    getDebugInfo,
    enablePerformanceMode
  }
  
  return (
    <PerformanceContext.Provider value={contextValue}>
      {children}
    </PerformanceContext.Provider>
  )
}

export default PerformanceOptimizationProvider