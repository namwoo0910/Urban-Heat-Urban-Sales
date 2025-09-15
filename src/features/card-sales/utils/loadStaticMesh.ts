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

// Pre-generated monthly meshes available
export const PREGENERATED_MONTHS = [
  '202401', '202402', '202403', '202404', '202405', '202406', 
  '202407', '202408', '202409', '202410', '202411', '202412'
] // All 12 months of 2024

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
    // Using cached mesh data
    return meshCacheByResolution.get(resolution)!
  }

  // If already loading this resolution, wait for the existing promise
  if (loadingPromises.has(resolution)) {
    // Debug log removed
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
      // Debug log removed
      const headerResponse = await fetch(headerUrl)
      
      if (!headerResponse.ok) {
        // Fallback to JSON if binary not available
        // Debug log removed
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
      
      // Load the binary data (use uncompressed directly to avoid decompression issues)
      const binaryUrl = `/data/binary/seoul-mesh-${resolution}.bin`
      // Debug log removed
      const binaryResponse = await fetch(binaryUrl)
      
      if (!binaryResponse.ok) {
        throw new Error(`Failed to load binary data: ${binaryResponse.status}`)
      }
      
      const arrayBuffer = await binaryResponse.arrayBuffer()
      // Debug log removed
      
      // Debug log removed
      
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
        const { offset, length } = header.offsets.indices
        const elementCount = length / 4 // Uint32 is 4 bytes per element
        
        // Debug log removed
        // Debug log removed
        
        if (offset + length > arrayBuffer.byteLength) {
          throw new Error(`Invalid indices range: offset ${offset} + length ${length} = ${offset + length} exceeds buffer size ${arrayBuffer.byteLength}`)
        }
        
        const view = new Uint32Array(arrayBuffer, offset, elementCount)
        meshGeometry.indices = new Uint32Array(view) // Create a copy
      }

      // Debug log removed
      
      // Cache the result
      meshCacheByResolution.set(resolution, meshGeometry)
      loadingPromises.delete(resolution)
      
      return meshGeometry
    } catch (error) {
      // Error logging removed
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
    // Debug log removed
  } else {
    meshCacheByResolution.clear()
    loadingPromises.clear()
    // Debug log removed
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

  // Debug log removed
  return nearest
}

/**
 * Preload multiple resolutions in parallel for better performance
 * Call this on app initialization to cache common resolutions
 */
export async function preloadCommonResolutions(): Promise<void> {
  const commonResolutions = [30, 60, 90] // Most commonly used
  
  // Debug log removed
  
  const promises = commonResolutions.map(res =>
    loadStaticSeoulMesh(res).catch(err => {
      // Error logging removed
    })
  )
  
  await Promise.all(promises)
  // Debug log removed
}

// Cache for loaded monthly mesh data
const monthlyMeshCache = new Map<string, MeshGeometry>()
const monthlyLoadingPromises = new Map<string, Promise<MeshGeometry>>()

/**
 * Check if a pre-generated monthly mesh exists
 */
export function hasPreGeneratedMonthlyMesh(month: string): boolean {
  return PREGENERATED_MONTHS.includes(month)
}

/**
 * Load pre-generated monthly Seoul mesh data
 * @param month - The month to load (e.g., '202401', '202402')
 */
export async function loadMonthlySeoulMesh(month: string): Promise<MeshGeometry> {
  // Return cached data if available
  if (monthlyMeshCache.has(month)) {
    // Debug log removed
    return monthlyMeshCache.get(month)!
  }

  // If already loading this month, wait for the existing promise
  if (monthlyLoadingPromises.has(month)) {
    // Debug log removed
    return monthlyLoadingPromises.get(month)!
  }

  // Check if this month is available as pre-generated
  if (!hasPreGeneratedMonthlyMesh(month)) {
    throw new Error(`No pre-generated mesh available for month ${month}. Available: ${PREGENERATED_MONTHS.join(', ')}`)
  }

  // Start loading
  const loadingPromise = (async () => {
    try {
      // First try binary format
      const headerUrl = `/data/binary/seoul-mesh-${month}.header.json`
      // Debug log removed
      const headerResponse = await fetch(headerUrl)
      
      if (!headerResponse.ok) {
        // Fallback to JSON if binary not available
        // Debug log removed
        const jsonUrl = `/data/seoul-mesh-${month}.json`
        const jsonResponse = await fetch(jsonUrl)
        if (!jsonResponse.ok) {
          throw new Error(`Failed to load monthly mesh data for ${month}: ${jsonResponse.status}`)
        }
        const jsonData = await jsonResponse.json()
        const meshGeometry: MeshGeometry = {
          positions: new Float32Array(jsonData.positions),
          normals: new Float32Array(jsonData.normals),
          texCoords: new Float32Array(jsonData.texCoords),
          colors: jsonData.colors ? new Float32Array(jsonData.colors) : undefined,
          indices: jsonData.indices ? new Uint32Array(jsonData.indices) : undefined,
          metadata: jsonData.metadata
        }
        monthlyMeshCache.set(month, meshGeometry)
        monthlyLoadingPromises.delete(month)
        return meshGeometry
      }

      const header: BinaryMeshHeader = await headerResponse.json()
      
      // Load the binary data
      const binaryUrl = `/data/binary/seoul-mesh-${month}.bin`
      // Debug log removed
      const binaryResponse = await fetch(binaryUrl)
      
      if (!binaryResponse.ok) {
        throw new Error(`Failed to load monthly binary data for ${month}: ${binaryResponse.status}`)
      }
      
      const arrayBuffer = await binaryResponse.arrayBuffer()
      // Debug log removed
      
      // Parse binary data according to header offsets (same logic as loadStaticSeoulMesh)
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
        meshGeometry.positions = new Float32Array(view)
      }
      
      // Extract normals
      if (header.offsets.normals) {
        const { offset, count, itemSize } = header.offsets.normals
        const view = new Float32Array(arrayBuffer, offset, count * itemSize)
        meshGeometry.normals = new Float32Array(view)
      }
      
      // Extract texCoords
      if (header.offsets.texCoords) {
        const { offset, count, itemSize } = header.offsets.texCoords
        const view = new Float32Array(arrayBuffer, offset, count * itemSize)
        meshGeometry.texCoords = new Float32Array(view)
      }
      
      // Extract colors
      if (header.offsets.colors) {
        const { offset, count, itemSize } = header.offsets.colors
        const view = new Float32Array(arrayBuffer, offset, count * itemSize)
        meshGeometry.colors = new Float32Array(view)
      }
      
      // Extract indices
      if (header.offsets.indices) {
        const { offset, length } = header.offsets.indices
        const elementCount = length / 4
        const view = new Uint32Array(arrayBuffer, offset, elementCount)
        meshGeometry.indices = new Uint32Array(view)
      }

      // Debug log removed
      
      // Cache the result
      monthlyMeshCache.set(month, meshGeometry)
      monthlyLoadingPromises.delete(month)
      
      return meshGeometry
    } catch (error) {
      // Error logging removed
      monthlyLoadingPromises.delete(month)
      throw error
    }
  })()

  monthlyLoadingPromises.set(month, loadingPromise)
  return loadingPromise
}

// =========================
// Daily mesh support
// =========================

/** Check if a pre-generated daily mesh exists (YYYYMMDD). Uses HEAD. */
export async function hasPreGeneratedDailyMesh(dateCode: string): Promise<boolean> {
  try {
    const binaryHeader = `/data/binary/seoul-mesh-${dateCode}.header.json`
    const resp = await fetch(binaryHeader, { method: 'HEAD' })
    return resp.ok
  } catch {
    return false
  }
}

/** Load pre-generated daily mesh (YYYYMMDD) */
export async function loadDailySeoulMesh(dateCode: string): Promise<MeshGeometry> {
  // Try binary first
  const headerUrl = `/data/binary/seoul-mesh-${dateCode}.header.json`
  const headerResponse = await fetch(headerUrl)
  if (!headerResponse.ok) {
    // Fallback to JSON
    const jsonUrl = `/data/seoul-mesh-${dateCode}.json`
    const jsonResponse = await fetch(jsonUrl)
    if (!jsonResponse.ok) {
      throw new Error(`Failed to load daily mesh data for ${dateCode}: ${jsonResponse.status}`)
    }
    const jsonData = await jsonResponse.json()
    const meshGeometry: MeshGeometry = {
      positions: new Float32Array(jsonData.positions),
      normals: new Float32Array(jsonData.normals),
      texCoords: new Float32Array(jsonData.texCoords),
      colors: jsonData.colors ? new Float32Array(jsonData.colors) : undefined,
      indices: jsonData.indices ? new Uint32Array(jsonData.indices) : undefined,
      metadata: jsonData.metadata
    }
    return meshGeometry
  }

  const header: BinaryMeshHeader = await headerResponse.json()
  const binaryUrl = `/data/binary/seoul-mesh-${dateCode}.bin`
  const binaryResponse = await fetch(binaryUrl)
  if (!binaryResponse.ok) {
    throw new Error(`Failed to load daily binary mesh for ${dateCode}: ${binaryResponse.status}`)
  }
  const arrayBuffer = await binaryResponse.arrayBuffer()

  const meshGeometry: MeshGeometry = {
    positions: new Float32Array(0),
    normals: new Float32Array(0),
    texCoords: new Float32Array(0),
    metadata: { center: header.metadata.center }
  }

  if (header.offsets.positions) {
    const { offset, count, itemSize } = header.offsets.positions
    const view = new Float32Array(arrayBuffer, offset, count * itemSize)
    meshGeometry.positions = new Float32Array(view)
  }
  if (header.offsets.normals) {
    const { offset, count, itemSize } = header.offsets.normals
    const view = new Float32Array(arrayBuffer, offset, count * itemSize)
    meshGeometry.normals = new Float32Array(view)
  }
  if (header.offsets.texCoords) {
    const { offset, count, itemSize } = header.offsets.texCoords
    const view = new Float32Array(arrayBuffer, offset, count * itemSize)
    meshGeometry.texCoords = new Float32Array(view)
  }
  if (header.offsets.colors) {
    const { offset, count, itemSize } = header.offsets.colors
    const view = new Float32Array(arrayBuffer, offset, count * itemSize)
    meshGeometry.colors = new Float32Array(view)
  }
  if (header.offsets.indices) {
    const { offset, length } = header.offsets.indices
    const elementCount = length / 4
    const view = new Uint32Array(arrayBuffer, offset, elementCount)
    meshGeometry.indices = new Uint32Array(view)
  }

  return meshGeometry
}

/** Fetch list of available dates (YYYYMMDD) if index exists */
export async function getAvailableDailyDates(): Promise<string[]> {
  try {
    const url = `/data/binary/available-dates.json`
    const resp = await fetch(url)
    if (!resp.ok) return []
    const json = await resp.json()
    return Array.isArray(json?.dates) ? json.dates : []
  } catch {
    return []
  }
}

/**
 * Clear monthly mesh cache
 */
export function clearMonthlyMeshCache(month?: string): void {
  if (month !== undefined) {
    monthlyMeshCache.delete(month)
    monthlyLoadingPromises.delete(month)
    // Debug log removed
  } else {
    monthlyMeshCache.clear()
    monthlyLoadingPromises.clear()
    // Debug log removed
  }
}
