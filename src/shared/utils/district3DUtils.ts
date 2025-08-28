/**
 * 서울 행정구역 3D 시각화 유틸리티 함수
 */
import * as turf from '@turf/turf'

/**
 * Polygon을 축소하여 경계선 간격 생성
 * @param feature GeoJSON Feature
 * @param shrinkFactor 축소 정도 (음수값)
 * @returns 축소된 Feature
 */
export function createSplitPolygon(feature: any, shrinkFactor = -0.00008) {
  try {
    // MultiPolygon 처리
    if (feature.geometry.type === 'MultiPolygon') {
      const shrunkCoordinates = feature.geometry.coordinates.map((polygon: any) => {
        const tempFeature = {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: polygon
          }
        }
        const buffered = turf.buffer(tempFeature, shrinkFactor, { units: 'degrees' })
        return buffered?.geometry.coordinates[0] || polygon
      })
      
      return {
        ...feature,
        geometry: {
          type: 'MultiPolygon',
          coordinates: shrunkCoordinates
        }
      }
    }
    
    // Polygon 처리
    const buffered = turf.buffer(feature, shrinkFactor, { units: 'degrees' })
    return buffered || feature
  } catch (error) {
    console.warn('Failed to create split polygon:', error)
    return feature
  }
}

/**
 * 자치구별 높이 설정 (인구밀도/매출액 기반) - 2배 증가
 */
export function getDistrictHeight(districtName: string): number {
  const heights: Record<string, number> = {
    // 강남 3구 - 가장 높게
    '강남구': 700,
    '서초구': 640,
    '송파구': 600,
    
    // 도심권 - 높게
    '중구': 560,
    '종로구': 540,
    '용산구': 520,
    
    // 강북 지역 - 중간 높이
    '마포구': 500,
    '서대문구': 480,
    '은평구': 460,
    '성북구': 440,
    '강북구': 420,
    '도봉구': 400,
    '노원구': 380,
    
    // 강동 지역 - 중간 높이
    '강동구': 360,
    '광진구': 340,
    '성동구': 320,
    '중랑구': 300,
    
    // 강서 지역 - 낮은 높이
    '강서구': 280,
    '양천구': 260,
    '구로구': 240,
    '금천구': 220,
    '영등포구': 200,
    '동작구': 180,
    '관악구': 160
  }
  
  return heights[districtName] || 200
}

/**
 * 3D 색상 팔레트 (단색 톤 - 파란색 계열)
 */
export function get3DColorExpression() {
  // 높이 기반 블루 그라데이션
  return [
    'interpolate',
    ['linear'],
    ['get', 'height'],
    0,   'rgba(10, 25, 50, 0.95)',     // 아주 진한 남색
    160, 'rgba(20, 40, 70, 0.95)',     // 진한 남색
    200, 'rgba(30, 55, 90, 0.95)',     // 남색
    240, 'rgba(40, 70, 110, 0.95)',    
    280, 'rgba(50, 85, 130, 0.95)',    
    320, 'rgba(60, 100, 150, 0.95)',   
    360, 'rgba(70, 115, 170, 0.95)',   
    400, 'rgba(80, 130, 190, 0.95)',   
    440, 'rgba(90, 145, 210, 0.95)',   
    480, 'rgba(100, 160, 225, 0.95)',  
    520, 'rgba(110, 170, 235, 0.95)',  
    560, 'rgba(120, 180, 245, 0.95)',  
    600, 'rgba(130, 190, 250, 0.95)',  
    640, 'rgba(140, 200, 255, 0.95)',  
    700, 'rgba(150, 210, 255, 0.95)'   // 밝은 하늘색
  ]
}

/**
 * 동별 3D 색상 표현 (상단 밝게, dongIndex 기반 색상 변화)
 */
export function getDong3DColorExpression() {
  // dongIndex 기반으로 상단 색상 변화, 측면은 어둡게
  // 상단과 측면의 대비를 통해 자연스러운 경계 생성
  return [
    'case',
    // dongIndex를 8로 나눈 나머지에 따라 색상 할당 (상단은 밝게)
    ['==', ['%', ['get', 'dongIndex'], 8], 0], 'rgba(80, 100, 140, 0.95)',   // 진한 파랑
    ['==', ['%', ['get', 'dongIndex'], 8], 1], 'rgba(90, 120, 160, 0.95)',   // 파랑
    ['==', ['%', ['get', 'dongIndex'], 8], 2], 'rgba(100, 140, 180, 0.95)',  // 밝은 파랑
    ['==', ['%', ['get', 'dongIndex'], 8], 3], 'rgba(110, 160, 200, 0.95)',  // 하늘색
    ['==', ['%', ['get', 'dongIndex'], 8], 4], 'rgba(120, 180, 210, 0.95)',  // 밝은 하늘색
    ['==', ['%', ['get', 'dongIndex'], 8], 5], 'rgba(100, 160, 190, 0.95)',  // 청록색
    ['==', ['%', ['get', 'dongIndex'], 8], 6], 'rgba(90, 140, 170, 0.95)',   // 진한 청록
    ['==', ['%', ['get', 'dongIndex'], 8], 7], 'rgba(110, 150, 195, 0.95)',  // 중간 톤
    // 기본값
    'rgba(100, 140, 180, 0.95)'
  ]
}

/**
 * 3D 측면 색상 (더 어둡게)
 */
export function get3DSideColorExpression() {
  return [
    'interpolate',
    ['linear'],
    ['get', 'height'],
    0, 'rgba(10, 15, 30, 0.98)',
    100, 'rgba(15, 25, 50, 0.98)',
    200, 'rgba(25, 50, 75, 0.98)',
    300, 'rgba(50, 75, 100, 0.98)',
    350, 'rgba(75, 100, 127, 0.98)'
  ]
}

/**
 * 3D 모드 카메라 설정
 */
export const CAMERA_3D_CONFIG = {
  pitch: 60,
  bearing: -15,
  duration: 1200,
  essential: true
}

export const CAMERA_2D_CONFIG = {
  pitch: 0,
  bearing: 0,
  duration: 1000,
  essential: true
}

/**
 * 3D 조명 설정 - 상단을 강조하여 자연스러운 경계 생성
 */
export const LIGHT_3D_CONFIG = {
  anchor: 'viewport' as const,
  color: 'white',
  intensity: 0.6,  // 적절한 조명 강도
  position: [1.0, 70, 80] as [number, number, number]  // 상단을 주로 비추는 각도
}

/**
 * 동 레벨 높이 (정규화된 높이로 깔끔한 경계)
 */
export function getDongHeight(dongName: string | undefined, guName?: string): number {
  // 기본 높이를 300-450 범위로 제한 (더 균일한 높이)
  const baseHeight = 300
  
  // dongName이 없으면 기본 높이 반환
  if (!dongName) {
    return baseHeight
  }
  
  // 동별로 적당한 변화 추가 (hash 기반으로 일관된 높이 생성)
  let hash = 0
  for (let i = 0; i < dongName.length; i++) {
    hash = ((hash << 5) - hash) + dongName.charCodeAt(i)
    hash = hash & hash // Convert to 32bit integer
  }
  
  // 높이를 300-450 범위로 제한 (150 포인트 차이만)
  // 3단계로 단순화: 300, 375, 450
  const step = Math.abs(hash) % 3
  const heights = [300, 375, 450]
  
  return heights[step]
}