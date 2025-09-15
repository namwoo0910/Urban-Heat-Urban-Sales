/**
 * 하이브리드 최적화 데이터 생성 스크립트
 * 정적 지오메트리 + 월별 매출/기상 데이터 분리 전략
 */

import fs from 'fs'
import path from 'path'

interface LocalEconomyRecord {
  자치구: string
  자치구코드: number
  행정동: string
  행정동코드: number
  기준일자: string
  일평균기온: number
  일최고기온: number
  일최저기온: number
  일총강수량: number
  일최고강수량: number
  일최저강수량: number
  일평균습도: number
  일최고습도: number
  일최저습도: number
  일평균불쾌지수: number
  일최고불쾌지수: number
  일최저불쾌지수: number
  기온그룹: string
  총매출액: number
  총매출액_업종: Record<string, number>
}

interface StaticGeometry {
  dongCode: number
  dongName: string
  sggName: string
  sggCode: number
  centroid: [number, number]
  boundingBox: [number, number, number, number]
  coordinates: number[][][]
}

interface DailyDongData {
  totalSales: number
  salesByType: Record<string, number>
  weather: {
    avgTemp: number
    maxTemp: number
    minTemp: number
    avgHumidity: number
    discomfortIndex: number
    tempGroup: string
  }
  rank: number
  percentile: number
  colorIndex: number
  height: number
  formattedSales: string
  rankLabel: string
}

interface MonthlyOptimizedData {
  month: string
  dongCount: number
  metadata: {
    processedAt: string
    themes: string[]
    heightRange: [number, number]
    version: string
    maxSales: number
    minSales: number
    totalDays: number
  }
  days: Record<string, Record<number, DailyDongData>>
}

// 색상 인덱스 계산
function calculateColorIndex(percentile: number): number {
  if (percentile >= 90) return 5
  if (percentile >= 75) return 4
  if (percentile >= 50) return 3
  if (percentile >= 25) return 2
  if (percentile >= 10) return 1
  return 0
}

// 높이 계산 (정수)
function calculateHeight(sales: number, maxSales: number): number {
  if (maxSales === 0) return 0
  const normalized = sales / maxSales
  return Math.floor(Math.min(normalized * 1000, 1000)) // 최대 1000m, 정수
}

// 매출액 포맷팅
function formatSales(sales: number): string {
  if (sales >= 1000000000) {
    return `${Math.floor(sales / 100000000) / 10}억원`
  }
  if (sales >= 100000000) {
    return `${Math.floor(sales / 100000000)}억원`
  }
  if (sales >= 10000000) {
    return `${Math.floor(sales / 10000000)}천만원`
  }
  if (sales >= 1000000) {
    return `${Math.floor(sales / 1000000)}백만원`
  }
  if (sales >= 10000) {
    return `${Math.floor(sales / 10000)}만원`
  }
  return `${Math.floor(sales / 1000)}천원`
}

// 순위 라벨
function getRankLabel(rank: number, totalCount: number): string {
  const percentile = ((totalCount - rank) / totalCount) * 100
  if (percentile >= 90) return '상위 10%'
  if (percentile >= 75) return '상위 25%'
  if (percentile >= 50) return '상위 50%'
  if (percentile >= 25) return '하위 50%'
  return '하위 25%'
}

// 중심점 계산 (원본 정밀도 유지)
function calculateCentroid(coordinates: number[][][]): [number, number] {
  let totalX = 0, totalY = 0, totalPoints = 0
  
  coordinates[0].forEach(coord => {
    totalX += coord[0]
    totalY += coord[1]
    totalPoints++
  })
  
  return [totalX / totalPoints, totalY / totalPoints]
}

// 경계 박스 계산 (원본 정밀도 유지)
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

// 1. 정적 지오메트리 생성
async function generateStaticGeometry(): Promise<StaticGeometry[]> {
  console.log('📐 정적 지오메트리 데이터 생성 중...')
  
  const geoJsonPath = path.join(process.cwd(), 'public/data/local_economy/local_economy_dong.geojson')
  const geoJsonData = JSON.parse(fs.readFileSync(geoJsonPath, 'utf-8'))
  
  const staticGeometry: StaticGeometry[] = []
  
  for (const feature of geoJsonData.features) {
    const props = feature.properties
    const coords = feature.geometry.coordinates as number[][][]
    
    // 동코드 매핑 (여러 가능한 필드명 지원)
    const dongCode = props.dong_code || props.행정동코드 || props.ADM_DR_CD
    const dongName = props.dong_name_kr || props.행정동 || props.ADM_DR_NM
    const sggCode = props.sgg_code || props.자치구코드 || props.SIGUNGU_CD
    const sggName = props.sgg_name_kr || props.자치구 || props.SIGUNGU_NM
    
    if (!dongCode) {
      console.warn('동코드 없는 feature 스킵:', props)
      continue
    }
    
    staticGeometry.push({
      dongCode: Number(dongCode),
      dongName: String(dongName),
      sggName: String(sggName),
      sggCode: Number(sggCode),
      centroid: calculateCentroid(coords),
      boundingBox: calculateBoundingBox(coords),
      coordinates: coords // 원본 정밀도 유지
    })
  }
  
  // 정적 지오메트리 저장
  const outputDir = path.join(process.cwd(), 'public/data/optimized')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  
  const outputPath = path.join(outputDir, 'geometry-static.json')
  fs.writeFileSync(outputPath, JSON.stringify(staticGeometry, null, 2))
  
  const fileSize = Math.round(fs.statSync(outputPath).size / 1024)
  console.log(`✅ 정적 지오메트리 생성 완료: ${staticGeometry.length}개 동, ${fileSize}KB`)
  
  return staticGeometry
}

// 2. 월별 매출/기상 데이터 최적화
async function generateMonthlyOptimizedData(): Promise<void> {
  console.log('💰 월별 최적화 데이터 생성 중...')
  
  const monthlyDir = path.join(process.cwd(), 'public/data/local_economy/monthly')
  const monthlyFiles = fs.readdirSync(monthlyDir)
    .filter(f => f.endsWith('.json'))
    .sort()
  
  const outputDir = path.join(process.cwd(), 'public/data/optimized/monthly')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  
  console.log(`📅 처리할 월별 파일: ${monthlyFiles.length}개`)
  
  for (const monthFile of monthlyFiles) {
    const monthMatch = monthFile.match(/(\d{4}-\d{2})\.json/)
    if (!monthMatch) continue
    
    const month = monthMatch[1]
    console.log(`  처리 중: ${month}`)
    
    // 월별 데이터 로드
    const monthlyDataPath = path.join(monthlyDir, monthFile)
    const monthlyData: LocalEconomyRecord[] = JSON.parse(fs.readFileSync(monthlyDataPath, 'utf-8'))
    
    // 날짜별로 그룹화
    const dailyGroups = new Map<string, LocalEconomyRecord[]>()
    monthlyData.forEach(record => {
      const dateStr = record.기준일자.split('-')[2] // "2024-01-01" -> "01"
      if (!dailyGroups.has(dateStr)) {
        dailyGroups.set(dateStr, [])
      }
      dailyGroups.get(dateStr)!.push(record)
    })
    
    const daysData: Record<string, Record<number, DailyDongData>> = {}
    let monthMaxSales = 0
    let monthMinSales = Infinity
    
    // 전체 월의 매출 데이터를 먼저 수집 (순위 계산용)
    const allSalesData: Array<{ dongCode: number, sales: number, date: string }> = []
    for (const [dateStr, records] of dailyGroups) {
      records.forEach(record => {
        const sales = Math.floor(record.총매출액) // 정수화
        allSalesData.push({
          dongCode: record.행정동코드,
          sales,
          date: dateStr
        })
        monthMaxSales = Math.max(monthMaxSales, sales)
        monthMinSales = Math.min(monthMinSales, sales)
      })
    }
    
    // 각 날짜별 처리
    for (const [dateStr, records] of dailyGroups) {
      const dayData: Record<number, DailyDongData> = {}
      
      // 해당 일자의 매출로 순위 계산
      const daySales = records.map(record => ({
        dongCode: record.행정동코드,
        sales: Math.floor(record.총매출액)
      })).sort((a, b) => b.sales - a.sales)
      
      const rankMap = new Map<number, number>()
      const percentileMap = new Map<number, number>()
      daySales.forEach(({ dongCode, sales }, index) => {
        rankMap.set(dongCode, index + 1)
        percentileMap.set(dongCode, Math.floor(((daySales.length - index) / daySales.length) * 100))
      })
      
      // 각 동별 데이터 처리
      records.forEach(record => {
        const dongCode = record.행정동코드
        const totalSales = Math.floor(record.총매출액) // 정수화
        const rank = rankMap.get(dongCode) || 0
        const percentile = percentileMap.get(dongCode) || 0
        
        // 업종별 매출 정수화
        const salesByType: Record<string, number> = {}
        Object.entries(record.총매출액_업종).forEach(([type, amount]) => {
          salesByType[type] = Math.floor(amount)
        })
        
        dayData[dongCode] = {
          totalSales,
          salesByType,
          weather: {
            avgTemp: Math.floor(record.일평균기온), // 정수화
            maxTemp: Math.floor(record.일최고기온),
            minTemp: Math.floor(record.일최저기온),
            avgHumidity: Math.floor(record.일평균습도),
            discomfortIndex: Math.floor(record.일평균불쾌지수),
            tempGroup: record.기온그룹
          },
          rank,
          percentile,
          colorIndex: calculateColorIndex(percentile),
          height: calculateHeight(totalSales, monthMaxSales),
          formattedSales: formatSales(totalSales),
          rankLabel: getRankLabel(rank, daySales.length)
        }
      })
      
      daysData[dateStr] = dayData
    }
    
    // 월별 최적화 데이터 생성
    const monthlyOptimized: MonthlyOptimizedData = {
      month,
      dongCount: Object.keys(daysData[Object.keys(daysData)[0]] || {}).length,
      metadata: {
        processedAt: new Date().toISOString(),
        themes: ['blue', 'green', 'purple', 'orange', 'bright'],
        heightRange: [0, 1000],
        version: '2.0.0',
        maxSales: monthMaxSales,
        minSales: monthMinSales === Infinity ? 0 : monthMinSales,
        totalDays: dailyGroups.size
      },
      days: daysData
    }
    
    // 월별 파일 저장
    const outputPath = path.join(outputDir, `sales-${month}.json`)
    fs.writeFileSync(outputPath, JSON.stringify(monthlyOptimized, null, 2))
    
    const fileSize = Math.round(fs.statSync(outputPath).size / 1024)
    console.log(`  ✅ ${month} 완료: ${dailyGroups.size}일, ${fileSize}KB`)
  }
  
  console.log('💰 월별 최적화 데이터 생성 완료')
}

// 3. 메타데이터 생성
async function generateMetadata(): Promise<void> {
  console.log('📊 메타데이터 생성 중...')
  
  const optimizedDir = path.join(process.cwd(), 'public/data/optimized')
  const monthlyDir = path.join(optimizedDir, 'monthly')
  
  const monthlyFiles = fs.readdirSync(monthlyDir)
    .filter(f => f.startsWith('sales-'))
    .sort()
  
  const availableMonths = monthlyFiles.map(f => {
    const match = f.match(/sales-(\d{4}-\d{2})\.json/)
    return match ? match[1] : null
  }).filter(Boolean)
  
  const geometryPath = path.join(optimizedDir, 'geometry-static.json')
  const geometrySize = fs.existsSync(geometryPath) ? 
    Math.round(fs.statSync(geometryPath).size / 1024) : 0
  
  const totalMonthlySize = monthlyFiles.reduce((sum, file) => {
    return sum + fs.statSync(path.join(monthlyDir, file)).size
  }, 0)
  
  const metadata = {
    generatedAt: new Date().toISOString(),
    version: '2.0.0',
    strategy: 'static-geometry-dynamic-sales',
    files: {
      staticGeometry: {
        path: 'geometry-static.json',
        size: `${geometrySize}KB`,
        description: '모든 동의 좌표 정보 (원본 정밀度 유지)'
      },
      monthlySales: {
        pattern: 'monthly/sales-YYYY-MM.json',
        count: monthlyFiles.length,
        totalSize: `${Math.round(totalMonthlySize / 1024)}KB`,
        avgSize: `${Math.round(totalMonthlySize / monthlyFiles.length / 1024)}KB`,
        description: '월별 매출/기상 데이터 (정수화 최적화)'
      }
    },
    availableMonths: availableMonths.sort(),
    dataOptimizations: {
      coordinates: 'original-precision',
      sales: 'integer-conversion',
      weather: 'integer-conversion',
      structure: 'static-dynamic-separation'
    },
    performance: {
      initialLoad: `${geometrySize + Math.round(totalMonthlySize / monthlyFiles.length / 1024)}KB`,
      monthChange: `${Math.round(totalMonthlySize / monthlyFiles.length / 1024)}KB`,
      dayChange: '0KB (memory-filtering)'
    }
  }
  
  fs.writeFileSync(
    path.join(optimizedDir, 'metadata.json'),
    JSON.stringify(metadata, null, 2)
  )
  
  console.log('✅ 메타데이터 생성 완료')
  console.log(`📁 사용 가능한 월: ${availableMonths.join(', ')}`)
}

// 메인 실행 함수
async function main() {
  console.log('🚀 하이브리드 최적화 데이터 생성 시작\n')
  console.log('전략: 정적 지오메트리 + 월별 매출/기상 데이터 분리\n')
  
  try {
    // 1. 정적 지오메트리 생성
    await generateStaticGeometry()
    console.log()
    
    // 2. 월별 최적화 데이터 생성
    await generateMonthlyOptimizedData()
    console.log()
    
    // 3. 메타데이터 생성
    await generateMetadata()
    
    console.log('\n🎉 하이브리드 최적화 완료!')
    console.log('📂 출력 위치:')
    console.log('  - public/data/optimized/geometry-static.json')
    console.log('  - public/data/optimized/monthly/sales-YYYY-MM.json')
    console.log('  - public/data/optimized/metadata.json')
    
  } catch (error) {
    console.error('❌ 오류 발생:', error)
    process.exit(1)
  }
}

// 실행
if (require.main === module) {
  main()
}

export { main, generateStaticGeometry, generateMonthlyOptimizedData }