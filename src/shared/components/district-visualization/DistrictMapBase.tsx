"use client"

import React, { useRef, ReactNode } from 'react'
import { DeckGL } from '@deck.gl/react'
import { Map as MapGL } from 'react-map-gl'
import type { MapRef } from 'react-map-gl'
import type { MapViewState } from '@/src/shared/types/district-data'
import { LightingEffect, AmbientLight, DirectionalLight } from '@deck.gl/core'
import { MAPBOX_TOKEN } from '@/src/shared/constants/mapConfig'

interface DistrictMapBaseProps {
  viewState: MapViewState
  onViewStateChange: (params: { viewState: MapViewState }) => void
  layers: any[]
  mapStyle?: string
  is3DMode?: boolean
  children?: ReactNode
  onDragStart?: () => void
  onDragEnd?: () => void
}

// Lighting configuration for 3D visualization
const lightingEffect = new LightingEffect({
  ambientLight: new AmbientLight({
    color: [255, 255, 255],
    intensity: 1.0
  }),
  directionalLights: [
    new DirectionalLight({
      color: [255, 255, 255],
      intensity: 0.8,
      direction: [-1, -1, -1]
    }),
    new DirectionalLight({
      color: [255, 255, 255],
      intensity: 0.2,
      direction: [1, 1, 1]
    })
  ]
})

/**
 * Base map container component for district visualizations
 * Provides DeckGL and MapGL setup with common configurations
 */
export function DistrictMapBase({
  viewState,
  onViewStateChange,
  layers,
  mapStyle = 'mapbox://styles/mapbox/dark-v11',
  is3DMode = false,
  children,
  onDragStart,
  onDragEnd
}: DistrictMapBaseProps) {
  const mapRef = useRef<MapRef>(null)

  return (
    <div className="relative w-full h-full overflow-hidden bg-gray-900">
      <DeckGL
        viewState={viewState}
        onViewStateChange={onViewStateChange}
        controller={true}
        layers={layers}
        effects={is3DMode ? [lightingEffect] : []}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <MapGL
          ref={mapRef}
          mapboxAccessToken={MAPBOX_TOKEN}
          mapStyle={mapStyle}
          attributionControl={false}
        />
      </DeckGL>
      
      {/* Overlay UI components */}
      {children}
    </div>
  )
}