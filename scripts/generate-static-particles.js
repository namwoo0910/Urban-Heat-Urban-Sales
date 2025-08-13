/**
 * 파티클 데이터를 미리 생성하여 정적 파일로 저장
 * 런타임 계산을 제거하여 로딩 속도 획기적 개선
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

// 서울 경계 (간단한 버전)
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
  { name: '잠실', center: [127.1001, 37.5132], radius: 0.02, density: 0.63 }
]

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

function generateParticles(count, colorTheme) {
  const particles = []
  const palette = COLOR_THEMES[colorTheme]
  let generated = 0
  
  while (generated < count) {
    const lng = SEOUL_BOUNDS.minLng + Math.random() * (SEOUL_BOUNDS.maxLng - SEOUL_BOUNDS.minLng)
    const lat = SEOUL_BOUNDS.minLat + Math.random() * (SEOUL_BOUNDS.maxLat - SEOUL_BOUNDS.minLat)
    
    const density = getAreaDensity(lng, lat)
    
    // 밀도 기반 필터링
    if (Math.random() > density * 0.7) continue
    
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
  
  return particles
}

// Wave Layer용 그리드 데이터 생성
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

// 파일 생성
console.log('🚀 Generating static particle data...')

// public/data 디렉토리 생성
const dataDir = path.join(__dirname, '../public/data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

// 각 설정별로 파티클 생성
for (const config of Object.values(CONFIGS)) {
  for (const theme of Object.keys(COLOR_THEMES)) {
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

console.log('🎉 All static data generated successfully!')