/**
 * 하이브리드 Pre-computation 스크립트
 * 정적 지오메트리와 날짜별 판매 데이터를 최적화된 형태로 사전 처리
 */

import fs from 'fs'
import path from 'path'
import { feature } from 'topojson-client'

interface DistrictProperties {
  dong_code: number
  dong_name_kr: string
  sgg_code: number
  sgg_name_kr: string
}

interface OptimizedGeometry {
  dongCode: number
  dongName: string
  sggCode: number
  sggName: string
  centroid: [number, number]
  simplifiedCoordinates: number[][][]
  boundingBox: [number, number, number, number]
}

interface OptimizedSalesData {
  [dongCode: string]: {
    total: number
    byType: { [type: string]: number }
    rank: number
    percentile: number
  }
}

// 색상 테마별 pre-computed 값
const COLOR_THEMES = {
  blue: {
    stops: [0, 0.2, 0.4, 0.6, 0.8, 1.0],
    colors: ['#dbeafe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8']
  },
  green: {
    stops: [0, 0.2, 0.4, 0.6, 0.8, 1.0],
    colors: ['#d1fae5', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d']
  },
  purple: {
    stops: [0, 0.2, 0.4, 0.6, 0.8, 1.0],
    colors: ['#e9d5ff', '#c084fc', '#a855f7', '#9333ea', '#7e22ce', '#6b21a8']
  },
  orange: {
    stops: [0, 0.2, 0.4, 0.6, 0.8, 1.0],
    colors: ['#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c']
  }
}

// 중심점 계산
function calculateCentroid(coordinates: number[][][]): [number, number] {
  let totalX = 0, totalY = 0, totalPoints = 0
  
  coordinates[0].forEach(coord => {
    totalX += coord[0]
    totalY += coord[1]
    totalPoints++
  })
  
  return [totalX / totalPoints, totalY / totalPoints]
}

// 경계 박스 계산
function calculateBoundingBox(coordinates: number[][][]): [number, number, number, number] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  
  coordinates[0].forEach(coord => {
    minX = Math.min(minX, coord[0])
    minY = Math.min(minY, coord[1])
    maxX = Math.max(maxX, coord[0])
    maxY = Math.max(maxY, coord[1])
  })
  
  return [minX, minY, maxX, maxY]
}

// 좌표 단순화 (Douglas-Peucker 알고리즘)
function simplifyCoordinates(coords: number[][][], tolerance: number = 0.0001): number[][][] {
  // 간단한 구현 - 실제로는 더 정교한 알고리즘 필요
  return coords.map(ring => {
    const simplified: number[][] = []
    for (let i = 0; i < ring.length; i += Math.max(1, Math.floor(ring.length / 100))) {
      simplified.push(ring[i])
    }
    if (simplified[simplified.length - 1] !== ring[ring.length - 1]) {
      simplified.push(ring[ring.length - 1])
    }
    return simplified
  })
}

// 정적 지오메트리 데이터 생성
async function generateStaticGeometry() {
  console.log('📐 정적 지오메트리 데이터 생성 시작...')
  
  const dongGeoJSON = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'public/data/local_economy/local_economy_dong.geojson'), 'utf-8')
  )
  
  const optimizedGeometry: OptimizedGeometry[] = []
  
  for (const feature of dongGeoJSON.features) {
    const props = feature.properties as DistrictProperties
    const coords = feature.geometry.coordinates as number[][][]
    
    optimizedGeometry.push({
      dongCode: props.dong_code,
      dongName: props.dong_name_kr,
      sggCode: props.sgg_code,
      sggName: props.sgg_name_kr,
      centroid: calculateCentroid(coords),
      simplifiedCoordinates: simplifyCoordinates(coords),
      boundingBox: calculateBoundingBox(coords)
    })
  }
  
  // 정적 데이터 저장
  const outputDir = path.join(process.cwd(), 'public/data/optimized')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  
  fs.writeFileSync(
    path.join(outputDir, 'geometry-static.json'),
    JSON.stringify(optimizedGeometry, null, 2)
  )
  
  console.log(`✅ ${optimizedGeometry.length}개 동의 정적 지오메트리 데이터 생성 완료`)
  return optimizedGeometry
}

// 날짜별 판매 데이터 최적화
async function optimizeSalesDataByDate(geometry: OptimizedGeometry[]) {
  console.log('💰 날짜별 판매 데이터 최적화 시작...')
  
  const salesDir = path.join(process.cwd(), 'public/data/processed_data')
  const salesFiles = fs.readdirSync(salesDir).filter(f => f.startsWith('card_sales_'))
  
  for (const file of salesFiles) {
    const dateMatch = file.match(/card_sales_(\d{6})\.json/)
    if (!dateMatch) continue
    
    const date = dateMatch[1]
    console.log(`  처리 중: ${date}`)
    
    const salesData = JSON.parse(
      fs.readFileSync(path.join(salesDir, file), 'utf-8')
    )
    
    // 동별 판매 데이터 집계
    const dongSales = new Map<number, { total: number; byType: Map<string, number> }>()
    
    salesData.forEach((sale: any) => {
      const dongCode = sale.dong_code
      if (!dongSales.has(dongCode)) {
        dongSales.set(dongCode, { total: 0, byType: new Map() })
      }
      
      const dong = dongSales.get(dongCode)!
      dong.total += sale.total_sales || 0
      
      const type = sale.business_type || 'other'
      dong.byType.set(type, (dong.byType.get(type) || 0) + (sale.total_sales || 0))
    })
    
    // 순위 및 백분위 계산
    const sortedDongs = Array.from(dongSales.entries()).sort((a, b) => b[1].total - a[1].total)
    const optimized: OptimizedSalesData = {}
    
    sortedDongs.forEach(([dongCode, data], index) => {
      optimized[dongCode] = {
        total: Math.round(data.total),
        byType: Object.fromEntries(data.byType),
        rank: index + 1,
        percentile: ((sortedDongs.length - index) / sortedDongs.length) * 100
      }
    })
    
    // 날짜별 최적화된 데이터 저장
    fs.writeFileSync(
      path.join(process.cwd(), `public/data/optimized/sales-${date}.json`),
      JSON.stringify(optimized, null, 2)
    )
  }
  
  console.log(`✅ ${salesFiles.length}개 날짜의 판매 데이터 최적화 완료`)
}

// 색상 매핑 사전 계산
async function precomputeColorMappings() {
  console.log('🎨 색상 매핑 사전 계산 시작...')
  
  const colorMappings = {
    themes: COLOR_THEMES,
    heightScale: {
      min: 0,
      max: 300,
      steps: 10
    }
  }
  
  fs.writeFileSync(
    path.join(process.cwd(), 'public/data/optimized/color-mappings.json'),
    JSON.stringify(colorMappings, null, 2)
  )
  
  console.log('✅ 색상 매핑 사전 계산 완료')
}

// 메타데이터 생성
async function generateMetadata() {
  console.log('📊 메타데이터 생성 중...')
  
  const optimizedDir = path.join(process.cwd(), 'public/data/optimized')
  const files = fs.readdirSync(optimizedDir)
  
  const salesFiles = files.filter(f => f.startsWith('sales-'))
  const availableDates = salesFiles.map(f => {
    const match = f.match(/sales-(\d{6})\.json/)
    return match ? match[1] : null
  }).filter(Boolean)
  
  const metadata = {
    generatedAt: new Date().toISOString(),
    dongCount: 426,
    availableDates: availableDates.sort(),
    dataVersion: '1.0.0',
    files: {
      geometry: 'geometry-static.json',
      colorMappings: 'color-mappings.json',
      salesPattern: 'sales-YYYYMM.json'
    }
  }
  
  fs.writeFileSync(
    path.join(optimizedDir, 'metadata.json'),
    JSON.stringify(metadata, null, 2)
  )
  
  console.log('✅ 메타데이터 생성 완료')
  return metadata
}

// 메인 실행 함수
async function main() {
  console.log('🚀 하이브리드 Pre-computation 시작\n')
  console.log('전략: 정적 지오메트리는 빌드 타임에, 판매 데이터는 날짜별로 최적화\n')
  
  try {
    // 1. 정적 지오메트리 생성
    const geometry = await generateStaticGeometry()
    
    // 2. 날짜별 판매 데이터 최적화
    await optimizeSalesDataByDate(geometry)
    
    // 3. 색상 매핑 사전 계산
    await precomputeColorMappings()
    
    // 4. 메타데이터 생성
    const metadata = await generateMetadata()
    
    console.log('\n🎉 모든 최적화 완료!')
    console.log(`📁 출력 디렉토리: public/data/optimized/`)
    console.log(`📅 사용 가능한 날짜: ${metadata.availableDates.join(', ')}`)
    
  } catch (error) {
    console.error('❌ 오류 발생:', error)
    process.exit(1)
  }
}

// ts-node로 실행 가능하도록 설정
if (require.main === module) {
  main()
}

export { generateStaticGeometry, optimizeSalesDataByDate, precomputeColorMappings }