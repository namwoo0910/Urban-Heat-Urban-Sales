/**
 * District Boundary Layers for EDA Visualization
 *
 * Creates deck.gl layers for displaying Seoul district boundaries.
 */

import { GeoJsonLayer, TextLayer } from '@deck.gl/layers'
import type { FeatureCollection } from 'geojson'
import type { MapViewState, PickingInfo } from '@deck.gl/core'

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
  onClick
}: BoundaryLayerProps): any[] {
  const layers = []

  // Gu (district) boundaries layer
  if (showGuBoundaries && guData) {
    layers.push(
      new GeoJsonLayer({
        id: 'gu-boundaries',
        data: guData,
        pickable: true,
        stroked: true,
        filled: true,
        getFillColor: (d: any) => {
          const name = d.properties?.guName || d.properties?.SGG_NM
          if (name === selectedGu) {
            return [59, 130, 246, 60] // Blue with transparency
          }
          if (name === hoveredDistrict) {
            return [156, 163, 175, 40] // Gray with transparency
          }
          return [255, 255, 255, 0] // Transparent
        },
        getLineColor: [107, 114, 128, 255], // Gray border
        getLineWidth: 2,
        lineWidthMinPixels: 1,
        lineWidthMaxPixels: 3,
        onHover,
        onClick,
        updateTriggers: {
          getFillColor: [selectedGu, hoveredDistrict]
        }
      })
    )
  }

  // Dong (neighborhood) boundaries layer
  if (showDongBoundaries && dongData && viewState.zoom > 11) {
    layers.push(
      new GeoJsonLayer({
        id: 'dong-boundaries',
        data: dongData,
        pickable: true,
        stroked: true,
        filled: true,
        getFillColor: (d: any) => {
          const dongName = d.properties?.ADM_DR_NM || d.properties?.dongName || d.properties?.DONG_NM
          const guName = d.properties?.SIG_KOR_NM || d.properties?.SGG_NM || d.properties?.guName

          if (dongName === selectedDong || guName === selectedGu) {
            return [59, 130, 246, 40] // Blue with transparency
          }
          if (dongName === hoveredDistrict) {
            return [156, 163, 175, 30] // Gray with transparency
          }
          return [255, 255, 255, 0] // Transparent
        },
        getLineColor: [156, 163, 175, 200], // Light gray border
        getLineWidth: 1,
        lineWidthMinPixels: 0.5,
        lineWidthMaxPixels: 2,
        onHover,
        onClick,
        updateTriggers: {
          getFillColor: [selectedGu, selectedDong, hoveredDistrict]
        }
      })
    )
  }

  // Text labels for districts
  if (showLabels) {
    // Gu labels
    if (showGuBoundaries && guData && viewState.zoom >= 10) {
      const guLabels = guData.features.map(feature => {
        const name = feature.properties?.guName || feature.properties?.SGG_NM || ''
        const centroid = getFeatureCentroid(feature)
        return {
          text: name,
          position: centroid,
          size: viewState.zoom < 12 ? 14 : 16
        }
      }).filter(label => label.text && label.position)

      layers.push(
        new TextLayer({
          id: 'gu-labels',
          data: guLabels,
          getText: d => d.text,
          getPosition: d => d.position,
          getSize: d => d.size,
          getColor: [55, 65, 81, 255], // Dark gray
          getTextAnchor: 'middle',
          getAlignmentBaseline: 'center',
          fontFamily: '"Pretendard", "Noto Sans KR", sans-serif',
          fontWeight: 600,
          billboard: false,
          backgroundPadding: [4, 2],
          getBackgroundColor: [255, 255, 255, 200],
          outlineWidth: 2,
          outlineColor: [255, 255, 255, 255]
        })
      )
    }

    // Dong labels (only at higher zoom levels)
    if (showDongBoundaries && dongData && viewState.zoom >= 13) {
      const dongLabels = dongData.features.map(feature => {
        const name = feature.properties?.ADM_DR_NM || feature.properties?.dongName || feature.properties?.DONG_NM || ''
        const centroid = getFeatureCentroid(feature)
        return {
          text: name,
          position: centroid,
          size: 12
        }
      }).filter(label => label.text && label.position)

      layers.push(
        new TextLayer({
          id: 'dong-labels',
          data: dongLabels,
          getText: d => d.text,
          getPosition: d => d.position,
          getSize: d => d.size,
          getColor: [107, 114, 128, 255], // Gray
          getTextAnchor: 'middle',
          getAlignmentBaseline: 'center',
          fontFamily: '"Pretendard", "Noto Sans KR", sans-serif',
          fontWeight: 400,
          billboard: false,
          backgroundPadding: [3, 1],
          getBackgroundColor: [255, 255, 255, 180],
          outlineWidth: 1,
          outlineColor: [255, 255, 255, 255]
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