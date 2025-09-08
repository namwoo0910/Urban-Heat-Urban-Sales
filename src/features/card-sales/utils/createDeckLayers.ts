/**
 * Deck.gl Layer Creation Utilities
 * 
 * Separated layer creation logic for better performance and maintainability.
 * These functions are pure and can be easily memoized.
 */

import { PolygonLayer } from '@deck.gl/layers'
import type { PickingInfo } from '@deck.gl/core'

// GPU optimization parameters
const COMMON_GPU_PARAMS = {
  depthTest: true,
  depthMask: true,
  blend: true,
  blendFunc: [770, 771, 1, 771],
  blendEquation: [32774, 32774],
  cullFace: false
}

interface LayerConfig {
  visible: boolean
  opacity: number
  elevationScale: number
  colorRange?: any[]
  // Add other config properties as needed
}

interface CreateDong3DLayersParams {
  dongData3D: any
  layerConfig: LayerConfig
  dongSalesMap: Map<number, number>
  heightScale: number
  selectedGu: string | null
  selectedDong: string | null
  selectedGuCode: number | null
  selectedDongCode: number | null
  hoveredDistrict: string | null
  currentThemeKey: string
  timelineAnimationEnabled: boolean
  isTimelinePlaying: boolean
  onHover?: (info: PickingInfo) => void
  onClick?: (info: PickingInfo) => void
  getDistrictCode: (properties: any) => string | null
  getDistrictName: (properties: any) => string | null
  getGuName: (properties: any) => string | null
}

/**
 * Creates optimized 3D polygon layers for dong (district) data
 * This is a pure function that can be memoized for performance
 */
export function createDong3DPolygonLayers({
  dongData3D,
  layerConfig,
  dongSalesMap,
  heightScale,
  selectedGu,
  selectedDong,
  hoveredDistrict,
  currentThemeKey,
  timelineAnimationEnabled,
  isTimelinePlaying,
  onHover,
  onClick,
  getDistrictCode,
  getDistrictName,
  getGuName
}: CreateDong3DLayersParams) {
  // Skip layer creation if polygon layer is off
  if (!layerConfig.visible) return []
  if (!dongData3D || !dongData3D.features) return []
  
  return [
    new PolygonLayer({
      id: 'dong-3d-polygon',
      data: dongData3D.features,
      pickable: true,
      extruded: true,
      wireframe: false,
      filled: true,
      autoHighlight: true,
      highlightColor: [255, 255, 255, 60],
      
      // GPU Optimization Parameters
      parameters: COMMON_GPU_PARAMS,
      
      // Geometry
      getPolygon: (d: any) => {
        // Handle both Polygon and MultiPolygon
        if (d.geometry.type === 'MultiPolygon') {
          // Return the first polygon for MultiPolygon
          return d.geometry.coordinates[0][0]
        }
        return d.geometry.coordinates[0]
      },
      
      // Height - use pre-calculated height
      getElevation: (d: any) => {
        const guName = getGuName(d.properties)
        const height = d.properties.height || 0
        
        // 동 선택 시: 선택된 구의 동만 원래 높이
        if (selectedDong) {
          if (guName === selectedGu) {
            return height
          }
          return 10 // 다른 구의 동들은 낮은 높이
        }
        
        // 구 선택 시: 선택된 구의 동만 표시
        if (selectedGu && guName !== selectedGu) {
          return 0 // 숨김
        }
        
        // Add elevation boost when gu is hovered for 3D pop-out effect
        if (hoveredDistrict === guName) {
          return height * 1.2  // 20% elevation boost for better visibility
        }
        
        return height
      },
      
      elevationScale: 1,
      
      // Color calculation
      getFillColor: (d: any) => {
        const dongName = getDistrictName(d.properties)
        const guName = getGuName(d.properties)
        const dongCode = getDistrictCode(d.properties)
        
        const height = d.properties.height || 0
        const totalSales = dongCode ? dongSalesMap.get(Number(dongCode)) || 0 : 0
        
        // Color logic based on theme and selection state
        // This is simplified - you can add the full color logic here
        if (selectedDong === dongName && selectedGu === guName) {
          return [255, 200, 0, 255] // Selected color
        }
        
        if (hoveredDistrict === dongName || hoveredDistrict === guName) {
          return [0, 255, 255, 200] // Hover color
        }
        
        // Default gradient based on sales
        const step = 125000000 // 1.25억
        const colorIndex = Math.min(Math.floor(totalSales / step), 39)
        const intensity = (colorIndex / 39) * 255
        
        return [intensity, intensity * 0.5, 255 - intensity, 200]
      },
      
      // Line color and width
      getLineColor: [100, 100, 100, 100],
      getLineWidth: 1,
      lineWidthMinPixels: 0.5,
      lineWidthMaxPixels: 2,
      
      // Event handlers
      onHover,
      onClick,
      
      // Transitions for smooth animations
      transitions: {
        getElevation: timelineAnimationEnabled && isTimelinePlaying ? 0 : 300,
        getFillColor: 300,
        getLineWidth: 200
      },
      
      // Update triggers for reactive updates
      updateTriggers: layerConfig.visible ? {
        getElevation: [dongSalesMap, heightScale, selectedGu, selectedDong],
        getFillColor: [selectedGu, selectedDong, currentThemeKey, hoveredDistrict],
        getLineColor: [selectedGu, selectedDong, currentThemeKey]
      } : {}
    })
  ]
}

/**
 * Creates optimized 2D polygon layers for initial view
 */
export function createDong2DPolygonLayers({
  dongData3D,
  layerConfig,
  dongSalesMap,
  selectedGu,
  selectedDong,
  hoveredDistrict,
  currentThemeKey,
  onHover,
  onClick,
  getDistrictCode,
  getDistrictName,
  getGuName,
  dongColorMap
}: any) {
  if (!layerConfig.visible) return []
  if (!dongData3D || !dongData3D.features) return []
  
  return [
    new PolygonLayer({
      id: 'dong-2d-polygon',
      data: dongData3D.features,
      pickable: true,
      extruded: false,
      filled: true,
      stroked: true,
      
      getPolygon: (d: any) => {
        if (d.geometry.type === 'MultiPolygon') {
          return d.geometry.coordinates[0][0]
        }
        return d.geometry.coordinates[0]
      },
      
      getFillColor: (d: any) => {
        const dongCode = getDistrictCode(d.properties)
        
        // Get pre-calculated color data for performance
        const colorData = dongCode ? dongColorMap.get(dongCode) : null
        const guName = colorData?.guName || getGuName(d.properties)
        const dongName = colorData?.dongName || getDistrictName(d.properties)
        
        // Use pre-calculated base color and apply state changes
        if (colorData && colorData.baseColor) {
          // Apply hover/selection state to pre-calculated color
          if (selectedDong === dongName && selectedGu === guName) {
            return [255, 200, 0, 255]
          }
          if (hoveredDistrict === dongName || hoveredDistrict === guName) {
            return [
              Math.min(255, colorData.baseColor[0] * 1.3),
              Math.min(255, colorData.baseColor[1] * 1.3),
              Math.min(255, colorData.baseColor[2] * 1.3),
              255
            ]
          }
          return colorData.baseColor
        }
        
        // Fallback color
        return [50, 50, 50, 180]
      },
      
      getLineColor: [100, 100, 100, 100],
      getLineWidth: 1,
      lineWidthMinPixels: 0.5,
      lineWidthMaxPixels: 2,
      
      onHover,
      onClick,
      
      transitions: {
        getFillColor: 300
      },
      
      updateTriggers: layerConfig.visible ? {
        getFillColor: [selectedGu, selectedDong, dongColorMap],
        getLineColor: [selectedGu, selectedDong]
      } : {}
    })
  ]
}