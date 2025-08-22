"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { DeckGL } from '@deck.gl/react'
import { Map, Source, Layer } from 'react-map-gl'
import type { MapRef, MapLayerMouseEvent } from 'react-map-gl'
import type { MapViewState, PickingInfo } from '@deck.gl/core'
import { LinearInterpolator } from '@deck.gl/core'
import mapboxgl from "mapbox-gl"
import 'mapbox-gl/dist/mapbox-gl.css'
import UnifiedControls from "./SalesDataControls"
import { LayerManager, formatTooltip, createScatterplotLayer, createColumnLayer, formatScatterplotTooltip } from "./LayerManager"
import { useLayerState } from "../hooks/useCardSalesData"
import { SalesChartPanel } from "./charts/SalesChartPanel"
import LocalEconomyFilterPanel from "./LocalEconomyFilterPanel"
import { BusinessCategoryLegend } from "./BusinessCategoryLegend"
import type { FilterState } from "./LocalEconomyFilterPanel"
import { MAPBOX_TOKEN } from "@/src/shared/constants/mapConfig"
import { DistrictModeControl } from "@/src/shared/components/DistrictModeControl"
import { useDistrictSelection } from "@/src/shared/hooks/useDistrictSelection"
import { DISTRICT_LAYER_PAINT, loadDistrictData } from "@/src/shared/utils/districtUtils"

export default function HexagonScene() {
  const mapRef = useRef<MapRef>(null)
  const cleanupRef = useRef<(() => void)[]>([])
  const [showChartPanel, setShowChartPanel] = useState(false)
  
  // 레이어 상태 관리
  const {
    layerConfig,
    hexagonData,
    climateData,
    isDataLoading,
    dataError,
    colorMode,
    selectedHour,
    setVisible,
    setRadius,
    setElevationScale,
    setCoverage,
    setUpperPercentile,
    setColorScheme,
    setColorMode,
    setSelectedHour,
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
    onRotationInteractionEnd,
    
    // Hierarchical filter states and functions
    selectedGu,
    selectedDong,
    selectedMiddleCategory,
    selectedSubCategory,
    setSelectedGu,
    setSelectedDong,
    setSelectedMiddleCategory,
    setSelectedSubCategory
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
  
  // Handle filter panel changes
  const handleFilterChange = useCallback((filters: FilterState) => {
    // Update the hierarchical filter states
    if (filters.selectedGu !== selectedGu) setSelectedGu(filters.selectedGu)
    if (filters.selectedDong !== selectedDong) setSelectedDong(filters.selectedDong)
    if (filters.selectedMiddleCategory !== selectedMiddleCategory) setSelectedMiddleCategory(filters.selectedMiddleCategory)
    if (filters.selectedSubCategory !== selectedSubCategory) setSelectedSubCategory(filters.selectedSubCategory)
  }, [selectedGu, selectedDong, selectedMiddleCategory, selectedSubCategory, setSelectedGu, setSelectedDong, setSelectedMiddleCategory, setSelectedSubCategory])
  
  // District selection hook
  const districtSelection = useDistrictSelection({ 
    mapRef,
    onDistrictSelect: (districtName) => {
      console.log('Selected district:', districtName)
    }
  })
  
  // District GeoJSON data
  const [sggData, setSggData] = useState<any>(null)
  const [dongData, setDongData] = useState<any>(null)
  const [jibData, setJibData] = useState<any>(null)

  const mapStyles = {
    earth: "mapbox://styles/mapbox/dark-v11",
    night: "mapbox://styles/mapbox/dark-v11",
    temperature: "mapbox://styles/mapbox/dark-v11",
    precipitation: "mapbox://styles/mapbox/dark-v11",
    population: "mapbox://styles/mapbox/dark-v11",
    elevation: "mapbox://styles/mapbox/dark-v11",
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
  
  // Start/stop dash animation for selected district
  useEffect(() => {
    if (districtSelection.selectedFeature && districtSelection.selectionMode) {
      districtSelection.startDashAnimation()
    } else {
      districtSelection.stopDashAnimation()
    }
    
    return () => {
      districtSelection.stopDashAnimation()
    }
  }, [districtSelection.selectedFeature, districtSelection.selectionMode])

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

  // DeckGL 레이어 생성 - ColumnLayer 사용 (3D 바 + 구 이름 표시)
  const deckLayers = createColumnLayer(hexagonData, layerConfig)
  
  // 기존 HexagonLayer 코드 (주석 처리)
  // const deckLayers = LayerManager({
  //   data: hexagonData,
  //   config: layerConfig,
  //   onHover: (info: PickingInfo) => {
  //     console.log('[HexagonLayer3D] onHover triggered:', {
  //       hasObject: !!info.object,
  //       object: info.object,
  //       x: info.x,
  //       y: info.y,
  //       picked: info.picked,
  //       layerId: info.layer?.id
  //     })
  //     setHoveredObject(info.object)
  //   },
  //   onClick: (info: PickingInfo) => {
  //     console.log('[HexagonLayer3D] onClick triggered:', info)
  //     setSelectedObject(info.object)
  //   },
  //   onAnimationInteractionStart,
  //   onAnimationInteractionEnd
  // })

  // 레이어 상태 디버깅
  useEffect(() => {
    console.log('[Layer Debug] Layer state:', {
      hasData: !!hexagonData,
      dataLength: hexagonData?.length || 0,
      layerVisible: layerConfig.visible,
      layerCount: deckLayers.length,
      isLoading: isDataLoading,
      error: dataError,
      selectionMode: districtSelection.selectionMode,
      animationEnabled: layerConfig.animationEnabled
    })
    
    if (hexagonData && hexagonData.length > 0) {
      console.log('[Layer Debug] Sample data point:', hexagonData[0])
    }
  }, [hexagonData, layerConfig.visible, deckLayers.length, isDataLoading, dataError, districtSelection.selectionMode, layerConfig.animationEnabled])

  // 툴팁 핸들러 (Context7 권장 패턴)
  const getTooltip = (info: PickingInfo) => {
    console.log('[Tooltip Debug] getTooltip called with info:', {
      hasObject: !!info.object,
      object: info.object,
      x: info.x,
      y: info.y,
      layer: info.layer?.id
    })
    
    if (!info.object) {
      console.log('[Tooltip Debug] No object found in info')
      return null
    }
    
    try {
      // LayerConfig의 colorMode를 info에 추가
      const enhancedInfo = {
        ...info,
        layer: {
          ...info.layer,
          props: {
            ...info.layer?.props,
            colorMode: layerConfig.colorMode
          }
        }
      }
      
      // ScatterplotLayer용 툴팁 포맷터 사용 (구 이름 표시)
      const tooltipHtml = formatScatterplotTooltip(enhancedInfo)
      console.log('[Tooltip Debug] Tooltip HTML generated:', tooltipHtml)
      
      return {
        html: tooltipHtml,
        style: {
          backgroundColor: 'rgba(0, 0, 0, 0.95)',
          color: 'white',
          fontSize: '13px',
          padding: '14px',
          borderRadius: '8px',
          whiteSpace: 'pre-line',
          maxWidth: '380px',
          lineHeight: '1.6',
          boxShadow: '0 8px 16px rgba(0, 0, 0, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(8px)'
        }
      }
    } catch (error) {
      console.error('[Tooltip Debug] Error in getTooltip:', error)
      return {
        html: '⚠️ 툴팁 로드 중 오류 발생',
        style: {
          backgroundColor: 'rgba(255, 0, 0, 0.9)',
          color: 'white',
          padding: '8px',
          borderRadius: '4px'
        }
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
  
  // Load district data
  useEffect(() => {
    const loadData = async () => {
      const [sgg, dong, jib] = await Promise.all([
        loadDistrictData('sgg'),
        loadDistrictData('dong'),
        loadDistrictData('jib')
      ])
      
      if (sgg) setSggData(sgg)
      if (dong) setDongData(dong)
      if (jib) setJibData(jib)
    }
    
    loadData()
  }, [])

  // 지도 로드 완료 후 Mapbox 레이어 추가
  const handleMapLoad = () => {
    const map = mapRef.current?.getMap()
    if (!map) return

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
    <div className="relative w-full h-screen flex">
      {/* Map Section - Left Side */}
      <div className={`relative transition-all duration-500 ${showChartPanel ? 'w-3/5' : 'w-full'}`}>
        {/* DeckGL + Mapbox 통합 (Official deck.gl pattern) */}
        {console.log('[DeckGL Config]', {
          selectionMode: districtSelection.selectionMode,
          layersCount: deckLayers.length,
          hasGetTooltip: !!getTooltip,
          layersPassedCount: districtSelection.selectionMode ? 0 : deckLayers.length
        })}
        <DeckGL
        initialViewState={initialViewState}
        controller={true}
        layers={false ? [] : deckLayers} // 임시로 selectionMode 무시하고 항상 레이어 표시
        getTooltip={false ? undefined : getTooltip} // 임시로 selectionMode 무시하고 항상 툴팁 활성화
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
          onClick={(e: MapLayerMouseEvent) => {
            if (!districtSelection.handleDistrictClick(e)) {
              // Handle other click events if not in selection mode
            }
          }}
          onDblClick={districtSelection.handleMapReset}
          interactiveLayerIds={districtSelection.selectionMode ? ['sgg-fill'] : []}
          reuseMaps
          style={{ width: '100%', height: '100%' }}
        >
          {/* District layers */}
          {sggData && (
            <Source id="sgg-source" type="geojson" data={sggData}>
              <Layer
                id="sgg-fill"
                type="fill"
                paint={DISTRICT_LAYER_PAINT.sggFill}
                layout={{ 
                  visibility: (!districtSelection.selectionMode && districtSelection.sggVisible) || 
                             districtSelection.selectionMode ? 'visible' : 'none' 
                }}
              />
              <Layer
                id="sgg-line"
                type="line"
                paint={DISTRICT_LAYER_PAINT.sggLine}
                layout={{ 
                  visibility: (!districtSelection.selectionMode && districtSelection.sggVisible) || 
                             districtSelection.selectionMode ? 'visible' : 'none' 
                }}
              />
              
              {/* Selected district highlight */}
              {districtSelection.selectionMode && districtSelection.selectedFeature && (
                <>
                  <Layer
                    id="sgg-select-fill"
                    type="fill"
                    paint={DISTRICT_LAYER_PAINT.selectedFill}
                    filter={['==', ['get', 'SIGUNGU_NM'], districtSelection.selectedDistrict]}
                  />
                  <Layer
                    id="sgg-select-line"
                    type="line"
                    paint={DISTRICT_LAYER_PAINT.selectedLine(districtSelection.dashPhase)}
                    filter={['==', ['get', 'SIGUNGU_NM'], districtSelection.selectedDistrict]}
                  />
                </>
              )}
            </Source>
          )}
          
          {/* Dong layers */}
          {dongData && !districtSelection.selectionMode && (
            <Source id="dong-source" type="geojson" data={dongData}>
              <Layer
                id="dong-fill"
                type="fill"
                paint={DISTRICT_LAYER_PAINT.dongFill}
                layout={{ visibility: districtSelection.dongVisible ? 'visible' : 'none' }}
              />
              <Layer
                id="dong-line"
                type="line"
                paint={DISTRICT_LAYER_PAINT.dongLine}
                layout={{ visibility: districtSelection.dongVisible ? 'visible' : 'none' }}
              />
            </Source>
          )}
          
          {/* Jib layers */}
          {jibData && !districtSelection.selectionMode && initialViewState.zoom > 10 && (
            <Source id="jib-source" type="geojson" data={jibData}>
              <Layer
                id="jib-line"
                type="line"
                paint={DISTRICT_LAYER_PAINT.jibLine}
                layout={{ visibility: districtSelection.jibVisible ? 'visible' : 'none' }}
                minzoom={10}
              />
            </Source>
          )}
        </Map>
      </DeckGL>
      
      {/* District Mode Control */}
      <DistrictModeControl
        selectionMode={districtSelection.selectionMode}
        onModeChange={districtSelection.setSelectionMode}
        selectedDistrict={districtSelection.selectedDistrict}
        sggVisible={districtSelection.sggVisible}
        dongVisible={districtSelection.dongVisible}
        jibVisible={districtSelection.jibVisible}
        onSggVisibleChange={districtSelection.setSggVisible}
        onDongVisibleChange={districtSelection.setDongVisible}
        onJibVisibleChange={districtSelection.setJibVisible}
        zoomLevel={initialViewState.zoom}
      />

      {/* LocalEconomy Filter Panel - Positioned properly above map */}
      <LocalEconomyFilterPanel
        hexagonData={hexagonData}
        climateData={climateData}
        onFilterChange={handleFilterChange}
      />

      {/* 통합 컨트롤 패널 */}
      {!districtSelection.selectionMode && (
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
        // 색상 모드 props
        colorMode={colorMode}
        onColorModeChange={setColorMode}
        selectedHour={selectedHour}
        onSelectedHourChange={setSelectedHour}
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
      )}

      {showHint && (
        <div className="absolute bottom-4 right-4 bg-black bg-opacity-70 text-white text-sm px-4 py-2 rounded-lg transition-opacity duration-1000 opacity-80 hover:opacity-100 z-10">
          <div className="flex items-center space-x-2">
            <span>🗺️</span>
            <span>드래그하여 지도를 탐색하세요</span>
          </div>
        </div>
      )}

      {/* Business Category Legend */}
      <BusinessCategoryLegend />

      {/* 서울 정보 패널 - Move to bottom-right to avoid overlap */}
      <div className="absolute bottom-4 right-[226px] bg-black/80 backdrop-blur-md rounded-lg border border-white/20 p-4 text-white z-10">
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
          {selectedGu && (
            <div>🎯 선택된 구: {selectedGu} {selectedDong && `- ${selectedDong}`}</div>
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
      
      {/* Chart Panel - Right Side */}
      {showChartPanel && (
        <div className="w-2/5 h-full p-4 bg-black/80">
          <SalesChartPanel />
        </div>
      )}
      
      {/* Chart Panel Toggle Button */}
      <button
        onClick={() => setShowChartPanel(!showChartPanel)}
        className="absolute top-[66px] right-4 z-20 px-4 py-2 bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d={showChartPanel 
              ? "M6 18L18 6M6 6l12 12" 
              : "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            } 
          />
        </svg>
        <span>{showChartPanel ? 'Close' : 'Charts'}</span>
      </button>
    </div>
  )
}