/**
 * Optimized Urban Mountain Data Loader
 * Progressive chunked loading for better performance
 */

import { useState, useEffect, useCallback } from 'react'
// import { ProgressiveDataLoader } from './data-compression'

export interface GridData {
  grid_id: number
  lng: number
  lat: number
  row: number
  col: number
  bounds: {
    minLng: number
    maxLng: number
    minLat: number
    maxLat: number
  }
  size_meters: {
    width: number
    height: number
  }
}

export interface PopulationData {
  [timeKey: string]: {
    [gridId: string]: number
  }
}

export interface UrbanMountainData {
  gridData: GridData[]
  populationData: PopulationData
  metadata: {
    totalGrids: number
    timeRange: { start: number; end: number }
    maxPopulation: number
    averagePopulation: number
  }
}

/**
 * Progressive Urban Mountain data loader with chunking
 */
export class UrbanMountainDataLoader {
  private static instance: UrbanMountainDataLoader
  private cache: Map<string, any> = new Map()
  private isLoading = false
  
  static getInstance(): UrbanMountainDataLoader {
    if (!this.instance) {
      this.instance = new UrbanMountainDataLoader()
    }
    return this.instance
  }
  
  /**
   * Load Urban Mountain data progressively with chunking
   */
  async loadProgressively(
    onProgress?: (progress: number, data?: Partial<UrbanMountainData>) => void
  ): Promise<UrbanMountainData> {
    if (this.isLoading) {
      throw new Error('Already loading data. Please wait.')
    }
    
    this.isLoading = true
    
    try {
      // Check if data is already cached
      const cachedData = this.cache.get('urbanmountain-complete')
      if (cachedData) {
        onProgress?.(1.0, cachedData)
        return cachedData
      }
      
      const result: Partial<UrbanMountainData> = {}
      
      // Step 1: Load metadata first (smallest file)
      onProgress?.(0.1)
      try {
        const metadataResponse = await fetch('/urbanmountain/processed_data/metadata.json')
        if (metadataResponse.ok) {
          result.metadata = await metadataResponse.json()
          onProgress?.(0.2, result)
        }
      } catch (error) {
        console.warn('Failed to load metadata:', error)
      }
      
      // Step 2: Load grid coordinates progressively
      onProgress?.(0.3)
      const gridData = await this.loadGridDataChunked((progress) => {
        const adjustedProgress = 0.3 + (progress * 0.3) // 30% to 60%
        onProgress?.(adjustedProgress, result)
      })
      result.gridData = gridData
      
      // Step 3: Load population data progressively
      onProgress?.(0.6)
      const populationData = await this.loadPopulationDataChunked((progress) => {
        const adjustedProgress = 0.6 + (progress * 0.35) // 60% to 95%
        onProgress?.(adjustedProgress, result)
      })
      result.populationData = populationData
      
      // Final assembly
      const completeData = result as UrbanMountainData
      
      // Cache the complete data
      this.cache.set('urbanmountain-complete', completeData)
      
      onProgress?.(1.0, completeData)
      return completeData
      
    } finally {
      this.isLoading = false
    }
  }
  
  /**
   * Load grid coordinates with chunking support
   */
  private async loadGridDataChunked(
    onProgress?: (progress: number) => void
  ): Promise<GridData[]> {
    try {
      // Try to load chunked version first
      const chunkUrls = this.generateChunkUrls('grid_coordinates', 4) // 4 chunks
      
      if (await this.checkChunksExist(chunkUrls)) {
        return await this.loadDataFromChunks(chunkUrls, onProgress)
      }
      
      // Fallback to original file
      onProgress?.(0.5)
      const response = await fetch('/urbanmountain/processed_data/grid_coordinates.json')
      if (!response.ok) {
        throw new Error('Failed to load grid coordinates')
      }
      
      const data = await response.json()
      onProgress?.(1.0)
      return data
      
    } catch (error) {
      console.error('Failed to load grid data:', error)
      throw error
    }
  }
  
  /**
   * Load population data with chunking support
   */
  private async loadPopulationDataChunked(
    onProgress?: (progress: number) => void
  ): Promise<PopulationData> {
    try {
      // Try to load chunked version first
      const chunkUrls = this.generateChunkUrls('grid_population', 8) // 8 chunks for larger file
      
      if (await this.checkChunksExist(chunkUrls)) {
        const chunks = await this.loadDataFromChunks(chunkUrls, onProgress)
        return this.mergePopulationChunks(chunks)
      }
      
      // Fallback to original file
      onProgress?.(0.5)
      const response = await fetch('/urbanmountain/processed_data/grid_population.json')
      if (!response.ok) {
        throw new Error('Failed to load population data')
      }
      
      const data = await response.json()
      onProgress?.(1.0)
      return data
      
    } catch (error) {
      console.error('Failed to load population data:', error)
      throw error
    }
  }
  
  /**
   * Generate chunk URLs for a given base filename
   */
  private generateChunkUrls(basename: string, chunkCount: number): string[] {
    const urls: string[] = []
    for (let i = 0; i < chunkCount; i++) {
      urls.push(`/urbanmountain/processed_data/chunks/${basename}_chunk_${i}.json`)
    }
    return urls
  }
  
  /**
   * Check if chunked files exist
   */
  private async checkChunksExist(chunkUrls: string[]): Promise<boolean> {
    try {
      // Check if the first chunk exists
      const response = await fetch(chunkUrls[0], { method: 'HEAD' })
      return response.ok
    } catch {
      return false
    }
  }
  
  /**
   * Load data from multiple chunks
   */
  private async loadDataFromChunks(
    chunkUrls: string[], 
    onProgress?: (progress: number) => void
  ): Promise<any[]> {
    const loader = new ProgressiveDataLoader(chunkUrls, (chunk, progress) => {
      onProgress?.(progress)
    })
    
    return await loader.loadAll()
  }
  
  /**
   * Merge population data chunks
   */
  private mergePopulationChunks(chunks: any[]): PopulationData {
    const merged: PopulationData = {}
    
    for (const chunk of chunks) {
      if (chunk && typeof chunk === 'object') {
        Object.assign(merged, chunk)
      }
    }
    
    return merged
  }
  
  /**
   * Clear cache to free memory
   */
  clearCache(): void {
    this.cache.clear()
  }
  
  /**
   * Get loading status
   */
  getLoadingStatus(): { isLoading: boolean; cacheSize: number } {
    return {
      isLoading: this.isLoading,
      cacheSize: this.cache.size
    }
  }
}

/**
 * Hook for using Urban Mountain data with loading state
 */
export function useUrbanMountainData() {
  const [data, setData] = useState<UrbanMountainData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  
  const loadData = useCallback(async () => {
    if (loading) return
    
    setLoading(true)
    setError(null)
    setProgress(0)
    
    try {
      const loader = UrbanMountainDataLoader.getInstance()
      const result = await loader.loadProgressively((progress, partialData) => {
        setProgress(progress)
        if (partialData && progress === 1.0) {
          setData(partialData as UrbanMountainData)
        }
      })
      
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [loading])
  
  return {
    data,
    loading,
    error,
    progress,
    loadData,
    clearCache: () => UrbanMountainDataLoader.getInstance().clearCache()
  }
}

// For backward compatibility with existing components
export async function loadUrbanMountainData(): Promise<UrbanMountainData> {
  const loader = UrbanMountainDataLoader.getInstance()
  return await loader.loadProgressively()
}

export default UrbanMountainDataLoader