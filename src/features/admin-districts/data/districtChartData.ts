// 행정구역 분석용 차트 데이터

// Line Chart - 구역별 인구 변화 추이
export const districtTrendData = [
  { name: '2019', value: 9720000, growth: 0 },
  { name: '2020', value: 9668000, growth: -0.5 },
  { name: '2021', value: 9509000, growth: -1.6 },
  { name: '2022', value: 9411000, growth: -1.0 },
  { name: '2023', value: 9385000, growth: -0.3 },
  { name: '2024', value: 9350000, growth: -0.4 },
]

// Area Chart - 누적 행정구역 데이터
export const cumulativeDistrictData = [
  { name: '강남권', value: 2850000, area: 145.8 },
  { name: '강북권', value: 1920000, area: 122.3 },
  { name: '강서권', value: 2100000, area: 156.7 },
  { name: '강동권', value: 1680000, area: 98.5 },
  { name: '도심권', value: 800000, area: 82.2 },
]

// Bar Chart - 구별 인구 비교
export const districtPopulationData = [
  { name: '송파구', value: 667483, color: '#3b82f6' },
  { name: '강서구', value: 603772, color: '#10b981' },
  { name: '강남구', value: 547946, color: '#8b5cf6' },
  { name: '노원구', value: 536948, color: '#f59e0b' },
  { name: '관악구', value: 503297, color: '#ef4444' },
  { name: '강동구', value: 469355, color: '#ec4899' },
  { name: '양천구', value: 457346, color: '#14b8a6' },
  { name: '서초구', value: 428816, color: '#6366f1' },
]

// Pie Chart - 행정구역 면적 비율
export const districtAreaData = [
  { name: '강서구', value: 41.44, area: 41440000 },
  { name: '서초구', value: 47.00, area: 47000000 },
  { name: '강남구', value: 39.50, area: 39500000 },
  { name: '노원구', value: 35.44, area: 35440000 },
  { name: '송파구', value: 33.87, area: 33870000 },
  { name: '은평구', value: 29.71, area: 29710000 },
  { name: '기타', value: 378.25, area: 378250000 },
]

// Radar Chart - 구역별 특성 분석
export const districtCharacteristics = [
  { name: '인구밀도', value: 85, metric: '16,820명/km²' },
  { name: '상업지역', value: 72, metric: '35.2%' },
  { name: '주거지역', value: 88, metric: '48.7%' },
  { name: '녹지비율', value: 45, metric: '23.5%' },
  { name: '교통접근성', value: 92, metric: '지하철역 평균 500m' },
  { name: '교육시설', value: 78, metric: '학교 밀도 8.2개/km²' },
  { name: '의료시설', value: 68, metric: '병원 밀도 4.5개/km²' },
]

// Composed Chart - 인구와 인구밀도 복합
export const populationDensityData = [
  { name: '강남구', population: 547946, density: 13872, ranking: 3 },
  { name: '서초구', population: 428816, density: 9124, ranking: 8 },
  { name: '송파구', population: 667483, density: 19706, ranking: 1 },
  { name: '양천구', population: 457346, density: 26543, ranking: 7 },
  { name: '관악구', population: 503297, density: 17004, ranking: 5 },
  { name: '동작구', population: 397674, density: 24354, ranking: 11 },
  { name: '마포구', population: 378566, density: 15952, ranking: 12 },
  { name: '종로구', population: 151767, density: 6339, ranking: 24 },
]

// Heatmap Chart - 시간대별 구역 활동 밀도
export const districtActivityHeatmap = (() => {
  const hours = Array.from({ length: 24 }, (_, i) => `${i}시`)
  const districts = ['강남구', '서초구', '종로구', '마포구', '송파구', '중구', '영등포구']
  const data: any[] = []
  
  districts.forEach((district, districtIndex) => {
    hours.forEach((hour, hourIndex) => {
      // 구역별, 시간대별 특성 반영
      let value = Math.random() * 40 + 20
      
      // 강남/서초 - 업무시간 높음
      if ((district === '강남구' || district === '서초구') && hourIndex >= 9 && hourIndex <= 18) {
        value *= 2.0
      }
      
      // 종로/중구 - 관광지역 낮시간
      if ((district === '종로구' || district === '중구') && hourIndex >= 10 && hourIndex <= 16) {
        value *= 1.8
      }
      
      // 마포 - 저녁 활동
      if (district === '마포구' && hourIndex >= 18 && hourIndex <= 23) {
        value *= 1.9
      }
      
      // 영등포 - 업무 및 상업
      if (district === '영등포구' && (hourIndex >= 9 && hourIndex <= 21)) {
        value *= 1.6
      }
      
      data.push({
        x: hourIndex,
        y: district,
        value: Math.floor(value)
      })
    })
  })
  
  return {
    data,
    xLabels: hours,
    yLabels: districts
  }
})()

// 구별 상세 데이터 (서울 25개 구)
export const seoulDistrictsDetailData = [
  { name: '강남구', population: 547946, area: 39.50, density: 13872, rank: 3 },
  { name: '강동구', population: 469355, area: 24.59, density: 19089, rank: 6 },
  { name: '강북구', population: 309859, area: 23.60, density: 13129, rank: 19 },
  { name: '강서구', population: 603772, area: 41.44, density: 14569, rank: 2 },
  { name: '관악구', population: 503297, area: 29.57, density: 17021, rank: 5 },
  { name: '광진구', population: 354705, area: 17.06, density: 20792, rank: 14 },
  { name: '구로구', population: 441359, area: 20.12, density: 21941, rank: 9 },
  { name: '금천구', population: 251820, area: 13.02, density: 19341, rank: 22 },
  { name: '노원구', population: 536948, area: 35.44, density: 15151, rank: 4 },
  { name: '도봉구', population: 332892, area: 20.70, density: 16082, rank: 16 },
  { name: '동대문구', population: 357044, area: 14.21, density: 25132, rank: 13 },
  { name: '동작구', population: 397674, area: 16.35, density: 24326, rank: 11 },
  { name: '마포구', population: 378566, area: 23.84, density: 15882, rank: 12 },
  { name: '서대문구', population: 323187, area: 17.63, density: 18335, rank: 17 },
  { name: '서초구', population: 428816, area: 47.00, density: 9124, rank: 8 },
  { name: '성동구', population: 298124, area: 16.86, density: 17689, rank: 20 },
  { name: '성북구', population: 448607, area: 24.58, density: 18253, rank: 10 },
  { name: '송파구', population: 667483, area: 33.87, density: 19706, rank: 1 },
  { name: '양천구', population: 457346, area: 17.41, density: 26274, rank: 7 },
  { name: '영등포구', population: 368962, area: 24.53, density: 15044, rank: 15 },
  { name: '용산구', population: 232286, area: 21.87, density: 10622, rank: 23 },
  { name: '은평구', population: 483648, area: 29.71, density: 16279, rank: 18 },
  { name: '종로구', population: 151767, area: 23.91, density: 6348, rank: 24 },
  { name: '중구', population: 133240, area: 9.96, density: 13377, rank: 25 },
  { name: '중랑구', population: 398469, area: 18.50, density: 21539, rank: 21 },
]

// 행정동 수 데이터
export const dongCountData = [
  { name: '노원구', value: 19, type: '행정동' },
  { name: '강서구', value: 20, type: '행정동' },
  { name: '송파구', value: 27, type: '행정동' },
  { name: '강남구', value: 22, type: '행정동' },
  { name: '은평구', value: 16, type: '행정동' },
  { name: '관악구', value: 21, type: '행정동' },
  { name: '성북구', value: 20, type: '행정동' },
  { name: '중구', value: 15, type: '행정동' },
]

// 인프라 밀도 데이터
export const infrastructureData = [
  { category: '지하철역', 강남구: 32, 종로구: 18, 마포구: 14, 송파구: 21, 영등포구: 16 },
  { category: '버스정류장', 강남구: 342, 종로구: 215, 마포구: 268, 송파구: 312, 영등포구: 289 },
  { category: '학교', 강남구: 82, 종로구: 45, 마포구: 58, 송파구: 94, 영등포구: 67 },
  { category: '병원', 강남구: 456, 종로구: 312, 마포구: 287, 송파구: 398, 영등포구: 342 },
  { category: '공원', 강남구: 28, 종로구: 42, 마포구: 19, 송파구: 35, 영등포구: 22 },
]