/**
 * Mesh generation utility for creating triangulated mesh from Seoul district boundaries
 * Creates mesh geometry data for deck.gl SimpleMeshLayer
 */

import * as turf from '@turf/turf'
import { getDongHeightBySales } from '@shared/utils/district3DUtils'

export interface MeshGeometry {
  positions: Float32Array  // 3D vertex positions (x, y, z) - raw array for mesh
  normals: Float32Array    // 3D normals for lighting - raw array for mesh
  texCoords: Float32Array  // 2D texture coordinates - raw array for mesh
  indices?: Uint32Array    // Triangle indices (optional for indexed geometry)
  colors?: Float32Array    // Vertex colors with alpha (r, g, b, a) - for boundary masking
  metadata?: {              // Optional metadata for positioning
    center?: {
      x: number
      y: number
    }
  }
}

export interface MeshGeneratorOptions {
  resolution?: number      // Grid resolution for mesh generation
  heightScale?: number     // Scale factor for elevation
  wireframe?: boolean      // Whether to generate wireframe mesh
  smoothing?: boolean      // Apply smoothing to heights
  dongBoundaries?: any[]   // Dong boundary GeoJSON features
  dongSalesMap?: Map<number, number>  // Map of dongCode to total sales
  salesHeightScale?: number  // Scale for converting sales to height (default: 100000000 = 1억원)
}

/**
 * Find which dong a point belongs to and return its sales data
 * @param x Longitude
 * @param y Latitude
 * @param dongBoundaries Dong boundary features
 * @param dongSalesMap Map of dongCode to sales
 * @returns Object with dongCode and sales, or null if not in any dong
 */
function findDongAndSales(
  x: number,
  y: number,
  dongBoundaries: any[],
  dongSalesMap?: Map<number, number>
): { dongCode: number; sales: number } | null {
  if (!dongBoundaries || dongBoundaries.length === 0) {
    return null
  }

  const point = turf.point([x, y])
  
  for (const feature of dongBoundaries) {
    try {
      if (turf.booleanPointInPolygon(point, feature)) {
        // Extract dong code from properties
        const dongCode = feature.properties?.['행정동코드'] || 
                        feature.properties?.H_CODE || 
                        feature.properties?.ADM_DR_CD ||
                        feature.properties?.dongCode ||
                        feature.properties?.dong_code ||
                        0
        
        const sales = dongSalesMap?.get(Number(dongCode)) || 0
        
        return { dongCode: Number(dongCode), sales }
      }
    } catch {
      // Skip invalid features
      continue
    }
  }
  
  return null
}

/**
 * Generate dummy elevation data for testing
 * Creates smooth wave-like patterns across the region
 */
function generateDummyElevation(
  x: number, 
  y: number,
  centerX: number = 126.978,
  centerY: number = 37.5765
): number {
  // Create multiple sine/cosine waves for interesting terrain
  const dx = (x - centerX) * 100
  const dy = (y - centerY) * 100
  
  // Primary wave pattern
  const wave1 = Math.sin(dx * 0.5) * Math.cos(dy * 0.5) * 200
  
  // Secondary wave for variation
  const wave2 = Math.sin(dx * 0.3 + 1) * Math.sin(dy * 0.3 + 1) * 150
  
  // Tertiary wave for detail
  const wave3 = Math.cos(dx * 0.7) * Math.sin(dy * 0.9) * 100
  
  // Distance from center affects height (bowl shape)
  const distance = Math.sqrt(dx * dx + dy * dy)
  const distanceFactor = Math.max(0, 1 - distance / 50) * 100
  
  // Combine all factors with some randomness
  const baseHeight = 100 + wave1 + wave2 * 0.5 + wave3 * 0.3 + distanceFactor
  
  // Add small random variation
  const randomFactor = (Math.random() - 0.5) * 20
  
  // Ensure positive height and apply bounds - increased for better visibility
  return Math.max(50, Math.min(1000, baseHeight + randomFactor))  // Increased min height for visibility
}

/**
 * Calculate distance to nearest boundary for boundary falloff
 * Returns a value between 0 (at boundary) and 1 (far from boundary)
 */
function calculateBoundaryDistance(
  row: number,
  col: number,
  insideMap: boolean[][],
  resolution: number
): number {
  // Check if this point is inside Seoul
  if (!insideMap[row][col]) {
    return 0 // Outside Seoul, distance is 0
  }
  
  // Check immediate neighbors (8-connected)
  const neighbors = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
  ]
  
  // Check if any neighbor is outside Seoul (making this a boundary point)
  for (const [dr, dc] of neighbors) {
    const nr = row + dr
    const nc = col + dc
    
    // If neighbor is out of grid bounds, consider it as boundary
    if (nr < 0 || nr >= resolution || nc < 0 || nc >= resolution) {
      // This point is at the edge of the grid
      return 0 // Boundary adjacent - height should be 0
    }
    
    // Check if neighbor is outside Seoul
    if (!insideMap[nr][nc]) {
      // This point is adjacent to boundary
      return 0 // Boundary adjacent - height should be 0
    }
  }
  
  // Check extended neighborhood for distance calculation
  // Maximum search radius (in grid cells)
  const maxRadius = Math.min(10, resolution / 10) // Adaptive based on resolution
  let minDistance = maxRadius
  
  for (let radius = 2; radius <= maxRadius; radius++) {
    // Check points at this radius
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        // Skip interior points
        if (Math.abs(dr) < radius && Math.abs(dc) < radius) continue
        
        const nr = row + dr
        const nc = col + dc
        
        if (nr >= 0 && nr < resolution && nc >= 0 && nc < resolution) {
          if (!insideMap[nr][nc]) {
            // Found boundary at this distance
            const distance = Math.sqrt(dr * dr + dc * dc)
            minDistance = Math.min(minDistance, distance)
          }
        }
      }
    }
    
    // If we found a boundary at this radius, stop searching
    if (minDistance < maxRadius) {
      break
    }
  }
  
  // Normalize distance to 0-1 range
  // Points closer than 5 grid cells to boundary will have falloff
  // Increased falloff distance for smoother transition
  const falloffDistance = 5.0
  return Math.min(1.0, minDistance / falloffDistance)
}

/**
 * Apply smooth falloff function for height near boundaries
 * Returns a factor between 0 (at boundary) and 1 (interior)
 */
function applyBoundaryFalloff(distanceFactor: number): number {
  // distanceFactor is 0 at boundary, 1 in interior
  if (distanceFactor <= 0) {
    return 0 // At boundary - height must be 0
  }
  if (distanceFactor >= 1.0) {
    return 1.0 // No falloff in interior
  }
  
  // Use cubic falloff for sharper transition at boundary
  // This ensures rapid drop to 0 near edges
  return Math.pow(distanceFactor, 3)
}

/**
 * Generate a regular grid mesh covering the bounding box of features
 */
export function generateGridMesh(
  features: any[],
  options: MeshGeneratorOptions = {}
): MeshGeometry {
  const {
    resolution = 100,  // 100x100 grid by default for better boundary accuracy (dynamic generation)
    heightScale = 1,
    smoothing = true,
    dongBoundaries,
    dongSalesMap,
    salesHeightScale = 100000000  // Default: 1억원 = 300 units height
  } = options
  
  // Check if we should use sales data
  const useSalesData = dongBoundaries && dongBoundaries.length > 0 && dongSalesMap && dongSalesMap.size > 0
  
  if (useSalesData) {
    console.log('[MeshGenerator] Using real sales data for mesh generation')
    console.log(`[MeshGenerator] - Dong boundaries: ${dongBoundaries.length} features`)
    console.log(`[MeshGenerator] - Sales data: ${dongSalesMap.size} dongs`)
    console.log(`[MeshGenerator] - Height scale: ${salesHeightScale}`)
    
    // Find missing dongs (in boundaries but not in sales data)
    const boundaryDongCodes = new Set<number>()
    dongBoundaries.forEach(feature => {
      const dongCode = feature.properties?.['행정동코드'] || 
                      feature.properties?.H_CODE || 
                      feature.properties?.ADM_DR_CD ||
                      feature.properties?.dongCode ||
                      feature.properties?.dong_code ||
                      0
      if (dongCode) {
        boundaryDongCodes.add(Number(dongCode))
      }
    })
    
    const missingInSales: number[] = []
    const missingInBoundaries: number[] = []
    
    // Check which dongs are missing sales data
    boundaryDongCodes.forEach(code => {
      if (!dongSalesMap.has(code)) {
        missingInSales.push(code)
      }
    })
    
    // Check which sales data don't have boundaries
    dongSalesMap.forEach((_, code) => {
      if (!boundaryDongCodes.has(code)) {
        missingInBoundaries.push(code)
      }
    })
    
    if (missingInSales.length > 0) {
      console.log(`[MeshGenerator] ⚠️ ${missingInSales.length} dongs have boundaries but no sales data:`, missingInSales)
    }
    if (missingInBoundaries.length > 0) {
      console.log(`[MeshGenerator] ⚠️ ${missingInBoundaries.length} dongs have sales data but no boundaries:`, missingInBoundaries)
    }
    
    // Log sample sales data
    const sampleSales = Array.from(dongSalesMap.entries()).slice(0, 3)
    sampleSales.forEach(([code, sales]) => {
      const height = getDongHeightBySales(sales, salesHeightScale)
      console.log(`[MeshGenerator] - Dong ${code}: ${(sales/100000000).toFixed(1)}억원 → height ${height.toFixed(0)}`)
    })
  } else {
    console.log('[MeshGenerator] Using dummy elevation data (no sales data provided)')
  }

  if (!features || features.length === 0) {
    return {
      positions: new Float32Array(0),
      normals: new Float32Array(0),
      texCoords: new Float32Array(0)
    }
  }

  // Calculate bounding box from all features
  let minX = Infinity, minY = Infinity
  let maxX = -Infinity, maxY = -Infinity

  features.forEach(feature => {
    const bbox = turf.bbox(feature)
    minX = Math.min(minX, bbox[0])
    minY = Math.min(minY, bbox[1])
    maxX = Math.max(maxX, bbox[2])
    maxY = Math.max(maxY, bbox[3])
  })

  // No padding - mesh should exactly match Seoul boundaries
  // const padding = 0.01
  // minX -= padding
  // minY -= padding
  // maxX += padding
  // maxY += padding

  const width = maxX - minX
  const height = maxY - minY

  // Filter valid features first (used throughout the function)
  const validFeatures = features.filter(feature => {
    try {
      // Check if feature has valid geometry
      if (!feature || !feature.geometry || !feature.geometry.coordinates) {
        return false
      }
      // Check if geometry is not empty
      const coords = feature.geometry.coordinates
      if (!coords || coords.length === 0) {
        return false
      }
      // Try to calculate area to ensure geometry is valid
      const area = turf.area(feature)
      return area > 0
    } catch {
      return false
    }
  })
  
  console.log(`[MeshGenerator] Valid features: ${validFeatures.length}/${features.length}`)
  
  // Skip union creation - it's causing too many issues
  // Instead, we'll use validFeatures directly for point-in-polygon checks
  // This is more reliable even if slightly slower
  const unifiedSeoulBoundary = null
  
  console.log('[MeshGenerator] Using individual feature checking for better reliability')

  // Create grid vertices
  const vertexCount = resolution * resolution
  const positions = new Float32Array(vertexCount * 3)
  const normals = new Float32Array(vertexCount * 3)
  const texCoords = new Float32Array(vertexCount * 2)
  const colors = new Float32Array(vertexCount * 4) // RGBA colors for each vertex
  
  // Height map for smoothing
  const heightMap: number[][] = []
  // Store whether each vertex is inside Seoul
  const insideMap: boolean[][] = []

  // Generate vertices
  for (let row = 0; row < resolution; row++) {
    heightMap[row] = []
    insideMap[row] = []
    for (let col = 0; col < resolution; col++) {
      const idx = (row * resolution + col)
      const u = col / (resolution - 1)
      const v = row / (resolution - 1)
      
      const x = minX + width * u
      const y = minY + height * v
      
      // Check if point is inside Seoul boundaries first
      let pointInDistrict = false
      
      if (unifiedSeoulBoundary) {
        // Fast check against unified boundary
        try {
          const point = turf.point([x, y])
          pointInDistrict = turf.booleanPointInPolygon(point, unifiedSeoulBoundary)
        } catch {
          pointInDistrict = false
        }
      } else {
        // Fallback to checking individual districts (slower)
        // Use validFeatures if available, otherwise use original features
        const featuresToCheck = validFeatures.length > 0 ? validFeatures : features
        pointInDistrict = featuresToCheck.some(feature => {
          try {
            const point = turf.point([x, y])
            return turf.booleanPointInPolygon(point, feature)
          } catch {
            return false
          }
        })
      }
      
      // Store whether point is inside Seoul
      insideMap[row][col] = pointInDistrict
      
      // Generate elevation based on sales data or dummy data
      let z = 0
      if (pointInDistrict) {
        if (useSalesData) {
          // Use real sales data for height
          const dongInfo = findDongAndSales(x, y, dongBoundaries, dongSalesMap)
          if (dongInfo && dongInfo.sales > 0) {
            // Use sales-based height calculation
            z = getDongHeightBySales(dongInfo.sales, salesHeightScale)
          } else {
            // Point is in Seoul but not in a dong with sales data - use minimal height
            z = 10
          }
        } else {
          // Use dummy elevation for testing
          z = generateDummyElevation(x, y) * heightScale
        }
      }
      
      heightMap[row][col] = z
      
      // Set vertex colors with height-based gradient and alpha based on location
      const colorIdx = idx * 4
      if (pointInDistrict) {
        // Inside Seoul: height-based gradient with full opacity
        // Normalize height for color mapping (0 to 1)
        // Adjusted to match actual height range for full gradient utilization
        const normalizedHeight = Math.max(0, Math.min(1, z / 6000))
        
        // Create bright modern gradient: cyan → teal → mint → lime → yellow → orange
        let r, g, b
        if (normalizedHeight < 0.2) {
          // Low elevations: bright cyan to teal
          const t = normalizedHeight / 0.2
          r = 0                    // 0 (no red)
          g = 212 + 43 * t         // 212 to 255 (cyan to teal green)
          b = 255 - 30 * t         // 255 to 225 (slight reduction)
        } else if (normalizedHeight < 0.4) {
          // Mid-low: teal to mint green
          const t = (normalizedHeight - 0.2) / 0.2
          r = 0 + 50 * t           // 0 to 50 (slight red addition)
          g = 255                  // 255 (max green)
          b = 225 - 77 * t         // 225 to 148 (reducing blue)
        } else if (normalizedHeight < 0.6) {
          // Mid: mint green to lime
          const t = (normalizedHeight - 0.4) / 0.2
          r = 50 + 98 * t          // 50 to 148 (increasing red for lime)
          g = 255                  // 255 (max green)
          b = 148 - 148 * t        // 148 to 0 (removing blue)
        } else if (normalizedHeight < 0.8) {
          // Mid-high: lime to bright yellow
          const t = (normalizedHeight - 0.6) / 0.2
          r = 148 + 107 * t        // 148 to 255 (max red for yellow)
          g = 255 - 26 * t         // 255 to 229 (slight green reduction)
          b = 0                    // 0 (no blue)
        } else {
          // High elevations: yellow to bright orange
          const t = (normalizedHeight - 0.8) / 0.2
          r = 255                  // 255 (max red)
          g = 229 - 89 * t         // 229 to 140 (orange)
          b = 0                    // 0 (no blue)
        }
        
        colors[colorIdx] = r / 255     // R
        colors[colorIdx + 1] = g / 255 // G
        colors[colorIdx + 2] = b / 255 // B
        colors[colorIdx + 3] = 1.0     // A (full opacity)
      } else {
        // Outside Seoul: transparent
        colors[colorIdx] = 0      // R
        colors[colorIdx + 1] = 0  // G
        colors[colorIdx + 2] = 0  // B
        colors[colorIdx + 3] = 0  // A (fully transparent)
      }
      
      // Set vertex position (converted to meters from center with correct latitude scaling)
      const centerX = (minX + maxX) / 2
      const centerY = (minY + maxY) / 2
      
      // At Seoul's latitude (37.5°N), correct scale factors:
      // Latitude: 111000 meters per degree (constant)
      // Longitude: 111000 * cos(37.5°) ≈ 88000 meters per degree
      const latScale = 111000
      const lonScale = 111000 * Math.cos(centerY * Math.PI / 180) // Correct for latitude
      
      positions[idx * 3] = (x - centerX) * lonScale     // Convert to meters with latitude correction
      positions[idx * 3 + 1] = (y - centerY) * latScale  // Convert to meters
      positions[idx * 3 + 2] = z
      
      // Set texture coordinates
      texCoords[idx * 2] = u
      texCoords[idx * 2 + 1] = v
    }
  }

  // Apply smoothing if requested (but preserve boundary falloff)
  if (smoothing) {
    // Use fewer iterations and gentler smoothing for sales data to preserve dong boundaries
    const iterations = useSalesData ? 1 : 2
    const smoothingFactor = useSalesData ? 0.3 : 0.5  // Less aggressive smoothing for sales data
    
    for (let iteration = 0; iteration < iterations; iteration++) {
      const smoothedHeights: number[][] = []
      for (let row = 0; row < resolution; row++) {
        smoothedHeights[row] = []
        for (let col = 0; col < resolution; col++) {
          // Don't smooth if outside Seoul
          if (!insideMap[row][col]) {
            smoothedHeights[row][col] = 0
            continue
          }
          
          let sum = 0
          let count = 0
          const originalHeight = heightMap[row][col]
          
          // Average with neighbors (only inside Seoul)
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = row + dr
              const nc = col + dc
              if (nr >= 0 && nr < resolution && nc >= 0 && nc < resolution && insideMap[nr][nc]) {
                // Apply distance-based weights
                const weight = (dr === 0 && dc === 0) ? 4 : (dr === 0 || dc === 0) ? 2 : 1
                sum += heightMap[nr][nc] * weight
                count += weight
              }
            }
          }
          
          // Blend original with smoothed value
          const smoothedValue = count > 0 ? sum / count : originalHeight
          smoothedHeights[row][col] = originalHeight * (1 - smoothingFactor) + smoothedValue * smoothingFactor
        }
      }
      
      // Update positions and colors with smoothed heights (but reapply boundary falloff)
      for (let row = 0; row < resolution; row++) {
        for (let col = 0; col < resolution; col++) {
          if (!insideMap[row][col]) continue
          
          const idx = (row * resolution + col)
          let smoothedZ = smoothedHeights[row][col]
          
          // Reapply boundary falloff after smoothing
          const boundaryDistance = calculateBoundaryDistance(row, col, insideMap, resolution)
          const falloffFactor = applyBoundaryFalloff(boundaryDistance)
          smoothedZ *= falloffFactor
          
          positions[idx * 3 + 2] = smoothedZ
          heightMap[row][col] = smoothedZ
          
          // Update colors based on new smoothed height
          if (insideMap[row][col]) {
            const colorIdx = idx * 4
            const normalizedHeight = Math.max(0, Math.min(1, smoothedZ / 6000))
            
            let r, g, b
            if (normalizedHeight < 0.2) {
              const t = normalizedHeight / 0.2
              r = 0
              g = 212 + 43 * t
              b = 255 - 30 * t
            } else if (normalizedHeight < 0.4) {
              const t = (normalizedHeight - 0.2) / 0.2
              r = 0 + 50 * t
              g = 255
              b = 225 - 77 * t
            } else if (normalizedHeight < 0.6) {
              const t = (normalizedHeight - 0.4) / 0.2
              r = 50 + 98 * t
              g = 255
              b = 148 - 148 * t
            } else if (normalizedHeight < 0.8) {
              const t = (normalizedHeight - 0.6) / 0.2
              r = 148 + 107 * t
              g = 255 - 26 * t
              b = 0
            } else {
              const t = (normalizedHeight - 0.8) / 0.2
              r = 255
              g = 229 - 89 * t
              b = 0
            }
            
            colors[colorIdx] = r / 255
            colors[colorIdx + 1] = g / 255
            colors[colorIdx + 2] = b / 255
            colors[colorIdx + 3] = 1.0
          }
        }
      }
    }
  }

  // Apply boundary falloff to smooth edges to ground level
  console.log('[MeshGenerator] Applying boundary falloff...')
  for (let row = 0; row < resolution; row++) {
    for (let col = 0; col < resolution; col++) {
      if (insideMap[row][col] && heightMap[row][col] > 0) {
        // Calculate distance to boundary
        const boundaryDistance = calculateBoundaryDistance(row, col, insideMap, resolution)
        
        // Apply falloff
        const falloffFactor = applyBoundaryFalloff(boundaryDistance)
        heightMap[row][col] *= falloffFactor
        
        // Update vertex z position
        const idx = row * resolution + col
        positions[idx * 3 + 2] = heightMap[row][col]
        
        // Update colors based on new height
        const z = heightMap[row][col]
        const normalizedHeight = Math.max(0, Math.min(1, z / 6000))
        
        const colorIdx = idx * 4
        let r, g, b
        if (normalizedHeight < 0.2) {
          const t = normalizedHeight / 0.2
          r = 0
          g = 212 + 43 * t
          b = 255 - 30 * t
        } else if (normalizedHeight < 0.4) {
          const t = (normalizedHeight - 0.2) / 0.2
          r = 0 + 50 * t
          g = 255
          b = 225 - 77 * t
        } else if (normalizedHeight < 0.6) {
          const t = (normalizedHeight - 0.4) / 0.2
          r = 50 + 98 * t
          g = 255
          b = 148 - 148 * t
        } else if (normalizedHeight < 0.8) {
          const t = (normalizedHeight - 0.6) / 0.2
          r = 148 + 107 * t
          g = 255 - 26 * t
          b = 0
        } else {
          const t = (normalizedHeight - 0.8) / 0.2
          r = 255
          g = 229 - 89 * t
          b = 0
        }
        
        colors[colorIdx] = r / 255
        colors[colorIdx + 1] = g / 255
        colors[colorIdx + 2] = b / 255
        colors[colorIdx + 3] = 1.0
      }
    }
  }
  
  // Calculate normals
  for (let row = 0; row < resolution; row++) {
    for (let col = 0; col < resolution; col++) {
      const idx = (row * resolution + col)
      
      // Get neighboring heights for normal calculation
      const h = heightMap[row][col]
      const hLeft = col > 0 ? heightMap[row][col - 1] : h
      const hRight = col < resolution - 1 ? heightMap[row][col + 1] : h
      const hUp = row > 0 ? heightMap[row - 1][col] : h
      const hDown = row < resolution - 1 ? heightMap[row + 1][col] : h
      
      // Calculate normal using central differences (accounting for meter conversion)
      // Need to use the same scale factors as vertex positions
      const centerY = (minY + maxY) / 2
      const latScale = 111000
      const lonScale = 111000 * Math.cos(centerY * Math.PI / 180)
      
      const dx = (hRight - hLeft) / (width * lonScale / resolution) 
      const dy = (hDown - hUp) / (height * latScale / resolution)
      
      // Normal vector (pointing up)
      const nx = -dx
      const ny = -dy
      const nz = 1
      
      // Normalize
      const length = Math.sqrt(nx * nx + ny * ny + nz * nz)
      normals[idx * 3] = nx / length
      normals[idx * 3 + 1] = ny / length
      normals[idx * 3 + 2] = nz / length
    }
  }

  // Generate triangle indices only for triangles inside Seoul boundaries
  const tempIndices: number[] = []

  for (let row = 0; row < resolution - 1; row++) {
    for (let col = 0; col < resolution - 1; col++) {
      const topLeft = row * resolution + col
      const topRight = topLeft + 1
      const bottomLeft = (row + 1) * resolution + col
      const bottomRight = bottomLeft + 1

      // Check if vertices of the quad are inside Seoul
      const tlInside = insideMap[row][col]
      const trInside = insideMap[row][col + 1]
      const blInside = insideMap[row + 1][col]
      const brInside = insideMap[row + 1][col + 1]
      
      // Count how many vertices are inside
      const insideCount = (tlInside ? 1 : 0) + (trInside ? 1 : 0) + 
                          (blInside ? 1 : 0) + (brInside ? 1 : 0)
      
      // Only include triangles where ALL vertices are inside Seoul
      // This creates a clean boundary with no partial triangles extending outside
      // The boundary will be stepped at the mesh resolution, but no lines will extend outside
      
      if (insideCount === 4) {
        // All 4 vertices are inside Seoul - include both triangles
        tempIndices.push(topLeft, bottomLeft, topRight)
        tempIndices.push(topRight, bottomLeft, bottomRight)
      }
      // If any vertex is outside (insideCount < 4), don't create any triangles
      // This prevents wireframe edges from extending to the boundary
    }
  }

  // Convert to Uint32Array
  const indices = new Uint32Array(tempIndices)

  // Log simplified mesh info
  console.log(`[MeshGenerator] Mesh: ${indices.length / 3} triangles, ${resolution}x${resolution} grid`)
  
  // Return raw TypedArrays as expected by SimpleMeshLayer mesh property
  return {
    positions,  // Raw Float32Array
    normals,    // Raw Float32Array
    texCoords,  // Raw Float32Array
    indices,    // Raw Uint32Array
    colors      // Raw Float32Array with RGBA values
  }
}

/**
 * Generate a triangulated mesh from district polygons using Delaunay triangulation
 */
export function generateTriangulatedMesh(
  features: any[],
  options: MeshGeneratorOptions = {}
): MeshGeometry {
  // For now, use grid mesh as it's more suitable for terrain visualization
  // Delaunay triangulation of complex polygons would require more complex implementation
  return generateGridMesh(features, options)
}

/**
 * Get unified Seoul boundary polygon from district features
 */
export function getUnifiedSeoulBoundary(features: any[]): any {
  if (!features || features.length === 0) {
    return null
  }

  console.time('[MeshGenerator] Creating unified Seoul boundary')
  let unifiedBoundary = null
  
  try {
    // Start with first feature
    unifiedBoundary = features[0]
    
    // Union with remaining features
    for (let i = 1; i < features.length; i++) {
      try {
        unifiedBoundary = turf.union(
          unifiedBoundary,
          features[i]
        )
      } catch (err) {
        console.warn(`[MeshGenerator] Failed to union feature ${i}:`, err)
      }
    }
    
    console.timeEnd('[MeshGenerator] Creating unified Seoul boundary')
    console.log('[MeshGenerator] Created unified boundary from', features.length, 'districts')
    
    return unifiedBoundary
  } catch (err) {
    console.error('[MeshGenerator] Failed to create unified boundary:', err)
    return null
  }
}

/**
 * Convert height value to color for visualization
 */
export function getHeightColor(
  height: number,
  minHeight: number = 0,
  maxHeight: number = 500
): [number, number, number, number] {
  const normalized = Math.max(0, Math.min(1, (height - minHeight) / (maxHeight - minHeight)))
  
  // Color gradient from blue (low) to green (medium) to red (high)
  let r, g, b
  
  if (normalized < 0.5) {
    // Blue to green
    const t = normalized * 2
    r = 0
    g = Math.floor(255 * t)
    b = Math.floor(255 * (1 - t))
  } else {
    // Green to red
    const t = (normalized - 0.5) * 2
    r = Math.floor(255 * t)
    g = Math.floor(255 * (1 - t))
    b = 0
  }
  
  return [r, g, b, 220]
}