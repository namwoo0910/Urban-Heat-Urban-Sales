/**
 * @shared 공통 타입 정의
 * @description 프로젝트 전체에서 사용되는 공통 타입들
 */

// ============= Particle 관련 타입 =============

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
}

export interface AnimationConfig {
  waveEnabled: boolean
  waveSpeed: number
  waveAmplitude: number
  pulseEnabled: boolean
  pulseSpeed: number
  pulseIntensity: number
  colorCycleEnabled: boolean
  colorCycleSpeed: number
  orbitalEnabled: boolean
  orbitalSpeed: number
  orbitalRadius: number
  trailEnabled: boolean
  trailLength: number
  fireflyEnabled: boolean
  fireflySpeed: number
  fireflyRandomness: number
  flowFieldEnabled: boolean
  flowFieldStrength: number
  attractionEnabled: boolean
  attractionStrength: number
  morphEnabled: boolean
  morphSpeed: number
  autoRotateEnabled: boolean
  autoRotateSpeed: number
  colorTheme: 'current' | 'ocean' | 'sunset' | 'forest' | 'aurora' | 'galaxy' | 'cyberpunk'
  blackBackgroundEnabled: boolean
}

export interface AnimatedParticle {
  position: [number, number]
  color: [number, number, number, number]
  size: number
  opacity?: number
  trail?: Array<[number, number]>
}

// ============= Map 관련 타입 =============

export interface MapViewport {
  longitude: number
  latitude: number
  zoom: number
  pitch?: number
  bearing?: number
}

export interface SeoulBoundaryData {
  type: 'FeatureCollection'
  features: Array<{
    type: 'Feature'
    geometry: {
      type: 'Polygon' | 'MultiPolygon'
      coordinates: number[][][] | number[][][][]
    }
    properties: {
      name?: string
      [key: string]: any
    }
  }>
}

// ============= Hexagon Layer 관련 타입 =============

export interface HexagonLayerData {
  coordinates: [number, number]
  weight: number
  category?: string
}

export interface LayerConfig {
  visible: boolean
  radius: number
  elevationScale: number
  coverage: number
  upperPercentile: number
  colorScheme: string
  // 애니메이션 관련 설정
  animationEnabled: boolean
  animationSpeed: number
  waveAmplitude: number
}

// ============= Worker 메시지 타입 =============

export interface WorkerMessage {
  type: 'parse' | 'filter' | 'simplify' | 'generate' | 'cancel'
  data?: any
  payload?: any
  id?: string
}

export interface WorkerResponse {
  type: 'result' | 'error' | 'progress' | 'complete'
  data?: any
  payload?: any
  id?: string
  progress?: number
  error?: string
}

// ============= UI 컴포넌트 Props 타입 =============

export interface TransitionContextType {
  playTransition: (href: string) => void
}

// ============= 색상 테마 타입 =============

export type ColorScheme = 'warm' | 'cool' | 'monochrome' | 'neon' | 'ocean' | 'sunset' | 'forest' | 'aurora' | 'galaxy' | 'cyberpunk'

export type ColorTheme = {
  [key in ColorScheme]: string[]
}