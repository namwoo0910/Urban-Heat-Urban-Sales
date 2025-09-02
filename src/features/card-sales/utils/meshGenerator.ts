/**
 * Mesh generation utility for creating triangulated mesh from Seoul district boundaries
 * Creates mesh geometry data for deck.gl SimpleMeshLayer
 */

import * as turf from '@turf/turf'

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
 * Generate a regular grid mesh covering the bounding box of features
 */
export function generateGridMesh(
  features: any[],
  options: MeshGeneratorOptions = {}
): MeshGeometry {
  const {
    resolution = 60,  // 60x60 grid by default for better boundary accuracy
    heightScale = 1,
    smoothing = true
  } = options

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

  // Add padding
  const padding = 0.01
  minX -= padding
  minY -= padding
  maxX += padding
  maxY += padding

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
      
      // Generate elevation
      let z = generateDummyElevation(x, y) * heightScale
      
      // Check if point is inside Seoul boundaries
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
      
      // Set zero elevation for points outside districts (creates clear boundary)
      if (!pointInDistrict) {
        z = 0  // Changed from 5 to 0 for clearer Seoul boundary
      }
      
      heightMap[row][col] = z
      
      // Set vertex colors with height-based gradient and alpha based on location
      const colorIdx = idx * 4
      if (pointInDistrict) {
        // Inside Seoul: height-based gradient with full opacity
        // Normalize height for color mapping (0 to 1)
        // Adjusted to match actual height range for full gradient utilization
        const normalizedHeight = Math.max(0, Math.min(1, z / 6000))
        
        // Create gradient from blue (low) to purple (mid) to red (high)
        let r, g, b
        if (normalizedHeight < 0.33) {
          // Blue to cyan (low elevations)
          const t = normalizedHeight / 0.33
          r = 0
          g = 100 + 155 * t  // 100 to 255
          b = 255
        } else if (normalizedHeight < 0.67) {
          // Cyan to purple (mid elevations)
          const t = (normalizedHeight - 0.33) / 0.34
          r = 120 * t  // 0 to 120
          g = 255 - 155 * t  // 255 to 100
          b = 255
        } else {
          // Purple to red/orange (high elevations)
          const t = (normalizedHeight - 0.67) / 0.33
          r = 120 + 135 * t  // 120 to 255
          g = 100 - 50 * t   // 100 to 50
          b = 255 - 155 * t  // 255 to 100
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

  // Apply smoothing if requested
  if (smoothing) {
    for (let iteration = 0; iteration < 2; iteration++) {
      const smoothedHeights: number[][] = []
      for (let row = 0; row < resolution; row++) {
        smoothedHeights[row] = []
        for (let col = 0; col < resolution; col++) {
          let sum = heightMap[row][col]
          let count = 1
          
          // Average with neighbors
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) continue
              const nr = row + dr
              const nc = col + dc
              if (nr >= 0 && nr < resolution && nc >= 0 && nc < resolution) {
                sum += heightMap[nr][nc]
                count++
              }
            }
          }
          
          smoothedHeights[row][col] = sum / count
        }
      }
      
      // Update positions and colors with smoothed heights
      for (let row = 0; row < resolution; row++) {
        for (let col = 0; col < resolution; col++) {
          const idx = (row * resolution + col)
          const smoothedZ = smoothedHeights[row][col]
          positions[idx * 3 + 2] = smoothedZ
          heightMap[row][col] = smoothedZ
          
          // Update colors based on new smoothed height
          if (insideMap[row][col]) {
            const colorIdx = idx * 4
            const normalizedHeight = Math.max(0, Math.min(1, smoothedZ / 6000))
            
            let r, g, b
            if (normalizedHeight < 0.33) {
              const t = normalizedHeight / 0.33
              r = 0
              g = 100 + 155 * t
              b = 255
            } else if (normalizedHeight < 0.67) {
              const t = (normalizedHeight - 0.33) / 0.34
              r = 120 * t
              g = 255 - 155 * t
              b = 255
            } else {
              const t = (normalizedHeight - 0.67) / 0.33
              r = 120 + 135 * t
              g = 100 - 50 * t
              b = 255 - 155 * t
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
      
      // Include triangles based on how many vertices are inside
      // If all 4 vertices are inside, include both triangles
      // If 3 vertices are inside, include both triangles (one will be on the boundary)
      // If 2 vertices are inside, only include if they form a valid triangle
      // If 1 or 0 vertices are inside, exclude
      
      if (insideCount >= 3) {
        // Most of the quad is inside, include both triangles
        tempIndices.push(topLeft, bottomLeft, topRight)
        tempIndices.push(topRight, bottomLeft, bottomRight)
      } else if (insideCount === 2) {
        // Check which triangles to include based on which vertices are inside
        // First triangle (top-left, bottom-left, top-right)
        if ((tlInside && blInside) || (tlInside && trInside) || (blInside && trInside)) {
          tempIndices.push(topLeft, bottomLeft, topRight)
        }
        
        // Second triangle (top-right, bottom-left, bottom-right)
        if ((trInside && blInside) || (trInside && brInside) || (blInside && brInside)) {
          tempIndices.push(topRight, bottomLeft, bottomRight)
        }
      }
      // If insideCount is 1 or 0, we don't include any triangles from this quad
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