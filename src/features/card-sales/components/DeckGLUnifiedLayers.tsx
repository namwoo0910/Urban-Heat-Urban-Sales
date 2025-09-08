/**
 * DeckGL Unified Layers
 * 
 * Mapbox 네이티브 레이어를 완전히 대체하는 Deck.gl 통합 레이어
 * 단일 WebGL 컨텍스트로 모든 레이어를 렌더링하여 성능 극대화
 */

import { useMemo, useCallback } from 'react'
import { GeoJsonLayer, PathLayer } from '@deck.gl/layers'
import { PolygonLayer } from '@deck.gl/layers'
import type { PickingInfo } from '@deck.gl/core'
import type { Feature, FeatureCollection } from 'geojson'

interface UnifiedLayersProps {
  // Data
  sggData: FeatureCollection | null
  dongData: FeatureCollection | null
  dongData3D: FeatureCollection | null
  seoulBoundaryData?: FeatureCollection | null
  
  // State
  is3DMode: boolean
  isDragging: boolean
  viewState: {
    zoom: number
    longitude: number
    latitude: number
    pitch: number
    bearing: number
  }
  
  // Selection & Hover
  selectedGu: string | null
  selectedDong: string | null
  hoveredDistrict: string | null
  
  // Visibility
  sggVisible: boolean
  dongVisible: boolean
  showBoundary?: boolean
  
  // Sales data for 3D height
  dongSalesMap?: Map<number, number>
  heightScale?: number
  
  // Theme
  currentThemeKey: string
  
  // Callbacks
  onHover?: (info: PickingInfo) => void
  onClick?: (info: PickingInfo) => void
}

// 색상 상수 정의
const COLORS = {
  // 기본 색상
  DEFAULT_FILL: [30, 40, 50, 180] as [number, number, number, number],
  DEFAULT_LINE: [0, 255, 255, 100] as [number, number, number, number],
  
  // 구 색상
  SGG_FILL: [20, 30, 40, 150] as [number, number, number, number],
  SGG_LINE: [0, 200, 200, 200] as [number, number, number, number],
  SGG_LINE_HOVER: [0, 255, 255, 255] as [number, number, number, number],
  
  // 동 색상
  DONG_FILL: [25, 35, 45, 120] as [number, number, number, number],
  DONG_LINE: [100, 150, 200, 150] as [number, number, number, number],
  
  // 선택/호버 색상
  SELECTED_FILL: [255, 200, 0, 200] as [number, number, number, number],
  HOVER_FILL: [0, 255, 255, 100] as [number, number, number, number],
  HOVER_LINE: [0, 255, 255, 255] as [number, number, number, number],
  
  // 글로우 효과
  GLOW_OUTER: [0, 255, 255, 50] as [number, number, number, number],
  GLOW_MID: [100, 200, 255, 100] as [number, number, number, number],
  
}

// 동 높이 계산 (3D 모드)
const getDongHeight = (
  feature: Feature,
  dongSalesMap?: Map<number, number>,
  heightScale: number = 1
): number => {
  if (!dongSalesMap) return 0
  
  const dongCode = feature.properties?.ADM_DR_CD || 
                   feature.properties?.dongCode || 
                   feature.properties?.dong_code ||
                   feature.properties?.['행정동코드']
  
  if (!dongCode) return 0
  
  const sales = dongSalesMap.get(Number(dongCode)) || 0
  return Math.min(sales * heightScale * 0.00001, 1000) // 최대 높이 1000m 제한
}

export function createUnifiedDeckGLLayers({
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
  sggVisible,
  dongVisible,
  showBoundary = false,
  dongSalesMap,
  heightScale = 1,
  currentThemeKey,
  onHover,
  onClick
}: UnifiedLayersProps) {
  
  const layers = []
  
  // ========================================
  // 0. Seoul Boundary Layer (if provided)
  // ========================================
  if (seoulBoundaryData && showBoundary && !is3DMode) {
    // Seoul boundary shadow effect
    const boundaryGlowLayer = new PathLayer({
      id: 'seoul-boundary-glow',
      data: seoulBoundaryData.features,
      
      getPath: (feature: Feature) => {
        if (feature.geometry.type === 'MultiPolygon') {
          return feature.geometry.coordinates[0][0]
        }
        if (feature.geometry.type === 'Polygon') {
          return feature.geometry.coordinates[0]
        }
        return []
      },
      
      getColor: [0, 0, 0, 50], // Shadow color
      getWidth: 5,
      widthScale: 1,
      widthMinPixels: 3,
      widthMaxPixels: 7,
      
      pickable: false,
      
      parameters: {
        blendFunc: [770, 1], // Additive blending for glow
        blendEquation: 32774
      }
    })
    
    // Main Seoul boundary line
    const boundaryLineLayer = new PathLayer({
      id: 'seoul-boundary-line',
      data: seoulBoundaryData.features,
      
      getPath: (feature: Feature) => {
        if (feature.geometry.type === 'MultiPolygon') {
          return feature.geometry.coordinates[0][0]
        }
        if (feature.geometry.type === 'Polygon') {
          return feature.geometry.coordinates[0]
        }
        return []
      },
      
      getColor: [0, 255, 255, 200], // Cyan boundary
      getWidth: 2,
      widthScale: 1,
      widthMinPixels: 1.5,
      widthMaxPixels: 3,
      
      pickable: false
    })
    
    layers.push(boundaryGlowLayer, boundaryLineLayer)
  }
  
  // ========================================
  // 1. 구(SGG) 레이어 - GeoJsonLayer로 통합
  // ========================================
  if (sggData && sggVisible && !is3DMode) {
    // 2D 구 레이어
    const sggLayer = new GeoJsonLayer({
      id: 'unified-sgg-2d',
      data: sggData,
      
      // Geometry
      filled: true,
      stroked: true,
      lineWidthScale: 1,
      lineWidthMinPixels: 1,
      lineWidthMaxPixels: 3,
      
      // Fill 스타일
      getFillColor: (feature: Feature) => {
        const name = feature.properties?.SIGUNGU_NM || feature.properties?.GU_NM
        
        if (hoveredDistrict === name) {
          return COLORS.HOVER_FILL
        }
        if (selectedGu === name) {
          return COLORS.SELECTED_FILL
        }
        return COLORS.SGG_FILL
      },
      
      // Line 스타일
      getLineColor: (feature: Feature) => {
        const name = feature.properties?.SIGUNGU_NM || feature.properties?.GU_NM
        
        if (hoveredDistrict === name) {
          return COLORS.SGG_LINE_HOVER
        }
        return COLORS.SGG_LINE
      },
      
      getLineWidth: (feature: Feature) => {
        const name = feature.properties?.SIGUNGU_NM || feature.properties?.GU_NM
        if (hoveredDistrict === name) return 3
        return 1.5
      },
      
      // 인터랙션
      pickable: !isDragging,
      autoHighlight: false,
      highlightColor: COLORS.HOVER_FILL,
      
      // 성능 최적화
      updateTriggers: {
        getFillColor: [selectedGu, hoveredDistrict],
        getLineColor: [hoveredDistrict],
        getLineWidth: [hoveredDistrict]
      },
      
      // 이벤트 핸들러
      onHover,
      onClick,
      
      // 트랜지션
      transitions: {
        getFillColor: isDragging ? 0 : 200,
        getLineColor: isDragging ? 0 : 200,
        getLineWidth: isDragging ? 0 : 100
      }
    })
    
    layers.push(sggLayer)
    
    // 글로우 효과 레이어 (별도 PathLayer로 구현)
    if (!isDragging) {
      const sggGlowLayer = new PathLayer({
        id: 'unified-sgg-glow',
        data: sggData.features,
        
        getPath: (feature: Feature) => {
          // MultiPolygon 처리
          if (feature.geometry.type === 'MultiPolygon') {
            return feature.geometry.coordinates[0][0]
          }
          // Polygon 처리
          if (feature.geometry.type === 'Polygon') {
            return feature.geometry.coordinates[0]
          }
          return []
        },
        
        getColor: (feature: Feature) => {
          const name = feature.properties?.SIGUNGU_NM || feature.properties?.GU_NM
          if (hoveredDistrict === name) {
            return COLORS.GLOW_MID
          }
          return [0, 0, 0, 0] // 투명
        },
        
        getWidth: 8,
        widthScale: 1,
        widthMinPixels: 0,
        widthMaxPixels: 10,
        
        // 성능
        pickable: false,
        
        parameters: {
          blendFunc: [770, 1], // GL.SRC_ALPHA, GL.ONE for additive blending
          blendEquation: 32774 // GL.FUNC_ADD
        },
        
        updateTriggers: {
          getColor: [hoveredDistrict]
        }
      })
      
      layers.push(sggGlowLayer)
    }
  }
  
  // ========================================
  // 2. 동(DONG) 레이어
  // ========================================
  if (viewState.zoom >= 11) {
    if (is3DMode && dongData3D) {
      // 3D 동 레이어는 기존 PolygonLayer 사용 (이미 구현됨)
      // 여기서는 2D만 처리
    } else if (dongData && dongVisible && !is3DMode) {
      // 2D 동 레이어
      const dongLayer = new GeoJsonLayer({
        id: 'unified-dong-2d',
        data: dongData,
        
        // Geometry
        filled: true,
        stroked: true,
        lineWidthScale: 1,
        lineWidthMinPixels: 0.5,
        lineWidthMaxPixels: 2,
        
        // Fill 스타일
        getFillColor: (feature: Feature) => {
          const dongName = feature.properties?.ADM_DR_NM || feature.properties?.DONG_NM
          const guName = feature.properties?.guName || feature.properties?.['자치구']
          
          if (hoveredDistrict === dongName) {
            return COLORS.HOVER_FILL
          }
          if (selectedDong === dongName) {
            return COLORS.SELECTED_FILL
          }
          if (selectedGu === guName) {
            return [40, 50, 60, 150] // 선택된 구의 동들
          }
          return COLORS.DONG_FILL
        },
        
        // Line 스타일
        getLineColor: (feature: Feature) => {
          const dongName = feature.properties?.ADM_DR_NM || feature.properties?.DONG_NM
          
          if (hoveredDistrict === dongName) {
            return COLORS.HOVER_LINE
          }
          return COLORS.DONG_LINE
        },
        
        getLineWidth: (feature: Feature) => {
          const dongName = feature.properties?.ADM_DR_NM || feature.properties?.DONG_NM
          if (hoveredDistrict === dongName) return 2
          return 1
        },
        
        // 인터랙션
        pickable: !isDragging,
        autoHighlight: false,
        
        // 성능 최적화
        updateTriggers: {
          getFillColor: [selectedGu, selectedDong, hoveredDistrict],
          getLineColor: [hoveredDistrict],
          getLineWidth: [hoveredDistrict]
        },
        
        // 이벤트 핸들러
        onHover,
        onClick,
        
        // 트랜지션
        transitions: {
          getFillColor: isDragging ? 0 : 200,
          getLineColor: isDragging ? 0 : 200,
          getLineWidth: isDragging ? 0 : 100
        }
      })
      
      layers.push(dongLayer)
    }
  }
  
  
  return layers
}

// Export default hook for easy usage
export function useUnifiedDeckGLLayers(props: UnifiedLayersProps) {
  return useMemo(
    () => createUnifiedDeckGLLayers(props),
    [
      props.sggData,
      props.dongData,
      props.dongData3D,
      props.seoulBoundaryData,
      props.is3DMode,
      props.isDragging,
      props.viewState.zoom,
      props.selectedGu,
      props.selectedDong,
      props.hoveredDistrict,
      props.sggVisible,
      props.dongVisible,
      props.showBoundary,
      props.dongSalesMap,
      props.heightScale,
      props.currentThemeKey
    ]
  )
}