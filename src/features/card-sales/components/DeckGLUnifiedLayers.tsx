/**
 * DeckGL Unified Layers
 *
 * Simplified version with polygon layers removed.
 * Only keeping boundary lines if needed for visual reference.
 */

import { useMemo } from 'react'
import { PathLayer } from '@deck.gl/layers'
import type { PickingInfo } from '@deck.gl/core'
import type { Feature, FeatureCollection } from 'geojson'

interface UnifiedLayersProps {
  // Data
  seoulBoundaryData?: FeatureCollection | null

  // State
  isDragging: boolean
  viewState: {
    zoom: number
    longitude: number
    latitude: number
    pitch: number
    bearing: number
  }

  // Visibility
  showBoundary?: boolean

  // Callbacks
  onHover?: (info: PickingInfo) => void
  onClick?: (info: PickingInfo) => void
}

/**
 * Create unified deck.gl layers
 * Simplified to only show boundary lines, no filled polygons
 */
export function createUnifiedDeckGLLayers({
  seoulBoundaryData,
  showBoundary,
  viewState,
}: UnifiedLayersProps) {

  return useMemo(() => {
    const layers = []

    // Seoul boundary outline only (if needed for visual reference)
    if (showBoundary && seoulBoundaryData) {
      layers.push(
        new PathLayer({
          id: 'seoul-boundary-outline',
          data: seoulBoundaryData.features,

          getPath: (feature: any) => {
            if (feature.geometry?.type === 'MultiPolygon') {
              return feature.geometry.coordinates[0][0]
            }
            if (feature.geometry?.type === 'Polygon') {
              return feature.geometry.coordinates[0]
            }
            return []
          },

          getColor: [0, 200, 200, 100],
          getWidth: 2,
          widthMinPixels: 1,
          widthMaxPixels: 3,
          capRounded: true,
          jointRounded: true,
          billboard: false,
        })
      )
    }

    return layers
  }, [showBoundary, seoulBoundaryData])
}

// Export hook for backward compatibility
export function useUnifiedDeckGLLayers(props: UnifiedLayersProps) {
  return createUnifiedDeckGLLayers(props)
}