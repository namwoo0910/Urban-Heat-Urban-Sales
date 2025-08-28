"use client"

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react"
import { DeckGL } from '@deck.gl/react'
import { Map as MapGL, Source, Layer } from 'react-map-gl'
import type { MapRef, MapLayerMouseEvent } from 'react-map-gl'
import type { MapViewState, PickingInfo } from '@deck.gl/core'
import { LinearInterpolator, FlyToInterpolator } from '@deck.gl/core'
import mapboxgl from "mapbox-gl"
import 'mapbox-gl/dist/mapbox-gl.css'
import UnifiedControls from "./SalesDataControls"
import { LayerManager, formatTooltip, createScatterplotLayer, createColumnLayer, formatScatterplotTooltip } from "./LayerManager"
import { useLayerState } from "../hooks/useCardSalesData"
import { SalesChartPanel } from "./charts/SalesChartPanel"
import LocalEconomyFilterPanel from "./LocalEconomyFilterPanel"
import { BusinessTypeLegend } from "./BusinessTypeLegend"
import type { FilterState } from "./LocalEconomyFilterPanel"
import { getDistrictCode, getDongCode } from "../data/districtCodeMappings"
import { SelectedAreaSalesInfo } from "./SelectedAreaSalesInfo"
import { DistrictLabelsLayer, DistrictLabelsOverlay } from "./DistrictLabelsLayer"
import { MAPBOX_TOKEN } from "@/src/shared/constants/mapConfig"
import { useDistrictSelection } from "@/src/shared/hooks/useDistrictSelection"
import { DISTRICT_LAYER_PAINT, DISTRICT_COLORS, loadDistrictData } from "@/src/shared/utils/districtUtils"
import { getDistrictCenter } from "../data/districtCenters"
import { calculateBoundaryElevation } from "@/src/shared/constants/elevationConstants"
import { RotateCcw } from "lucide-react"
import "../styles/HexagonLayer.css"

// 기본 서울 뷰 설정 상수
const DEFAULT_SEOUL_VIEW = {
  longitude: 126.978,
  latitude: 37.5565,
  zoom: 11,
  pitch: 30,
  bearing: 10,
  minZoom: 5,
  maxZoom: 15
} as const

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
    
    // 표시 모드
    displayMode,
    setDisplayMode,
    toggleDisplayMode,
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
    selectedGuCode,
    selectedDong,
    selectedDongCode,
    selectedBusinessType,
    selectedSubCategory,
    setSelectedGu,
    setSelectedGuCode,
    setSelectedDong,
    setSelectedDongCode,
    setSelectedBusinessType,
    setSelectedSubCategory,
    
  } = useLayerState()
  
  // 기본 지도 상태
  const [currentLayer, setCurrentLayer] = useState("very-dark")
  const [currentTime, setCurrentTime] = useState(100)
  const [showHint, setShowHint] = useState(true)
  const [showBoundary, setShowBoundary] = useState(false)
  const [showSeoulBase, setShowSeoulBase] = useState(false)
  const [showDistrictLabels, setShowDistrictLabels] = useState(true) // 구 이름 표시
  
  // DeckGL 뷰 상태 - controlled component pattern for synchronization
  const [viewState, setViewState] = useState<MapViewState>({
    ...DEFAULT_SEOUL_VIEW,
    bearing: 0  // 초기 bearing은 0으로 설정
  })
  
  // 회전 제어를 위한 ref
  const rotationEnabledRef = useRef(false)
  const userInteractingRef = useRef(false)
  const currentBearingRef = useRef(0)
  
  // Track programmatic vs user-initiated view changes to prevent infinite loops
  const isProgrammaticUpdateRef = useRef(false)

  // 서울 좌표
  const SEOUL_COORDINATES: [number, number] = [126.978, 37.5665]
  
  // 기본 뷰로 리셋하는 재사용 함수
  const resetToDefaultView = useCallback((transitionDuration = 800) => {
    isProgrammaticUpdateRef.current = true
    setViewState({
      ...DEFAULT_SEOUL_VIEW,
      transitionDuration,
      transitionInterpolator: new FlyToInterpolator(),
      transitionEasing: (t: number) => t * (2 - t)
    })
    
    setTimeout(() => {
      isProgrammaticUpdateRef.current = false
    }, transitionDuration + 100)
  }, [])
  
  // Handle filter panel changes - simplified to prevent loops
  const handleFilterChange = useCallback((filters: FilterState) => {
    // Directly update states without checking current values
    // This prevents unnecessary re-renders and loops
    console.log('[HexagonLayer3D] Filter change received:', filters)
    setSelectedGu(filters.selectedGu)
    setSelectedGuCode(filters.selectedGuCode)
    setSelectedDong(filters.selectedDong)
    setSelectedDongCode(filters.selectedDongCode)
    setSelectedBusinessType(filters.selectedBusinessType)
    
    // 행정동 선택시에도 현재 표시 모드를 유지
    // Display mode는 사용자가 버튼을 통해서만 변경
    // Note: selectedSubCategory removed - not part of FilterState interface
  }, [setSelectedGu, setSelectedGuCode, setSelectedDong, setSelectedDongCode, setSelectedBusinessType])
  
  // Hover state for districts
  const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null)
  
  // Animation state for selected districts
  const [animatingDistrict, setAnimatingDistrict] = useState<string | null>(null)
  const [previousSelectedDistrict, setPreviousSelectedDistrict] = useState<string | null>(null)

  // District selection hook
  const districtSelection = useDistrictSelection({ 
    mapRef,
    onDistrictSelect: (districtName, feature) => {
      console.log('Selected district:', districtName)
      // Trigger animation for newly selected district
      setAnimatingDistrict(districtName)
      setPreviousSelectedDistrict(districtName)
      
      // Update filter panel when map is clicked
      if (feature?.layer?.id === 'sgg-fill') {
        setSelectedGu(districtName)
        setSelectedDong(null)  // Clear dong when gu is selected
      } else if (feature?.layer?.id === 'dong-fill') {
        setSelectedDong(districtName)
        // 행정동 선택시에도 현재 표시 모드를 유지
        // Display mode는 사용자가 버튼을 통해서만 변경
        // Don't change gu when dong is selected (dong belongs to current gu)
      }
    }
  })
  
  // District GeoJSON data
  const [sggData, setSggData] = useState<any>(null)
  const [dongData, setDongData] = useState<any>(null)
  const [jibData, setJibData] = useState<any>(null)


  const handleLayerChange = (layer: string) => {
    setCurrentLayer(layer)
  }

  const handleTimeChange = (time: number) => {
    setCurrentTime(time)
  }
  
  // 구 이름 클릭 핸들러
  const handleDistrictLabelClick = useCallback((districtName: string) => {
    console.log('District label clicked:', districtName)
    setSelectedGu(districtName)
    setSelectedDong(null)
    // 구 코드 설정
    const guCode = getDistrictCode(districtName)
    if (guCode) {
      setSelectedGuCode(guCode)
    }
    setSelectedDongCode(null)
    
    // 구 라벨 클릭시: 서울 전체 뷰 유지, 하이라이트만 표시
    // 줌인하지 않음
    console.log('[District Label Click] Selected gu:', districtName, ' - maintaining Seoul view')
  }, [setSelectedGu, setSelectedDong, setSelectedGuCode, setSelectedDongCode])
  
  // 전체 초기화 함수 - 필터, 레이어, 뷰 모두 리셋
  const handleFullReset = useCallback(() => {
    // 1. 레이어 설정 초기화
    resetConfig()
    
    // 2. 필터 상태 초기화
    setSelectedGu(null)
    setSelectedDong(null)
    setSelectedBusinessType(null)
    setSelectedSubCategory(null)
    
    // 3. 표시 모드를 simple로 리셋
    setDisplayMode('simple')
    
    // 4. 뷰포트를 서울 전체로 리셋 (재사용 함수 사용)
    resetToDefaultView()
  }, [resetConfig, setSelectedGu, setSelectedDong, setSelectedSubCategory, setDisplayMode, resetToDefaultView])

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
    
    // Set programmatic flag for rotation animation
    isProgrammaticUpdateRef.current = true
    setViewState(prevViewState => {
      return {
        ...prevViewState,
        bearing: normalizedBearing,
        transitionDuration,
        transitionInterpolator: new LinearInterpolator(['bearing']),
        onTransitionEnd: () => {
          isProgrammaticUpdateRef.current = false
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
  
  // Manage animation state for selected districts
  useEffect(() => {
    if (districtSelection.selectedDistrict) {
      // Start animation for new selection
      setAnimatingDistrict(districtSelection.selectedDistrict)
      
      // Force re-render of layers to apply color changes
      const map = mapRef.current?.getMap()
      if (map) {
        // Ensure layers are visible with proper opacity
        const fillLayer = map.getLayer('sgg-select-fill')
        const animatedLayer = map.getLayer('sgg-select-fill-animated')
        
        if (fillLayer) {
          // Force the layer to update
          map.setPaintProperty('sgg-select-fill', 'fill-opacity', 
            map.getPaintProperty('sgg-select-fill', 'fill-opacity'))
        }
        
        if (animatedLayer) {
          // Force the animated layer to update
          map.setPaintProperty('sgg-select-fill-animated', 'fill-opacity',
            map.getPaintProperty('sgg-select-fill-animated', 'fill-opacity'))
        }
      }
      
      // Keep animation active
      const animationTimer = setTimeout(() => {
        // Animation continues indefinitely for selected district
      }, 800)
      
      return () => clearTimeout(animationTimer)
    } else {
      // Clear animation when no district is selected
      setAnimatingDistrict(null)
    }
  }, [districtSelection.selectedDistrict])

  // Sync bearing with MapBox when it changes
  useEffect(() => {
    if (mapRef.current && viewState.bearing !== undefined) {
      mapRef.current.setBearing(viewState.bearing)
    }
  }, [viewState.bearing])

  // Initialize bearing ref
  useEffect(() => {
    currentBearingRef.current = viewState.bearing || 0
  }, [])

  // Handle hexagon hover for district-wide highlighting
  const handleHexagonHover = useCallback((info: PickingInfo) => {
    const canvas = mapRef.current?.getCanvas()
    
    if (info.object && info.object.originalData) {
      const dongName = info.object.originalData.dongName
      setHoveredObject(info.object)
      
      // Set hovered district for district-wide highlighting
      if (dongName) {
        setHoveredDistrict(dongName)
      }
      
      // Change cursor to pointer for better UX
      if (canvas) {
        canvas.style.cursor = 'pointer'
      }
    } else {
      setHoveredObject(null)
      setHoveredDistrict(null)
      
      // Reset cursor
      if (canvas) {
        canvas.style.cursor = 'grab'
      }
    }
  }, [setHoveredObject])

  // Handle hexagon click - matches new viewport logic
  const handleHexagonClick = useCallback((info: PickingInfo) => {
    if (info.object && info.object.originalData) {
      const { guName, dongName, guCode, dongCode } = info.object.originalData
      
      // Add visual feedback for click
      const canvas = mapRef.current?.getCanvas()
      if (canvas) {
        canvas.style.cursor = 'grabbing'
        setTimeout(() => {
          canvas.style.cursor = 'grab'
        }, 200)
      }
      
      // Set district selections with both names and codes
      if (dongName && guName) {
        // 동 클릭시: 구와 동 모두 설정
        setSelectedGu(guName)
        const calculatedGuCode = guCode || getDistrictCode(guName)
        const calculatedDongCode = dongCode || getDongCode(guName, dongName)
        
        setSelectedGuCode(calculatedGuCode)
        setSelectedDong(dongName)
        setSelectedDongCode(calculatedDongCode)
        
        console.log('[HexagonClick] Selected dong:', { guName, guCode: calculatedGuCode, dongName, dongCode: calculatedDongCode })
      } else if (guName) {
        // 구 클릭시: 구만 설정 (서울 전체 뷰 유지)
        setSelectedGu(guName)
        const calculatedGuCode = guCode || getDistrictCode(guName)
        setSelectedGuCode(calculatedGuCode)
        setSelectedDong(null)
        setSelectedDongCode(null)
        
        console.log('[HexagonClick] Selected gu:', { guName, guCode: calculatedGuCode })
      }
      
      // 뷰포트 변경은 useEffect에서 자동 처리됨
    }
  }, [setSelectedGu, setSelectedGuCode, setSelectedDong, setSelectedDongCode])

  // DeckGL 레이어 생성 - ColumnLayer 사용 (3D 바 + 구 이름 표시)
  const columnLayers = createColumnLayer(hexagonData, {
    ...layerConfig,
    selectedBusinessType: selectedBusinessType,
    colorMode: selectedBusinessType ? 'category' : layerConfig.colorMode,
    displayMode: displayMode,
    // Enable interaction handlers
    onHover: handleHexagonHover,
    onClick: handleHexagonClick,
    // District highlighting
    hoveredDistrict: hoveredDistrict
  })
  
  // Use column layers directly
  const deckLayers = columnLayers
  
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

  // 자치구 선택 디버깅


  // 툴팁 핸들러 (Context7 권장 패턴)
  const getTooltip = (info: PickingInfo) => {
    if (!info.object) {
      return null
    }
    
    try {
      // ColumnLayer의 경우 (업종 카테고리 데이터)
      if (info.layer?.id === 'column-layer' && info.object.originalData) {
        const { originalData } = info.object
        const date = originalData.date || '날짜 정보 없음'
        const guName = originalData.guName || '정보 없음'
        const dongName = originalData.dongName || '정보 없음'
        const businessType = originalData.businessType || originalData.middleCategory || info.object.businessType || info.object.middleCategory || '업종 정보 없음'
        const sales = originalData.categorySales || info.object.weight || 0
        
        const tooltipHtml = `
<div style="font-family: 'Noto Sans KR', sans-serif;">
  <div style="margin-bottom: 8px;">
    <span style="opacity: 0.8;">📅</span> <strong>날짜:</strong> ${date}
  </div>
  <div style="margin-bottom: 8px;">
    <span style="opacity: 0.8;">📍</span> <strong>지역:</strong> ${guName} ${dongName}
  </div>
  <div style="margin-bottom: 8px;">
    <span style="opacity: 0.8;">💼</span> <strong>업종:</strong> ${businessType}
  </div>
  <div>
    <span style="opacity: 0.8;">💰</span> <strong>매출액:</strong> ${sales.toLocaleString()}원
  </div>
</div>
        `.trim()
        
        return {
          html: tooltipHtml,
          style: {
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            color: 'white',
            fontSize: '13px',
            padding: '14px',
            borderRadius: '8px',
            whiteSpace: 'normal',
            maxWidth: '280px',
            lineHeight: '1.6',
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(8px)'
          }
        }
      }
      
      // 기존 HexagonLayer의 경우 (폴백)
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
      
      const tooltipHtml = formatScatterplotTooltip(enhancedInfo)
      
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
      
      if (sgg) {
        setSggData(sgg)
        if (sgg.features?.[0]) {
          console.log('[DataLoad] Sample sgg properties:', sgg.features[0].properties)
        }
      }
      if (dong) {
        setDongData(dong)
        if (dong.features?.[0]) {
          console.log('[DataLoad] Sample dong properties:', dong.features[0].properties)
          console.log('[DataLoad] Dong property keys:', Object.keys(dong.features[0].properties))
        }
      }
      if (jib) setJibData(jib)
    }
    
    loadData()
  }, [])

  // currentLayer 변경시 오버레이 업데이트
  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!map) return

    // very-dark 스타일일 때 검정 오버레이 추가
    if (currentLayer === 'very-dark') {
      // 맵 스타일 로드 완료 후 오버레이 추가
      const addOverlay = () => {
        if (!map.getLayer("dark-overlay")) {
          addLayerSafely("dark-overlay", {
            id: "dark-overlay",
            type: "background",
            paint: {
              'background-color': 'rgba(0, 0, 0, 0.3)'  // 40% 검정 오버레이
            }
          })
        }
      }
      
      // 스타일 로드 완료 확인
      if (map.isStyleLoaded()) {
        addOverlay()
      } else {
        map.once('styledata', addOverlay)
      }
    } else {
      // 다른 스타일로 변경시 오버레이 제거
      if (map.getLayer("dark-overlay")) {
        map.removeLayer("dark-overlay")
      }
    }
  }, [currentLayer])

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

    // 서울 경계선 레이어 - 경계만 표시, 내부 색칠 없음
    if (map.getSource("seoul-boundary")) {
      // 서울 경계 그림자 효과 (선택적)
      addLayerSafely("seoul-boundary-shadow", {
        id: "seoul-boundary-shadow",
        type: "line",
        source: "seoul-boundary",
        layout: {
          "line-join": "round",
          "line-cap": "round",
          visibility: showBoundary ? "visible" : "none"
        },
        paint: {
          "line-color": "rgba(0, 0, 0, 0.2)",
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            8, 3,
            12, 5,
            16, 7
          ],
          "line-blur": 2,
          "line-opacity": 0.5,
          "line-translate": [2, 2]
        },
      })

      // 메인 서울 경계선 - 깔끔한 아웃라인만
      addLayerSafely("seoul-boundary-line", {
        id: "seoul-boundary-line",
        type: "line",
        source: "seoul-boundary",
        layout: {
          "line-join": "round",
          "line-cap": "round",
          visibility: showBoundary ? "visible" : "none"
        },
        paint: DISTRICT_LAYER_PAINT.seoulBoundaryLine,
      })

      // 서울 경계 하이라이트 효과 (선택적)
      addLayerSafely("seoul-boundary-highlight", {
        id: "seoul-boundary-highlight",
        type: "line",
        source: "seoul-boundary",
        layout: {
          "line-join": "round",
          "line-cap": "round",
          visibility: showBoundary ? "visible" : "none"
        },
        paint: {
          "line-color": "rgba(255, 255, 255, 0.3)",
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            8, 0.5,
            12, 1,
            16, 1.5
          ],
          "line-blur": 0.5,
          "line-opacity": 0.6,
          "line-translate": [-1, -1]
        },
      })
    }
  }

  // District selection data for separate layers
  const [selectedDistrictData, setSelectedDistrictData] = useState<any>(null)

  // Create fast lookup indices for districts
  const sggIndex = useMemo(() => {
    if (!sggData?.features) {
      console.log('[SggIndex] No sgg data available')
      return new Map()
    }
    
    const index = new Map()
    
    sggData.features.forEach((f: any) => {
      const props = f.properties || {}
      // 구 코드로 인덱싱 - 다양한 속성명 지원 (한글 속성명 포함)
      const guCode = props.SIG_CD || props.SGG_CD || props.GU_CD || props.SIGUNGU_CD || props['시군구코드'] || props['구코드']
      const guName = props.SIGUNGU_NM || props.SIG_KOR_NM || props.GU_NM || props['구명']
      
      if (guCode) {
        // 코드를 숫자로 변환하여 저장
        const codeNumber = Number(guCode)
        index.set(codeNumber, f)
        // 디버깅용 - 첫 5개 항목 로깅
        if (index.size <= 5) {
          console.log('[SggIndex] Added by code:', { code: codeNumber, name: guName })
        }
      }
      
      // 이름으로도 인덱싱 (폴백용)
      if (guName) {
        index.set(guName, f)
        if (index.size <= 10) {
          console.log('[SggIndex] Added by name:', guName)
        }
      }
    })
    
    console.log('[SggIndex] Created index with', index.size, 'entries (codes and names)')
    console.log('[SggIndex] Sample keys:', Array.from(index.keys()).slice(0, 10))
    return index
  }, [sggData])

  const dongIndex = useMemo(() => {
    if (!dongData?.features) {
      console.log('[DongIndex] No dong data available')
      return new Map()
    }
    
    const index = new Map()
    
    dongData.features.forEach((f: any) => {
      const props = f.properties || {}
      // 행정동 코드로 인덱싱 - 다양한 속성명 지원 (한글 속성명 포함)
      const dongCode = props.ADM_CD || props.H_CD || props.DONG_CD || props.ADM_DR_CD || props.EMD_CD || props['행정동코드']
      
      if (dongCode) {
        // 코드를 숫자로 변환하여 저장
        const codeNumber = Number(dongCode)
        index.set(codeNumber, f)
        // 디버깅용 - 첫 5개 항목 로깅
        if (index.size <= 5) {
          console.log('[DongIndex] Added:', { code: codeNumber, name: props.ADM_NM || props.H_DONG_NM || props.DONG_NM })
        }
      }
    })
    
    console.log('[DongIndex] Created code-based index with', index.size, 'entries')
    return index
  }, [dongData])

  // Simple district selection logic using separate layers (from map click)
  useEffect(() => {
    if (districtSelection.selectedDistrict && districtSelection.selectedDistrict !== '없음' && districtSelection.selectedFeature) {
      // Create a simple FeatureCollection with just the selected feature
      const selectedFeatureData = {
        type: 'FeatureCollection',
        features: [districtSelection.selectedFeature]
      }
      
      console.log('[Setting Selected District from Map Click]', {
        districtName: districtSelection.selectedDistrict,
        layerType: districtSelection.selectedFeature?.layer?.id,
        hasFeature: !!districtSelection.selectedFeature
      })
      
      setSelectedDistrictData(selectedFeatureData)
    } else if (!selectedGu && !selectedDong) {
      // Only clear if no filter is selected
      console.log('[Clearing Selected District]')
      setSelectedDistrictData(null)
    }
  }, [districtSelection.selectedDistrict, districtSelection.selectedFeature, selectedGu, selectedDong])

  // Filter-based district selection (from filter panel) - OPTIMIZED with FlyTo animation
  useEffect(() => {
    // Skip if there's a map-clicked selection that's different from filter selection
    if (districtSelection.selectedDistrict && 
        districtSelection.selectedDistrict !== '없음' &&
        districtSelection.selectedDistrict !== selectedDong &&
        districtSelection.selectedDistrict !== selectedGu) {
      return
    }

    if (selectedGuCode || selectedDongCode || selectedGu || selectedDong) {
      console.log('[District Selection] Selected:', { 
        guCode: selectedGuCode, 
        guName: selectedGu,
        dongCode: selectedDongCode,
        dongName: selectedDong 
      })
      
      let foundFeature = null
      let foundGuFeature = null // 동 선택시 구 경계도 필요
      
      // Fast lookup using Map index with codes - O(1) instead of O(n)
      // 동이 선택된 경우 동 경계를 하이라이트
      if (selectedDongCode) {
        console.log('[DongSelection] Looking for dong code:', selectedDongCode, 'Type:', typeof selectedDongCode)
        const dongFeature = dongIndex.get(selectedDongCode)
        if (dongFeature) {
          console.log('[DongSelection] Found dong feature:', dongFeature.properties)
          console.log('[DongSelection] Dong properties keys:', Object.keys(dongFeature.properties))
          foundFeature = dongFeature
          
          // 동 선택시 해당 구 경계도 찾기
          if (selectedGuCode || selectedGu) {
            let sggFeature = selectedGuCode ? sggIndex.get(selectedGuCode) : null
            if (!sggFeature && selectedGu) {
              sggFeature = sggIndex.get(selectedGu)
            }
            if (sggFeature) {
              console.log('[DongSelection] Also found gu feature for context:', sggFeature.properties)
              foundGuFeature = sggFeature
            }
          }
        } else {
          console.log('[DongSelection] Dong code not found in index!')
          console.log('[DongSelection] Available keys types:', Array.from(dongIndex.keys()).slice(0, 5).map(k => typeof k))
          console.log('[DongSelection] Available codes:', Array.from(dongIndex.keys()).slice(0, 10))
        }
      }
      // 구만 선택된 경우 구 경계를 하이라이트  
      else if (selectedGuCode || selectedGu) {
        console.log('[GuSelection] Looking for gu:', { code: selectedGuCode, name: selectedGu })
        console.log('[GuSelection] sggIndex size:', sggIndex.size)
        
        // Try code first
        let sggFeature = selectedGuCode ? sggIndex.get(selectedGuCode) : null
        
        // If code doesn't work, try name as fallback
        if (!sggFeature && selectedGu) {
          console.log('[GuSelection] Code not found, trying name:', selectedGu)
          sggFeature = sggIndex.get(selectedGu)
        }
        
        if (sggFeature) {
          console.log('[GuSelection] Found gu feature:', sggFeature.properties)
          foundFeature = sggFeature
        } else {
          console.log('[GuSelection] Gu not found in index!')
          console.log('[GuSelection] Available keys (first 20):', Array.from(sggIndex.keys()).slice(0, 20))
        }
      }
      
      if (foundFeature) {
        // 동 선택시 구 경계도 함께 표시하기 위해 features 배열 구성
        const features = foundGuFeature 
          ? [foundGuFeature, foundFeature] // 구를 먼저, 동을 나중에 (레이어 순서)
          : [foundFeature] // 구만
        
        const selectedFeatureData = {
          type: 'FeatureCollection',
          features: features
        }
        
        console.log('[SelectedFeatures] Created FeatureCollection with', features.length, 'features')
        features.forEach((f, idx) => {
          console.log(`[Feature ${idx}]:`, Object.keys(f.properties).slice(0, 5), '...')
        })
        
        setSelectedDistrictData(selectedFeatureData)
        
        // 카메라 이동 로직 수정
        if (selectedDong && selectedGu) {
          // 동 선택시: 해당 구로 줌인
          const guCenter = getDistrictCenter('구', selectedGu)
          if (guCenter) {
            isProgrammaticUpdateRef.current = true
            setViewState(prevState => ({
              ...prevState,
              longitude: guCenter[0],
              latitude: guCenter[1],
              zoom: 13, // 구 레벨 줌 (행정동들이 잘 보이는 레벨)
              pitch: 45, // 적당한 3D 각도
              bearing: prevState.bearing || 0,
              transitionDuration: 1500,
              transitionInterpolator: new FlyToInterpolator({ speed: 1.2 }),
              transitionEasing: (t: number) => t * t * (3.0 - 2.0 * t)
            }))
            setTimeout(() => {
              isProgrammaticUpdateRef.current = false
            }, 1600)
          }
        } else if (selectedGu && !selectedDong) {
          // 구만 선택시: 서울 전체 뷰 유지, 하이라이트만 표시
          // 줌 변경 없이 현재 뷰 유지 (서울 전체가 보이는 상태)
          console.log('[GuSelection] Maintaining Seoul-wide view with district highlight')
          // 뷰포트 변경하지 않음 - 하이라이트만 표시됨
        }
      } else {
        setSelectedDistrictData(null)
        console.log('[District Selection] No feature found for codes:', { guCode: selectedGuCode, dongCode: selectedDongCode })
      }
    } else {
      // Reset to Seoul overview when no filter is selected
      setSelectedDistrictData(null)
      console.log('[District Selection] No district selected, resetting to Seoul overview')
      
      // 전체 서울로 돌아가도 현재 표시 모드를 유지
      // Display mode는 사용자가 버튼을 통해서만 변경
      
      // Return to default Seoul view (재사용 함수 사용)
      resetToDefaultView()
    }
  }, [selectedGuCode, selectedDongCode, selectedGu, selectedDong, districtSelection.selectedDistrict, sggIndex, dongIndex, resetToDefaultView]) // Use both codes and names

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

  console.log('[DeckGL Config]', {
    selectionMode: districtSelection.selectionMode,
    layersCount: deckLayers.length,
    hasGetTooltip: !!getTooltip,
    layersPassedCount: districtSelection.selectionMode ? 0 : deckLayers.length
  })

  return (
    <div className="relative w-full h-screen flex">
      {/* Map Section - Left Side */}
      <div className={`relative transition-all duration-500 ${showChartPanel ? 'w-3/5' : 'w-full'}`}>
        {/* DeckGL + Mapbox 통합 (Official deck.gl pattern) */}
        <DeckGL
        viewState={viewState}
        controller={true}
        layers={false ? [] : deckLayers} // 임시로 selectionMode 무시하고 항상 레이어 표시
        getTooltip={false ? undefined : getTooltip} // 임시로 selectionMode 무시하고 항상 툴팁 활성화
        getCursor={({isDragging, isHovering}) => {
          if (isDragging) return 'grabbing'
          if (isHovering) return 'pointer'
          return 'grab'
        }}
        parameters={{
          depthTest: true,
          depthFunc: 0x0203, // GL.LEQUAL
          blend: true,
          blendFunc: [0x0302, 0x0303], // [GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA]
          blendEquation: 0x8006 // GL.FUNC_ADD
        }}
        onClick={(info, event) => {
          // 이벤트가 레이어로 전파되도록 함
          return true
        }}
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
        onViewStateChange={({ viewState: newViewState }) => {
          // Skip if this is a programmatic update to prevent infinite loops
          if (isProgrammaticUpdateRef.current) {
            return
          }
          
          // Update the viewState to keep DeckGL and MapGL synchronized
          const mapViewState = newViewState as MapViewState
          setViewState(mapViewState)
          
          // Sync bearing ref when view state changes (e.g., during user interaction)
          if ('bearing' in newViewState && newViewState.bearing !== undefined) {
            currentBearingRef.current = newViewState.bearing
            updateBearing(newViewState.bearing)
          }
        }}
      >
        <MapGL
          ref={mapRef}
          mapboxAccessToken={MAPBOX_TOKEN}
          mapStyle={currentLayer === 'black' ? {
            version: 8,
            sources: {},
            layers: [{
              id: 'background',
              type: 'background',
              paint: {
                'background-color': '#000000'
              }
            }]
          } : currentLayer === 'very-dark' ? 'mapbox://styles/mapbox/dark-v11' : currentLayer}
          {...viewState}
          onLoad={handleMapLoad}
          onClick={(e: MapLayerMouseEvent) => {
            if (!districtSelection.handleDistrictClick(e)) {
              // Handle other click events if not in selection mode
            }
          }}
          onDblClick={districtSelection.handleMapReset}
          onMouseMove={(e: MapLayerMouseEvent) => {
            if (e.features && e.features.length > 0) {
              const feature = e.features[0]
              if (feature.properties?.SIGUNGU_NM) {
                setHoveredDistrict(feature.properties.SIGUNGU_NM)
                mapRef.current!.getCanvas().style.cursor = 'pointer'
              }
            } else {
              setHoveredDistrict(null)
              mapRef.current!.getCanvas().style.cursor = ''
            }
          }}
          onMouseLeave={() => {
            setHoveredDistrict(null)
            mapRef.current!.getCanvas().style.cursor = ''
          }}
          interactiveLayerIds={['sgg-extrusion', 'sgg-fill', 'sgg-line', 'sgg-select-fill', 'sgg-hover-fill', 'dong-extrusion', 'dong-fill', 'dong-line']}
          reuseMaps
          style={{ width: '100%', height: '100%' }}
        >
          {/* District layers with enhanced 3D visualization */}
          {sggData && (
            <Source id="sgg-source" type="geojson" data={sggData}>
              
              {/* District fill - 2D 배경 (fallback) */}
              <Layer
                id="sgg-fill"
                type="fill"
                paint={{
                  'fill-color': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    8, 'rgba(100, 120, 255, 0.05)',
                    12, 'rgba(100, 120, 255, 0.08)',
                    16, 'rgba(100, 120, 255, 0.1)'
                  ],
                  'fill-opacity': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    8, 0.3,
                    12, 0.4,
                    16, 0.5
                  ]
                }}
                layout={{ 
                  visibility: districtSelection.sggVisible ? 'visible' : 'none' 
                }}
              />
              
              {/* 네온 글로우 효과 - 외곽 글로우 */}
              <Layer
                id="sgg-glow-outer"
                type="line"
                paint={{
                  'line-color': 'rgba(0, 255, 255, 0.2)',
                  'line-width': 8,
                  'line-blur': 6,
                  'line-opacity': 0.5
                }}
                layout={{ 
                  visibility: districtSelection.sggVisible ? 'visible' : 'none' 
                }}
              />
              
              {/* 네온 글로우 효과 - 중간 글로우 */}
              <Layer
                id="sgg-glow-mid"
                type="line"
                paint={{
                  'line-color': 'rgba(100, 200, 255, 0.4)',
                  'line-width': 4,
                  'line-blur': 3,
                  'line-opacity': 0.7
                }}
                layout={{ 
                  visibility: districtSelection.sggVisible ? 'visible' : 'none' 
                }}
              />
              
              {/* 메인 경계선 - 네온 코어 */}
              <Layer
                id="sgg-line"
                type="line"
                paint={{
                  'line-color': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    8, 'rgba(100, 200, 255, 0.6)',
                    12, 'rgba(0, 255, 255, 0.7)',
                    16, 'rgba(0, 255, 255, 0.8)'
                  ],
                  'line-width': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    8, 1.5,
                    12, 2,
                    16, 2.5
                  ],
                  'line-opacity': 0.9
                }}
                layout={{ 
                  visibility: districtSelection.sggVisible ? 'visible' : 'none' 
                }}
              />
              
              {/* Modern hover effect with neon glow and 3D */}
              {hoveredDistrict && hoveredDistrict !== districtSelection.selectedDistrict && [
                /* Hover glow effect */
                <Layer
                  key="sgg-hover-glow"
                  id="sgg-hover-glow"
                  type="line"
                  source="sgg-source"
                  paint={{
                    'line-color': 'rgba(0, 255, 255, 0.3)',
                    'line-width': 8,
                    'line-blur': 4
                  }}
                  filter={['==', ['get', 'SIGUNGU_NM'], hoveredDistrict]}
                />,
                
                /* Hover line with bright neon */
                <Layer
                  key="sgg-hover-line"
                  id="sgg-hover-line"
                  type="line"
                  source="sgg-source"
                  paint={{
                    'line-color': 'rgba(0, 255, 255, 0.9)',
                    'line-width': 2.5,
                    'line-opacity': 1
                  }}
                  filter={['==', ['get', 'SIGUNGU_NM'], hoveredDistrict]}
                />
              ]}
              
              {/* Removed - using setPaintProperty instead */}
            </Source>
          )}
          
          {/* Dong layers with 3D effects */}
          {dongData && (
            <Source id="dong-source" type="geojson" data={dongData}>
              
              {/* Dong fill with modern gradient (fallback) */}
              <Layer
                id="dong-fill"
                type="fill"
                paint={{
                  'fill-color': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    10, 'rgba(160, 100, 255, 0.03)',
                    14, 'rgba(160, 100, 255, 0.05)',
                    18, 'rgba(160, 100, 255, 0.07)'
                  ],
                  'fill-opacity': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    10, 0.3,
                    14, 0.4,
                    18, 0.5
                  ]
                }}
                layout={{ visibility: districtSelection.dongVisible ? 'visible' : 'none' }}
              />
              
              {/* Dong neon glow lines */}
              <Layer
                id="dong-glow"
                type="line"
                paint={{
                  'line-color': 'rgba(200, 100, 255, 0.15)',
                  'line-width': 4,
                  'line-blur': 3
                }}
                layout={{ 
                  visibility: districtSelection.dongVisible ? 'visible' : 'none' 
                }}
              />
              
              {/* Dong main lines with modern style */}
              <Layer
                id="dong-line"
                type="line"
                paint={{
                  'line-color': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    10, 'rgba(180, 150, 255, 0.3)',
                    14, 'rgba(180, 150, 255, 0.4)',
                    18, 'rgba(180, 150, 255, 0.5)'
                  ],
                  'line-width': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    10, 0.8,
                    14, 1.0,
                    18, 1.2
                  ],
                  'line-opacity': 0.8
                }}
                layout={{ visibility: districtSelection.dongVisible ? 'visible' : 'none' }}
              />
            </Source>
          )}
          
          {/* Jib layers */}
          {jibData && !districtSelection.selectionMode && viewState.zoom > 10 && (
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

          {/* Selected District Layer with enhanced visibility */}
          {selectedDistrictData && (
            <Source id="selected-district-source" type="geojson" data={selectedDistrictData}>
              
              {/* Fill layer for selected area - subtle background */}
              <Layer
                id="selected-fill"
                type="fill"
                paint={{
                  'fill-color': [
                    'case',
                    // 동 선택시 - 다양한 속성명 지원 및 타입 변환
                    ['any',
                      ['==', ['to-string', ['get', 'ADM_CD']], String(selectedDongCode)],
                      ['==', ['to-string', ['get', 'H_CD']], String(selectedDongCode)],
                      ['==', ['to-string', ['get', 'DONG_CD']], String(selectedDongCode)],
                      ['==', ['to-string', ['get', 'ADM_DR_CD']], String(selectedDongCode)],
                      ['==', ['to-string', ['get', 'EMD_CD']], String(selectedDongCode)]
                    ], 'rgba(255, 100, 150, 0.2)', // 동 - 핑크색
                    // 구 선택시 - 다양한 속성명 지원
                    ['any',
                      ['==', ['to-string', ['get', 'SIG_CD']], String(selectedGuCode)],
                      ['==', ['to-string', ['get', 'SGG_CD']], String(selectedGuCode)],
                      ['==', ['to-string', ['get', 'GU_CD']], String(selectedGuCode)],
                      ['==', ['to-string', ['get', 'SIGUNGU_CD']], String(selectedGuCode)],
                      ['==', ['get', 'SIGUNGU_NM'], selectedGu]
                    ], 'rgba(102, 126, 234, 0.15)', // 구 - 파란색
                    'rgba(102, 126, 234, 0.1)' // 기본값
                  ],
                  'fill-opacity': 0.6
                }}
              />
              
              {/* Selected shadow for depth */}
              <Layer
                id="selected-shadow"
                type="line"
                paint={{
                  'line-color': 'rgba(0, 0, 0, 0.5)',
                  'line-width': 10,
                  'line-blur': 6,
                  'line-translate': [4, 4],
                  'line-translate-anchor': 'viewport'
                }}
              />
              
              {/* Selected glow effect - outer (더 밝고 넓게) */}
              <Layer
                id="selected-glow-outer"
                type="line"
                paint={{
                  'line-color': [
                    'case',
                    // 동 선택시 - 다양한 속성명 지원
                    ['any',
                      ['==', ['to-string', ['get', 'ADM_CD']], String(selectedDongCode)],
                      ['==', ['to-string', ['get', 'H_CD']], String(selectedDongCode)],
                      ['==', ['to-string', ['get', 'DONG_CD']], String(selectedDongCode)],
                      ['==', ['to-string', ['get', 'ADM_DR_CD']], String(selectedDongCode)],
                      ['==', ['to-string', ['get', 'EMD_CD']], String(selectedDongCode)]
                    ], 'rgba(255, 100, 150, 0.4)', // 동
                    'rgba(102, 126, 234, 0.4)' // 구
                  ],
                  'line-width': selectedDong ? 20 : 18,
                  'line-blur': 8
                }}
              />
              
              {/* Selected glow effect - mid */}
              <Layer
                id="selected-glow-mid"
                type="line"
                paint={{
                  'line-color': [
                    'case',
                    // 동 선택시 - 다양한 속성명 지원
                    ['any',
                      ['==', ['to-string', ['get', 'ADM_CD']], String(selectedDongCode)],
                      ['==', ['to-string', ['get', 'H_CD']], String(selectedDongCode)],
                      ['==', ['to-string', ['get', 'DONG_CD']], String(selectedDongCode)],
                      ['==', ['to-string', ['get', 'ADM_DR_CD']], String(selectedDongCode)],
                      ['==', ['to-string', ['get', 'EMD_CD']], String(selectedDongCode)]
                    ], 'rgba(255, 100, 150, 0.6)', // 동
                    'rgba(102, 126, 234, 0.6)' // 구
                  ],
                  'line-width': selectedDong ? 12 : 10,
                  'line-blur': 4
                }}
              />
              
              {/* Selected district outline with bright neon (더 두껍게) */}
              <Layer
                id="selected-district-line"
                type="line"
                paint={{
                  'line-color': [
                    'case',
                    // 동 선택시 - 다양한 속성명 지원
                    ['any',
                      ['==', ['to-string', ['get', 'ADM_CD']], String(selectedDongCode)],
                      ['==', ['to-string', ['get', 'H_CD']], String(selectedDongCode)],
                      ['==', ['to-string', ['get', 'DONG_CD']], String(selectedDongCode)],
                      ['==', ['to-string', ['get', 'ADM_DR_CD']], String(selectedDongCode)],
                      ['==', ['to-string', ['get', 'EMD_CD']], String(selectedDongCode)]
                    ], '#ff00aa', // 동 - 핑크
                    '#00ff88' // 구 - 민트그린
                  ],
                  'line-width': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    8, selectedDong ? 4 : 5,
                    12, selectedDong ? 6 : 8,
                    16, selectedDong ? 8 : 10
                  ],
                  'line-opacity': 1
                }}
              />
              
              {/* Inner bright line for emphasis */}
              <Layer
                id="selected-district-inner"
                type="line"
                paint={{
                  'line-color': '#ffffff',
                  'line-width': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    8, 1.5,
                    12, 2.5,
                    16, 3.5
                  ],
                  'line-opacity': 0.9
                }}
              />
              
              {/* 구 경계 보조선 (동 선택시) - 연한 표시 */}
              {selectedDong && (
                <Layer
                  id="selected-gu-boundary"
                  type="line"
                  paint={{
                    'line-color': 'rgba(102, 126, 234, 0.5)',
                    'line-width': 3,
                    'line-opacity': 0.6,
                    'line-dasharray': [2, 2]
                  }}
                  filter={['==', ['get', 'SIGUNGU_NM'], selectedGu]}
                />
              )}
            </Source>
          )}
          
        </MapGL>
      </DeckGL>
      
      {/* District Labels Layer - 구 이름 표시 (MapGL 밖에 위치하여 최상위 레이어로) */}
      {showDistrictLabels && viewState.zoom >= 10 && (
        <DistrictLabelsOverlay 
          visible={true}
          onClick={handleDistrictLabelClick}
          viewState={viewState}
        />
      )}
      

      {/* LocalEconomy Filter Panel - Positioned properly above map */}
      <LocalEconomyFilterPanel
        onFilterChange={handleFilterChange}
        displayMode={displayMode}
        onToggleDisplayMode={toggleDisplayMode}
        // External sync props for bidirectional updates
        externalSelectedGu={selectedGu}
        externalSelectedDong={selectedDong}
        externalSelectedBusinessType={selectedBusinessType}
      />

      {/* 선택된 지역 매출액 정보 */}
      <SelectedAreaSalesInfo
        selectedGu={selectedGu}
        selectedDong={selectedDong}
        hexagonData={hexagonData}
        climateData={climateData}
        visible={true}
      />


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
            // Toggle all Seoul boundary layers
            const boundaryLayers = ['seoul-boundary-shadow', 'seoul-boundary-line', 'seoul-boundary-highlight']
            boundaryLayers.forEach(layerId => {
              const layer = map.getLayer(layerId)
              if (layer) {
                try {
                  map.setLayoutProperty(layerId, 'visibility', show ? 'visible' : 'none')
                } catch (error) {
                  console.warn(`Failed to toggle ${layerId} visibility:`, error)
                }
              }
            })
          }
        }}
        onSeoulBaseToggle={(show) => {
          setShowSeoulBase(show)
          // Seoul base is now removed, this toggle can be deprecated or repurposed
          console.log('Seoul base toggle is deprecated - boundary only mode active')
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
        colorMode={colorMode === 'alert' ? 'sales' : colorMode}
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

      {/* 지도 초기화 버튼 */}
      <button
        onClick={handleFullReset}
        className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10 bg-black/90 hover:bg-gray-900/50 backdrop-blur-md text-gray-200 text-sm font-medium px-4 py-2 rounded-lg border border-gray-800/50 transition-all duration-200 flex items-center gap-2 shadow-2xl"
      >
        <RotateCcw className="w-4 h-4" />
        지도 초기화
      </button>

      {showHint && (
        <div className="absolute bottom-4 right-4 info-panel glow-effect transition-all duration-1000 opacity-90 hover:opacity-100 z-10">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🗺️</span>
            <div>
              <div className="font-semibold text-white mb-1">지도 탐색 가이드</div>
              <div className="text-sm text-white/80">드래그하여 지도를 탐색하고, 클릭하여 자치구를 선택하세요</div>
            </div>
          </div>
        </div>
      )}

      {/* Middle Category Legend */}
      <BusinessTypeLegend selectedCategory={selectedBusinessType} />

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