/**
 * 서울 경계를 정확히 반영한 파티클 데이터 생성
 * 실제 서울 지도 형상대로 파티클 분포
 */

const fs = require('fs')
const path = require('path')

// 파티클 설정
const CONFIGS = {
  high: { count: 15000, name: 'high' },
  medium: { count: 10500, name: 'medium' },
  low: { count: 6000, name: 'low' }
}

// 색상 테마
const COLOR_THEMES = {
  current: [
    [230, 126, 34],
    [231, 76, 60],
    [241, 196, 15],
    [155, 89, 182],
    [52, 152, 219]
  ],
  ocean: [
    [26, 188, 156],
    [52, 152, 219],
    [142, 68, 173],
    [22, 160, 133],
    [41, 128, 185]
  ],
  sunset: [
    [255, 94, 77],
    [255, 154, 0],
    [237, 117, 57],
    [255, 206, 84],
    [255, 157, 77]
  ]
}

// 서울 경계 (확장된 범위로 모든 구 포함)
const SEOUL_BOUNDS = {
  minLng: 126.7645,
  maxLng: 127.1839,
  minLat: 37.4259,
  maxLat: 37.7013
}

// 고밀도 지역
const HIGH_DENSITY_AREAS = [
  { name: '강남', center: [127.0276, 37.4979], radius: 0.02, density: 0.84 },
  { name: '명동', center: [126.9861, 37.5636], radius: 0.015, density: 0.7 },
  { name: '홍대', center: [126.924, 37.5563], radius: 0.02, density: 0.63 },
  { name: '여의도', center: [126.9246, 37.5219], radius: 0.018, density: 0.56 },
  { name: '동대문', center: [127.0079, 37.5714], radius: 0.015, density: 0.56 },
  { name: '잠실', center: [127.1001, 37.5132], radius: 0.02, density: 0.63 },
  { name: '신촌', center: [126.9368, 37.5585], radius: 0.015, density: 0.49 },
  { name: '건대', center: [127.0737, 37.5407], radius: 0.015, density: 0.77 }
]

// 서울 경계 데이터 로드
let seoulBoundaryData = null
try {
  const boundaryPath = path.join(__dirname, '../public/seoul_boundary.geojson')
  const rawData = fs.readFileSync(boundaryPath, 'utf8')
  seoulBoundaryData = JSON.parse(rawData)
  console.log('✅ Seoul boundary data loaded successfully')
} catch (error) {
  console.error('⚠️ Warning: Could not load seoul_boundary.geojson:', error.message)
}

/**
 * Ray-casting 알고리즘으로 점이 폴리곤 내부에 있는지 확인
 */
function isPointInPolygon(point, polygon) {
  const [x, y] = point
  let inside = false
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi)
    
    if (intersect) inside = !inside
  }
  
  return inside
}

/**
 * 점이 서울 내부에 있는지 확인
 */
function isPointInSeoul(lng, lat) {
  if (!seoulBoundaryData) {
    // Fallback: 기본 경계 박스 사용
    return lng >= SEOUL_BOUNDS.minLng && lng <= SEOUL_BOUNDS.maxLng &&
           lat >= SEOUL_BOUNDS.minLat && lat <= SEOUL_BOUNDS.maxLat
  }
  
  // GeoJSON MultiPolygon 처리
  const features = seoulBoundaryData.features || [seoulBoundaryData]
  
  for (const feature of features) {
    const geometry = feature.geometry || feature
    
    if (geometry.type === 'Polygon') {
      // 외부 링만 체크 (첫 번째 배열)
      if (isPointInPolygon([lng, lat], geometry.coordinates[0])) {
        return true
      }
    } else if (geometry.type === 'MultiPolygon') {
      for (const polygon of geometry.coordinates) {
        if (isPointInPolygon([lng, lat], polygon[0])) {
          return true
        }
      }
    }
  }
  
  return false
}

/**
 * 구역별 밀도 계산
 */
function getAreaDensity(lng, lat) {
  let maxDensity = 0.3 // 기본 밀도
  
  for (const area of HIGH_DENSITY_AREAS) {
    const dx = lng - area.center[0]
    const dy = lat - area.center[1]
    const distSq = dx * dx + dy * dy
    const radiusSq = area.radius * area.radius
    
    if (distSq < radiusSq) {
      const influence = 1 - (distSq / radiusSq)
      maxDensity = Math.max(maxDensity, area.density * influence)
    }
  }
  
  return maxDensity
}

/**
 * 서울 지도 형상에 맞는 파티클 생성
 */
function generateParticles(count, colorTheme) {
  const particles = []
  const palette = COLOR_THEMES[colorTheme]
  let generated = 0
  let attempts = 0
  const maxAttempts = count * 10 // 충분한 시도 횟수
  
  while (generated < count && attempts < maxAttempts) {
    attempts++
    
    // 랜덤 좌표 생성
    const lng = SEOUL_BOUNDS.minLng + Math.random() * (SEOUL_BOUNDS.maxLng - SEOUL_BOUNDS.minLng)
    const lat = SEOUL_BOUNDS.minLat + Math.random() * (SEOUL_BOUNDS.maxLat - SEOUL_BOUNDS.minLat)
    
    // 서울 경계 내부인지 확인
    if (!isPointInSeoul(lng, lat)) {
      continue
    }
    
    // 밀도 계산
    const density = getAreaDensity(lng, lat)
    
    // 밀도 기반 필터링 (고밀도 지역에 더 많은 파티클)
    if (Math.random() > density * 0.8) continue
    
    // 파티클 속성 설정
    const color = palette[Math.floor(Math.random() * palette.length)]
    const sizeFactor = 0.7 + density * 0.3
    const baseSize = 30 + Math.random() * 80
    
    particles.push({
      position: [lng, lat],
      color: color,
      size: baseSize * sizeFactor,
      speed: 0.0002 + Math.random() * 0.0005,
      phase: Math.random() * Math.PI * 2,
      amplitude: 0.001 + Math.random() * 0.002
    })
    
    generated++
  }
  
  console.log(`Generated ${generated} particles (${attempts} attempts)`)
  return particles
}

/**
 * Wave Layer용 그리드 데이터 생성
 */
function generateWaveGrid(size) {
  const positions = []
  const uvs = []
  
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const x = (i / (size - 1) - 0.5) * 1000
      const z = (j / (size - 1) - 0.5) * 1000
      positions.push(x, 0, z)
      uvs.push(i / (size - 1), j / (size - 1))
    }
  }
  
  return { positions, uvs }
}

// 메인 실행
console.log('🚀 Generating Seoul-shaped particle data...')

// public/data 디렉토리 생성
const dataDir = path.join(__dirname, '../public/data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

// 각 설정별로 파티클 생성
for (const config of Object.values(CONFIGS)) {
  for (const theme of Object.keys(COLOR_THEMES)) {
    console.log(`Generating ${config.name}-${theme}...`)
    const particles = generateParticles(config.count, theme)
    const filename = `particles-${config.name}-${theme}.json`
    const filepath = path.join(dataDir, filename)
    
    fs.writeFileSync(filepath, JSON.stringify(particles))
    console.log(`✅ Generated ${filename} (${particles.length} particles)`)
  }
}

// Wave grid 데이터 생성
const waveGrid = generateWaveGrid(100)
fs.writeFileSync(
  path.join(dataDir, 'wave-grid.json'),
  JSON.stringify(waveGrid)
)
console.log('✅ Generated wave-grid.json')

console.log('🎉 All Seoul-shaped particle data generated successfully!')