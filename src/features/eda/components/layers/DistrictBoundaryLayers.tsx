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
  selectedDong: string | null
  hoveredDistrict: string | null
  viewState: MapViewState
  onHover?: (info: PickingInfo) => void
  onClick?: (info: PickingInfo) => void
  theme?: ThemeKey
  useUniqueColors?: boolean
  selectionMode?: 'gu' | 'dong'
  fillEnabled?: boolean
  ambientConfig?: AmbientEffectConfig
  animationTimestamp?: number
  enableAmbientEffects?: boolean
}

export function createDistrictBoundaryLayers({
  guData,
  dongData,
  showGuBoundaries,
  showDongBoundaries,
  showLabels,
  selectedGu,
  selectedDong,
  hoveredDistrict,
  viewState,
  onHover,
  onClick,
  theme = 'ocean',
  useUniqueColors = true,
  selectionMode = 'gu',
  fillEnabled = true,
  ambientConfig = DEFAULT_AMBIENT_CONFIG,
  animationTimestamp = 0,
  enableAmbientEffects = true
}: BoundaryLayerProps): any[] {
  const layers = []

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

          // When dong boundaries are shown (구가 선택된 상태)
          if (showDongBoundaries) {
            if (guName === selectedGu) {
              // 선택된 구는 노란색으로 하이라이트 (완전 불투명)
              return [255, 193, 7, 255] as RGBAColor  // Amber/gold fill - fully opaque
            } else {
              // 선택되지 않은 구는 기본 색상 유지 (투명도 낮춤)
              const baseColor = getDistrictFillColor(
                d.properties,
                null,
                null,
                null,
                theme,
                useUniqueColors
              )
              return [baseColor[0], baseColor[1], baseColor[2], 80] as RGBAColor  // Semi-transparent
            }
          }

          // Check if this gu is selected (dong boundaries not shown)
          if (guName === selectedGu) {
            // Use a warm orange/yellow fill (완전 불투명)
            return [255, 193, 7, 255] as RGBAColor  // Amber/gold fill - fully opaque
          }

          // Check if this gu is hovered (but not selected)
          if (guName === hoveredDistrict && guName !== selectedGu) {
            // Use a light blue for hover state
            return [173, 216, 230, 180] as RGBAColor  // Light blue
          }

          // When dong boundaries are not shown (normal gu mode)
          // Make non-selected gu more transparent when one is selected
          if (selectedGu && guName !== selectedGu) {
            const baseColor = getDistrictFillColor(
              d.properties,
              null,
              null,
              null,
              theme,
              useUniqueColors
            )
            // Reduce opacity significantly for non-selected areas
            return [baseColor[0], baseColor[1], baseColor[2], 80] as RGBAColor
          }

          // Default: return base theme color
          const baseColor = getDistrictFillColor(
            d.properties,
            null,
            null,
            null,
            theme,
            useUniqueColors
          )
          return [baseColor[0], baseColor[1], baseColor[2], 180] as RGBAColor
        },
        getLineColor: (d: any) => {
          // Get the base theme color for borders
          const fillColor = getDistrictFillColor(
            d.properties,
            null,
            null,
            null,
            theme,
            useUniqueColors
          )

          // Darken for border - subtle borders
          const darkenFactor = 0.6
          const borderColor = [
            Math.round(fillColor[0] * darkenFactor),
            Math.round(fillColor[1] * darkenFactor),
            Math.round(fillColor[2] * darkenFactor),
            200 // Slightly transparent borders
          ]

          return borderColor as RGBAColor
        },
        getLineWidth: 1.5, // Consistent thin borders for all
        lineWidthMinPixels: 1,
        lineWidthMaxPixels: 2,
        lineCapRounded: true,
        lineJointRounded: true,
        autoHighlight: selectionMode === 'gu',
        highlightColor: [59, 130, 246, 80],
        onHover: selectionMode === 'gu' ? onHover : undefined,
        onClick: selectionMode === 'gu' ? onClick : undefined,
        updateTriggers: {
          getFillColor: [selectedGu, selectedDong, hoveredDistrict, theme, useUniqueColors, fillEnabled],
          getLineColor: [selectedGu, selectedDong, hoveredDistrict, fillEnabled, theme, useUniqueColors],
          getLineWidth: [selectedGu, selectedDong, fillEnabled]
        },
        transitions: {
          getFillColor: { duration: 300, easing: x => x * x },
          getLineColor: { duration: 200 },
          getLineWidth: { duration: 200 }
        }
      })
    )
  }

  // Dong (neighborhood) boundaries layer with enhanced visuals
  if (showDongBoundaries && dongData) {
    // Dong glow layers removed - only using fill colors for selection

    // Main dong boundaries layer
    layers.push(
      new GeoJsonLayer({
        id: 'dong-boundaries',
        data: dongData,
        pickable: selectionMode === 'dong',
        stroked: true,
        filled: fillEnabled,
        getFillColor: (d: any) => {
          if (!fillEnabled) return [0, 0, 0, 0]

          const dongName = d.properties?.ADM_DR_NM ||
                           d.properties?.dongName ||
                           d.properties?.DONG_NM ||
                           d.properties?.['행정동']

          // If this dong is selected, make it highly visible with contrasting color
          if (dongName && dongName === selectedDong) {
            // Use a dark orange fill for selected dong (완전 불투명)
            return [255, 140, 0, 255] as RGBAColor  // Dark orange fill - fully opaque
          }

          // If in dong mode and this dong is hovered
          if (selectionMode === 'dong' && dongName && dongName === hoveredDistrict) {
            // Lighter blue for hover
            return [156, 163, 175, 160] as RGBAColor
          }

          // All other dongs should be transparent to not interfere with gu layer colors
          return [0, 0, 0, 0] as RGBAColor  // Fully transparent
        },
        getLineColor: (d: any) => {
          // Use subtle gray borders for all dong boundaries
          return [156, 163, 175, 150] as RGBAColor
        },
        getLineWidth: 1, // Consistent thin borders for all dong
        lineWidthMinPixels: 0.5,
        lineWidthMaxPixels: 2,
        lineCapRounded: true,
        lineJointRounded: true,
        autoHighlight: selectionMode === 'dong',
        highlightColor: [59, 130, 246, 60],
        onHover: selectionMode === 'dong' ? onHover : undefined,
        onClick: selectionMode === 'dong' ? onClick : undefined,
        updateTriggers: {
          getFillColor: [selectedGu, selectedDong, hoveredDistrict, theme, useUniqueColors, fillEnabled],
          getLineColor: [selectedGu, selectedDong, hoveredDistrict, theme, useUniqueColors, fillEnabled],
          getLineWidth: [selectedDong, fillEnabled]
        },
        transitions: {
          getFillColor: { duration: 250, easing: x => x * x },
          getLineColor: { duration: 200 },
          getLineWidth: { duration: 150 }
        }
      })
    )
  }

  // Enhanced text labels with modern styling
  if (showLabels) {
    // Gu labels with sophisticated styling
    if (showGuBoundaries && guData && viewState.zoom >= 10) {
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

    // Dong labels with modern effects
    if (showDongBoundaries && dongData && viewState.zoom >= 13) {
      const dongLabels = dongData.features.map(feature => {
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
