/**
 * MapContainer Component for EDA
 *
 * Renders the map with light theme by default for better data exploration.
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
  onDragStart?: () => void
  onDragEnd?: () => void
  getTooltip?: (info: PickingInfo) => object | null
  mapRef?: React.RefObject<MapRef>
  isDragging?: boolean
}

export const MapContainer = React.memo(({
  viewState,
  layers,
  onViewStateChange,
  onHover,
  onClick,
  onDragStart,
  onDragEnd,
  getTooltip,
  mapRef,
  isDragging
}: MapContainerProps) => {
  return (
    <DeckGL
      viewState={viewState}
      layers={layers}
      onViewStateChange={onViewStateChange as any}
      onHover={onHover}
      onClick={onClick}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      controller={true}
      getTooltip={getTooltip}
      getCursor={({ isDragging: dragging }) => dragging ? 'grabbing' : 'grab'}
    >
      <MapGL
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/light-v11" // Light theme for better data visibility
        reuseMaps
        preserveDrawingBuffer={false}
        antialias={true} // Better quality for data exploration
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
    prevProps.isDragging === nextProps.isDragging
  )
})

MapContainer.displayName = 'MapContainer'