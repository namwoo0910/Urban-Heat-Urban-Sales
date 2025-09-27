/**
 * District Boundary Layers for EDA Visualization
 *
 * Creates sophisticated deck.gl layers with gradients and visual effects
 * for displaying Seoul district boundaries.
 */

import { GeoJsonLayer, TextLayer } from '@deck.gl/layers'
import type { FeatureCollection } from 'geojson'
import type { MapViewState, PickingInfo } from '@deck.gl/core'
import {
  getDistrictFillColor,
  getBorderColor,
  getLineWidth,
  STATE_COLORS,
  MODERN_BORDER_STYLES,
  boostSaturation,
  createCustomTheme,
  DISTRICT_GRADIENTS,
  getModernBorderStyle,
  getBorderGradientColor,
  type ThemeKey,
  type RGBAColor
} from '../../utils/edaColorPalette'
import {
  type AmbientEffectConfig,
  DEFAULT_AMBIENT_CONFIG
} from '../../utils/ambientEffects'

function lightenColor(color: any, amount: number = 0.25, alpha?: number): number[] {
  const [r = 0, g = 0, b = 0, a = 180] = color as number[]
  const clampChannel = (value: number) => Math.max(0, Math.min(255, Math.round(value)))
  const lightenChannel = (value: number) => clampChannel(value + (255 - value) * amount)
  const nextAlpha = typeof alpha === 'number' ? alpha : (typeof a === 'number' ? a : 180)

  return [
    lightenChannel(r),
    lightenChannel(g),
    lightenChannel(b),
    clampChannel(nextAlpha)
  ]
}

interface BoundaryLayerProps {
  guData: FeatureCollection | null
  dongData: FeatureCollection | null
  showGuBoundaries: boolean
  showDongBoundaries: boolean
  showLabels: boolean
  selectedGu: string | null
  selectedGuCode: number | null
  selectedDong: string | null
  hoveredDistrict: string | null
  viewState: MapViewState
  onHover?: (info: PickingInfo) => void
  onClick?: (info: PickingInfo) => void
  onDoubleClick?: (info: PickingInfo) => void
  theme?: ThemeKey
  useUniqueColors?: boolean
  selectionMode?: 'gu' | 'dong'
  fillEnabled?: boolean
  ambientConfig?: AmbientEffectConfig
  animationTimestamp?: number
  enableAmbientEffects?: boolean
  customThemeColor?: string
  isBoosted?: boolean
  saturationScale?: number
}

export function createDistrictBoundaryLayers({
  guData,
  dongData,
  showGuBoundaries,
  showDongBoundaries,
  showLabels,
  selectedGu,
  selectedGuCode,
  selectedDong,
  hoveredDistrict,
  viewState,
  onHover,
  onClick,
  onDoubleClick,
  theme = 'ocean',
  useUniqueColors = true,
  selectionMode = 'gu',
  fillEnabled = true,
  ambientConfig = DEFAULT_AMBIENT_CONFIG,
  animationTimestamp = 0,
  enableAmbientEffects = true,
  customThemeColor,
  isBoosted = false,
  saturationScale = 1.0
}: BoundaryLayerProps): any[] {
  const layers = []

  // Handle custom theme
  let actualTheme = theme
  if (theme === 'custom' && customThemeColor) {
    // Register the custom theme temporarily
    ;(DISTRICT_GRADIENTS as any).custom = createCustomTheme(customThemeColor)
    actualTheme = 'custom' as ThemeKey
  } else if (theme.endsWith('_boosted')) {
    actualTheme = theme.replace('_boosted', '') as ThemeKey
  }

  // Get selected features for glow effect
  const getSelectedGuFeatures = () => {
    if (!selectedGu || !guData) return null
    return {
      ...guData,
      features: guData.features.filter(f => {
        const name = f.properties?.guName ||
                     f.properties?.SGG_NM ||
                     f.properties?.SIG_KOR_NM ||
                     f.properties?.['자치구']
        return name === selectedGu
      })
    }
  }

  const getSelectedDongFeatures = () => {
    if (!selectedDong || !dongData) return null
    return {
      ...dongData,
      features: dongData.features.filter(f => {
        const name = f.properties?.ADM_DR_NM ||
                     f.properties?.dongName ||
                     f.properties?.DONG_NM ||
                     f.properties?.['행정동']
        return name === selectedDong
      })
    }
  }

  // Base fill layer with gradients (Gu)
  // Always show gu layer, but change colors based on selection
  if (showGuBoundaries && guData) {
    // Glow layers removed - only using fill colors for selection

    // Main Gu boundaries layer with sophisticated fill
    layers.push(
      new GeoJsonLayer({
        id: 'gu-boundaries',
        data: guData,
        pickable: selectionMode === 'gu',
        stroked: true,
        filled: fillEnabled,  // Always fill for consistent rendering
        getFillColor: (d: any) => {
          if (!fillEnabled) return [0, 0, 0, 0]

          const guName = d.properties?.guName ||
                         d.properties?.SGG_NM ||
                         d.properties?.SIG_KOR_NM ||
                         d.properties?.['자치구']

          // Get gu code for comparison
          const guCode = d.properties?.guCode ||
                         (d.properties?.ADM_SECT_C ? parseInt(d.properties.ADM_SECT_C) : null) ||
                         d.properties?.['자치구코드']

          let fillColor: RGBAColor

          // When a gu is selected
          if (selectedGuCode) {
            if (guCode === selectedGuCode) {
              // 선택된 구는 아름다운 에메랄드 톤으로 하이라이트
              fillColor = [34, 197, 94, 240] as RGBAColor  // Beautiful emerald highlight
            } else {
              // 선택되지 않은 구는 투명하게
              fillColor = [0, 0, 0, 0] as RGBAColor  // Fully transparent
            }
          } else if (guName === hoveredDistrict) {
            // Sophisticated hover effect: 40% lighter fill (light gray with transparency)
            fillColor = [209, 213, 219, 100] as RGBAColor  // Light gray-300 with 40% opacity
          } else {
            // Default: No fill (transparent)
            fillColor = [0, 0, 0, 0] as RGBAColor  // Fully transparent
          }

          // Apply saturation boost if enabled
          if (saturationScale !== 1.0) {
            fillColor = boostSaturation(fillColor, saturationScale)
          }

          return fillColor
        },
        getLineColor: (d: any) => {
          const guName = d.properties?.guName ||
                         d.properties?.SGG_NM ||
                         d.properties?.SIG_KOR_NM ||
                         d.properties?.['자치구']

          const guCode = d.properties?.guCode ||
                         (d.properties?.ADM_SECT_C ? parseInt(d.properties.ADM_SECT_C) : null) ||
                         d.properties?.['자치구코드']

          const isSelected = selectedGuCode && guCode === selectedGuCode
          const isHovered = guName === hoveredDistrict

          if (isSelected) {
            // Selected districts keep emerald outline
            return [16, 185, 129, 255] as RGBAColor  // Emerald-600
          } else if (isHovered) {
            // Sophisticated hover effect: Use what was originally the fill color (gray-300)
            return [209, 213, 219, 255] as RGBAColor  // Gray-300 outline on hover
          } else {
            // Default: Light gray boundary that's clearly visible
            return [156, 163, 175, 255] as RGBAColor  // Gray-400 outline (visible but subtle)
          }
        },
        getLineWidth: (d: any) => {
          const guName = d.properties?.guName ||
                         d.properties?.SGG_NM ||
                         d.properties?.SIG_KOR_NM ||
                         d.properties?.['자치구']

          const guCode = d.properties?.guCode ||
                         (d.properties?.ADM_SECT_C ? parseInt(d.properties.ADM_SECT_C) : null) ||
                         d.properties?.['자치구코드']

          const isSelected = selectedGuCode && guCode === selectedGuCode
          const isHovered = guName === hoveredDistrict

          if (isSelected) {
            // Selected districts get thicker emerald outline
            return 5
          } else if (isHovered) {
            // Sophisticated hover effect: Increase thickness a bit
            return 4
          } else {
            // Default: Much more prominent gray boundary (3x original thickness)
            return 4.5
          }
        },
        lineWidthMinPixels: 1,
        lineWidthMaxPixels: 6,
        lineCapRounded: true,
        lineJointRounded: true,
        autoHighlight: selectionMode === 'gu',
        highlightColor: [59, 130, 246, 80],
        onHover: selectionMode === 'gu' ? onHover : undefined,
        onClick: selectionMode === 'gu' ? onClick : undefined, // Single tap shows tooltip
        onDoubleClick: selectionMode === 'gu' ? onDoubleClick : undefined,
        updateTriggers: {
          getFillColor: [selectedGu, selectedDong, hoveredDistrict, theme, useUniqueColors, fillEnabled, saturationScale],
          getLineColor: [selectedGu, selectedDong, hoveredDistrict, fillEnabled, theme, useUniqueColors, saturationScale],
          getLineWidth: [selectedGu, selectedDong, fillEnabled]
        },
        transitions: {
          getFillColor: { duration: 400, easing: x => x * x * (3 - 2 * x) }, // smoothstep
          getLineColor: { duration: 300, easing: x => x * x },
          getLineWidth: { duration: 250, easing: x => x }
        }
      })
    )
  }

  // Dong (neighborhood) boundaries layer with enhanced visuals
  // Only show dong boundaries when a gu is selected (showDongBoundaries is true)
  if (showDongBoundaries && dongData && selectedGuCode) {
    // Filter dong data to only show dongs in the selected gu using code
    const filteredDongData = {
      ...dongData,
      features: dongData.features.filter((f: any) => {
        const guCode = f.properties?.guCode ||
                       f.properties?.['자치구코드']
        return guCode === selectedGuCode
      })
    }

    // Main dong boundaries layer
    layers.push(
      new GeoJsonLayer({
        id: 'dong-boundaries',
        data: filteredDongData,
        pickable: selectionMode === 'dong',
        stroked: true,
        filled: fillEnabled,
        getFillColor: (d: any) => {
          if (!fillEnabled) return [0, 0, 0, 0]

          const dongName = d.properties?.ADM_DR_NM ||
                           d.properties?.dongName ||
                           d.properties?.DONG_NM ||
                           d.properties?.['행정동']

          let fillColor: RGBAColor

          // If this dong is selected, make it highly visible with contrasting color
          if (dongName && dongName === selectedDong) {
            // Use beautiful vibrant blue for selected dong
            fillColor = [59, 130, 246, 255] as RGBAColor  // Beautiful blue - fully opaque
          } else if (selectionMode === 'dong' && dongName && dongName === hoveredDistrict) {
            // Sophisticated hover effect: 40% lighter fill (light gray with transparency)
            fillColor = [209, 213, 219, 100] as RGBAColor  // Light gray-300 with 40% opacity
          } else {
            // Default: No fill (transparent)
            fillColor = [0, 0, 0, 0] as RGBAColor  // Fully transparent
          }

          // Apply saturation boost if enabled and not transparent
          if (saturationScale !== 1.0 && fillColor[3] > 0) {
            fillColor = boostSaturation(fillColor, saturationScale)
          }

          return fillColor
        },
        getLineColor: (d: any) => {
          const dongName = d.properties?.ADM_DR_NM ||
                           d.properties?.dongName ||
                           d.properties?.DONG_NM ||
                           d.properties?.['행정동']

          const isSelected = dongName && dongName === selectedDong
          const isHovered = selectionMode === 'dong' && dongName && dongName === hoveredDistrict

          if (isSelected) {
            // Selected dong keeps blue outline
            return [37, 99, 235, 255] as RGBAColor  // Blue-600
          } else if (isHovered) {
            // Sophisticated hover effect: Use what was originally the fill color (gray-300)
            return [209, 213, 219, 255] as RGBAColor  // Gray-300 outline on hover
          } else {
            // Default: Light gray boundary that's clearly visible
            return [156, 163, 175, 255] as RGBAColor  // Gray-400 outline (visible but subtle)
          }
        },
        getLineWidth: (d: any) => {
          const dongName = d.properties?.ADM_DR_NM ||
                           d.properties?.dongName ||
                           d.properties?.DONG_NM ||
                           d.properties?.['행정동']

          const isSelected = dongName && dongName === selectedDong
          const isHovered = selectionMode === 'dong' && dongName && dongName === hoveredDistrict

          if (isSelected) {
            // Selected dong gets thicker blue outline
            return 5
          } else if (isHovered) {
            // Sophisticated hover effect: Increase thickness a bit
            return 4
          } else {
            // Default: Much more prominent gray boundary (3x original thickness)
            return 3
          }
        },
        getDashArray: (d: any) => {
          const dongName = d.properties?.ADM_DR_NM ||
                           d.properties?.dongName ||
                           d.properties?.DONG_NM ||
                           d.properties?.['행정동']

          const isSelected = dongName && dongName === selectedDong
          const isHovered = selectionMode === 'dong' && dongName && dongName === hoveredDistrict

          const borderStyle = getModernBorderStyle('dong', isSelected, isHovered)
          return borderStyle.dashArray || []
        },
        lineWidthMinPixels: 1,
        lineWidthMaxPixels: 6,
        lineCapRounded: true,
        lineJointRounded: true,
        autoHighlight: selectionMode === 'dong',
        highlightColor: [59, 130, 246, 60],
        onHover: selectionMode === 'dong' ? onHover : undefined,
        onClick: selectionMode === 'dong' ? onClick : undefined, // Single tap shows tooltip
        onDoubleClick: selectionMode === 'dong' ? onDoubleClick : undefined,
        updateTriggers: {
          getFillColor: [selectedGu, selectedDong, hoveredDistrict, theme, useUniqueColors, fillEnabled],
          getLineColor: [selectedGu, selectedDong, hoveredDistrict, theme, useUniqueColors, fillEnabled],
          getLineWidth: [selectedDong, hoveredDistrict, fillEnabled],
          getDashArray: [selectedDong, hoveredDistrict]
        },
        transitions: {
          getFillColor: { duration: 350, easing: x => x * x * (3 - 2 * x) },
          getLineColor: { duration: 250, easing: x => x * x },
          getLineWidth: { duration: 200, easing: x => x },
          getDashArray: { duration: 300 }
        }
      })
    )
  }

  // Enhanced text labels with modern styling
  if (showLabels) {
    // Gu labels - only show when no gu is selected
    if (showGuBoundaries && guData && viewState.zoom >= 10 && !selectedGuCode) {
      const guLabels = guData.features.map(feature => {
        const name = feature.properties?.guName ||
                     feature.properties?.SGG_NM ||
                     feature.properties?.SIG_KOR_NM ||
                     feature.properties?.['자치구'] ||
                     ''
        const centroid = getFeatureCentroid(feature)
        const isSelected = name === selectedGu
        const isHovered = name === hoveredDistrict

        return {
          text: name,
          position: centroid,
          size: isSelected ? 18 : (viewState.zoom < 12 ? 14 : 16),
          color: isSelected ? STATE_COLORS.selected.border :
                 isHovered ? STATE_COLORS.hover.border :
                 [55, 65, 81, 255],
          weight: isSelected ? 700 : 600
        }
      }).filter(label => label.text && label.position)

      layers.push(
        new TextLayer({
          id: 'gu-labels',
          data: guLabels,
          getText: d => d.text,
          getPosition: d => d.position,
          getSize: d => d.size,
          getColor: d => d.color,
          getTextAnchor: 'middle',
          getAlignmentBaseline: 'center',
          fontFamily: '"Pretendard Variable", "Pretendard", "Noto Sans KR", sans-serif',
          fontWeight: d => d.weight,
          billboard: false,
          backgroundPadding: [6, 3],
          getBackgroundColor: [255, 255, 255, 230],
          outlineWidth: 2,
          outlineColor: [255, 255, 255, 255],
          characterSet: 'auto',
          updateTriggers: {
            getSize: [selectedGu, viewState.zoom],
            getColor: [selectedGu, hoveredDistrict]
          },
          transitions: {
            getSize: { duration: 200 },
            getColor: { duration: 200 }
          }
        })
      )
    }

    // Dong labels with modern effects - only show for selected gu
    if (showDongBoundaries && dongData && selectedGuCode && viewState.zoom >= 11) {
      // Filter to only show labels for dongs in the selected gu using code
      const dongLabels = dongData.features
        .filter(feature => {
          const guCode = feature.properties?.guCode ||
                         feature.properties?.['자치구코드']
          return guCode === selectedGuCode
        })
        .map(feature => {
        const name = feature.properties?.ADM_DR_NM ||
                     feature.properties?.dongName ||
                     feature.properties?.DONG_NM ||
                     feature.properties?.['행정동'] ||
                     ''
        const guName = feature.properties?.SIG_KOR_NM ||
                        feature.properties?.SGG_NM ||
                        feature.properties?.guName ||
                        feature.properties?.['자치구']
        const centroid = getFeatureCentroid(feature)
        const isSelected = name === selectedDong
        const isHovered = name === hoveredDistrict
        const isParentSelected = guName === selectedGu

        return {
          text: name,
          position: centroid,
          size: isSelected ? 14 : 12,
          color: isSelected ? STATE_COLORS.selected.border :
                 isHovered ? STATE_COLORS.hover.border :
                 isParentSelected ? [75, 85, 99, 255] :
                 [107, 114, 128, 255],
          weight: isSelected ? 600 : 400
        }
      }).filter(label => label.text && label.position)

      layers.push(
        new TextLayer({
          id: 'dong-labels',
          data: dongLabels,
          getText: d => d.text,
          getPosition: d => d.position,
          getSize: d => d.size,
          getColor: d => d.color,
          getTextAnchor: 'middle',
          getAlignmentBaseline: 'center',
          fontFamily: '"Pretendard Variable", "Pretendard", "Noto Sans KR", sans-serif',
          fontWeight: d => d.weight,
          billboard: false,
          backgroundPadding: [4, 2],
          getBackgroundColor: [255, 255, 255, 210],
          outlineWidth: 1,
          outlineColor: [255, 255, 255, 255],
          characterSet: 'auto',
          updateTriggers: {
            getSize: [selectedDong],
            getColor: [selectedGu, selectedDong, hoveredDistrict]
          },
          transitions: {
            getSize: { duration: 150 },
            getColor: { duration: 150 }
          }
        })
      )
    }
  }

  return layers
}

/**
 * Calculate centroid of a GeoJSON feature
 */
function getFeatureCentroid(feature: any): [number, number] | null {
  if (!feature.geometry) return null

  const { type, coordinates } = feature.geometry

  if (type === 'Polygon') {
    return getPolygonCentroid(coordinates[0])
  } else if (type === 'MultiPolygon') {
    // Use the largest polygon's centroid
    let maxArea = 0
    let maxCentroid = null
    for (const polygon of coordinates) {
      const area = getPolygonArea(polygon[0])
      if (area > maxArea) {
        maxArea = area
        maxCentroid = getPolygonCentroid(polygon[0])
      }
    }
    return maxCentroid
  }

  return null
}

/**
 * Calculate centroid of a polygon ring
 */
function getPolygonCentroid(ring: number[][]): [number, number] {
  let sumX = 0
  let sumY = 0
  let count = 0

  for (const point of ring) {
    if (point.length >= 2) {
      sumX += point[0]
      sumY += point[1]
      count++
    }
  }

  if (count === 0) return [0, 0]
  return [sumX / count, sumY / count]
}

/**
 * Calculate approximate area of a polygon ring (for finding largest polygon)
 */
function getPolygonArea(ring: number[][]): number {
  let area = 0
  for (let i = 0; i < ring.length - 1; i++) {
    area += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]
  }
  return Math.abs(area / 2)
}
