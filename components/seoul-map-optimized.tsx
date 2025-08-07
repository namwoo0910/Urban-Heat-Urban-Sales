"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { Map } from "react-map-gl"
import { DeckGL } from "@deck.gl/react"
import { ScatterplotLayer, LineLayer, GeoJsonLayer } from "@deck.gl/layers"
import type { MapViewState } from "@deck.gl/core"
import "mapbox-gl/dist/mapbox-gl.css"
import { generateSeoulParticles, generateSeoulParticlesWithBoundary, getGradientColor } from "@/utils/particle-data"
import type { ParticleData } from "@/utils/particle-data"
import { loadSeoulBoundaries, getSeoulPolygons, getDistrictCenters } from "@/utils/seoul-boundaries"
import type { SeoulBoundaryData } from "@/utils/seoul-boundaries"
import useParticleAnimations, { defaultAnimationConfig } from "@/hooks/use-particle-animations"
import type { AnimationConfig } from "@/hooks/use-particle-animations"
import { AnimationControls } from "@/components/animation-controls"

// Mapbox access token
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "pk.eyJ1IjoieXN1MTUxNiIsImEiOiJjbWRyMHR2bTQwOTB2MmlzOGdlZmFldnVnIn0.Rv_I_4s0u88CYd7r9JbZDA"

// 성능 설정
const PERFORMANCE_CONFIG = {
  high: {
    particleCount: 8000,
    connectionCount: 300,
    fps: 60,
    glowLayers: 2,
  },
  medium: {
    particleCount: 5000,
    connectionCount: 150,
    fps: 30,
    glowLayers: 1,
  },
  low: {
    particleCount: 2000,
    connectionCount: 50,
    fps: 24,
    glowLayers: 0,
  },
}

// 디바이스 성능 감지
function detectPerformanceLevel(): keyof typeof PERFORMANCE_CONFIG {
  // GPU 성능 체크 (간단한 휴리스틱)
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
  
  if (!gl) return 'low'
  
  // 모바일 디바이스 체크
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  if (isMobile) return 'low'
  
  // 화면 크기와 픽셀 밀도 체크
  const pixelRatio = window.devicePixelRatio || 1
  const screenSize = window.innerWidth * window.innerHeight * pixelRatio
  
  if (screenSize > 4000000) return 'high' // 4K 이상
  if (screenSize > 2000000) return 'medium' // FHD 이상
  return 'low'
}


export function SeoulMapOptimized() {
  // 성능 레벨 감지
  const [performanceLevel] = useState<keyof typeof PERFORMANCE_CONFIG>(() => detectPerformanceLevel())
  const config = PERFORMANCE_CONFIG[performanceLevel]
  
  // Seoul boundary data
  const [boundaryData, setBoundaryData] = useState<SeoulBoundaryData | null>(null)
  const [particles, setParticles] = useState<ParticleData[]>([])
  const [animatedData, setAnimatedData] = useState<any[]>([])
  const [connections, setConnections] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // 애니메이션 제어
  const animationFrameRef = useRef<number>()
  const lastFrameTimeRef = useRef<number>(0)
  const frameInterval = 1000 / config.fps
  
  // 자동 회전 (성능 모드에서는 비활성화)
  const [autoRotate] = useState(performanceLevel === 'high')
  const rotationRef = useRef(0)
  
  // 초기 뷰 상태
  const [viewState, setViewState] = useState<MapViewState>({
    longitude: 126.978,
    latitude: 37.5665,
    zoom: 11.2,
    pitch: performanceLevel === 'high' ? 65 : 45,
    bearing: 0,
  })

  // Animation configuration with state management
  const [animationConfig, setAnimationConfig] = useState<AnimationConfig>(() => ({
    ...defaultAnimationConfig,
    waveEnabled: performanceLevel !== 'low',
    pulseEnabled: performanceLevel === 'high',
    colorCycleEnabled: performanceLevel !== 'low',
    fireflyEnabled: performanceLevel === 'high',
    trailEnabled: false, // Disabled for performance
  }))

  const { animationState, animateParticles } = useParticleAnimations(
    particles,
    animationConfig
  )

  // Handle animation config changes
  const handleAnimationConfigChange = useCallback((changes: Partial<AnimationConfig>) => {
    setAnimationConfig(prev => ({ ...prev, ...changes }))
  }, [])

  // Load Seoul boundary data and generate particles
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true)
        const boundaries = await loadSeoulBoundaries()
        setBoundaryData(boundaries)
        
        // Generate particles within actual Seoul boundaries
        const particlesInSeoul = await generateSeoulParticlesWithBoundary(
          config.particleCount,
          boundaries
        )
        setParticles(particlesInSeoul)
      } catch (error) {
        console.error('Failed to load Seoul boundaries, using fallback:', error)
        // Fallback to approximate boundaries
        setParticles(generateSeoulParticles(config.particleCount))
      } finally {
        setIsLoading(false)
      }
    }
    
    loadData()
  }, [config.particleCount])

  // 연결선 생성 함수 (컴포넌트 내부에 정의)
  const createConnectionsOptimized = useCallback(
    (particles: any[], maxConnections: number) => {
      const connections: any[] = []
      const step = Math.max(1, Math.floor(particles.length / 100))
      
      for (let i = 0; i < particles.length && connections.length < maxConnections; i += step) {
        for (let j = i + step; j < Math.min(i + step * 5, particles.length) && connections.length < maxConnections; j += step) {
          const dx = particles[i].position[0] - particles[j].position[0]
          const dy = particles[i].position[1] - particles[j].position[1]
          const distanceSq = dx * dx + dy * dy // 제곱근 계산 회피
          
          if (distanceSq < 0.0001) { // 0.01^2
            connections.push({
              sourcePosition: particles[i].position,
              targetPosition: particles[j].position,
              color: [
                (particles[i].color[0] + particles[j].color[0]) >> 1, // 비트 연산으로 평균
                (particles[i].color[1] + particles[j].color[1]) >> 1,
                (particles[i].color[2] + particles[j].color[2]) >> 1,
                50
              ]
            })
          }
        }
      }
      
      return connections
    },
    []
  )

  // 최적화된 애니메이션 루프
  useEffect(() => {
    if (particles.length === 0) return
    
    let frameCount = 0
    
    const animate = (currentTime: number) => {
      // FPS 제한
      if (currentTime - lastFrameTimeRef.current >= frameInterval) {
        // 파티클 애니메이션 적용
        const animatedParticles = animateParticles(particles, animationState.time)
        const updated = animatedParticles.map(p => ({
          position: p.position,
          color: p.color.slice(0, 3),
          size: p.size,
          opacity: p.opacity,
        }))
        setAnimatedData(updated)
        
        // 연결선 업데이트 (매 10프레임마다)
        if (frameCount % 10 === 0 && config.connectionCount > 0) {
          const nearbyParticles = updated.slice(0, Math.min(100, updated.length))
          setConnections(createConnectionsOptimized(nearbyParticles, config.connectionCount))
        }
        
        // 자동 회전 (고성능 모드에서만)
        if (autoRotate && frameCount % 2 === 0) {
          rotationRef.current += 0.05
          setViewState(prev => ({
            ...prev,
            bearing: rotationRef.current % 360
          }))
        }
        
        lastFrameTimeRef.current = currentTime
        frameCount++
      }
      
      animationFrameRef.current = requestAnimationFrame(animate)
    }
    
    animationFrameRef.current = requestAnimationFrame(animate)
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [particles, performanceLevel, config, autoRotate, frameInterval, createConnectionsOptimized, animateParticles, animationState.time])

  // 레이어 생성 (성능 레벨에 따라 조정)
  const layers = useMemo(() => {
    const baseLayers = []
    
    // Seoul boundary layer
    if (boundaryData && performanceLevel !== 'low') {
      baseLayers.push(
        new GeoJsonLayer({
          id: 'seoul-boundary',
          data: boundaryData,
          pickable: false,
          stroked: true,
          filled: true,
          lineWidthScale: 1,
          lineWidthMinPixels: 1,
          lineWidthMaxPixels: 2,
          getFillColor: [0, 0, 0, 0], // Transparent fill
          getLineColor: [100, 150, 255, 100], // Subtle blue outline
          getLineWidth: 1,
        })
      )
    }
    
    // 연결선 레이어 (중간 이상 성능에서만)
    if (config.connectionCount > 0) {
      baseLayers.push(
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
          },
        })
      )
    }
    
    // 메인 파티클 레이어
    baseLayers.push(
      new ScatterplotLayer({
        id: "particle-layer",
        data: animatedData,
        pickable: false,
        opacity: 0.8,
        stroked: false,
        filled: true,
        radiusScale: 1,
        radiusMinPixels: 0.5,
        radiusMaxPixels: performanceLevel === 'high' ? 6 : 4,
        getPosition: (d: any) => d.position,
        getRadius: (d: any) => d.size,
        getFillColor: (d: any) => {
          const color = d.color
          return [...color, 200]
        },
        updateTriggers: {
          getPosition: animatedData,
        },
        parameters: {
          depthTest: false,
          blend: true,
          blendFunc: [770, 1],
        },
      })
    )
    
    // 글로우 레이어 (고성능 모드에서만)
    if (config.glowLayers > 0) {
      baseLayers.push(
        new ScatterplotLayer({
          id: "particle-glow",
          data: animatedData.filter((_, i) => i % 3 === 0),
          pickable: false,
          opacity: 0.2,
          stroked: false,
          filled: true,
          radiusScale: 2,
          radiusMinPixels: 1,
          radiusMaxPixels: 10,
          getPosition: (d: any) => d.position,
          getRadius: (d: any) => d.size * 1.5,
          getFillColor: (d: any) => [...d.color, 80],
          parameters: {
            depthTest: false,
            blend: true,
            blendFunc: [770, 1],
          },
        })
      )
    }
    
    return baseLayers
  }, [animatedData, connections, config.connectionCount, config.glowLayers, performanceLevel, boundaryData])

  // 뷰 상태 변경 핸들러 (디바운싱 적용)
  const handleViewStateChange = useCallback(({ viewState }: any) => {
    setViewState(viewState)
  }, [])

  // Show loading state
  if (isLoading) {
    return (
      <div className="relative w-full h-full flex items-center justify-center bg-[#000014]">
        <div className="text-white/60">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/60 mx-auto mb-4"></div>
          Loading Seoul boundaries...
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      <DeckGL
        viewState={viewState}
        onViewStateChange={handleViewStateChange}
        controller={true}
        layers={layers}
        parameters={{
          clearColor: [0, 0, 0.05, 1],
        }}
        // 성능 최적화 옵션
        getCursor={() => 'grab'}
        getTooltip={() => null}
      >
        <Map
          mapboxAccessToken={MAPBOX_TOKEN}
          mapStyle="mapbox://styles/mapbox/dark-v11"
          reuseMaps={true}
          preserveDrawingBuffer={false}
          onLoad={(evt) => {
            const map = evt.target
            
            try {
              // 최소한의 스타일 조정만
              const layers = map.getStyle().layers
              layers?.forEach((layer: any) => {
                if (layer.type === 'symbol') {
                  map.setLayoutProperty(layer.id, 'visibility', 'none')
                }
                if (layer.type === 'line') {
                  map.setPaintProperty(layer.id, 'line-opacity', 0.1)
                }
              })
            } catch (error) {
              console.warn('Map styling failed:', error)
            }
          }}
        />
      </DeckGL>

      {/* Animation Controls */}
      <AnimationControls
        config={animationConfig}
        onConfigChange={handleAnimationConfigChange}
        performanceLevel={performanceLevel}
      />

      {/* 성능 정보 표시 (개발 모드에서만) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm rounded px-3 py-2 text-xs text-white/80">
          <div>Performance: {performanceLevel.toUpperCase()}</div>
          <div>Particles: {config.particleCount}</div>
          <div>FPS: {config.fps}</div>
        </div>
      )}
      
      {/* 간단한 그라데이션 오버레이 */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 50%, transparent 40%, rgba(0, 0, 20, 0.4) 100%)`,
        }}
      />
    </div>
  )
}