"use client"

import { useState, useCallback, useEffect } from 'react'
import type { LayerConfig, HexagonLayerData } from '../components/LayerManager'
import { DEFAULT_LAYER_CONFIG } from '../components/LayerManager'
import type { ColorScheme } from '../lib/premium-colors'
import useWaveAnimation from './use-wave-animation'

interface UseLayerStateReturn {
  // 레이어 설정 상태
  layerConfig: LayerConfig
  
  // 데이터 상태
  hexagonData: HexagonLayerData[] | null
  isDataLoading: boolean
  dataError: string | null
  
  // 설정 업데이트 함수들
  setVisible: (visible: boolean) => void
  setRadius: (radius: number) => void
  setElevationScale: (scale: number) => void
  setCoverage: (coverage: number) => void
  setUpperPercentile: (percentile: number) => void
  setColorScheme: (scheme: ColorScheme) => void
  
  // 애니메이션 설정 함수들
  setAnimationEnabled: (enabled: boolean) => void
  setAnimationSpeed: (speed: number) => void
  setWaveAmplitude: (amplitude: number) => void
  
  // 전체 설정 업데이트
  updateConfig: (config: Partial<LayerConfig>) => void
  resetConfig: () => void
  
  // 데이터 로딩
  loadData: () => Promise<void>
  
  // 상호작용 상태
  hoveredObject: any
  selectedObject: any
  setHoveredObject: (object: any) => void
  setSelectedObject: (object: any) => void
  
  // 애니메이션 상태
  currentAnimationScale: number
  isAnimating: boolean
  onAnimationInteractionStart: () => void
  onAnimationInteractionEnd: () => void
  toggleAnimation: () => void
  
  // 회전 애니메이션 상태
  rotationEnabled: boolean
  rotationSpeed: number
  rotationDirection: 'clockwise' | 'counterclockwise'
  currentBearing: number
  isRotating: boolean
  rotationBearingIncrement: number
  shouldRotate: boolean
  rotationDirectionText: string
  bearingDisplay: string
  
  // 회전 애니메이션 제어 함수들
  setRotationEnabled: (enabled: boolean) => void
  setRotationSpeed: (speed: number) => void
  setRotationDirection: (direction: 'clockwise' | 'counterclockwise') => void
  toggleRotation: () => void
  updateBearing: (bearing: number) => void
  onRotationInteractionStart: () => void
  onRotationInteractionEnd: () => void
}

export function useLayerState(): UseLayerStateReturn {
  // 레이어 설정 상태
  const [layerConfig, setLayerConfig] = useState<LayerConfig>(DEFAULT_LAYER_CONFIG)
  
  // 데이터 상태
  const [hexagonData, setHexagonData] = useState<HexagonLayerData[] | null>(null)
  const [isDataLoading, setIsDataLoading] = useState(false)
  const [dataError, setDataError] = useState<string | null>(null)
  
  // 상호작용 상태
  const [hoveredObject, setHoveredObject] = useState<any>(null)
  const [selectedObject, setSelectedObject] = useState<any>(null)
  
  // 회전 애니메이션 설정 상태 (simplified)
  const [rotationEnabled, setRotationEnabledState] = useState(false)
  const [rotationSpeed, setRotationSpeedState] = useState(1.0)
  const [rotationDirection, setRotationDirectionState] = useState<'clockwise' | 'counterclockwise'>('clockwise')
  const [currentBearing, setCurrentBearing] = useState(0)
  const [isRotating, setIsRotating] = useState(false)
  
  // 파도 애니메이션 훅 초기화
  const waveAnimation = useWaveAnimation({
    enabled: layerConfig.animationEnabled,
    speed: layerConfig.animationSpeed,
    amplitude: layerConfig.waveAmplitude,
    baseScale: layerConfig.elevationScale,
    minScale: layerConfig.elevationScale * 0.5,
    maxScale: layerConfig.elevationScale * layerConfig.waveAmplitude
  })
  
  // elevationScale이 변경될 때 애니메이션 설정도 업데이트
  useEffect(() => {
    waveAnimation.config.baseScale = layerConfig.elevationScale;
    waveAnimation.config.minScale = layerConfig.elevationScale * 0.5;
    waveAnimation.config.maxScale = layerConfig.elevationScale * layerConfig.waveAmplitude;
  }, [layerConfig.elevationScale, layerConfig.waveAmplitude, waveAnimation.config])
  
  // 개별 설정 업데이트 함수들
  const setVisible = useCallback((visible: boolean) => {
    setLayerConfig(prev => ({ ...prev, visible }))
  }, [])
  
  const setRadius = useCallback((radius: number) => {
    setLayerConfig(prev => ({ ...prev, radius }))
  }, [])
  
  const setElevationScale = useCallback((elevationScale: number) => {
    setLayerConfig(prev => ({ ...prev, elevationScale }))
  }, [])
  
  const setCoverage = useCallback((coverage: number) => {
    setLayerConfig(prev => ({ ...prev, coverage }))
  }, [])
  
  const setUpperPercentile = useCallback((upperPercentile: number) => {
    setLayerConfig(prev => ({ ...prev, upperPercentile }))
  }, [])
  
  const setColorScheme = useCallback((colorScheme: ColorScheme) => {
    setLayerConfig(prev => ({ ...prev, colorScheme }))
  }, [])
  
  // 애니메이션 설정 업데이트 함수들
  const setAnimationEnabled = useCallback((animationEnabled: boolean) => {
    setLayerConfig(prev => ({ ...prev, animationEnabled }))
  }, [])
  
  const setAnimationSpeed = useCallback((animationSpeed: number) => {
    setLayerConfig(prev => ({ ...prev, animationSpeed }))
  }, [])
  
  const setWaveAmplitude = useCallback((waveAmplitude: number) => {
    setLayerConfig(prev => ({ ...prev, waveAmplitude }))
  }, [])
  
  // 회전 애니메이션 설정 업데이트 함수들 (simplified)
  const setRotationEnabled = useCallback((enabled: boolean) => {
    setRotationEnabledState(enabled)
    // 활성화 시 회전 시작, 비활성화 시 회전 중지
    setIsRotating(enabled)
  }, [])
  
  const setRotationSpeed = useCallback((speed: number) => {
    setRotationSpeedState(speed)
  }, [])
  
  const setRotationDirection = useCallback((direction: 'clockwise' | 'counterclockwise') => {
    setRotationDirectionState(direction)
  }, [])
  
  // 회전 토글 함수
  const toggleRotation = useCallback(() => {
    if (rotationEnabled) {
      setIsRotating(prev => !prev)
    }
  }, [rotationEnabled])
  
  // bearing 업데이트 함수
  const updateBearing = useCallback((bearing: number) => {
    setCurrentBearing(bearing)
  }, [])
  
  // 사용자 상호작용 핸들러 (단순화)
  const onRotationInteractionStart = useCallback(() => {
    // 상호작용 시작 시 회전 중지
    setIsRotating(false)
  }, [])
  
  const onRotationInteractionEnd = useCallback(() => {
    // 상호작용 종료 시 회전 재개 (활성화된 경우)
    if (rotationEnabled) {
      setIsRotating(true)
    }
  }, [rotationEnabled])
  
  // 계산된 값들
  const rotationDirectionText = rotationDirection === 'clockwise' ? '시계방향' : '반시계방향'
  const bearingDisplay = `${Math.round(currentBearing)}°`
  const shouldRotate = rotationEnabled && isRotating
  
  // 전체 설정 업데이트
  const updateConfig = useCallback((config: Partial<LayerConfig>) => {
    setLayerConfig(prev => ({ ...prev, ...config }))
  }, [])
  
  const resetConfig = useCallback(() => {
    setLayerConfig(DEFAULT_LAYER_CONFIG)
  }, [])
  
  // 데이터 로딩 함수
  const loadData = useCallback(async () => {
    console.log('[HexagonLayer] 데이터 로딩 시작...')
    setIsDataLoading(true)
    setDataError(null)
    
    try {
      console.log('[HexagonLayer] Fetching data from /dummy-hexagon-data.json')
      const response = await fetch('/dummy-hexagon-data.json')
      
      console.log('[HexagonLayer] Fetch response:', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        url: response.url
      })
      
      if (!response.ok) {
        throw new Error(`데이터 로딩 실패: ${response.status} ${response.statusText} (URL: ${response.url})`)
      }
      
      const data: HexagonLayerData[] = await response.json()
      console.log('[HexagonLayer] Raw data received:', {
        isArray: Array.isArray(data),
        length: Array.isArray(data) ? data.length : 'N/A',
        firstItem: Array.isArray(data) && data.length > 0 ? data[0] : 'N/A'
      })
      
      // 데이터 유효성 검증
      if (!Array.isArray(data)) {
        throw new Error('잘못된 데이터 형식: 배열이 아닙니다')
      }
      
      // 각 데이터 포인트 유효성 검증
      const validData = data.filter((item, index) => {
        if (!item.coordinates || !Array.isArray(item.coordinates) || item.coordinates.length !== 2) {
          console.warn(`잘못된 좌표 데이터 (인덱스 ${index}):`, item)
          return false
        }
        
        if (typeof item.weight !== 'number' || item.weight < 0) {
          console.warn(`잘못된 가중치 데이터 (인덱스 ${index}):`, item)
          return false
        }
        
        return true
      })
      
      if (validData.length === 0) {
        throw new Error('유효한 데이터가 없습니다')
      }
      
      if (validData.length < data.length) {
        console.warn(`${data.length - validData.length}개의 잘못된 데이터 포인트가 제외되었습니다`)
      }
      
      setHexagonData(validData)
      console.log(`[HexagonLayer] 데이터 로딩 완료: ${validData.length}개 포인트`)
      console.log(`[HexagonLayer] 샘플 데이터:`, validData.slice(0, 3))
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다'
      setDataError(errorMessage)
      console.error('[HexagonLayer] 데이터 로딩 실패:', error)
      
      // 추가 디버그 정보
      console.error('[HexagonLayer] Debug info:', {
        currentURL: window.location.href,
        fetchURL: '/dummy-hexagon-data.json',
        error: error
      })
    } finally {
      setIsDataLoading(false)
    }
  }, [])
  
  // 컴포넌트 마운트 시 데이터 자동 로딩
  useEffect(() => {
    loadData()
  }, [loadData])
  
  return {
    // 레이어 설정 상태
    layerConfig,
    
    // 데이터 상태
    hexagonData,
    isDataLoading,
    dataError,
    
    // 설정 업데이트 함수들
    setVisible,
    setRadius,
    setElevationScale,
    setCoverage,
    setUpperPercentile,
    setColorScheme,
    
    // 애니메이션 설정 함수들
    setAnimationEnabled,
    setAnimationSpeed,
    setWaveAmplitude,
    
    // 전체 설정 업데이트
    updateConfig,
    resetConfig,
    
    // 데이터 로딩
    loadData,
    
    // 상호작용 상태
    hoveredObject,
    selectedObject,
    setHoveredObject,
    setSelectedObject,
    
    // 애니메이션 상태
    currentAnimationScale: waveAnimation.currentScale,
    isAnimating: waveAnimation.isAnimating,
    onAnimationInteractionStart: waveAnimation.onInteractionStart,
    onAnimationInteractionEnd: waveAnimation.onInteractionEnd,
    toggleAnimation: waveAnimation.toggleAnimation,
    
    // 회전 애니메이션 상태 (simplified)
    rotationEnabled,
    rotationSpeed,
    rotationDirection,
    currentBearing,
    isRotating,
    rotationBearingIncrement: 2 * rotationSpeed, // 계산된 값
    shouldRotate,
    rotationDirectionText,
    bearingDisplay,
    
    // 회전 애니메이션 제어 함수들 (simplified)
    setRotationEnabled,
    setRotationSpeed,
    setRotationDirection,
    toggleRotation,
    updateBearing,
    onRotationInteractionStart,
    onRotationInteractionEnd
  }
}