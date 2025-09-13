/**
 * Animated Daily Mesh Test Page
 */

"use client"

import React from 'react'
import { DeckGL } from '@deck.gl/react'
import { Map as MapGL } from 'react-map-gl'
import type { MapViewState } from '@deck.gl/core'
import { DailyTimeSeriesMeshLayer, DailyTimelineControls } from '@/src/features/card-sales/components/DailyTimeSeriesMeshLayer'
import { MAPBOX_TOKEN } from '@/src/shared/constants/mapConfig'

const INITIAL_VIEW_STATE: MapViewState = {
  longitude: 126.978,
  latitude: 37.5665,
  zoom: 10.5,
  pitch: 45,
  bearing: 0
}

export default function AnimatedDailyPage() {
  const daily = DailyTimeSeriesMeshLayer({
    visible: true,
    autoPlay: false,
    playSpeed: 1.5,
    wireframe: true
  })

  const layers = daily.layer ? [daily.layer] : []

  return (
    <div className="w-full h-screen bg-black">
      <DeckGL
        initialViewState={INITIAL_VIEW_STATE}
        controller={{ dragRotate: true, touchRotate: true }}
        layers={layers}
      >
        <MapGL
          mapboxAccessToken={MAPBOX_TOKEN}
          mapStyle="mapbox://styles/mapbox/dark-v11"
          style={{ width: '100%', height: '100%' }}
        />
      </DeckGL>

      <div className="absolute bottom-4 left-4 right-4 z-10">
        <DailyTimelineControls controls={daily.controls} className="max-w-2xl mx-auto" />
      </div>
    </div>
  )
}

