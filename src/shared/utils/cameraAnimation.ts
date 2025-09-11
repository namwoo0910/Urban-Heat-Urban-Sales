/**
 * Camera Animation Utilities for Smooth Transitions
 * Provides unified easing functions and animation configurations
 */

import { CAMERA_3D_CONFIG, CAMERA_2D_CONFIG } from './district3DUtils'

// Easing Functions for smooth camera movements
export const easingFunctions = {
  // Linear (no easing)
  linear: (t: number) => t,
  
  // Quad easing
  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  
  // Cubic easing (recommended for most transitions)
  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => (--t) * t * t + 1,
  easeInOutCubic: (t: number) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  
  // Quart easing (for dramatic effects)
  easeInQuart: (t: number) => t * t * t * t,
  easeOutQuart: (t: number) => 1 - (--t) * t * t * t,
  easeInOutQuart: (t: number) => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,
  
  // Quint easing (very smooth)
  easeInQuint: (t: number) => t * t * t * t * t,
  easeOutQuint: (t: number) => 1 + (--t) * t * t * t * t,
  easeInOutQuint: (t: number) => t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * (--t) * t * t * t * t,
  
  // Sine easing (natural motion)
  easeInSine: (t: number) => 1 - Math.cos((t * Math.PI) / 2),
  easeOutSine: (t: number) => Math.sin((t * Math.PI) / 2),
  easeInOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
  
  // Exponential easing (sharp acceleration/deceleration)
  easeInExpo: (t: number) => t === 0 ? 0 : Math.pow(2, 10 * t - 10),
  easeOutExpo: (t: number) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  easeInOutExpo: (t: number) => {
    if (t === 0) return 0
    if (t === 1) return 1
    return t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2
  },
  
  // Circular easing (smooth arc motion)
  easeInCirc: (t: number) => 1 - Math.sqrt(1 - Math.pow(t, 2)),
  easeOutCirc: (t: number) => Math.sqrt(1 - Math.pow(t - 1, 2)),
  easeInOutCirc: (t: number) => {
    return t < 0.5
      ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2
      : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2
  },
  
  // Back easing (overshooting)
  easeInBack: (t: number) => {
    const c1 = 1.70158
    const c3 = c1 + 1
    return c3 * t * t * t - c1 * t * t
  },
  easeOutBack: (t: number) => {
    const c1 = 1.70158
    const c3 = c1 + 1
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
  },
  easeInOutBack: (t: number) => {
    const c1 = 1.70158
    const c2 = c1 * 1.525
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2
  },
  
  // Elastic easing (bouncy)
  easeInElastic: (t: number) => {
    const c4 = (2 * Math.PI) / 3
    return t === 0 ? 0 : t === 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4)
  },
  easeOutElastic: (t: number) => {
    const c4 = (2 * Math.PI) / 3
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1
  },
  
  // Custom smooth step (very smooth S-curve)
  smoothStep: (t: number) => {
    const t2 = t * t
    const t3 = t2 * t
    return t3 * (t * (t * 6 - 15) + 10)
  },
  
  // Custom smooth step with configurable smoothness
  smootherStep: (t: number) => {
    const t3 = t * t * t
    const t4 = t3 * t
    const t5 = t4 * t
    return t3 * (t * (t * 6 - 15) + 10)
  }
}

// Camera Animation Presets
export const CAMERA_ANIMATION_PRESETS = {
  // Quick transitions (for responsive UI)
  QUICK: {
    duration: 600,
    easing: easingFunctions.easeOutCubic,
    interpolator: 'fly' // or 'linear'
  },
  
  // Standard transitions (general use)
  STANDARD: {
    duration: 1000,
    easing: easingFunctions.easeInOutCubic,
    interpolator: 'fly'
  },
  
  // Smooth transitions (for important focus changes)
  SMOOTH: {
    duration: 1500,
    easing: easingFunctions.smoothStep,
    interpolator: 'fly'
  },
  
  // Dramatic transitions (for major view changes)
  DRAMATIC: {
    duration: 2000,
    easing: easingFunctions.easeInOutQuint,
    interpolator: 'fly'
  },
  
  // Rotation specific
  ROTATION: {
    duration: 1000,
    easing: easingFunctions.linear, // Linear for continuous rotation
    interpolator: 'linear'
  },
  
  // 3D mode toggle
  MODE_SWITCH: {
    duration: 1200,
    easing: easingFunctions.easeInOutSine,
    interpolator: 'fly'
  },
  
  // District zoom
  DISTRICT_ZOOM: {
    duration: 1800,
    easing: easingFunctions.smootherStep,
    interpolator: 'fly',
    speed: 1.2
  }
}

// Zoom level configurations
export const ZOOM_CONFIGURATIONS = {
  SEOUL_OVERVIEW: {
    zoom: 10.5,
    pitch: 20,
    bearing: 6
  },
  DISTRICT_VIEW: {
    zoom: 11.5,
    pitch: 30,
    bearing: 6
  },
  DONG_VIEW: {
    zoom: 13,
    pitch: 45,
    bearing: 6
  },
  DETAIL_VIEW: {
    zoom: 14.5,
    pitch: 50,
    bearing: 6
  },
  MODE_2D: {
    pitch: CAMERA_2D_CONFIG.pitch,
    bearing: CAMERA_2D_CONFIG.bearing
  },
  MODE_3D: {
    pitch: CAMERA_3D_CONFIG.pitch,
    bearing: CAMERA_3D_CONFIG.bearing
  }
}

// Animation frame controller for smooth updates
export class CameraAnimationController {
  private animationId: number | null = null
  private startTime: number = 0
  private duration: number = 0
  private easingFn: (t: number) => number
  private onUpdate: (progress: number) => void
  private onComplete?: () => void
  
  constructor() {
    this.easingFn = easingFunctions.easeInOutCubic
    this.onUpdate = () => {}
  }
  
  start(
    duration: number,
    easing: (t: number) => number,
    onUpdate: (progress: number) => void,
    onComplete?: () => void
  ) {
    this.stop() // Cancel any existing animation
    
    this.duration = duration
    this.easingFn = easing
    this.onUpdate = onUpdate
    this.onComplete = onComplete
    this.startTime = performance.now()
    
    this.animate()
  }
  
  private animate = () => {
    const elapsed = performance.now() - this.startTime
    const progress = Math.min(elapsed / this.duration, 1)
    const easedProgress = this.easingFn(progress)
    
    this.onUpdate(easedProgress)
    
    if (progress < 1) {
      this.animationId = requestAnimationFrame(this.animate)
    } else {
      this.animationId = null
      this.onComplete?.()
    }
  }
  
  stop() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }
  
  isAnimating(): boolean {
    return this.animationId !== null
  }
}

// Helper function to interpolate between two values
export function interpolate(start: number, end: number, progress: number): number {
  return start + (end - start) * progress
}

// Helper function to interpolate viewport states
export function interpolateViewport(
  startViewport: any,
  endViewport: any,
  progress: number
) {
  return {
    longitude: interpolate(startViewport.longitude, endViewport.longitude, progress),
    latitude: interpolate(startViewport.latitude, endViewport.latitude, progress),
    zoom: interpolate(startViewport.zoom, endViewport.zoom, progress),
    pitch: interpolate(startViewport.pitch || 0, endViewport.pitch || 0, progress),
    bearing: interpolate(startViewport.bearing || 0, endViewport.bearing || 0, progress)
  }
}

// Get recommended animation preset based on transition type
export function getAnimationPreset(transitionType: 'reset' | 'zoom' | 'rotate' | '3d-toggle' | 'district') {
  switch (transitionType) {
    case 'reset':
      return CAMERA_ANIMATION_PRESETS.STANDARD
    case 'zoom':
      return CAMERA_ANIMATION_PRESETS.SMOOTH
    case 'rotate':
      return CAMERA_ANIMATION_PRESETS.ROTATION
    case '3d-toggle':
      return CAMERA_ANIMATION_PRESETS.MODE_SWITCH
    case 'district':
      return CAMERA_ANIMATION_PRESETS.DISTRICT_ZOOM
    default:
      return CAMERA_ANIMATION_PRESETS.STANDARD
  }
}