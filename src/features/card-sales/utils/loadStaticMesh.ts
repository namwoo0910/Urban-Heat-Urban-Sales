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

// Cache for loaded mesh data by resolution
const meshCacheByResolution = new Map<number, MeshGeometry>()
const loadingPromises = new Map<number, Promise<MeshGeometry>>()

// Pre-generated resolutions available
export const PREGENERATED_RESOLUTIONS = [30, 60, 90, 120, 200]

/**
 * Check if a pre-generated mesh exists for the given resolution
 */
export function hasPreGeneratedMesh(resolution: number): boolean {
  return PREGENERATED_RESOLUTIONS.includes(resolution)
}

/**
 * Load pre-generated Seoul mesh data from static JSON file
 * Uses caching to avoid multiple fetches
 * 
 * @param resolution - The resolution to load (30, 60, 90, 120, or 200)
 */
export async function loadStaticSeoulMesh(resolution: number = 60): Promise<MeshGeometry> {
  // Return cached data if available
  if (meshCacheByResolution.has(resolution)) {
    console.log(`[LoadStaticMesh] Using cached mesh data for resolution ${resolution}`)
    return meshCacheByResolution.get(resolution)!
  }

  // If already loading this resolution, wait for the existing promise
  if (loadingPromises.has(resolution)) {
    console.log(`[LoadStaticMesh] Waiting for existing load operation for resolution ${resolution}`)
    return loadingPromises.get(resolution)!
  }

  // Check if this resolution is available as pre-generated
  if (!hasPreGeneratedMesh(resolution)) {
    throw new Error(`No pre-generated mesh available for resolution ${resolution}. Available: ${PREGENERATED_RESOLUTIONS.join(', ')}`)
  }

  // Start loading
  const loadingPromise = (async () => {
    try {
      const filename = `/data/seoul-mesh-${resolution}.json`
      console.log(`[LoadStaticMesh] Fetching ${filename}...`)
      const response = await fetch(filename)
      
      if (!response.ok) {
        throw new Error(`Failed to load mesh data: ${response.status}`)
      }

      const data: StaticMeshData = await response.json()
      
      console.log(`[LoadStaticMesh] Converting to TypedArrays for resolution ${resolution}...`)
      
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
      meshCacheByResolution.set(resolution, meshGeometry)
      loadingPromises.delete(resolution)
      
      return meshGeometry
    } catch (error) {
      console.error(`[LoadStaticMesh] Failed to load static mesh for resolution ${resolution}:`, error)
      loadingPromises.delete(resolution)
      throw error
    }
  })()

  loadingPromises.set(resolution, loadingPromise)
  return loadingPromise
}

/**
 * Clear cached mesh data (useful for development/testing)
 * Can clear a specific resolution or all cached data
 */
export function clearMeshCache(resolution?: number): void {
  if (resolution !== undefined) {
    meshCacheByResolution.delete(resolution)
    loadingPromises.delete(resolution)
    console.log(`[LoadStaticMesh] Cache cleared for resolution ${resolution}`)
  } else {
    meshCacheByResolution.clear()
    loadingPromises.clear()
    console.log('[LoadStaticMesh] All cache cleared')
  }
}

/**
 * Check if static mesh file exists for a given resolution
 */
export async function checkStaticMeshExists(resolution: number = 60): Promise<boolean> {
  try {
    const filename = `/data/seoul-mesh-${resolution}.json`
    const response = await fetch(filename, { method: 'HEAD' })
    return response.ok
  } catch {
    return false
  }
}

/**
 * Get the nearest available pre-generated resolution
 * Useful for fallback when exact resolution is not available
 */
export function getNearestAvailableResolution(targetResolution: number): number {
  // If exact match exists, use it
  if (hasPreGeneratedMesh(targetResolution)) {
    return targetResolution
  }

  // Find the nearest resolution
  let nearest = PREGENERATED_RESOLUTIONS[0]
  let minDiff = Math.abs(targetResolution - nearest)

  for (const res of PREGENERATED_RESOLUTIONS) {
    const diff = Math.abs(targetResolution - res)
    if (diff < minDiff) {
      minDiff = diff
      nearest = res
    }
  }

  console.log(`[LoadStaticMesh] Resolution ${targetResolution} not available, using nearest: ${nearest}`)
  return nearest
}

/**
 * Preload multiple resolutions in parallel for better performance
 * Call this on app initialization to cache common resolutions
 */
export async function preloadCommonResolutions(): Promise<void> {
  const commonResolutions = [30, 60, 90] // Most commonly used
  
  console.log('[LoadStaticMesh] Preloading common resolutions:', commonResolutions)
  
  const promises = commonResolutions.map(res => 
    loadStaticSeoulMesh(res).catch(err => 
      console.error(`Failed to preload resolution ${res}:`, err)
    )
  )
  
  await Promise.all(promises)
  console.log('[LoadStaticMesh] Preloading complete')
}