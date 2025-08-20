// Common chart types and interfaces
export interface ChartDataPoint {
  name: string
  value?: number
  [key: string]: any
}

export interface BaseChartProps {
  data: ChartDataPoint[]
  width?: number | string
  height?: number | string
  className?: string
  showTooltip?: boolean
  showLegend?: boolean
  showGrid?: boolean
  animate?: boolean
}

export interface LineChartProps extends BaseChartProps {
  xDataKey?: string
  yDataKey?: string
  strokeColor?: string
  strokeWidth?: number
  dot?: boolean
  curved?: boolean
}

export interface AreaChartProps extends BaseChartProps {
  xDataKey?: string
  yDataKey?: string
  fillColor?: string
  strokeColor?: string
  fillOpacity?: number
  gradient?: boolean
}

export interface BarChartProps extends BaseChartProps {
  xDataKey?: string
  yDataKey?: string
  fillColor?: string
  barSize?: number
  horizontal?: boolean
  stacked?: boolean
}

export interface PieChartProps extends BaseChartProps {
  dataKey?: string
  innerRadius?: number
  outerRadius?: number
  startAngle?: number
  endAngle?: number
  paddingAngle?: number
  colors?: string[]
}

export interface RadarChartProps extends BaseChartProps {
  dataKey?: string
  fillColor?: string
  strokeColor?: string
  fillOpacity?: number
}

export interface ScatterChartProps extends BaseChartProps {
  xDataKey?: string
  yDataKey?: string
  zDataKey?: string
  fillColor?: string
  shape?: 'circle' | 'cross' | 'diamond' | 'square' | 'star' | 'triangle'
}

export interface ComposedChartProps extends BaseChartProps {
  lines?: Array<{
    dataKey: string
    stroke?: string
    type?: 'monotone' | 'linear' | 'step'
  }>
  bars?: Array<{
    dataKey: string
    fill?: string
  }>
  areas?: Array<{
    dataKey: string
    fill?: string
    stroke?: string
  }>
}

export interface TreemapProps extends BaseChartProps {
  dataKey?: string
  aspectRatio?: number
  colors?: string[]
}

export interface FunnelChartProps extends BaseChartProps {
  dataKey?: string
  colors?: string[]
  labelPosition?: 'center' | 'left' | 'right'
}

export interface HeatmapProps {
  data: Array<{
    x: string | number
    y: string | number
    value: number
  }>
  xLabels?: string[]
  yLabels?: string[]
  colorScale?: string[]
  width?: number | string
  height?: number | string
  className?: string
}

export interface RadialBarChartProps extends BaseChartProps {
  dataKey?: string
  innerRadius?: number
  outerRadius?: number
  startAngle?: number
  endAngle?: number
  colors?: string[]
  showBackground?: boolean
}

// Color schemes for charts
export const defaultColorScheme = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#8b5cf6', // violet
  '#f59e0b', // amber
  '#ef4444', // red
  '#ec4899', // pink
  '#14b8a6', // teal
  '#6366f1', // indigo
]

// Gradient definitions for charts
export const gradientDefs = {
  blue: { start: '#3b82f6', end: '#1e40af' },
  green: { start: '#10b981', end: '#047857' },
  purple: { start: '#8b5cf6', end: '#6d28d9' },
  orange: { start: '#f59e0b', end: '#d97706' },
  red: { start: '#ef4444', end: '#dc2626' },
  pink: { start: '#ec4899', end: '#db2777' },
}