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
  fillEnabled = true
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
    // Glow effect layer for selected districts (render first for proper layering)
    const selectedFeatures = getSelectedGuFeatures()
    if (selectedFeatures && selectedFeatures.features.length > 0) {
      layers.push(
        new GeoJsonLayer({
          id: 'gu-glow',
          data: selectedFeatures,
          pickable: false,
          stroked: true,
          filled: fillEnabled,
          getFillColor: fillEnabled ? STATE_COLORS.selected.glow : [0, 0, 0, 0],
          getLineColor: STATE_COLORS.selected.border,
          getLineWidth: 8,
          lineWidthMinPixels: 4,
          lineWidthMaxPixels: 10,
          lineCapRounded: true,
          lineJointRounded: true,
          parameters: {
            depthTest: false,
            blend: true,
            blendFunc: [770, 1], // Additive blending for glow
            blendEquation: 32774
          }
        })
      )
    }

    // Main Gu boundaries layer with sophisticated fill
    layers.push(
      new GeoJsonLayer({
        id: 'gu-boundaries',
        data: guData,
        pickable: selectionMode === 'gu',
        stroked: true,
        filled: fillEnabled,
        getFillColor: (d: any) => fillEnabled ? getDistrictFillColor(
          d.properties,
          selectedGu,
          selectedDong,
          hoveredDistrict,
          theme,
          useUniqueColors
        ) : [0, 0, 0, 0],
        getLineColor: (d: any) => {
          const guName = d.properties?.guName ||
                         d.properties?.SGG_NM ||
                         d.properties?.SIG_KOR_NM ||
                         d.properties?.['자치구']

          const isSelected = guName && guName === selectedGu
          const isHovered = guName && guName === hoveredDistrict

          if (isSelected) {
            // For selected districts, use the same color as fill (no border effect)
            const fillColor = getDistrictFillColor(
              d.properties,
              selectedGu,
              selectedDong,
              hoveredDistrict,
              theme,
              useUniqueColors
            )
            return fillColor
          }

          // For non-selected districts, get the base theme color and darken it
          const fillColor = getDistrictFillColor(
            d.properties,
            null,
            null,
            null,
            theme,
            useUniqueColors
          )

          // Darken for border
          const darkenFactor = isHovered ? 0.5 : 0.6
          const borderColor = [
            Math.round(fillColor[0] * darkenFactor),
            Math.round(fillColor[1] * darkenFactor),
            Math.round(fillColor[2] * darkenFactor),
            255 // Full opacity for borders
          ]

          return borderColor as RGBAColor
        },
        getLineWidth: (d: any) => {
          const baseWidth = fillEnabled ? 1.5 : 2.5 // Thicker lines when no fill
          return getLineWidth(
            d.properties,
            selectedGu,
            selectedDong,
            baseWidth
          )
        },
        lineWidthMinPixels: fillEnabled ? 1 : 2,
        lineWidthMaxPixels: fillEnabled ? 4 : 6,
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
    // Glow effect for selected dong
    const selectedDongFeatures = getSelectedDongFeatures()
    if (selectedDongFeatures && selectedDongFeatures.features.length > 0) {
      layers.push(
        new GeoJsonLayer({
          id: 'dong-glow',
          data: selectedDongFeatures,
          pickable: false,
          stroked: true,
          filled: fillEnabled,
          getFillColor: fillEnabled ? STATE_COLORS.selected.glow : [0, 0, 0, 0],
          getLineColor: STATE_COLORS.selected.border,
          getLineWidth: 6,
          lineWidthMinPixels: 3,
          lineWidthMaxPixels: 8,
          lineCapRounded: true,
          lineJointRounded: true,
          parameters: {
            depthTest: false,
            blend: true,
            blendFunc: [770, 1],
            blendEquation: 32774
          }
        })
      )
    }

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

          // Use the theme-aware fill color function from edaColorPalette
          return getDistrictFillColor(
            d.properties,
            selectedGu,
            selectedDong,
            hoveredDistrict,
            theme,
            useUniqueColors
          )
        },
        getLineColor: (d: any) => {
          const dongName = d.properties?.ADM_DR_NM ||
                           d.properties?.dongName ||
                           d.properties?.DONG_NM ||
                           d.properties?.['행정동']

          const isSelected = dongName && dongName === selectedDong
          const isHovered = dongName && dongName === hoveredDistrict

          if (isSelected) {
            // For selected districts, use the same color as fill (no border effect)
            const fillColor = getDistrictFillColor(
              d.properties,
              selectedGu,
              selectedDong,
              hoveredDistrict,
              theme,
              useUniqueColors
            )
            return fillColor
          }

          // For non-selected districts, get the base theme color and darken it
          const fillColor = getDistrictFillColor(
            d.properties,
            null, // Don't pass selection state to get base color
            null,
            null,
            theme,
            useUniqueColors
          )

          // Darken for border
          const darkenFactor = isHovered ? 0.5 : 0.6
          const borderColor = [
            Math.round(fillColor[0] * darkenFactor),
            Math.round(fillColor[1] * darkenFactor),
            Math.round(fillColor[2] * darkenFactor),
            255 // Full opacity for borders
          ]

          return borderColor as RGBAColor
        },
        getLineWidth: (d: any) => {
          const dongName = d.properties?.ADM_DR_NM ||
                           d.properties?.dongName ||
                           d.properties?.DONG_NM ||
                           d.properties?.['행정동']
          const baseWidth = fillEnabled ? 1 : 2 // Thicker lines when no fill
          return dongName === selectedDong ? baseWidth * 2 : baseWidth
        },
        lineWidthMinPixels: fillEnabled ? 0.5 : 1.5,
        lineWidthMaxPixels: fillEnabled ? 3 : 5,
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
