/**
 * Chunked Data Loader
 * Loads district-specific chunks instead of entire monthly files
 */

import { cache } from 'react'
import { salesDataCache } from '@/src/shared/utils/lruCacheManager'

interface ChunkIndex {
  yearMonth: string
  districts: Array<{
    name: string
    fileName: string
    records: number
    sizeBytes: number
  }>
  totalRecords: number
  generatedAt: string
}

interface MasterIndex {
  months: Array<{
    yearMonth: string
    districts: number
    totalRecords: number
    originalSizeMB: string
    chunkedSizeMB: string
  }>
  generatedAt: string
}

export class ChunkedDataLoader {
  private static instance: ChunkedDataLoader
  private masterIndex: MasterIndex | null = null

  private constructor() {}

  static getInstance(): ChunkedDataLoader {
    if (!ChunkedDataLoader.instance) {
      ChunkedDataLoader.instance = new ChunkedDataLoader()
    }
    return ChunkedDataLoader.instance
  }

  /**
   * Load master index with React cache
   */
  private loadMasterIndex = cache(async (): Promise<MasterIndex | null> => {
    try {
      const response = await fetch('/data/local_economy/chunks/master-index.json', {
        // @ts-ignore - Next.js specific
        next: {
          tags: ['chunks-master-index'],
          revalidate: 86400 // 24 hours
        },
        cache: 'force-cache'
      })

      if (!response.ok) {
        console.warn('[ChunkedDataLoader] Master index not found, chunks not available')
        return null
      }

      return await response.json()
    } catch (error) {
      console.error('[ChunkedDataLoader] Error loading master index:', error)
      return null
    }
  })

  /**
   * Check if chunked data is available
   */
  async hasChunkedData(): Promise<boolean> {
    if (!this.masterIndex) {
      this.masterIndex = await this.loadMasterIndex()
    }
    return this.masterIndex !== null
  }

  /**
   * Load data for specific districts in a month
   */
  async loadDistrictChunks(
    yearMonth: string,
    districts: string[]
  ): Promise<any[]> {
    const cacheKey = `${yearMonth}-${districts.join(',')}`

    // Check LRU cache first
    const cached = salesDataCache.get(cacheKey)
    if (cached) {
      salesDataCache.recordHit()
      return cached
    }

    salesDataCache.recordMiss()

    try {
      // Load chunk index for the month
      const indexResponse = await fetch(
        `/data/local_economy/chunks/${yearMonth}/index.json`,
        {
          // @ts-ignore - Next.js specific
          next: {
            tags: [`chunks-${yearMonth}-index`],
            revalidate: 3600 // 1 hour
          }
        }
      )

      if (!indexResponse.ok) {
        throw new Error(`Chunk index not found for ${yearMonth}`)
      }

      const index: ChunkIndex = await indexResponse.json()

      // Find matching districts
      const districtFiles = index.districts.filter(d =>
        districts.includes(d.name)
      )

      if (districtFiles.length === 0) {
        console.warn(`No chunks found for districts: ${districts.join(', ')}`)
        return []
      }

      // Load chunks in parallel using Promise.all
      const chunkPromises = districtFiles.map(async district => {
        const chunkUrl = `/data/local_economy/chunks/${yearMonth}/${district.fileName}`
        const response = await fetch(chunkUrl, {
          // @ts-ignore - Next.js specific
          next: {
            tags: [`chunk-${yearMonth}-${district.name}`],
            revalidate: 3600 // 1 hour
          }
        })

        if (!response.ok) {
          console.error(`Failed to load chunk: ${district.fileName}`)
          return []
        }

        return response.json()
      })

      const chunks = await Promise.all(chunkPromises)
      const allData = chunks.flat()

      // Cache the combined result
      const estimatedSize = allData.length * 2048 // ~2KB per record
      salesDataCache.set(cacheKey, allData, estimatedSize)

      return allData

    } catch (error) {
      console.error('[ChunkedDataLoader] Error loading district chunks:', error)
      return []
    }
  }

  /**
   * Load single district data for a month
   */
  async loadDistrictData(
    yearMonth: string,
    districtName: string
  ): Promise<any[]> {
    return this.loadDistrictChunks(yearMonth, [districtName])
  }

  /**
   * Get available months from master index
   */
  async getAvailableMonths(): Promise<string[]> {
    if (!this.masterIndex) {
      this.masterIndex = await this.loadMasterIndex()
    }

    if (!this.masterIndex) {
      return []
    }

    return this.masterIndex.months.map(m => m.yearMonth)
  }

  /**
   * Get districts available for a specific month
   */
  async getAvailableDistricts(yearMonth: string): Promise<string[]> {
    try {
      const indexResponse = await fetch(
        `/data/local_economy/chunks/${yearMonth}/index.json`,
        {
          // @ts-ignore
          cache: 'force-cache'
        }
      )

      if (!indexResponse.ok) {
        return []
      }

      const index: ChunkIndex = await indexResponse.json()
      return index.districts.map(d => d.name)

    } catch (error) {
      console.error('[ChunkedDataLoader] Error getting districts:', error)
      return []
    }
  }
}

// Export singleton instance
export const chunkedDataLoader = ChunkedDataLoader.getInstance()