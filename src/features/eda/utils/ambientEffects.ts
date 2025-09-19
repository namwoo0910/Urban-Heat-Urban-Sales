/**
 * Ambient Effects Utilities
 *
 * Sophisticated visual effects system for district highlighting with
 * multi-layered glows, animations, and ambient lighting.
 */

import type { RGBAColor } from '@deck.gl/core'

export interface AmbientEffectConfig {
  intensity: number
  animationSpeed: number
  glowRadius: number
  shadowOffset: number
  enableAnimation: boolean
}

export interface GlowLayer {
  id: string
  color: RGBAColor
  radius: number
  opacity: number
  offset?: [number, number]
  blendMode?: 'additive' | 'multiply' | 'overlay' | 'normal'
}

export const DEFAULT_AMBIENT_CONFIG: AmbientEffectConfig = {
  intensity: 1.0,
  animationSpeed: 1.0,
  glowRadius: 25,
  shadowOffset: 8,
  enableAnimation: true
}

/**
 * Generate multi-layered glow effects for ambient highlighting
 */
export function createGlowLayers(
  baseColor: RGBAColor,
  config: AmbientEffectConfig = DEFAULT_AMBIENT_CONFIG
): GlowLayer[] {
  const [r, g, b] = baseColor
  const { intensity, glowRadius, shadowOffset } = config

  return [
    // Shadow layer (bottom-most)
    {
      id: 'shadow',
      color: [0, 0, 0, Math.round(60 * intensity)] as RGBAColor,
      radius: glowRadius * 0.8,
      opacity: 0.4 * intensity,
      offset: [shadowOffset * 0.6, shadowOffset * 0.8],
      blendMode: 'multiply'
    },
    // Outer glow (largest radius, lowest opacity)
    {
      id: 'outer-glow',
      color: [r, g, b, Math.round(40 * intensity)] as RGBAColor,
      radius: glowRadius,
      opacity: 0.15 * intensity,
      blendMode: 'additive'
    },
    // Mid glow (medium radius and opacity)
    {
      id: 'mid-glow',
      color: [r, g, b, Math.round(90 * intensity)] as RGBAColor,
      radius: glowRadius * 0.6,
      opacity: 0.35 * intensity,
      blendMode: 'additive'
    },
    // Inner glow (smallest radius, highest opacity)
    {
      id: 'inner-glow',
      color: [r, g, b, Math.round(150 * intensity)] as RGBAColor,
      radius: glowRadius * 0.3,
      opacity: 0.6 * intensity,
      blendMode: 'additive'
    }
  ]
}

/**
 * Calculate breathing animation opacity
 */
export function calculateBreathingOpacity(
  timestamp: number,
  baseOpacity: number = 1.0,
  speed: number = 1.0,
  range: number = 0.4
): number {
  const normalizedTime = timestamp * 0.001 * speed // Convert to seconds
  const breathing = Math.sin(normalizedTime * Math.PI * 0.66) // ~3 second cycle
  const variation = (breathing + 1) * 0.5 * range // 0 to range
  return Math.max(0, Math.min(1, baseOpacity - range * 0.5 + variation))
}

/**
 * Calculate shimmer color effect
 */
export function calculateShimmerColor(
  baseColor: RGBAColor,
  timestamp: number,
  speed: number = 0.5,
  intensity: number = 0.1
): RGBAColor {
  const [r, g, b, a] = baseColor
  const normalizedTime = timestamp * 0.001 * speed

  // Convert RGB to HSL for easier color manipulation
  const hsl = rgbToHsl(r, g, b)

  // Apply shimmer effect to hue and saturation
  const hueShift = Math.sin(normalizedTime * Math.PI * 2) * intensity * 30 // ±30 degrees
  const satShift = Math.sin(normalizedTime * Math.PI * 1.5) * intensity * 0.2 // ±20%

  const newHsl: [number, number, number] = [
    (hsl[0] + hueShift + 360) % 360,
    Math.max(0, Math.min(1, hsl[1] + satShift)),
    hsl[2]
  ]

  const [newR, newG, newB] = hslToRgb(newHsl[0], newHsl[1], newHsl[2])

  return [Math.round(newR), Math.round(newG), Math.round(newB), a] as RGBAColor
}

/**
 * Calculate expansion animation radius
 */
export function calculateExpansionRadius(
  baseRadius: number,
  timestamp: number,
  expansionAmount: number = 0.2,
  speed: number = 1.5
): number {
  const normalizedTime = timestamp * 0.001 * speed
  const expansion = Math.sin(normalizedTime * Math.PI * 2) * expansionAmount
  return baseRadius * (1 + expansion)
}

/**
 * Create smooth transition between effect states
 */
export function interpolateEffectConfig(
  fromConfig: AmbientEffectConfig,
  toConfig: AmbientEffectConfig,
  progress: number
): AmbientEffectConfig {
  const t = Math.max(0, Math.min(1, progress))

  return {
    intensity: lerp(fromConfig.intensity, toConfig.intensity, t),
    animationSpeed: lerp(fromConfig.animationSpeed, toConfig.animationSpeed, t),
    glowRadius: lerp(fromConfig.glowRadius, toConfig.glowRadius, t),
    shadowOffset: lerp(fromConfig.shadowOffset, toConfig.shadowOffset, t),
    enableAnimation: toConfig.enableAnimation
  }
}

/**
 * Get WebGL blending parameters for deck.gl layers
 */
export function getBlendingParameters(blendMode: string) {
  switch (blendMode) {
    case 'additive':
      return {
        blend: true,
        blendFunc: [770, 1], // GL_SRC_ALPHA, GL_ONE
        blendEquation: 32774 // GL_FUNC_ADD
      }
    case 'multiply':
      return {
        blend: true,
        blendFunc: [774, 771], // GL_DST_COLOR, GL_ZERO
        blendEquation: 32774
      }
    case 'overlay':
      return {
        blend: true,
        blendFunc: [770, 771], // GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA
        blendEquation: 32774
      }
    default:
      return {
        blend: true,
        blendFunc: [770, 771],
        blendEquation: 32774
      }
  }
}

/**
 * Calculate ambient effect intensity based on zoom level
 */
export function getZoomBasedIntensity(zoom: number, minZoom: number = 9, maxZoom: number = 16): number {
  const normalizedZoom = Math.max(0, Math.min(1, (zoom - minZoom) / (maxZoom - minZoom)))
  return 0.3 + normalizedZoom * 0.7 // Scale from 30% to 100% intensity
}

// Utility functions
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255
  g /= 255
  b /= 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h: number, s: number
  const l = (max + min) / 2

  if (max === min) {
    h = s = 0 // achromatic
  } else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
      default: h = 0
    }
    h /= 6
  }

  return [h * 360, s, l]
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360

  const hue2rgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1/6) return p + (q - p) * 6 * t
    if (t < 1/2) return q
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
    return p
  }

  if (s === 0) {
    return [l * 255, l * 255, l * 255] // achromatic
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q

  const r = hue2rgb(p, q, h + 1/3)
  const g = hue2rgb(p, q, h)
  const b = hue2rgb(p, q, h - 1/3)

  return [r * 255, g * 255, b * 255]
}

/**
 * Easing functions for smooth animations
 */
export const easingFunctions = {
  easeInOut: (t: number): number => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeInCubic: (t: number): number => t * t * t,
  easeOutCubic: (t: number): number => (--t) * t * t + 1,
  elastic: (t: number): number => {
    if (t === 0 || t === 1) return t
    const p = 0.3
    const s = p / 4
    return Math.pow(2, -10 * t) * Math.sin((t - s) * (2 * Math.PI) / p) + 1
  }
}