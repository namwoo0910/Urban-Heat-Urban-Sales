// Seoul boundary utilities for GeoJSON parsing and point-in-polygon checking

export interface SeoulBoundaryFeature {
  type: string
  properties: {
    ADM_SECT_C: string
    SGG_NM: string
    SGG_OID: number
    COL_ADM_SE: string
  }
  geometry: {
    type: string
    coordinates: number[][][]
  }
}

export interface SeoulBoundaryData {
  type: string
  name: string
  features: SeoulBoundaryFeature[]
}

// Cache for loaded GeoJSON data
let cachedBoundaryData: SeoulBoundaryData | null = null

/**
 * Load Seoul boundary GeoJSON data
 */
export async function loadSeoulBoundaries(): Promise<SeoulBoundaryData> {
  if (cachedBoundaryData) {
    return cachedBoundaryData
  }

  try {
    const response = await fetch('/seoul_boundary.geojson')
    const data = await response.json()
    cachedBoundaryData = data
    return data
  } catch (error) {
    console.error('Failed to load Seoul boundaries:', error)
    throw error
  }
}

/**
 * Check if a point is inside a polygon using ray-casting algorithm
 * @param point [longitude, latitude]
 * @param polygon Array of [longitude, latitude] coordinates
 */
export function isPointInPolygon(point: [number, number], polygon: number[][]): boolean {
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
 * Check if a point is within Seoul boundaries
 * @param lng Longitude
 * @param lat Latitude
 * @param boundaryData Seoul boundary GeoJSON data
 */
export function isPointInSeoul(
  lng: number, 
  lat: number, 
  boundaryData: SeoulBoundaryData
): boolean {
  for (const feature of boundaryData.features) {
    if (feature.geometry.type === 'Polygon') {
      // For each polygon in the feature (including holes)
      for (const ring of feature.geometry.coordinates) {
        if (isPointInPolygon([lng, lat], ring)) {
          return true
        }
      }
    }
  }
  return false
}

/**
 * Get district name for a given point
 * @param lng Longitude
 * @param lat Latitude
 * @param boundaryData Seoul boundary GeoJSON data
 */
export function getDistrictName(
  lng: number,
  lat: number,
  boundaryData: SeoulBoundaryData
): string | null {
  for (const feature of boundaryData.features) {
    if (feature.geometry.type === 'Polygon') {
      for (const ring of feature.geometry.coordinates) {
        if (isPointInPolygon([lng, lat], ring)) {
          return feature.properties.SGG_NM
        }
      }
    }
  }
  return null
}

/**
 * Get bounding box for Seoul from GeoJSON data
 * @param boundaryData Seoul boundary GeoJSON data
 */
export function getSeoulBoundingBox(boundaryData: SeoulBoundaryData): {
  minLng: number
  maxLng: number
  minLat: number
  maxLat: number
} {
  let minLng = Infinity
  let maxLng = -Infinity
  let minLat = Infinity
  let maxLat = -Infinity

  for (const feature of boundaryData.features) {
    if (feature.geometry.type === 'Polygon') {
      for (const ring of feature.geometry.coordinates) {
        for (const [lng, lat] of ring) {
          minLng = Math.min(minLng, lng)
          maxLng = Math.max(maxLng, lng)
          minLat = Math.min(minLat, lat)
          maxLat = Math.max(maxLat, lat)
        }
      }
    }
  }

  return { minLng, maxLng, minLat, maxLat }
}

/**
 * Get all polygons as flat arrays for deck.gl
 */
export function getSeoulPolygons(boundaryData: SeoulBoundaryData): number[][][] {
  const polygons: number[][][] = []
  
  for (const feature of boundaryData.features) {
    if (feature.geometry.type === 'Polygon') {
      // Add the outer ring (first element)
      if (feature.geometry.coordinates[0]) {
        polygons.push(feature.geometry.coordinates[0])
      }
    }
  }
  
  return polygons
}

/**
 * Get district centers for animation anchors
 */
export function getDistrictCenters(boundaryData: SeoulBoundaryData): Array<{
  name: string
  center: [number, number]
}> {
  const centers: Array<{ name: string; center: [number, number] }> = []

  for (const feature of boundaryData.features) {
    if (feature.geometry.type === 'Polygon' && feature.geometry.coordinates[0]) {
      const ring = feature.geometry.coordinates[0]
      let sumLng = 0
      let sumLat = 0
      
      for (const [lng, lat] of ring) {
        sumLng += lng
        sumLat += lat
      }
      
      centers.push({
        name: feature.properties.SGG_NM,
        center: [sumLng / ring.length, sumLat / ring.length]
      })
    }
  }

  return centers
}