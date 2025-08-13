/**
 * 초고속 파티클 로더
 * 정적 파일에서 파티클 데이터를 즉시 로드
 */

import type { ParticleData } from './particle-data'

// 메모리 캐시
const memoryCache = new Map<string, ParticleData[]>()

/**
 * 정적 파일에서 파티클 데이터 로드
 * 계산 없이 바로 사용 가능
 */
export async function loadStaticParticles(
  quality: 'high' | 'medium' | 'low',
  colorTheme: string
): Promise<ParticleData[]> {
  const cacheKey = `${quality}-${colorTheme}`
  
  // 메모리 캐시 확인
  if (memoryCache.has(cacheKey)) {
    console.log('[FastLoader] Loaded from memory cache')
    return memoryCache.get(cacheKey)!
  }
  
  try {
    // 정적 파일 로드
    const response = await fetch(`/data/particles-${quality}-${colorTheme}.json`)
    if (!response.ok) throw new Error('Static file not found')
    
    const particles = await response.json()
    
    // 메모리에 캐시
    memoryCache.set(cacheKey, particles)
    
    console.log(`[FastLoader] Loaded ${particles.length} particles from static file`)
    return particles
  } catch (error) {
    console.warn('[FastLoader] Static file not available, falling back to generation')
    throw error
  }
}

/**
 * Wave Layer 그리드 데이터 로드
 */
export async function loadWaveGrid(): Promise<{ positions: number[], uvs: number[] }> {
  try {
    const response = await fetch('/data/wave-grid.json')
    if (!response.ok) throw new Error('Wave grid not found')
    
    const grid = await response.json()
    console.log('[FastLoader] Loaded wave grid from static file')
    return grid
  } catch (error) {
    console.warn('[FastLoader] Wave grid not available, generating...')
    throw error
  }
}

/**
 * 병렬 프리로드 - 모든 리소스를 동시에 로드
 */
export async function preloadAllResources(
  quality: 'high' | 'medium' | 'low',
  colorTheme: string
): Promise<{
  particles: ParticleData[]
  waveGrid: { positions: number[], uvs: number[] }
}> {
  const [particles, waveGrid] = await Promise.all([
    loadStaticParticles(quality, colorTheme),
    loadWaveGrid()
  ])
  
  return { particles, waveGrid }
}