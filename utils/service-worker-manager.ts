/**
 * Service Worker Manager
 * Register and manage service worker for caching optimization
 */

import { useState, useEffect, useCallback } from 'react'

export interface ServiceWorkerStatus {
  isSupported: boolean
  isRegistered: boolean
  isActive: boolean
  registration?: ServiceWorkerRegistration
  error?: string
}

export interface CacheInfo {
  [cacheName: string]: number
}

export class ServiceWorkerManager {
  private static instance: ServiceWorkerManager
  private registration: ServiceWorkerRegistration | null = null
  private status: ServiceWorkerStatus = {
    isSupported: false,
    isRegistered: false,
    isActive: false
  }
  
  static getInstance(): ServiceWorkerManager {
    if (!this.instance) {
      this.instance = new ServiceWorkerManager()
    }
    return this.instance
  }
  
  /**
   * Initialize and register service worker
   */
  async initialize(): Promise<ServiceWorkerStatus> {
    // Check if service workers are supported
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      this.status = {
        isSupported: false,
        isRegistered: false,
        isActive: false,
        error: 'Service Workers not supported'
      }
      return this.status
    }
    
    this.status.isSupported = true
    
    try {
      // Register service worker
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      })
      
      this.status.isRegistered = true
      this.status.registration = this.registration
      
      // Handle different registration states
      if (this.registration.installing) {
        console.log('[SW Manager] Service worker installing')
        this.registration.installing.addEventListener('statechange', this.handleStateChange.bind(this))
      } else if (this.registration.waiting) {
        console.log('[SW Manager] Service worker waiting')
        this.handleWaiting()
      } else if (this.registration.active) {
        console.log('[SW Manager] Service worker active')
        this.status.isActive = true
      }
      
      // Listen for updates
      this.registration.addEventListener('updatefound', this.handleUpdateFound.bind(this))
      
      // Listen for controller changes
      navigator.serviceWorker.addEventListener('controllerchange', this.handleControllerChange.bind(this))
      
      // Check for waiting service worker
      if (this.registration.waiting) {
        this.handleWaiting()
      }
      
      return this.status
      
    } catch (error) {
      console.error('[SW Manager] Registration failed:', error)
      this.status.error = error instanceof Error ? error.message : 'Registration failed'
      return this.status
    }
  }
  
  /**
   * Handle service worker state changes
   */
  private handleStateChange(event: Event): void {
    const serviceWorker = event.target as ServiceWorker
    
    switch (serviceWorker.state) {
      case 'installed':
        if (navigator.serviceWorker.controller) {
          console.log('[SW Manager] New content available, please refresh')
          this.notifyUpdateAvailable()
        } else {
          console.log('[SW Manager] Content cached for offline use')
          this.notifyOfflineReady()
        }
        break
        
      case 'activated':
        console.log('[SW Manager] Service worker activated')
        this.status.isActive = true
        this.notifyActivated()
        break
        
      case 'redundant':
        console.log('[SW Manager] Service worker redundant')
        break
    }
  }
  
  /**
   * Handle update found
   */
  private handleUpdateFound(): void {
    if (!this.registration) return
    
    const newWorker = this.registration.installing
    if (!newWorker) return
    
    newWorker.addEventListener('statechange', this.handleStateChange.bind(this))
  }
  
  /**
   * Handle waiting service worker
   */
  private handleWaiting(): void {
    console.log('[SW Manager] Service worker waiting to activate')
    this.notifyUpdateAvailable()
  }
  
  /**
   * Handle controller change
   */
  private handleControllerChange(): void {
    console.log('[SW Manager] Controller changed, reloading page')
    window.location.reload()
  }
  
  /**
   * Skip waiting and activate new service worker
   */
  async skipWaiting(): Promise<void> {
    if (!this.registration?.waiting) return
    
    // Send message to service worker to skip waiting
    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' })
  }
  
  /**
   * Clear all caches
   */
  async clearCache(): Promise<boolean> {
    if (!this.registration?.active) return false
    
    return new Promise((resolve) => {
      const messageChannel = new MessageChannel()
      
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.success || false)
      }
      
      this.registration!.active!.postMessage(
        { type: 'CLEAR_CACHE' },
        [messageChannel.port2]
      )
      
      // Timeout after 5 seconds
      setTimeout(() => resolve(false), 5000)
    })
  }
  
  /**
   * Get cache information
   */
  async getCacheInfo(): Promise<CacheInfo> {
    if (!this.registration?.active) return {}
    
    return new Promise((resolve) => {
      const messageChannel = new MessageChannel()
      
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data || {})
      }
      
      this.registration!.active!.postMessage(
        { type: 'GET_CACHE_INFO' },
        [messageChannel.port2]
      )
      
      // Timeout after 5 seconds
      setTimeout(() => resolve({}), 5000)
    })
  }
  
  /**
   * Prefetch critical data
   */
  async prefetchData(): Promise<void> {
    if (!('serviceWorker' in navigator) || !this.registration) return
    
    // Request background sync for data prefetching
    if ('sync' in this.registration) {
      try {
        await (this.registration as any).sync.register('prefetch-data')
        console.log('[SW Manager] Background sync registered for data prefetching')
      } catch (error) {
        console.log('[SW Manager] Background sync not available, prefetching manually')
        // Fallback: trigger immediate prefetch
        this.triggerImmediatePrefetch()
      }
    }
  }
  
  /**
   * Trigger immediate prefetch (fallback)
   */
  private async triggerImmediatePrefetch(): Promise<void> {
    const criticalUrls = [
      '/seoul_boundary.compressed.gz',
      '/urbanmountain/processed_data/metadata.json'
    ]
    
    // Use fetch to trigger service worker caching
    for (const url of criticalUrls) {
      try {
        await fetch(url, { mode: 'no-cors' })
      } catch (error) {
        console.log('[SW Manager] Failed to prefetch:', url)
      }
    }
  }
  
  /**
   * Check if running in standalone mode (PWA)
   */
  isStandalone(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true
  }
  
  /**
   * Get current status
   */
  getStatus(): ServiceWorkerStatus {
    return { ...this.status }
  }
  
  /**
   * Event notification methods (can be overridden)
   */
  private notifyUpdateAvailable(): void {
    // Override this method to show custom update notification
    console.log('[SW Manager] Update available')
    
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('sw-update-available', {
      detail: { registration: this.registration }
    }))
  }
  
  private notifyOfflineReady(): void {
    console.log('[SW Manager] App ready for offline use')
    
    window.dispatchEvent(new CustomEvent('sw-offline-ready'))
  }
  
  private notifyActivated(): void {
    console.log('[SW Manager] Service worker activated')
    
    window.dispatchEvent(new CustomEvent('sw-activated'))
  }
  
  /**
   * Unregister service worker (for debugging)
   */
  async unregister(): Promise<boolean> {
    if (!this.registration) return false
    
    try {
      const result = await this.registration.unregister()
      if (result) {
        this.status.isRegistered = false
        this.status.isActive = false
        this.registration = null
      }
      return result
    } catch (error) {
      console.error('[SW Manager] Failed to unregister:', error)
      return false
    }
  }
}

/**
 * Hook for using service worker in React components
 */
export function useServiceWorker() {
  const [status, setStatus] = useState<ServiceWorkerStatus>({
    isSupported: false,
    isRegistered: false,
    isActive: false
  })
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [offlineReady, setOfflineReady] = useState(false)
  
  useEffect(() => {
    const manager = ServiceWorkerManager.getInstance()
    
    // Initialize service worker
    manager.initialize().then(setStatus)
    
    // Listen for service worker events
    const handleUpdateAvailable = () => setUpdateAvailable(true)
    const handleOfflineReady = () => setOfflineReady(true)
    const handleActivated = () => {
      setUpdateAvailable(false)
      setStatus(manager.getStatus())
    }
    
    window.addEventListener('sw-update-available', handleUpdateAvailable)
    window.addEventListener('sw-offline-ready', handleOfflineReady)
    window.addEventListener('sw-activated', handleActivated)
    
    return () => {
      window.removeEventListener('sw-update-available', handleUpdateAvailable)
      window.removeEventListener('sw-offline-ready', handleOfflineReady)
      window.removeEventListener('sw-activated', handleActivated)
    }
  }, [])
  
  const updateServiceWorker = useCallback(async () => {
    const manager = ServiceWorkerManager.getInstance()
    await manager.skipWaiting()
  }, [])
  
  const clearCache = useCallback(async () => {
    const manager = ServiceWorkerManager.getInstance()
    return await manager.clearCache()
  }, [])
  
  const prefetchData = useCallback(async () => {
    const manager = ServiceWorkerManager.getInstance()
    await manager.prefetchData()
  }, [])
  
  return {
    status,
    updateAvailable,
    offlineReady,
    updateServiceWorker,
    clearCache,
    prefetchData,
    isStandalone: ServiceWorkerManager.getInstance().isStandalone()
  }
}

export default ServiceWorkerManager