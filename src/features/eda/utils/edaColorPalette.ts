/**
 * EDA Color Palette for District Visualization
 *
 * Sophisticated color system with gradients, themes, and selection states
 * for 2D district boundary visualization
 */

import type { RGBAColor } from '@deck.gl/core'

// Color gradient themes for districts
export const DISTRICT_GRADIENTS = {
  ocean: {
    name: 'Ocean',
    colors: [
      [12, 44, 132],      // Deep ocean
      [34, 94, 168],      // Ocean blue
      [65, 182, 196],     // Turquoise
      [127, 205, 187],    // Light turquoise
      [199, 233, 180]     // Seafoam
    ] as RGBAColor[]
  },
  aurora: {
    name: 'Aurora',
    colors: [
      [255, 20, 147],     // Hot pink
      [138, 43, 226],     // Blue violet
      [75, 0, 130],       // Indigo
      [0, 191, 255],      // Deep sky blue
      [173, 255, 47]      // Green yellow
    ] as RGBAColor[]
  },
  sunset: {
    name: 'Sunset',
    colors: [
      [255, 94, 77],      // Coral
      [255, 154, 0],      // Dark orange
      [255, 206, 84],     // Gold
      [163, 73, 164],     // Medium orchid
      [63, 81, 181]       // Royal blue
    ] as RGBAColor[]
  },
  hologram: {
    name: 'Hologram',
    colors: [
      [40, 0, 80],        // Deep purple
      [120, 40, 200],     // Purple
      [160, 80, 240],     // Lavender
      [200, 120, 255],    // Light cyan
      [240, 160, 255]     // Bright cyan
    ] as RGBAColor[]
  },
  modern: {
    name: 'Modern',
    colors: [
      [41, 128, 185],     // Strong blue
      [52, 152, 219],     // Sky blue
      [26, 188, 156],     // Turquoise
      [46, 204, 113],     // Emerald
      [155, 89, 182]      // Amethyst
    ] as RGBAColor[]
  },
  cyberpunk: {
    name: 'Cyberpunk',
    colors: [
      [20, 20, 30],       // Dark navy
      [255, 0, 150],      // Neon pink
      [138, 43, 226],     // Blue violet
      [0, 255, 255],      // Cyan
      [255, 255, 255]     // White
    ] as RGBAColor[]
  }
} as const

export type ThemeKey = keyof typeof DISTRICT_GRADIENTS

// Individual district colors for unique identification
export const DISTRICT_UNIQUE_COLORS: Record<string, RGBAColor> = {
  // Cool Blues - Business districts
  "강남구": [41, 128, 185, 200],
  "서초구": [52, 152, 219, 200],
  "송파구": [46, 134, 193, 200],

  // Warm Purples - Historic center
  "종로구": [142, 68, 173, 200],
  "중구": [155, 89, 182, 200],
  "용산구": [165, 105, 189, 200],

  // Teals/Cyans - Western districts
  "마포구": [26, 188, 156, 200],
  "서대문구": [22, 160, 133, 200],
  "은평구": [17, 140, 123, 200],

  // Soft Greens - Northern districts
  "노원구": [46, 204, 113, 200],
  "도봉구": [39, 174, 96, 200],
  "강북구": [32, 155, 84, 200],

  // Coral/Salmon - Western industrial
  "강서구": [231, 76, 60, 200],
  "양천구": [230, 126, 83, 200],
  "구로구": [211, 84, 66, 200],

  // Indigo/Navy - Eastern districts
  "강동구": [41, 47, 102, 200],
  "광진구": [52, 73, 128, 200],
  "성동구": [63, 81, 145, 200],

  // Amber/Gold - Southern districts
  "동작구": [243, 156, 18, 200],
  "관악구": [230, 126, 34, 200],
  "금천구": [211, 117, 42, 200],

  // Rose/Mauve - Mixed areas
  "성북구": [192, 57, 112, 200],
  "동대문구": [178, 93, 139, 200],
  "중랑구": [189, 114, 152, 200],
  "영등포구": [201, 79, 127, 200]
}

// Selection and hover state colors
export const STATE_COLORS = {
  selected: {
    fill: [59, 130, 246, 180] as RGBAColor,      // Blue highlight
    border: [37, 99, 235, 255] as RGBAColor,     // Darker blue border
    glow: [59, 130, 246, 60] as RGBAColor        // Blue glow
  },
  hover: {
    fill: [156, 163, 175, 120] as RGBAColor,     // Gray hover
    border: [107, 114, 128, 255] as RGBAColor,   // Dark gray border
    glow: [156, 163, 175, 40] as RGBAColor       // Gray glow
  },
  adjacent: {
    fill: [220, 225, 235, 100] as RGBAColor,     // Light gray
    border: [156, 163, 175, 200] as RGBAColor    // Medium gray border
  },
  default: {
    border: [209, 213, 219, 180] as RGBAColor    // Light border
  }
} as const

/**
 * Get gradient color based on district index and theme
 */
export function getGradientColor(
  districtIndex: number,
  theme: ThemeKey = 'ocean'
): RGBAColor {
  const gradient = DISTRICT_GRADIENTS[theme]
  const colorIndex = districtIndex % gradient.colors.length
  const color = [...gradient.colors[colorIndex]] as RGBAColor
  // Add alpha channel
  if (color.length === 3) {
    color.push(180)
  }
  return color
}

/**
 * Get district fill color based on selection state
 */
export function getDistrictFillColor(
  properties: any,
  selectedGu: string | null,
  selectedDong: string | null,
  hoveredDistrict: string | null,
  theme: ThemeKey = 'ocean',
  useUniqueColors: boolean = false
): RGBAColor {
  const guName = properties?.guName ||
                 properties?.SGG_NM ||
                 properties?.SIG_KOR_NM ||
                 properties?.['자치구']
  const dongName = properties?.ADM_DR_NM ||
                   properties?.dongName ||
                   properties?.DONG_NM ||
                   properties?.['행정동']

  // Check selection state
  const isSelectedGu = guName && guName === selectedGu
  const isSelectedDong = dongName && dongName === selectedDong
  const isHovered = (guName && guName === hoveredDistrict) ||
                   (dongName && dongName === hoveredDistrict)

  // Return state-based colors
  if (isSelectedGu || isSelectedDong) {
    return STATE_COLORS.selected.fill
  }

  if (isHovered) {
    return STATE_COLORS.hover.fill
  }

  // Return unique district color if enabled
  if (useUniqueColors && guName && DISTRICT_UNIQUE_COLORS[guName]) {
    const color = [...DISTRICT_UNIQUE_COLORS[guName]] as RGBAColor
    color[3] = 160 // Adjust base opacity
    return color
  }

  // Return gradient color based on district index
  const districtIndex = guName ?
    Object.keys(DISTRICT_UNIQUE_COLORS).indexOf(guName) :
    Math.floor(Math.random() * 25)

  return getGradientColor(districtIndex, theme)
}

/**
 * Get border color based on selection state
 */
export function getBorderColor(
  properties: any,
  selectedGu: string | null,
  selectedDong: string | null,
  hoveredDistrict: string | null
): RGBAColor {
  const guName = properties?.guName ||
                 properties?.SGG_NM ||
                 properties?.SIG_KOR_NM ||
                 properties?.['자치구']
  const dongName = properties?.ADM_DR_NM ||
                   properties?.dongName ||
                   properties?.DONG_NM ||
                   properties?.['행정동']

  const isSelectedGu = guName && guName === selectedGu
  const isSelectedDong = dongName && dongName === selectedDong
  const isHovered = (guName && guName === hoveredDistrict) ||
                   (dongName && dongName === hoveredDistrict)

  if (isSelectedGu || isSelectedDong) {
    return STATE_COLORS.selected.border
  }

  if (isHovered) {
    return STATE_COLORS.hover.border
  }

  return STATE_COLORS.default.border
}

/**
 * Get line width based on selection state
 */
export function getLineWidth(
  properties: any,
  selectedGu: string | null,
  selectedDong: string | null,
  baseWidth: number = 1
): number {
  const guName = properties?.guName ||
                 properties?.SGG_NM ||
                 properties?.SIG_KOR_NM ||
                 properties?.['자치구']
  const dongName = properties?.ADM_DR_NM ||
                   properties?.dongName ||
                   properties?.DONG_NM ||
                   properties?.['행정동']

  const isSelected = (guName && guName === selectedGu) ||
                    (dongName && dongName === selectedDong)

  return isSelected ? baseWidth * 2.5 : baseWidth
}

/**
 * Apply smooth transition between colors
 */
export function interpolateColor(
  from: RGBAColor,
  to: RGBAColor,
  t: number
): RGBAColor {
  const factor = Math.max(0, Math.min(1, t))
  return [
    Math.round(from[0] + (to[0] - from[0]) * factor),
    Math.round(from[1] + (to[1] - from[1]) * factor),
    Math.round(from[2] + (to[2] - from[2]) * factor),
    Math.round(from[3] + (to[3] - from[3]) * factor)
  ] as RGBAColor
}

/**
 * Create animated pulse effect for selected districts
 */
export function getPulseOpacity(timestamp: number, baseOpacity: number = 180): number {
  const pulse = Math.sin(timestamp * 0.002) * 0.2 + 0.8
  return Math.round(baseOpacity * pulse)
}

// Export theme configuration
export const THEME_CONFIGS = {
  gradient: {
    theme: 'ocean' as ThemeKey,
    useUniqueColors: false,
    opacity: 0.8
  },
  aurora: {
    theme: 'aurora' as ThemeKey,
    useUniqueColors: false,
    opacity: 0.9
  },
  hologram: {
    theme: 'hologram' as ThemeKey,
    useUniqueColors: false,
    opacity: 0.7
  },
  modern: {
    theme: 'modern' as ThemeKey,
    useUniqueColors: true,
    opacity: 0.85
  },
  cyberpunk: {
    theme: 'cyberpunk' as ThemeKey,
    useUniqueColors: false,
    opacity: 0.75
  }
} as const

export type ThemeConfig = typeof THEME_CONFIGS[keyof typeof THEME_CONFIGS]
