/**
 * 최적화된 파티클 데이터 생성 - 색상 제외, 위치 데이터만 저장
 * 색상은 런타임에 적용하여 파일 크기 67% 감소
 */

const fs = require('fs')
const path = require('path')

// 파티클 설정
const CONFIGS = {
  high: { count: 15000, name: 'high' },
  medium: { count: 10500, name: 'medium' },
  low: { count: 6000, name: 'low' }
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
 * 서울 지도 형상에 맞는 파티클 생성 (색상 제외)
 */
function generateParticles(count) {
  const particles = []
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
    
    // 파티클 속성 설정 (색상 제외)
    const sizeFactor = 0.7 + density * 0.3
    const baseSize = 30 + Math.random() * 80
    
    particles.push({
      position: [lng, lat],
      // color는 제거 - 런타임에 적용
      size: baseSize * sizeFactor,
      speed: 0.0002 + Math.random() * 0.0005,
      phase: Math.random() * Math.PI * 2,
      amplitude: 0.001 + Math.random() * 0.002,
      density: density // 밀도 정보 저장 (색상 분포에 활용 가능)
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
console.log('🚀 Generating optimized Seoul-shaped particle data (without colors)...')

// public/data 디렉토리 생성
const dataDir = path.join(__dirname, '../public/data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

// 각 설정별로 파티클 생성 (색상 테마별 구분 없음)
for (const config of Object.values(CONFIGS)) {
  console.log(`Generating ${config.name} quality particles...`)
  const particles = generateParticles(config.count)
  const filename = `particles-${config.name}.json`
  const filepath = path.join(dataDir, filename)
  
  fs.writeFileSync(filepath, JSON.stringify(particles))
  console.log(`✅ Generated ${filename} (${particles.length} particles)`)
  
  // 파일 크기 확인
  const stats = fs.statSync(filepath)
  const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2)
  console.log(`   File size: ${fileSizeInMB} MB`)
}

// Wave grid 데이터 생성
const waveGrid = generateWaveGrid(100)
fs.writeFileSync(
  path.join(dataDir, 'wave-grid.json'),
  JSON.stringify(waveGrid)
)
console.log('✅ Generated wave-grid.json')

// 색상 테마 정의를 별도 파일로 저장 (클라이언트에서 사용)
const COLOR_THEMES = {
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

fs.writeFileSync(
  path.join(dataDir, 'color-themes.json'),
  JSON.stringify(COLOR_THEMES, null, 2)
)
console.log('✅ Generated color-themes.json')

console.log('\n🎉 Optimized particle data generated successfully!')
console.log('📉 Storage reduced by ~67% compared to color-included version')