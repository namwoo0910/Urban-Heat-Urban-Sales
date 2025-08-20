export const DISTRICT_COLORS = {
  sgg: {
    fill: '#4dabf7',
    line: '#74c0fc',
    fillOpacity: 0.25,
    lineWidth: 1.5
  },
  dong: {
    fill: '#51cf66',
    line: '#8ce99a',
    fillOpacity: 0.25,
    lineWidth: 1.2
  },
  jib: {
    line: '#f783ac',
    lineWidth: 0.8
  },
  selected: {
    fill: '#748ffc',
    line: '#91a7ff',
    fillOpacity: 0.35,
    lineWidth: 2.5
  }
}

export const DISTRICT_LAYER_PAINT = {
  sggFill: {
    'fill-color': DISTRICT_COLORS.sgg.fill,
    'fill-opacity': DISTRICT_COLORS.sgg.fillOpacity
  },
  sggLine: {
    'line-color': DISTRICT_COLORS.sgg.line,
    'line-width': DISTRICT_COLORS.sgg.lineWidth
  },
  dongFill: {
    'fill-color': DISTRICT_COLORS.dong.fill,
    'fill-opacity': DISTRICT_COLORS.dong.fillOpacity
  },
  dongLine: {
    'line-color': DISTRICT_COLORS.dong.line,
    'line-width': DISTRICT_COLORS.dong.lineWidth
  },
  jibLine: {
    'line-color': DISTRICT_COLORS.jib.line,
    'line-width': DISTRICT_COLORS.jib.lineWidth
  },
  selectedFill: {
    'fill-color': DISTRICT_COLORS.selected.fill,
    'fill-opacity': DISTRICT_COLORS.selected.fillOpacity
  },
  selectedLine: (dashPhase: number) => ({
    'line-color': DISTRICT_COLORS.selected.line,
    'line-width': DISTRICT_COLORS.selected.lineWidth,
    'line-dasharray': [8, dashPhase % 10 + 10, 8, Math.max(0.01, 10 - dashPhase % 10)]
  })
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