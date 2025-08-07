"use client"

import { useState } from "react"
import { Map } from "react-map-gl"
import { DeckGL } from "@deck.gl/react"
import { ScatterplotLayer } from "@deck.gl/layers"
import type { MapViewState } from "@deck.gl/core"
import "mapbox-gl/dist/mapbox-gl.css"

// Mapbox access token
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "pk.eyJ1IjoieXN1MTUxNiIsImEiOiJjbWRyMHR2bTQwOTB2MmlzOGdlZmFldnVnIn0.Rv_I_4s0u88CYd7r9JbZDA"

// 서울 주요 지점 테스트 데이터
const TEST_POINTS = [
  { name: "남산타워", coordinates: [126.9882, 37.5512], color: [255, 0, 0], size: 1000 },
  { name: "경복궁", coordinates: [126.977, 37.5796], color: [0, 255, 0], size: 800 },
  { name: "강남역", coordinates: [127.0276, 37.4979], color: [0, 0, 255], size: 1200 },
  { name: "홍대입구", coordinates: [126.924, 37.5563], color: [255, 255, 0], size: 900 },
  { name: "잠실역", coordinates: [127.1001, 37.5132], color: [255, 0, 255], size: 1100 },
  { name: "여의도", coordinates: [126.9246, 37.5219], color: [0, 255, 255], size: 1000 },
  { name: "동대문", coordinates: [127.0079, 37.5714], color: [255, 128, 0], size: 850 },
  { name: "명동", coordinates: [126.9861, 37.5636], color: [128, 0, 255], size: 950 },
]

export function SeoulMapDeckGL() {
  // 초기 뷰 상태
  const [viewState, setViewState] = useState<MapViewState>({
    longitude: 126.978,
    latitude: 37.5665,
    zoom: 11,
    pitch: 45,
    bearing: 0,
  })

  // ScatterplotLayer 생성
  const layers = [
    new ScatterplotLayer({
      id: "scatterplot-layer",
      data: TEST_POINTS,
      pickable: true,
      opacity: 0.8,
      stroked: true,
      filled: true,
      radiusScale: 1,
      radiusMinPixels: 5,
      radiusMaxPixels: 100,
      lineWidthMinPixels: 1,
      getPosition: (d: any) => d.coordinates,
      getRadius: (d: any) => d.size,
      getFillColor: (d: any) => d.color,
      getLineColor: () => [255, 255, 255],
      onHover: (info) => {
        if (info.object) {
          console.log("Hovering:", info.object.name)
        }
      },
    }),
  ]

  return (
    <div className="relative w-full h-screen">
      <DeckGL
        viewState={viewState}
        onViewStateChange={({ viewState }) => setViewState(viewState)}
        controller={true}
        layers={layers}
        getTooltip={({ object }: any) => 
          object && {
            html: `
              <div class="bg-black/80 text-white p-2 rounded">
                <strong>${object.name}</strong><br/>
                Size: ${object.size}m
              </div>
            `,
            style: {
              backgroundColor: 'transparent',
              border: 'none',
            }
          }
        }
      >
        <Map
          mapboxAccessToken={MAPBOX_TOKEN}
          mapStyle="mapbox://styles/mapbox/dark-v11"
          // Map 컴포넌트는 DeckGL의 viewState를 상속받음
        />
      </DeckGL>

      {/* 정보 패널 */}
      <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md rounded-lg border border-white/20 p-4 text-white z-10">
        <h3 className="font-bold text-lg mb-2">deck.gl + Mapbox 통합 테스트</h3>
        <div className="text-sm text-white/80 space-y-1">
          <div>📍 ScatterplotLayer 사용</div>
          <div>🎨 {TEST_POINTS.length}개 테스트 포인트</div>
          <div>🖱️ 마우스 호버로 정보 확인</div>
        </div>
      </div>
    </div>
  )
}