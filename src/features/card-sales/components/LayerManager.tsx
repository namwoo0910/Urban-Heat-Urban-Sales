"use client"

import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { HexagonLayer } from '@deck.gl/aggregation-layers'
import { ScatterplotLayer, ColumnLayer } from '@deck.gl/layers'
import type { Layer } from '@deck.gl/core'
import { COLOR_RANGES, type ColorScheme } from '@/src/features/card-sales/utils/premiumColors'
import { MIDDLE_CATEGORY_COLOR_MAP, DEFAULT_CATEGORY_COLOR } from '@/src/features/card-sales/constants/middleCategoryColors'

// 기존 COLOR_RANGES를 premium-colors.ts로 이동했으므로 re-export
export { COLOR_RANGES } from '@/src/features/card-sales/utils/premiumColors'

export interface HexagonLayerData {
  coordinates: [number, number]
  weight: number
  category?: string
  middleCategory?: string // 중분류 카테고리 추가
  originalData?: any // 원본 ClimateCardSalesData 저장
}

export interface LayerConfig {
  visible: boolean
  radius: number
  elevationScale: number
  coverage: number
  upperPercentile: number
  colorScheme: ColorScheme
  // 애니메이션 관련 설정
  animationEnabled: boolean
  animationSpeed: number
  waveAmplitude: number
  // 색상 모드 설정
  colorMode?: 'sales' | 'temperature' | 'temperatureGroup' | 'discomfort' | 'humidity' | 'category'
  // 선택된 중분류 카테고리
  selectedMiddleCategory?: string | null
}

interface LayerManagerProps {
  data: HexagonLayerData[] | null
  config: LayerConfig
  onHover?: (info: any) => void
  onClick?: (info: any) => void
  onAnimationInteractionStart?: () => void
  onAnimationInteractionEnd?: () => void
}

// Seoul 중심점 (경위도)
const SEOUL_CENTER: [number, number] = [126.978, 37.5665]

// 기온그룹을 숫자값으로 변환
function temperatureGroupToValue(group?: string): number {
  switch(group) {
    case '한파': return -10
    case '일반': return 10
    case '온화': return 20
    case '폭염': return 30
    default: return 0
  }
}

// 색상 모드에 따른 가중치 계산
function getColorWeightByMode(d: HexagonLayerData, colorMode?: string): number {
  if (!d.originalData) return d.weight
  
  switch(colorMode) {
    case 'temperature':
      // 기온 (-11.5°C ~ 31.9°C 범위)
      return d.originalData.temperature || d.weight
    
    case 'temperatureGroup':
      // 기온그룹별 고정값
      return temperatureGroupToValue(d.originalData.temperatureGroup)
    
    case 'discomfort':
      // 불쾌지수 (24 ~ 80+ 범위)
      return d.originalData.discomfortIndex || d.weight
    
    case 'humidity':
      // 습도 (0 ~ 100 범위)
      return d.originalData.humidity || d.weight
    
    case 'sales':
    default:
      // 매출액 (기본값)
      return d.weight
  }
}

// 두 지점 간의 거리를 계산하는 함수 (km 단위)
function calculateDistance(point1: [number, number], point2: [number, number]): number {
  const [lon1, lat1] = point1
  const [lon2, lat2] = point2
  
  const R = 6371 // 지구 반지름 (km)
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

// 파도 애니메이션을 위한 상수
const WAVE_LAYERS = 5

// 거리 기반으로 데이터를 그룹화하는 함수
function groupDataByDistance(data: HexagonLayerData[], center: [number, number], groups: number): HexagonLayerData[][] {
  // 각 포인트의 중심으로부터의 거리 계산
  const dataWithDistance = data.map(point => ({
    ...point,
    distance: Math.sqrt(
      Math.pow(point.coordinates[0] - center[0], 2) + 
      Math.pow(point.coordinates[1] - center[1], 2)
    )
  }))
  
  // 거리에 따라 정렬
  dataWithDistance.sort((a, b) => a.distance - b.distance)
  
  // 그룹으로 분할
  const groupSize = Math.ceil(dataWithDistance.length / groups)
  const result: HexagonLayerData[][] = []
  
  for (let i = 0; i < groups; i++) {
    const start = i * groupSize
    const end = Math.min(start + groupSize, dataWithDistance.length)
    result.push(dataWithDistance.slice(start, end).map(({ distance, ...point }) => point))
  }
  
  return result
}

export function LayerManager({
  data,
  config,
  onHover,
  onClick,
  onAnimationInteractionStart,
  onAnimationInteractionEnd
}: LayerManagerProps) {
  // 애니메이션 시간 추적 (throttled updates)
  const [animationTime, setAnimationTime] = useState(0)
  const animationFrameRef = useRef<number | null>(null)
  const lastUpdateTimeRef = useRef(0)
  
  // 애니메이션 업데이트 (throttled to 30fps for performance)
  useEffect(() => {
    if (!config.animationEnabled) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
        console.log('Wave animation stopped')
      }
      return
    }
    
    const THROTTLE_MS = 33 // ~30fps for better performance
    
    const animate = (currentTime: number) => {
      if (currentTime - lastUpdateTimeRef.current >= THROTTLE_MS) {
        setAnimationTime(currentTime / 1000)
        lastUpdateTimeRef.current = currentTime
      }
      
      animationFrameRef.current = requestAnimationFrame(animate)
    }
    
    console.log('Wave animation started')
    animationFrameRef.current = requestAnimationFrame(animate)
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
        console.log('Wave animation stopped')
      }
    }
  }, [config.animationEnabled])

  // Grouped data for animated layers (stable)
  const groupedData = useMemo(() => {
    if (!data || !config.animationEnabled) return null
    return groupDataByDistance(data, SEOUL_CENTER, WAVE_LAYERS)
  }, [data, config.animationEnabled])

  // Create layers with proper dependency management
  const layers = useMemo<Layer[]>(() => {
    console.log('[LayerManager] Creating layers with:', {
      hasData: !!data,
      dataLength: data?.length || 0,
      visible: config.visible,
      animationEnabled: config.animationEnabled,
      radius: config.radius,
      elevationScale: config.elevationScale
    })

    if (!data || !config.visible) {
      console.log('[LayerManager] No layers created:', { hasData: !!data, visible: config.visible })
      return []
    }

    // 애니메이션이 활성화된 경우 다중 레이어 생성
    if (config.animationEnabled && groupedData) {
      console.log(`[LayerManager] Creating ${WAVE_LAYERS} wave layers with ${data.length} total points`)
      
      return groupedData.map((groupData, index) => {
        // 각 레이어의 위상차 계산 (0 ~ 2π)
        const phaseOffset = (index / WAVE_LAYERS) * Math.PI * 2
        
        // 시간에 따른 사인파 계산 (throttled animationTime)
        const waveValue = Math.sin(animationTime * config.animationSpeed + phaseOffset)
        const waveScale = config.elevationScale * (1 + waveValue * (config.waveAmplitude - 1) * 0.5)
        
        return new HexagonLayer<HexagonLayerData>({
          id: `hexagon-wave-layer-${index}`,
          data: groupData,
          
          // 위치 접근자
          getPosition: (d: HexagonLayerData) => d.coordinates,
          
          // 가중치 설정 - 이중 인코딩
          getColorWeight: (d: HexagonLayerData) => getColorWeightByMode(d, config.colorMode),
          getElevationWeight: (d: HexagonLayerData) => d.weight, // 높이는 항상 매출액
          
          // 시각적 속성
          radius: config.radius,
          elevationScale: waveScale,  // 파도 효과 적용
          coverage: config.coverage,
          extruded: true,
          pickable: true,
          
          // 색상 설정
          colorRange: COLOR_RANGES[config.colorScheme],
          upperPercentile: config.upperPercentile,
          
          // 상호작용
          onHover: (info, event) => {
            if (onHover) onHover(info)
            if (onAnimationInteractionStart && info.object) {
              onAnimationInteractionStart()
            }
            return true
          },
          onClick: (info, event) => {
            if (onClick) onClick(info)
            return true
          },
          
          // 애니메이션 중 상호작용 처리
          onDragStart: onAnimationInteractionStart,
          onDragEnd: onAnimationInteractionEnd,
          
          // 성능 최적화
          gpuAggregation: true,
          
          // 업데이트 트리거 (throttled animationTime)
          updateTriggers: {
            getColorWeight: [config.colorScheme, config.colorMode],
            getElevationWeight: [waveScale]
          }
        })
      })
    }

    // 애니메이션이 비활성화된 경우 단일 HexagonLayer
    console.log('[LayerManager] Creating single static hexagon layer')
    
    const hexagonLayer = new HexagonLayer<HexagonLayerData>({
      id: 'hexagon-layer',
      data,
      
      // 위치 접근자
      getPosition: (d: HexagonLayerData) => d.coordinates,
      
      // 가중치 설정
      getColorWeight: (d: HexagonLayerData) => d.weight,
      getElevationWeight: (d: HexagonLayerData) => d.weight,
      
      // 시각적 속성
      radius: config.radius,
      elevationScale: config.elevationScale,
      coverage: config.coverage,
      extruded: true,
      pickable: true,
      
      // 색상 설정
      colorRange: COLOR_RANGES[config.colorScheme],
      upperPercentile: config.upperPercentile,
      
      // 상호작용
      onHover: (info, event) => {
        if (onHover) onHover(info)
        return true
      },
      onClick: (info, event) => {
        if (onClick) onClick(info)
        return true
      },
      
      // 성능 최적화
      gpuAggregation: true,
      
      // 업데이트 트리거
      updateTriggers: {
        getColorWeight: [config.colorScheme, config.colorMode],
        getElevationWeight: [config.elevationScale]
      }
    })

    console.log('[LayerManager] Single layer created successfully')
    return [hexagonLayer]
  }, [
    data, 
    config,
    groupedData,
    animationTime, // Only for animated layers - throttled to 30fps
    onHover, 
    onClick, 
    onAnimationInteractionStart, 
    onAnimationInteractionEnd
  ])

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
        console.log('Component unmounted - Wave animation cleaned up')
      }
    }
  }, [])

  return layers
}

// 색상 모드 라벨 가져오기
function getColorModeLabel(mode: string): string {
  const labels: Record<string, string> = {
    sales: '매출액',
    temperature: '기온',
    temperatureGroup: '기온그룹',
    discomfort: '불쾌지수',
    humidity: '습도'
  }
  return labels[mode] || mode
}

// 색상 모드에 따른 값 포맷팅 (집계된 값용)
function formatColorValue(value: number | undefined | null, mode: string): string {
  if (value === undefined || value === null) return 'N/A'
  
  switch(mode) {
    case 'temperature': 
      // 평균 기온
      return `${value.toFixed(1)}°C`
    case 'temperatureGroup':
      // 기온그룹 값 역변환: -10=한파, 10=일반, 20=온화, 30=폭염
      if (value <= -5) return '한파'
      if (value <= 15) return '일반'  
      if (value <= 25) return '온화'
      return '폭염'
    case 'humidity': 
      // 평균 습도
      return `${value.toFixed(1)}%`
    case 'discomfort': 
      // 평균 불쾌지수
      return value.toFixed(1)
    case 'sales': 
      // 매출 합계
      return `${value.toLocaleString()}원`
    default: 
      return value.toFixed(1)
  }
}

// 툴팁 포맷터 (HexagonLayer의 실제 구조에 맞게 수정)
export function formatTooltip(info: any): string {
  console.log('[formatTooltip Debug] Input info:', {
    hasObject: !!info?.object,
    objectKeys: info?.object ? Object.keys(info.object) : [],
    object: info?.object,
    layerId: info?.layer?.id
  })
  
  if (!info?.object) {
    console.log('[formatTooltip Debug] No object found, returning empty string')
    return ''
  }
  
  try {
    // HexagonLayer의 집계된 객체 구조 (deck.gl 문서 기준)
    const { colorValue, elevationValue, count, position } = info.object
    
    console.log('[formatTooltip Debug] Extracted values:', {
      colorValue,
      elevationValue,
      count,
      position
    })
    
    // colorMode는 LayerConfig에서 가져오기
    const colorMode = info.layer?.props?.colorMode || 'sales'
    
    // position은 육각형 중심 좌표 [lng, lat]
    const [lng = 0, lat = 0] = position || [0, 0]
    
    // 안전한 값 처리
    const safeCount = count || 0
    const safeElevation = elevationValue || 0
    const safeColorValue = colorValue !== undefined && colorValue !== null ? colorValue : 0
    const safeRadius = info.layer?.props?.radius || 100
    
    const tooltipText = `
📍 위치: ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E
━━━━━━━━━━━━━━━━━━━
📊 집계 정보
  • 데이터 포인트: ${safeCount}개
  • 매출 합계: ${safeElevation.toLocaleString()}원
  • ${getColorModeLabel(colorMode)}: ${formatColorValue(safeColorValue, colorMode)}
━━━━━━━━━━━━━━━━━━━
📌 육각형 반경: ${safeRadius}m
  `.trim()
    
    console.log('[formatTooltip Debug] Generated tooltip:', tooltipText)
    return tooltipText
    
  } catch (error) {
    console.error('[formatTooltip Debug] Error generating tooltip:', error)
    return '⚠️ 데이터 로드 중...'
  }
}

// ScatterplotLayer용 툴팁 포맷터 (구 이름 표시 가능)
export function formatScatterplotTooltip(info: any): string {
  console.log('[formatScatterplotTooltip] Input:', info)
  
  if (!info?.object) return ''
  
  const { object } = info
  const originalData = object.originalData
  
  if (!originalData) {
    return '데이터 로드 중...'
  }
  
  try {
    return `
🏢 지역 정보
━━━━━━━━━━━━━━━━━━━
📍 구: ${originalData.guName || '정보 없음'}
📍 동: ${originalData.dongName || '정보 없음'}
━━━━━━━━━━━━━━━━━━━
💳 매출 정보
  • 총 매출: ${(originalData.totalSales || 0).toLocaleString()}원
  • 거래 건수: ${(originalData.totalTransactions || 0).toLocaleString()}건
━━━━━━━━━━━━━━━━━━━
🌡️ 기후 정보
  • 기온: ${originalData.temperature?.toFixed(1) || 0}°C
  • 습도: ${originalData.humidity?.toFixed(1) || 0}%
  • 불쾌지수: ${originalData.discomfortIndex?.toFixed(1) || 0}
  • 기온그룹: ${originalData.temperatureGroup || '정보 없음'}
━━━━━━━━━━━━━━━━━━━
👥 생활인구: ${(originalData.population || 0).toLocaleString()}명
📅 날짜: ${originalData.date || '정보 없음'}
    `.trim()
  } catch (error) {
    console.error('[formatScatterplotTooltip] Error:', error)
    return '⚠️ 데이터 로드 오류'
  }
}

// ColumnLayer로 3D 바 표시 (구 이름도 표시 가능)
export function createColumnLayer(data: HexagonLayerData[] | null, config: LayerConfig): Layer[] {
  if (!data || !config.visible) return []
  
  console.log('[ColumnLayer] Creating with', data.length, 'columns')
  if (data.length > 0) {
    console.log('[ColumnLayer] Sample data:', {
      category: data[0].category,
      weight: data[0].weight,
      coordinates: data[0].coordinates
    })
  }
  
  const layer = new ColumnLayer<HexagonLayerData>({
    id: 'column-layer',
    data,
    
    // 위치
    getPosition: (d: HexagonLayerData) => d.coordinates,
    
    // 3D 바 설정
    diskResolution: 6,  // 육각형 모양
    radius: config.radius * 0.015 * config.coverage,  // 바가 겹치지 않도록 더 작게 조정
    extruded: true,  // 3D 활성화
    wireframe: false,
    filled: true,
    
    // 높이 (colorMode에 따라 변경)
    getElevation: (d: HexagonLayerData) => {
      const mode = config.colorMode || 'sales'
      
      switch(mode) {
        case 'temperature':
          // 기온: -11.5°C ~ 31.9°C → 높이로 변환
          const temp = d.originalData?.temperature || 20
          return ((temp + 20) * 100) * config.elevationScale
          
        case 'discomfort':
          // 불쾌지수: 24 ~ 80 → 높이로 변환
          const discomfort = d.originalData?.discomfortIndex || 50
          return (discomfort * 50) * config.elevationScale
          
        case 'humidity':
          // 습도: 0 ~ 100% → 높이로 변환
          const humidity = d.originalData?.humidity || 50
          return (humidity * 30) * config.elevationScale
          
        case 'sales':
        default:
          // 매출액 (기본)
          return (d.weight / 100000) * config.elevationScale
      }
    },
    elevationScale: 1,
    
    // 색상 (colorMode에 따라 변경)
    getFillColor: (d: HexagonLayerData) => {
      // 중분류 카테고리 색상 모드인 경우
      if (config.colorMode === 'category' || config.selectedMiddleCategory) {
        // 데이터에 중분류가 있으면 해당 색상 사용
        if (d.middleCategory) {
          // 선택된 카테고리와 일치하면 해당 색상, 아니면 회색
          if (!config.selectedMiddleCategory || d.middleCategory === config.selectedMiddleCategory) {
            return MIDDLE_CATEGORY_COLOR_MAP[d.middleCategory] || DEFAULT_CATEGORY_COLOR
          } else {
            // 선택되지 않은 카테고리는 반투명 회색
            return [128, 128, 128, 100]
          }
        }
        // originalData에서 중분류 정보 확인
        if (d.originalData?.middleCategory) {
          const middleCategory = d.originalData.middleCategory
          if (!config.selectedMiddleCategory || middleCategory === config.selectedMiddleCategory) {
            return MIDDLE_CATEGORY_COLOR_MAP[middleCategory] || DEFAULT_CATEGORY_COLOR
          } else {
            return [128, 128, 128, 100]
          }
        }
      }
      
      // 기존 카테고리 데이터인 경우 카테고리별 고유 색상 사용
      if (d.category) {
        const categoryColors: Record<string, [number, number, number, number]> = {
          '음식': [255, 107, 107, 200],      // 연한 빨강
          '쇼핑': [78, 205, 196, 200],       // 청록색
          '교통': [255, 217, 61, 200],       // 노랑
          '문화/여가': [168, 85, 247, 200],  // 보라
          '의료/건강': [107, 207, 127, 200], // 연두
          '교육': [255, 140, 66, 200],       // 주황
          '숙박': [70, 130, 180, 200],       // 스틸블루
          '금융': [253, 121, 168, 200],      // 핑크
          '생활서비스': [147, 112, 219, 200], // 연보라
          '공공/기관': [162, 155, 254, 200]  // 라벤더
        }
        return categoryColors[d.category] || [128, 128, 128, 200]
      }
      
      const mode = config.colorMode || 'sales'
      
      switch(mode) {
        case 'temperature':
          const temp = d.originalData?.temperature || 20
          // 온도별 색상: 파란색(추움) -> 빨간색(더움)
          if (temp < 0) return [0, 100, 255, 200]
          if (temp < 10) return [0, 200, 255, 200]
          if (temp < 20) return [0, 255, 100, 200]
          if (temp < 30) return [255, 200, 0, 200]
          return [255, 50, 0, 200]
          
        case 'discomfort':
          const discomfort = d.originalData?.discomfortIndex || 50
          // 불쾌지수별 색상: 낮음(파랑) -> 높음(빨강)
          if (discomfort < 40) return [0, 200, 255, 200]
          if (discomfort < 60) return [0, 255, 100, 200]
          if (discomfort < 70) return [255, 200, 0, 200]
          return [255, 50, 0, 200]
          
        case 'humidity':
          const humidity = d.originalData?.humidity || 50
          // 습도별 색상: 건조(노랑) -> 습함(파랑)
          if (humidity < 30) return [255, 200, 0, 200]
          if (humidity < 50) return [200, 255, 0, 200]
          if (humidity < 70) return [0, 200, 255, 200]
          return [0, 100, 255, 200]
          
        case 'sales':
        default:
          // 매출액별 색상
          const sales = d.weight
          if (sales < 10000000) return [0, 100, 255, 200]  // 1천만원 미만: 파랑
          if (sales < 50000000) return [0, 255, 100, 200]  // 5천만원 미만: 초록
          if (sales < 100000000) return [255, 200, 0, 200] // 1억원 미만: 노랑
          return [255, 50, 0, 200]  // 1억원 이상: 빨강
      }
    },
    
    // 선 색상
    getLineColor: [255, 255, 255, 80],
    lineWidthMinPixels: 1,
    
    // 상호작용
    pickable: true,
    autoHighlight: true,
    highlightColor: [255, 255, 255, 100],
    
    // 성능
    material: {
      ambient: 0.35,
      diffuse: 1,
      shininess: 32,
      specularColor: [30, 30, 30]
    },
    
    // 애니메이션
    transitions: {
      getElevation: 600,
      getFillColor: 600
    },
    
    // 업데이트 트리거
    updateTriggers: {
      getElevation: [config.elevationScale, config.colorMode],  // colorMode 추가
      getFillColor: [config.colorScheme, config.colorMode, config.selectedMiddleCategory],
      radius: [config.radius, config.coverage]  // radius와 coverage 추가
    }
  })
  
  return [layer]
}

// ScatterplotLayer로 개별 포인트 표시 (구 이름 표시 가능)
export function createScatterplotLayer(data: HexagonLayerData[] | null, config: LayerConfig): Layer[] {
  if (!data || !config.visible) return []
  
  console.log('[ScatterplotLayer] Creating with', data.length, 'points')
  
  const layer = new ScatterplotLayer<HexagonLayerData>({
    id: 'scatterplot-layer',
    data,
    
    // 위치
    getPosition: (d: HexagonLayerData) => d.coordinates,
    
    // 크기 (매출액 기반)
    getRadius: (d: HexagonLayerData) => Math.sqrt(d.weight / 1000000) * 10, // 매출액에 비례한 반지름
    radiusScale: 1,
    radiusMinPixels: 2,
    radiusMaxPixels: 50,
    
    // 색상 (온도 기반)
    getFillColor: (d: HexagonLayerData) => {
      const temp = d.originalData?.temperature || 20
      // 온도에 따른 색상: 파란색(추움) -> 빨간색(더움)
      if (temp < 0) return [0, 100, 255, 200] // 파란색
      if (temp < 10) return [0, 200, 255, 200] // 하늘색
      if (temp < 20) return [0, 255, 100, 200] // 초록색
      if (temp < 30) return [255, 200, 0, 200] // 노란색
      return [255, 50, 0, 200] // 빨간색
    },
    
    // 테두리
    getLineColor: [255, 255, 255, 100],
    lineWidthMinPixels: 1,
    stroked: true,
    
    // 상호작용
    pickable: true,
    autoHighlight: true,
    highlightColor: [255, 255, 255, 100],
    
    // 애니메이션
    transitions: {
      getRadius: 600,
      getFillColor: 600
    },
    
    // 업데이트 트리거
    updateTriggers: {
      getRadius: [config.elevationScale],
      getFillColor: [config.colorScheme, config.colorMode]
    }
  })
  
  return [layer]
}

export const DEFAULT_LAYER_CONFIG: LayerConfig = {
  visible: true,
  radius: 300,  // 반지름 300m로 조정 (바가 겹치지 않도록)
  elevationScale: 1,  // 높이 스케일 1x로 설정 (기본값)
  coverage: 1,
  upperPercentile: 100,
  colorScheme: 'oceanic', // oceanic으로 변경 (sales는 COLOR_RANGES에 없음)
  animationEnabled: false, // 임시로 애니메이션 OFF (툴팁 테스트용)
  animationSpeed: 1.0,
  waveAmplitude: 2.0,
  colorMode: 'category', // 색상을 카테고리별로 설정
  selectedMiddleCategory: null // 기본적으로 모든 카테고리 표시
}