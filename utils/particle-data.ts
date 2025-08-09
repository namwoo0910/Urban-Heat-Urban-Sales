import { 
  SeoulBoundaryData, 
  isPointInSeoul, 
  getSeoulBoundingBox,
  getDistrictName 
} from './seoul-boundaries'

// 서울 주요 지역 및 밀도 (0.7배로 감소)
const HIGH_DENSITY_AREAS = [
  { name: "강남", center: [127.0276, 37.4979], radius: 0.02, density: 0.84 },  // 1.2 * 0.7
  { name: "명동", center: [126.9861, 37.5636], radius: 0.015, density: 0.7 },  // 1.0 * 0.7
  { name: "홍대", center: [126.924, 37.5563], radius: 0.02, density: 0.63 },   // 0.9 * 0.7
  { name: "여의도", center: [126.9246, 37.5219], radius: 0.018, density: 0.56 },  // 0.8 * 0.7
  { name: "동대문", center: [127.0079, 37.5714], radius: 0.015, density: 0.56 },  // 0.8 * 0.7
  { name: "잠실", center: [127.1001, 37.5132], radius: 0.02, density: 0.63 },  // 0.9 * 0.7
  { name: "신촌", center: [126.9368, 37.5585], radius: 0.015, density: 0.49 },  // 0.7 * 0.7
  { name: "건대", center: [127.0737, 37.5407], radius: 0.015, density: 0.77 },  // 1.1 * 0.7
]

// 색상 팔레트 (현재 Three.js Scene과 유사한 색상)
const COLOR_PALETTE = [
  [138, 43, 226],   // 보라색
  [65, 105, 225],   // 로열 블루
  [0, 191, 255],    // 딥 스카이 블루
  [72, 209, 204],   // 청록색
  [147, 112, 219],  // 미디엄 퍼플
  [100, 149, 237],  // 콘플라워 블루
  [176, 224, 230],  // 파우더 블루
  [255, 105, 180],  // 핫 핑크
  [221, 160, 221],  // 자두색
]

// Color themes for particle visualization
export const COLOR_THEMES = {
  current: COLOR_PALETTE,  // Original/current palette
  ocean: [
    [0, 119, 190],    // Deep blue
    [0, 180, 216],    // Ocean blue
    [144, 224, 239],  // Light blue
    [72, 202, 228],   // Sky blue
    [0, 150, 199],    // Marine blue
    [3, 169, 244],    // Bright blue
    [129, 212, 250],  // Pale blue
    [0, 96, 100],     // Dark teal
    [0, 188, 212],    // Cyan
  ],
  sunset: [
    [255, 94, 77],    // Coral
    [255, 154, 0],    // Orange
    [255, 206, 84],   // Golden
    [237, 117, 57],   // Burnt orange
    [255, 171, 64],   // Peach
    [255, 87, 51],    // Red-orange
    [251, 140, 90],   // Salmon
    [255, 193, 7],    // Amber
    [255, 111, 97],   // Light coral
  ],
  forest: [
    [27, 94, 32],     // Dark green
    [56, 142, 60],    // Forest green
    [76, 175, 80],    // Light green
    [104, 159, 56],   // Olive green
    [139, 195, 74],   // Lime green
    [46, 125, 50],    // Medium green
    [67, 160, 71],    // Grass green
    [124, 179, 66],   // Yellow-green
    [85, 139, 47],    // Moss green
  ],
  aurora: [
    [0, 255, 127],    // Spring green
    [0, 255, 255],    // Cyan
    [138, 43, 226],   // Blue violet
    [75, 0, 130],     // Indigo
    [0, 191, 255],    // Deep sky blue
    [50, 205, 50],    // Lime green
    [147, 112, 219],  // Medium purple
    [0, 206, 209],    // Dark turquoise
    [123, 104, 238],  // Medium slate blue
  ],
  galaxy: [
    [138, 43, 226],   // Blue violet
    [75, 0, 130],     // Indigo
    [255, 0, 255],    // Magenta
    [148, 0, 211],    // Dark violet
    [186, 85, 211],   // Medium orchid
    [147, 112, 219],  // Medium purple
    [123, 104, 238],  // Medium slate blue
    [106, 90, 205],   // Slate blue
    [153, 50, 204],   // Dark orchid
  ],
  cyberpunk: [
    [255, 0, 128],    // Neon pink
    [0, 255, 255],    // Cyan
    [255, 0, 255],    // Magenta
    [128, 0, 255],    // Purple
    [0, 128, 255],    // Blue
    [255, 128, 0],    // Orange
    [0, 255, 128],    // Green
    [255, 255, 0],    // Yellow
    [255, 0, 64],     // Red-pink
  ],
}

export interface ParticleData {
  position: [number, number]
  color: [number, number, number]
  size: number
  speed: number
  phase: number
  amplitude: number
  district?: string | null // 구 정보 (선택적)
}

// 주어진 점이 고밀도 지역에 있는지 확인
function getAreaDensity(lng: number, lat: number): number {
  for (const area of HIGH_DENSITY_AREAS) {
    const distance = Math.sqrt(
      Math.pow(lng - area.center[0], 2) + 
      Math.pow(lat - area.center[1], 2)
    )
    if (distance < area.radius) {
      return area.density
    }
  }
  return 0.5 // 기본 밀도
}

// Cache for pre-generated particles
const PARTICLE_CACHE_KEY = 'seoul_particles_cache_v2' // v2: adjusted density distribution
const PARTICLE_CACHE_EXPIRY = 12 * 60 * 60 * 1000 // 12 hours

/**
 * Progressive particle generation with caching and optimization
 */
export async function generateSeoulParticlesWithBoundary(
  count: number = 8000,
  boundaryData: SeoulBoundaryData,
  onProgress?: (progress: number) => void,
  colorTheme: keyof typeof COLOR_THEMES = 'current'
): Promise<ParticleData[]> {
  // Try to load from cache first
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(PARTICLE_CACHE_KEY)
    if (cached) {
      try {
        const { particles, timestamp, cacheCount } = JSON.parse(cached)
        const isExpired = Date.now() - timestamp > PARTICLE_CACHE_EXPIRY
        
        if (!isExpired && cacheCount >= count) {
          onProgress?.(100)
          return particles.slice(0, count)
        } else {
          localStorage.removeItem(PARTICLE_CACHE_KEY)
        }
      } catch (e) {
        localStorage.removeItem(PARTICLE_CACHE_KEY)
      }
    }
  }

  return generateParticlesOptimized(count, boundaryData, onProgress, colorTheme)
}

/**
 * Optimized particle generation with smart sampling
 */
async function generateParticlesOptimized(
  count: number,
  boundaryData: SeoulBoundaryData,
  onProgress?: (progress: number) => void,
  colorTheme: keyof typeof COLOR_THEMES = 'current'
): Promise<ParticleData[]> {
  const particles: ParticleData[] = []
  const bounds = getSeoulBoundingBox(boundaryData)
  const lngRange = bounds.maxLng - bounds.minLng
  const latRange = bounds.maxLat - bounds.minLat
  const selectedPalette = COLOR_THEMES[colorTheme]
  const colorCount = selectedPalette.length
  const twoPi = Math.PI * 2
  
  // Progressive generation in batches for better UX
  const batchSize = Math.min(500, Math.max(100, count / 10))
  let generated = 0
  
  // Pre-generate sample points for high-density areas
  const highDensityPoints = generateHighDensityPoints(bounds)
  
  while (generated < count) {
    const batchTarget = Math.min(generated + batchSize, count)
    const batchParticles: ParticleData[] = []
    
    // Mix high-density and random points for better distribution
    for (let i = generated; i < batchTarget; i++) {
      let lng: number, lat: number, density: number
      
      // 45% from high-density areas, 55% random (더 균등한 분포)
      if (Math.random() < 0.45 && highDensityPoints.length > 0) {
        const point = highDensityPoints[Math.floor(Math.random() * highDensityPoints.length)]
        lng = point.lng
        lat = point.lat
        density = point.density
      } else {
        // Smart random generation with rejection sampling optimization
        let attempts = 0
        do {
          lng = bounds.minLng + Math.random() * lngRange
          lat = bounds.minLat + Math.random() * latRange
          attempts++
        } while (!isPointInSeoul(lng, lat, boundaryData) && attempts < 20)
        
        if (attempts >= 20) continue // Skip if can't find valid point quickly
        density = getAreaDensity(lng, lat)
      }
      
      // Apply density-based filtering
      if (Math.random() < density) {
        const colorIndex = (Math.random() * colorCount) | 0
        const color = selectedPalette[colorIndex]
        
        const baseSize = 30 + Math.random() * 80
        const size = baseSize * (0.7 + density * 0.3)
        
        batchParticles.push({
          position: [lng, lat],
          color: color as [number, number, number],
          size,
          speed: 0.0002 + Math.random() * 0.0005,
          phase: Math.random() * twoPi,
          amplitude: 0.001 + Math.random() * 0.002,
          district: getDistrictName(lng, lat, boundaryData),
        })
      }
    }
    
    particles.push(...batchParticles)
    generated = particles.length
    
    // Report progress
    const progress = (generated / count) * 100
    onProgress?.(progress)
    
    // Yield control to prevent blocking
    if (generated < count) {
      await new Promise(resolve => requestAnimationFrame(resolve))
    }
  }
  
  // Cache generated particles for future use
  if (typeof window !== 'undefined' && particles.length > 0) {
    try {
      localStorage.setItem(PARTICLE_CACHE_KEY, JSON.stringify({
        particles,
        timestamp: Date.now(),
        cacheCount: particles.length
      }))
    } catch (e) {
      console.warn('Failed to cache particles:', e)
    }
  }
  
  return particles.slice(0, count)
}

/**
 * Pre-generate points in high-density areas for faster sampling
 */
function generateHighDensityPoints(bounds: any): Array<{lng: number, lat: number, density: number}> {
  const points: Array<{lng: number, lat: number, density: number}> = []
  
  for (const area of HIGH_DENSITY_AREAS) {
    const [centerLng, centerLat] = area.center
    const sampleCount = Math.floor(area.density * 80) // Reduced sample count for better distribution
    
    for (let i = 0; i < sampleCount; i++) {
      // Generate points in circular distribution around center
      const angle = Math.random() * 2 * Math.PI
      const radius = Math.random() * area.radius
      const lng = centerLng + Math.cos(angle) * radius
      const lat = centerLat + Math.sin(angle) * radius
      
      // Ensure point is within bounds
      if (lng >= bounds.minLng && lng <= bounds.maxLng && 
          lat >= bounds.minLat && lat <= bounds.maxLat) {
        points.push({ lng, lat, density: area.density })
      }
    }
  }
  
  return points
}

// 기존 함수도 유지 (하위 호환성)
export function generateSeoulParticles(count: number = 8000): ParticleData[] {
  // 임시 경계 사용 (GeoJSON 로드 전)
  const SEOUL_BOUNDS = {
    minLng: 126.764,
    maxLng: 127.183,
    minLat: 37.413,
    maxLat: 37.701,
  }
  
  const particles: ParticleData[] = []
  const lngRange = SEOUL_BOUNDS.maxLng - SEOUL_BOUNDS.minLng
  const latRange = SEOUL_BOUNDS.maxLat - SEOUL_BOUNDS.minLat
  
  // 미리 계산된 값들
  const colorCount = COLOR_PALETTE.length
  const twoPi = Math.PI * 2
  
  let generated = 0
  let attempts = 0
  const maxAttempts = count * 3 // 무한 루프 방지
  
  while (generated < count && attempts < maxAttempts) {
    attempts++
    const lng = SEOUL_BOUNDS.minLng + Math.random() * lngRange
    const lat = SEOUL_BOUNDS.minLat + Math.random() * latRange
    
    // 밀도에 따라 파티클 생성 확률 조정
    const density = getAreaDensity(lng, lat)
    if (Math.random() < density) {
      // 랜덤 색상 선택 (비트 연산 사용)
      const colorIndex = (Math.random() * colorCount) | 0
      const color = COLOR_PALETTE[colorIndex]
      
      // 크기 변화 (밀도가 높은 지역은 더 큰 파티클) - 50% 감소
      const baseSize = 25 + Math.random() * 75
      const size = baseSize * (0.7 + density * 0.3)
      
      particles.push({
        position: [lng, lat],
        color: color as [number, number, number],
        size,
        speed: 0.0002 + Math.random() * 0.0005, // 애니메이션 속도
        phase: Math.random() * twoPi, // 초기 위상
        amplitude: 0.001 + Math.random() * 0.002, // 움직임 진폭
      })
      generated++
    }
  }
  
  return particles
}

// 파티클 위치 업데이트 (애니메이션용)
export function updateParticlePositions(
  particles: ParticleData[],
  time: number
): Array<{ position: [number, number]; color: [number, number, number]; size: number }> {
  return particles.map(particle => {
    const offsetX = Math.sin(time * particle.speed + particle.phase) * particle.amplitude
    const offsetY = Math.cos(time * particle.speed * 0.7 + particle.phase) * particle.amplitude * 0.7
    
    return {
      position: [
        particle.position[0] + offsetX,
        particle.position[1] + offsetY,
      ] as [number, number],
      color: particle.color,
      size: particle.size * (0.8 + Math.sin(time * 0.001 + particle.phase) * 0.2), // 크기 펄싱
    }
  })
}

// 색상에 그라데이션 효과 추가
export function getGradientColor(
  baseColor: [number, number, number],
  factor: number
): [number, number, number, number] {
  const brightness = 0.7 + factor * 0.3
  return [
    Math.min(255, baseColor[0] * brightness),
    Math.min(255, baseColor[1] * brightness),
    Math.min(255, baseColor[2] * brightness),
    200 + factor * 55, // 투명도
  ]
}