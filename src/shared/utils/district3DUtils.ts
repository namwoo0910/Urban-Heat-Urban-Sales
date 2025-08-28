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
 * 동별 3D 색상 - 파란색 테마
 */
function getDong3DColorExpressionBlue() {
  return [
    'case',
    ['==', ['%', ['get', 'dongIndex'], 8], 0], 'rgba(80, 100, 140, 0.75)',
    ['==', ['%', ['get', 'dongIndex'], 8], 1], 'rgba(90, 120, 160, 0.75)',
    ['==', ['%', ['get', 'dongIndex'], 8], 2], 'rgba(100, 140, 180, 0.75)',
    ['==', ['%', ['get', 'dongIndex'], 8], 3], 'rgba(110, 160, 200, 0.75)',
    ['==', ['%', ['get', 'dongIndex'], 8], 4], 'rgba(120, 180, 210, 0.75)',
    ['==', ['%', ['get', 'dongIndex'], 8], 5], 'rgba(100, 160, 190, 0.75)',
    ['==', ['%', ['get', 'dongIndex'], 8], 6], 'rgba(90, 140, 170, 0.75)',
    ['==', ['%', ['get', 'dongIndex'], 8], 7], 'rgba(110, 150, 195, 0.75)',
    'rgba(100, 140, 180, 0.75)'
  ]
}

/**
 * 동별 3D 색상 - 초록색 테마
 */
function getDong3DColorExpressionGreen() {
  return [
    'case',
    ['==', ['%', ['get', 'dongIndex'], 8], 0], 'rgba(60, 100, 60, 0.75)',
    ['==', ['%', ['get', 'dongIndex'], 8], 1], 'rgba(70, 120, 70, 0.75)',
    ['==', ['%', ['get', 'dongIndex'], 8], 2], 'rgba(80, 140, 80, 0.75)',
    ['==', ['%', ['get', 'dongIndex'], 8], 3], 'rgba(90, 160, 90, 0.75)',
    ['==', ['%', ['get', 'dongIndex'], 8], 4], 'rgba(100, 180, 100, 0.75)',
    ['==', ['%', ['get', 'dongIndex'], 8], 5], 'rgba(110, 200, 110, 0.75)',
    ['==', ['%', ['get', 'dongIndex'], 8], 6], 'rgba(85, 150, 85, 0.75)',
    ['==', ['%', ['get', 'dongIndex'], 8], 7], 'rgba(95, 170, 95, 0.75)',
    'rgba(90, 150, 90, 0.75)'
  ]
}

/**
 * 동별 3D 색상 - Kepler 테마 (보라색-핑크 그라데이션)
 */
function getDong3DColorExpressionPurple() {
  return [
    'case',
    ['==', ['%', ['get', 'dongIndex'], 8], 0], 'rgba(88, 51, 153, 0.75)',   // 진한 보라
    ['==', ['%', ['get', 'dongIndex'], 8], 1], 'rgba(110, 64, 170, 0.75)',  // 보라
    ['==', ['%', ['get', 'dongIndex'], 8], 2], 'rgba(132, 77, 187, 0.75)',  // 밝은 보라
    ['==', ['%', ['get', 'dongIndex'], 8], 3], 'rgba(154, 90, 204, 0.75)',  // 라벤더
    ['==', ['%', ['get', 'dongIndex'], 8], 4], 'rgba(176, 103, 221, 0.75)', // 밝은 라벤더
    ['==', ['%', ['get', 'dongIndex'], 8], 5], 'rgba(198, 116, 238, 0.75)', // 핑크 보라
    ['==', ['%', ['get', 'dongIndex'], 8], 6], 'rgba(121, 71, 179, 0.75)',  // 중간 보라
    ['==', ['%', ['get', 'dongIndex'], 8], 7], 'rgba(165, 97, 213, 0.75)',  // 파스텔 보라
    'rgba(132, 77, 187, 0.75)'
  ]
}

/**
 * 동별 3D 색상 - 주황색 테마
 */
function getDong3DColorExpressionOrange() {
  return [
    'case',
    ['==', ['%', ['get', 'dongIndex'], 8], 0], 'rgba(180, 100, 40, 0.75)',
    ['==', ['%', ['get', 'dongIndex'], 8], 1], 'rgba(200, 120, 50, 0.75)',
    ['==', ['%', ['get', 'dongIndex'], 8], 2], 'rgba(220, 140, 60, 0.75)',
    ['==', ['%', ['get', 'dongIndex'], 8], 3], 'rgba(240, 160, 70, 0.75)',
    ['==', ['%', ['get', 'dongIndex'], 8], 4], 'rgba(250, 180, 80, 0.75)',
    ['==', ['%', ['get', 'dongIndex'], 8], 5], 'rgba(230, 150, 65, 0.75)',
    ['==', ['%', ['get', 'dongIndex'], 8], 6], 'rgba(210, 130, 55, 0.75)',
    ['==', ['%', ['get', 'dongIndex'], 8], 7], 'rgba(245, 170, 75, 0.75)',
    'rgba(220, 140, 60, 0.75)'
  ]
}

/**
 * 동별 3D 색상 - 모노크롬 테마
 */
function getDong3DColorExpressionMono() {
  return [
    'case',
    ['==', ['%', ['get', 'dongIndex'], 8], 0], 'rgba(60, 60, 60, 0.75)',
    ['==', ['%', ['get', 'dongIndex'], 8], 1], 'rgba(80, 80, 80, 0.75)',
    ['==', ['%', ['get', 'dongIndex'], 8], 2], 'rgba(100, 100, 100, 0.75)',
    ['==', ['%', ['get', 'dongIndex'], 8], 3], 'rgba(120, 120, 120, 0.75)',
    ['==', ['%', ['get', 'dongIndex'], 8], 4], 'rgba(140, 140, 140, 0.75)',
    ['==', ['%', ['get', 'dongIndex'], 8], 5], 'rgba(160, 160, 160, 0.75)',
    ['==', ['%', ['get', 'dongIndex'], 8], 6], 'rgba(110, 110, 110, 0.75)',
    ['==', ['%', ['get', 'dongIndex'], 8], 7], 'rgba(130, 130, 130, 0.75)',
    'rgba(100, 100, 100, 0.75)'
  ]
}

/**
 * 동별 3D 색상 표현 - 테마별로 다른 색상 반환
 */
export function getDong3DColorExpression(theme?: string) {
  switch(theme) {
    // 파란색 계열 (기본)
    case 'blue':
      return getDong3DColorExpressionBlue()
    
    // 초록색 계열
    case 'green':
      return getDong3DColorExpressionGreen()
    
    // 보라색 계열
    case 'purple':
      return getDong3DColorExpressionPurple()
    
    // 주황색 계열
    case 'orange':
      return getDong3DColorExpressionOrange()
    
    // 모노크롬 계열 (회색)
    case 'mono':
    case 'monochrome':
      return getDong3DColorExpressionMono()
    
    // 기본값은 파란색
    default:
      return getDong3DColorExpressionBlue()
  }
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

/**
 * 매출 기반 동 높이 계산 (절대 스케일)
 * @param sales 매출액
 * @param scale 스케일 조정값 (기본값: 1천만원 = 1 단위)
 * @returns 절대적 매출 차이를 반영한 높이
 */
export function getDongHeightBySales(sales: number, scale: number = 10000000): number {
  // 매출이 없는 경우 최소 높이
  if (sales <= 0) {
    return 10 // 최소 높이로 바닥에 붙어있게
  }
  
  // 매출액을 높이로 변환
  // scale 파라미터로 조정 가능
  // 기본값: 1천만원 = 1 단위 높이
  // scale = 5000000 이면 5백만원 = 1 단위 (높이 2배)
  // scale = 20000000 이면 2천만원 = 1 단위 (높이 0.5배)
  const height = sales / scale
  
  // 최소 높이 보장 (너무 낮은 매출도 약간은 보이도록)
  return Math.max(height, 10)
}