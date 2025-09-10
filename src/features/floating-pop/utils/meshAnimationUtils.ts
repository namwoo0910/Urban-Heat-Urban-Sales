/**
 * Mesh Animation Utilities
 * Provides optimized animation functions for smooth mesh transformations
 */

/**
 * Wave animation parameters
 */
export interface WaveParams {
  amplitude: number
  frequency: number
  speed: number
  phase: number
}

/**
 * Calculate wave displacement for a point
 */
export function calculateWaveDisplacement(
  x: number, 
  y: number, 
  time: number, 
  params: WaveParams
): number {
  const { amplitude, frequency, speed, phase } = params
  
  // Primary wave (X-axis)
  const waveX = Math.sin((x * frequency) + (time * speed) + phase) * amplitude
  
  // Secondary wave (Y-axis) with different phase
  const waveY = Math.cos((y * frequency * 0.7) + (time * speed * 0.5) + phase) * amplitude * 0.6
  
  // Tertiary wave for complexity
  const waveXY = Math.sin((x + y) * frequency * 0.3 + (time * speed * 0.3)) * amplitude * 0.3
  
  return waveX + waveY + waveXY
}

/**
 * Radial wave effect from center point
 */
export function calculateRadialWave(
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  time: number,
  params: WaveParams
): number {
  const dx = x - centerX
  const dy = y - centerY
  const distance = Math.sqrt(dx * dx + dy * dy)
  
  // Radial wave that propagates outward
  const wave = Math.sin((distance * params.frequency) - (time * params.speed)) * params.amplitude
  
  // Damping based on distance
  const damping = Math.exp(-distance * 0.1)
  
  return wave * damping
}

/**
 * Breathing/pulsing effect
 */
export function calculateBreathing(
  time: number,
  speed: number = 0.5,
  scale: number = 0.2
): number {
  // Smooth sine wave for natural breathing
  const primaryBreath = Math.sin(time * speed) * scale
  
  // Secondary harmonic for more organic feel
  const secondaryBreath = Math.sin(time * speed * 2.1) * scale * 0.3
  
  return primaryBreath + secondaryBreath
}

/**
 * Turbulence effect for more chaotic animation
 */
export function calculateTurbulence(
  x: number,
  y: number,
  time: number,
  octaves: number = 3
): number {
  let turbulence = 0
  let amplitude = 1
  let frequency = 0.05
  
  for (let i = 0; i < octaves; i++) {
    // Simple noise approximation
    const noise = Math.sin(x * frequency + time * 0.5) * 
                  Math.cos(y * frequency + time * 0.3) * 
                  amplitude
    
    turbulence += noise
    
    // Increase frequency and decrease amplitude for each octave
    frequency *= 2
    amplitude *= 0.5
  }
  
  return turbulence
}

/**
 * Combined animation effect
 */
export interface AnimationConfig {
  wave: WaveParams
  radialWave?: {
    enabled: boolean
    centerX: number
    centerY: number
    params: WaveParams
  }
  breathing?: {
    enabled: boolean
    speed: number
    scale: number
  }
  turbulence?: {
    enabled: boolean
    octaves: number
    scale: number
  }
}

/**
 * Calculate combined mesh displacement
 */
export function calculateMeshAnimation(
  x: number,
  y: number,
  time: number,
  config: AnimationConfig
): number {
  let displacement = 0
  
  // Basic wave
  displacement += calculateWaveDisplacement(x, y, time, config.wave)
  
  // Radial wave (optional)
  if (config.radialWave?.enabled) {
    const { centerX, centerY, params } = config.radialWave
    displacement += calculateRadialWave(x, y, centerX, centerY, time, params)
  }
  
  // Breathing effect (optional)
  if (config.breathing?.enabled) {
    const { speed, scale } = config.breathing
    displacement *= (1 + calculateBreathing(time, speed, scale))
  }
  
  // Turbulence (optional)
  if (config.turbulence?.enabled) {
    const { octaves, scale } = config.turbulence
    displacement += calculateTurbulence(x, y, time, octaves) * scale
  }
  
  return displacement
}

/**
 * Easing functions for smooth transitions
 */
export const Easing = {
  linear: (t: number) => t,
  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => (--t) * t * t + 1,
  easeInOutCubic: (t: number) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  easeInOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2
}

/**
 * Smooth transition between animation states
 */
export class AnimationTransition {
  private fromValue: number = 0
  private toValue: number = 0
  private duration: number = 1000
  private startTime: number = 0
  private easingFn: (t: number) => number = Easing.easeInOutCubic
  
  constructor(duration: number = 1000, easing: (t: number) => number = Easing.easeInOutCubic) {
    this.duration = duration
    this.easingFn = easing
  }
  
  start(from: number, to: number) {
    this.fromValue = from
    this.toValue = to
    this.startTime = performance.now()
  }
  
  getValue(currentTime: number = performance.now()): number {
    const elapsed = currentTime - this.startTime
    const progress = Math.min(elapsed / this.duration, 1)
    const easedProgress = this.easingFn(progress)
    
    return this.fromValue + (this.toValue - this.fromValue) * easedProgress
  }
  
  isComplete(currentTime: number = performance.now()): boolean {
    return (currentTime - this.startTime) >= this.duration
  }
}

/**
 * Performance-optimized animation frame manager
 */
export class AnimationFrameManager {
  private animationId: number | null = null
  private targetFPS: number
  private frameDuration: number
  private lastFrameTime: number = 0
  private callback: (deltaTime: number, totalTime: number) => void
  
  constructor(targetFPS: number = 60, callback: (deltaTime: number, totalTime: number) => void) {
    this.targetFPS = targetFPS
    this.frameDuration = 1000 / targetFPS
    this.callback = callback
  }
  
  start() {
    if (this.animationId !== null) return
    
    this.lastFrameTime = performance.now()
    let totalTime = 0
    
    const animate = (currentTime: number) => {
      const deltaTime = currentTime - this.lastFrameTime
      
      // Limit frame rate for consistent performance
      if (deltaTime >= this.frameDuration) {
        totalTime += deltaTime
        this.callback(deltaTime, totalTime)
        this.lastFrameTime = currentTime
      }
      
      this.animationId = requestAnimationFrame(animate)
    }
    
    this.animationId = requestAnimationFrame(animate)
  }
  
  stop() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }
  
  setTargetFPS(fps: number) {
    this.targetFPS = fps
    this.frameDuration = 1000 / fps
  }
}