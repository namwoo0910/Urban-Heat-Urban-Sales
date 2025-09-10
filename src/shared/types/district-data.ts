/**
 * Shared district data types for both card sales and floating population
 */

// Base geographic data for districts
export interface BaseDistrictData {
  dongCode: number
  dongName: string
  sggName: string
  sggCode: number
  centroid: [number, number]
  boundingBox?: [number, number, number, number]
  coordinates?: number[][][]
}

// Filter state shared across district visualizations
export interface DistrictFilterState {
  selectedGu: string | null
  selectedGuCode: number | null
  selectedDong: string | null
  selectedDongCode: number | null
  selectedDate?: string | null
  selectedHour?: number | null
}

// Generic data loader interface
export interface DataLoader<T> {
  loadData(filters?: DistrictFilterState): Promise<T>
  processData(raw: any): T
  filterData(data: T, filters: DistrictFilterState): T
}

// Map view state
export interface MapViewState {
  longitude: number
  latitude: number
  zoom: number
  pitch: number
  bearing: number
  transitionDuration?: number
}

// Layer configuration
export interface LayerConfig {
  visible: boolean
  coverage?: number
  upperPercentile?: number
  opacity?: number
  animationSpeed?: number
  waveAmplitude?: number
}

// Common chart data format
export interface ChartDataPoint {
  name: string
  value: number
  category?: string
  color?: string
}

// Time series data
export interface TimeSeriesData {
  time: string | number
  value: number
  category?: string
}