"use client"

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react"
import { throttle, debounce } from 'lodash-es'
import { DeckGL } from '@deck.gl/react'
import { Map as MapGL } from 'react-map-gl'
import type { MapRef } from 'react-map-gl'
import type { MapViewState, PickingInfo } from '@deck.gl/core'
import { LightingEffect, AmbientLight, DirectionalLight } from '@deck.gl/core'
import { PolygonLayer } from '@deck.gl/layers'
// Adapted imports for floating population
import { usePreGeneratedSeoulMeshLayer } from "@/src/features/floating-pop/components/SeoulMeshLayer"
import { useFloatingPopData } from "../hooks/useFloatingPopData"
import { DefaultChartsPanel } from "@/src/features/floating-pop/components/charts/DefaultChartsPanel"
import { formatKoreanCurrency } from '@/src/shared/utils/salesFormatter'
import { DistrictFilterPanel } from '@/src/shared/components/district-visualization/DistrictFilterPanel'
import { DistrictDataControls } from '@/src/shared/components/district-visualization/DistrictDataControls'
import { getDistrictCode as getDistrictCodeFromMapping, getDongCode as getDongCodeFromMapping } from "@/src/features/floating-pop/data/districtCodeMappings"
import { SelectedAreaSalesInfo } from "@/src/features/floating-pop/components/SelectedAreaSalesInfo"
import { createDistrictLabelsTextLayer, createDongLabelsTextLayer } from "@/src/features/floating-pop/components/DistrictLabelsTextLayer"
import { MAPBOX_TOKEN } from "@/src/shared/constants/mapConfig"
import { useDistrictSelection } from "@/src/shared/hooks/useDistrictSelection"
import { loadDistrictData, getCurrentTheme, getCurrentThemeKey } from "@/src/shared/utils/districtUtils"
import { getDistrictCenter } from "@/src/features/floating-pop/data/districtCenters"
import { 
  getDistrictHeight,
  getDongHeight,
  getDongHeightBySales,
  CAMERA_3D_CONFIG, 
  CAMERA_2D_CONFIG
} from "@/src/shared/utils/district3DUtils"
import { getModernDistrictColor, getModernEdgeColor, getModernMaterial, getDimmedColor, getSimpleSalesColor } from "@/src/features/floating-pop/utils/modernColorPalette"
import { ResizablePanel } from "@/src/shared/components/ResizablePanel"
import * as turf from '@turf/turf'
import { useUnifiedDeckGLLayers } from "@/src/features/floating-pop/components/DeckGLUnifiedLayers"
import type { FeatureCollection } from 'geojson'
import { getPopulationColor, getPopulationHeight } from '../utils/floatingPopDataLoader'

// Common GPU optimization parameters for all layers
const COMMON_GPU_PARAMS = {
  depthTest: true,
  depthFunc: 0x0203, // GL.LEQUAL
  blend: true,
  blendFunc: [0x0302, 0x0303], // [GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA]
  cullFace: 0x0405, // GL.BACK
  cullFaceMode: true,
  polygonOffsetFill: true // Prevent z-fighting
}

// Color function adapted for floating population visualization
const convertColorExpressionToRGB = (
  height: number, 
  themeKey: string, 
  guName?: string, 
  dongName?: string, 
  isSelected?: boolean, 
  isHovered?: boolean,
  totalPopulation?: number
): [number, number, number, number] => {
  // Use population-based color if population data is available
  if (totalPopulation !== undefined && totalPopulation >= 0) {
    const maxPopulation = 50000 // Assumed max population for color scaling
    return getPopulationColor(totalPopulation, maxPopulation)
  }
  
  // Fallback to height-based color
  const h = height || 0;
  const baseAlpha = 242;
  
  // Simple height-based colors for fallback
  if (h >= 600) return [255, 0, 0, baseAlpha];      // Red - very high
  if (h >= 500) return [255, 100, 0, baseAlpha];    // Orange - high
  if (h >= 400) return [255, 200, 0, baseAlpha];    // Yellow - medium-high
  if (h >= 300) return [100, 255, 0, baseAlpha];    // Light green - medium
  if (h >= 200) return [0, 255, 0, baseAlpha];      // Green - low-medium
  if (h >= 100) return [0, 255, 100, baseAlpha];    // Light green - low
  return [0, 200, 255, baseAlpha];                  // Blue - very low
}

// Default Seoul view configuration
const DEFAULT_SEOUL_VIEW = {
  longitude: 126.978,
  latitude: 37.5765,
  zoom: 10.8,
  pitch: 40,
  bearing: 6,
  minZoom: 5,
  maxZoom: 13
} as const

// Zoom settings
const ZOOM_SETTINGS = {
  DONG: 13,
  GU: 13,
  PITCH_DONG: 40,
  PITCH_GU: 30,
  TRANSITION_DURATION: 1500,
  TRANSITION_SPEED: 1.2
} as const

export default function FloatingPopDistrictMapFull() {
  const mapRef = useRef<MapRef>(null)
  const cleanupRef = useRef<(() => void)[]>([])
  const [showChartPanel, setShowChartPanel] = useState(false)
  const [currentThemeState, setCurrentThemeState] = useState(getCurrentTheme)
  const [currentThemeKey, setCurrentThemeKey] = useState('blue')
  const [is3DMode, setIs3DMode] = useState(false)
  const [themeAdjustments, setThemeAdjustments] = useState({ opacity: 100, brightness: 0, saturation: 0, contrast: 0 })
  
  // Listen for theme adjustment changes
  useEffect(() => {
    const handleThemeAdjustments = (event: CustomEvent) => {
      setThemeAdjustments(event.detail)
    }
    
    window.addEventListener('themeAdjustmentsChanged', handleThemeAdjustments as EventListener)
    
    return () => {
      window.removeEventListener('themeAdjustmentsChanged', handleThemeAdjustments as EventListener)
    }
  }, [])
  
  // Use floating population data hook instead of card sales
  const {
    layerConfig,
    populationData,
    hourlyData,
    statistics,
    isDataLoading: isDataLoading,
    dataError,
    filterState,
    selectedHour,
    isPlaying,
    setLayerConfig,
    setFilterState,
    setSelectedHour,
    setIsPlaying,
    resetConfig
  } = useFloatingPopData()
  
  // Extract filter values from floating pop hook
  const selectedGu = filterState.selectedGu
  const selectedGuCode = filterState.selectedGuCode
  const selectedDong = filterState.selectedDong
  const selectedDongCode = filterState.selectedDongCode
  const selectedDate = filterState.selectedDate
  
  // Map state
  const [currentLayer, setCurrentLayer] = useState("very-dark")
  const [currentTime, setCurrentTime] = useState(100)
  const [showBoundary, setShowBoundary] = useState(false)
  const [showDistrictLabels, setShowDistrictLabels] = useState(false)
  const [showDongLabels, setShowDongLabels] = useState(false)
  
  // DeckGL view state
  const [viewState, setViewState] = useState<MapViewState>({
    ...DEFAULT_SEOUL_VIEW,
    bearing: 0
  })
  
  const [isDragging, setIsDragging] = useState(false)
  
  // Seoul coordinates
  const SEOUL_COORDINATES: [number, number] = [126.978, 37.5665]
  
  // Reset to default view function
  const resetToDefaultView = useCallback(() => {
    setViewState({
      ...DEFAULT_SEOUL_VIEW
    })
  }, [])
  
  // District zoom handler
  const handleDistrictZoom = useCallback((guName: string, dongName?: string | null) => {
    const dongCenter = dongName ? getDistrictCenter('동', dongName) : null
    const center = dongCenter || getDistrictCenter('구', guName)
    
    if (center) {
      setViewState(prev => ({
        ...prev,
        longitude: center[0],
        latitude: center[1],
        zoom: dongCenter ? ZOOM_SETTINGS.DONG : ZOOM_SETTINGS.GU,
        pitch: dongCenter ? ZOOM_SETTINGS.PITCH_DONG : ZOOM_SETTINGS.PITCH_GU,
        bearing: prev.bearing || 0,
      }))
    }
  }, [])
  
  // Handle filter panel changes
  const handleFilterChange = useCallback((filters: any) => {
    setFilterState(filters)
    
    if (filters.selectedDong && filters.selectedGu) {
      handleDistrictZoom(filters.selectedGu, filters.selectedDong)
    }
  }, [setFilterState, handleDistrictZoom])
  
  // Hover state for districts
  const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null)

  // District selection hook
  const districtSelection = useDistrictSelection({ 
    mapRef,
    onDistrictSelect: (districtName, feature) => {
      if (feature?.layer?.id === 'sgg-fill') {
        setFilterState({ selectedGu: districtName, selectedDong: null })
      } else if (feature?.layer?.id === 'dong-fill') {
        setFilterState({ selectedDong: districtName })
      }
    }
  })
  
  // District GeoJSON data
  const [sggData, setSggData] = useState<any>(null)
  const [dongData, setDongData] = useState<any>(null)
  const [sggData3D, setSggData3D] = useState<any>(null)
  const [dongData3D, setDongData3D] = useState<any>(null)
  
  // Population data maps (adapted from sales data)
  const [dongPopulationMap, setDongPopulationMap] = useState<Map<number, number>>(new Map())
  const [dongPopulationByAgeMap, setDongPopulationByAgeMap] = useState<Map<number, Map<string, number>>>(new Map())
  
  // Height scale for 3D visualization
  const [heightScale, setHeightScale] = useState<number>(10000) // Scale for population height
  
  // Mesh layer states
  const [showMeshLayer, setShowMeshLayer] = useState<boolean>(true)
  const [meshResolution, setMeshResolution] = useState<number>(120)
  const [meshColor, setMeshColor] = useState<string>('#FFFFFF')
  
  // Layer toggle handlers
  const handlePolygonLayerToggle = useCallback((visible: boolean) => {
    setLayerConfig({ visible })
    if (visible) {
      setShowMeshLayer(false)
    }
  }, [setLayerConfig])
  
  const handleMeshLayerToggle = useCallback((visible: boolean) => {
    setShowMeshLayer(visible)
    if (visible) {
      setLayerConfig({ visible: false })
    }
  }, [setLayerConfig])
  
  // Helper functions
  const handleDongClick = useCallback((dongName: string) => {
    if (!dongName || !selectedGu) return
    
    setFilterState({ selectedDong: dongName })
    const dongCode = getDongCodeFromMapping(selectedGu, dongName)
    if (dongCode) {
      setFilterState({ selectedDongCode: dongCode })
    }
  }, [selectedGu, setFilterState])

  const calculatePolygonCentroid = useCallback((coordinates: number[][][]) => {
    if (!coordinates || coordinates.length === 0) return null
    
    const ring = coordinates[0]
    if (!ring || ring.length === 0) return null
    
    let sumX = 0
    let sumY = 0
    let count = 0
    
    ring.forEach(coord => {
      if (coord && coord.length >= 2) {
        sumX += coord[0]
        sumY += coord[1]
        count++
      }
    })
    
    if (count === 0) return null
    return [sumX / count, sumY / count]
  }, [])

  const handleLayerChange = useCallback((layer: string) => {
    setCurrentLayer(layer)
  }, [])

  const handleTimeChange = useCallback((time: number) => {
    setCurrentTime(time)
  }, [])
  
  // District label click handler
  const handleDistrictLabelClick = useCallback((districtName: string) => {
    setFilterState({
      selectedGu: districtName,
      selectedDong: null,
      selectedGuCode: getDistrictCodeFromMapping(districtName),
      selectedDongCode: null
    })
  }, [setFilterState])
  
  // Full reset handler
  const handleFullReset = useCallback(() => {
    resetConfig()
    setFilterState({
      selectedGu: null,
      selectedDong: null,
      selectedGuCode: null,
      selectedDongCode: null
    })
    resetToDefaultView()
  }, [resetConfig, setFilterState, resetToDefaultView])

  // 3D mode toggle handler
  const handle3DModeToggle = useCallback((enabled: boolean) => {
    setIs3DMode(enabled)
    
    if (enabled) {
      setViewState(prev => ({
        ...prev,
        pitch: 60,
        bearing: -15,
      }))
    } else {
      setViewState(prev => ({
        ...prev,
        pitch: 0,
        bearing: 0,
      }))
    }
  }, [])

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
  
  useEffect(() => {
    if (districtSelection.selectedDistrict) {
      const animationTimer = setTimeout(() => {
        // Animation continues indefinitely for selected district
      }, 800)
      
      return () => clearTimeout(animationTimer)
    }
  }, [districtSelection.selectedDistrict])

  // Helper functions for extracting district info
  const getDistrictCode = useCallback((properties: any): string | null => {
    return properties?.ADM_DR_CD || 
           properties?.dongCode || 
           properties?.dong_code ||
           properties?.['행정동코드'] ||
           properties?.DONG_CD ||
           properties?.H_CODE ||
           null
  }, [])
  
  const getDistrictName = useCallback((properties: any): string | null => {
    return properties?.ADM_DR_NM || 
           properties?.dongName || 
           properties?.dong_name ||
           properties?.['행정동'] ||
           properties?.DONG_NM ||
           properties?.H_DONG_NM ||
           properties?.EMD_NM ||
           properties?.EMD_KOR_NM ||
           null
  }, [])
  
  const getGuName = useCallback((properties: any): string | null => {
    return properties?.guName || 
           properties?.['자치구'] ||
           properties?.SGG_NM ||
           properties?.SIGUNGU_NM ||
           properties?.SIG_KOR_NM ||
           null
  }, [])

  // Find dong at coordinate
  const findDongAtCoordinate = useCallback((
    lng: number,
    lat: number,
    dongBoundaries: any[]
  ): { dongName: string; dongCode: number; population?: number } | null => {
    if (!dongBoundaries || dongBoundaries.length === 0) {
      return null
    }
    
    const point = turf.point([lng, lat])
    
    for (const feature of dongBoundaries) {
      try {
        if (turf.booleanPointInPolygon(point, feature)) {
          const dongCode = getDistrictCode(feature.properties) || 0
          const dongName = getDistrictName(feature.properties) || 'Unknown'
          
          return {
            dongName,
            dongCode: Number(dongCode),
            population: dongPopulationMap?.get(Number(dongCode))
          }
        }
      } catch {
        continue
      }
    }
    
    return null
  }, [dongPopulationMap])

  // Handle unified DeckGL hover
  const handleUnifiedHover = useMemo(() => 
    debounce((info: PickingInfo) => {
      if (isDragging) return
      
      if (info.layer?.id?.includes('unified-sgg') || info.layer?.id?.includes('unified-dong')) {
        const feature = info.object
        if (feature && feature.properties) {
          const districtName = feature.properties?.SIGUNGU_NM || 
                             feature.properties?.GU_NM || 
                             feature.properties?.ADM_DR_NM || 
                             feature.properties?.DONG_NM
          if (districtName) {
            setHoveredDistrict(districtName)
          }
        }
      } else {
        setHoveredDistrict(null)
      }
    }, 50),
  [isDragging])

  // Handle unified DeckGL click
  const handleUnifiedClick = useCallback((info: PickingInfo) => {
    if (info.layer?.id?.includes('unified-sgg') && info.object && info.object.properties) {
      const guName = getGuName(info.object.properties)
      if (guName) {
        setFilterState({
          selectedGu: guName,
          selectedGuCode: getDistrictCodeFromMapping(guName),
          selectedDong: null,
          selectedDongCode: null
        })
      }
    }
    else if (info.layer?.id?.includes('unified-dong') && info.object && info.object.properties) {
      const dongName = getDistrictName(info.object.properties)
      const guName = getGuName(info.object.properties)
      if (dongName && guName) {
        setFilterState({
          selectedGu: guName,
          selectedDong: dongName,
          selectedGuCode: getDistrictCodeFromMapping(guName),
          selectedDongCode: getDongCodeFromMapping(guName, dongName)
        })
      }
    }
  }, [setFilterState])

  // Create 3D polygon layers for dong visualization - adapted for population
  const createDong3DPolygonLayersOptimized = useCallback(() => {
    if (!layerConfig.visible) return []
    if (!dongData3D || !dongData3D.features) return []
    
    return [
      new PolygonLayer({
        id: 'population-3d-polygon',
        data: dongData3D.features,
        pickable: true,
        extruded: true,
        wireframe: false,
        filled: true,
        autoHighlight: true,
        highlightColor: [255, 255, 255, 60],
        
        parameters: COMMON_GPU_PARAMS,
        
        getPolygon: (d: any) => {
          if (d.geometry.type === 'MultiPolygon') {
            return d.geometry.coordinates[0][0]
          }
          return d.geometry.coordinates[0]
        },
        
        getElevation: (d: any) => {
          const guName = getGuName(d.properties)
          const dongCode = getDistrictCode(d.properties)
          const dongName = getDistrictName(d.properties)
          
          // Get population data for this dong
          const population = populationData?.find(p => p.dongName === dongName)
          const totalPopulation = population?.totalPopulation || 0
          
          // Scale height based on population
          const baseHeight = totalPopulation / heightScale
          
          if (selectedDong) {
            if (guName === selectedGu && dongName === selectedDong) {
              return baseHeight
            }
            return 10 // Other areas are lowered
          }
          
          if (selectedGu && guName !== selectedGu) {
            return 0 // Hide non-selected gu
          }
          
          if (hoveredDistrict === guName) {
            return baseHeight * 1.2 // Elevation boost for hovered area
          }
          
          return baseHeight
        },
        
        elevationScale: 1,
        
        getFillColor: (d: any) => {
          const dongName = getDistrictName(d.properties)
          const guName = getGuName(d.properties)
          const dongCode = getDistrictCode(d.properties)
          
          // Get population data for this dong
          const population = populationData?.find(p => p.dongName === dongName)
          const totalPopulation = population?.totalPopulation || 0
          
          // Calculate max population for color scaling
          const maxPop = Math.max(...(populationData?.map(d => d.totalPopulation) || [1]))
          
          if (selectedDong && dongName === selectedDong) {
            return getPopulationColor(totalPopulation, maxPop)
          }
          
          if (hoveredDistrict === guName) {
            return [255, 230, 100, 255] // Bright yellow-gold highlight
          }
          
          if ((selectedGu || selectedDong) && guName !== selectedGu) {
            return [51, 51, 51, 200] // Dimmed
          }
          
          return getPopulationColor(totalPopulation, maxPop)
        },
        
        getLineColor: (d: any) => {
          const guName = getGuName(d.properties)
          const dongName = getDistrictName(d.properties)
          
          if (hoveredDistrict === guName) {
            return [255, 255, 0, 255] // Bright yellow edges
          }
          
          return [255, 255, 255, 30] // Default white edges
        },
        
        getLineWidth: (d: any) => {
          const guName = getGuName(d.properties)
          if (hoveredDistrict === guName) {
            return 3
          }
          return 1
        },
        
        lineWidthMinPixels: 1.5,
        lineWidthMaxPixels: 4,
        
        material: {
          ambient: 0.35,
          diffuse: 0.6,
          shininess: 32,
          specularColor: [60, 64, 70]
        },
        
        onHover: (info: any) => {
          if (info.object) {
            const properties = info.object.properties
            setHoveredDistrict(getDistrictName(properties))
          } else {
            setHoveredDistrict(null)
          }
        },
        
        onClick: (info: any) => {
          if (info.object) {
            const props = info.object.properties
            const dongName = getDistrictName(props)
            const guName = getGuName(props)
            const dongCode = getDistrictCode(props)
            const guCode = props.SIG_CD || props.SGG_CD || props.GU_CD
            
            if (dongName && guName) {
              setFilterState({
                selectedDong: dongName,
                selectedGu: guName,
                selectedDongCode: dongCode || getDongCodeFromMapping(guName, dongName),
                selectedGuCode: guCode || getDistrictCodeFromMapping(guName)
              })
              
              handleDistrictZoom(guName, dongName)
            }
          }
        },
        
        transitions: {
          getElevation: 0,
          getFillColor: 0,
          getLineWidth: 0
        },
        
        updateTriggers: layerConfig.visible ? {
          getElevation: [dongPopulationMap, heightScale],
          getFillColor: [selectedGu, selectedDong, currentThemeKey],
          getLineColor: [selectedGu, selectedDong, currentThemeKey]
        } : {}
      })
    ]
  }, [
    dongData3D, 
    selectedGu, 
    selectedDong, 
    currentThemeKey, 
    dongPopulationMap,
    heightScale,
    setFilterState,
    hoveredDistrict,
    themeAdjustments,
    layerConfig.visible,
    populationData
  ])
  
  // Create lighting configuration
  const lightingEffect = useMemo(() => {
    const ambientLight = new AmbientLight({
      color: [255, 255, 255],
      intensity: 0.5
    })
    
    const directionalLight = new DirectionalLight({
      direction: [-1, -3, -1],
      color: [255, 255, 255],
      intensity: 1.0
    })
    
    return new LightingEffect({
      ambientLight,
      directionalLight
    })
  }, [])
  
  // Use pre-generated mesh layer with population data
  const { layer: preGeneratedMeshLayer, isLoading: isMeshLoading } = usePreGeneratedSeoulMeshLayer({
    resolution: meshResolution,
    visible: showMeshLayer,
    wireframe: true,
    opacity: 1,
    animatedOpacity: 0.8,
    pickable: false,
    useMask: true,
    color: meshColor,
    dongBoundaries: dongData3D?.features,
    dongSalesMap: dongPopulationMap, // Use population data instead of sales
    salesHeightScale: heightScale
  }, dongData3D?.features)
  
  // Load Seoul boundary data for unified layers
  const [seoulBoundaryData, setSeoulBoundaryData] = useState<FeatureCollection | null>(null)
  
  useEffect(() => {
    fetch('/seoul_boundary.geojson')
      .then(res => res.json())
      .then(data => setSeoulBoundaryData(data))
      .catch(err => console.warn('Failed to load Seoul boundary:', err))
  }, [])

  // Create unified Deck.gl layers
  const unifiedLayers = useUnifiedDeckGLLayers({
    sggData,
    dongData,
    dongData3D,
    seoulBoundaryData,
    is3DMode,
    isDragging,
    viewState,
    selectedGu,
    selectedDong,
    hoveredDistrict,
    sggVisible: districtSelection.sggVisible,
    dongVisible: districtSelection.dongVisible,
    jibVisible: districtSelection.jibVisible,
    showBoundary,
    dongSalesMap: dongPopulationMap, // Use population data
    heightScale,
    currentThemeKey,
    onHover: (info: PickingInfo) => {
      if (info.object) {
        const feature = info.object
        const name = feature.properties?.SIGUNGU_NM || 
                    feature.properties?.ADM_DR_NM || 
                    feature.properties?.DONG_NM
        setHoveredDistrict(name)
      } else {
        setHoveredDistrict(null)
      }
    },
    onClick: (info: PickingInfo) => {
      if (info.object) {
        const feature = info.object
        const props = feature.properties
        
        if (props.ADM_DR_NM || props.DONG_NM) {
          const dongName = getDistrictName(props)
          const guName = props.guName || props['자치구']
          const dongCode = getDistrictCode(props)
          const guCode = props.SIG_CD || props.SGG_CD || props.GU_CD
          
          if (dongName && guName) {
            setFilterState({
              selectedDong: dongName,
              selectedGu: guName,
              selectedDongCode: dongCode || getDongCodeFromMapping(guName, dongName),
              selectedGuCode: guCode || getDistrictCodeFromMapping(guName)
            })
            handleDistrictZoom(guName, dongName)
          }
        }
        else if (props.SIGUNGU_NM || props.GU_NM) {
          const guName = getGuName(props)
          setFilterState({
            selectedGu: guName,
            selectedGuCode: getDistrictCodeFromMapping(guName),
            selectedDong: null,
            selectedDongCode: null
          })
        }
      }
    }
  })
  
  // Combine all deck.gl layers
  const deckLayers = useMemo(() => {
    if (!showMeshLayer && !layerConfig.visible && !showDistrictLabels && !showDongLabels) {
      return []
    }
    const layers = []
    
    // Mesh layer
    if (preGeneratedMeshLayer && showMeshLayer) {
      layers.push(preGeneratedMeshLayer)
    }
    
    // Unified 2D layers (only in 2D mode)
    if (unifiedLayers && unifiedLayers.length > 0 && !is3DMode) {
      layers.push(...unifiedLayers)
    }
    
    // 3D polygon layers (only in 3D mode)
    if (dongData3D && is3DMode) {
      const dong3DLayers = createDong3DPolygonLayersOptimized()
      layers.push(...dong3DLayers)
    }
    
    // District labels
    if (showDistrictLabels) {
      const districtTextLayers = createDistrictLabelsTextLayer({
        visible: showDistrictLabels && viewState.zoom >= 10,
        viewState,
        selectedGu,
        selectedDong,
        hoveredDistrict,
        onClick: handleDistrictLabelClick,
        onHover: (info) => {
          if (info.object) {
            setHoveredDistrict(info.object.nameKr)
          } else {
            setHoveredDistrict(null)
          }
        }
      })
      layers.push(...districtTextLayers)
      
      // Dong labels when gu is selected
      if (selectedGu && dongData3D) {
        const dongLabelData = dongData3D.features?.filter((feature: any) => {
          const guName = getGuName(feature.properties)
          return guName === selectedGu
        }).map((feature: any) => ({
          properties: {
            dongName: feature.properties?.ADM_DR_NM || feature.properties?.DONG_NM || feature.properties?.['행정동'],
            centroid: calculatePolygonCentroid(feature.geometry?.coordinates),
            coordinates: calculatePolygonCentroid(feature.geometry?.coordinates)
          }
        }))
        
        if (showDongLabels) {
          const dongTextLayers = createDongLabelsTextLayer({
            dongData: dongLabelData,
            selectedGu,
            selectedDong,
            viewState,
            onClick: (dongName) => {
              handleDongClick(dongName)
            },
            onHover: (info) => {
              if (info.object) {
                setHoveredDistrict(info.object.name)
              }
            }
          })
          layers.push(...dongTextLayers)
        }
      }
    }
    
    return layers
  }, [is3DMode, dongData3D, showDistrictLabels, showDongLabels, viewState.zoom, 
      selectedGu, selectedDong, hoveredDistrict, showMeshLayer, preGeneratedMeshLayer, 
      unifiedLayers])

  // Tooltip handler - adapted for population data
  const getTooltip = (info: PickingInfo) => {
    if (!info.object) {
      return null
    }
    
    try {
      if (info.layer?.id === 'population-3d-polygon' && info.object) {
        const properties = info.object.properties
        
        const dongCode = getDistrictCode(properties)
        const dongName = getDistrictName(properties) || '행정동 정보 없음'
        const guName = getGuName(properties) || '구 정보 없음'
        
        // Get population data for this dong
        const population = populationData?.find(p => p.dongName === dongName)
        const totalPopulation = population?.totalPopulation || 0
        const inflow = population?.inflow || 0
        const outflow = population?.outflow || 0
        
        const tooltipHtml = `
<div style="font-family: 'Noto Sans KR', sans-serif;">
  <div style="margin-bottom: 8px;">
    <span style="opacity: 0.8;">📍</span> <strong>지역:</strong> ${guName} ${dongName}
  </div>
  <div style="margin-bottom: 8px;">
    <span style="opacity: 0.8;">👥</span> <strong>유동인구:</strong> ${totalPopulation.toLocaleString()}명
  </div>
  <div style="margin-bottom: 8px;">
    <span style="opacity: 0.8;">📥</span> <strong>유입:</strong> ${inflow.toLocaleString()}명
  </div>
  <div style="margin-bottom: 8px;">
    <span style="opacity: 0.8;">📤</span> <strong>유출:</strong> ${outflow.toLocaleString()}명
  </div>
  <div style="margin-bottom: 8px;">
    <span style="opacity: 0.8;">⏰</span> <strong>시간:</strong> ${selectedHour}시
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
            maxWidth: '320px',
            lineHeight: '1.6',
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(8px)'
          }
        }
      }
      
      return null
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
  
  // Load district data
  useEffect(() => {
    const loadData = async () => {
      const [sgg, dong] = await Promise.all([
        loadDistrictData('sgg'),
        loadDistrictData('dong')
      ])
      
      if (sgg) {
        setSggData(sgg)
      }
      if (dong) {
        setDongData(dong)
      }
    }
    
    loadData()
  }, [])
  
  // Load population data from floating pop hook
  useEffect(() => {
    if (!populationData) {
      return
    }
    
    // Convert population data to map format
    const populationByDong = new Map<number, number>()
    const populationByDongAndAge = new Map<number, Map<string, number>>()
    
    populationData.forEach(item => {
      populationByDong.set(item.dongCode, item.totalPopulation)
      
      if (item.populationByAge) {
        const ageMap = new Map<string, number>()
        Object.entries(item.populationByAge).forEach(([age, count]) => {
          ageMap.set(age, count)
        })
        populationByDongAndAge.set(item.dongCode, ageMap)
      }
    })
    
    setDongPopulationMap(populationByDong)
    setDongPopulationByAgeMap(populationByDongAndAge)
  }, [populationData])
  
  // Process 3D data
  useEffect(() => {
    if (!showMeshLayer && !layerConfig.visible) return
    if (!sggData || !dongData || dongPopulationMap.size === 0) return
    
    const process3DData = () => {
      // Process gu data for 3D
      const sgg3D = {
        ...sggData,
        features: sggData.features.map((feature: any) => {
          const guName = feature.properties.SIGUNGU_NM || feature.properties.SGG_NM || 
                        feature.properties.SIG_KOR_NM || feature.properties.GU_NM || 
                        feature.properties.nm || '자치구'
          return {
            ...feature,
            properties: {
              ...feature.properties,
              height: getDistrictHeight(guName),
              guName: guName
            }
          }
        })
      }
      setSggData3D(sgg3D)
      
      // Process dong data for 3D
      const dong3D = {
        ...dongData,
        features: dongData.features.map((feature: any, index: number) => {
          const guName = feature.properties['자치구'] || feature.properties.SGG_NM || feature.properties.SIGUNGU_NM || feature.properties.SIG_KOR_NM
          const dongName = getDistrictName(feature.properties)
          const dongCode = getDistrictCode(feature.properties) || 0
          
          // Get population for height calculation
          const population = populationData?.find(p => p.dongName === dongName)
          const totalPopulation = population?.totalPopulation || 0
          const height = getPopulationHeight(totalPopulation, 50000, 100, 1000) // max 50k, base 100, max height 1000
          
          return {
            ...feature,
            properties: {
              ...feature.properties,
              height: height,
              dongIndex: index,
              guName: guName
            }
          }
        })
      }
      setDongData3D(dong3D)
    }
    
    process3DData()
  }, [ssgData, dongData, dongPopulationMap, populationData, heightScale])

  // Listen for theme changes
  useEffect(() => {
    const handleThemeChange = (event: Event) => {
      const newTheme = getCurrentTheme()
      const newThemeKey = getCurrentThemeKey()
      setCurrentThemeState(newTheme)
      setCurrentThemeKey(newThemeKey)
    }
    
    window.addEventListener('themeChanged', handleThemeChange)
    
    return () => {
      window.removeEventListener('themeChanged', handleThemeChange)
    }
  }, [])

  // District selection data
  const [selectedDistrictData, setSelectedDistrictData] = useState<any>(null)

  // Create fast lookup indices for districts
  const sggIndex = useMemo(() => {
    if (!sggData?.features) {
      return new Map()
    }
    
    const index = new Map()
    
    sggData.features.forEach((f: any) => {
      const props = f.properties || {}
      const guCode = props.SIG_CD || props.SGG_CD || props.GU_CD || props.SIGUNGU_CD || props['시군구코드'] || props['구코드']
      const guName = props.SIGUNGU_NM || props.SIG_KOR_NM || props.GU_NM || props['구명']
      
      if (guCode) {
        const codeNumber = Number(guCode)
        index.set(codeNumber, f)
      }
      
      if (guName) {
        index.set(guName, f)
      }
    })
    
    return index
  }, [sggData])

  const dongIndex = useMemo(() => {
    if (!dongData?.features) {
      return new Map()
    }
    
    const index = new Map()
    
    dongData.features.forEach((f: any) => {
      const props = f.properties || {}
      const dongCode = getDistrictCode(props)
      
      if (dongCode) {
        const codeNumber = Number(dongCode)
        index.set(codeNumber, f)
      }
    })
    
    return index
  }, [dongData])

  // Simple district selection logic
  useEffect(() => {
    if (districtSelection.selectedDistrict && districtSelection.selectedDistrict !== '없음' && districtSelection.selectedFeature) {
      const selectedFeatureData = {
        type: 'FeatureCollection',
        features: [districtSelection.selectedFeature]
      }
      
      setSelectedDistrictData(selectedFeatureData)
    } else if (!selectedGu && !selectedDong) {
      setSelectedDistrictData(null)
    }
  }, [districtSelection.selectedDistrict, districtSelection.selectedFeature, selectedGu, selectedDong])

  // Filter-based district selection
  useEffect(() => {
    if (districtSelection.selectedDistrict && 
        districtSelection.selectedDistrict !== '없음' &&
        districtSelection.selectedDistrict !== selectedDong &&
        districtSelection.selectedDistrict !== selectedGu) {
      return
    }

    if (filterState.selectedGuCode || filterState.selectedDongCode || selectedGu || selectedDong) {
      let foundFeature = null
      let foundGuFeature = null
      
      if (filterState.selectedDongCode) {
        const dongFeature = dongIndex.get(filterState.selectedDongCode)
        if (dongFeature) {
          foundFeature = dongFeature
          
          if (filterState.selectedGuCode || selectedGu) {
            let sggFeature = filterState.selectedGuCode ? sggIndex.get(filterState.selectedGuCode) : null
            if (!ssgFeature && selectedGu) {
              sggFeature = sggIndex.get(selectedGu)
            }
            if (sggFeature) {
              foundGuFeature = sggFeature
            }
          }
        }
      }
      else if (filterState.selectedGuCode || selectedGu) {
        let sggFeature = filterState.selectedGuCode ? sggIndex.get(filterState.selectedGuCode) : null
        
        if (!ssgFeature && selectedGu) {
          sggFeature = sggIndex.get(selectedGu)
        }
        
        if (ssgFeature) {
          foundFeature = ssgFeature
        }
      }
      
      if (foundFeature) {
        const features = foundGuFeature 
          ? [foundGuFeature, foundFeature]
          : [foundFeature]
        
        const selectedFeatureData = {
          type: 'FeatureCollection',
          features: features
        }
        
        setSelectedDistrictData(selectedFeatureData)
      } else {
        setSelectedDistrictData(null)
      }
    } else {
      setSelectedDistrictData(null)
      resetToDefaultView()
    }
  }, [filterState.selectedGuCode, filterState.selectedDongCode, selectedGu, selectedDong, districtSelection.selectedDistrict, sggIndex, dongIndex, resetToDefaultView])

  // Memory cleanup effect
  useEffect(() => {
    return () => {
      cleanupRef.current.forEach(cleanup => cleanup())
      cleanupRef.current = []
      
      if (window.gc) {
        setTimeout(() => window.gc?.(), 100)
      }
    }
  }, [])

  // Layer filter for performance optimization
  const layerFilter = useCallback(({ layer, viewport }) => {
    if (isDragging) {
      if (layer.id.includes('mesh') || layer.id.includes('3d-polygon')) {
        return true
      }
      if (layer.id.includes('text') || layer.id.includes('label')) {
        return false
      }
    }
    return true
  }, [isDragging])

  return (
    <div className="relative w-full h-screen flex">
      {/* Map Section */}
      <div className={`relative flex-1 transition-all duration-300`}>
        {/* DeckGL + Mapbox integration */}
        <DeckGL
          viewState={viewState}
          controller={true}
          layers={deckLayers}
          effects={[lightingEffect]}
          getTooltip={isDragging ? undefined : getTooltip}
          layerFilter={layerFilter}
          useDevicePixels={!isDragging && window.innerWidth > 768}
          getCursor={({isDragging: dragging, isHovering}) => {
            if (dragging) return 'grabbing'
            if (isHovering) return 'pointer'
            return 'grab'
          }}
          parameters={{
            ...COMMON_GPU_PARAMS,
            blendFunc: [0x0302, 0x0303, 0x0001, 0x0303],
            blendEquation: 0x8006,
          }}
          _typedArrayManagerProps={{
            overAlloc: 1.2,
            poolSize: 100
          }}
          onClick={handleUnifiedClick}
          onHover={handleUnifiedHover}
          onDragStart={() => {
            setIsDragging(true)
          }}
          onDragEnd={() => {
            setIsDragging(false)
          }}
          onViewStateChange={useMemo(() => 
            throttle(({ viewState: newViewState }) => {
              setViewState(newViewState as MapViewState)
            }, 16),
          [setViewState])}
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
              }],
            } : currentLayer === 'very-dark' ? 'mapbox://styles/mapbox/dark-v11' : currentLayer}
            {...viewState}
            onDblClick={districtSelection.handleMapReset}
            reuseMaps
            style={{ width: '100%', height: '100%' }}
          >
            {/* Semi-transparent overlay for very-dark mode */}
            {currentLayer === 'very-dark' && (
              <div 
                className="absolute inset-0 bg-black/70 pointer-events-none" 
                style={{ mixBlendMode: 'multiply' }}
              />
            )}
          </MapGL>
        </DeckGL>

        {/* Filter Panel */}
        <DistrictFilterPanel
          onFilterChange={handleFilterChange}
          showTimeFilter={true}
          selectedGu={selectedGu}
          selectedDong={selectedDong}
          selectedHour={selectedHour}
          onHourChange={setSelectedHour}
        />

        {/* Controls Panel */}
        <DistrictDataControls
          layerConfig={layerConfig}
          is3DMode={is3DMode}
          currentLayer={currentLayer}
          showBoundary={showBoundary}
          showChartPanel={showChartPanel}
          setLayerVisible={(visible) => setLayerConfig({ visible })}
          setLayerCoverage={(coverage) => setLayerConfig({ coverage })}
          setLayerUpperPercentile={(upperPercentile) => setLayerConfig({ upperPercentile })}
          setIs3DMode={handle3DModeToggle}
          setCurrentLayer={setCurrentLayer}
          setShowBoundary={setShowBoundary}
          setShowChartPanel={setShowChartPanel}
          resetConfig={resetConfig}
          showMeshLayer={showMeshLayer}
          meshResolution={meshResolution}
          meshColor={meshColor}
          onShowMeshLayerChange={handleMeshLayerToggle}
          onMeshResolutionChange={setMeshResolution}
          onMeshColorChange={setMeshColor}
        />

        {/* Statistics Panel */}
        {statistics && (
          <div className="absolute top-20 right-4 bg-gray-900/90 backdrop-blur-sm rounded-lg p-4 shadow-xl text-white z-20 w-64">
            <h3 className="text-lg font-semibold mb-2">유동인구 통계</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>총 인구:</span>
                <span>{statistics.total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>평균:</span>
                <span>{Math.floor(statistics.average).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>유입:</span>
                <span>{statistics.totalInflow.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>유출:</span>
                <span>{statistics.totalOutflow.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>활성 동:</span>
                <span>{statistics.activeDongs}</span>
              </div>
            </div>
          </div>
        )}

        {/* Time Controls */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900/90 backdrop-blur-sm rounded-lg p-4 shadow-xl z-20">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
            >
              {isPlaying ? '⏸ 정지' : '▶ 재생'}
            </button>
            
            <div className="flex flex-col">
              <label className="text-white text-sm mb-1">시간: {selectedHour}:00</label>
              <input
                type="range"
                min="0"
                max="23"
                value={selectedHour}
                onChange={(e) => setSelectedHour(parseInt(e.target.value))}
                className="w-64"
              />
            </div>
          </div>
        </div>

        {/* Reset button */}
        <button
          onClick={handleFullReset}
          className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10 bg-black/90 hover:bg-gray-900/50 backdrop-blur-md text-gray-200 text-sm font-medium px-4 py-2 rounded-lg border border-gray-800/50 transition-all duration-200 shadow-2xl"
        >
          지도 초기화
        </button>

        {/* Error display */}
        {dataError && (
          <div className="absolute top-4 right-4 bg-red-500/90 text-white p-3 rounded-lg shadow-lg z-20">
            <div className="font-bold">데이터 로딩 오류</div>
            <div className="text-sm">{dataError}</div>
          </div>
        )}
      </div>
      
      {/* Chart Panel */}
      {showChartPanel && (
        <div className="fixed top-0 right-0 h-full flex transition-all duration-500 z-40">
          <ResizablePanel
            initialWidth={typeof window !== 'undefined' ? window.innerWidth * 0.4 : 600}
            minWidth={300}
            maxWidth={typeof window !== 'undefined' ? window.innerWidth * 0.6 : 800}
            className="h-screen bg-black/80 border-l border-gray-800/50"
          >
            <div className="h-full p-4 overflow-y-auto">
              <DefaultChartsPanel 
                selectedGu={selectedGu}
                selectedGuCode={filterState.selectedGuCode}
                selectedDong={selectedDong}
                selectedDongCode={filterState.selectedDongCode}
                selectedBusinessType={null}
                selectedDate={filterState.selectedDate}
              />
            </div>
          </ResizablePanel>
        </div>
      )}
    </div>
  )
}