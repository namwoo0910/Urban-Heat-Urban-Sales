"use client"

import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { HexagonLayer } from '@deck.gl/aggregation-layers'
import type { Layer } from '@deck.gl/core'
import { COLOR_RANGES, type ColorScheme } from '@/src/features/card-sales/utils/premiumColors'

// 기존 COLOR_RANGES를 premium-colors.ts로 이동했으므로 re-export
export { COLOR_RANGES } from '@/src/features/card-sales/utils/premiumColors'

export interface HexagonLayerData {
  coordinates: [number, number]
  weight: number
  category?: string
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
          
          // 가중치 설정
          getColorWeight: (d: HexagonLayerData) => d.weight,
          getElevationWeight: (d: HexagonLayerData) => d.weight,
          
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
            getColorWeight: [config.colorScheme],
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
        getColorWeight: [config.colorScheme],
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

// 툴팁 포맷터
export function formatTooltip(info: any): string {
  if (!info.object) return ''
  
  const { elevationValue, colorValue, count } = info.object
  
  return `
데이터 포인트: ${count || 0}개
가중치: ${colorValue?.toFixed(2) || 'N/A'}
높이: ${elevationValue?.toFixed(2) || 'N/A'}
  `.trim()
}

export const DEFAULT_LAYER_CONFIG: LayerConfig = {
  visible: true,
  radius: 100,  // 반지름 100m로 설정
  elevationScale: 10,  // 높이 스케일 10x로 설정
  coverage: 1,
  upperPercentile: 100,
  colorScheme: 'oceanic', // 색상 스킴 심해로 설정
  animationEnabled: true, // 자동 애니메이션 ON으로 설정
  animationSpeed: 1.0,
  waveAmplitude: 2.0
}