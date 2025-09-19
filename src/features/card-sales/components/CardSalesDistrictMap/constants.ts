/**
 * Constants for CardSalesDistrictMap
 * 
 * Centralized constants for map configuration, view states, and animation settings.
 */


// Default Seoul view configuration
export const DEFAULT_SEOUL_VIEW = {
  longitude: 126.978,
  latitude: 37.5765,
  zoom: 10.8,
  pitch: 0,
  bearing: 0,
  minZoom: 9,
  maxZoom: 18,
  minPitch: 0,
  maxPitch: 0
}



// Animation configuration
export const ANIMATION_CONFIG = {
  ROTATION_SPEED: 0.5,
  TRANSITION_DURATION: 1500,
  TRANSITION_SPEED: 1.2,
  HOVER_DEBOUNCE: 50,
  CLICK_DEBOUNCE: 100
}

// Layer IDs
export const LAYER_IDS = {
  DISTRICT_LABELS: 'district-labels',
  DONG_LABELS: 'dong-labels',
  SEOUL_BOUNDARY: 'seoul-boundary',
  MESH: 'seoul-mesh'
}

// Theme configuration
export const THEME_KEYS = [
  'blue',
  'green', 
  'purple',
  'orange',
  'bright',
  'modern',
  'adjacent'
]

// Sales data thresholds
export const SALES_THRESHOLDS = {
  STEP: 125000000, // 1.25억
  MAX_COLOR_INDEX: 39,
  HEIGHT_SCALE: 0.00001,
  MAX_HEIGHT: 1000
}