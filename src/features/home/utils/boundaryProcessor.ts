// Simplified boundary processor for particle generation
// Only includes functions needed for particle map

import type { Feature, Polygon, MultiPolygon, Position } from 'geojson'

export interface SeoulBoundaryData {
  type: 'FeatureCollection'
  features: Feature<Polygon | MultiPolygon>[]
}

export interface BoundaryGrid {
  bounds: {
    minX: number
    maxX: number
    minY: number
    maxY: number
  }
  width: number
  height: number
  cellSize: number
  cells: Map<string, boolean>
}

// District center coordinates for particle generation
export const DISTRICT_CENTERS: Record<string, [number, number]> = {
  '강남구': [127.0495, 37.5172],
  '강동구': [127.1237, 37.5301],
  '강북구': [127.0258, 37.6396],
  '강서구': [126.8497, 37.5509],
  '관악구': [126.9519, 37.4783],
  '광진구': [127.0824, 37.5384],
  '구로구': [126.8874, 37.4954],
  '금천구': [126.8956, 37.4567],
  '노원구': [127.0568, 37.6542],
  '도봉구': [127.0472, 37.6688],
  '동대문구': [127.0397, 37.5744],
  '동작구': [126.9393, 37.5124],
  '마포구': [126.9018, 37.5663],
  '서대문구': [126.9368, 37.5791],
  '서초구': [127.0327, 37.4837],
  '성동구': [127.0369, 37.5634],
  '성북구': [127.0168, 37.5894],
  '송파구': [127.1067, 37.5145],
  '양천구': [126.8665, 37.5170],
  '영등포구': [126.8963, 37.5264],
  '용산구': [126.9907, 37.5324],
  '은평구': [126.9290, 37.6027],
  '종로구': [126.9782, 37.5735],
  '중구': [126.9978, 37.5641],
  '중랑구': [127.0928, 37.6063]
}

// Check if a point is inside a polygon
function isPointInPolygon(point: [number, number], polygon: Position[]): boolean {
  const [x, y] = point
  let inside = false

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1]
    const xj = polygon[j][0], yj = polygon[j][1]

    const intersect = ((yi > y) !== (yj > y))
      && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)
    if (intersect) inside = !inside
  }

  return inside
}

// Check if a point is inside the Seoul boundary
export function isPointInSeoul(point: [number, number], boundaryData: SeoulBoundaryData): boolean {
  for (const feature of boundaryData.features) {
    const geometry = feature.geometry

    if (geometry.type === 'Polygon') {
      // Check outer ring
      if (isPointInPolygon(point, geometry.coordinates[0])) {
        // Check holes
        let inHole = false
        for (let i = 1; i < geometry.coordinates.length; i++) {
          if (isPointInPolygon(point, geometry.coordinates[i])) {
            inHole = true
            break
          }
        }
        if (!inHole) return true
      }
    } else if (geometry.type === 'MultiPolygon') {
      for (const polygon of geometry.coordinates) {
        if (isPointInPolygon(point, polygon[0])) {
          let inHole = false
          for (let i = 1; i < polygon.length; i++) {
            if (isPointInPolygon(point, polygon[i])) {
              inHole = true
              break
            }
          }
          if (!inHole) return true
        }
      }
    }
  }

  return false
}

// Precompute a grid for faster point-in-polygon tests
export async function precomputeBoundaryGrid(boundaryData: SeoulBoundaryData): Promise<BoundaryGrid> {
  const cellSize = 0.002 // ~200m cells
  let minX = Infinity, maxX = -Infinity
  let minY = Infinity, maxY = -Infinity

  // Find bounds
  for (const feature of boundaryData.features) {
    const geometry = feature.geometry
    const coords = geometry.type === 'Polygon'
      ? geometry.coordinates[0]
      : geometry.coordinates.flat(2)

    for (const [lon, lat] of coords) {
      minX = Math.min(minX, lon)
      maxX = Math.max(maxX, lon)
      minY = Math.min(minY, lat)
      maxY = Math.max(maxY, lat)
    }
  }

  const width = Math.ceil((maxX - minX) / cellSize)
  const height = Math.ceil((maxY - minY) / cellSize)
  const cells = new Map<string, boolean>()

  // Sample each cell
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const lon = minX + (x + 0.5) * cellSize
      const lat = minY + (y + 0.5) * cellSize
      const key = `${x},${y}`
      cells.set(key, isPointInSeoul([lon, lat], boundaryData))
    }
  }

  return {
    bounds: { minX, maxX, minY, maxY },
    width,
    height,
    cellSize,
    cells
  }
}

// Generate stratified random points within Seoul boundaries
export function generateStratifiedPoints(count: number, grid: BoundaryGrid): Array<[number, number]> {
  const points: Array<[number, number]> = []
  const { bounds, cellSize, cells, width, height } = grid

  // Get all valid cells
  const validCells: Array<[number, number]> = []
  cells.forEach((isValid, key) => {
    if (isValid) {
      const [x, y] = key.split(',').map(Number)
      validCells.push([x, y])
    }
  })

  if (validCells.length === 0) {
    // Fallback to district centers
    const centers = Object.values(DISTRICT_CENTERS)
    for (let i = 0; i < count; i++) {
      points.push(centers[i % centers.length])
    }
    return points
  }

  // Distribute points across valid cells
  const pointsPerCell = Math.max(1, Math.floor(count / validCells.length))
  const extraPoints = count - (pointsPerCell * validCells.length)

  for (let i = 0; i < validCells.length && points.length < count; i++) {
    const [cellX, cellY] = validCells[i]
    const cellPoints = i < extraPoints ? pointsPerCell + 1 : pointsPerCell

    for (let j = 0; j < cellPoints && points.length < count; j++) {
      const lon = bounds.minX + (cellX + Math.random()) * cellSize
      const lat = bounds.minY + (cellY + Math.random()) * cellSize
      points.push([lon, lat])
    }
  }

  return points
}