/**
 * 일별 3D 데이터 사전 처리 스크립트
 * 2024-01-01 데이터로 높이와 색상을 미리 계산
 */

const fs = require('fs')
const path = require('path')

// 색상 테마 정의 (RGB 값)
const COLOR_THEMES = {
  blue: [
    [219, 234, 254], [147, 197, 253], [96, 165, 250],
    [59, 130, 246], [37, 99, 235], [29, 78, 216]
  ],
  green: [
    [209, 250, 229], [134, 239, 172], [74, 222, 128],
    [34, 197, 94], [22, 163, 74], [21, 128, 61]
  ],
  purple: [
    [233, 213, 255], [192, 132, 252], [168, 85, 247],
    [147, 51, 234], [126, 34, 206], [107, 33, 168]
  ],
  orange: [
    [254, 215, 170], [253, 186, 116], [251, 146, 60],
    [249, 115, 22], [234, 88, 12], [194, 65, 12]
  ],
  bright: [
    [255, 237, 213], [254, 215, 170], [253, 186, 116],
    [251, 146, 60], [249, 115, 22], [234, 88, 12]
  ]
}

// 중심점 계산
function calculateCentroid(coordinates) {
  let totalX = 0, totalY = 0, totalPoints = 0
  
  const ring = coordinates[0] // 첫 번째 ring만 사용
  ring.forEach(coord => {
    totalX += coord[0]
    totalY += coord[1]
    totalPoints++
  })
  
  return [totalX / totalPoints, totalY / totalPoints]
}

// 경계 박스 계산
function calculateBoundingBox(coordinates) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  
  const ring = coordinates[0]
  ring.forEach(coord => {
    minX = Math.min(minX, coord[0])
    minY = Math.min(minY, coord[1])
    maxX = Math.max(maxX, coord[0])
    maxY = Math.max(maxY, coord[1])
  })
  
  return [minX, minY, maxX, maxY]
}

// 메인 처리 함수
async function preprocessDaily3DData() {
  const targetDate = '2024-01-01'
  console.log(`🚀 일별 3D 데이터 사전 처리 시작 (${targetDate})`)
  
  try {
    // 1. 동 경계 데이터 로드
    const dongGeoJSON = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../public/data/local_economy/local_economy_dong.geojson'), 'utf-8')
    )
    
    console.log(`✅ ${dongGeoJSON.features.length}개 동 경계 데이터 로드 완료`)
    
    // 2. 2024-01 월별 데이터에서 01-01 데이터 추출
    const monthlyData = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../public/data/local_economy/monthly/2024-01.json'), 'utf-8')
    )
    
    const dailyData = monthlyData.filter(item => item['기준일자'] === targetDate)
    console.log(`✅ ${targetDate}: ${dailyData.length}개 동 매출 데이터 추출`)
    
    // 3. 동별 매출 집계 (업종별 합계)
    const dongSalesMap = new Map()
    const dongSalesByTypeMap = new Map()
    
    dailyData.forEach(item => {
      const dongCode = item['행정동코드']
      const totalSales = item['총매출액'] || 0
      const salesByType = item['총매출액_업종'] || {}
      
      dongSalesMap.set(dongCode, totalSales)
      dongSalesByTypeMap.set(dongCode, salesByType)
    })
    
    // 누락된 2개 동 추가 (매출 0원)
    const missingDongs = [
      { code: 11650550, name: '반포본동' },
      { code: 11740690, name: '둔촌1동' }
    ]
    
    missingDongs.forEach(dong => {
      if (!dongSalesMap.has(dong.code)) {
        dongSalesMap.set(dong.code, 0)
        dongSalesByTypeMap.set(dong.code, {})
        console.log(`⚠️ 누락된 동 추가: ${dong.name} (매출: 0원)`)
      }
    })
    
    console.log(`✅ 총 ${dongSalesMap.size}개 동의 매출 데이터 처리 완료`)
    
    // 4. 매출 기준 정렬 및 백분위 계산
    const salesArray = Array.from(dongSalesMap.entries()).sort((a, b) => b[1] - a[1])
    const maxSales = salesArray[0]?.[1] || 1
    const minSales = salesArray[salesArray.length - 1]?.[1] || 0
    
    // 백분위 매핑
    const percentileMap = new Map()
    salesArray.forEach(([dongCode, sales], index) => {
      const percentile = ((salesArray.length - index) / salesArray.length) * 100
      percentileMap.set(dongCode, percentile)
    })
    
    // 5. 각 동에 대해 데이터 사전 계산
    const preprocessedFeatures = []
    
    dongGeoJSON.features.forEach(feature => {
      const dongCode = feature.properties['행정동코드']
      const dongName = feature.properties['행정동']
      const sggName = feature.properties['자치구']
      const sggCode = feature.properties['자치구코드']
      
      const totalSales = dongSalesMap.get(dongCode) || 0
      const salesByType = dongSalesByTypeMap.get(dongCode) || {}
      const percentile = percentileMap.get(dongCode) || 0
      
      // 높이 계산 (10-400m, 백분위 기반)
      const height = Math.max(10, Math.round((percentile / 100) * 400))
      
      // 색상 인덱스 계산 (0-5)
      const colorIndex = Math.min(5, Math.floor(percentile / 20))
      
      // 모든 테마의 RGB 색상 사전 계산
      const fillColorRGB = {}
      Object.entries(COLOR_THEMES).forEach(([theme, colors]) => {
        fillColorRGB[theme] = [...colors[colorIndex], 255] // RGBA
      })
      
      // 중심점과 경계 박스 계산
      const centroid = calculateCentroid(feature.geometry.coordinates)
      const boundingBox = calculateBoundingBox(feature.geometry.coordinates)
      
      // 순위 찾기
      const rank = salesArray.findIndex(([code]) => code === dongCode) + 1
      
      preprocessedFeatures.push({
        dongCode,
        dongName,
        sggName,
        sggCode,
        // 사전 계산된 값들
        height,
        totalSales,
        salesByType,
        percentile: Math.round(percentile * 100) / 100,
        colorIndex,
        fillColorRGB,
        centroid,
        boundingBox,
        // 포맷된 표시값
        formattedSales: totalSales > 100000000 
          ? `${(totalSales / 100000000).toFixed(1)}억원`
          : totalSales > 10000000
          ? `${(totalSales / 10000000).toFixed(0)}천만원`
          : `${(totalSales / 10000).toFixed(0)}만원`,
        rank,
        rankLabel: `${rank}위 / 426개동`,
        // 원본 geometry (필요시)
        geometry: feature.geometry
      })
    })
    
    // 6. 결과 저장
    const outputDir = path.join(__dirname, '../public/data/optimized/daily')
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }
    
    const outputData = {
      date: targetDate,
      dongCount: preprocessedFeatures.length,
      metadata: {
        processedAt: new Date().toISOString(),
        themes: Object.keys(COLOR_THEMES),
        heightRange: [10, 400],
        version: '1.0.0',
        maxSales,
        minSales
      },
      features: preprocessedFeatures
    }
    
    const outputPath = path.join(outputDir, `${targetDate}.json`)
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2))
    
    // 7. 요약 통계 출력
    const salesAboveZero = preprocessedFeatures.filter(f => f.totalSales > 0).length
    const topDong = preprocessedFeatures[0]
    
    console.log('\n📊 처리 결과 요약:')
    console.log(`- 처리된 날짜: ${targetDate}`)
    console.log(`- 처리된 동 개수: ${preprocessedFeatures.length}개`)
    console.log(`- 매출 있는 동: ${salesAboveZero}개`)
    console.log(`- 매출 없는 동: ${preprocessedFeatures.length - salesAboveZero}개`)
    console.log(`- 최대 매출: ${(maxSales / 100000000).toFixed(1)}억원 (${topDong.dongName})`)
    console.log(`- 최소 매출: ${(minSales / 100000000).toFixed(1)}억원`)
    console.log(`- 출력 파일: ${outputPath}`)
    console.log(`- 파일 크기: ${(JSON.stringify(outputData).length / 1024 / 1024).toFixed(2)}MB`)
    
    console.log('\n✨ 사전 처리 완료!')
    
  } catch (error) {
    console.error('❌ 오류 발생:', error)
    process.exit(1)
  }
}

// 스크립트 실행
if (require.main === module) {
  preprocessDaily3DData()
}

module.exports = { preprocessDaily3DData }