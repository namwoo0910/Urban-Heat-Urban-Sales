"use client"

import { TextLayer } from '@deck.gl/layers'
import type { Layer } from '@deck.gl/core'
import { DISTRICT_LABELS } from '../data/districtCentersWithLabels'

interface DistrictLabelsTextLayerProps {
  visible?: boolean
  viewState: {
    zoom: number
    longitude: number
    latitude: number
  }
  selectedGu?: string | null
  selectedDong?: string | null
  hoveredDistrict?: string | null
  onClick?: (districtName: string) => void
  onHover?: (info: any) => void
}

/**
 * Creates Deck.gl TextLayer for district labels that render properly above 3D polygons
 */
export function createDistrictLabelsTextLayer({
  visible = true,
  viewState,
  selectedGu,
  selectedDong,
  hoveredDistrict,
  onClick,
  onHover
}: DistrictLabelsTextLayerProps): Layer[] {
  const layers: Layer[] = []
  
  // Don't show labels if zoom is too low or layer is hidden
  if (!visible || viewState.zoom < 10) {
    return layers
  }
  
  // Calculate text size based on zoom level
  const getTextSize = () => {
    const zoom = viewState.zoom
    if (zoom < 10.5) return 12
    if (zoom < 11) return 14
    if (zoom < 11.5) return 16
    if (zoom < 12) return 18
    if (zoom < 13) return 20
    return 22
  }
  
  // Main district labels (구 labels)
  const mainLabels = new TextLayer({
    id: 'district-labels-text',
    data: DISTRICT_LABELS,
    
    // Ensure text renders above 3D polygons
    parameters: {
      depthTest: false,
      depthWrite: false
    },
    
    // Text content
    getText: d => d.nameKr,
    
    // Position
    getPosition: d => d.coordinates,
    
    // Size and scaling
    getSize: getTextSize(),
    sizeScale: 1,
    sizeUnits: 'pixels',
    sizeMinPixels: 12,
    sizeMaxPixels: 24,
    
    // Colors - highlight selected/hovered districts
    getColor: d => {
      const isSelected = selectedGu === d.nameKr
      const isHovered = hoveredDistrict === d.nameKr
      
      if (isSelected || isHovered) {
        return [255, 255, 100, 255] // Yellow highlight
      }
      return [255, 255, 255, 255] // White default
    },
    
    // Text outline for visibility against 3D polygons
    outlineWidth: 2,
    outlineColor: [0, 0, 0, 200],
    
    // Background for better contrast
    background: true,
    getBackgroundColor: d => {
      const isSelected = selectedGu === d.nameKr
      const isHovered = hoveredDistrict === d.nameKr
      
      if (isSelected || isHovered) {
        return [0, 0, 0, 180]
      }
      return [0, 0, 0, 128]
    },
    backgroundPadding: [6, 4, 6, 4],
    backgroundBorderRadius: 4,
    
    // Font settings
    fontFamily: 'Pretendard Bold, Noto Sans KR Bold, Arial Unicode MS Bold',
    fontWeight: 'bold',
    characterSet: 'auto',
    
    // Text alignment
    getTextAnchor: 'middle',
    getAlignmentBaseline: 'center',
    
    // Billboard mode - text always faces camera (crucial for 3D)
    billboard: true,
    
    // Interaction
    pickable: true,
    autoHighlight: true,
    highlightColor: [255, 255, 0, 100],
    
    onHover: (info) => {
      if (onHover) {
        onHover(info)
      }
      return true
    },
    
    onClick: (info) => {
      if (onClick && info.object) {
        onClick(info.object.nameKr)
      }
      return true
    },
    
    // Update triggers for reactive updates
    updateTriggers: {
      getColor: [selectedGu, selectedDong, hoveredDistrict],
      getBackgroundColor: [selectedGu, selectedDong, hoveredDistrict],
      getSize: [viewState.zoom]
    }
  })
  
  layers.push(mainLabels)
  
  // Add English sub-labels at higher zoom levels
  if (viewState.zoom >= 11) {
    const subLabels = new TextLayer({
      id: 'district-labels-sub',
      data: DISTRICT_LABELS,
      
      // Ensure text renders above 3D polygons
      parameters: {
        depthTest: false,
        depthWrite: false
      },
      
      // Text content - English name
      getText: d => d.name.replace('-gu', '').toUpperCase(),
      
      // Position - slightly offset below Korean name
      getPosition: d => d.coordinates,
      getPixelOffset: [0, 20], // Offset below main label
      
      // Smaller size for sub-labels
      getSize: Math.max(8, getTextSize() - 6),
      sizeScale: 1,
      sizeUnits: 'pixels',
      sizeMinPixels: 8,
      sizeMaxPixels: 14,
      
      // More subtle colors
      getColor: d => {
        const isSelected = selectedGu === d.nameKr
        const isHovered = hoveredDistrict === d.nameKr
        
        if (isSelected || isHovered) {
          return [255, 255, 150, 200] // Lighter yellow
        }
        return [200, 200, 200, 180] // Light gray
      },
      
      // Thinner outline
      outlineWidth: 1.5,
      outlineColor: [0, 0, 0, 150],
      
      // No background for sub-labels to reduce clutter
      background: false,
      
      // Font settings
      fontFamily: 'Pretendard Regular, Open Sans Regular, Arial Unicode MS Regular',
      fontWeight: 'normal',
      characterSet: 'auto',
      
      // Text alignment
      getTextAnchor: 'middle',
      getAlignmentBaseline: 'top',
      
      // Billboard mode
      billboard: true,
      
      // No interaction for sub-labels
      pickable: false,
      
      // Update triggers
      updateTriggers: {
        getColor: [selectedGu, selectedDong, hoveredDistrict],
        getSize: [viewState.zoom]
      }
    })
    
    layers.push(subLabels)
  }
  
  return layers
}

/**
 * Helper function to create dong (sub-district) labels when a gu is selected
 */
export function createDongLabelsTextLayer({
  dongData,
  selectedGu,
  selectedDong,
  viewState,
  onClick,
  onHover
}: {
  dongData: any[]
  selectedGu: string | null
  selectedDong: string | null
  viewState: { zoom: number }
  onClick?: (dongName: string) => void
  onHover?: (info: any) => void
}): Layer[] {
  if (!dongData || !selectedGu || viewState.zoom < 11.5) {
    return []
  }
  
  // Filter dong features for selected gu
  const dongLabels = dongData.map(d => ({
    name: d.properties?.dongName || d.properties?.ADM_DR_NM || d.properties?.DONG_NM,
    coordinates: d.properties?.centroid || d.properties?.coordinates,
    isSelected: d.properties?.dongName === selectedDong
  })).filter(d => d.name && d.coordinates)
  
  const layer = new TextLayer({
    id: 'dong-labels-text',
    data: dongLabels,
    
    // Ensure text renders above 3D polygons
    parameters: {
      depthTest: false,
      depthWrite: false
    },
    
    getText: d => d.name,
    getPosition: d => d.coordinates,
    
    // Size based on selection
    getSize: d => d.isSelected ? 20 : 16,
    sizeScale: 1,
    sizeUnits: 'pixels',
    sizeMinPixels: 14,
    sizeMaxPixels: 22,
    
    // Highlight selected dong
    getColor: d => {
      if (d.isSelected) {
        return [255, 100, 150, 255] // Pink for selected
      }
      return [255, 255, 255, 255] // White for others
    },
    
    // Strong outline for visibility
    outlineWidth: d => d.isSelected ? 3 : 2,
    outlineColor: [0, 0, 0, 255],
    
    // Background only for selected
    background: d => d.isSelected,
    getBackgroundColor: [255, 100, 150, 100],
    backgroundPadding: [8, 4, 8, 4],
    backgroundBorderRadius: 6,
    
    // Font
    fontFamily: 'Pretendard Bold, Noto Sans KR Bold',
    fontWeight: 'bold',
    characterSet: 'auto',
    
    // Alignment
    getTextAnchor: 'middle',
    getAlignmentBaseline: 'center',
    
    // Billboard
    billboard: true,
    
    // Interaction
    pickable: true,
    autoHighlight: true,
    
    onClick: (info) => {
      if (onClick && info.object) {
        onClick(info.object.name)
      }
      return true
    },
    
    onHover: (info) => {
      if (onHover) {
        onHover(info)
      }
      return true
    },
    
    updateTriggers: {
      getSize: [selectedDong],
      getColor: [selectedDong],
      outlineWidth: [selectedDong],
      background: [selectedDong]
    }
  })
  
  return [layer]
}