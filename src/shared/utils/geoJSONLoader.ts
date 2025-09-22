// GeoJSON 데이터 로더 with 압축 및 캐싱
interface CacheEntry {
  data: any;
  timestamp: number;
  etag?: string;
}

const CACHE_NAME = 'geojson-cache-v1';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

class GeoJSONLoader {
  private memoryCache: Map<string, CacheEntry> = new Map();
  private loadingPromises: Map<string, Promise<any>> = new Map();

  async loadWithCache(url: string): Promise<any> {
    // Check memory cache first
    const memCached = this.memoryCache.get(url);
    if (memCached && Date.now() - memCached.timestamp < CACHE_DURATION) {
      return memCached.data;
    }

    // Prevent duplicate requests
    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url);
    }

    const loadPromise = this.loadFromCacheOrNetwork(url);
    this.loadingPromises.set(url, loadPromise);
    
    try {
      const data = await loadPromise;
      return data;
    } finally {
      this.loadingPromises.delete(url);
    }
  }

  private async loadFromCacheOrNetwork(url: string): Promise<any> {
    // Try browser cache API
    if ('caches' in window) {
      try {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(url);

        if (cachedResponse) {
          const cacheTime = cachedResponse.headers.get('X-Cache-Time');
          if (cacheTime && Date.now() - parseInt(cacheTime) < CACHE_DURATION) {
            const data = await cachedResponse.json();
            this.memoryCache.set(url, {
              data,
              timestamp: parseInt(cacheTime)
            });
            return data;
          }
        }
      } catch (e) {
        console.warn('Cache API error:', e);
      }
    }

    // Fetch from network with Next.js caching strategies
    // GeoJSON boundaries are static - use force-cache with tags for selective invalidation
    const response = await fetch(url, {
      headers: {
        'Accept-Encoding': 'gzip, deflate, br'
      },
      // @ts-ignore - Next.js specific fetch options
      next: {
        tags: ['geojson', `geojson-${url.split('/').pop()}`], // Tag for selective revalidation
        revalidate: 86400 // 24 hours cache
      },
      cache: 'force-cache' // Static data - force caching
    });

    if (!response.ok) {
      throw new Error(`Failed to load ${url}: ${response.statusText}`);
    }

    const data = await response.json();

    // Store in caches
    this.storeInCache(url, data);

    return data;
  }

  private async storeInCache(url: string, data: any): Promise<void> {
    const timestamp = Date.now();
    
    // Store in memory cache
    this.memoryCache.set(url, {
      data,
      timestamp
    });

    // Store in browser cache API
    if ('caches' in window) {
      try {
        const cache = await caches.open(CACHE_NAME);
        const response = new Response(JSON.stringify(data), {
          headers: {
            'Content-Type': 'application/json',
            'X-Cache-Time': timestamp.toString()
          }
        });
        await cache.put(url, response);
      } catch (e) {
        console.warn('Failed to store in cache:', e);
      }
    }
  }

  // Preload data in background
  async preload(urls: string[]): Promise<void> {
    await Promise.all(urls.map(url => this.loadWithCache(url).catch(e => {
      console.warn(`Failed to preload ${url}:`, e);
    })));
  }

  // Clear old cache entries
  async clearOldCache(): Promise<void> {
    if ('caches' in window) {
      const cache = await caches.open(CACHE_NAME);
      const requests = await cache.keys();
      const now = Date.now();
      
      for (const request of requests) {
        const response = await cache.match(request);
        if (response) {
          const cacheTime = response.headers.get('X-Cache-Time');
          if (cacheTime && now - parseInt(cacheTime) > CACHE_DURATION) {
            await cache.delete(request);
          }
        }
      }
    }
  }
}

export const geoJSONLoader = new GeoJSONLoader();