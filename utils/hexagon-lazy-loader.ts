/**
 * Lazy loading system for hexagon data chunks
 * Loads data based on viewport bounds for optimal performance
 */

import { geoJSONLoader } from './geojson-loader'

export interface HexagonChunk {
  filename: string
  bounds: {
    north: number
    south: number
    east: number
    west: number
  }
  pointCount: number
  sizeKB: number
}

export interface HexagonChunkIndex {
  gridSize: number
  totalPoints: number
  chunks: Record<string, HexagonChunk>
}

export interface ViewportBounds {
  north: number
  south: number
  east: number
  west: number
}

export interface HexagonPoint {
  coordinates: [number, number]
  weight: number
}

class HexagonLazyLoader {
  private chunkIndex: HexagonChunkIndex | null = null
  private loadedChunks: Map<string, HexagonPoint[]> = new Map()
  private loadingPromises: Map<string, Promise<HexagonPoint[]>> = new Map()
  private isIndexLoaded = false

  /**
   * Initialize the loader by fetching the chunk index
   */
  async initialize(): Promise<void> {
    if (this.isIndexLoaded) return

    try {
      console.log('[HexagonLazyLoader] Loading chunk index...')
      this.chunkIndex = await geoJSONLoader.loadWithCache('/hexagon-chunks/index.json')
      this.isIndexLoaded = true
      console.log(`[HexagonLazyLoader] Index loaded: ${this.chunkIndex.totalPoints} total points in ${Object.keys(this.chunkIndex.chunks).length} chunks`)
    } catch (error) {
      console.error('[HexagonLazyLoader] Failed to load chunk index:', error)
      throw error
    }
  }

  /**
   * Get chunks that intersect with the given viewport bounds
   */
  private getRelevantChunks(viewportBounds: ViewportBounds): string[] {
    if (!this.chunkIndex) return []

    const relevantChunks: string[] = []

    Object.entries(this.chunkIndex.chunks).forEach(([chunkKey, chunk]) => {
      // Check if chunk bounds intersect with viewport bounds
      const intersects = !(
        chunk.bounds.west > viewportBounds.east ||
        chunk.bounds.east < viewportBounds.west ||
        chunk.bounds.north < viewportBounds.south ||
        chunk.bounds.south > viewportBounds.north
      )

      if (intersects && chunk.pointCount > 0) {
        relevantChunks.push(chunkKey)
      }
    })

    return relevantChunks
  }

  /**
   * Load a specific chunk
   */
  private async loadChunk(chunkKey: string): Promise<HexagonPoint[]> {
    // Return cached data if already loaded
    if (this.loadedChunks.has(chunkKey)) {
      return this.loadedChunks.get(chunkKey)!
    }

    // Return existing promise if already loading
    if (this.loadingPromises.has(chunkKey)) {
      return this.loadingPromises.get(chunkKey)!
    }

    // Start loading the chunk
    const loadingPromise = this.doLoadChunk(chunkKey)
    this.loadingPromises.set(chunkKey, loadingPromise)

    try {
      const data = await loadingPromise
      this.loadedChunks.set(chunkKey, data)
      this.loadingPromises.delete(chunkKey)
      return data
    } catch (error) {
      this.loadingPromises.delete(chunkKey)
      throw error
    }
  }

  /**
   * Actually load the chunk data from the server
   */
  private async doLoadChunk(chunkKey: string): Promise<HexagonPoint[]> {
    if (!this.chunkIndex) {
      throw new Error('Chunk index not loaded')
    }

    const chunk = this.chunkIndex.chunks[chunkKey]
    if (!chunk) {
      throw new Error(`Chunk ${chunkKey} not found in index`)
    }

    console.log(`[HexagonLazyLoader] Loading chunk ${chunkKey} (${chunk.pointCount} points, ${chunk.sizeKB}KB)`)
    
    try {
      const data = await geoJSONLoader.loadWithCache(`/hexagon-chunks/${chunk.filename}`)
      console.log(`[HexagonLazyLoader] Chunk ${chunkKey} loaded successfully`)
      return data
    } catch (error) {
      console.error(`[HexagonLazyLoader] Failed to load chunk ${chunkKey}:`, error)
      throw error
    }
  }

  /**
   * Load data for the given viewport bounds
   */
  async loadForViewport(viewportBounds: ViewportBounds): Promise<HexagonPoint[]> {
    // Ensure index is loaded
    await this.initialize()

    // Get relevant chunks for this viewport
    const relevantChunks = this.getRelevantChunks(viewportBounds)
    console.log(`[HexagonLazyLoader] Loading ${relevantChunks.length} chunks for viewport:`, viewportBounds)

    if (relevantChunks.length === 0) {
      console.log('[HexagonLazyLoader] No relevant chunks found for viewport')
      return []
    }

    // Load all relevant chunks in parallel
    try {
      const chunkDataArrays = await Promise.all(
        relevantChunks.map(chunkKey => this.loadChunk(chunkKey))
      )

      // Combine all chunk data
      const combinedData = chunkDataArrays.flat()
      console.log(`[HexagonLazyLoader] Loaded ${combinedData.length} total points from ${relevantChunks.length} chunks`)

      return combinedData
    } catch (error) {
      console.error('[HexagonLazyLoader] Failed to load chunks for viewport:', error)
      throw error
    }
  }

  /**
   * Get full dataset (fallback method)
   */
  async loadFullDataset(): Promise<HexagonPoint[]> {
    await this.initialize()

    if (!this.chunkIndex) {
      throw new Error('Chunk index not loaded')
    }

    console.log('[HexagonLazyLoader] Loading full dataset...')
    
    // Load all non-empty chunks
    const allChunkKeys = Object.entries(this.chunkIndex.chunks)
      .filter(([_, chunk]) => chunk.pointCount > 0)
      .map(([chunkKey, _]) => chunkKey)

    const chunkDataArrays = await Promise.all(
      allChunkKeys.map(chunkKey => this.loadChunk(chunkKey))
    )

    const fullData = chunkDataArrays.flat()
    console.log(`[HexagonLazyLoader] Full dataset loaded: ${fullData.length} points`)

    return fullData
  }

  /**
   * Clear loaded chunks to free memory
   */
  clearCache(): void {
    console.log(`[HexagonLazyLoader] Clearing cache: ${this.loadedChunks.size} chunks`)
    this.loadedChunks.clear()
    this.loadingPromises.clear()
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      loadedChunks: this.loadedChunks.size,
      loadingPromises: this.loadingPromises.size,
      isIndexLoaded: this.isIndexLoaded,
      totalPoints: this.chunkIndex?.totalPoints || 0
    }
  }
}

// Export singleton instance
export const hexagonLazyLoader = new HexagonLazyLoader()