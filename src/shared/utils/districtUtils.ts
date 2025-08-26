export const DISTRICT_COLORS = {
  sgg: {
    fill: 'rgba(100, 120, 255, 0.08)',  // 더 세련된 파란색 반투명
    line: 'rgba(100, 200, 255, 0.5)',  // 네온 파란색 테두리
    fillOpacity: 0.08,
    lineWidth: 1.5,
    glowLine: 'rgba(0, 255, 255, 0.3)',  // 시안 글로우
    shadowLine: 'rgba(0, 0, 0, 0.4)'  // 그림자 효과
  },
  dong: {
    fill: 'rgba(160, 100, 255, 0.06)',  // 보라색 반투명
    line: 'rgba(180, 150, 255, 0.35)',  // 연한 보라색 테두리
    fillOpacity: 0.06,
    lineWidth: 1.0,
    glowLine: 'rgba(200, 100, 255, 0.2)',  // 보라색 글로우
  },
  jib: {
    line: 'rgba(255, 200, 100, 0.2)',  // 금색 테두리
    lineWidth: 0.5
  },
  selected: {
    fill: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',  // Modern gradient
    fillSolid: '#667eea',  // Solid fallback for Mapbox
    line: '#00ffff',  // 네온 시안 테두리
    fillOpacity: 0.5,
    lineWidth: 4.0,  // 두껍게
    glowColor: 'rgba(0, 255, 255, 0.6)',  // 강한 글로우
    shadowColor: 'rgba(0, 0, 0, 0.5)'
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
    fill: 'rgba(0, 255, 255, 0.12)',  // 네온 호버 효과
    line: 'rgba(0, 255, 255, 0.8)',
    fillOpacity: 0.12,
    lineWidth: 2.5,
    glowLine: 'rgba(0, 255, 255, 0.5)'
  }
}

export const DISTRICT_LAYER_PAINT = {
  sggFill: {
    'fill-color': DISTRICT_COLORS.sgg.fill,
    'fill-opacity': DISTRICT_COLORS.sgg.fillOpacity,  // Use defined opacity
    'fill-opacity-transition': { duration: 300 }
  },
  sggLine: {
    'line-color': DISTRICT_COLORS.sgg.line,
    'line-width': DISTRICT_COLORS.sgg.lineWidth,
    'line-blur': 0.5
  },
  dongFill: {
    'fill-color': DISTRICT_COLORS.dong.fill,
    'fill-opacity': DISTRICT_COLORS.dong.fillOpacity,
    'fill-opacity-transition': { duration: 300 }
  },
  dongLine: {
    'line-color': DISTRICT_COLORS.dong.line,
    'line-width': DISTRICT_COLORS.dong.lineWidth,
    'line-blur': 0.3
  },
  jibLine: {
    'line-color': DISTRICT_COLORS.jib.line,
    'line-width': DISTRICT_COLORS.jib.lineWidth,
    'line-blur': 0.2
  },
  selectedFill: {
    'fill-color': DISTRICT_COLORS.selected.fillSolid,
    'fill-opacity': [
      'interpolate',
      ['linear'],
      ['zoom'],
      8, 0.35,
      12, 0.45,
      16, 0.55
    ],
    'fill-opacity-transition': { 
      duration: 800,
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
    'line-color': DISTRICT_COLORS.selected.line,
    'line-width': [
      'interpolate',
      ['linear'],
      ['zoom'],
      8, 2.0,
      12, 2.5,
      16, 3.0
    ],
    'line-blur': 1.0,
    'line-dasharray': [2, 0],  // Solid line for selected
    'line-opacity-transition': { 
      duration: 500
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
    'line-color': DISTRICT_COLORS.seoul.line,
    'line-width': [
      'interpolate',
      ['linear'],
      ['zoom'],
      8, 1.5,
      12, 2.0,
      16, 2.5
    ],
    'line-blur': 0.5,
    'line-opacity': 0.8
  },
  hoverFill: {
    'fill-color': DISTRICT_COLORS.hover.fill,
    'fill-opacity': DISTRICT_COLORS.hover.fillOpacity,
    'fill-opacity-transition': { duration: 200 }
  },
  hoverLine: {
    'line-color': DISTRICT_COLORS.hover.line,
    'line-width': DISTRICT_COLORS.hover.lineWidth,
    'line-blur': 0.5
  }
}

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