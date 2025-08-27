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
        // Get the sales value for this dong
        const dongSales = dongData.value || 0
        
        dongData.gradientBars.forEach(bar => {
          allGradientBars.push({
            position: bar.position,
            heightRatio: bar.heightRatio,
            normalizedDistance: bar.normalizedDistance,
            angle: bar.angle,
            dongCode: dongData.dongCode,
            dongName: dongData.dongName,
            totalSales: dongSales // Add sales data to each bar
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
      
      // 3D bar settings - modern smooth appearance
      diskResolution: 6,  // Hexagonal shape for better blending
      radius: 35,  // Smaller bars for denser, smoother coverage
      extruded: true,
      wireframe: false,
      filled: true,
      
      // Height based on actual sales data and distance gradient
      getElevation: (d: any) => {
        // Calculate base height from actual sales data
        const salesHeight = (d.totalSales || 0) / 1000000
        
        // Multi-stage edge smoothing for natural falloff
        // Using cosine curve for smoother transition
        const edgeFactor = Math.pow(1 - d.normalizedDistance, 3)
        const smoothingFactor = 0.3 + 0.7 * edgeFactor
        
        // Apply height ratio with smooth edge blending
        let height = salesHeight * d.heightRatio * smoothingFactor
        
        // Add subtle organic variation (prevents too-perfect appearance)
        const noise = (Math.sin(d.position[0] * 100) + Math.sin(d.position[1] * 100)) * 0.02
        height *= (1 + noise)
        
        // Apply elevation scale
        height *= elevationScale
        
        // Cap maximum height to prevent overflow
        return Math.min(height, 3000)
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

  // Modern monochrome gradient with smooth transitions
  private getGradientColor(normalizedDistance: number): [number, number, number, number] {
    // normalizedDistance: 0 (center) to 1 (boundary)
    const intensity = 1 - normalizedDistance
    
    // Modern blue-to-white gradient for professional appearance
    // Using smooth interpolation for seamless color transitions
    
    // Base hue: soft blue (210-220)
    const hue = 210 + intensity * 10
    
    // Saturation: high at center, low at edges for fade effect
    const saturation = 70 * Math.pow(intensity, 1.5)
    
    // Lightness: darker at center, lighter at edges
    const lightness = 85 - intensity * 30
    
    // Convert HSL to RGB
    const rgb = this.hslToRgb(hue / 360, saturation / 100, lightness / 100)
    
    // Variable opacity: more opaque at center, transparent at edges
    const alpha = Math.floor(180 + 75 * intensity) // 180-255 range
    
    return [rgb[0], rgb[1], rgb[2], alpha]
  }
  
  // HSL to RGB conversion for smooth color interpolation
  private hslToRgb(h: number, s: number, l: number): [number, number, number] {
    let r, g, b: number
    
    if (s === 0) {
      r = g = b = l // achromatic
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1
        if (t > 1) t -= 1
        if (t < 1/6) return p + (q - p) * 6 * t
        if (t < 1/2) return q
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
        return p
      }
      
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s
      const p = 2 * l - q
      r = hue2rgb(p, q, h + 1/3)
      g = hue2rgb(p, q, h)
      b = hue2rgb(p, q, h - 1/3)
    }
    
    return [Math.floor(r * 255), Math.floor(g * 255), Math.floor(b * 255)]
  }
}