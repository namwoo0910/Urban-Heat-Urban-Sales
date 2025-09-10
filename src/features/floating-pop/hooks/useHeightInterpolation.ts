/**
 * Height Interpolation Hook for Smooth Timeline Animations
 * Provides smooth transitions between height values when data changes
 */

import { useRef, useEffect, useCallback, useState } from 'react'

export interface InterpolationConfig {
  duration?: number         // Transition duration in ms (default: 1000)
  easing?: 'linear' | 'ease-in-out' | 'cubic' | 'smooth'  // Easing function
  enabled?: boolean         // Enable/disable interpolation
  fps?: number             // Target FPS (default: 60)
}

interface HeightData {
  dongCode: number
  currentHeight: number
  targetHeight: number
  startHeight: number
  startTime: number
}

// Easing functions
const easingFunctions = {
  linear: (t: number) => t,
  'ease-in-out': (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  cubic: (t: number) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  smooth: (t: number) => t * t * (3 - 2 * t)  // Smooth step function
}

export function useHeightInterpolation(config: InterpolationConfig = {}) {
  const {
    duration = 1000,
    easing = 'cubic',
    enabled = true,
    fps = 60
  } = config

  const [isAnimating, setIsAnimating] = useState(false)
  const heightMapRef = useRef<Map<number, HeightData>>(new Map())
  const animationFrameRef = useRef<number>()
  const lastUpdateRef = useRef<number>(0)
  const frameInterval = 1000 / fps

  // Update target heights when sales data changes
  const updateTargetHeights = useCallback((newHeights: Map<number, number>) => {
    if (!enabled) {
      // If interpolation disabled, update heights immediately
      heightMapRef.current.clear()
      newHeights.forEach((height, dongCode) => {
        heightMapRef.current.set(dongCode, {
          dongCode,
          currentHeight: height,
          targetHeight: height,
          startHeight: height,
          startTime: Date.now()
        })
      })
      return
    }

    const now = Date.now()
    const heightMap = heightMapRef.current

    // Update or create height data for each dong
    newHeights.forEach((newHeight, dongCode) => {
      const existing = heightMap.get(dongCode)
      
      if (existing) {
        // Start new transition from current interpolated height
        existing.startHeight = existing.currentHeight
        existing.targetHeight = newHeight
        existing.startTime = now
      } else {
        // New dong, start from 0
        heightMap.set(dongCode, {
          dongCode,
          currentHeight: 0,
          targetHeight: newHeight,
          startHeight: 0,
          startTime: now
        })
      }
    })

    // Remove dongs that are no longer in the data
    const dongCodes = new Set(newHeights.keys())
    Array.from(heightMap.keys()).forEach(code => {
      if (!dongCodes.has(code)) {
        heightMap.delete(code)
      }
    })

    setIsAnimating(true)
  }, [enabled])

  // Animation loop
  useEffect(() => {
    if (!isAnimating || !enabled) return

    const animate = (timestamp: number) => {
      // Limit frame rate
      if (timestamp - lastUpdateRef.current < frameInterval) {
        animationFrameRef.current = requestAnimationFrame(animate)
        return
      }
      lastUpdateRef.current = timestamp

      const now = Date.now()
      const heightMap = heightMapRef.current
      let stillAnimating = false
      const easingFn = easingFunctions[easing]

      // Update all heights
      heightMap.forEach(data => {
        const elapsed = now - data.startTime
        const progress = Math.min(elapsed / duration, 1)
        
        if (progress < 1) {
          stillAnimating = true
          const easedProgress = easingFn(progress)
          const delta = data.targetHeight - data.startHeight
          data.currentHeight = data.startHeight + delta * easedProgress
        } else {
          data.currentHeight = data.targetHeight
        }
      })

      if (stillAnimating) {
        animationFrameRef.current = requestAnimationFrame(animate)
      } else {
        setIsAnimating(false)
      }
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isAnimating, enabled, duration, easing, frameInterval])

  // Get current interpolated height for a dong
  const getInterpolatedHeight = useCallback((dongCode: number): number => {
    const data = heightMapRef.current.get(dongCode)
    return data ? data.currentHeight : 0
  }, [])

  // Get all interpolated heights as a Map
  const getInterpolatedHeights = useCallback((): Map<number, number> => {
    const result = new Map<number, number>()
    heightMapRef.current.forEach((data, code) => {
      result.set(code, data.currentHeight)
    })
    return result
  }, [])

  // Force update to specific height (useful for hover effects)
  const setImmediateHeight = useCallback((dongCode: number, height: number) => {
    const data = heightMapRef.current.get(dongCode)
    if (data) {
      data.currentHeight = height
      data.targetHeight = height
      data.startHeight = height
    } else {
      heightMapRef.current.set(dongCode, {
        dongCode,
        currentHeight: height,
        targetHeight: height,
        startHeight: height,
        startTime: Date.now()
      })
    }
  }, [])

  // Check if a specific dong is animating
  const isDongAnimating = useCallback((dongCode: number): boolean => {
    if (!isAnimating) return false
    const data = heightMapRef.current.get(dongCode)
    if (!data) return false
    return data.currentHeight !== data.targetHeight
  }, [isAnimating])

  return {
    updateTargetHeights,
    getInterpolatedHeight,
    getInterpolatedHeights,
    setImmediateHeight,
    isDongAnimating,
    isAnimating
  }
}