/**
 * Mesh generation utility for creating triangulated mesh from Seoul district boundaries
 * Creates mesh geometry data for deck.gl SimpleMeshLayer
 */

import * as turf from '@turf/turf'

export interface MeshGeometry {
  positions: { value: Float32Array; size: number }  // 3D vertex positions (x, y, z)
  normals: { value: Float32Array; size: number }    // 3D normals for lighting
  texCoords: { value: Float32Array; size: number }  // 2D texture coordinates
  indices?: Uint32Array    // Triangle indices (optional for indexed geometry)
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
  
  // Ensure positive height and apply bounds
  return Math.max(10, Math.min(500, baseHeight + randomFactor))
}

/**
 * Generate a regular grid mesh covering the bounding box of features
 */
export function generateGridMesh(
  features: any[],
  options: MeshGeneratorOptions = {}
): MeshGeometry {
  const {
    resolution = 30,  // 30x30 grid by default (reduced for performance)
    heightScale = 1,
    smoothing = true
  } = options

  if (!features || features.length === 0) {
    return {
      positions: { value: new Float32Array(0), size: 3 },
      normals: { value: new Float32Array(0), size: 3 },
      texCoords: { value: new Float32Array(0), size: 2 }
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

  console.time('[MeshGenerator] Union creation')
  // Create a single unified polygon from all districts for faster point-in-polygon checks
  let unifiedSeoulBoundary = null
  try {
    // Start with first feature
    unifiedSeoulBoundary = features[0]
    
    // Union with remaining features
    for (let i = 1; i < features.length; i++) {
      try {
        unifiedSeoulBoundary = turf.union(
          unifiedSeoulBoundary,
          features[i]
        )
      } catch (err) {
        console.warn(`[MeshGenerator] Failed to union feature ${i}:`, err)
      }
    }
    console.timeEnd('[MeshGenerator] Union creation')
    console.log('[MeshGenerator] Created unified boundary from', features.length, 'districts')
  } catch (err) {
    console.error('[MeshGenerator] Failed to create unified boundary:', err)
    // Fall back to individual checks if union fails
    unifiedSeoulBoundary = null
  }

  // Create grid vertices
  const vertexCount = resolution * resolution
  const positions = new Float32Array(vertexCount * 3)
  const normals = new Float32Array(vertexCount * 3)
  const texCoords = new Float32Array(vertexCount * 2)
  
  // Height map for smoothing
  const heightMap: number[][] = []

  console.time('[MeshGenerator] Vertex generation')
  // Generate vertices
  for (let row = 0; row < resolution; row++) {
    heightMap[row] = []
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
        pointInDistrict = features.some(feature => {
          try {
            const point = turf.point([x, y])
            return turf.booleanPointInPolygon(point, feature)
          } catch {
            return false
          }
        })
      }
      
      // Set zero elevation for points outside districts (creates clear boundary)
      if (!pointInDistrict) {
        z = 0  // Changed from 5 to 0 for clearer Seoul boundary
      }
      
      heightMap[row][col] = z
      
      // Set vertex position (converted to meters from center)
      const centerX = (minX + maxX) / 2
      const centerY = (minY + maxY) / 2
      
      positions[idx * 3] = (x - centerX) * 111000     // Convert to meters
      positions[idx * 3 + 1] = (y - centerY) * 111000  // Convert to meters
      positions[idx * 3 + 2] = z
      
      // Set texture coordinates
      texCoords[idx * 2] = u
      texCoords[idx * 2 + 1] = v
    }
  }
  console.timeEnd('[MeshGenerator] Vertex generation')

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
      
      // Update positions with smoothed heights
      for (let row = 0; row < resolution; row++) {
        for (let col = 0; col < resolution; col++) {
          const idx = (row * resolution + col)
          positions[idx * 3 + 2] = smoothedHeights[row][col]
          heightMap[row][col] = smoothedHeights[row][col]
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
      
      // Calculate normal using central differences
      const dx = (hRight - hLeft) / (width * 111000 / resolution) 
      const dy = (hDown - hUp) / (height * 111000 / resolution)
      
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

  // Generate triangle indices for indexed rendering
  const indexCount = (resolution - 1) * (resolution - 1) * 6
  const indices = new Uint32Array(indexCount)
  let indexPtr = 0

  for (let row = 0; row < resolution - 1; row++) {
    for (let col = 0; col < resolution - 1; col++) {
      const topLeft = row * resolution + col
      const topRight = topLeft + 1
      const bottomLeft = (row + 1) * resolution + col
      const bottomRight = bottomLeft + 1

      // First triangle
      indices[indexPtr++] = topLeft
      indices[indexPtr++] = bottomLeft
      indices[indexPtr++] = topRight

      // Second triangle
      indices[indexPtr++] = topRight
      indices[indexPtr++] = bottomLeft
      indices[indexPtr++] = bottomRight
    }
  }

  // Validate array sizes before returning
  console.log('[MeshGenerator] Generated mesh:', {
    vertices: positions.length / 3,
    normals: normals.length / 3,
    texCoords: texCoords.length / 2,
    triangles: indices ? indices.length / 3 : 0,
    resolution,
    gridSize: `${resolution}x${resolution}`
  })
  
  // Return in the format expected by SimpleMeshLayer
  return {
    positions: { value: positions, size: 3 },
    normals: { value: normals, size: 3 },
    texCoords: { value: texCoords, size: 2 },
    indices
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