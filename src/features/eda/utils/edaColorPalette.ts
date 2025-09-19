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
  },
  // Pastel tone themes
  pastelBlue: {
    name: 'Pastel Blue',
    colors: [
      [100, 181, 246],    // Medium blue (more saturated)
      [79, 195, 247],     // Light blue (more saturated)
      [129, 212, 250],    // Sky blue (more saturated)
      [66, 165, 245],     // Bright blue (more saturated)
      [144, 202, 249]     // Soft blue (more saturated)
    ] as RGBAColor[]
  },
  pastelPink: {
    name: 'Pastel Pink',
    colors: [
      [255, 182, 193],    // Light pink
      [255, 192, 203],    // Pink
      [255, 218, 225],    // Misty rose
      [252, 202, 214],    // Rose pink
      [244, 194, 194]     // Soft pink
    ] as RGBAColor[]
  },
  pastelGreen: {
    name: 'Pastel Green',
    colors: [
      [152, 251, 152],    // Pale green
      [193, 225, 193],    // Sage green
      [216, 240, 211],    // Tea green
      [183, 240, 190],    // Mint green
      [208, 240, 192]     // Pale lime
    ] as RGBAColor[]
  },
  pastelPurple: {
    name: 'Pastel Purple',
    colors: [
      [230, 230, 250],    // Lavender
      [216, 191, 216],    // Thistle
      [221, 160, 221],    // Plum
      [218, 189, 246],    // Light purple
      [199, 177, 214]     // Lilac
    ] as RGBAColor[]
  },
  pastelYellow: {
    name: 'Pastel Yellow',
    colors: [
      [255, 253, 208],    // Cream
      [255, 250, 205],    // Lemon chiffon
      [255, 255, 224],    // Light yellow
      [250, 250, 210],    // Light goldenrod
      [255, 248, 198]     // Buttercup
    ] as RGBAColor[]
  },
  pastelCoral: {
    name: 'Pastel Coral',
    colors: [
      [255, 218, 185],    // Peach puff
      [255, 228, 196],    // Bisque
      [255, 204, 180],    // Peach
      [250, 200, 178],    // Apricot
      [255, 192, 178]     // Salmon pink
    ] as RGBAColor[]
  },
  pastelGray: {
    name: 'Pastel Gray',
    colors: [
      [220, 220, 220],    // Gainsboro
      [211, 211, 211],    // Light gray
      [192, 192, 192],    // Silver
      [201, 201, 201],    // Gray goose
      [229, 229, 229]     // Platinum
    ] as RGBAColor[]
  },
  pastelMint: {
    name: 'Pastel Mint',
    colors: [
      [189, 252, 238],    // Ice mint
      [175, 238, 238],    // Pale turquoise
      [209, 255, 247],    // Seafoam
      [188, 234, 234],    // Cool mint
      [224, 255, 255]     // Light cyan
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

  // Get base color first
  let baseColor: RGBAColor

  // Get the base theme color
  if (useUniqueColors && guName && DISTRICT_UNIQUE_COLORS[guName]) {
    baseColor = [...DISTRICT_UNIQUE_COLORS[guName]] as RGBAColor
    baseColor[3] = 160 // Adjust base opacity
  } else {
    const districtIndex = guName ?
      Object.keys(DISTRICT_UNIQUE_COLORS).indexOf(guName) :
      Math.floor(Math.random() * 25)
    baseColor = getGradientColor(districtIndex, theme)
  }

  // Apply state-based modifications to theme colors
  if (isSelectedGu || isSelectedDong) {
    // Darken the theme color by 40% for selection
    const darkenFactor = 0.6
    return [
      Math.round(baseColor[0] * darkenFactor),
      Math.round(baseColor[1] * darkenFactor),
      Math.round(baseColor[2] * darkenFactor),
      200 // Higher opacity for selected
    ] as RGBAColor
  }

  if (isHovered) {
    // Slightly darken for hover (20% darker)
    const darkenFactor = 0.8
    return [
      Math.round(baseColor[0] * darkenFactor),
      Math.round(baseColor[1] * darkenFactor),
      Math.round(baseColor[2] * darkenFactor),
      190 // Slightly higher opacity for hover
    ] as RGBAColor
  }

  return baseColor
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

// Ambient effect color schemes for sophisticated highlighting
export const AMBIENT_EFFECT_COLORS = {
  azure: {
    name: 'Azure Glow',
    primary: [59, 130, 246, 255] as RGBAColor,
    secondary: [147, 197, 253, 255] as RGBAColor,
    accent: [37, 99, 235, 255] as RGBAColor,
    shadow: [30, 64, 175, 180] as RGBAColor,
    gradient: [
      [59, 130, 246, 255],   // Primary blue
      [96, 165, 250, 240],   // Light blue
      [147, 197, 253, 220],  // Sky blue
      [191, 219, 254, 200],  // Pale blue
      [219, 234, 254, 180]   // Very light blue
    ] as RGBAColor[]
  },
  emerald: {
    name: 'Emerald Glow',
    primary: [16, 185, 129, 255] as RGBAColor,
    secondary: [110, 231, 183, 255] as RGBAColor,
    accent: [5, 150, 105, 255] as RGBAColor,
    shadow: [6, 120, 83, 180] as RGBAColor,
    gradient: [
      [16, 185, 129, 255],   // Primary emerald
      [52, 211, 153, 240],   // Light emerald
      [110, 231, 183, 220],  // Mint green
      [167, 243, 208, 200],  // Pale mint
      [209, 250, 229, 180]   // Very light mint
    ] as RGBAColor[]
  },
  violet: {
    name: 'Violet Glow',
    primary: [139, 92, 246, 255] as RGBAColor,
    secondary: [196, 181, 253, 255] as RGBAColor,
    accent: [124, 58, 237, 255] as RGBAColor,
    shadow: [109, 40, 217, 180] as RGBAColor,
    gradient: [
      [139, 92, 246, 255],   // Primary violet
      [167, 139, 250, 240],  // Light violet
      [196, 181, 253, 220],  // Lavender
      [221, 214, 254, 200],  // Pale lavender
      [237, 233, 254, 180]   // Very light lavender
    ] as RGBAColor[]
  },
  rose: {
    name: 'Rose Glow',
    primary: [244, 63, 94, 255] as RGBAColor,
    secondary: [251, 113, 133, 255] as RGBAColor,
    accent: [225, 29, 72, 255] as RGBAColor,
    shadow: [190, 18, 60, 180] as RGBAColor,
    gradient: [
      [244, 63, 94, 255],    // Primary rose
      [251, 113, 133, 240],  // Light rose
      [252, 165, 165, 220],  // Pink
      [254, 205, 211, 200],  // Pale pink
      [255, 228, 230, 180]   // Very light pink
    ] as RGBAColor[]
  },
  amber: {
    name: 'Amber Glow',
    primary: [245, 158, 11, 255] as RGBAColor,
    secondary: [251, 191, 36, 255] as RGBAColor,
    accent: [217, 119, 6, 255] as RGBAColor,
    shadow: [180, 83, 9, 180] as RGBAColor,
    gradient: [
      [245, 158, 11, 255],   // Primary amber
      [251, 191, 36, 240],   // Light amber
      [252, 211, 77, 220],   // Yellow
      [254, 240, 138, 200],  // Pale yellow
      [255, 251, 235, 180]   // Very light yellow
    ] as RGBAColor[]
  },
  crystal: {
    name: 'Crystal Glow',
    primary: [168, 162, 158, 255] as RGBAColor,
    secondary: [214, 211, 209, 255] as RGBAColor,
    accent: [120, 113, 108, 255] as RGBAColor,
    shadow: [87, 83, 78, 180] as RGBAColor,
    gradient: [
      [168, 162, 158, 255],  // Primary crystal
      [196, 181, 253, 240],  // Light crystal
      [214, 211, 209, 220],  // Silver
      [231, 229, 228, 200],  // Pale silver
      [250, 250, 249, 180]   // Very light silver
    ] as RGBAColor[]
  }
} as const

export type AmbientEffectKey = keyof typeof AMBIENT_EFFECT_COLORS

/**
 * Get ambient effect colors for a specific theme
 */
export function getAmbientEffectColors(
  theme: ThemeKey,
  effectKey: AmbientEffectKey = 'azure'
): typeof AMBIENT_EFFECT_COLORS[AmbientEffectKey] {
  // Map themes to appropriate ambient effects
  const themeMapping: Record<ThemeKey, AmbientEffectKey> = {
    ocean: 'azure',
    pastelBlue: 'azure',
    modern: 'azure',
    aurora: 'violet',
    pastelPurple: 'violet',
    hologram: 'violet',
    sunset: 'amber',
    pastelYellow: 'amber',
    pastelCoral: 'rose',
    pastelPink: 'rose',
    pastelGreen: 'emerald',
    pastelMint: 'emerald',
    cyberpunk: 'crystal',
    pastelGray: 'crystal'
  }

  const mappedEffect = themeMapping[theme] || effectKey
  return AMBIENT_EFFECT_COLORS[mappedEffect]
}

/**
 * Create ambient glow color with custom opacity
 */
export function createAmbientGlowColor(
  baseColor: RGBAColor,
  opacity: number,
  glowIntensity: number = 1.0
): RGBAColor {
  const [r, g, b] = baseColor

  // Enhance color saturation for glow effect
  const enhancedR = Math.min(255, Math.round(r * (1 + glowIntensity * 0.2)))
  const enhancedG = Math.min(255, Math.round(g * (1 + glowIntensity * 0.2)))
  const enhancedB = Math.min(255, Math.round(b * (1 + glowIntensity * 0.2)))

  return [enhancedR, enhancedG, enhancedB, Math.round(opacity * 255)] as RGBAColor
}

/**
 * Generate gradient colors for multi-layered ambient effects
 */
export function generateAmbientGradient(
  baseColor: RGBAColor,
  steps: number = 5,
  maxOpacity: number = 1.0,
  minOpacity: number = 0.1
): RGBAColor[] {
  const [r, g, b] = baseColor
  const gradient: RGBAColor[] = []

  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1)
    const opacity = maxOpacity - (maxOpacity - minOpacity) * t

    // Gradually lighten the color for outer layers
    const lightness = 1 + t * 0.3
    const gradientR = Math.min(255, Math.round(r * lightness))
    const gradientG = Math.min(255, Math.round(g * lightness))
    const gradientB = Math.min(255, Math.round(b * lightness))

    gradient.push([gradientR, gradientG, gradientB, Math.round(opacity * 255)] as RGBAColor)
  }

  return gradient
}

/**
 * Get shadow color for ambient effects
 */
export function getAmbientShadowColor(
  baseColor: RGBAColor,
  opacity: number = 0.3
): RGBAColor {
  const [r, g, b] = baseColor

  // Darken the base color for shadow
  const shadowR = Math.round(r * 0.3)
  const shadowG = Math.round(g * 0.3)
  const shadowB = Math.round(b * 0.3)

  return [shadowR, shadowG, shadowB, Math.round(opacity * 255)] as RGBAColor
}
