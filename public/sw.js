/**
 * Service Worker for SLW VIS
 * Optimized caching strategy for data files and assets
 */

const CACHE_NAME = 'slw-vis-v1.0.0'
const RUNTIME_CACHE = 'slw-vis-runtime'
const DATA_CACHE = 'slw-vis-data'

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/_next/static/css/',
  '/_next/static/chunks/vendor-core',
  '/_next/static/chunks/ui-libs'
]

// Data files to cache with specific strategies
const DATA_PATTERNS = [
  /^\/seoul_boundary\.(geojson|compressed\.gz)$/,
  /^\/urbanmountain\/processed_data\//,
  /^\/urbanmountain\/chunks\//,
  /^\/dummy-hexagon-data\.json$/
]

// Heavy assets to cache but not preload
const HEAVY_ASSETS = [
  /^\/\_next\/static\/chunks\/graphics-libs/,
  /^\/\_next\/static\/chunks\/mapbox-libs/,
  /^\/\_next\/static\/chunks\/animations/
]

/**
 * Install event - cache critical static assets
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker')
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets')
      return cache.addAll(STATIC_ASSETS.filter(asset => asset.endsWith('/')))
    }).then(() => {
      // Force immediate activation
      return self.skipWaiting()
    }).catch((error) => {
      console.error('[SW] Failed to cache static assets:', error)
    })
  )
})

/**
 * Activate event - clean old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker')
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && 
              cacheName !== RUNTIME_CACHE && 
              cacheName !== DATA_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => {
      // Take control of all clients immediately
      return self.clients.claim()
    })
  )
})

/**
 * Determine caching strategy based on request
 */
function getCachingStrategy(request) {
  const url = new URL(request.url)
  const pathname = url.pathname
  
  // Data files - cache first with network fallback
  if (DATA_PATTERNS.some(pattern => pattern.test(pathname))) {
    return 'data-cache-first'
  }
  
  // Heavy graphics assets - cache first
  if (HEAVY_ASSETS.some(pattern => pattern.test(pathname))) {
    return 'cache-first'
  }
  
  // API calls - network first with cache fallback
  if (pathname.startsWith('/api/')) {
    return 'network-first'
  }
  
  // Static assets - stale while revalidate
  if (pathname.startsWith('/_next/static/') || 
      pathname.startsWith('/images/') ||
      pathname.includes('.css') ||
      pathname.includes('.js')) {
    return 'stale-while-revalidate'
  }
  
  // Pages - network first with cache fallback
  return 'network-first'
}

/**
 * Cache-first strategy for data files
 */
async function dataCacheFirst(request) {
  const cache = await caches.open(DATA_CACHE)
  const cachedResponse = await cache.match(request)
  
  if (cachedResponse) {
    console.log('[SW] Serving from data cache:', request.url)
    
    // Background update for data freshness
    fetch(request).then((response) => {
      if (response.status === 200) {
        cache.put(request, response.clone())
      }
    }).catch(() => {
      // Network error, keep using cache
    })
    
    return cachedResponse
  }
  
  // Not in cache, fetch from network
  try {
    const response = await fetch(request)
    
    if (response.status === 200) {
      // Cache successful responses
      cache.put(request, response.clone())
    }
    
    return response
  } catch (error) {
    console.error('[SW] Failed to fetch data:', request.url, error)
    throw error
  }
}

/**
 * Cache-first strategy for heavy assets
 */
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME)
  const cachedResponse = await cache.match(request)
  
  if (cachedResponse) {
    return cachedResponse
  }
  
  const response = await fetch(request)
  
  if (response.status === 200) {
    cache.put(request, response.clone())
  }
  
  return response
}

/**
 * Network-first strategy with cache fallback
 */
async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE)
  
  try {
    const response = await fetch(request)
    
    if (response.status === 200) {
      cache.put(request, response.clone())
    }
    
    return response
  } catch (error) {
    const cachedResponse = await cache.match(request)
    
    if (cachedResponse) {
      console.log('[SW] Network failed, serving from cache:', request.url)
      return cachedResponse
    }
    
    throw error
  }
}

/**
 * Stale-while-revalidate strategy
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME)
  const cachedResponse = await cache.match(request)
  
  // Always try to update in background
  const fetchPromise = fetch(request).then((response) => {
    if (response.status === 200) {
      cache.put(request, response.clone())
    }
    return response
  }).catch(() => {
    // Network error, ignore
  })
  
  // Return cached version immediately if available
  if (cachedResponse) {
    return cachedResponse
  }
  
  // Wait for network if no cache
  return await fetchPromise
}

/**
 * Main fetch event handler
 */
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return
  }
  
  // Skip chrome-extension and other non-http requests
  if (!event.request.url.startsWith('http')) {
    return
  }
  
  const strategy = getCachingStrategy(event.request)
  
  event.respondWith(
    (async () => {
      try {
        switch (strategy) {
          case 'data-cache-first':
            return await dataCacheFirst(event.request)
          case 'cache-first':
            return await cacheFirst(event.request)
          case 'network-first':
            return await networkFirst(event.request)
          case 'stale-while-revalidate':
            return await staleWhileRevalidate(event.request)
          default:
            return await fetch(event.request)
        }
      } catch (error) {
        console.error('[SW] Request failed:', event.request.url, error)
        
        // Try to serve from any cache as last resort
        const anyCache = await caches.match(event.request)
        if (anyCache) {
          return anyCache
        }
        
        // Return offline page for navigation requests
        if (event.request.mode === 'navigate') {
          return new Response(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Offline - SLW VIS</title>
                <style>
                  body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #0a0a0a; color: white; }
                  h1 { color: #fff; }
                  p { color: #ccc; }
                </style>
              </head>
              <body>
                <h1>You're offline</h1>
                <p>Please check your internet connection and try again.</p>
                <button onclick="window.location.reload()">Retry</button>
              </body>
            </html>
          `, {
            status: 200,
            headers: { 'Content-Type': 'text/html' }
          })
        }
        
        throw error
      }
    })()
  )
})

/**
 * Message handling for cache management
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type) {
    switch (event.data.type) {
      case 'SKIP_WAITING':
        self.skipWaiting()
        break
        
      case 'CLEAR_CACHE':
        caches.keys().then((cacheNames) => {
          return Promise.all(
            cacheNames.map(cacheName => caches.delete(cacheName))
          )
        }).then(() => {
          event.ports[0].postMessage({ success: true })
        })
        break
        
      case 'GET_CACHE_INFO':
        caches.keys().then(async (cacheNames) => {
          const info = {}
          for (const cacheName of cacheNames) {
            const cache = await caches.open(cacheName)
            const keys = await cache.keys()
            info[cacheName] = keys.length
          }
          event.ports[0].postMessage(info)
        })
        break
        
      default:
        console.log('[SW] Unknown message type:', event.data.type)
    }
  }
})

/**
 * Background sync for data prefetching
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'prefetch-data') {
    event.waitUntil(prefetchCriticalData())
  }
})

/**
 * Prefetch critical data in background
 */
async function prefetchCriticalData() {
  const cache = await caches.open(DATA_CACHE)
  
  const criticalUrls = [
    '/seoul_boundary.compressed.gz',
    '/urbanmountain/processed_data/metadata.json'
  ]
  
  for (const url of criticalUrls) {
    try {
      const response = await fetch(url)
      if (response.ok) {
        await cache.put(url, response)
        console.log('[SW] Prefetched:', url)
      }
    } catch (error) {
      console.log('[SW] Failed to prefetch:', url, error)
    }
  }
}

console.log('[SW] Service worker script loaded')