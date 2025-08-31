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
 * 선택된 자치구용 3D 색상 팔레트 (진한 파란색 계열)
 */
export function get3DColorExpressionDark() {
  // 선택된 구를 위한 더 진한 블루 그라데이션
  return [
    'interpolate',
    ['linear'],
    ['get', 'height'],
    0,   'rgba(5, 12, 25, 0.98)',      // 매우 진한 남색
    160, 'rgba(10, 20, 35, 0.98)',     // 더 진한 남색
    200, 'rgba(15, 27, 45, 0.98)',     // 진한 남색
    240, 'rgba(20, 35, 55, 0.98)',    
    280, 'rgba(25, 42, 65, 0.98)',    
    320, 'rgba(30, 50, 75, 0.98)',   
    360, 'rgba(35, 57, 85, 0.98)',   
    400, 'rgba(40, 65, 95, 0.98)',   
    440, 'rgba(45, 72, 105, 0.98)',   
    480, 'rgba(50, 80, 112, 0.98)',  
    520, 'rgba(55, 85, 117, 0.98)',  
    560, 'rgba(60, 90, 122, 0.98)',  
    600, 'rgba(65, 95, 125, 0.98)',  
    640, 'rgba(70, 100, 127, 0.98)',  
    700, 'rgba(75, 105, 127, 0.98)'    // 더 진한 하늘색
  ]
}

/**
 * 선택된 자치구용 3D 색상 팔레트 (강렬한 네온 색상)
 */
export function get3DColorExpressionBright() {
  // 선택된 구를 위한 쿨톤 얼음/크리스탈 그라데이션
  return [
    'interpolate',
    ['linear'],
    ['get', 'height'],
    0,   'rgba(0, 150, 255, 1.0)',        // 딥 스카이 블루
    160, 'rgba(0, 180, 255, 1.0)',       // 브라이트 블루
    200, 'rgba(50, 200, 255, 1.0)',      // 아이스 블루
    240, 'rgba(100, 220, 255, 1.0)',     // 라이트 시안
    280, 'rgba(150, 240, 255, 1.0)',     // 페일 시안
    320, 'rgba(200, 255, 255, 1.0)',     // 아이스 화이트
    360, 'rgba(180, 255, 230, 1.0)',     // 민트 아이스
    400, 'rgba(160, 255, 200, 1.0)',     // 글레이셔 그린
    440, 'rgba(140, 255, 170, 1.0)',     // 프로즌 민트
    480, 'rgba(120, 255, 140, 1.0)',     // 크리스탈 그린
    520, 'rgba(100, 255, 120, 1.0)',     // 얼음 그린
    560, 'rgba(80, 240, 150, 1.0)',      // 글래셜 터콰이즈
    600, 'rgba(60, 220, 180, 1.0)',      // 딥 터콰이즈
    640, 'rgba(40, 200, 200, 1.0)',      // 오션 시안
    700, 'rgba(20, 180, 220, 1.0)'       // 딥 아쿠아
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
 * 선택된 구의 동별 3D 색상 - 진한 파란색 테마
 */
function getDong3DColorExpressionBlueDark() {
  return [
    'case',
    ['==', ['%', ['get', 'dongIndex'], 8], 0], 'rgba(20, 30, 60, 0.9)',
    ['==', ['%', ['get', 'dongIndex'], 8], 1], 'rgba(30, 40, 70, 0.9)',
    ['==', ['%', ['get', 'dongIndex'], 8], 2], 'rgba(40, 50, 80, 0.9)',
    ['==', ['%', ['get', 'dongIndex'], 8], 3], 'rgba(50, 60, 90, 0.9)',
    ['==', ['%', ['get', 'dongIndex'], 8], 4], 'rgba(60, 70, 100, 0.9)',
    ['==', ['%', ['get', 'dongIndex'], 8], 5], 'rgba(45, 55, 85, 0.9)',
    ['==', ['%', ['get', 'dongIndex'], 8], 6], 'rgba(35, 45, 75, 0.9)',
    ['==', ['%', ['get', 'dongIndex'], 8], 7], 'rgba(55, 65, 95, 0.9)',
    'rgba(40, 50, 80, 0.9)'
  ]
}

/**
 * 선택된 구의 동별 3D 색상 - 진한 초록색 테마
 */
function getDong3DColorExpressionGreenDark() {
  return [
    'case',
    ['==', ['%', ['get', 'dongIndex'], 8], 0], 'rgba(20, 40, 20, 0.9)',
    ['==', ['%', ['get', 'dongIndex'], 8], 1], 'rgba(25, 50, 25, 0.9)',
    ['==', ['%', ['get', 'dongIndex'], 8], 2], 'rgba(30, 60, 30, 0.9)',
    ['==', ['%', ['get', 'dongIndex'], 8], 3], 'rgba(35, 70, 35, 0.9)',
    ['==', ['%', ['get', 'dongIndex'], 8], 4], 'rgba(40, 80, 40, 0.9)',
    ['==', ['%', ['get', 'dongIndex'], 8], 5], 'rgba(45, 90, 45, 0.9)',
    ['==', ['%', ['get', 'dongIndex'], 8], 6], 'rgba(33, 65, 33, 0.9)',
    ['==', ['%', ['get', 'dongIndex'], 8], 7], 'rgba(38, 75, 38, 0.9)',
    'rgba(35, 70, 35, 0.9)'
  ]
}

/**
 * 선택된 구의 동별 3D 색상 - 진한 보라색 테마
 */
function getDong3DColorExpressionPurpleDark() {
  return [
    'case',
    ['==', ['%', ['get', 'dongIndex'], 8], 0], 'rgba(44, 25, 76, 0.9)',
    ['==', ['%', ['get', 'dongIndex'], 8], 1], 'rgba(55, 32, 85, 0.9)',
    ['==', ['%', ['get', 'dongIndex'], 8], 2], 'rgba(66, 38, 93, 0.9)',
    ['==', ['%', ['get', 'dongIndex'], 8], 3], 'rgba(77, 45, 102, 0.9)',
    ['==', ['%', ['get', 'dongIndex'], 8], 4], 'rgba(88, 51, 110, 0.9)',
    ['==', ['%', ['get', 'dongIndex'], 8], 5], 'rgba(99, 58, 119, 0.9)',
    ['==', ['%', ['get', 'dongIndex'], 8], 6], 'rgba(60, 35, 89, 0.9)',
    ['==', ['%', ['get', 'dongIndex'], 8], 7], 'rgba(82, 48, 106, 0.9)',
    'rgba(66, 38, 93, 0.9)'
  ]
}

/**
 * 선택된 구의 동별 3D 색상 - 진한 주황색 테마
 */
function getDong3DColorExpressionOrangeDark() {
  return [
    'case',
    ['==', ['%', ['get', 'dongIndex'], 8], 0], 'rgba(90, 50, 20, 0.9)',
    ['==', ['%', ['get', 'dongIndex'], 8], 1], 'rgba(100, 60, 25, 0.9)',
    ['==', ['%', ['get', 'dongIndex'], 8], 2], 'rgba(110, 70, 30, 0.9)',
    ['==', ['%', ['get', 'dongIndex'], 8], 3], 'rgba(120, 80, 35, 0.9)',
    ['==', ['%', ['get', 'dongIndex'], 8], 4], 'rgba(125, 90, 40, 0.9)',
    ['==', ['%', ['get', 'dongIndex'], 8], 5], 'rgba(115, 75, 32, 0.9)',
    ['==', ['%', ['get', 'dongIndex'], 8], 6], 'rgba(105, 65, 27, 0.9)',
    ['==', ['%', ['get', 'dongIndex'], 8], 7], 'rgba(122, 85, 37, 0.9)',
    'rgba(110, 70, 30, 0.9)'
  ]
}

/**
 * 선택된 구의 동별 3D 색상 - 진한 모노크롬 테마
 */
function getDong3DColorExpressionMonoDark() {
  return [
    'case',
    ['==', ['%', ['get', 'dongIndex'], 8], 0], 'rgba(20, 20, 20, 0.9)',
    ['==', ['%', ['get', 'dongIndex'], 8], 1], 'rgba(30, 30, 30, 0.9)',
    ['==', ['%', ['get', 'dongIndex'], 8], 2], 'rgba(40, 40, 40, 0.9)',
    ['==', ['%', ['get', 'dongIndex'], 8], 3], 'rgba(50, 50, 50, 0.9)',
    ['==', ['%', ['get', 'dongIndex'], 8], 4], 'rgba(60, 60, 60, 0.9)',
    ['==', ['%', ['get', 'dongIndex'], 8], 5], 'rgba(70, 70, 70, 0.9)',
    ['==', ['%', ['get', 'dongIndex'], 8], 6], 'rgba(45, 45, 45, 0.9)',
    ['==', ['%', ['get', 'dongIndex'], 8], 7], 'rgba(55, 55, 55, 0.9)',
    'rgba(40, 40, 40, 0.9)'
  ]
}

/**
 * 선택된 구의 동별 3D 색상 표현 - 테마별로 진한 색상 반환
 */
export function getDong3DColorExpressionDark(theme?: string) {
  switch(theme) {
    case 'blue':
      return getDong3DColorExpressionBlueDark()
    case 'green':
      return getDong3DColorExpressionGreenDark()
    case 'purple':
      return getDong3DColorExpressionPurpleDark()
    case 'orange':
      return getDong3DColorExpressionOrangeDark()
    case 'mono':
    case 'monochrome':
      return getDong3DColorExpressionMonoDark()
    default:
      return getDong3DColorExpressionBlueDark()
  }
}

/**
 * 선택된 구의 동별 3D 색상 - 밝은 네온 파란색 테마
 */
function getDong3DColorExpressionBlueBright() {
  return [
    'case',
    ['==', ['%', ['get', 'dongIndex'], 8], 0], 'rgba(0, 200, 255, 0.95)',
    ['==', ['%', ['get', 'dongIndex'], 8], 1], 'rgba(0, 220, 255, 0.95)',
    ['==', ['%', ['get', 'dongIndex'], 8], 2], 'rgba(0, 240, 255, 0.95)',
    ['==', ['%', ['get', 'dongIndex'], 8], 3], 'rgba(0, 255, 255, 0.95)',
    ['==', ['%', ['get', 'dongIndex'], 8], 4], 'rgba(100, 255, 255, 0.95)',
    ['==', ['%', ['get', 'dongIndex'], 8], 5], 'rgba(150, 255, 255, 0.95)',
    ['==', ['%', ['get', 'dongIndex'], 8], 6], 'rgba(50, 230, 255, 0.95)',
    ['==', ['%', ['get', 'dongIndex'], 8], 7], 'rgba(120, 240, 255, 0.95)',
    'rgba(0, 255, 255, 0.95)'
  ]
}

/**
 * 선택된 구의 동별 3D 색상 - 밝은 네온 초록색 테마
 */
function getDong3DColorExpressionGreenBright() {
  return [
    'case',
    ['==', ['%', ['get', 'dongIndex'], 8], 0], 'rgba(0, 255, 100, 0.95)',
    ['==', ['%', ['get', 'dongIndex'], 8], 1], 'rgba(50, 255, 120, 0.95)',
    ['==', ['%', ['get', 'dongIndex'], 8], 2], 'rgba(100, 255, 140, 0.95)',
    ['==', ['%', ['get', 'dongIndex'], 8], 3], 'rgba(150, 255, 160, 0.95)',
    ['==', ['%', ['get', 'dongIndex'], 8], 4], 'rgba(200, 255, 180, 0.95)',
    ['==', ['%', ['get', 'dongIndex'], 8], 5], 'rgba(180, 255, 200, 0.95)',
    ['==', ['%', ['get', 'dongIndex'], 8], 6], 'rgba(120, 255, 150, 0.95)',
    ['==', ['%', ['get', 'dongIndex'], 8], 7], 'rgba(160, 255, 170, 0.95)',
    'rgba(100, 255, 150, 0.95)'
  ]
}

/**
 * 선택된 구의 동별 3D 색상 - 밝은 네온 보라색 테마
 */
function getDong3DColorExpressionPurpleBright() {
  return [
    'case',
    ['==', ['%', ['get', 'dongIndex'], 8], 0], 'rgba(255, 0, 255, 0.95)',
    ['==', ['%', ['get', 'dongIndex'], 8], 1], 'rgba(255, 50, 255, 0.95)',
    ['==', ['%', ['get', 'dongIndex'], 8], 2], 'rgba(255, 100, 255, 0.95)',
    ['==', ['%', ['get', 'dongIndex'], 8], 3], 'rgba(255, 150, 255, 0.95)',
    ['==', ['%', ['get', 'dongIndex'], 8], 4], 'rgba(255, 200, 255, 0.95)',
    ['==', ['%', ['get', 'dongIndex'], 8], 5], 'rgba(230, 150, 255, 0.95)',
    ['==', ['%', ['get', 'dongIndex'], 8], 6], 'rgba(240, 100, 255, 0.95)',
    ['==', ['%', ['get', 'dongIndex'], 8], 7], 'rgba(250, 180, 255, 0.95)',
    'rgba(255, 100, 255, 0.95)'
  ]
}

/**
 * 선택된 구의 동별 3D 색상 - 밝은 네온 주황색 테마
 */
function getDong3DColorExpressionOrangeBright() {
  return [
    'case',
    ['==', ['%', ['get', 'dongIndex'], 8], 0], 'rgba(0, 120, 255, 1.0)',    // 딥 스카이
    ['==', ['%', ['get', 'dongIndex'], 8], 1], 'rgba(20, 140, 255, 1.0)',   // 브라이트 블루
    ['==', ['%', ['get', 'dongIndex'], 8], 2], 'rgba(40, 160, 255, 1.0)',   // 아이스 블루
    ['==', ['%', ['get', 'dongIndex'], 8], 3], 'rgba(60, 180, 255, 1.0)',   // 라이트 블루
    ['==', ['%', ['get', 'dongIndex'], 8], 4], 'rgba(80, 200, 255, 1.0)',   // 페일 시안
    ['==', ['%', ['get', 'dongIndex'], 8], 5], 'rgba(100, 220, 255, 1.0)',  // 아이스 화이트
    ['==', ['%', ['get', 'dongIndex'], 8], 6], 'rgba(50, 190, 255, 1.0)',   // 글레이셔
    ['==', ['%', ['get', 'dongIndex'], 8], 7], 'rgba(70, 210, 255, 1.0)',   // 크리스탈
    'rgba(30, 150, 255, 1.0)'  // 기본 쿨 블루
  ]
}

/**
 * 선택된 구의 동별 3D 색상 - 밝은 흰색 테마
 */
function getDong3DColorExpressionMonoBright() {
  return [
    'case',
    ['==', ['%', ['get', 'dongIndex'], 8], 0], 'rgba(220, 220, 220, 0.95)',
    ['==', ['%', ['get', 'dongIndex'], 8], 1], 'rgba(230, 230, 230, 0.95)',
    ['==', ['%', ['get', 'dongIndex'], 8], 2], 'rgba(240, 240, 240, 0.95)',
    ['==', ['%', ['get', 'dongIndex'], 8], 3], 'rgba(250, 250, 250, 0.95)',
    ['==', ['%', ['get', 'dongIndex'], 8], 4], 'rgba(255, 255, 255, 0.95)',
    ['==', ['%', ['get', 'dongIndex'], 8], 5], 'rgba(245, 245, 245, 0.95)',
    ['==', ['%', ['get', 'dongIndex'], 8], 6], 'rgba(235, 235, 235, 0.95)',
    ['==', ['%', ['get', 'dongIndex'], 8], 7], 'rgba(248, 248, 248, 0.95)',
    'rgba(240, 240, 240, 0.95)'
  ]
}

/**
 * 선택된 구의 동별 3D 색상 표현 - 테마별로 밝은 네온 색상 반환
 */
export function getDong3DColorExpressionBright(theme?: string) {
  switch(theme) {
    case 'blue':
      return getDong3DColorExpressionBlueBright()
    case 'green':
      return getDong3DColorExpressionGreenBright()
    case 'purple':
      return getDong3DColorExpressionPurpleBright()
    case 'orange':
      return getDong3DColorExpressionOrangeBright()
    case 'mono':
    case 'monochrome':
      return getDong3DColorExpressionMonoBright()
    default:
      return getDong3DColorExpressionBlueBright()
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
 * @param scale 스케일 조정값 (기본값: 1억원 = 100 단위)
 * @returns 절대적 매출 차이를 반영한 높이
 */
export function getDongHeightBySales(sales: number, scale: number = 100000000): number {
  // 매출이 없는 경우 최소 높이
  if (sales <= 0) {
    return 10 // 최소 높이로 바닥에 붙어있게
  }
  
  // 매출액을 높이로 변환
  // 1억원 = 300 단위 높이로 매핑
  // scale = 100000000 (1억원) → height = 300
  // scale = 50000000 (5천만원) → height = 600 (더 민감한 스케일)
  // scale = 10000000 (1천만원) → height = 3000 (매우 민감한 스케일)
  const height = (sales / scale) * 300  // 배율 300 적용
  
  // 최소값만 제한, 최대값 제한 없음 (매출액에 비례하여 무제한 증가)
  return Math.max(10, height)
}