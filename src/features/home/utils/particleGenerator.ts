/**
 * Optimized particle generation with fast algorithms and efficient data structures
 * Enhanced with math acceleration and memory pooling
 */

// Unified particle count for seamless transitions
export const UNIFIED_PARTICLE_COUNT = 10000  // 원래 값으로 복원

// Define types and constants locally since original files were removed
export interface ParticleData {
  x: number
  y: number
  vx: number
  vy: number
  charge: number
  color: string
  targetX?: number
  targetY?: number
  targetVx?: number
  targetVy?: number
  districtName?: string
  position?: [number, number]
  phase?: number
  speed?: number
  amplitude?: number
  size?: number
  district?: string
  ringIndex?: number
  ringPosition?: number
  // Unified particle system fields
  id?: number
  circularPos?: [number, number]
  mapPos?: [number, number]
}

import type { SeoulBoundaryData } from './boundaryProcessor'

// Export the loadSeoulBoundaries function
export async function loadSeoulBoundaries(): Promise<SeoulBoundaryData> {
  const response = await fetch('/seoul_boundary.geojson')
  if (!response.ok) {
    throw new Error('Failed to load Seoul boundary data')
  }
  return response.json()
}

export const COLOR_THEMES = {
  current: [
    'rgba(110, 200, 255, 0.95)',   // Bright Seoul Blue - 더 밝고 강렬
    'rgba(180, 220, 255, 0.9)',   // Bright Light blue - 채도와 밝기 증가
    'rgba(160, 170, 255, 0.85)',  // Bright Indigo - 더 생생한 색상
    'rgba(220, 200, 255, 0.8)',   // Bright Purple - 밝기 증가
    'rgba(255, 210, 50, 0.9)',    // Bright Amber - 더 강렬한 노란색
    'rgba(255, 230, 100, 0.85)',  // Bright Yellow - 생동감 있는 노란색
  ],
  ocean: [
    'rgba(80, 160, 255, 0.95)',   // Bright Blue - 더 선명한 파란색
    'rgba(170, 210, 255, 0.9)',   // Bright Light blue
    'rgba(130, 140, 255, 0.85)',  // Bright Indigo
    'rgba(180, 130, 255, 0.8)',   // Bright Violet
    'rgba(200, 120, 255, 0.95)',  // Bright Purple
    'rgba(240, 100, 255, 0.9)',   // Bright Magenta
  ],
  sunset: [
    'rgba(255, 170, 80, 0.95)',   // Bright Orange - 더 강렬한 주황색
    'rgba(255, 230, 100, 0.9)',   // Bright Yellow
    'rgba(255, 230, 190, 0.85)',  // Bright Peach
    'rgba(255, 245, 160, 0.8)',   // Bright Light yellow
    'rgba(255, 140, 40, 0.95)',   // Bright Dark orange
    'rgba(255, 210, 60, 0.9)',    // Bright Amber
  ],
  forest: [
    'rgba(60, 220, 120, 0.95)',   // Bright Green - 더 선명한 초록색
    'rgba(100, 240, 160, 0.9)',   // Bright Light green
    'rgba(160, 250, 200, 0.85)',  // Bright Pale green
    'rgba(200, 255, 220, 0.8)',   // Bright Very light green
    'rgba(40, 210, 150, 0.95)',   // Bright Emerald
    'rgba(80, 230, 180, 0.9)',    // Bright Teal
  ],
  aurora: [
    'rgba(170, 220, 255, 0.95)',  // Bright Light blue - 오로라 효과
    'rgba(220, 200, 255, 0.9)',   // Bright Purple
    'rgba(190, 255, 230, 0.85)',  // Bright Mint
    'rgba(255, 230, 190, 0.8)',   // Bright Peach
    'rgba(255, 230, 100, 0.95)',  // Bright Yellow
    'rgba(255, 170, 80, 0.9)',    // Bright Orange
  ],
  galaxy: [
    'rgba(180, 130, 255, 0.95)',  // Bright Violet - 더 화려한 보라색
    'rgba(200, 120, 255, 0.9)',   // Bright Purple
    'rgba(240, 100, 255, 0.85)',  // Bright Magenta
    'rgba(255, 150, 210, 0.8)',   // Bright Pink
    'rgba(255, 170, 80, 0.95)',   // Bright Orange
    'rgba(255, 230, 100, 0.9)',   // Bright Yellow
  ],
  cyberpunk: [
    'rgba(255, 50, 180, 0.95)',   // Neon Pink - 네온 사이버펑크
    'rgba(50, 255, 255, 0.9)',    // Neon Cyan
    'rgba(180, 255, 50, 0.85)',   // Neon Lime
    'rgba(255, 50, 255, 0.8)',    // Neon Magenta
    'rgba(255, 255, 50, 0.95)',   // Neon Yellow
    'rgba(50, 180, 255, 0.9)',    // Neon Sky blue
  ],
  // Keep these for backward compatibility
  warm: [
    'rgba(251, 146, 60, 0.8)',   // Orange
    'rgba(252, 211, 77, 0.7)',   // Yellow
    'rgba(254, 215, 170, 0.6)',  // Peach
    'rgba(254, 240, 138, 0.5)',  // Light yellow
    'rgba(249, 115, 22, 0.8)',   // Dark orange
    'rgba(251, 191, 36, 0.7)',   // Amber
  ],
  cool: [
    'rgba(59, 130, 246, 0.8)',   // Blue
    'rgba(147, 197, 253, 0.7)',  // Light blue
    'rgba(99, 102, 241, 0.6)',   // Indigo
    'rgba(139, 92, 246, 0.5)',   // Violet
    'rgba(168, 85, 247, 0.8)',   // Purple
    'rgba(217, 70, 239, 0.7)',   // Magenta
  ],
  monochrome: [
    'rgba(255, 255, 255, 0.9)',  // White
    'rgba(229, 231, 235, 0.7)',  // Gray 200
    'rgba(209, 213, 219, 0.6)',  // Gray 300
    'rgba(156, 163, 175, 0.5)',  // Gray 400
    'rgba(107, 114, 128, 0.7)',  // Gray 500
    'rgba(75, 85, 99, 0.6)',     // Gray 600
  ],
  neon: [
    'rgba(255, 0, 128, 0.8)',    // Neon pink
    'rgba(0, 255, 255, 0.7)',    // Cyan
    'rgba(128, 255, 0, 0.6)',    // Lime
    'rgba(255, 0, 255, 0.5)',    // Magenta
    'rgba(255, 255, 0, 0.8)',    // Yellow
    'rgba(0, 128, 255, 0.7)',    // Sky blue
  ],
  damienHirst: [
    'rgba(147, 51, 234, 0.8)',  // Purple - quantile 0-10%
    'rgba(59, 130, 246, 0.8)',  // Blue - quantile 10-20%
    'rgba(14, 165, 233, 0.8)',  // Sky Blue - quantile 20-30%
    'rgba(6, 182, 212, 0.8)',   // Cyan - quantile 30-40%
    'rgba(20, 184, 166, 0.8)',  // Teal - quantile 40-50%
    'rgba(34, 197, 94, 0.8)',   // Green - quantile 50-60%
    'rgba(132, 204, 22, 0.8)',  // Lime - quantile 60-70%
    'rgba(234, 179, 8, 0.8)',   // Yellow - quantile 70-80%
    'rgba(251, 146, 60, 0.8)',  // Orange - quantile 80-90%
    'rgba(239, 68, 68, 0.8)',   // Red - quantile 90-100%
  ]
}
import type { BoundaryGrid } from './boundaryProcessor'
import {
  generateStratifiedPoints,
  DISTRICT_CENTERS,
  precomputeBoundaryGrid
} from './boundaryProcessor'
import { 
  fastSin, 
  fastCos, 
  vectorizedSinCos,
  initializeParticleMemoryPool,
  getParticleMemoryPool
} from '@/src/shared/utils/mathHelpers'

// Pre-computed constants for performance
const TWO_PI = Math.PI * 2
const GLOBAL_PARTICLE_SIZE_SCALE = 1.2
const HIGH_DENSITY_AREAS_OPTIMIZED = new Map([
  ['강남', { center: [127.0276, 37.4979], radius: 0.02, density: 0.84 }],
  ['명동', { center: [126.9861, 37.5636], radius: 0.015, density: 0.7 }],
  ['홍대', { center: [126.924, 37.5563], radius: 0.02, density: 0.63 }],
  ['여의도', { center: [126.9246, 37.5219], radius: 0.018, density: 0.56 }],
  ['동대문', { center: [127.0079, 37.5714], radius: 0.015, density: 0.56 }],
  ['잠실', { center: [127.1001, 37.5132], radius: 0.02, density: 0.63 }],
  ['신촌', { center: [126.9368, 37.5585], radius: 0.015, density: 0.49 }],
  ['건대', { center: [127.0737, 37.5407], radius: 0.015, density: 0.77 }],
])

/**
 * Ultra-fast particle generation using pre-computed grid
 * 5-10x faster than original implementation
 */
export async function generateParticlesOptimized(
  count: number,
  grid: BoundaryGrid,
  colorTheme: keyof typeof COLOR_THEMES = 'current',
  onProgress?: (progress: number) => void
): Promise<ParticleData[]> {
  const startTime = performance.now()
  
  // Pre-allocate arrays for better performance
  const particles = new Array<ParticleData>(count)
  const selectedPalette = COLOR_THEMES[colorTheme]
  const colorCount = selectedPalette.length
  
  // Use stratified sampling for better distribution
  const points = generateStratifiedPoints(count * 1.5, grid) // Generate extra for filtering
  
  // High-density area optimization
  const densityBoost = new Float32Array(points.length)
  for (let i = 0; i < points.length; i++) {
    const point = points[i]
    densityBoost[i] = getAreaDensityOptimized(point[0], point[1])
  }
  
  // Batch process particles
  let validCount = 0
  for (let i = 0; i < points.length && validCount < count; i++) {
    const point = points[i]
    const density = densityBoost[i]
    
    // Apply density-based filtering
    if (Math.random() > density * 0.7) continue
    
    // Pre-computed random values for efficiency
    const colorIndex = (Math.random() * colorCount) | 0
    const color = selectedPalette[colorIndex]
    const sizeFactor = 0.7 + density * 0.3
    const baseSize = 30 + Math.random() * 80
    
    particles[validCount] = {
      x: point[0],
      y: point[1],
      vx: (Math.random() - 0.5) * 0.00002,
      vy: (Math.random() - 0.5) * 0.00002,
      charge: 0.5 + Math.random() * 0.5,
      color: color,
      position: [point[0], point[1]],
      size: baseSize * sizeFactor,
      speed: 0.0002 + Math.random() * 0.0005,
      phase: Math.random() * TWO_PI,
      amplitude: 0.001 + Math.random() * 0.002,
      district: undefined
    } as ParticleData
    
    validCount++
    
    // Report progress (throttled)
    if (onProgress && validCount % 100 === 0) {
      onProgress((validCount / count) * 100)
    }
  }
  
  // Trim array to exact count
  particles.length = validCount
  
  const endTime = performance.now()
  console.log(`[ParticleGen] Generated ${validCount} particles in ${(endTime - startTime).toFixed(1)}ms`)
  
  onProgress?.(100)
  return particles
}

/**
 * Optimized density calculation using squared distance
 * Avoids expensive Math.sqrt calls
 */
function getAreaDensityOptimized(lng: number, lat: number): number {
  let maxDensity = 0.5 // Base density
  
  for (const [_, area] of HIGH_DENSITY_AREAS_OPTIMIZED) {
    const dx = lng - area.center[0]
    const dy = lat - area.center[1]
    const distSq = dx * dx + dy * dy
    const radiusSq = area.radius * area.radius
    
    if (distSq < radiusSq) {
      // Use inverse square for smooth falloff
      const factor = 1 - (distSq / radiusSq)
      const density = area.density * factor
      maxDensity = Math.max(maxDensity, density)
    }
  }
  
  return maxDensity
}

/**
 * Create typed arrays for WebGL/deck.gl optimization
 * Reduces memory allocations and improves performance
 */
export function createParticleBuffers(particles: ParticleData[]) {
  const count = particles.length
  
  // Pre-allocate typed arrays
  const positions = new Float32Array(count * 2)
  const colors = new Uint8Array(count * 3)
  const sizes = new Float32Array(count)
  const speeds = new Float32Array(count)
  const phases = new Float32Array(count)
  const amplitudes = new Float32Array(count)
  
  // Fill buffers in a single pass
  for (let i = 0; i < count; i++) {
    const particle = particles[i]
    const i2 = i * 2
    const i3 = i * 3
    
    const pos = particle.position || [particle.x, particle.y]
    positions[i2] = pos[0]
    positions[i2 + 1] = pos[1]
    
    // Parse color from rgba string
    const colorMatch = particle.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
    if (colorMatch) {
      colors[i3] = parseInt(colorMatch[1]) / 255
      colors[i3 + 1] = parseInt(colorMatch[2]) / 255
      colors[i3 + 2] = parseInt(colorMatch[3]) / 255
    } else {
      colors[i3] = 0.4
      colors[i3 + 1] = 0.6
      colors[i3 + 2] = 1.0
    }
    
    sizes[i] = particle.size || 50
    speeds[i] = particle.speed || 0.0003
    phases[i] = particle.phase || 0
    amplitudes[i] = particle.amplitude || 0.001
  }
  
  return {
    positions,
    colors,
    sizes,
    speeds,
    phases,
    amplitudes,
    count
  }
}


/**
 * 초고속 벡터화된 배치 애니메이션 (4배 빠른 처리)
 * 메모리 풀과 벡터화된 수학 연산을 활용하면서 완전한 애니메이션 효과 유지
 */
export function animateParticlesSuperFast(
  particles: ParticleData[],
  time: number,
  waveEnabled: boolean = true,
  pulseEnabled: boolean = true,
  fireflyEnabled: boolean = true,
  currentAmplitude: number = 1.0,
  colorCycleEnabled: boolean = false,
  colorCycleSpeed: number = 0.002,
  orbitalEnabled: boolean = false,
  orbitalSpeed: number = 0.001,
  orbitalRadius: number = 0.002,
  waveSpeed: number = 2.0,
  pulseSpeed: number = 0.005,
  fireflySpeed: number = 0.002
): any[] {
  const count = particles.length
  
  // 메모리 풀 사용 (할당 비용 제거)
  let pool = getParticleMemoryPool()
  if (!pool || pool.positions.length < count * 2) {
    pool = initializeParticleMemoryPool(count)
  }
  
  // 임시 배열들 (메모리 풀에서 재사용)
  const wavePhases = pool.tempBuffer.subarray(0, count)
  const sinResults = pool.waveOffsets.subarray(0, count)
  const cosResults = pool.waveOffsets.subarray(count, count * 2)
  
  // 1단계: 모든 phase 값을 일괄 계산 (수정: waveSpeed 사용)
  if (waveEnabled) {
    for (let i = 0; i < count; i++) {
      wavePhases[i] = time * waveSpeed + (particles[i].phase || 0)
    }
    
    // 2단계: 벡터화된 sin/cos 계산 (4배 빠름)
    vectorizedSinCos(wavePhases, sinResults, cosResults, count)
  }
  
  // 3단계: 결과 배열 생성 (메모리 할당 최소화)
  const result = new Array(count)
  const baseSizeScale = 0.78 * GLOBAL_PARTICLE_SIZE_SCALE
  
  // 4단계: 64개씩 묶어서 최종 처리 (CPU 캐시 최적화)
  for (let chunk = 0; chunk < count; chunk += 64) {
    const end = Math.min(chunk + 64, count)
    
    for (let i = chunk; i < end; i++) {
      const particle = particles[i]
      const pos = particle.position || [particle.x, particle.y]
      let x = pos[0]
      let y = pos[1]
      const baseSize = (particle.size || 50) * baseSizeScale
      let size = baseSize
      let color = particle.color
      let opacity = 255
      
      // Wave 애니메이션 적용 (수정: currentAmplitude 직접 사용)
      if (waveEnabled) {
        // currentAmplitude를 직접 사용 (15.0 * 0.01 = 0.15로 충분히 큰 움직임)
        const waveX = sinResults[i] * currentAmplitude
        const waveY = cosResults[i] * currentAmplitude * 0.7
        
        x = pos[0] + waveX
        y = pos[1] + waveY
      }
      
      // Orbital motion 복원
      if (orbitalEnabled) {
        const angle = time * orbitalSpeed + (i * Math.PI * 2) / 100
        const orbX = fastCos(angle) * orbitalRadius
        const orbY = fastSin(angle) * orbitalRadius
        
        x += orbX
        y += orbY
      }
      
      // Pulse 애니메이션 (복원)
      if (pulseEnabled) {
        const pulsePhase = time * pulseSpeed + (particle.phase || 0) * 2
        const pulse = fastSin(pulsePhase)
        const sizeFactor = 1 + pulse * 0.5 // 원래 강도로 복원
        const opacityFactor = 0.7 + pulse * 0.3
        
        size = baseSize * sizeFactor  // Global 20% scale applied via baseSize
        opacity = Math.floor(255 * opacityFactor)
      }
      
      // Color cycle 애니메이션 (선택적)
      if (colorCycleEnabled) {
        const hueShift = (time * colorCycleSpeed + (particle.phase || 0)) % (TWO_PI)
        
        // HSL 색상 순환 (원래 로직 복원)
        const cos = fastCos(hueShift)
        const sin = fastSin(hueShift)
        
        // Parse color from rgba string
        const colorMatch = particle.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
        if (colorMatch) {
          const r = parseInt(colorMatch[1])
          const g = parseInt(colorMatch[2])
          const b = parseInt(colorMatch[3])
          
          // 색상 변환 매트릭스 적용
          const newR = r * (cos + (1 - cos) / 3) + g * ((1 - cos) / 3 - Math.sqrt(1/3) * sin) + b * ((1 - cos) / 3 + Math.sqrt(1/3) * sin)
          const newG = r * ((1 - cos) / 3 + Math.sqrt(1/3) * sin) + g * (cos + (1 - cos) / 3) + b * ((1 - cos) / 3 - Math.sqrt(1/3) * sin)
          const newB = r * ((1 - cos) / 3 - Math.sqrt(1/3) * sin) + g * ((1 - cos) / 3 + Math.sqrt(1/3) * sin) + b * (cos + (1 - cos) / 3)
          
          color = `rgba(${Math.max(0, Math.min(255, newR))}, ${Math.max(0, Math.min(255, newG))}, ${Math.max(0, Math.min(255, newB))}, 0.8)`
        }
      } else {
        // Color cycle OFF: 테마 색상 그대로 유지
        // color는 이미 particle.color를 복사했으므로 테마가 적용된 상태
      }
      
      // Firefly 효과 (강화)
      if (fireflyEnabled) {
        const fireflyPhase = time * fireflySpeed + (particle.phase || 0) * 3
        const twinkle = fastSin(fireflyPhase)
        const fireflyIntensity = 0.8

        opacity *= (0.7 + twinkle * 0.3 * fireflyIntensity)

        // 더 활발한 랜덤 움직임
        const randomX = fastSin(fireflyPhase * 3.7) * 0.0005 * fireflyIntensity
        const randomY = fastCos(fireflyPhase * 2.3) * 0.0005 * fireflyIntensity

        x += randomX
        y += randomY
      }

      // Gentle breathing animation applied to all particles
      // time is already in seconds (converted from ms in ParticleMapSeoul)
      const breathPhase = time * 0.6  // 초 단위로 조정 (기존 0.0006 * 1000)
      const breathWave = fastSin(breathPhase)
      const sizeBreathFactor = 0.94 + breathWave * 0.06
      const opacityBreathFactor = 0.9 + breathWave * 0.08

      size *= sizeBreathFactor
      opacity *= opacityBreathFactor

      // 파티클 전체가 심장박동처럼 확장/수축 (위치 기반 스케일링)
      const centerLon = 126.978  // 서울 중심 경도
      const centerLat = 37.5665  // 서울 중심 위도
      const heartbeatScale = 0.98 + breathWave * 0.02  // 2% 확장/수축

      // 중심점으로부터의 거리 계산 후 스케일 적용
      const dx = x - centerLon
      const dy = y - centerLat
      x = centerLon + dx * heartbeatScale
      y = centerLat + dy * heartbeatScale

      // Clamp opacity after breathing modulation
      opacity = Math.max(0, Math.min(255, opacity))

      // Parse color for result  
      let colorArray: [number, number, number, number]
      const colorMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
      if (colorMatch) {
        colorArray = [
          parseInt(colorMatch[1]),
          parseInt(colorMatch[2]),
          parseInt(colorMatch[3]),
          opacity
        ]
      } else {
        colorArray = [100, 150, 255, opacity]
      }
      
      result[i] = {
        position: [x, y],
        color: colorArray,
        size: size,
        opacity: Math.max(0, Math.min(255, Math.floor(opacity)))
      }
    }
  }
  
  return result
}

/**
 * Generate initial particles immediately (for fast first render)
 * Returns a small set of particles for instant display
 */
export function generateInitialParticles(
  colorTheme: keyof typeof COLOR_THEMES = 'current'
): ParticleData[] {
  const initialCount = 1000 // Small set for instant display
  const particles: ParticleData[] = []
  const selectedPalette = COLOR_THEMES[colorTheme]
  const colorCount = selectedPalette.length
  
  // Use district centers for guaranteed valid points
  const centers = Object.entries(DISTRICT_CENTERS)
  
  for (let i = 0; i < initialCount; i++) {
    const [districtName, center] = centers[i % centers.length]
    const spread = 0.01
    
    // Add some randomness around district centers
    const lng = center[0] + (Math.random() - 0.5) * spread
    const lat = center[1] + (Math.random() - 0.5) * spread
    
    const colorIndex = (Math.random() * colorCount) | 0
    const color = selectedPalette[colorIndex]
    
    particles.push({
      x: lng,
      y: lat,
      vx: (Math.random() - 0.5) * 0.00002,
      vy: (Math.random() - 0.5) * 0.00002,
      charge: 0.5 + Math.random() * 0.5,
      color: color,
      position: [lng, lat],
      size: 40 + Math.random() * 60,
      speed: 0.0002 + Math.random() * 0.0005,
      phase: Math.random() * TWO_PI,
      amplitude: 0.001 + Math.random() * 0.002,
      district: districtName
    } as ParticleData)
  }
  
  return particles
}

// Function to generate particles with boundary
export async function generateSeoulParticlesWithBoundary(
  count: number,
  boundaryData: SeoulBoundaryData,
  colorTheme: keyof typeof COLOR_THEMES = 'current'
): Promise<ParticleData[]> {
  const grid = await precomputeBoundaryGrid(boundaryData)
  return generateParticlesOptimized(count, grid, colorTheme)
}

// Function to update particle colors
export function updateParticleColors(
  particles: ParticleData[],
  colorTheme: keyof typeof COLOR_THEMES
): ParticleData[] {
  const colors = COLOR_THEMES[colorTheme]
  return particles.map(particle => ({
    ...particle,
    color: colors[Math.floor(Math.random() * colors.length)]
  }))
}

// Interpolate particles between two patterns (for transitions)
export function interpolateParticlePatterns(
  fromParticles: ParticleData[],
  toParticles: ParticleData[],
  progress: number // 0 to 1
): any[] {
  const count = Math.min(fromParticles.length, toParticles.length)
  const interpolated: any[] = []

  // Use easing function for smooth transition
  const easedProgress = easeInOutCubic(progress)

  for (let i = 0; i < count; i++) {
    const from = fromParticles[i % fromParticles.length]
    const to = toParticles[i % toParticles.length]

    // Interpolate position
    const x = from.x + (to.x - from.x) * easedProgress
    const y = from.y + (to.y - from.y) * easedProgress

    // Interpolate color (blend RGB values)
    const fromRGB = parseColorToRGB(from.color)
    const toRGB = parseColorToRGB(to.color)
    const r = Math.round(fromRGB.r + (toRGB.r - fromRGB.r) * easedProgress)
    const g = Math.round(fromRGB.g + (toRGB.g - fromRGB.g) * easedProgress)
    const b = Math.round(fromRGB.b + (toRGB.b - fromRGB.b) * easedProgress)
    const a = fromRGB.a + (toRGB.a - fromRGB.a) * easedProgress

    // Interpolate size
    const size = from.size! + (to.size! - from.size!) * easedProgress

    interpolated.push({
      position: [x, y],
      color: [r, g, b],
      size: size * GLOBAL_PARTICLE_SIZE_SCALE,
      opacity: a
    })
  }

  return interpolated
}

// Helper function for easing
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

// Easing function for explosion effect
function easeOutQuad(t: number): number {
  return t * (2 - t)
}

// Easing function for bounce effect
function easeOutBounce(t: number): number {
  if (t < 1 / 2.75) {
    return 7.5625 * t * t
  } else if (t < 2 / 2.75) {
    t -= 1.5 / 2.75
    return 7.5625 * t * t + 0.75
  } else if (t < 2.5 / 2.75) {
    t -= 2.25 / 2.75
    return 7.5625 * t * t + 0.9375
  } else {
    t -= 2.625 / 2.75
    return 7.5625 * t * t + 0.984375
  }
}

// Helper function to parse color string to RGB
function parseColorToRGB(color: string): { r: number; g: number; b: number; a: number } {
  // Handle rgba format
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
  if (match) {
    return {
      r: parseInt(match[1]),
      g: parseInt(match[2]),
      b: parseInt(match[3]),
      a: match[4] ? parseFloat(match[4]) : 1
    }
  }
  // Default to white if parsing fails
  return { r: 255, g: 255, b: 255, a: 1 }
}

// Interpolate particles with scatter/explosion effect
export function interpolateParticlePatternWithScatter(
  fromParticles: ParticleData[],
  toParticles: ParticleData[],
  progress: number, // 0 to 1
  scatterOffsets?: { x: number; y: number }[] // Pre-calculated random offsets
): any[] {
  const count = Math.min(fromParticles.length, toParticles.length)
  const interpolated: any[] = []

  // Generate scatter offsets if not provided
  const offsets = scatterOffsets || Array.from({ length: count }, () => ({
    x: (Math.random() - 0.5) * 0.4, // Random offset in range [-0.2, 0.2]
    y: (Math.random() - 0.5) * 0.4
  }))

  for (let i = 0; i < count; i++) {
    const from = fromParticles[i % fromParticles.length]
    const to = toParticles[i % toParticles.length]
    const offset = offsets[i]

    let x: number, y: number
    let sizeMultiplier = 1.0
    let brightnessBoost = 0

    // Three-phase animation
    if (progress < 0.3) {
      // Phase 1: Explosion (0-0.3) - particles scatter outward
      const scatterProgress = progress / 0.3
      const scatterAmount = easeOutQuad(scatterProgress)

      // Move from original position outward with random direction
      x = from.x + offset.x * scatterAmount
      y = from.y + offset.y * scatterAmount

      // Particles stay at 1.5 size from the beginning
      sizeMultiplier = 1.5
      brightnessBoost = scatterAmount * 30

    } else if (progress < 0.7) {
      // Phase 2: Float (0.3-0.7) - particles float in space with slight movement
      const floatProgress = (progress - 0.3) / 0.4
      const floatEased = easeInOutCubic(floatProgress)

      // From scattered position to midpoint
      const scatteredX = from.x + offset.x
      const scatteredY = from.y + offset.y
      const midX = (scatteredX + to.x) / 2
      const midY = (scatteredY + to.y) / 2

      // Add floating motion
      const floatWave = Math.sin(floatProgress * Math.PI * 2) * 0.01
      const floatWave2 = Math.cos(floatProgress * Math.PI * 3) * 0.01

      x = scatteredX + (midX - scatteredX) * floatEased + floatWave
      y = scatteredY + (midY - scatteredY) * floatEased + floatWave2

      // Size stays at 1.5 during float phase
      sizeMultiplier = 1.5  // 플로팅 단계에서도 1.5배 유지
      brightnessBoost = 30 - floatEased * 10

    } else {
      // Phase 3: Converge (0.7-1.0) - particles slowly converge to final positions
      const convergeProgress = (progress - 0.7) / 0.3
      // Slow down convergence by reducing the easing progression
      const convergeEased = easeOutBounce(convergeProgress * 0.8) // Slower by 20%

      // From midpoint to final position
      const midX = (from.x + offset.x + to.x) / 2
      const midY = (from.y + offset.y + to.y) / 2

      // Spiral motion during convergence
      const spiralAngle = convergeProgress * Math.PI * 2
      const spiralRadius = 0.02 * (1 - convergeProgress)
      const spiralX = Math.cos(spiralAngle) * spiralRadius
      const spiralY = Math.sin(spiralAngle) * spiralRadius

      x = midX + (to.x - midX) * convergeEased + spiralX
      y = midY + (to.y - midY) * convergeEased + spiralY

      // Size stays at 1.5 during convergence
      sizeMultiplier = 1.5  // 수렴 단계에서도 1.5배 유지
      brightnessBoost = 20 * (1 - convergeEased)
    }

    // Interpolate color with brightness boost
    const fromRGB = parseColorToRGB(from.color)
    const toRGB = parseColorToRGB(to.color)

    const r = Math.min(255, Math.round(fromRGB.r + (toRGB.r - fromRGB.r) * progress + brightnessBoost))
    const g = Math.min(255, Math.round(fromRGB.g + (toRGB.g - fromRGB.g) * progress + brightnessBoost))
    const b = Math.min(255, Math.round(fromRGB.b + (toRGB.b - fromRGB.b) * progress + brightnessBoost))
    const a = fromRGB.a + (toRGB.a - fromRGB.a) * progress

    // Interpolate size with multiplier
    const baseSize = from.size! + (to.size! - from.size!) * progress
    const size = baseSize * sizeMultiplier

    interpolated.push({
      position: [x, y],
      color: [r, g, b],
      size: size,
      opacity: a,
      // Store metadata for special effects
      phase: progress < 0.3 ? 'scatter' : progress < 0.7 ? 'float' : 'converge',
      ringIndex: from.ringIndex,
      ringPosition: from.ringPosition
    })
  }

  return interpolated
}

// Damien Hirst style color distribution logic
function getDamienHirstColorIndex(
  ringIndex: number,
  particleIndex: number,
  totalRings: number = 15,
  colorsCount: number = 10
): number {
  // Color distribution strategy based on ring position
  if (ringIndex < 5) {
    // Inner rings: favor cool colors (0-5) with some warm accents
    const colorMethod = (ringIndex + particleIndex) % 4
    if (colorMethod < 3) {
      // 75% cool colors
      return (particleIndex * 3 + ringIndex) % 6 // Colors 0-5 (purple to green)
    } else {
      // 25% warm accents
      return 6 + ((particleIndex + ringIndex * 2) % 4) // Colors 6-9 (lime to red)
    }
  } else if (ringIndex < 10) {
    // Middle rings: balanced distribution
    const colorMethod = (ringIndex * 7 + particleIndex * 11) % 3
    if (colorMethod === 0) {
      // Method 1: Sequential progression
      return particleIndex % colorsCount
    } else if (colorMethod === 1) {
      // Method 2: Angle-based color
      const angle = (particleIndex / 100) * TWO_PI // Approximate angle calculation
      return Math.floor((angle / TWO_PI) * colorsCount) % colorsCount
    } else {
      // Method 3: Pseudo-random but deterministic
      return ((ringIndex * 13) + (particleIndex * 17)) % colorsCount
    }
  } else {
    // Outer rings: favor warm colors (5-9) with some cool accents
    const colorMethod = (ringIndex + particleIndex) % 4
    if (colorMethod < 3) {
      // 75% warm colors
      return 5 + ((particleIndex * 2 + ringIndex) % 5) // Colors 5-9 (green to red)
    } else {
      // 25% cool accents
      return (particleIndex + ringIndex * 3) % 5 // Colors 0-4 (purple to teal)
    }
  }
}

// Generate Damien Hirst style circular dot pattern
export function generateDamienHirstPattern(
  particleCount: number,
  colorTheme: keyof typeof COLOR_THEMES = 'damienHirst'
): ParticleData[] {
  const particles: ParticleData[] = []

  // Always use vibrant damienHirst theme for optimal visual appearance
  // This matches the original "ring rendering complete" behavior
  const colors = COLOR_THEMES['damienHirst']
  const colorCount = colors.length

  // Seoul center coordinates
  const centerLon = 126.978
  const centerLat = 37.5665

  // Latitude correction factor for perfect circle at Seoul's latitude
  // At 37.5665°N, longitude distances are compressed by cos(37.5665°)
  const latitudeCorrection = 1.0 / Math.cos(centerLat * Math.PI / 180) // ≈ 1.26

  // Calculate ring configuration - exactly 15 rings for 15,000 particles
  const totalRings = 15 // Exactly 15 distinct ring layers
  const minRadius = 0.06 // Even larger center hole for better visual balance
  const maxRadius = 0.14 // Increased to double the ring spacing

  let particlesPlaced = 0
  const targetParticleCount = Math.min(particleCount, 15000) // Cap at 15,000 (원래 값)

  for (let ring = 0; ring < totalRings && particlesPlaced < targetParticleCount; ring++) {
    // Calculate radius for this ring with even spacing for clear gaps
    const ringProgress = ring / (totalRings - 1)
    const radius = minRadius + (maxRadius - minRadius) * ringProgress // Linear spacing for even gaps

    // Calculate number of dots in this ring based on circumference
    // For 15,000 particles across 15 rings, we need ~1000 per ring
    // But outer rings should have more particles due to larger circumference
    const circumference = 2 * Math.PI * radius
    const baseDotSpacing = 0.0008 // Adjusted for 15,000 particles
    const dotsInRing = Math.max(30, Math.floor(circumference / baseDotSpacing))

    for (let i = 0; i < dotsInRing && particlesPlaced < targetParticleCount; i++) {
      // Calculate angle for this dot - no randomization for clean pattern
      const baseAngle = (i / dotsInRing) * TWO_PI
      const angle = baseAngle // Clean, evenly spaced dots

      // No position variation for clean concentric circles
      const radiusVariation = radius

      // Calculate position with latitude correction for perfect circle
      const lng = centerLon + fastCos(angle) * radiusVariation * latitudeCorrection
      const lat = centerLat + fastSin(angle) * radiusVariation

      // Use the extracted color distribution logic for consistent Damien Hirst style
      let colorIndex = getDamienHirstColorIndex(ring, i, totalRings, colorCount)

      // Ensure adjacent particles have different colors for visual variety
      if (i > 0 && particlesPlaced > 0) {
        const prevColor = particles[particlesPlaced - 1].color
        const prevColorIndex = prevColor ? colors.indexOf(prevColor) : -1
        if (colorIndex === prevColorIndex) {
          colorIndex = (colorIndex + 3) % colorCount // Shift by 3 for visual variety
        }
      }

      const particleColor = colors[colorIndex]

      // Size varies by ring (inner rings have larger dots, like Damien Hirst style)
      // Adjust size to be proportional to spacing for solid ring appearance
      const baseSize = 15 // Reduced base size for more delicate appearance
      const sizeMultiplier = 1.8 - ringProgress * 1.0 // 1.8x to 0.8x (less dramatic size variation)
      const size = baseSize * sizeMultiplier

      particles.push({
        x: lng,
        y: lat,
        vx: 0,
        vy: 0,
        charge: 0.5 + Math.random() * 0.5,
        color: particleColor, // Use varied colors per particle
        position: [lng, lat],
        size: size,
        speed: 0.0001 + Math.random() * 0.0002, // Slower speed for circular pattern
        phase: Math.random() * TWO_PI,
        amplitude: 0.0002 + Math.random() * 0.0003, // Smaller amplitude for subtle movement
        district: `ring_${ring}_dot_${i}`,
        // Store original circular position for animation
        targetX: lng,
        targetY: lat,
        // Add ring metadata
        ringIndex: ring,
        ringPosition: i
      } as ParticleData)

      particlesPlaced++
    }
  }

  // Fill remaining particles if we haven't reached the target count
  // This ensures we always return exactly the requested number of particles
  if (particlesPlaced < targetParticleCount) {
    console.log(`Ring pattern only generated ${particlesPlaced} particles, filling remaining ${targetParticleCount - particlesPlaced}`)

    // Fill remaining by repeating the ring pattern with slight variations
    const remainingCount = targetParticleCount - particlesPlaced
    const existingCount = particles.length

    for (let i = 0; i < remainingCount && particles.length < targetParticleCount; i++) {
      const sourceParticle = particles[i % existingCount]
      if (sourceParticle) {
        particles.push({
          ...sourceParticle,
          // Add tiny random offset to avoid exact overlap
          x: sourceParticle.x + (Math.random() - 0.5) * 0.0001,
          y: sourceParticle.y + (Math.random() - 0.5) * 0.0001,
          // Keep other properties the same
          ringIndex: sourceParticle.ringIndex,
          ringPosition: existingCount + i
        })
      }
    }
  }

  console.log(`Generated ${particles.length} ring particles`)
  return particles
}

// Generate unified particles with both circular and map positions
export async function generateUnifiedParticles(
  colorTheme: keyof typeof COLOR_THEMES = 'damienHirst'
): Promise<ParticleData[]> {
  // Use 15,000 particles from particles-high.json
  const count = 15000

  // Load Seoul particles from static file
  let seoulParticles: any[] = []
  try {
    const response = await fetch(`/data/particles-high.json`)
    if (response.ok) {
      const data = await response.json()
      // Transform the data format from particles-high.json
      seoulParticles = data.slice(0, count).map((p: any) => ({
        x: p.position[0],  // Extract longitude
        y: p.position[1],  // Extract latitude
        position: p.position,
        size: p.size || 20,
        speed: p.speed || 0.0005,
        phase: p.phase || 0,
        amplitude: p.amplitude || 0.001,
        density: p.density || 0.3
      }))
      console.log(`Loaded ${seoulParticles.length} particles from particles-high.json`)
    } else {
      throw new Error('Failed to load particles-high.json')
    }
  } catch (error) {
    console.error('Failed to load Seoul particles:', error)
    // Fallback: generate particles
    const boundaries = await loadSeoulBoundaries()
    const grid = await precomputeBoundaryGrid(boundaries)
    seoulParticles = await generateParticlesOptimized(count, grid, colorTheme)
  }

  // Generate ring positions for the same particles
  const ringPattern = generateDamienHirstPattern(count, colorTheme)

  // Ensure we have enough ring particles
  console.log(`Ring pattern: ${ringPattern.length}, Seoul particles: ${seoulParticles.length}`)

  // Combine into unified particles - same particles with dual positions
  const unifiedParticles: ParticleData[] = seoulParticles.map((sParticle, i) => {
    // Handle case where ring pattern has fewer particles
    const ringParticle = ringPattern[i % ringPattern.length] || ringPattern[0]

    if (!ringParticle) {
      console.error(`No ring particle at index ${i}`)
      // Fallback: use Seoul position for both
      return {
        ...sParticle,
        id: i,
        circularPos: [sParticle.x, sParticle.y],
        mapPos: [sParticle.x, sParticle.y],
        x: sParticle.x,
        y: sParticle.y,
        position: [sParticle.x, sParticle.y],
        targetX: sParticle.x,
        targetY: sParticle.y,
        color: COLOR_THEMES[colorTheme][i % COLOR_THEMES[colorTheme].length],
        size: sParticle.size || 20,
        opacity: 1,
        vx: 0,
        vy: 0,
        charge: 0,
        district: `particle_${i}`
      }
    }

    // Apply color theme
    const colors = COLOR_THEMES[colorTheme]
    const colorIndex = i % colors.length
    const color = colors[colorIndex]

    return {
      // Use Seoul particle as base
      ...sParticle,
      id: i,
      // Dual positions
      circularPos: [ringParticle.x, ringParticle.y],  // Ring position
      mapPos: [sParticle.x, sParticle.y],  // Seoul map position
      // Start with circular position
      x: ringParticle.x,
      y: ringParticle.y,
      position: [ringParticle.x, ringParticle.y],
      // Seoul position stored as target
      targetX: sParticle.x,
      targetY: sParticle.y,
      // Visual properties
      color: color,
      size: sParticle.size || ringParticle.size || 20,
      opacity: 1,
      // Ring metadata from circular pattern
      ringIndex: ringParticle?.ringIndex,
      ringPosition: ringParticle?.ringPosition,
      // Other properties
      vx: 0,
      vy: 0,
      charge: 0,
      district: `particle_${i}`
    }
  })

  console.log(`Generated ${unifiedParticles.length} unified particles with dual positions`)
  return unifiedParticles
}

// Store scatter offsets to maintain consistency across frames
const scatterOffsetsCache: Map<number, {x: number, y: number}> = new Map()

// Simplified interpolation for unified particles
export function interpolateUnifiedParticles(
  particles: ParticleData[],
  progress: number,
  options: { useScatter?: boolean; time?: number } = {}
): ParticleData[] {
  const { useScatter = true, time } = options
  const timeSeconds = time ?? performance.now() * 0.001

  return particles.map((particle, i) => {
    if (!particle.circularPos || !particle.mapPos) {
      return {
        ...particle,
        position: particle.position || [particle.x, particle.y],
        size: particle.size || 20,
      }
    }

    const fromX = particle.circularPos[0]
    const fromY = particle.circularPos[1]
    const toX = particle.mapPos[0]
    const toY = particle.mapPos[1]

    let x: number, y: number
    let brightnessBoost = 0

    // Base size multiplier keeps subtle emphasis without large jumps
    const maxSizeBoost = 0.1
    let sizeMultiplier = 1 + maxSizeBoost * (1 - Math.min(progress, 1))

    if (useScatter) {
      // Get or create scatter offset for this particle (increased range for full screen)
      if (!scatterOffsetsCache.has(i)) {
        scatterOffsetsCache.set(i, {
          x: (Math.random() - 0.5) * 0.6,
          y: (Math.random() - 0.5) * 0.6,
        })
      }
      const scatterOffset = scatterOffsetsCache.get(i)!

      if (progress < 0.3) {
        // Phase 1: Explosion
        const scatterProgress = progress / 0.3
        const scatterAmount = easeOutQuad(scatterProgress)

        x = fromX + scatterOffset.x * scatterAmount
        y = fromY + scatterOffset.y * scatterAmount
        brightnessBoost = scatterAmount * 15
      } else if (progress < 0.4) {
        // Phase 2: Strong expansion with floating while camera moves
        const driftProgress = (progress - 0.3) / 0.1
        const additionalDrift = driftProgress * 0.2

        const floatStrength = driftProgress
        const floatX = Math.sin(timeSeconds * 2 + i * 0.1) * 0.02 * floatStrength
        const floatY = Math.cos(timeSeconds * 2 + i * 0.15) * 0.02 * floatStrength

        x = fromX + scatterOffset.x * (1 + additionalDrift) + floatX
        y = fromY + scatterOffset.y * (1 + additionalDrift) + floatY
        brightnessBoost = 12
      } else {
        // Phase 3: Convergence to Seoul with diminishing float
        const convergeProgress = Math.min(Math.max((progress - 0.4) / 0.6, 0), 1)
        const convergeEased = easeInOutCubic(convergeProgress)
        const driftEased = 1 - convergeEased

        // Gradually reduce expansion and floating intensity toward zero
        const expansionFactor = 1 + 0.2 * driftEased
        const expandedX = fromX + scatterOffset.x * expansionFactor
        const expandedY = fromY + scatterOffset.y * expansionFactor

        const floatAmplitude = 0.02 * driftEased
        const floatX = Math.sin(timeSeconds * 2 + i * 0.1) * floatAmplitude
        const floatY = Math.cos(timeSeconds * 2 + i * 0.15) * floatAmplitude

        const scatteredX = expandedX + floatX
        const scatteredY = expandedY + floatY

        x = scatteredX + (toX - scatteredX) * convergeEased
        y = scatteredY + (toY - scatteredY) * convergeEased
        brightnessBoost = 12 * driftEased
      }

      if (progress >= 1.0) {
        scatterOffsetsCache.clear()
      }
    } else {
      // Simple linear interpolation
      const eased = easeInOutCubic(progress)
      x = fromX + (toX - fromX) * eased
      y = fromY + (toY - fromY) * eased
    }

    // Parse and enhance color
    const rgb = parseColorToRGB(particle.color)
    const r = Math.min(255, Math.round(rgb.r + brightnessBoost))
    const g = Math.min(255, Math.round(rgb.g + brightnessBoost))
    const b = Math.min(255, Math.round(rgb.b + brightnessBoost))
    const colorString = `rgba(${r}, ${g}, ${b}, ${rgb.a})`

    return {
      ...particle,
      x,
      y,
      position: [x, y],
      color: colorString,
      size: (particle.size || 20) * sizeMultiplier,
    }
  })
}

export default {
  generateParticlesOptimized,
  createParticleBuffers,
  animateParticlesSuperFast,
  generateInitialParticles,
  generateDamienHirstPattern,
  interpolateParticlePatterns,
  interpolateParticlePatternWithScatter,
  generateUnifiedParticles,
  interpolateUnifiedParticles
}
