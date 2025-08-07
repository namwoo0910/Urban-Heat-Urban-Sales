"use client"

import { useState, useEffect, useRef } from "react"
import { Map } from "react-map-gl"
import { DeckGL } from "@deck.gl/react"
import { ScatterplotLayer } from "@deck.gl/layers"
import type { MapViewState } from "@deck.gl/core"
import "mapbox-gl/dist/mapbox-gl.css"
import { generateSeoulParticles, updateParticlePositions, getGradientColor } from "@/utils/particle-data"
import type { ParticleData } from "@/utils/particle-data"

// Mapbox access token
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "pk.eyJ1IjoieXN1MTUxNiIsImEiOiJjbWRyMHR2bTQwOTB2MmlzOGdlZmFldnVnIn0.Rv_I_4s0u88CYd7r9JbZDA"

export function SeoulMapParticles() {
  // 파티클 데이터
  const [particles] = useState<ParticleData[]>(() => generateSeoulParticles(10000))
  const [animatedData, setAnimatedData] = useState<any[]>([])
  const animationFrameRef = useRef<number>()
  const startTimeRef = useRef<number>(Date.now())
  
  // 초기 뷰 상태
  const [viewState, setViewState] = useState<MapViewState>({
    longitude: 126.978,
    latitude: 37.5665,
    zoom: 11.5,
    pitch: 60,
    bearing: -20,
  })

  // 애니메이션 루프
  useEffect(() => {
    const animate = () => {
      const currentTime = Date.now() - startTimeRef.current
      const updated = updateParticlePositions(particles, currentTime)
      setAnimatedData(updated)
      animationFrameRef.current = requestAnimationFrame(animate)
    }
    
    animate()
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [particles])

  // ScatterplotLayer 생성
  const layers = [
    new ScatterplotLayer({
      id: "particle-layer",
      data: animatedData,
      pickable: false,
      opacity: 0.6,
      stroked: false,
      filled: true,
      radiusScale: 1,
      radiusMinPixels: 1,
      radiusMaxPixels: 5,
      getPosition: (d: any) => d.position,
      getRadius: (d: any) => d.size,
      getFillColor: (d: any) => {
        const factor = d.size / 200
        return getGradientColor(d.color, factor)
      },
      transitions: {
        getFillColor: {
          duration: 1000,
          type: 'interpolation',
        },
        getRadius: {
          duration: 1000,
          type: 'spring',
          stiffness: 0.01,
          damping: 0.15,
        },
      },
      // 블렌딩 모드 설정
      parameters: {
        depthTest: false,
        blend: true,
        blendFunc: [770, 1], // SRC_ALPHA, ONE (가산 블렌딩)
        blendEquation: 32774, // FUNC_ADD
      },
    }),
    // 글로우 효과를 위한 두 번째 레이어
    new ScatterplotLayer({
      id: "particle-glow-layer",
      data: animatedData.filter((_, i) => i % 3 === 0), // 1/3만 사용
      pickable: false,
      opacity: 0.3,
      stroked: false,
      filled: true,
      radiusScale: 2.5,
      radiusMinPixels: 2,
      radiusMaxPixels: 15,
      getPosition: (d: any) => d.position,
      getRadius: (d: any) => d.size,
      getFillColor: (d: any) => {
        const color = getGradientColor(d.color, 1)
        return [color[0], color[1], color[2], 100] // 더 투명하게
      },
      updateTriggers: {
        getRadius: [animatedData],
        getFillColor: [animatedData],
      },
      parameters: {
        depthTest: false,
        blend: true,
        blendFunc: [770, 1],
        blendEquation: 32774,
      },
    }),
  ]

  return (
    <div className="relative w-full h-full">
      <DeckGL
        viewState={viewState}
        onViewStateChange={({ viewState }) => setViewState(viewState)}
        controller={true}
        layers={layers}
        parameters={{
          clearColor: [0, 0, 0, 1], // 검은 배경
        }}
      >
        <Map
          mapboxAccessToken={MAPBOX_TOKEN}
          mapStyle="mapbox://styles/mapbox/dark-v11"
          // 지도 스타일 커스터마이징
          onLoad={(evt) => {
            const map = evt.target
            
            // 안전하게 레이어 스타일 조정
            try {
              // 텍스트 레이블 숨기기 (존재하는 경우에만)
              const labelsToHide = [
                'country-label',
                'state-label', 
                'settlement-label',
                'settlement-subdivision-label',
                'place-label',
                'poi-label'
              ]
              
              labelsToHide.forEach(labelId => {
                if (map.getLayer(labelId)) {
                  map.setLayoutProperty(labelId, 'visibility', 'none')
                }
              })
              
              // 도로 투명도 줄이기
              const layers = map.getStyle().layers
              layers?.forEach((layer: any) => {
                if (layer.type === 'line' && layer['source-layer'] === 'road') {
                  map.setPaintProperty(layer.id, 'line-opacity', 0.2)
                }
                // 건물 레이어도 어둡게
                if (layer.type === 'fill-extrusion' && layer.id.includes('building')) {
                  map.setPaintProperty(layer.id, 'fill-extrusion-opacity', 0.3)
                }
              })
            } catch (error) {
              console.warn('Some map styling adjustments failed:', error)
            }
          }}
        />
      </DeckGL>

      {/* 그라데이션 오버레이 */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at center, 
              transparent 30%, 
              rgba(0, 0, 20, 0.3) 60%, 
              rgba(0, 0, 10, 0.6) 100%
            )
          `,
        }}
      />
    </div>
  )
}