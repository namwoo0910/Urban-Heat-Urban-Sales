/**
 * Optimized Seoul boundary utilities with pre-computed spatial grid
 * for ultra-fast point-in-polygon checks
 */

// Define types locally since original file was removed
export interface SeoulBoundaryFeature {
  type: "Feature"
  properties: {
    name: string
    [key: string]: any
  }
  geometry: {
    type: "Polygon" | "MultiPolygon"
    coordinates: number[][][] | number[][][][]
  }
}

export interface SeoulBoundaryData {
  type: "FeatureCollection"
  features: SeoulBoundaryFeature[]
}

// Grid resolution (higher = more accurate but more memory)
const GRID_RESOLUTION = 200 // 200x200 grid cells
const GRID_SIZE = GRID_RESOLUTION * GRID_RESOLUTION

// Seoul bounds (pre-computed)
const SEOUL_BOUNDS = {
  minLng: 126.764,
  maxLng: 127.183,
  minLat: 37.413,
  maxLat: 37.701,
}

// Pre-computed grid for fast lookup
export interface BoundaryGrid {
  grid: Uint8Array // 0 = outside, 1 = inside Seoul
  districtGrid: Uint8Array // district index for each cell
  districtNames: string[]
  bounds: typeof SEOUL_BOUNDS
  cellWidth: number
  cellHeight: number
}

let cachedGrid: BoundaryGrid | null = null
let gridGenerationPromise: Promise<BoundaryGrid> | null = null

/**
 * Pre-compute a spatial grid for Seoul boundaries
 * This is done once and cached for ultra-fast lookups
 */
export async function precomputeBoundaryGrid(boundaryData: SeoulBoundaryData): Promise<BoundaryGrid> {
  if (cachedGrid) return cachedGrid
  if (gridGenerationPromise) return gridGenerationPromise

  gridGenerationPromise = new Promise((resolve) => {
    const startTime = performance.now()
    
    const grid = new Uint8Array(GRID_SIZE)
    const districtGrid = new Uint8Array(GRID_SIZE)
    const districtNames: string[] = []
    const districtMap = new Map<string, number>()
    
    // Build district name index
    boundaryData.features.forEach((feature) => {
      const name = feature.properties.SGG_NM
      if (!districtMap.has(name)) {
        districtMap.set(name, districtNames.length)
        districtNames.push(name)
      }
    })
    
    const cellWidth = (SEOUL_BOUNDS.maxLng - SEOUL_BOUNDS.minLng) / GRID_RESOLUTION
    const cellHeight = (SEOUL_BOUNDS.maxLat - SEOUL_BOUNDS.minLat) / GRID_RESOLUTION
    
    // Fill grid using ray casting algorithm
    for (let row = 0; row < GRID_RESOLUTION; row++) {
      for (let col = 0; col < GRID_RESOLUTION; col++) {
        const lng = SEOUL_BOUNDS.minLng + (col + 0.5) * cellWidth
        const lat = SEOUL_BOUNDS.minLat + (row + 0.5) * cellHeight
        const index = row * GRID_RESOLUTION + col
        
        // Check which district this point belongs to
        for (const feature of boundaryData.features) {
          if (isPointInFeature(lng, lat, feature)) {
            grid[index] = 1
            districtGrid[index] = districtMap.get(feature.properties.SGG_NM) || 0
            break
          }
        }
      }
    }
    
    const result: BoundaryGrid = {
      grid,
      districtGrid,
      districtNames,
      bounds: SEOUL_BOUNDS,
      cellWidth,
      cellHeight
    }
    
    cachedGrid = result
    
    const endTime = performance.now()
    console.log(`[BoundaryGrid] Pre-computed in ${(endTime - startTime).toFixed(1)}ms`)
    
    resolve(result)
  })

  return gridGenerationPromise
}

/**
 * Ultra-fast point-in-Seoul check using pre-computed grid
 * O(1) time complexity vs O(n) for polygon checks
 */
export function isPointInSeoulFast(lng: number, lat: number, grid: BoundaryGrid): boolean {
  // Quick bounds check
  if (lng < grid.bounds.minLng || lng > grid.bounds.maxLng ||
      lat < grid.bounds.minLat || lat > grid.bounds.maxLat) {
    return false
  }
  
  // Calculate grid cell
  const col = Math.floor((lng - grid.bounds.minLng) / grid.cellWidth)
  const row = Math.floor((lat - grid.bounds.minLat) / grid.cellHeight)
  
  // Bounds check for grid
  if (col < 0 || col >= GRID_RESOLUTION || row < 0 || row >= GRID_RESOLUTION) {
    return false
  }
  
  const index = row * GRID_RESOLUTION + col
  return grid.grid[index] === 1
}

/**
 * Get district name using pre-computed grid
 * O(1) time complexity
 */
export function getDistrictNameFast(lng: number, lat: number, grid: BoundaryGrid): string | null {
  if (!isPointInSeoulFast(lng, lat, grid)) {
    return null
  }
  
  const col = Math.floor((lng - grid.bounds.minLng) / grid.cellWidth)
  const row = Math.floor((lat - grid.bounds.minLat) / grid.cellHeight)
  const index = row * GRID_RESOLUTION + col
  const districtIndex = grid.districtGrid[index]
  
  return grid.districtNames[districtIndex] || null
}

/**
 * Helper function for point-in-polygon check
 */
function isPointInFeature(lng: number, lat: number, feature: SeoulBoundaryFeature): boolean {
  if (feature.geometry.type === 'Polygon') {
    const coordinates = feature.geometry.coordinates as number[][][]
    for (const ring of coordinates) {
      if (isPointInPolygon([lng, lat], ring)) {
        return true
      }
    }
  } else if (feature.geometry.type === 'MultiPolygon') {
    const coordinates = feature.geometry.coordinates as number[][][][]
    for (const polygon of coordinates) {
      for (const ring of polygon) {
        if (isPointInPolygon([lng, lat], ring)) {
          return true
        }
      }
    }
  }
  return false
}

/**
 * Ray casting algorithm for point-in-polygon
 */
function isPointInPolygon(point: [number, number], polygon: number[][]): boolean {
  const [x, y] = point
  let inside = false
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi)
    
    if (intersect) inside = !inside
  }
  
  return inside
}

/**
 * Generate stratified random points within Seoul
 * Uses grid-based sampling for better distribution
 */
export function generateStratifiedPoints(
  count: number,
  grid: BoundaryGrid
): Array<{ lng: number; lat: number; district: string | null }> {
  const points: Array<{ lng: number; lat: number; district: string | null }> = []
  const validCells: number[] = []
  
  // Find all valid cells
  for (let i = 0; i < GRID_SIZE; i++) {
    if (grid.grid[i] === 1) {
      validCells.push(i)
    }
  }
  
  if (validCells.length === 0) return points
  
  // Generate points with stratified sampling
  const pointsPerCell = Math.max(1, Math.floor(count / validCells.length))
  const extraPoints = count - (pointsPerCell * validCells.length)
  
  for (let i = 0; i < validCells.length && points.length < count; i++) {
    const cellIndex = validCells[i]
    const row = Math.floor(cellIndex / GRID_RESOLUTION)
    const col = cellIndex % GRID_RESOLUTION
    
    const cellPoints = i < extraPoints ? pointsPerCell + 1 : pointsPerCell
    
    for (let j = 0; j < cellPoints && points.length < count; j++) {
      // Random point within cell
      const lng = grid.bounds.minLng + (col + Math.random()) * grid.cellWidth
      const lat = grid.bounds.minLat + (row + Math.random()) * grid.cellHeight
      
      const districtIndex = grid.districtGrid[cellIndex]
      const district = grid.districtNames[districtIndex] || null
      
      points.push({ lng, lat, district })
    }
  }
  
  return points
}

/**
 * Pre-computed Seoul district centers for fast access
 */
export const DISTRICT_CENTERS: Record<string, [number, number]> = {
  '강남구': [127.0495, 37.5172],
  '강동구': [127.1237, 37.5301],
  '강북구': [127.0259, 37.6397],
  '강서구': [126.8496, 37.5509],
  '관악구': [126.9516, 37.4784],
  '광진구': [127.0826, 37.5385],
  '구로구': [126.8874, 37.4954],
  '금천구': [126.8956, 37.4568],
  '노원구': [127.0568, 37.6543],
  '도봉구': [127.0472, 37.6687],
  '동대문구': [127.0392, 37.5744],
  '동작구': [126.9392, 37.5125],
  '마포구': [126.9106, 37.5664],
  '서대문구': [126.9368, 37.5791],
  '서초구': [127.0327, 37.4837],
  '성동구': [127.0365, 37.5634],
  '성북구': [127.0185, 37.5894],
  '송파구': [127.1062, 37.5146],
  '양천구': [126.8666, 37.5172],
  '영등포구': [126.8963, 37.5264],
  '용산구': [126.9907, 37.5326],
  '은평구': [126.9292, 37.6027],
  '종로구': [126.9769, 37.5735],
  '중구': [126.9979, 37.5641],
  '중랑구': [127.0926, 37.6064]
}

export default {
  precomputeBoundaryGrid,
  isPointInSeoulFast,
  getDistrictNameFast,
  generateStratifiedPoints,
  DISTRICT_CENTERS
}