"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { DeckGL } from '@deck.gl/react'
import { Map } from 'react-map-gl'
import type { MapRef } from 'react-map-gl'
import type { MapViewState, PickingInfo } from '@deck.gl/core'
import { LinearInterpolator } from '@deck.gl/core'
import mapboxgl from "mapbox-gl"
import 'mapbox-gl/dist/mapbox-gl.css'
import UnifiedControls from "./SalesDataControls"
import { LayerManager, formatTooltip } from "./LayerManager"
import { useLayerState } from "../hooks/useCardSalesData"

// Mapbox access token (실제 사용시에는 환경변수로 관리하세요)
const MAPBOX_TOKEN = "pk.eyJ1IjoieXN1MTUxNiIsImEiOiJjbWRyMHR2bTQwOTB2MmlzOGdlZmFldnVnIn0.Rv_I_4s0u88CYd7r9JbZDA"

export default function HexagonScene() {
  const mapRef = useRef<MapRef>(null)
  const cleanupRef = useRef<(() => void)[]>([])
  
  // 레이어 상태 관리
  const {
    layerConfig,
    hexagonData,
    isDataLoading,
    dataError,
    setVisible,
    setRadius,
    setElevationScale,
    setCoverage,
    setUpperPercentile,
    setColorScheme,
    resetConfig,
    setHoveredObject,
    setSelectedObject,
    // 애니메이션 관련 상태 및 함수들
    setAnimationEnabled,
    setAnimationSpeed,
    setWaveAmplitude,
    isAnimating,
    toggleAnimation,
    onAnimationInteractionStart,
    onAnimationInteractionEnd,
    
    // 회전 애니메이션 관련 상태 및 함수들
    rotationEnabled,
    rotationSpeed,
    rotationDirection,
    isRotating,
    shouldRotate,
    rotationDirectionText,
    bearingDisplay,
    setRotationEnabled,
    setRotationSpeed,
    setRotationDirection,
    toggleRotation,
    updateBearing,
    onRotationInteractionStart,
    onRotationInteractionEnd
  } = useLayerState()
  
  // 기본 지도 상태
  const [currentLayer, setCurrentLayer] = useState("night")
  const [currentTime, setCurrentTime] = useState(100)
  const [showHint, setShowHint] = useState(true)
  const [showBoundary, setShowBoundary] = useState(false)
  const [showSeoulBase, setShowSeoulBase] = useState(false)
  
  // DeckGL 초기 뷰 상태 (official deck.gl pattern)
  const [initialViewState, setInitialViewState] = useState<MapViewState>({
    longitude: 126.978,
    latitude: 37.5665,
    zoom: 11,
    pitch: 45,
    bearing: 0,
    minZoom: 5,
    maxZoom: 15
  })
  
  // 회전 제어를 위한 ref
  const rotationEnabledRef = useRef(false)
  const userInteractingRef = useRef(false)
  const currentBearingRef = useRef(0)

  // 서울 좌표
  const SEOUL_COORDINATES: [number, number] = [126.978, 37.5665]

  const mapStyles = {
    earth: "mapbox://styles/mapbox/satellite-v9",
    night: "mapbox://styles/mapbox/dark-v11",
    temperature: "mapbox://styles/mapbox/outdoors-v12",
    precipitation: "mapbox://styles/mapbox/light-v11",
    population: "mapbox://styles/mapbox/streets-v12",
    elevation: "mapbox://styles/mapbox/outdoors-v12",
  }

  const handleLayerChange = (layer: string) => {
    setCurrentLayer(layer)
  }

  const handleTimeChange = (time: number) => {
    setCurrentTime(time)
  }

  // Official deck.gl rotation pattern implementation (fixed with ref)
  const rotateCamera = useCallback(() => {
    if (!rotationEnabledRef.current || userInteractingRef.current) {
      return
    }
    
    // Use ref to get current bearing instead of closure value
    const currentBearing = currentBearingRef.current
    const increment = 30 * rotationSpeed * (rotationDirection === 'clockwise' ? 1 : -1)
    const nextBearing = currentBearing + increment
    const normalizedBearing = nextBearing >= 360 ? nextBearing - 360 : (nextBearing < 0 ? nextBearing + 360 : nextBearing)
    
    // Update ref immediately
    currentBearingRef.current = normalizedBearing
    
    // Calculate transition duration based on speed (slower speed = longer duration)
    const transitionDuration = Math.max(500, 2000 / rotationSpeed)
    
    // Update bearing state for UI display
    updateBearing(normalizedBearing)
    
    setInitialViewState(viewState => {
      return {
        ...viewState,
        bearing: normalizedBearing,
        transitionDuration,
        transitionInterpolator: new LinearInterpolator(['bearing']),
        onTransitionEnd: () => {
          if (rotationEnabledRef.current) {
            rotateCamera()
          }
        }
      }
    })
  }, [rotationSpeed, rotationDirection, rotationDirectionText, updateBearing])

  // Update rotation enabled ref when props change
  useEffect(() => {
    rotationEnabledRef.current = shouldRotate
    if (shouldRotate && !userInteractingRef.current) {
      // Start rotation with a small delay to ensure state is updated
      const timer = setTimeout(rotateCamera, 100)
      return () => clearTimeout(timer)
    }
  }, [shouldRotate, rotateCamera])

  // Sync bearing with MapBox when it changes
  useEffect(() => {
    if (mapRef.current && initialViewState.bearing !== undefined) {
      mapRef.current.setBearing(initialViewState.bearing)
    }
  }, [initialViewState.bearing])

  // Initialize bearing ref
  useEffect(() => {
    currentBearingRef.current = initialViewState.bearing || 0
  }, [])

  // DeckGL 레이어 생성
  const deckLayers = LayerManager({
    data: hexagonData,
    config: layerConfig,
    onHover: (info: PickingInfo) => {
      setHoveredObject(info.object)
    },
    onClick: (info: PickingInfo) => {
      setSelectedObject(info.object)
    },
    onAnimationInteractionStart,
    onAnimationInteractionEnd
  })

  // 레이어 상태 디버깅
  useEffect(() => {
  }, [hexagonData, layerConfig.visible, deckLayers.length, isDataLoading, dataError])

  // 툴팁 핸들러 (Context7 권장 패턴)
  const getTooltip = (info: PickingInfo) => {
    if (!info.object) return null
    return {
      html: formatTooltip(info),
      style: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        fontSize: '12px',
        padding: '8px',
        borderRadius: '4px',
        whiteSpace: 'pre-line'
      }
    }
  }

  // 안전한 레이어 관리 헬퍼 함수 (Context7 패턴)
  const addLayerSafely = (layerId: string, layerConfig: any, beforeId?: string) => {
    const map = mapRef.current?.getMap()
    if (!map) return
    
    try {
      // 기존 레이어가 있다면 제거
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId)
      }
      
      // 새 레이어 추가
      map.addLayer(layerConfig, beforeId)
    } catch (error) {
      console.warn(`Failed to add layer ${layerId}:`, error)
    }
  }

  useEffect(() => {
    // Mapbox access token 설정
    mapboxgl.accessToken = MAPBOX_TOKEN

    // 힌트 숨기기 타이머
    const hintTimer = setTimeout(() => {
      setShowHint(false)
    }, 3000)

    // 정리 함수
    return () => {
      clearTimeout(hintTimer)
    }
  }, [])

  // 지도 로드 완료 후 Mapbox 레이어 추가
  const handleMapLoad = () => {
    const map = mapRef.current?.getMap()
    if (!map) return

    // 서울 주요 지점들에 마커 추가
    const seoulLandmarks = [
      { name: "남산타워", coordinates: [126.9882, 37.5512] },
      { name: "경복궁", coordinates: [126.977, 37.5796] },
      { name: "한강공원", coordinates: [126.9356, 37.5219] },
      { name: "강남역", coordinates: [127.0276, 37.4979] },
      { name: "홍대입구", coordinates: [126.924, 37.5563] },
    ]

    seoulLandmarks.forEach((landmark) => {
      const popup = new mapboxgl.Popup({ offset: 25 }).setText(landmark.name)

      new mapboxgl.Marker({
        color: "#3b82f6",
        scale: 0.8,
      })
        .setLngLat(landmark.coordinates as [number, number])
        .setPopup(popup)
        .addTo(map)
    })

    // 서울 정확한 행정구역 GeoJSON 데이터 로드 (안전한 소스 추가)
    if (!map.getSource("seoul-boundary")) {
      try {
        map.addSource("seoul-boundary", {
          type: "geojson",
          data: "/seoul_boundary.geojson"
        })
      } catch (error) {
        console.warn("Failed to add seoul-boundary source:", error)
      }
    }

    // 서울 3D 입체 레이어 - 항상 추가하고 visibility로 제어 (Context7 패턴)
    if (map.getSource("seoul-boundary")) {
      addLayerSafely("seoul-3d-extrusion", {
        id: "seoul-3d-extrusion",
        type: "fill-extrusion",
        source: "seoul-boundary",
        layout: {
          visibility: showSeoulBase ? "visible" : "none"
        },
        paint: {
          "fill-extrusion-color": "#3b82f6", // 고정 색상 (Context7 권장)
          "fill-extrusion-height": 1500,      // 고정 높이 (Context7 권장)
          "fill-extrusion-base": 0,
          "fill-extrusion-opacity": 0.7,
          "fill-extrusion-vertical-gradient": true, // 3D 시각 효과
        },
      })
    }

    // 서울 경계선 레이어 - 항상 추가하고 visibility로 제어 (Context7 패턴)
    if (map.getSource("seoul-boundary")) {
      addLayerSafely("seoul-boundary-line", {
        id: "seoul-boundary-line",
        type: "line",
        source: "seoul-boundary",
        layout: {
          "line-join": "round",
          "line-cap": "round",
          visibility: showBoundary ? "visible" : "none"
        },
        paint: {
          "line-color": "#ffffff", // 흰색 경계선
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            8, 2,
            12, 4,
            16, 6
          ],
          "line-opacity": 0.95,
        },
      })
    }
  }

  // Memory cleanup effect
  useEffect(() => {
    return () => {
      // Clean up any remaining resources
      cleanupRef.current.forEach(cleanup => cleanup())
      cleanupRef.current = []
      
      // Force cleanup of heavy data structures
      if (window.gc) {
        setTimeout(() => window.gc?.(), 100)
      }
    }
  }, [])

  return (
    <div className="relative w-full h-screen">
      {/* DeckGL + Mapbox 통합 (Official deck.gl pattern) */}
      <DeckGL
        initialViewState={initialViewState}
        controller={true}
        layers={deckLayers}
        getTooltip={getTooltip}
        onLoad={rotateCamera} // Start rotation when deck.gl loads
        onDragStart={() => {
          userInteractingRef.current = true
          onAnimationInteractionStart()
          onRotationInteractionStart()
        }}
        onDragEnd={() => {
          userInteractingRef.current = false
          onAnimationInteractionEnd()
          onRotationInteractionEnd()
          // Resume rotation after user interaction ends
          if (rotationEnabledRef.current) {
            setTimeout(rotateCamera, 1000) // 1 second delay before resuming
          }
        }}
        onViewStateChange={({ viewState }) => {
          // Sync bearing ref when view state changes (e.g., during user interaction)
          if ('bearing' in viewState && viewState.bearing !== undefined && viewState.bearing !== currentBearingRef.current) {
            currentBearingRef.current = viewState.bearing
            updateBearing(viewState.bearing)
          }
        }}
      >
        <Map
          ref={mapRef}
          mapboxAccessToken={MAPBOX_TOKEN}
          mapStyle={mapStyles[currentLayer as keyof typeof mapStyles]}
          onLoad={handleMapLoad}
          reuseMaps
          style={{ width: '100%', height: '100%' }}
        />
      </DeckGL>

      {/* 통합 컨트롤 패널 */}
      <UnifiedControls
        // 지도 컨트롤 props
        onLayerChange={handleLayerChange}
        onTimeChange={handleTimeChange}
        currentLayer={currentLayer}
        currentTime={currentTime}
        showBoundary={showBoundary}
        showSeoulBase={showSeoulBase}
        onBoundaryToggle={(show) => {
          setShowBoundary(show)
          const map = mapRef.current?.getMap()
          if (map) {
            const layer = map.getLayer('seoul-boundary-line')
            if (layer) {
              try {
                map.setLayoutProperty('seoul-boundary-line', 'visibility', show ? 'visible' : 'none')
              } catch (error) {
                console.warn('Failed to toggle seoul boundary visibility:', error)
              }
            }
          }
        }}
        onSeoulBaseToggle={(show) => {
          setShowSeoulBase(show)
          const map = mapRef.current?.getMap()
          if (map) {
            const layer = map.getLayer('seoul-3d-extrusion')
            if (layer) {
              try {
                map.setLayoutProperty('seoul-3d-extrusion', 'visibility', show ? 'visible' : 'none')
              } catch (error) {
                console.warn('Failed to toggle seoul 3D extrusion visibility:', error)
              }
            }
          }
        }}
        // 레이어 컨트롤 props
        visible={layerConfig.visible}
        radius={layerConfig.radius}
        elevationScale={layerConfig.elevationScale}
        coverage={layerConfig.coverage}
        upperPercentile={layerConfig.upperPercentile}
        colorScheme={layerConfig.colorScheme}
        isDataLoading={isDataLoading}
        dataError={dataError}
        onVisibleChange={setVisible}
        onRadiusChange={setRadius}
        onElevationScaleChange={setElevationScale}
        onCoverageChange={setCoverage}
        onUpperPercentileChange={setUpperPercentile}
        onColorSchemeChange={setColorScheme}
        onReset={resetConfig}
        // 애니메이션 props
        animationEnabled={layerConfig.animationEnabled}
        animationSpeed={layerConfig.animationSpeed}
        waveAmplitude={layerConfig.waveAmplitude}
        isAnimating={isAnimating}
        onAnimationEnabledChange={setAnimationEnabled}
        onAnimationSpeedChange={setAnimationSpeed}
        onWaveAmplitudeChange={setWaveAmplitude}
        onToggleAnimation={toggleAnimation}
        // 회전 애니메이션 props
        rotationEnabled={rotationEnabled}
        rotationSpeed={rotationSpeed}
        rotationDirection={rotationDirection}
        isRotating={isRotating}
        rotationDirectionText={rotationDirectionText}
        bearingDisplay={bearingDisplay}
        onRotationEnabledChange={setRotationEnabled}
        onRotationSpeedChange={setRotationSpeed}
        onRotationDirectionChange={setRotationDirection}
        onToggleRotation={toggleRotation}
      />

      {showHint && (
        <div className="absolute bottom-4 right-4 bg-black bg-opacity-70 text-white text-sm px-4 py-2 rounded-lg transition-opacity duration-1000 opacity-80 hover:opacity-100 z-10">
          <div className="flex items-center space-x-2">
            <span>🗺️</span>
            <span>드래그하여 지도를 탐색하세요</span>
          </div>
        </div>
      )}

      {/* 서울 정보 패널 */}
      <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-md rounded-lg border border-white/20 p-4 text-white z-10">
        <h3 className="font-bold text-lg mb-2 flex items-center space-x-2">
          <span>서울특별시</span>
          {showBoundary && <span className="text-xs bg-blue-500/30 px-2 py-1 rounded">경계표시</span>}
          {showSeoulBase && <span className="text-xs bg-purple-500/30 px-2 py-1 rounded">3D효과</span>}
          {layerConfig.visible && <span className="text-xs bg-green-500/30 px-2 py-1 rounded">HexagonLayer</span>}
          {rotationEnabled && <span className="text-xs bg-orange-500/30 px-2 py-1 rounded">360°회전</span>}
        </h3>
        <div className="text-sm space-y-1 text-white/80">
          <div>
            📍 위치: {SEOUL_COORDINATES[1].toFixed(4)}°N, {SEOUL_COORDINATES[0].toFixed(4)}°E
          </div>
          <div>🏙️ 인구: 약 970만명</div>
          <div>📏 면적: 605.21 km²</div>
          <div>🏛️ 자치구: 25개 구역</div>
          <div>🌡️ 현재 시간: {new Date().toLocaleTimeString("ko-KR")}</div>
          {hexagonData && (
            <div>📊 데이터 포인트: {hexagonData.length}개</div>
          )}
          {rotationEnabled && (
            <div>🧭 회전각도: {bearingDisplay} ({rotationDirectionText})</div>
          )}
        </div>
      </div>

      {/* 오류 표시 */}
      {dataError && (
        <div className="absolute top-4 right-4 bg-red-500/90 text-white p-3 rounded-lg shadow-lg z-20">
          <div className="font-bold">데이터 로딩 오류</div>
          <div className="text-sm">{dataError}</div>
        </div>
      )}

      <style jsx global>{`
        .mapboxgl-popup-content {
          background: rgba(0, 0, 0, 0.8);
          color: white;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .mapboxgl-popup-tip {
          border-top-color: rgba(0, 0, 0, 0.8) !important;
        }
        
        .mapboxgl-ctrl-group {
          background: rgba(0, 0, 0, 0.8) !important;
          border-radius: 8px !important;
        }
        
        .mapboxgl-ctrl-group button {
          background: transparent !important;
          color: white !important;
        }
        
        .mapboxgl-ctrl-group button:hover {
          background: rgba(255, 255, 255, 0.1) !important;
        }
      `}</style>
    </div>
  )
}