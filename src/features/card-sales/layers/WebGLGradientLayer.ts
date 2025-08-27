/**
 * Simple WebGL Gradient Layer
 * 3D Column-based gradient visualization using pre-computed dong boundary data
 */

import { CompositeLayer } from '@deck.gl/core'
import { ColumnLayer } from '@deck.gl/layers'
import type { ColumnLayerProps } from '@deck.gl/layers'

// Re-export DongGradientData type from DongGradientLayer
export type { DongGradientData } from './DongGradientLayer'

export interface DongGradientBar {
  position: [number, number]
  heightRatio: number
  normalizedDistance: number
  angle: number
}

export interface DongGradientBarsData {
  dongCode: string
  dongName: string
  center: [number, number]
  maxDistance: number
  totalBars: number
  gradientBars: DongGradientBar[]
}

export interface SimpleWebGLGradientLayerProps {
  id?: string
  data: any[]
  radiusPixels?: number
  intensity?: number
  threshold?: number
  opacity?: number
  pickable?: boolean
  updateTriggers?: any
  // New props for 3D gradient bars
  maxBarHeight?: number
  barRadius?: number
  dongGradientData?: DongGradientBarsData[] | null
}

interface GradientBarPoint {
  position: [number, number]
  height: number
  color: [number, number, number, number]
  dongName: string
  value: number
}

export class SimpleWebGLGradientLayer extends CompositeLayer<SimpleWebGLGradientLayerProps> {
  static layerName = 'SimpleWebGLGradientLayer'
  static defaultProps = {
    radiusPixels: 80,
    intensity: 1,
    threshold: 0.03,
    opacity: 0.8,
    pickable: false,
    maxBarHeight: 50000000, // 5천만원 기준 높이
    barRadius: 50,
    dongGradientData: null
  }

  state!: {
    dongGradientData: DongGradientBarsData[] | null
    gradientPoints: GradientBarPoint[]
  }

  initializeState() {
    this.state = {
      dongGradientData: null,
      gradientPoints: []
    }
  }

  updateState({ props, changeFlags }: any) {
    if (changeFlags.dataChanged || props.dongGradientData !== this.state.dongGradientData) {
      this.loadDongGradientData(props)
    }
  }

  async loadDongGradientData(props: SimpleWebGLGradientLayerProps) {
    try {
      let dongData = props.dongGradientData
      
      if (!dongData) {
        // Load from public data if not provided
        const response = await fetch('/data/dong-gradient-bars.json')
        dongData = await response.json()
      }
      
      if (dongData) {
        const gradientPoints = this.generateGradientPoints(props.data, dongData, props)
        this.setState({
          dongGradientData: dongData,
          gradientPoints
        })
      }
    } catch (error) {
      console.warn('Failed to load dong gradient data:', error)
      this.setState({
        dongGradientData: null,
        gradientPoints: []
      })
    }
  }

  generateGradientPoints(
    salesData: any[], 
    dongData: DongGradientBarsData[], 
    props: SimpleWebGLGradientLayerProps
  ): GradientBarPoint[] {
    if (!salesData || !dongData) return []

    const gradientPoints: GradientBarPoint[] = []
    const maxValue = Math.max(...salesData.map(d => d.value || d.weight || 0))
    
    // Create a map of dong sales data
    const dongSalesMap = new Map()
    salesData.forEach(dataPoint => {
      const dongName = dataPoint.originalData?.dongName || dataPoint.dongName
      if (dongName) {
        const existingValue = dongSalesMap.get(dongName) || 0
        dongSalesMap.set(dongName, existingValue + (dataPoint.value || dataPoint.weight || 0))
      }
    })

    dongData.forEach(dong => {
      const salesValue = dongSalesMap.get(dong.dongName) || 0
      if (salesValue <= 0) return // Skip dongs with no sales data

      // Generate gradient bars for this dong
      dong.gradientBars.forEach(bar => {
        const height = salesValue * bar.heightRatio
        if (height < props.maxBarHeight! * 0.01) return // Skip very small bars

        const color = this.getGradientColor(salesValue / maxValue, bar.normalizedDistance, props.opacity || 0.8)
        
        gradientPoints.push({
          position: bar.position,
          height,
          color,
          dongName: dong.dongName,
          value: salesValue
        })
      })
    })

    console.log(`Generated ${gradientPoints.length} gradient bar points`)
    return gradientPoints
  }

  getGradientColor(valueRatio: number, distanceRatio: number, opacity: number): [number, number, number, number] {
    // Heat map color based on value
    const v = Math.max(0, Math.min(1, valueRatio))
    let r, g, b: number

    if (v < 0.25) {
      // Blue to cyan
      const t = v / 0.25
      r = 0
      g = Math.floor(100 + 155 * t)
      b = 255
    } else if (v < 0.5) {
      // Cyan to green
      const t = (v - 0.25) / 0.25
      r = 0
      g = 255
      b = Math.floor(255 * (1 - t))
    } else if (v < 0.75) {
      // Green to yellow
      const t = (v - 0.5) / 0.25
      r = Math.floor(255 * t)
      g = 255
      b = 0
    } else {
      // Yellow to red
      const t = (v - 0.75) / 0.25
      r = 255
      g = Math.floor(255 * (1 - t))
      b = 0
    }

    // Reduce opacity based on distance from center
    const distanceAlpha = 1 - distanceRatio * 0.6 // Keep at least 40% opacity at edges
    const finalAlpha = Math.floor(opacity * distanceAlpha * 255)

    return [r, g, b, finalAlpha]
  }

  renderLayers() {
    const { gradientPoints } = this.state
    const { barRadius = 50, pickable = false } = this.props

    if (!gradientPoints.length) {
      return []
    }

    return [
      new ColumnLayer({
        id: `${this.props.id}-gradient-bars`,
        data: gradientPoints,
        getPosition: (d: GradientBarPoint) => d.position,
        getElevation: (d: GradientBarPoint) => d.height,
        getFillColor: (d: GradientBarPoint) => d.color,
        getLineColor: [255, 255, 255, 50],
        radius: barRadius,
        diskResolution: 8,
        extruded: true,
        filled: true,
        wireframe: false,
        lineWidthMinPixels: 0.5,
        pickable,
        autoHighlight: pickable,
        material: {
          ambient: 0.35,
          diffuse: 0.6,
          shininess: 32,
          specularColor: [30, 30, 30]
        },
        transitions: {
          getElevation: 800,
          getFillColor: 800
        }
      })
    ]
  }
}