"use client"

import { useState, useEffect, useRef } from "react"
import { Map } from "react-map-gl"
import { DeckGL } from "@deck.gl/react"
import { ScatterplotLayer, LineLayer } from "@deck.gl/layers"
import type { MapViewState } from "@deck.gl/core"
import "mapbox-gl/dist/mapbox-gl.css"
import { generateSeoulParticles, updateParticlePositions, getGradientColor } from "@/utils/particle-data"
import type { ParticleData } from "@/utils/particle-data"

// Mapbox access token
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "pk.eyJ1IjoieXN1MTUxNiIsImEiOiJjbWRyMHR2bTQwOTB2MmlzOGdlZmFldnVnIn0.Rv_I_4s0u88CYd7r9JbZDA"

// 연결선 생성 함수
function createConnections(particles: any[], maxDistance: number = 0.01) {
  const connections: any[] = []
  const maxConnections = 500 // 성능을 위해 제한
  let connectionCount = 0
  
  for (let i = 0; i < particles.length && connectionCount < maxConnections; i++) {
    for (let j = i + 1; j < particles.length && connectionCount < maxConnections; j++) {
      const distance = Math.sqrt(
        Math.pow(particles[i].position[0] - particles[j].position[0], 2) +
        Math.pow(particles[i].position[1] - particles[j].position[1], 2)
      )
      
      if (distance < maxDistance) {
        connections.push({
          sourcePosition: particles[i].position,
          targetPosition: particles[j].position,
          color: [
            (particles[i].color[0] + particles[j].color[0]) / 2,
            (particles[i].color[1] + particles[j].color[1]) / 2,
            (particles[i].color[2] + particles[j].color[2]) / 2,
            Math.max(0, 80 * (1 - distance / maxDistance)) // 거리에 따른 투명도
          ]
        })
        connectionCount++
      }
    }
  }
  
  return connections
}

export function SeoulMapEnhanced() {
  // 파티클 데이터
  const [particles] = useState<ParticleData[]>(() => generateSeoulParticles(8000))
  const [animatedData, setAnimatedData] = useState<any[]>([])
  const [connections, setConnections] = useState<any[]>([])
  const animationFrameRef = useRef<number>()
  const startTimeRef = useRef<number>(Date.now())
  
  // 카메라 자동 회전
  const [autoRotate, setAutoRotate] = useState(true)
  const rotationRef = useRef(0)
  
  // 초기 뷰 상태
  const [viewState, setViewState] = useState<MapViewState>({
    longitude: 126.978,
    latitude: 37.5665,
    zoom: 11.2,
    pitch: 65,
    bearing: 0,
  })

  // 애니메이션 루프
  useEffect(() => {
    const animate = () => {
      const currentTime = Date.now() - startTimeRef.current
      const updated = updateParticlePositions(particles, currentTime)
      setAnimatedData(updated)
      
      // 연결선 업데이트 (매 10프레임마다)
      if (currentTime % 10 === 0) {
        const nearbyParticles = updated.filter((_, i) => i % 5 === 0) // 성능 최적화
        setConnections(createConnections(nearbyParticles))
      }
      
      // 자동 회전
      if (autoRotate) {
        rotationRef.current += 0.1
        setViewState(prev => ({
          ...prev,
          bearing: rotationRef.current % 360
        }))
      }
      
      animationFrameRef.current = requestAnimationFrame(animate)
    }
    
    animate()
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [particles, autoRotate])

  // 레이어 생성
  const layers = [
    // 연결선 레이어
    new LineLayer({
      id: "connection-layer",
      data: connections,
      pickable: false,
      getSourcePosition: (d: any) => d.sourcePosition,
      getTargetPosition: (d: any) => d.targetPosition,
      getColor: (d: any) => d.color,
      getWidth: 1,
      opacity: 0.3,
      parameters: {
        depthTest: false,
        blend: true,
        blendFunc: [770, 1],
        blendEquation: 32774,
      },
    }),
    
    // 메인 파티클 레이어
    new ScatterplotLayer({
      id: "particle-layer",
      data: animatedData,
      pickable: false,
      opacity: 0.8,
      stroked: true,
      filled: true,
      radiusScale: 1,
      radiusMinPixels: 0.5,
      radiusMaxPixels: 6,
      lineWidthMinPixels: 0,
      getPosition: (d: any) => d.position,
      getRadius: (d: any) => d.size,
      getFillColor: (d: any) => {
        const factor = d.size / 200
        const color = getGradientColor(d.color, factor)
        return [color[0], color[1], color[2], color[3] * 0.9]
      },
      getLineColor: (d: any) => {
        const color = d.color
        return [color[0], color[1], color[2], 50]
      },
      getLineWidth: (d: any) => d.size * 0.01,
      transitions: {
        getFillColor: {
          duration: 2000,
          type: 'interpolation',
        },
        getRadius: {
          duration: 1500,
          type: 'spring',
          stiffness: 0.02,
          damping: 0.1,
        },
      },
      parameters: {
        depthTest: false,
        blend: true,
        blendFunc: [770, 1],
        blendEquation: 32774,
      },
    }),
    
    // 강한 글로우 효과 레이어 (큰 파티클)
    new ScatterplotLayer({
      id: "particle-glow-strong",
      data: animatedData.filter((d) => d.size > 150), // 큰 파티클만
      pickable: false,
      opacity: 0.4,
      stroked: false,
      filled: true,
      radiusScale: 3,
      radiusMinPixels: 3,
      radiusMaxPixels: 20,
      getPosition: (d: any) => d.position,
      getRadius: (d: any) => d.size,
      getFillColor: (d: any) => {
        const color = getGradientColor(d.color, 1)
        return [
          Math.min(255, color[0] * 1.2),
          Math.min(255, color[1] * 1.2),
          Math.min(255, color[2] * 1.2),
          40
        ]
      },
      parameters: {
        depthTest: false,
        blend: true,
        blendFunc: [770, 1],
        blendEquation: 32774,
      },
    }),
    
    // 부드러운 글로우 효과 레이어
    new ScatterplotLayer({
      id: "particle-glow-soft",
      data: animatedData.filter((_, i) => i % 2 === 0),
      pickable: false,
      opacity: 0.2,
      stroked: false,
      filled: true,
      radiusScale: 2,
      radiusMinPixels: 1,
      radiusMaxPixels: 12,
      getPosition: (d: any) => d.position,
      getRadius: (d: any) => d.size * 1.5,
      getFillColor: (d: any) => {
        const color = getGradientColor(d.color, 0.8)
        return [color[0], color[1], color[2], 60]
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
        onViewStateChange={({ viewState }) => {
          setViewState(viewState)
          setAutoRotate(false) // 사용자 인터랙션 시 자동 회전 중지
        }}
        controller={true}
        layers={layers}
        parameters={{
          clearColor: [0, 0, 0.05, 1], // 아주 약간 파란 빛이 도는 검은색
        }}
      >
        <Map
          mapboxAccessToken={MAPBOX_TOKEN}
          mapStyle="mapbox://styles/mapbox/dark-v11"
          onLoad={(evt) => {
            const map = evt.target
            
            try {
              // 모든 레이어의 투명도 조정
              const layers = map.getStyle().layers
              layers?.forEach((layer: any) => {
                // 텍스트 레이어 숨기기
                if (layer.type === 'symbol') {
                  map.setLayoutProperty(layer.id, 'visibility', 'none')
                }
                // 도로 레이어 어둡게
                if (layer.type === 'line') {
                  map.setPaintProperty(layer.id, 'line-opacity', 0.1)
                }
                // 건물 레이어 어둡게
                if (layer.type === 'fill-extrusion') {
                  map.setPaintProperty(layer.id, 'fill-extrusion-opacity', 0.2)
                }
                // 배경 레이어 어둡게
                if (layer.type === 'fill') {
                  map.setPaintProperty(layer.id, 'fill-opacity', 0.1)
                }
              })
              
              // 안개 효과 추가
              map.setFog({
                color: 'rgb(10, 10, 30)', // 어두운 파란색
                'high-color': 'rgb(20, 20, 50)',
                'horizon-blend': 0.1,
                'space-color': 'rgb(0, 0, 10)',
                'star-intensity': 0.2
              })
            } catch (error) {
              console.warn('Some map styling failed:', error)
            }
          }}
        />
      </DeckGL>

      {/* 다층 그라데이션 오버레이 */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at 50% 50%, 
              transparent 20%, 
              rgba(138, 43, 226, 0.05) 40%,
              rgba(65, 105, 225, 0.1) 60%,
              rgba(0, 0, 20, 0.4) 100%
            ),
            linear-gradient(to bottom,
              rgba(0, 0, 0, 0) 0%,
              rgba(0, 0, 0, 0.2) 100%
            )
          `,
          mixBlendMode: 'screen',
        }}
      />
      
      {/* 상단 그라데이션 */}
      <div 
        className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
        style={{
          background: `linear-gradient(to bottom, rgba(0, 0, 10, 0.8), transparent)`,
        }}
      />
      
      {/* 하단 그라데이션 */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{
          background: `linear-gradient(to top, rgba(0, 0, 10, 0.8), transparent)`,
        }}
      />
    </div>
  )
}