/**
 * Mesh Cache Manager with LRU eviction and progressive loading
 * Manages mesh generation, caching, and worker coordination
 */

import { MeshGeometry } from './meshGenerator'

export interface CachedMesh {
  geometry: MeshGeometry
  resolution: number
  timestamp: number
  memorySize: number // Approximate memory usage in bytes
}

export interface MeshGenerationOptions {
  resolution: number
  progressive?: boolean
  priority?: 'high' | 'low'
}

// LRU cache specifically for mesh data with memory management
export class MeshLRUCache {
  private maxSize: number
  private maxMemory: number // Maximum memory in bytes
  private currentMemory: number = 0
  private cache: Map<string, CachedMesh>
  private accessOrder: string[]

  constructor(maxSize: number = 5, maxMemoryMB: number = 500) {
    this.maxSize = maxSize
    this.maxMemory = maxMemoryMB * 1024 * 1024 // Convert to bytes
    this.cache = new Map()
    this.accessOrder = []
  }

  get(key: string): CachedMesh | undefined {
    const mesh = this.cache.get(key)
    if (mesh) {
      this.updateAccessOrder(key)
      mesh.timestamp = Date.now()
    }
    return mesh
  }

  set(key: string, mesh: CachedMesh): void {
    const memorySize = this.calculateMemorySize(mesh.geometry)
    mesh.memorySize = memorySize

    // Check if we need to evict based on memory
    while (this.currentMemory + memorySize > this.maxMemory && this.accessOrder.length > 0) {
      this.evictLRU()
    }

    // Check if we need to evict based on count
    if (!this.cache.has(key) && this.cache.size >= this.maxSize) {
      this.evictLRU()
    }

    if (this.cache.has(key)) {
      // Update existing
      const oldMesh = this.cache.get(key)!
      this.currentMemory -= oldMesh.memorySize
      this.updateAccessOrder(key)
    } else {
      this.accessOrder.push(key)
    }

    this.cache.set(key, mesh)
    this.currentMemory += memorySize
    
    console.log(`[MeshCache] Cached ${key} (${(memorySize / 1024 / 1024).toFixed(2)}MB, total: ${(this.currentMemory / 1024 / 1024).toFixed(2)}MB)`)
  }

  has(key: string): boolean {
    return this.cache.has(key)
  }

  clear(): void {
    this.cache.clear()
    this.accessOrder = []
    this.currentMemory = 0
  }

  private evictLRU(): void {
    const lru = this.accessOrder.shift()
    if (lru) {
      const mesh = this.cache.get(lru)
      if (mesh) {
        this.currentMemory -= mesh.memorySize
        console.log(`[MeshCache] Evicted ${lru} (freed ${(mesh.memorySize / 1024 / 1024).toFixed(2)}MB)`)
      }
      this.cache.delete(lru)
    }
  }

  private updateAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key)
    if (index > -1) {
      this.accessOrder.splice(index, 1)
    }
    this.accessOrder.push(key)
  }

  private calculateMemorySize(geometry: MeshGeometry): number {
    // Calculate approximate memory usage
    const positionsSize = geometry.positions.byteLength
    const normalsSize = geometry.normals.byteLength
    const texCoordsSize = geometry.texCoords.byteLength
    const indicesSize = geometry.indices.byteLength
    
    return positionsSize + normalsSize + texCoordsSize + indicesSize
  }

  getStats() {
    return {
      size: this.cache.size,
      memoryMB: (this.currentMemory / 1024 / 1024).toFixed(2),
      maxMemoryMB: (this.maxMemory / 1024 / 1024).toFixed(2),
      keys: Array.from(this.cache.keys()),
      items: Array.from(this.cache.entries()).map(([key, mesh]) => ({
        key,
        resolution: mesh.resolution,
        memoryMB: (mesh.memorySize / 1024 / 1024).toFixed(2),
        age: Date.now() - mesh.timestamp
      }))
    }
  }
}

// Progressive mesh loader with multiple resolution levels
export class ProgressiveMeshLoader {
  private resolutions = {
    low: 30,
    medium: 60,
    high: 90,
    ultra: 120
  }

  async loadProgressive(
    key: string,
    targetResolution: number,
    onProgress?: (resolution: number, mesh: MeshGeometry) => void
  ): Promise<MeshGeometry | null> {
    // Determine resolution levels to load
    const levels = this.getResolutionLevels(targetResolution)
    
    let finalMesh: MeshGeometry | null = null
    
    for (const resolution of levels) {
      // Generate mesh at this resolution
      // This would typically call the worker
      const mesh = await this.generateMeshAtResolution(key, resolution)
      
      if (mesh && onProgress) {
        onProgress(resolution, mesh)
      }
      
      if (resolution === targetResolution) {
        finalMesh = mesh
      }
      
      // Small delay to prevent blocking
      await new Promise(resolve => setTimeout(resolve, 10))
    }
    
    return finalMesh
  }

  private getResolutionLevels(target: number): number[] {
    const levels: number[] = []
    
    // Always start with low for immediate display
    if (target > this.resolutions.low) {
      levels.push(this.resolutions.low)
    }
    
    // Add intermediate levels
    if (target > this.resolutions.medium && target !== this.resolutions.medium) {
      levels.push(this.resolutions.medium)
    }
    
    // Add target resolution
    levels.push(target)
    
    return levels
  }

  private async generateMeshAtResolution(key: string, resolution: number): Promise<MeshGeometry | null> {
    // This would be replaced with actual worker call
    // For now, return a placeholder
    console.log(`[ProgressiveLoader] Generating ${key} at resolution ${resolution}`)
    
    // Simulate generation time based on resolution
    const delay = (resolution * resolution) / 100
    await new Promise(resolve => setTimeout(resolve, delay))
    
    // Return mock geometry
    const vertexCount = resolution * resolution
    return {
      positions: new Float32Array(vertexCount * 3),
      normals: new Float32Array(vertexCount * 3),
      texCoords: new Float32Array(vertexCount * 2),
      indices: new Uint32Array((resolution - 1) * (resolution - 1) * 6)
    }
  }
}

// Main mesh cache manager
export class MeshCacheManager {
  private cache: MeshLRUCache
  private progressiveLoader: ProgressiveMeshLoader
  private generationQueue: Map<string, Promise<CachedMesh | null>>
  private workers: Worker[] = []
  private workerPool: number = 0 // Disabled workers by default to prevent background processing
  private nextWorker: number = 0

  constructor(cacheSize: number = 5, maxMemoryMB: number = 500) {
    this.cache = new MeshLRUCache(cacheSize, maxMemoryMB)
    this.progressiveLoader = new ProgressiveMeshLoader()
    this.generationQueue = new Map()
    // Workers disabled by default - can be enabled if needed
    // this.initializeWorkers()
  }

  private initializeWorkers(): void {
    // Initialize worker pool
    for (let i = 0; i < this.workerPool; i++) {
      try {
        // Use dynamic import with proper URL for Next.js worker
        const worker = new Worker(
          new URL('../../../workers/meshGeneratorWorker.ts', import.meta.url),
          { type: 'module' }
        )
        this.workers.push(worker)
        console.log(`[MeshCacheManager] Initialized worker ${i + 1}`)
      } catch (error) {
        console.warn(`[MeshCacheManager] Could not initialize worker ${i + 1}:`, error)
        // Fallback: continue without workers (will use main thread)
      }
    }
  }

  async getMesh(
    key: string,
    data: any,
    options: MeshGenerationOptions
  ): Promise<CachedMesh | null> {
    // Check cache first
    const cacheKey = `${key}_${options.resolution}`
    const cached = this.cache.get(cacheKey)
    if (cached) {
      console.log(`[MeshCacheManager] Cache hit for ${cacheKey}`)
      return cached
    }

    // Check if already generating
    if (this.generationQueue.has(cacheKey)) {
      console.log(`[MeshCacheManager] Waiting for existing generation of ${cacheKey}`)
      return this.generationQueue.get(cacheKey)!
    }

    // Start generation
    const generationPromise = this.generateMesh(key, data, options)
    this.generationQueue.set(cacheKey, generationPromise)

    try {
      const mesh = await generationPromise
      if (mesh) {
        this.cache.set(cacheKey, mesh)
      }
      return mesh
    } finally {
      this.generationQueue.delete(cacheKey)
    }
  }

  private async generateMesh(
    key: string,
    data: any,
    options: MeshGenerationOptions
  ): Promise<CachedMesh | null> {
    const startTime = performance.now()
    
    // Use worker if available
    if (this.workers.length > 0) {
      const worker = this.getNextWorker()
      const mesh = await this.generateWithWorker(worker, key, data, options)
      
      if (mesh) {
        const duration = performance.now() - startTime
        console.log(`[MeshCacheManager] Generated ${key} in ${duration.toFixed(2)}ms (worker)`)
        
        return {
          geometry: mesh,
          resolution: options.resolution,
          timestamp: Date.now(),
          memorySize: 0 // Will be calculated when cached
        }
      }
    } else {
      // Fallback to main thread generation
      console.warn('[MeshCacheManager] No workers available, using main thread')
      
      // Use progressive loader for main thread
      const mesh = await this.progressiveLoader.loadProgressive(
        key,
        options.resolution,
        options.progressive ? (res, m) => {
          console.log(`[MeshCacheManager] Progressive update: ${key} at ${res}`)
        } : undefined
      )
      
      if (mesh) {
        const duration = performance.now() - startTime
        console.log(`[MeshCacheManager] Generated ${key} in ${duration.toFixed(2)}ms (main thread)`)
        
        return {
          geometry: mesh,
          resolution: options.resolution,
          timestamp: Date.now(),
          memorySize: 0
        }
      }
    }
    
    return null
  }

  private getNextWorker(): Worker {
    const worker = this.workers[this.nextWorker]
    this.nextWorker = (this.nextWorker + 1) % this.workers.length
    return worker
  }

  private generateWithWorker(
    worker: Worker,
    key: string,
    data: any,
    options: MeshGenerationOptions
  ): Promise<MeshGeometry | null> {
    return new Promise((resolve) => {
      const messageHandler = (event: MessageEvent) => {
        if (event.data.key === key) {
          worker.removeEventListener('message', messageHandler)
          
          if (event.data.error) {
            console.error(`[MeshCacheManager] Worker error for ${key}:`, event.data.error)
            resolve(null)
          } else {
            resolve(event.data.geometry)
          }
        }
      }
      
      worker.addEventListener('message', messageHandler)
      
      // Send generation request to worker
      worker.postMessage({
        type: 'generate',
        key,
        data,
        options
      })
      
      // Timeout after 10 seconds
      setTimeout(() => {
        worker.removeEventListener('message', messageHandler)
        console.error(`[MeshCacheManager] Worker timeout for ${key}`)
        resolve(null)
      }, 10000)
    })
  }

  // Preload meshes for adjacent time periods
  async preloadAdjacent(currentKey: string, data: any, resolution: number): Promise<void> {
    // Extract month from key (assuming format like "mesh_202401")
    const match = currentKey.match(/(\d{6})/)
    if (!match) return
    
    const currentMonth = match[1]
    const year = parseInt(currentMonth.slice(0, 4))
    const month = parseInt(currentMonth.slice(4))
    
    // Calculate adjacent months
    const prevMonth = month > 1 
      ? `${year}${(month - 1).toString().padStart(2, '0')}`
      : `${year - 1}12`
    
    const nextMonth = month < 12
      ? `${year}${(month + 1).toString().padStart(2, '0')}`
      : `${year + 1}01`
    
    // Preload with low priority
    const prevKey = currentKey.replace(currentMonth, prevMonth)
    const nextKey = currentKey.replace(currentMonth, nextMonth)
    
    // Use requestIdleCallback for preloading
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        this.getMesh(prevKey, data, { resolution, priority: 'low' })
        this.getMesh(nextKey, data, { resolution, priority: 'low' })
      })
    }
  }

  clearCache(): void {
    this.cache.clear()
    this.generationQueue.clear()
  }

  getStats() {
    return {
      cache: this.cache.getStats(),
      queueSize: this.generationQueue.size,
      workers: this.workers.length
    }
  }

  dispose(): void {
    // Terminate workers
    this.workers.forEach(worker => worker.terminate())
    this.workers = []
    this.clearCache()
  }
}

// Singleton instance
let managerInstance: MeshCacheManager | null = null

export function getMeshCacheManager(): MeshCacheManager {
  if (!managerInstance) {
    managerInstance = new MeshCacheManager()
  }
  return managerInstance
}