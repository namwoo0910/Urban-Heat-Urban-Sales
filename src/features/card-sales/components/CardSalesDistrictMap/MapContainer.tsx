/**
 * MapContainer Component
 * 
 * Pure rendering component for the map visualization.
 * Handles only the visual rendering without state management.
 */

import React from 'react'
import { DeckGL } from '@deck.gl/react'
import { Map as MapGL } from 'react-map-gl'
import type { MapRef } from 'react-map-gl'
import type { MapViewState, PickingInfo } from '@deck.gl/core'
import { MAPBOX_TOKEN } from '@/src/shared/constants/mapConfig'
import 'mapbox-gl/dist/mapbox-gl.css'

interface MapContainerProps {
  viewState: MapViewState
  layers: any[]
  onViewStateChange: (params: { viewState: MapViewState }) => void
  onHover?: (info: PickingInfo) => void
  onClick?: (info: PickingInfo) => void
  controller?: boolean | Record<string, any>
  effects?: any[]
  mapRef?: React.RefObject<MapRef>
  getTooltip?: (info: PickingInfo) => object | null
}

export const MapContainer = React.memo(({ 
  viewState, 
  layers, 
  onViewStateChange,
  onHover,
  onClick,
  controller = true,
  effects = [],
  mapRef,
  getTooltip
}: MapContainerProps) => {
  return (
    <DeckGL
      viewState={viewState}
      layers={layers}
      onViewStateChange={onViewStateChange}
      onHover={onHover}
      onClick={onClick}
      controller={controller}
      effects={effects}
      getTooltip={getTooltip}
      parameters={{
        depthTest: true,
        depthFunc: 0x0203, // GL.LEQUAL
        blend: true,
        blendFunc: [0x0302, 0x0303], // [GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA]
      }}
    >
      <MapGL 
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        reuseMaps
        preserveDrawingBuffer={false}
        antialias={false}
      />
    </DeckGL>
  )
}, (prevProps, nextProps) => {
  // Custom comparison for performance
  return (
    prevProps.viewState.longitude === nextProps.viewState.longitude &&
    prevProps.viewState.latitude === nextProps.viewState.latitude &&
    prevProps.viewState.zoom === nextProps.viewState.zoom &&
    prevProps.viewState.pitch === nextProps.viewState.pitch &&
    prevProps.viewState.bearing === nextProps.viewState.bearing &&
    prevProps.layers === nextProps.layers &&
    prevProps.effects === nextProps.effects
  )
})

MapContainer.displayName = 'MapContainer'