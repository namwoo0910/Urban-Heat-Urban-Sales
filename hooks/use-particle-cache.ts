/**
 * IndexedDB-based caching for particle data
 * Provides ultra-fast storage and retrieval without serialization overhead
 */

import { useEffect, useState, useCallback } from 'react'
import type { ParticleData } from '@/utils/particle-data-optimized'

const DB_NAME = 'SeoulVisualization'
const DB_VERSION = 2
const STORE_NAME = 'particles'
const CACHE_EXPIRY = 24 * 60 * 60 * 1000 // 24 hours

interface CachedParticleData {
  id: string
  particles: ParticleData[]
  buffers?: {
    positions: Float32Array
    colors: Uint8Array
    sizes: Float32Array
  }
  timestamp: number
  count: number
  colorTheme: string
}

class ParticleCacheDB {
  private db: IDBDatabase | null = null
  private initPromise: Promise<void> | null = null

  async initialize(): Promise<void> {
    if (this.db) return
    if (this.initPromise) return this.initPromise

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        console.log('[ParticleCache] IndexedDB initialized')
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create or upgrade object store
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
          store.createIndex('timestamp', 'timestamp', { unique: false })
          store.createIndex('colorTheme', 'colorTheme', { unique: false })
        }
      }
    })

    return this.initPromise
  }

  async save(
    particles: ParticleData[],
    colorTheme: string,
    buffers?: any
  ): Promise<void> {
    await this.initialize()
    if (!this.db) throw new Error('Database not initialized')

    const id = `particles_${colorTheme}_${particles.length}`
    const data: CachedParticleData = {
      id,
      particles,
      buffers,
      timestamp: Date.now(),
      count: particles.length,
      colorTheme
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.put(data)

      request.onsuccess = () => {
        console.log(`[ParticleCache] Saved ${particles.length} particles`)
        resolve()
      }

      request.onerror = () => {
        console.error('Failed to save particles:', request.error)
        reject(request.error)
      }
    })
  }

  async load(
    count: number,
    colorTheme: string
  ): Promise<CachedParticleData | null> {
    await this.initialize()
    if (!this.db) return null

    const id = `particles_${colorTheme}_${count}`

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(id)

      request.onsuccess = () => {
        const data = request.result as CachedParticleData | undefined
        
        if (!data) {
          console.log('[ParticleCache] Cache miss')
          resolve(null)
          return
        }

        // Check if cache is expired
        const isExpired = Date.now() - data.timestamp > CACHE_EXPIRY
        if (isExpired) {
          console.log('[ParticleCache] Cache expired')
          this.delete(id) // Clean up expired cache
          resolve(null)
          return
        }

        console.log(`[ParticleCache] Cache hit: ${data.count} particles`)
        resolve(data)
      }

      request.onerror = () => {
        console.error('Failed to load particles:', request.error)
        resolve(null)
      }
    })
  }

  async delete(id: string): Promise<void> {
    if (!this.db) return

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(id)

      request.onsuccess = () => {
        console.log(`[ParticleCache] Deleted cache: ${id}`)
        resolve()
      }

      request.onerror = () => {
        console.error('Failed to delete cache:', request.error)
        resolve()
      }
    })
  }

  async clearOldCaches(): Promise<void> {
    await this.initialize()
    if (!this.db) return

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const index = store.index('timestamp')
      const cutoff = Date.now() - CACHE_EXPIRY
      const range = IDBKeyRange.upperBound(cutoff)
      const request = index.openCursor(range)

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          store.delete(cursor.primaryKey)
          cursor.continue()
        } else {
          console.log('[ParticleCache] Old caches cleared')
          resolve()
        }
      }

      request.onerror = () => {
        console.error('Failed to clear old caches:', request.error)
        resolve()
      }
    })
  }

  async getStorageInfo(): Promise<{ usage: number; quota: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate()
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0
      }
    }
    return { usage: 0, quota: 0 }
  }
}

// Singleton instance
const cacheDB = new ParticleCacheDB()

/**
 * React hook for particle caching with IndexedDB
 */
export function useParticleCache() {
  const [isReady, setIsReady] = useState(false)
  const [storageInfo, setStorageInfo] = useState({ usage: 0, quota: 0 })

  useEffect(() => {
    // Initialize database and clean old caches
    cacheDB.initialize().then(() => {
      setIsReady(true)
      cacheDB.clearOldCaches()
      cacheDB.getStorageInfo().then(setStorageInfo)
    })
  }, [])

  const saveParticles = useCallback(
    async (
      particles: ParticleData[],
      colorTheme: string,
      buffers?: any
    ): Promise<void> => {
      if (!isReady) return
      
      try {
        await cacheDB.save(particles, colorTheme, buffers)
        const info = await cacheDB.getStorageInfo()
        setStorageInfo(info)
      } catch (error) {
        console.error('[ParticleCache] Save failed:', error)
      }
    },
    [isReady]
  )

  const loadParticles = useCallback(
    async (
      count: number,
      colorTheme: string
    ): Promise<ParticleData[] | null> => {
      if (!isReady) return null
      
      try {
        const cached = await cacheDB.load(count, colorTheme)
        return cached?.particles || null
      } catch (error) {
        console.error('[ParticleCache] Load failed:', error)
        return null
      }
    },
    [isReady]
  )

  const clearCache = useCallback(async (): Promise<void> => {
    if (!isReady) return
    
    try {
      await cacheDB.clearOldCaches()
      const info = await cacheDB.getStorageInfo()
      setStorageInfo(info)
    } catch (error) {
      console.error('[ParticleCache] Clear failed:', error)
    }
  }, [isReady])

  return {
    isReady,
    saveParticles,
    loadParticles,
    clearCache,
    storageInfo,
    storageUsagePercent: storageInfo.quota > 0 
      ? (storageInfo.usage / storageInfo.quota) * 100 
      : 0
  }
}

export default useParticleCache