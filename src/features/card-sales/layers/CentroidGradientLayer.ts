/**
 * Centroid-based Gaussian Gradient Layer
 * Implements smooth gradient from dong centers using Gaussian distribution
 * Based on grid_0811.py logic for natural falloff
 */

import { CompositeLayer } from '@deck.gl/core'
import { ColumnLayer } from '@deck.gl/layers'

export interface CentroidGridPoint {
  position: [number, number]
  distanceFromCentroid: number
  gaussianWeight: number
  normalizedDistance: number
}

export interface CentroidGradientData {
  dongCode: string
  dongName: string
  centroid: [number, number]
  bounds: {
    minX: number
    minY: number
    maxX: number
    maxY: number
  }
  distributionRadius: number
  totalPoints: number
  gridPoints: CentroidGridPoint[]
  value?: number // Sales data added by hook
}

export interface CentroidGradientLayerProps {
  data: CentroidGradientData[]
  opacity?: number
  elevation?: number
  elevationScale?: number
  onHover?: (info: any) => void
  onClick?: (info: any) => void
}

export class CentroidGradientLayer extends CompositeLayer<CentroidGradientLayerProps> {
  static layerName = 'CentroidGradientLayer'
  static defaultProps = {
    opacity: 0.7,
    elevation: 50,
    elevationScale: 1
  }

  renderLayers() {
    const { 
      data, 
      opacity = 0.7,
      elevationScale = 1,
      onHover, 
      onClick 
    } = this.props

    if (!data || data.length === 0) return []

    // Flatten all grid points with sales data
    const allGridPoints: any[] = []
    
    data.forEach(dongData => {
      if (dongData.gridPoints && dongData.gridPoints.length > 0) {
        // Get the sales value for this dong
        const dongSales = dongData.value || 0
        const baseSalesHeight = dongSales / 1000000 // 1백만원 = 1m
        
        dongData.gridPoints.forEach(point => {
          // Height based on sales * gaussian weight
          const elevation = baseSalesHeight * point.gaussianWeight
          
          allGridPoints.push({
            position: point.position,
            elevation: elevation,
            gaussianWeight: point.gaussianWeight,
            normalizedDistance: point.normalizedDistance,
            dongCode: dongData.dongCode,
            dongName: dongData.dongName,
            totalSales: dongSales
          })
        })
      }
    })
    
    console.log('[CentroidGradientLayer] Data check:', {
      totalDongs: data.length,
      totalGridPoints: allGridPoints.length,
      samplePoint: allGridPoints[0],
      avgPointsPerDong: Math.round(allGridPoints.length / data.length)
    })
    
    if (allGridPoints.length === 0) return []

    // Create grid using small columns for smooth surface
    return new ColumnLayer({
      id: `${this.props.id}-centroid-gradient`,
      data: allGridPoints,
      
      // Position
      getPosition: (d: any) => d.position,
      
      // Very small columns for smooth grid appearance
      diskResolution: 4,  // Square-ish shape for grid cells
      radius: 25,         // Small radius for dense coverage
      extruded: true,
      wireframe: false,
      filled: true,
      
      // Height based on gaussian-weighted sales
      getElevation: (d: any) => {
        return d.elevation * elevationScale
      },
      
      // Modern smooth color gradient based on gaussian weight
      getFillColor: (d: any) => {
        return this.getGaussianGradientColor(d.gaussianWeight)
      },
      
      // Fixed opacity
      opacity: opacity * 0.8,
      
      // Line color for subtle grid
      getLineColor: [255, 255, 255, 20],
      lineWidthMinPixels: 0.3,
      
      pickable: true,
      onHover,
      onClick,
      
      updateTriggers: {
        getElevation: [elevationScale],
        getFillColor: [opacity]
      }
    })
  }

  // Smooth color gradient based on Gaussian weight
  private getGaussianGradientColor(weight: number): [number, number, number, number] {
    // weight: 1 (center) to ~0 (boundary)
    // Use smooth HSL interpolation for seamless color transitions
    
    // Soft purple to blue gradient for modern look
    const hue = 250 - weight * 30  // 250 (purple) to 220 (blue)
    const saturation = 40 + weight * 40  // 40% to 80%
    const lightness = 75 - weight * 25   // 75% to 50%
    
    const rgb = this.hslToRgb(hue / 360, saturation / 100, lightness / 100)
    
    // Full opacity (handled by layer opacity)
    return [rgb[0], rgb[1], rgb[2], 255]
  }
  
  // HSL to RGB conversion
  private hslToRgb(h: number, s: number, l: number): [number, number, number] {
    let r, g, b: number
    
    if (s === 0) {
      r = g = b = l
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