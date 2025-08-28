import { COLOR_THEMES, DISTRICT_FILL_COLORS, getDistrictColor } from './districtColorThemes'

// 현재 활성 테마 (기본값: bloomberg - 세련된 모노크롬)
let currentTheme = COLOR_THEMES.bloomberg

// 자치구별 개별 색상 사용 여부 (true: 각 자치구 다른 색상, false: 모노크롬)
let useIndividualDistrictColors = true

// 테마 설정 함수
export function setDistrictTheme(themeName: keyof typeof COLOR_THEMES) {
  console.log('[setDistrictTheme] Changing theme from', currentTheme?.name, 'to', themeName)
  currentTheme = COLOR_THEMES[themeName] || COLOR_THEMES.bloomberg
  console.log('[setDistrictTheme] New theme:', currentTheme)
  console.log('[setDistrictTheme] Theme fillBase:', currentTheme?.sgg?.fillBase)
  console.log('[setDistrictTheme] Theme lineColor:', currentTheme?.sgg?.lineColor)
  
  // 테마 변경 시 동적으로 색상 업데이트
  if (typeof window !== 'undefined') {
    console.log('[setDistrictTheme] Dispatching themeChanged event')
    updateMapTheme()
  }
}

// 현재 테마 가져오기
export function getCurrentTheme() {
  return currentTheme
}

// 사용 가능한 테마 목록
export function getAvailableThemes() {
  return Object.keys(COLOR_THEMES) as (keyof typeof COLOR_THEMES)[]
}

// 개별 자치구 색상 사용 여부 설정
export function setUseIndividualDistrictColors(useIndividual: boolean) {
  console.log('[setUseIndividualDistrictColors] Setting to', useIndividual)
  useIndividualDistrictColors = useIndividual
  updateMapTheme()
}

// 개별 자치구 색상 사용 여부 가져오기
export function getUseIndividualDistrictColors() {
  return useIndividualDistrictColors
}

// 맵 테마 동적 업데이트 (내부 함수)
function updateMapTheme() {
  // 이 함수는 HexagonLayer3D에서 호출되어 실제 맵 레이어를 업데이트합니다
  const event = new CustomEvent('themeChanged', { detail: currentTheme })
  window.dispatchEvent(event)
}

// Dynamic function to get current theme district colors
export function getDistrictColors() {
  return {
  sgg: {
    fill: currentTheme?.sgg?.fillBase || 'rgba(26, 17, 0, 0.4)',  // 테마 기반 채움색
    line: currentTheme?.sgg?.lineColor || 'rgba(251, 139, 30, 0.5)',  // 테마 기반 경계선
    fillOpacity: 0.6,  // 모노크롬에 맞게 조정
    lineWidth: currentTheme?.sgg?.lineWidth || 1.2,  // 얇은 선
    glowLine: currentTheme?.sgg?.glowColor || 'rgba(251, 139, 30, 0.2)',  // 테마 기반 글로우
    shadowLine: 'rgba(0, 0, 0, 0.3)'  // 은은한 그림자
  },
  dong: {
    fill: currentTheme?.dong?.fillBase || 'rgba(26, 17, 0, 0.2)',  // 테마 기반 채움색
    line: 'rgba(255, 255, 255, 0.6)',  // 흰색 경계선으로 3D에서 경계 강조
    fillOpacity: 0.3,  // 모노크롬에 맞게 조정
    lineWidth: 1.2,  // 더 두꺼운 선으로 가시성 향상
    glowLine: 'rgba(255, 255, 255, 0.3)',  // 흰색 글로우
  },
  jib: {
    line: 'rgba(255, 200, 100, 0.2)',  // 금색 테두리
    lineWidth: 0.5
  },
  selected: {
    fill: currentTheme?.selected?.fill || 'rgba(0, 104, 255, 0.3)',  // Bloomberg 블루
    fillSolid: currentTheme?.selected?.fill || 'rgba(0, 104, 255, 0.3)',
    line: currentTheme?.selected?.line || 'rgba(0, 104, 255, 0.9)',
    fillOpacity: 0.3,
    lineWidth: 1.5,  // 얇게
    glowColor: currentTheme?.selected?.glow || 'rgba(0, 104, 255, 0.4)',
    shadowColor: 'rgba(0, 0, 0, 0.3)'
  },
  seoul: {
    fill: 'transparent',
    line: 'rgba(100, 255, 255, 0.8)',  // 네온 시안 테두리
    lineWidth: 3.0,
    lineDasharray: [0, 0],
    fillOpacity: 0,
    glowLine: 'rgba(0, 255, 255, 0.4)',  // 글로우 효과
  },
  hover: {
    fill: currentTheme?.hover?.fill || 'rgba(74, 246, 195, 0.2)',  // Bloomberg 시안
    line: currentTheme?.hover?.line || 'rgba(74, 246, 195, 0.8)',
    fillOpacity: 0.2,
    lineWidth: 1.2,  // 얇게
    glowLine: currentTheme?.hover?.glow || 'rgba(74, 246, 195, 0.3)'
  }
  }
}

// For backwards compatibility - but this will be static
export const DISTRICT_COLORS = getDistrictColors()

// 자치구별 개별 색상 표현식
function createDistrictColorExpression() {
  // 모노크롬 모드일 때는 단일 색상 반환
  if (!useIndividualDistrictColors) {
    return currentTheme?.sgg?.fillBase || 'rgba(26, 17, 0, 0.4)'
  }
  
  // 현재 테마의 districtPalette 사용
  const palette = (currentTheme as any)?.districtPalette
  
  console.log('[createDistrictColorExpression] Current theme:', currentTheme?.name)
  console.log('[createDistrictColorExpression] District palette:', palette)
  
  // 테마에 districtPalette가 없으면 기본값 사용
  if (!palette) {
    console.log('[createDistrictColorExpression] No palette found, using fallback')
    return currentTheme?.sgg?.fillBase || 'rgba(26, 17, 0, 0.4)'
  }
  
  // Mapbox match 표현식으로 자치구별 다른 색상 적용 (테마 기반)
  return [
    'match',
    ['get', 'SIGUNGU_NM'],  // 자치구 이름 속성
    '강남구', palette['강남구'],
    '서초구', palette['서초구'],
    '송파구', palette['송파구'],
    '강동구', palette['강동구'],
    '광진구', palette['광진구'],
    '성동구', palette['성동구'],
    '중랑구', palette['중랑구'],
    '종로구', palette['종로구'],
    '중구', palette['중구'],
    '용산구', palette['용산구'],
    '성북구', palette['성북구'],
    '강북구', palette['강북구'],
    '도봉구', palette['도봉구'],
    '노원구', palette['노원구'],
    '강서구', palette['강서구'],
    '양천구', palette['양천구'],
    '구로구', palette['구로구'],
    '금천구', palette['금천구'],
    '영등포구', palette['영등포구'],
    '동작구', palette['동작구'],
    '관악구', palette['관악구'],
    '마포구', palette['마포구'],
    '서대문구', palette['서대문구'],
    '은평구', palette['은평구'],
    // 기본값 (테마 기반)
    currentTheme?.sgg?.fillBase || 'rgba(26, 17, 0, 0.4)'
  ]
}

// 자치구별 개별 글로우 표현식
function createDistrictGlowExpression() {
  // 모노크롬 모드일 때는 단일 글로우 색상 반환
  if (!useIndividualDistrictColors) {
    return currentTheme?.sgg?.glowColor || 'rgba(251, 139, 30, 0.2)'
  }
  
  // 현재 테마의 districtPalette 사용하여 글로우 생성
  const palette = (currentTheme as any)?.districtPalette
  
  // 테마에 districtPalette가 없으면 기본값 사용
  if (!palette) {
    return currentTheme?.sgg?.glowColor || 'rgba(251, 139, 30, 0.2)'
  }
  
  // 색상 팔레트에서 글로우 색상 생성 (opacity 조정)
  const createGlowFromColor = (color: string) => {
    // rgba에서 opacity를 0.3으로 조정
    return color.replace(/[\d.]+\)$/, '0.3)')
  }
  
  // Mapbox match 표현식으로 자치구별 다른 글로우 색상 적용
  return [
    'match',
    ['get', 'SIGUNGU_NM'],
    '강남구', createGlowFromColor(palette['강남구']),
    '서초구', createGlowFromColor(palette['서초구']),
    '송파구', createGlowFromColor(palette['송파구']),
    '강동구', createGlowFromColor(palette['강동구']),
    '광진구', createGlowFromColor(palette['광진구']),
    '성동구', createGlowFromColor(palette['성동구']),
    '중랑구', createGlowFromColor(palette['중랑구']),
    '종로구', createGlowFromColor(palette['종로구']),
    '중구', createGlowFromColor(palette['중구']),
    '용산구', createGlowFromColor(palette['용산구']),
    '성북구', createGlowFromColor(palette['성북구']),
    '강북구', createGlowFromColor(palette['강북구']),
    '도봉구', createGlowFromColor(palette['도봉구']),
    '노원구', createGlowFromColor(palette['노원구']),
    '강서구', createGlowFromColor(palette['강서구']),
    '양천구', createGlowFromColor(palette['양천구']),
    '구로구', createGlowFromColor(palette['구로구']),
    '금천구', createGlowFromColor(palette['금천구']),
    '영등포구', createGlowFromColor(palette['영등포구']),
    '동작구', createGlowFromColor(palette['동작구']),
    '관악구', createGlowFromColor(palette['관악구']),
    '마포구', createGlowFromColor(palette['마포구']),
    '서대문구', createGlowFromColor(palette['서대문구']),
    '은평구', createGlowFromColor(palette['은평구']),
    // 기본값
    currentTheme?.sgg?.glowColor || 'rgba(251, 139, 30, 0.2)'
  ]
}

// Dynamic function to get current theme colors
export function getDistrictLayerPaint() {
  return {
  sggFill: {
    'fill-color': createDistrictColorExpression(),  // 모노크롬 테마 색상
    'fill-opacity': [
      'interpolate',
      ['linear'],
      ['zoom'],
      8, 0.4,    // Bloomberg 스타일에 맞게 조정
      11, 0.5,   // 중간 줌
      14, 0.6    // 줌 인 시
    ],
    'fill-opacity-transition': { duration: 300 }
  },
  sggLine: {
    'line-color': (() => {
      // 모노크롬 모드일 때는 단일 라인 색상 반환
      if (!useIndividualDistrictColors) {
        return currentTheme?.sgg?.lineColor || 'rgba(251, 139, 30, 0.5)'
      }
      
      // 현재 테마의 districtPalette 사용
      const palette = (currentTheme as any)?.districtPalette
      
      // 테마에 districtPalette가 없으면 기본값 사용
      if (!palette) {
        return currentTheme?.sgg?.lineColor || 'rgba(251, 139, 30, 0.5)'
      }
      
      // 색상 팔레트에서 라인 색상 생성 (opacity를 0.8로 조정)
      const createLineFromColor = (color: string) => {
        return color.replace(/[\d.]+\)$/, '0.8)')
      }
      
      return [
        'match',
        ['get', 'SIGUNGU_NM'],
        '강남구', createLineFromColor(palette['강남구']),
        '서초구', createLineFromColor(palette['서초구']),
        '송파구', createLineFromColor(palette['송파구']),
        '강동구', createLineFromColor(palette['강동구']),
        '광진구', createLineFromColor(palette['광진구']),
        '성동구', createLineFromColor(palette['성동구']),
        '중랑구', createLineFromColor(palette['중랑구']),
        '종로구', createLineFromColor(palette['종로구']),
        '중구', createLineFromColor(palette['중구']),
        '용산구', createLineFromColor(palette['용산구']),
        '성북구', createLineFromColor(palette['성북구']),
        '강북구', createLineFromColor(palette['강북구']),
        '도봉구', createLineFromColor(palette['도봉구']),
        '노원구', createLineFromColor(palette['노원구']),
        '강서구', createLineFromColor(palette['강서구']),
        '양천구', createLineFromColor(palette['양천구']),
        '구로구', createLineFromColor(palette['구로구']),
        '금천구', createLineFromColor(palette['금천구']),
        '영등포구', createLineFromColor(palette['영등포구']),
        '동작구', createLineFromColor(palette['동작구']),
        '관악구', createLineFromColor(palette['관악구']),
        '마포구', createLineFromColor(palette['마포구']),
        '서대문구', createLineFromColor(palette['서대문구']),
        '은평구', createLineFromColor(palette['은평구']),
        // 기본값
        currentTheme?.sgg?.lineColor || 'rgba(251, 139, 30, 0.5)'
      ]
    })(),
    'line-width': [
      'interpolate',
      ['linear'],
      ['zoom'],
      8, 0.8,    // 매우 얇은 선
      11, 1.0,   // 중간
      14, 1.2    // 줌 인 시도 얇게
    ],
    'line-blur': 0.3,  // 은은한 블러
    'line-opacity': 0.7  // 약간 투명하게
  },
  dongFill: {
    'fill-color': currentTheme?.dong?.fillBase || 'rgba(26, 17, 0, 0.2)',  // 모노크롬 테마

    'fill-opacity': [
      'interpolate',
      ['linear'],
      ['zoom'],
      10, 0.2,   // Bloomberg 스타일에 맞게
      12, 0.25,
      14, 0.3
    ],
    'fill-opacity-transition': { duration: 300 }
  },
  dongLine: {
    'line-color': 'rgba(255, 255, 255, 0.0)',  // 투명한 경계선
    'line-width': 0,
    'line-blur': 0,
    'line-opacity': 0  // 완전히 투명
  },
  jibLine: {
    'line-color': 'rgba(255, 200, 100, 0.2)',
    'line-width': 0.5,
    'line-blur': 0.2
  },
  selectedFill: {
    'fill-color': currentTheme?.selected?.fill || 'rgba(0, 104, 255, 0.3)',
    'fill-opacity': [
      'interpolate',
      ['linear'],
      ['zoom'],
      8, 0.25,   // 더 연하게
      12, 0.3,
      16, 0.35
    ],
    'fill-opacity-transition': { 
      duration: 300,  // 빠른 트랜지션
      delay: 0
    }
  },
  selectedFillAnimated: {
    'fill-color': [
      'interpolate',
      ['linear'],
      ['zoom'],
      8, '#667eea',
      12, '#7c3aed',
      16, '#764ba2'
    ],
    'fill-opacity': [
      'interpolate',
      ['linear'],
      ['zoom'],
      8, 0.4,
      12, 0.5,
      16, 0.6
    ],
    'fill-opacity-transition': { 
      duration: 800,
      delay: 0
    }
  },
  selectedLine: (dashPhase: number) => ({
    'line-color': currentTheme?.selected?.line || 'rgba(0, 104, 255, 0.9)',
    'line-width': [
      'interpolate',
      ['linear'],
      ['zoom'],
      8, 1.0,    // 얇은 선
      12, 1.2,
      16, 1.5
    ],
    'line-blur': 0.3,  // 은은한 블러
    'line-dasharray': [2, 0],  // Solid line for selected
    'line-opacity-transition': { 
      duration: 300
    }
  }),
  selectedLineAnimated: {
    'line-color': [
      'interpolate',
      ['linear'],
      ['zoom'],
      8, '#a78bfa',
      12, '#c084fc',
      16, '#e9d5ff'
    ],
    'line-width': 3,
    'line-blur': 2,
    'line-opacity': 0.8,
    'line-opacity-transition': { 
      duration: 800
    }
  },
  seoulBoundaryLine: {
    'line-color': 'rgba(100, 255, 255, 0.8)',
    'line-width': [
      'interpolate',
      ['linear'],
      ['zoom'],
      8, 1.0,    // 얇은 선
      12, 1.2,
      16, 1.5
    ],
    'line-blur': 0.3,
    'line-opacity': 0.6  // 더 투명하게
  },
  hoverFill: {
    'fill-color': currentTheme?.hover?.fill || 'rgba(74, 246, 195, 0.2)',  // Bloomberg 시안
    'fill-opacity': 0.2,
    'fill-opacity-transition': { duration: 200 }
  },
  hoverLine: {
    'line-color': currentTheme?.hover?.line || 'rgba(74, 246, 195, 0.8)',  // Bloomberg 시안
    'line-width': 1.5,  // 얇은 선
    'line-blur': 0.5,   // 은은한 블러
    'line-opacity': 0.8
  }
  }
}

// Removed static DISTRICT_LAYER_PAINT - use getDistrictLayerPaint() directly for dynamic theming

export const DISTRICT_DATA_URLS = {
  sgg: '/data/eda/gu.geojson',
  dong: '/data/local_economy/local_economy_dong.geojson',
  jib: '/data/eda/ct.geojson'
}

export async function loadDistrictData(type: 'sgg' | 'dong' | 'jib') {
  try {
    const response = await fetch(DISTRICT_DATA_URLS[type])
    if (!response.ok) {
      throw new Error(`Failed to load ${type} data`)
    }
    return await response.json()
  } catch (error) {
    console.error(`Error loading ${type} data:`, error)
    return null
  }
}