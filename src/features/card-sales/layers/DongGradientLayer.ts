/**
 * Smooth Dong Gradient Layer
 * 3D bar gradient visualization using height ratios and distance-based colors
 * Uses dong-gradient-bars.json for smooth gradient effects
 */

import { CompositeLayer } from '@deck.gl/core'
import { ColumnLayer } from '@deck.gl/layers'
import type { Polygon, MultiPolygon } from 'geojson'

export interface GradientBar {
  position: [number, number]
  heightRatio: number
  normalizedDistance: number
  angle: number
}

export interface DongGradientData {
  dongCode: string
  dongName: string
  center: [number, number]
  maxDistance: number
  totalBars: number
  gradientBars: GradientBar[]
  // Legacy fields (optional)
  geometry?: Polygon | MultiPolygon
  value?: number
}

export interface DongGradientLayerProps {
  data: DongGradientData[]
  gridSize?: number
  distributionRadius?: number
  opacity?: number
  elevation?: number
  elevationScale?: number
  baseHeight?: number
  onHover?: (info: any) => void
  onClick?: (info: any) => void
}

interface GridCell {
  position: [number, number]
  weight: number
  color: [number, number, number, number]
}

export class DongGradientLayer extends CompositeLayer<DongGradientLayerProps> {
  static layerName = 'DongGradientLayer'
  static defaultProps = {
    gridSize: 100,
    distributionRadius: 1000, // meters
    opacity: 0.8,
    elevation: 50, // Fixed low elevation for ground gradient
    elevationScale: 1,
    baseHeight: 500 // Reduced base height for gradient bars to prevent overflow
  }

  renderLayers() {
    const { 
      data, 
      opacity = 0.8,
      elevation = 50,
      elevationScale = 1,
      baseHeight = 500,
      onHover, 
      onClick 
    } = this.props

    if (!data || data.length === 0) return []

    // Flatten all gradient bars from all dongs into a single array
    const allGradientBars: any[] = []
    
    data.forEach(dongData => {
      if (dongData.gradientBars && dongData.gradientBars.length > 0) {
        dongData.gradientBars.forEach(bar => {
          allGradientBars.push({
            position: bar.position,
            heightRatio: bar.heightRatio,
            normalizedDistance: bar.normalizedDistance,
            angle: bar.angle,
            dongCode: dongData.dongCode,
            dongName: dongData.dongName
          })
        })
      }
    })
    
    // Debug: 데이터 매핑 확인
    console.log('[DongGradientLayer] Data mapping check:', {
      totalDongs: data.length,
      firstDong: data[0]?.dongName,
      firstDongBars: data[0]?.gradientBars?.length,
      totalBarsFlattened: allGradientBars.length,
      sampleBar: allGradientBars[0],
      heightRatioRange: allGradientBars.length > 0 ? {
        min: allGradientBars.reduce((min, b) => Math.min(min, b.heightRatio), 1),
        max: allGradientBars.reduce((max, b) => Math.max(max, b.heightRatio), 0)
      } : { min: 0, max: 1 },
      distanceRange: allGradientBars.length > 0 ? {
        min: allGradientBars.reduce((min, b) => Math.min(min, b.normalizedDistance), 1),
        max: allGradientBars.reduce((max, b) => Math.max(max, b.normalizedDistance), 0)
      } : { min: 0, max: 1 }
    })
    
    if (allGradientBars.length === 0) return []

    // Create 3D bars using ColumnLayer
    return new ColumnLayer({
      id: `${this.props.id}-gradient-bars`,
      data: allGradientBars,
      
      // Position
      getPosition: (d: any) => d.position,
      
      // 3D bar settings - matched with sales bars
      diskResolution: 12,  // Same as sales bars for consistency
      radius: 90,  // Matched with sales bar radius in simple mode
      extruded: true,
      wireframe: false,
      filled: true,
      
      // Height based on heightRatio (creates gradient from center to boundary)
      getElevation: (d: any) => {
        // Use heightRatio directly for proper gradient effect
        // heightRatio: 0.99 at center -> 0.05 at boundary
        const height = baseHeight * d.heightRatio * elevationScale
        
        // Debug: 높이 계산 확인 (처음 몇 개만)
        if (Math.random() < 0.001) { // 0.1% 샘플링
          console.log('[DongGradientLayer] Height calculation:', {
            dongName: d.dongName,
            heightRatio: d.heightRatio,
            normalizedDistance: d.normalizedDistance,
            baseHeight,
            elevationScale,
            calculatedHeight: height
          })
        }
        
        // Cap maximum height to prevent overflow
        return Math.min(height, 2000)
      },
      
      // Color based on normalizedDistance (smooth gradient)
      getFillColor: (d: any) => {
        return this.getGradientColor(d.normalizedDistance)
      },
      
      // Line color for subtle borders
      getLineColor: [255, 255, 255, 30],
      lineWidthMinPixels: 0.5,
      
      opacity,
      pickable: true,
      onHover,
      onClick,
      
      updateTriggers: {
        getElevation: [baseHeight, elevationScale],
        getFillColor: [opacity]
      }
    })
  }

  // Color gradient based on normalized distance
  private getGradientColor(normalizedDistance: number): [number, number, number, number] {
    // normalizedDistance: 0 (center) to 1 (boundary)
    // Invert so center is "hot" and boundary is "cool"
    const value = 1 - normalizedDistance
    
    // Smooth gradient: blue (boundary) -> cyan -> green -> yellow -> orange -> red (center)
    const v = Math.max(0, Math.min(1, value))
    
    let r, g, b: number
    
    if (v < 0.2) {
      // Blue to cyan (boundary area)
      const t = v / 0.2
      r = 0
      g = Math.floor(100 + 100 * t)  // 100 -> 200
      b = 255
    } else if (v < 0.4) {
      // Cyan to green
      const t = (v - 0.2) / 0.2
      r = 0
      g = Math.floor(200 + 55 * t)   // 200 -> 255
      b = Math.floor(255 - 155 * t)  // 255 -> 100
    } else if (v < 0.6) {
      // Green to yellow-green
      const t = (v - 0.4) / 0.2
      r = Math.floor(150 * t)        // 0 -> 150
      g = 255
      b = Math.floor(100 - 100 * t)  // 100 -> 0
    } else if (v < 0.8) {
      // Yellow-green to yellow
      const t = (v - 0.6) / 0.2
      r = Math.floor(150 + 105 * t)  // 150 -> 255
      g = 255
      b = 0
    } else {
      // Yellow to orange to red (center area)
      const t = (v - 0.8) / 0.2
      r = 255
      g = Math.floor(255 - 105 * t)  // 255 -> 150
      b = 0
    }
    
    // Add alpha channel with full opacity
    return [r, g, b, 255]
  }
}