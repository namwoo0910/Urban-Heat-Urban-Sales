"use client"

import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { HexagonLayer } from '@deck.gl/aggregation-layers'
import { ScatterplotLayer, ColumnLayer } from '@deck.gl/layers'
import type { Layer } from '@deck.gl/core'
import { COLOR_RANGES, type ColorScheme } from '@/src/features/card-sales/utils/premiumColors'
import { BUSINESS_TYPE_COLOR_MAP, DEFAULT_CATEGORY_COLOR } from '@/src/features/card-sales/constants/businessTypeColors'
import { calculateDataElevation, DATA_LAYER_ELEVATION } from '@/src/shared/constants/elevationConstants'

// 기존 COLOR_RANGES를 premium-colors.ts로 이동했으므로 re-export
export { COLOR_RANGES } from '@/src/features/card-sales/utils/premiumColors'

export interface HexagonLayerData {
  coordinates: [number, number]
  weight: number
  category?: string
  businessType?: string // 업종 카테고리 추가
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
  // 선택된 업종 카테고리
  selectedBusinessType?: string | null
  // 표시 모드 (simple: 행정동별 총합, detailed: 카테고리별 상세)
  displayMode?: 'simple' | 'detailed'
  // 선택된 지역 필터
  selectedGu?: string | null
  selectedGuCode?: number | null
  selectedDong?: string | null
  selectedDongCode?: number | null
  // WebGL 렌더링 설정
  webglEnabled?: boolean
  webglRadiusPixels?: number
  webglIntensity?: number
  webglThreshold?: number
  useCustomWebGL?: boolean // Use custom WebGL layer
}

interface LayerManagerProps {
  data: HexagonLayerData[] | null
  config: LayerConfig
  onHover?: (info: any) => void
  onClick?: (info: any) => void
  onAnimationInteractionStart?: () => void
  onAnimationInteractionEnd?: () => void
  // WebGL gradient data (optional)
}

// Seoul 중심점 (경위도)
const SEOUL_CENTER: [number, number] = [126.978, 37.5665]

/**
 * Generate smooth heatmap color based on normalized value
 * @param value Normalized value between 0 and 1
 * @returns RGBA color array
 */
function getHeatmapColor(value: number): [number, number, number, number] {
  // Clamp value between 0 and 1
  const v = Math.max(0, Math.min(1, value))
  
  // Soft gradient spectrum matching screenshot: blue -> cyan -> green -> yellow -> orange -> red
  // More subtle and smooth transitions
  let r, g, b: number
  
  if (v < 0.167) {
    // Blue to cyan
    const t = v / 0.167
    r = 0
    g = Math.floor(100 + 100 * t)  // 100 -> 200
    b = Math.floor(200 + 55 * t)   // 200 -> 255
  } else if (v < 0.333) {
    // Cyan to green
    const t = (v - 0.167) / 0.166
    r = 0
    g = Math.floor(200 + 55 * t)   // 200 -> 255
    b = Math.floor(255 - 155 * t)  // 255 -> 100
  } else if (v < 0.5) {
    // Green to yellow-green
    const t = (v - 0.333) / 0.167
    r = Math.floor(150 * t)        // 0 -> 150
    g = 255
    b = Math.floor(100 - 100 * t)  // 100 -> 0
  } else if (v < 0.667) {
    // Yellow-green to yellow
    const t = (v - 0.5) / 0.167
    r = Math.floor(150 + 105 * t)  // 150 -> 255
    g = 255
    b = 0
  } else if (v < 0.833) {
    // Yellow to orange
    const t = (v - 0.667) / 0.166
    r = 255
    g = Math.floor(255 - 105 * t)  // 255 -> 150
    b = 0
  } else {
    // Orange to red
    const t = (v - 0.833) / 0.167
    r = 255
    g = Math.floor(150 - 150 * t)  // 150 -> 0
    b = 0
  }
  
  // Higher opacity for grid interpolation to match screenshot (150-200)
  const alpha = 150 + Math.floor(50 * v)  // Range: 150-200 for better visibility
  
  return [r, g, b, alpha]
}

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
  onAnimationInteractionEnd,
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
        // Animation stopped
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
    
    // Animation started
    animationFrameRef.current = requestAnimationFrame(animate)
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
        // Animation stopped
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
    // Creating layers array to support multiple layers
    const layerArray: Layer[] = []
    
    // LAYER 1: HexagonLayer for 3D bars (main visualization)
    if (data && config.visible && data.length > 0) {
      console.log('[LayerManager] Creating HexagonLayer for bars with', data.length, 'points')
      
      // 애니메이션이 활성화된 경우 다중 레이어 생성
      if (config.animationEnabled && groupedData) {
        // Creating wave layers for animation
        groupedData.forEach((groupData, index) => {
          const phaseOffset = (index / WAVE_LAYERS) * Math.PI * 2
          const waveValue = Math.sin(animationTime * config.animationSpeed + phaseOffset)
          const waveScale = config.elevationScale * (1 + waveValue * (config.waveAmplitude - 1) * 0.5)
          
          layerArray.push(new HexagonLayer<HexagonLayerData>({
            id: `hexagon-wave-layer-${index}`,
            data: groupData,
            getPosition: (d: HexagonLayerData) => d.coordinates,
            getColorWeight: (d: HexagonLayerData) => getColorWeightByMode(d, config.colorMode),
            getElevationWeight: (d: HexagonLayerData) => d.weight,
            radius: config.radius,
            elevationScale: waveScale,
            coverage: config.coverage,
            extruded: true, // IMPORTANT: Enable 3D bars
            pickable: true,
            colorRange: COLOR_RANGES[config.colorScheme],
            upperPercentile: config.upperPercentile,
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
            onDragStart: onAnimationInteractionStart,
            onDragEnd: onAnimationInteractionEnd,
            gpuAggregation: true, // FORCE GPU aggregation
            updateTriggers: {
              getColorWeight: [config.colorScheme, config.colorMode],
              getElevationWeight: [waveScale]
            }
          }))
        })
      } else {
        // 애니메이션이 비활성화된 경우 단일 HexagonLayer
        const filteredData = useMemo(() => {
          if (!data) return data
          
          // 구나 동이 선택된 경우 실제 필터링
          if (config.selectedGuCode || config.selectedDongCode) {
            return data.filter(point => {
              const matchesGu = !config.selectedGuCode || 
                point.originalData?.guCode === String(config.selectedGuCode)
              const matchesDong = !config.selectedDongCode || 
                point.originalData?.dongCode === config.selectedDongCode
              
              return matchesGu && matchesDong
            })
          }
          
          // 선택된 것이 없으면 전체 데이터 반환
          return data
        }, [data, config.selectedGuCode, config.selectedDongCode])
        
        layerArray.push(new HexagonLayer<HexagonLayerData>({
          id: 'hexagon-layer',
          data: filteredData || data,
          getPosition: (d: HexagonLayerData) => d.coordinates,
          getColorWeight: (d: HexagonLayerData) => d.weight,
          getElevationWeight: (d: HexagonLayerData) => d.weight,
          radius: config.radius,
          elevationScale: config.elevationScale,
          coverage: config.coverage,
          extruded: true, // IMPORTANT: Enable 3D bars
          pickable: true,
          colorRange: COLOR_RANGES[config.colorScheme],
          upperPercentile: config.upperPercentile,
          onHover: (info, event) => {
            if (onHover) onHover(info)
            return true
          },
          onClick: (info, event) => {
            if (onClick) onClick(info)
            return true
          },
          gpuAggregation: true, // FORCE GPU aggregation
          updateTriggers: {
            getColorWeight: [config.colorScheme, config.colorMode, config.selectedGuCode, config.selectedDongCode],
            getElevationWeight: [config.elevationScale, config.selectedGuCode, config.selectedDongCode],
            data: [config.selectedGuCode, config.selectedDongCode]
          }
        }))
      }
    }
    
    
    return layerArray
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
        // Component unmounted - cleanup done
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
  if (!info?.object) {
    return ''
  }
  
  try {
    // HexagonLayer의 집계된 객체 구조 (deck.gl 문서 기준)
    const { colorValue, elevationValue, count, position } = info.object
    
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
    
    return tooltipText
    
  } catch (error) {
    // Error generating tooltip
    return '⚠️ 데이터 로드 중...'
  }
}

// ScatterplotLayer용 툴팁 포맷터 (구 이름 표시 가능)
export function formatScatterplotTooltip(info: any): string {
  
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
    // Error in formatScatterplotTooltip
    return '⚠️ 데이터 로드 오류'
  }
}

// 툴팁 포매터 - ColumnLayer용
function formatColumnTooltip(object: any): string {
  if (!object || !object.originalData) return ''
  
  const { originalData } = object
  const date = originalData.date || '날짜 정보 없음'
  const guName = originalData.guName || '정보 없음'
  const dongName = originalData.dongName || '정보 없음'
  const middleCategory = originalData.middleCategory || object.middleCategory || '업종 정보 없음'
  const sales = originalData.categorySales || object.weight || 0
  const displayMode = originalData.displayMode
  
  // Simple 모드에서는 총 매출액만 표시
  if (displayMode === 'simple') {
    return `
📅 날짜: ${date}
📍 지역: ${guName} ${dongName}
💰 총 매출액: ${sales.toLocaleString()}원
    `.trim()
  }
  
  // Detailed 모드에서는 카테고리별 정보 표시
  return `
📅 날짜: ${date}
📍 지역: ${guName} ${dongName}
💼 업종: ${middleCategory}
💰 매출액: ${sales.toLocaleString()}원
  `.trim()
}

// ColumnLayer로 3D 바 표시 (구 이름도 표시 가능) - OPTIMIZED with memoization
export function createColumnLayer(data: HexagonLayerData[] | null, config: LayerConfig & { 
  onHover?: (info: any) => void, 
  onClick?: (info: any) => void,
  hoveredDistrict?: string | null 
}): Layer[] {
  if (!data || !config.visible) return []
  
  // Creating column layer
  console.log('[LayerManager] Creating ColumnLayer with:', {
    dataCount: data?.length,
    elevationScale: config.elevationScale,
    displayMode: config.displayMode,
    firstItem: data?.[0] ? {
      coordinates: data[0].coordinates,
      weight: data[0].weight,
      hasOriginalData: !!data[0].originalData
    } : null
  })
  
  const layer = new ColumnLayer<HexagonLayerData>({
    id: 'column-layer',
    data,
    
    // 위치 - simple 모드에서는 오프셋 없이 원래 좌표 사용
    getPosition: (d: HexagonLayerData) => {
      // Simple 모드에서는 오프셋 없이 중앙에 하나의 바만 표시
      if (config.displayMode === 'simple') {
        return d.originalData?.coordinates || d.coordinates
      }
      // Detailed 모드에서는 카테고리별 오프셋 적용
      return d.coordinates
    },
    
    // 3D 바 설정 - 더 부드러운 원형을 위해 해상도 증가
    diskResolution: 12,  // 더 부드러운 원형 (기존 6에서 12로 증가)
    radius: config.displayMode === 'simple' ? config.radius / 4 : config.radius / 3,  // config.radius 사용
    extruded: true,  // 3D 활성화
    wireframe: false,
    filled: true,
    
    // 높이 (colorMode에 따라 변경) - 공통 상수 사용
    getElevation: (d: HexagonLayerData) => {
      const mode = config.colorMode || 'sales'
      
      switch(mode) {
        case 'temperature':
          const temp = d.originalData?.temperature || 20
          return calculateDataElevation(temp, 'temperature', config.elevationScale)
          
        case 'discomfort':
          const discomfort = d.originalData?.discomfortIndex || 50
          return calculateDataElevation(discomfort, 'discomfort', config.elevationScale)
          
        case 'humidity':
          const humidity = d.originalData?.humidity || 50
          return calculateDataElevation(humidity, 'humidity', config.elevationScale)
          
        case 'sales':
        default:
          // 매출액은 데이터 포인트가 아닌 카테고리별 합계 사용
          const salesValue = d.originalData?.categorySales || d.weight || 0
          return calculateDataElevation(salesValue, 'sales', config.elevationScale)
      }
    },
    elevationScale: config.displayMode === 'simple' ? 2 : config.elevationScale,  // 단순보기에서는 높이 절반으로
    
    // 색상 (colorScheme 사용)
    getFillColor: (d: HexagonLayerData) => {
      // 호버된 구역(동)과 같은 구역이면 전체 색상 변경
      const isHoveredDistrict = config.hoveredDistrict && d.originalData?.dongName === config.hoveredDistrict
      
      // COLOR_RANGES를 사용한 색상 적용
      if (config.displayMode === 'simple') {
        const value = d.weight
        const maxValue = 500000000  // 5억원 기준
        const normalizedValue = Math.min(1, value / maxValue)
        
        // 선택된 colorScheme의 색상 팔레트 사용
        const colorRange = COLOR_RANGES[config.colorScheme]
        const colorIndex = Math.min(Math.floor(normalizedValue * (colorRange.length - 1)), colorRange.length - 1)
        const baseColor = [...colorRange[colorIndex], 255] as [number, number, number, number]
        
        // 호버된 구역이면 밝기와 채도 증가
        if (isHoveredDistrict) {
          return [
            Math.min(255, baseColor[0] * 1.3),
            Math.min(255, baseColor[1] * 1.3), 
            Math.min(255, baseColor[2] * 1.3),
            255
          ]
        }
        
        return baseColor
      }
      
      // Detailed 모드에서는 카테고리별 색상 (실제 업종 데이터 사용)
      if (config.displayMode === 'detailed') {
        // 카테고리 확인 (category, businessType, originalData 순서로)
        const category = d.category || d.businessType || d.originalData?.businessType || '전체'
        let baseColor: [number, number, number, number]
        
        // 선택된 카테고리가 있을 때만 필터링
        if (config.selectedBusinessType) {
          // 선택된 카테고리와 일치하면 색상 표시, 아니면 회색
          if (category === config.selectedBusinessType) {
            baseColor = BUSINESS_TYPE_COLOR_MAP[category] || DEFAULT_CATEGORY_COLOR
          } else {
            baseColor = [128, 128, 128, 100]  // 선택되지 않은 카테고리는 회색
          }
        } else {
          // 선택된 카테고리가 없으면 모든 카테고리 색상 표시
          baseColor = BUSINESS_TYPE_COLOR_MAP[category] || DEFAULT_CATEGORY_COLOR
        }
        
        // 호버된 구역이면 색상 강화
        if (isHoveredDistrict) {
          return [
            Math.min(255, baseColor[0] * 1.4),
            Math.min(255, baseColor[1] * 1.4), 
            Math.min(255, baseColor[2] * 1.4),
            Math.min(255, baseColor[3] * 1.2)
          ]
        }
        
        return baseColor
      }
      
      // 업종 카테고리 색상 모드인 경우 (기존 코드 유지)
      if (config.colorMode === 'category' && config.selectedBusinessType) {
        // 데이터에 업종이 있으면 해당 색상 사용
        if (d.businessType) {
          // 선택된 카테고리와 일치하면 해당 색상, 아니면 회색
          if (d.businessType === config.selectedBusinessType) {
            return BUSINESS_TYPE_COLOR_MAP[d.businessType] || DEFAULT_CATEGORY_COLOR
          } else {
            // 선택되지 않은 카테고리는 반투명 회색
            return [128, 128, 128, 100]
          }
        }
        // originalData에서 업종 정보 확인
        if (d.originalData?.businessType) {
          const businessType = d.originalData.businessType
          if (businessType === config.selectedBusinessType) {
            return BUSINESS_TYPE_COLOR_MAP[businessType] || DEFAULT_CATEGORY_COLOR
          } else {
            return [128, 128, 128, 100]
          }
        }
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
    highlightColor: (info: any) => {
      // 호버된 구역(동)과 같은 구역이면 특별한 색상으로 하이라이트
      if (config.hoveredDistrict && info.object?.originalData?.dongName === config.hoveredDistrict) {
        return [0, 255, 255, 180]  // 청록색 하이라이트
      }
      return [255, 255, 255, 100]  // 기본 하이라이트
    },
    
    // 이벤트 핸들러
    onHover: config.onHover,
    onClick: config.onClick,
    
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
      elevationScale: [config.elevationScale],  // elevationScale 자체도 추가
      getFillColor: [config.colorScheme, config.colorMode, config.selectedBusinessType, config.displayMode, config.hoveredDistrict],
      highlightColor: [config.hoveredDistrict],  // 호버 상태 업데이트
      radius: [config.radius, config.coverage]  // radius와 coverage 추가
    }
  })
  
  return [layer]
}

// ScatterplotLayer로 개별 포인트 표시 (구 이름 표시 가능)
export function createScatterplotLayer(data: HexagonLayerData[] | null, config: LayerConfig): Layer[] {
  if (!data || !config.visible) return []
  
  
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
  visible: true, // 항상 true로 고정
  radius: 500,  // 반지름 500m (기본값)
  elevationScale: 1,  // 높이 스케일 1x로 변경 (기본값)
  coverage: 1,
  upperPercentile: 100,
  colorScheme: 'heat', // heat로 변경 (기본값)
  animationEnabled: false, // 임시로 애니메이션 OFF (툴팁 테스트용)
  animationSpeed: 1.0,
  waveAmplitude: 2.0,
  colorMode: 'category', // 색상을 카테고리별로 설정
  selectedBusinessType: null, // 기본적으로 모든 카테고리 표시
  // GPU WebGL 설정 - DEFAULT ON
  webglEnabled: true, // GPU rendering ON by default
  webglRadiusPixels: 80,
  webglIntensity: 1,
  webglThreshold: 0.03,
  useCustomWebGL: true // Use custom WebGL layer by default
}