/**
 * Data Compression Utilities
 * Compress and decompress large JSON/GeoJSON files for better performance
 */

// Compression using built-in browser APIs (gzip alternative)
export class DataCompressionManager {
  private static cache = new Map<string, any>()
  
  /**
   * Compress data using native compression
   */
  static async compressData(data: any): Promise<Uint8Array> {
    const jsonString = JSON.stringify(data)
    const textEncoder = new TextEncoder()
    const uint8Array = textEncoder.encode(jsonString)
    
    // Use CompressionStream if available (modern browsers)
    if ('CompressionStream' in window) {
      const compressionStream = new CompressionStream('gzip')
      const writer = compressionStream.writable.getWriter()
      const reader = compressionStream.readable.getReader()
      
      writer.write(uint8Array)
      writer.close()
      
      const chunks: Uint8Array[] = []
      let done = false
      
      while (!done) {
        const { value, done: readerDone } = await reader.read()
        done = readerDone
        if (value) chunks.push(value)
      }
      
      // Combine chunks
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
      const result = new Uint8Array(totalLength)
      let offset = 0
      
      for (const chunk of chunks) {
        result.set(chunk, offset)
        offset += chunk.length
      }
      
      return result
    }
    
    // Fallback: return original data (uncompressed)
    return uint8Array
  }
  
  /**
   * Decompress data
   */
  static async decompressData(compressedData: Uint8Array): Promise<any> {
    if ('DecompressionStream' in window) {
      const decompressionStream = new DecompressionStream('gzip')
      const writer = decompressionStream.writable.getWriter()
      const reader = decompressionStream.readable.getReader()
      
      writer.write(compressedData)
      writer.close()
      
      const chunks: Uint8Array[] = []
      let done = false
      
      while (!done) {
        const { value, done: readerDone } = await reader.read()
        done = readerDone
        if (value) chunks.push(value)
      }
      
      // Combine chunks and decode
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
      const result = new Uint8Array(totalLength)
      let offset = 0
      
      for (const chunk of chunks) {
        result.set(chunk, offset)
        offset += chunk.length
      }
      
      const textDecoder = new TextDecoder()
      const jsonString = textDecoder.decode(result)
      return JSON.parse(jsonString)
    }
    
    // Fallback: treat as uncompressed
    const textDecoder = new TextDecoder()
    const jsonString = textDecoder.decode(compressedData)
    return JSON.parse(jsonString)
  }
  
  /**
   * Load and cache compressed data with automatic fallback
   */
  static async loadCompressedData(url: string, fallbackUrl?: string): Promise<any> {
    // Check cache first
    const cacheKey = url
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)
    }
    
    try {
      // Try compressed version first
      const response = await fetch(url)
      if (!response.ok && fallbackUrl) {
        // Fallback to original file
        const fallbackResponse = await fetch(fallbackUrl)
        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json()
          this.cache.set(cacheKey, data)
          return data
        }
        throw new Error(`Failed to load data from ${url} and ${fallbackUrl}`)
      }
      
      const arrayBuffer = await response.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)
      const data = await this.decompressData(uint8Array)
      
      // Cache the result
      this.cache.set(cacheKey, data)
      return data
      
    } catch (error) {
      console.warn(`Failed to load compressed data from ${url}:`, error)
      
      // Try fallback URL if provided
      if (fallbackUrl) {
        try {
          const fallbackResponse = await fetch(fallbackUrl)
          const data = await fallbackResponse.json()
          this.cache.set(cacheKey, data)
          return data
        } catch (fallbackError) {
          console.error(`Failed to load fallback data from ${fallbackUrl}:`, fallbackError)
        }
      }
      
      throw error
    }
  }
  
  /**
   * Clear cache to free memory
   */
  static clearCache(): void {
    this.cache.clear()
  }
  
  /**
   * Get cache size for monitoring
   */
  static getCacheInfo(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }
}

/**
 * Optimized Seoul boundary loader with compression support
 */
export async function loadSeoulBoundaryOptimized(): Promise<any> {
  try {
    // Try compressed version first, fallback to original
    return await DataCompressionManager.loadCompressedData(
      '/seoul_boundary.compressed.gz',
      '/seoul_boundary.geojson'
    )
  } catch (error) {
    console.error('Failed to load Seoul boundary data:', error)
    throw error
  }
}

/**
 * Progressive data chunking for large datasets
 */
export class ProgressiveDataLoader {
  private chunks: string[] = []
  private loadedChunks: any[] = []
  private onChunkCallback?: (chunk: any, progress: number) => void
  
  constructor(chunkUrls: string[], onChunk?: (chunk: any, progress: number) => void) {
    this.chunks = chunkUrls
    this.onChunkCallback = onChunk
  }
  
  async loadAll(): Promise<any[]> {
    this.loadedChunks = []
    
    for (let i = 0; i < this.chunks.length; i++) {
      const chunkUrl = this.chunks[i]
      
      try {
        const response = await fetch(chunkUrl)
        if (!response.ok) {
          throw new Error(`Failed to load chunk: ${chunkUrl}`)
        }
        
        const chunk = await response.json()
        this.loadedChunks.push(chunk)
        
        const progress = (i + 1) / this.chunks.length
        
        // Call progress callback
        if (this.onChunkCallback) {
          this.onChunkCallback(chunk, progress)
        }
        
      } catch (error) {
        console.warn(`Failed to load chunk ${chunkUrl}:`, error)
        // Continue with other chunks
      }
    }
    
    return this.loadedChunks
  }
  
  async loadProgressively(): Promise<AsyncGenerator<{ chunk: any; progress: number }>> {
    return this.generateChunks()
  }
  
  private async *generateChunks(): AsyncGenerator<{ chunk: any; progress: number }> {
    for (let i = 0; i < this.chunks.length; i++) {
      const chunkUrl = this.chunks[i]
      
      try {
        const response = await fetch(chunkUrl)
        if (!response.ok) continue
        
        const chunk = await response.json()
        const progress = (i + 1) / this.chunks.length
        
        yield { chunk, progress }
        
      } catch (error) {
        console.warn(`Failed to load chunk ${chunkUrl}:`, error)
      }
    }
  }
}

export default DataCompressionManager