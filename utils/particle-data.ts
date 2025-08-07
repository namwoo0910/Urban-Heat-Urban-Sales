import { 
  SeoulBoundaryData, 
  isPointInSeoul, 
  getSeoulBoundingBox,
  getDistrictName 
} from './seoul-boundaries'

// 서울 주요 지역 및 밀도
const HIGH_DENSITY_AREAS = [
  { name: "강남", center: [127.0276, 37.4979], radius: 0.02, density: 1.5 },
  { name: "명동", center: [126.9861, 37.5636], radius: 0.015, density: 1.4 },
  { name: "홍대", center: [126.924, 37.5563], radius: 0.02, density: 1.3 },
  { name: "여의도", center: [126.9246, 37.5219], radius: 0.018, density: 1.2 },
  { name: "동대문", center: [127.0079, 37.5714], radius: 0.015, density: 1.2 },
  { name: "잠실", center: [127.1001, 37.5132], radius: 0.02, density: 1.3 },
  { name: "신촌", center: [126.9368, 37.5585], radius: 0.015, density: 1.1 },
  { name: "건대", center: [127.0737, 37.5407], radius: 0.015, density: 1.1 },
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

// 서울 경계 내 랜덤 포인트 생성 (GeoJSON 기반)
export async function generateSeoulParticlesWithBoundary(
  count: number = 8000,
  boundaryData: SeoulBoundaryData
): Promise<ParticleData[]> {
  const particles: ParticleData[] = []
  const bounds = getSeoulBoundingBox(boundaryData)
  const lngRange = bounds.maxLng - bounds.minLng
  const latRange = bounds.maxLat - bounds.minLat
  
  // 미리 계산된 값들
  const colorCount = COLOR_PALETTE.length
  const twoPi = Math.PI * 2
  
  let generated = 0
  let attempts = 0
  const maxAttempts = count * 10 // GeoJSON 경계 체크로 인해 더 많은 시도 필요
  
  while (generated < count && attempts < maxAttempts) {
    attempts++
    const lng = bounds.minLng + Math.random() * lngRange
    const lat = bounds.minLat + Math.random() * latRange
    
    // 실제 서울 경계 내에 있는지 확인
    if (isPointInSeoul(lng, lat, boundaryData)) {
      // 밀도에 따라 파티클 생성 확률 조정
      const density = getAreaDensity(lng, lat)
      if (Math.random() < density) {
        // 랜덤 색상 선택 (비트 연산 사용)
        const colorIndex = (Math.random() * colorCount) | 0
        const color = COLOR_PALETTE[colorIndex]
        
        // 크기 변화 (밀도가 높은 지역은 더 큰 파티클) - 50% 감소
        const baseSize = 30 + Math.random() * 80
        const size = baseSize * (0.7 + density * 0.3)
        
        // 구 정보 추가 (애니메이션용)
        const district = getDistrictName(lng, lat, boundaryData)
        
        particles.push({
          position: [lng, lat],
          color: color as [number, number, number],
          size,
          speed: 0.0001 + Math.random() * 0.0003, // 애니메이션 속도
          phase: Math.random() * twoPi, // 초기 위상
          amplitude: 0.0005 + Math.random() * 0.001, // 움직임 진폭
          district, // 구 정보 추가
        })
        generated++
      }
    }
  }
  
  return particles
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
        speed: 0.0001 + Math.random() * 0.0003, // 애니메이션 속도
        phase: Math.random() * twoPi, // 초기 위상
        amplitude: 0.0005 + Math.random() * 0.001, // 움직임 진폭
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