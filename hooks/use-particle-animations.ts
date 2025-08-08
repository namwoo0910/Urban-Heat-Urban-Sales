import { useState, useCallback, useRef, useEffect } from 'react'
import type { ParticleData } from '@/utils/particle-data'

export interface AnimationConfig {
  layerType: 'particle' | 'wave'
  waveEnabled: boolean
  waveSpeed: number
  waveAmplitude: number
  pulseEnabled: boolean
  pulseSpeed: number
  pulseIntensity: number
  colorCycleEnabled: boolean
  colorCycleSpeed: number
  orbitalEnabled: boolean
  orbitalSpeed: number
  orbitalRadius: number
  trailEnabled: boolean
  trailLength: number
  fireflyEnabled: boolean
  fireflySpeed: number
  fireflyRandomness: number
  flowFieldEnabled: boolean
  flowFieldStrength: number
  attractionEnabled: boolean
  attractionStrength: number
  morphEnabled: boolean
  morphSpeed: number
  autoRotateEnabled: boolean
  autoRotateSpeed: number
  colorTheme: 'current' | 'ocean' | 'sunset' | 'forest' | 'aurora' | 'galaxy' | 'cyberpunk'
  // Wave layer specific controls
  wavePattern: 'sine' | 'triangle' | 'sawtooth' | 'square'
  waveColorIntensity: number
  waveHeightMultiplier: number
  waveAnimationSpeed: number
  waveEdgeGlow: number
}

export interface AnimationState {
  time: number
  frameCount: number
  isAnimating: boolean
  particleHistory: Map<number, Array<[number, number]>>
}

interface AnimatedParticle {
  position: [number, number]
  color: [number, number, number, number]
  size: number
  opacity?: number
  trail?: Array<[number, number]>
}

// Default animation configuration - balanced for smooth animations
export const defaultAnimationConfig: AnimationConfig = {
  layerType: 'particle',
  waveEnabled: true,
  waveSpeed: 0.002,       // Smooth wave motion
  waveAmplitude: 0.001,   // Subtle wave amplitude
  pulseEnabled: true,
  pulseSpeed: 0.003,      // Gentle pulsing
  pulseIntensity: 0.3,    // Moderate intensity
  colorCycleEnabled: true,
  colorCycleSpeed: 0.0008, // Slow, subtle color shifting
  orbitalEnabled: false,
  orbitalSpeed: 0.001,
  orbitalRadius: 0.002,
  trailEnabled: false,
  trailLength: 5,
  fireflyEnabled: true,
  fireflySpeed: 0.001,     // Gentle firefly motion
  fireflyRandomness: 0.6,  // Moderate randomness
  flowFieldEnabled: false,
  flowFieldStrength: 0.001,
  attractionEnabled: false,
  attractionStrength: 0.0001,
  morphEnabled: false,
  morphSpeed: 0.001,
  autoRotateEnabled: false,
  autoRotateSpeed: 0.2,    // Rotation speed (degrees per frame)
  colorTheme: 'current',   // Default to current color palette
  // Wave layer defaults
  wavePattern: 'sine',
  waveColorIntensity: 1.0,
  waveHeightMultiplier: 1.0,
  waveAnimationSpeed: 1.0,
  waveEdgeGlow: 0.0  // Disabled by default
}

/**
 * Advanced particle animation hook
 */
export function useParticleAnimations(
  particles: ParticleData[],
  config: AnimationConfig = defaultAnimationConfig
) {
  const [animationState, setAnimationState] = useState<AnimationState>({
    time: 0,
    frameCount: 0,
    isAnimating: true,
    particleHistory: new Map(),
  })

  const animationFrameRef = useRef<number | undefined>(undefined)
  const startTimeRef = useRef<number>(Date.now())
  const lastFrameTimeRef = useRef<number>(Date.now())

  // Wave animation
  const applyWaveAnimation = useCallback(
    (particle: ParticleData, time: number): [number, number] => {
      if (!config.waveEnabled) return particle.position

      const waveX = Math.sin(time * config.waveSpeed + particle.phase) * config.waveAmplitude
      const waveY = Math.cos(time * config.waveSpeed * 0.7 + particle.phase) * config.waveAmplitude * 0.7

      return [
        particle.position[0] + waveX,
        particle.position[1] + waveY,
      ]
    },
    [config.waveEnabled, config.waveSpeed, config.waveAmplitude]
  )

  // Pulse animation (size and opacity)
  const applyPulseAnimation = useCallback(
    (particle: ParticleData, time: number): { size: number; opacity: number } => {
      if (!config.pulseEnabled) {
        return { size: particle.size, opacity: 1 }
      }

      const pulse = Math.sin(time * config.pulseSpeed + particle.phase * 2)
      const sizeFactor = 1 + pulse * config.pulseIntensity * 0.5
      const opacityFactor = 0.7 + pulse * config.pulseIntensity * 0.3

      return {
        size: particle.size * sizeFactor,
        opacity: opacityFactor,
      }
    },
    [config.pulseEnabled, config.pulseSpeed, config.pulseIntensity]
  )

  // Color cycle animation
  const applyColorCycle = useCallback(
    (particle: ParticleData, time: number): [number, number, number] => {
      if (!config.colorCycleEnabled) return particle.color

      // HSL color cycling
      const hueShift = (time * config.colorCycleSpeed + particle.phase) % (Math.PI * 2)
      const [r, g, b] = particle.color

      // Simple hue rotation
      const cos = Math.cos(hueShift)
      const sin = Math.sin(hueShift)
      
      const newR = r * (cos + (1 - cos) / 3) + g * ((1 - cos) / 3 - Math.sqrt(1/3) * sin) + b * ((1 - cos) / 3 + Math.sqrt(1/3) * sin)
      const newG = r * ((1 - cos) / 3 + Math.sqrt(1/3) * sin) + g * (cos + (1 - cos) / 3) + b * ((1 - cos) / 3 - Math.sqrt(1/3) * sin)
      const newB = r * ((1 - cos) / 3 - Math.sqrt(1/3) * sin) + g * ((1 - cos) / 3 + Math.sqrt(1/3) * sin) + b * (cos + (1 - cos) / 3)

      return [
        Math.max(0, Math.min(255, newR)),
        Math.max(0, Math.min(255, newG)),
        Math.max(0, Math.min(255, newB)),
      ]
    },
    [config.colorCycleEnabled, config.colorCycleSpeed]
  )

  // Orbital motion animation
  const applyOrbitalMotion = useCallback(
    (particle: ParticleData, time: number, index: number): [number, number] => {
      if (!config.orbitalEnabled) return particle.position

      const angle = time * config.orbitalSpeed + (index * Math.PI * 2) / 100
      const orbX = Math.cos(angle) * config.orbitalRadius
      const orbY = Math.sin(angle) * config.orbitalRadius

      return [
        particle.position[0] + orbX,
        particle.position[1] + orbY,
      ]
    },
    [config.orbitalEnabled, config.orbitalSpeed, config.orbitalRadius]
  )

  // Firefly effect (random twinkling and movement)
  const applyFireflyEffect = useCallback(
    (particle: ParticleData, time: number): { position: [number, number]; opacity: number } => {
      if (!config.fireflyEnabled) {
        return { position: particle.position, opacity: 1 }
      }

      // Random twinkling
      const twinkle = Math.random() > 0.98 ? 0.3 : 1
      
      // Random movement
      const randomX = (Math.random() - 0.5) * config.fireflySpeed * config.fireflyRandomness
      const randomY = (Math.random() - 0.5) * config.fireflySpeed * config.fireflyRandomness

      return {
        position: [
          particle.position[0] + randomX,
          particle.position[1] + randomY,
        ],
        opacity: twinkle,
      }
    },
    [config.fireflyEnabled, config.fireflySpeed, config.fireflyRandomness]
  )

  // Flow field animation
  const applyFlowField = useCallback(
    (particle: ParticleData, time: number): [number, number] => {
      if (!config.flowFieldEnabled) return particle.position

      // Simple Perlin-like noise simulation
      const noiseX = Math.sin(particle.position[0] * 100 + time * 0.001) * config.flowFieldStrength
      const noiseY = Math.cos(particle.position[1] * 100 + time * 0.001) * config.flowFieldStrength

      return [
        particle.position[0] + noiseX,
        particle.position[1] + noiseY,
      ]
    },
    [config.flowFieldEnabled, config.flowFieldStrength]
  )

  // Combine all animations
  const animateParticles = useCallback(
    (particles: ParticleData[], time: number): AnimatedParticle[] => {
      return particles.map((particle, index) => {
        // Apply position animations
        let position = particle.position
        
        if (config.waveEnabled) {
          position = applyWaveAnimation(particle, time)
        }
        
        if (config.orbitalEnabled) {
          position = applyOrbitalMotion(particle, time, index)
        }
        
        if (config.flowFieldEnabled) {
          position = applyFlowField(particle, time)
        }
        
        if (config.fireflyEnabled) {
          const firefly = applyFireflyEffect(particle, time)
          position = firefly.position
        }

        // Apply visual animations
        const pulse = applyPulseAnimation(particle, time)
        const color = applyColorCycle(particle, time)

        // Store trail history
        if (config.trailEnabled) {
          const history = animationState.particleHistory.get(index) || []
          history.push(position)
          if (history.length > config.trailLength) {
            history.shift()
          }
          animationState.particleHistory.set(index, history)
        }

        return {
          position,
          color: [...color, pulse.opacity * 255] as [number, number, number, number],
          size: pulse.size,
          opacity: pulse.opacity,
          trail: config.trailEnabled ? animationState.particleHistory.get(index) : undefined,
        }
      })
    },
    [
      config,
      applyWaveAnimation,
      applyPulseAnimation,
      applyColorCycle,
      applyOrbitalMotion,
      applyFireflyEffect,
      applyFlowField,
      animationState.particleHistory,
    ]
  )

  // Animation loop with improved config dependency
  useEffect(() => {
    if (!animationState.isAnimating) return

    const animate = () => {
      const currentTime = Date.now()
      const deltaTime = currentTime - lastFrameTimeRef.current
      const elapsedTime = currentTime - startTimeRef.current

      // Only update if enough time has passed (performance optimization)
      if (deltaTime >= 16) { // ~60fps max
        setAnimationState(prev => ({
          ...prev,
          time: elapsedTime,
          frameCount: prev.frameCount + 1,
        }))
        lastFrameTimeRef.current = currentTime
      }

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [animationState.isAnimating, config])

  // Control functions
  const toggleAnimation = useCallback(() => {
    setAnimationState(prev => ({
      ...prev,
      isAnimating: !prev.isAnimating,
    }))
  }, [])

  const resetAnimation = useCallback(() => {
    startTimeRef.current = Date.now()
    setAnimationState({
      time: 0,
      frameCount: 0,
      isAnimating: true,
      particleHistory: new Map(),
    })
  }, [])

  return {
    animationState,
    animateParticles,
    toggleAnimation,
    resetAnimation,
    config,
  }
}

export default useParticleAnimations