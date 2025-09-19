/**
 * Map configuration constants for EDA visualization
 */

import type { MapViewState } from '@deck.gl/core'

// Default Seoul view state for EDA
export const DEFAULT_SEOUL_VIEW: MapViewState = {
  longitude: 126.9780,  // Default center, dynamically adjusted based on viewport
  latitude: 37.5665,
  zoom: 10.8,
  pitch: 0,
  bearing: 2,
  minZoom: 9,
  maxZoom: 16
}

// Zoom thresholds for layer visibility
export const ZOOM_THRESHOLDS = {
  GU_LABELS: 10,
  DONG_BOUNDARIES: 11,
  DONG_LABELS: 13,
  DETAILED_STATS: 14
}

// Color palette for data visualization (optimized for light background)
export const COLORS = {
  // Primary colors
  primary: [59, 130, 246], // Blue
  secondary: [34, 197, 94], // Green
  accent: [251, 146, 60], // Orange

  // UI colors
  border: [107, 114, 128], // Gray
  borderLight: [156, 163, 175], // Light gray
  hover: [156, 163, 175, 40], // Gray with transparency
  selected: [59, 130, 246, 60], // Blue with transparency

  // Text colors
  textPrimary: [55, 65, 81], // Dark gray
  textSecondary: [107, 114, 128], // Gray

  // Background colors
  backgroundWhite: [255, 255, 255],
  backgroundOverlay: [255, 255, 255, 200]
}

// Animation durations
export const ANIMATION_DURATION = {
  FAST: 200,
  NORMAL: 400,
  SLOW: 800
}