/**
 * Deck.gl Layer Creation Utilities
 *
 * Simplified version with polygon layers removed.
 * Only keeping necessary utility functions.
 */

import type { PickingInfo } from '@deck.gl/core'

// GPU optimization parameters (kept for potential future use)
export const COMMON_GPU_PARAMS = {
  depthTest: true,
  depthMask: true,
  blend: true,
  blendFunc: [770, 771, 1, 771],
  blendEquation: [32774, 32774],
  cullFace: false
}

// Stub functions to prevent breaking imports
// These will return empty arrays instead of creating polygon layers
export function createDong3DPolygonLayers(params: any) {
  // Polygon layers removed - returning empty array
  return []
}

export function createDong2DPolygonLayers(params: any) {
  // Polygon layers removed - returning empty array
  return []
}