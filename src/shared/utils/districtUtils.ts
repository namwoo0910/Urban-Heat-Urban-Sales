export const DISTRICT_COLORS = {
  sgg: {
    fill: 'rgba(147, 197, 253, 0.15)',  // More visible fill for interaction
    line: 'rgba(147, 197, 253, 0.4)',  // Subtle blue outline
    fillOpacity: 0.15,  // More visible but still subtle
    lineWidth: 1.2
  },
  dong: {
    fill: 'rgba(134, 239, 172, 0.1)',  // More visible green fill
    line: 'rgba(134, 239, 172, 0.3)',  // Subtle green outline
    fillOpacity: 0.1,  // More visible
    lineWidth: 0.8
  },
  jib: {
    line: 'rgba(252, 165, 165, 0.25)',  // Very subtle pink
    lineWidth: 0.5
  },
  selected: {
    fill: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',  // Modern gradient
    fillSolid: '#667eea',  // Solid fallback for Mapbox
    line: '#a78bfa',  // Purple outline
    fillOpacity: 0.7,  // Much more visible
    lineWidth: 3.0,  // Thicker outline
    glowColor: 'rgba(139, 92, 246, 0.4)',  // Glow effect
    shadowColor: 'rgba(0, 0, 0, 0.2)'
  },
  seoul: {
    fill: 'transparent',  // No fill, only boundary
    line: 'rgba(255, 255, 255, 0.6)',  // White outline for Seoul boundary
    lineWidth: 2.0,
    lineDasharray: [0, 0],  // Solid line
    fillOpacity: 0
  },
  hover: {
    fill: 'rgba(139, 92, 246, 0.15)',  // Subtle hover fill
    line: 'rgba(139, 92, 246, 0.6)',
    fillOpacity: 0.15,
    lineWidth: 2.0
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
  dong: '/data/eda/dong.geojson',
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