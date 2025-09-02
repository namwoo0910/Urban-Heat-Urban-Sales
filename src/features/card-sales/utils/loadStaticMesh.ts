/**
 * Utility to load and cache pre-generated Seoul mesh data
 */

import { MeshGeometry } from './meshGenerator'

interface StaticMeshData {
  positions: number[]
  normals: number[]
  texCoords: number[]
  colors: number[]
  indices: number[]
  metadata: {
    resolution: number
    vertices: number
    triangles: number
    bounds: {
      minX: number
      maxX: number
      minY: number
      maxY: number
    }
    center: {
      x: number
      y: number
    }
    generated: string
    source: string
  }
}

// Cache for loaded mesh data
let cachedMeshData: MeshGeometry | null = null
let loadingPromise: Promise<MeshGeometry> | null = null

/**
 * Load pre-generated Seoul mesh data from static JSON file
 * Uses caching to avoid multiple fetches
 */
export async function loadStaticSeoulMesh(): Promise<MeshGeometry> {
  // Return cached data if available
  if (cachedMeshData) {
    console.log('[LoadStaticMesh] Using cached mesh data')
    return cachedMeshData
  }

  // If already loading, wait for the existing promise
  if (loadingPromise) {
    console.log('[LoadStaticMesh] Waiting for existing load operation')
    return loadingPromise
  }

  // Start loading
  loadingPromise = (async () => {
    try {
      console.log('[LoadStaticMesh] Fetching seoul-mesh-120.json...')
      const response = await fetch('/data/seoul-mesh-120.json')
      
      if (!response.ok) {
        throw new Error(`Failed to load mesh data: ${response.status}`)
      }

      const data: StaticMeshData = await response.json()
      
      console.log('[LoadStaticMesh] Converting to TypedArrays...')
      
      // Convert arrays to TypedArrays for WebGL
      const meshGeometry: MeshGeometry = {
        positions: new Float32Array(data.positions),
        normals: new Float32Array(data.normals),
        texCoords: new Float32Array(data.texCoords),
        colors: new Float32Array(data.colors),
        indices: new Uint32Array(data.indices),
        metadata: {
          center: data.metadata.center
        }
      }

      console.log(`[LoadStaticMesh] Loaded mesh: ${data.metadata.triangles} triangles, ${data.metadata.resolution}x${data.metadata.resolution} grid`)
      
      // Cache the result
      cachedMeshData = meshGeometry
      loadingPromise = null
      
      return meshGeometry
    } catch (error) {
      console.error('[LoadStaticMesh] Failed to load static mesh:', error)
      loadingPromise = null
      throw error
    }
  })()

  return loadingPromise
}

/**
 * Clear cached mesh data (useful for development/testing)
 */
export function clearMeshCache(): void {
  cachedMeshData = null
  loadingPromise = null
  console.log('[LoadStaticMesh] Cache cleared')
}

/**
 * Check if static mesh file exists
 */
export async function checkStaticMeshExists(): Promise<boolean> {
  try {
    const response = await fetch('/data/seoul-mesh-120.json', { method: 'HEAD' })
    return response.ok
  } catch {
    return false
  }
}