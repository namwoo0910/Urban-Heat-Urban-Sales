/**
 * Ambient Animation Hook
 *
 * Manages time-based animations for ambient district highlighting effects.
 * Provides smooth, performance-optimized animation states for visual effects.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { AmbientEffectConfig } from '../utils/ambientEffects'
import {
  calculateBreathingOpacity,
  calculateShimmerColor,
  calculateExpansionRadius,
  easingFunctions
} from '../utils/ambientEffects'
import type { RGBAColor } from '@deck.gl/core'

export interface AnimationState {
  timestamp: number
  breathingOpacity: number
  expansionRadius: number
  shimmerColor: RGBAColor | null
  isAnimating: boolean
}

export interface AmbientAnimationOptions {
  enabled?: boolean
  speed?: number
  intensity?: number
  autoStart?: boolean
  targetColor?: RGBAColor
}

const DEFAULT_OPTIONS: Required<AmbientAnimationOptions> = {
  enabled: true,
  speed: 1.0,
  intensity: 1.0,
  autoStart: true,
  targetColor: [59, 130, 246, 255]
}

/**
 * Hook for managing ambient animation state
 */
export function useAmbientAnimation(
  config: AmbientEffectConfig,
  options: AmbientAnimationOptions = {}
) {
  const opts = useMemo(() => ({ ...DEFAULT_OPTIONS, ...options }), [
    options.enabled,
    options.speed,
    options.intensity,
    options.autoStart,
    options.targetColor
  ])
  const animationFrameRef = useRef<number>()
  const startTimeRef = useRef<number>(Date.now())
  const lastUpdateRef = useRef<number>(0)
  const lastStateUpdateRef = useRef<number>(0) // Track last state update time

  const [animationState, setAnimationState] = useState<AnimationState>({
    timestamp: 0,
    breathingOpacity: 1.0,
    expansionRadius: DEFAULT_AMBIENT_CONFIG.glowRadius, // Use default instead of config
    shimmerColor: null,
    isAnimating: false
  })

  const [isActive, setIsActive] = useState(opts.autoStart && opts.enabled)

  // Animation loop
  const animate = useCallback((currentTime: number) => {
    if (!isActive || !config.enableAnimation) return

    const deltaTime = currentTime - lastUpdateRef.current

    // Throttle to 60fps for performance
    if (deltaTime < 16.67) {
      animationFrameRef.current = requestAnimationFrame(animate)
      return
    }

    const timestamp = currentTime - startTimeRef.current

    // Calculate breathing opacity
    const breathingOpacity = calculateBreathingOpacity(
      timestamp,
      1.0,
      config.animationSpeed * opts.speed,
      0.4 * opts.intensity
    )

    // Calculate expansion radius
    const expansionRadius = calculateExpansionRadius(
      config.glowRadius,
      timestamp,
      0.2 * opts.intensity,
      config.animationSpeed * opts.speed * 1.5
    )

    // Calculate shimmer color if target color is provided
    const shimmerColor = opts.targetColor ? calculateShimmerColor(
      opts.targetColor,
      timestamp,
      config.animationSpeed * opts.speed * 0.5,
      0.1 * opts.intensity
    ) : null

    // Throttle state updates to reduce re-renders (update every 100ms max)
    const stateUpdateDelta = currentTime - lastStateUpdateRef.current
    if (stateUpdateDelta >= 100) {
      setAnimationState({
        timestamp,
        breathingOpacity,
        expansionRadius,
        shimmerColor,
        isAnimating: true
      })
      lastStateUpdateRef.current = currentTime
    }

    lastUpdateRef.current = currentTime
    animationFrameRef.current = requestAnimationFrame(animate)
  }, [isActive, config, opts])

  // Start animation
  const startAnimation = useCallback(() => {
    if (!opts.enabled) return

    setIsActive(true)
    startTimeRef.current = Date.now()
    lastUpdateRef.current = 0

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    animationFrameRef.current = requestAnimationFrame(animate)
  }, [animate, opts.enabled])

  // Stop animation
  const stopAnimation = useCallback(() => {
    setIsActive(false)

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = undefined
    }

    setAnimationState(prev => ({
      ...prev,
      isAnimating: false
    }))
  }, [])

  // Toggle animation
  const toggleAnimation = useCallback(() => {
    if (isActive) {
      stopAnimation()
    } else {
      startAnimation()
    }
  }, [isActive, startAnimation, stopAnimation])

  // Reset animation to initial state
  const resetAnimation = useCallback(() => {
    // Directly stop animation without using stopAnimation callback
    setIsActive(false)
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = undefined
    }

    startTimeRef.current = Date.now()
    setAnimationState({
      timestamp: 0,
      breathingOpacity: 1.0,
      expansionRadius: DEFAULT_AMBIENT_CONFIG.glowRadius, // Use default
      shimmerColor: null,
      isAnimating: false
    })
  }, [])

  // Start animation when component mounts and options change
  useEffect(() => {
    const shouldStart = opts.autoStart && opts.enabled && config.enableAnimation

    if (shouldStart) {
      // Inline start logic to avoid dependency
      setIsActive(true)
      startTimeRef.current = Date.now()
      lastUpdateRef.current = 0

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      animationFrameRef.current = requestAnimationFrame(animate)
    } else {
      // Inline stop logic to avoid dependency
      setIsActive(false)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = undefined
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [opts.enabled, opts.autoStart, config.enableAnimation, animate])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  return {
    animationState,
    isActive,
    startAnimation,
    stopAnimation,
    toggleAnimation,
    resetAnimation
  }
}

/**
 * Hook for transition animations between states
 */
export function useTransitionAnimation(
  duration: number = 500,
  easing: (t: number) => number = easingFunctions.easeInOut
) {
  const [progress, setProgress] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const animationFrameRef = useRef<number>()
  const startTimeRef = useRef<number>(0)

  const startTransition = useCallback(() => {
    setIsTransitioning(true)
    setProgress(0)
    startTimeRef.current = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current
      const rawProgress = Math.min(elapsed / duration, 1)
      const easedProgress = easing(rawProgress)

      setProgress(easedProgress)

      if (rawProgress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate)
      } else {
        setIsTransitioning(false)
      }
    }

    animationFrameRef.current = requestAnimationFrame(animate)
  }, [duration, easing])

  const stopTransition = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    setIsTransitioning(false)
    setProgress(1)
  }, [])

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  return {
    progress,
    isTransitioning,
    startTransition,
    stopTransition
  }
}

/**
 * Hook for managing multiple district animations
 */
export function useMultiDistrictAnimation(
  selectedDistricts: string[],
  config: AmbientEffectConfig,
  options: AmbientAnimationOptions = {}
) {
  const [districtAnimations, setDistrictAnimations] = useState<Map<string, AnimationState>>(new Map())
  const animationFrameRef = useRef<number>()
  const startTimeRef = useRef<number>(Date.now())

  const opts = useMemo(() => ({ ...DEFAULT_OPTIONS, ...options }), [
    options.enabled,
    options.speed,
    options.intensity,
    options.autoStart,
    options.targetColor
  ])

  const updateAnimations = useCallback((currentTime: number) => {
    if (!opts.enabled || !config.enableAnimation || selectedDistricts.length === 0) {
      return
    }

    const timestamp = currentTime - startTimeRef.current
    const newAnimations = new Map<string, AnimationState>()

    selectedDistricts.forEach(district => {
      const breathingOpacity = calculateBreathingOpacity(
        timestamp,
        1.0,
        config.animationSpeed * opts.speed,
        0.4 * opts.intensity
      )

      const expansionRadius = calculateExpansionRadius(
        config.glowRadius,
        timestamp,
        0.2 * opts.intensity,
        config.animationSpeed * opts.speed * 1.5
      )

      const shimmerColor = opts.targetColor ? calculateShimmerColor(
        opts.targetColor,
        timestamp,
        config.animationSpeed * opts.speed * 0.5,
        0.1 * opts.intensity
      ) : null

      newAnimations.set(district, {
        timestamp,
        breathingOpacity,
        expansionRadius,
        shimmerColor,
        isAnimating: true
      })
    })

    setDistrictAnimations(newAnimations)
    animationFrameRef.current = requestAnimationFrame(updateAnimations)
  }, [selectedDistricts, config, opts])

  useEffect(() => {
    if (selectedDistricts.length > 0 && opts.enabled && config.enableAnimation) {
      startTimeRef.current = Date.now()
      animationFrameRef.current = requestAnimationFrame(updateAnimations)
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      setDistrictAnimations(new Map())
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [selectedDistricts, updateAnimations, opts.enabled, config.enableAnimation])

  return districtAnimations
}