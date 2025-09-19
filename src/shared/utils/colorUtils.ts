/**
 * Shared color utility functions
 * Consolidates color operations from across the codebase
 */

import type { RGBAColor } from '@deck.gl/core'

/**
 * Convert RGB values to hex string '#RRGGBB'
 * @param r - Red value (0-255)
 * @param g - Green value (0-255)
 * @param b - Blue value (0-255)
 * @returns Hex color string in uppercase
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => Math.round(v).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

/**
 * Convert RGBA array to hex string '#RRGGBB' (alpha ignored)
 * @param rgba - RGBA color array [r, g, b, a] or [r, g, b]
 * @returns Hex color string in uppercase
 */
export function rgbaToHex(rgba: RGBAColor | [number, number, number]): string {
  const [r, g, b] = rgba
  return rgbToHex(r, g, b)
}

/**
 * Linear interpolation between two colors
 * @param color1 - Start color as RGBA
 * @param color2 - End color as RGBA
 * @param t - Interpolation factor (0-1)
 * @returns Interpolated RGBA color
 */
export function interpolateColor(
  color1: RGBAColor,
  color2: RGBAColor,
  t: number
): RGBAColor {
  const factor = Math.max(0, Math.min(1, t))
  return [
    color1[0] + (color2[0] - color1[0]) * factor,
    color1[1] + (color2[1] - color1[1]) * factor,
    color1[2] + (color2[2] - color1[2]) * factor,
    color1[3] !== undefined && color2[3] !== undefined
      ? color1[3] + (color2[3] - color1[3]) * factor
      : 255
  ] as RGBAColor
}

/**
 * Multi-stop gradient interpolation
 * @param value - Value to interpolate (0-1)
 * @param stops - Array of [value, color] pairs defining gradient stops
 * @returns Interpolated RGBA color
 */
export function interpolateGradient(
  value: number,
  stops: Array<[number, RGBAColor]>
): RGBAColor {
  const v = Math.max(0, Math.min(1, value))

  // Find surrounding stops
  let lowerStop = stops[0]
  let upperStop = stops[stops.length - 1]

  for (let i = 0; i < stops.length - 1; i++) {
    if (v >= stops[i][0] && v <= stops[i + 1][0]) {
      lowerStop = stops[i]
      upperStop = stops[i + 1]
      break
    }
  }

  // Interpolate between stops
  const range = upperStop[0] - lowerStop[0]
  const t = range > 0 ? (v - lowerStop[0]) / range : 0

  return interpolateColor(lowerStop[1], upperStop[1], t)
}