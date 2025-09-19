/**
 * Temperature-based mesh colors
 * - Cold → Blue, Cool → Cyan, Mild → Green, Warm → Amber/Orange, Hot → Red
 * - Designed for dark maps with vivid yet refined tones
 */

import type { RGBAColor } from '@deck.gl/core'
import { rgbToHex } from '@/src/shared/utils/colorUtils'

interface Stop { t: number; rgb: [number, number, number] }

// Temperature range (°C) normalized to [-15, 35]
const MIN_T = -15
const MAX_T = 35

// Multi-stop gradient for sleek result (no flat single color)
const STOPS: Stop[] = [
  { t: -15, rgb: [30, 64, 175] },   // #1E40AF  deep blue
  { t:  -5, rgb: [37, 99, 235] },   // #2563EB  blue
  { t:   5, rgb: [34, 211, 238] },  // #22D3EE  cyan
  { t:  15, rgb: [52, 211, 153] },  // #34D399  emerald
  { t:  25, rgb: [245, 158, 11] },  // #F59E0B  amber
  { t:  30, rgb: [251, 146, 60] },  // #FB923C  orange
  { t:  35, rgb: [239, 68, 68] },   // #EF4444  red
]

function lerp(a: number, b: number, p: number): number { return a + (b - a) * p }

function clamp(v: number, min: number, max: number): number { return Math.max(min, Math.min(max, v)) }

// Find surrounding stops and interpolate
function interpolateColor(tC: number): [number, number, number] {
  const t = clamp(tC, MIN_T, MAX_T)
  for (let i = 0; i < STOPS.length - 1; i++) {
    const a = STOPS[i]
    const b = STOPS[i + 1]
    if (t >= a.t && t <= b.t) {
      const p = (t - a.t) / (b.t - a.t)
      const r = Math.round(lerp(a.rgb[0], b.rgb[0], p))
      const g = Math.round(lerp(a.rgb[1], b.rgb[1], p))
      const bC = Math.round(lerp(a.rgb[2], b.rgb[2], p))
      return [r, g, bC]
    }
  }
  // Fallback
  return STOPS[STOPS.length - 1].rgb
}

/** Map temperature (°C) to mesh RGBA color */
export function getTemperatureMeshColor(tempC: number | null | undefined, alpha: number = 255): RGBAColor {
  const [r, g, b] = interpolateColor(typeof tempC === 'number' ? tempC : 0)
  return [r, g, b, alpha]
}

/** Returns temperature-based color as hex string (alpha ignored) */
export function getTemperatureMeshHexColor(tempC: number | null | undefined): string {
  const [r, g, b] = getTemperatureMeshColor(tempC)
  return rgbToHex(r, g, b)
}

