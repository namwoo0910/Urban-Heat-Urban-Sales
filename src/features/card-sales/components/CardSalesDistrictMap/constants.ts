/**
 * Constants for CardSalesDistrictMap
 * 
 * Centralized constants for map configuration, view states, and animation settings.
 */

import { LightingEffect, AmbientLight, DirectionalLight } from '@deck.gl/core'

// Default Seoul view configuration
export const DEFAULT_SEOUL_VIEW = {
  longitude: 126.978,
  latitude: 37.5765,
  zoom: 10.8,
  pitch: 40,
  bearing: 0,
  minZoom: 9,
  maxZoom: 18,
  minPitch: 0,
  maxPitch: 60
}

// 2D view configuration
export const VIEW_2D = {
  ...DEFAULT_SEOUL_VIEW,
  pitch: 0,
  bearing: 0
}

// 3D view configuration
export const VIEW_3D = {
  ...DEFAULT_SEOUL_VIEW,
  pitch: 45,
  bearing: -10
}

// GPU optimization parameters
export const COMMON_GPU_PARAMS = {
  depthTest: true,
  depthFunc: 0x0203, // GL.LEQUAL
  blend: true,
  blendFunc: [0x0302, 0x0303], // [GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA]
  cullFace: 0x0405, // GL.BACK
  cullFaceMode: true,
  polygonOffsetFill: true // Prevent z-fighting
}

// Lighting configuration for 3D mode
const ambientLight = new AmbientLight({
  color: [255, 255, 255],
  intensity: 1.2
})

const directionalLight1 = new DirectionalLight({
  color: [255, 255, 255],
  intensity: 0.8,
  direction: [-1, -1, -1]
})

const directionalLight2 = new DirectionalLight({
  color: [255, 255, 255],
  intensity: 0.2,
  direction: [1, 1, 1]
})

export const LIGHTING_EFFECT = new LightingEffect({
  ambientLight,
  directionalLight1,
  directionalLight2
})

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
  DONG_3D: 'dong-3d-polygon',
  DONG_2D: 'dong-2d-polygon',
  SGG_2D: 'unified-sgg-2d',
  DONG_UNIFIED: 'unified-dong-2d',
  JIB: 'unified-jib',
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