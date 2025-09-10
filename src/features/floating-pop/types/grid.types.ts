/**
 * Grid and floating population data type definitions
 */

// Dong boundary type for geographical data
export interface DongBoundary {
  dongCode: number
  dongName: string
  guName: string
  coordinates: number[][][]
  centroid: [number, number]
}

// Grid cell for hexagon/mesh layers
export interface GridCell {
  id: string
  coordinates: [number, number]
  value: number
  dongCode?: number
  dongName?: string
  guName?: string
}

// Grid data structure
export interface GridData {
  cells: GridCell[]
  bounds: {
    minLng: number
    maxLng: number
    minLat: number
    maxLat: number
  }
  resolution: number
}

// HexagonLayer specific grid data
export interface HexagonLayerGridData extends GridCell {
  weight: number
  population?: number
  timeSlot?: string
  date?: string
}

// Floating population specific data
export interface FloatingPopulationData {
  // Location
  coordinates: [number, number]
  dongCode: number
  dongName: string
  guName: string
  
  // Population data
  totalPopulation: number
  populationByHour: number[]
  populationDensity: number
  
  // Time data
  date: string
  hour?: number
  dayOfWeek?: string
  
  // Additional metrics
  ageGroups?: Record<string, number>
  genderRatio?: { male: number; female: number }
  activity?: 'residential' | 'commercial' | 'transit' | 'leisure'
}

// Filter options for floating population
export interface FloatingPopFilterOptions {
  date?: string
  dateRange?: { start: string; end: string }
  hour?: number
  dongNames?: string[]
  guNames?: string[]
  minPopulation?: number
  maxPopulation?: number
  activityTypes?: string[]
}

// Color modes for visualization
export type PopulationColorMode = 'density' | 'total' | 'change' | 'activity' | 'time'

// Aggregated data for charts
export interface AggregatedPopulationData {
  totalPopulation: number
  averageDensity: number
  peakHour: number
  peakPopulation: number
  dataPoints: number
}

export type { 
  DongBoundary,
  GridCell,
  GridData,
  HexagonLayerGridData,
  FloatingPopulationData,
  FloatingPopFilterOptions,
  PopulationColorMode,
  AggregatedPopulationData
}