/**
 * 초고속 파티클 로더
 * 정적 파일에서 파티클 데이터를 즉시 로드하고 런타임에 색상 적용
 */

import type { ParticleData } from './particle-data'

// 메모리 캐시 (위치 데이터만)
const particleCache = new Map<string, Omit<ParticleData, 'color'>[]>()
const colorThemeCache = new Map<string, [number, number, number][]>()

/**
 * 색상 테마 로드
 */
async function loadColorThemes(): Promise<Record<string, [number, number, number][]>> {
  if (colorThemeCache.size > 0) {
    return Object.fromEntries(colorThemeCache)
  }
  
  try {
    const response = await fetch('/data/color-themes.json')
    if (!response.ok) {
      // Fallback to hardcoded themes
      const defaultThemes = {
        current: [
          [230, 126, 34],
          [231, 76, 60],
          [241, 196, 15],
          [155, 89, 182],
          [52, 152, 219]
        ],
        ocean: [
          [0, 119, 190],
          [0, 180, 216],
          [144, 224, 239],
          [72, 202, 228],
          [0, 150, 199]
        ],
        sunset: [
          [255, 94, 77],
          [255, 154, 0],
          [237, 117, 57],
          [255, 206, 84],
          [255, 171, 64]
        ],
        green: [
          [27, 94, 32],
          [56, 142, 60],
          [76, 175, 80],
          [104, 159, 56],
          [139, 195, 74]
        ],
        cyan: [
          [0, 188, 212],
          [0, 172, 193],
          [38, 198, 218],
          [0, 150, 136],
          [100, 255, 218]
        ],
        violet: [
          [138, 43, 226],
          [75, 0, 130],
          [148, 0, 211],
          [153, 50, 204],
          [186, 85, 211]
        ],
        neon: [
          [255, 0, 255],
          [0, 255, 255],
          [255, 0, 128],
          [128, 255, 0],
          [255, 64, 255]
        ],
        forest: [
          [27, 94, 32],
          [56, 142, 60],
          [76, 175, 80],
          [104, 159, 56],
          [139, 195, 74]
        ],
        aurora: [
          [0, 255, 127],
          [0, 255, 255],
          [138, 43, 226],
          [75, 0, 130],
          [0, 191, 255]
        ],
        galaxy: [
          [138, 43, 226],
          [75, 0, 130],
          [255, 0, 255],
          [148, 0, 211],
          [186, 85, 211]
        ],
        cyberpunk: [
          [255, 0, 128],
          [0, 255, 255],
          [255, 0, 255],
          [128, 0, 255],
          [0, 128, 255]
        ]
      }
      
      Object.entries(defaultThemes).forEach(([key, value]) => {
        colorThemeCache.set(key, value as [number, number, number][])
      })
      
      return defaultThemes as Record<string, [number, number, number][]>
    }
    
    const themes = await response.json()
    Object.entries(themes).forEach(([key, value]) => {
      colorThemeCache.set(key, value as [number, number, number][])
    })
    
    return themes
  } catch (error) {
    console.warn('[FastLoader] Could not load color themes, using defaults')
    throw error
  }
}

/**
 * 런타임에 색상 적용
 */
function applyColorTheme(
  particles: Omit<ParticleData, 'color'>[],
  colorTheme: string
): ParticleData[] {
  const themes = Object.fromEntries(colorThemeCache)
  const palette = themes[colorTheme] || themes['current']
  
  return particles.map(p => {
    // 밀도 기반으로 색상 분포 조정 (옵션)
    const colorIndex = Math.floor(Math.random() * palette.length)
    
    return {
      ...p,
      color: palette[colorIndex] as [number, number, number]
    }
  })
}

/**
 * 최적화된 정적 파일에서 파티클 데이터 로드
 * 색상은 런타임에 적용
 */
export async function loadStaticParticles(
  quality: 'high' | 'medium' | 'low',
  colorTheme: string
): Promise<ParticleData[]> {
  const cacheKey = `${quality}-${colorTheme}`
  
  // 완성된 파티클 캐시 확인
  if (memoryCache.has(cacheKey)) {
    console.log('[FastLoader] Loaded from memory cache')
    return memoryCache.get(cacheKey)!
  }
  
  try {
    // 색상 테마 로드 (한 번만)
    if (colorThemeCache.size === 0) {
      await loadColorThemes()
    }
    
    // 위치 데이터 로드 또는 캐시에서 가져오기
    let baseParticles: Omit<ParticleData, 'color'>[]
    
    if (particleCache.has(quality)) {
      baseParticles = particleCache.get(quality)!
      console.log('[FastLoader] Base particles from cache')
    } else {
      // 색상 없는 파티클 데이터 로드
      const response = await fetch(`/data/particles-${quality}.json`)
      if (!response.ok) {
        // Fallback to old format for backward compatibility
        const oldResponse = await fetch(`/data/particles-${quality}-${colorTheme}.json`)
        if (!oldResponse.ok) throw new Error('Static file not found')
        
        const oldParticles = await oldResponse.json()
        memoryCache.set(cacheKey, oldParticles)
        return oldParticles
      }
      
      baseParticles = await response.json()
      particleCache.set(quality, baseParticles)
      console.log(`[FastLoader] Loaded ${baseParticles.length} base particles`)
    }
    
    // 색상 적용
    const particlesWithColor = applyColorTheme(baseParticles, colorTheme)
    
    // 완성된 데이터 캐시
    memoryCache.set(cacheKey, particlesWithColor)
    
    console.log(`[FastLoader] Applied ${colorTheme} theme to ${particlesWithColor.length} particles`)
    return particlesWithColor
  } catch (error) {
    console.warn('[FastLoader] Static file not available, falling back to generation')
    throw error
  }
}

// 메모리 캐시
const memoryCache = new Map<string, ParticleData[]>()

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