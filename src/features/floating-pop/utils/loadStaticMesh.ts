/**
 * Utility to load and cache pre-generated Seoul mesh data
 */

import { MeshGeometry } from './meshGenerator'

interface BinaryMeshHeader {
  format: string
  version: string
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
  offsets: {
    positions: { offset: number; length: number; type: string; itemSize: number; count: number }
    normals: { offset: number; length: number; type: string; itemSize: number; count: number }
    texCoords: { offset: number; length: number; type: string; itemSize: number; count: number }
    colors: { offset: number; length: number; type: string; itemSize: number; count: number }
    indices: { offset: number; length: number; type: string; itemSize: number; count: number }
  }
  totalSize: number
  compressed: boolean
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
      // First load the header file
      const headerUrl = `/data/binary/seoul-mesh-${resolution}.header.json`
      console.log(`[LoadStaticMesh] Loading header from ${headerUrl}...`)
      const headerResponse = await fetch(headerUrl)
      
      if (!headerResponse.ok) {
        // Fallback to JSON if binary not available
        console.log(`[LoadStaticMesh] Binary header not found, trying JSON fallback...`)
        const jsonUrl = `/data/seoul-mesh-${resolution}.json`
        const jsonResponse = await fetch(jsonUrl)
        if (!jsonResponse.ok) {
          throw new Error(`Failed to load mesh data: ${jsonResponse.status}`)
        }
        const jsonData = await jsonResponse.json()
        const meshGeometry: MeshGeometry = {
          positions: new Float32Array(jsonData.positions),
          normals: new Float32Array(jsonData.normals),
          texCoords: new Float32Array(jsonData.texCoords),
          colors: new Float32Array(jsonData.colors),
          indices: new Uint32Array(jsonData.indices),
          metadata: { center: jsonData.metadata.center }
        }
        meshCacheByResolution.set(resolution, meshGeometry)
        loadingPromises.delete(resolution)
        return meshGeometry
      }

      const header: BinaryMeshHeader = await headerResponse.json()
      
      // Load the binary data (try compressed first)
      const binaryUrl = `/data/binary/seoul-mesh-${resolution}.bin.gz`
      console.log(`[LoadStaticMesh] Loading binary data from ${binaryUrl}...`)
      const binaryResponse = await fetch(binaryUrl)
      
      if (!binaryResponse.ok) {
        throw new Error(`Failed to load binary data: ${binaryResponse.status}`)
      }
      
      // Decompress if supported
      let arrayBuffer: ArrayBuffer
      if ('DecompressionStream' in window) {
        console.log(`[LoadStaticMesh] Decompressing binary data...`)
        const stream = binaryResponse.body!.pipeThrough(new (window as any).DecompressionStream('gzip'))
        arrayBuffer = await new Response(stream).arrayBuffer()
      } else {
        // Fallback to uncompressed if DecompressionStream not supported
        console.log(`[LoadStaticMesh] DecompressionStream not supported, loading uncompressed...`)
        const uncompressedUrl = `/data/binary/seoul-mesh-${resolution}.bin`
        const uncompressedResponse = await fetch(uncompressedUrl)
        if (!uncompressedResponse.ok) {
          throw new Error(`Failed to load uncompressed binary: ${uncompressedResponse.status}`)
        }
        arrayBuffer = await uncompressedResponse.arrayBuffer()
      }
      
      console.log(`[LoadStaticMesh] Parsing binary data for resolution ${resolution}...`)
      
      // Parse binary data according to header offsets
      const meshGeometry: MeshGeometry = {
        positions: new Float32Array(0),
        normals: new Float32Array(0),
        texCoords: new Float32Array(0),
        metadata: {
          center: header.metadata.center
        }
      }
      
      // Extract positions
      if (header.offsets.positions) {
        const { offset, count, itemSize } = header.offsets.positions
        const view = new Float32Array(arrayBuffer, offset, count * itemSize)
        meshGeometry.positions = new Float32Array(view) // Create a copy
      }
      
      // Extract normals
      if (header.offsets.normals) {
        const { offset, count, itemSize } = header.offsets.normals
        const view = new Float32Array(arrayBuffer, offset, count * itemSize)
        meshGeometry.normals = new Float32Array(view) // Create a copy
      }
      
      // Extract texCoords
      if (header.offsets.texCoords) {
        const { offset, count, itemSize } = header.offsets.texCoords
        const view = new Float32Array(arrayBuffer, offset, count * itemSize)
        meshGeometry.texCoords = new Float32Array(view) // Create a copy
      }
      
      // Extract colors
      if (header.offsets.colors) {
        const { offset, count, itemSize } = header.offsets.colors
        const view = new Float32Array(arrayBuffer, offset, count * itemSize)
        meshGeometry.colors = new Float32Array(view) // Create a copy
      }
      
      // Extract indices
      if (header.offsets.indices) {
        const { offset, count, itemSize } = header.offsets.indices
        const view = new Uint32Array(arrayBuffer, offset, count * itemSize)
        meshGeometry.indices = new Uint32Array(view) // Create a copy
      }

      console.log(`[LoadStaticMesh] Loaded binary mesh: ${header.metadata.triangles} triangles, ${header.metadata.resolution}x${header.metadata.resolution} grid`)
      
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
    // Check for binary header file first
    const binaryHeader = `/data/binary/seoul-mesh-${resolution}.header.json`
    const binaryResponse = await fetch(binaryHeader, { method: 'HEAD' })
    if (binaryResponse.ok) {
      return true
    }
    
    // Fallback to JSON file
    const jsonFile = `/data/seoul-mesh-${resolution}.json`
    const jsonResponse = await fetch(jsonFile, { method: 'HEAD' })
    return jsonResponse.ok
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