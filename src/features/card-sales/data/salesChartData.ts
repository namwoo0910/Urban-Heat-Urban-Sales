// Dummy data for various card sales charts

// Line Chart - 일별 매출 추이
export const dailySalesData = [
  { name: '1일', value: 45000000, customers: 1200 },
  { name: '2일', value: 52000000, customers: 1400 },
  { name: '3일', value: 48000000, customers: 1300 },
  { name: '4일', value: 61000000, customers: 1650 },
  { name: '5일', value: 55000000, customers: 1500 },
  { name: '6일', value: 67000000, customers: 1800 },
  { name: '7일', value: 72000000, customers: 1950 },
  { name: '8일', value: 58000000, customers: 1550 },
  { name: '9일', value: 64000000, customers: 1700 },
  { name: '10일', value: 69000000, customers: 1850 },
  { name: '11일', value: 73000000, customers: 1980 },
  { name: '12일', value: 78000000, customers: 2100 },
]

// Area Chart - 누적 매출
export const cumulativeSalesData = [
  { name: '1월', value: 450000000, growth: 0 },
  { name: '2월', value: 920000000, growth: 0.04 },
  { name: '3월', value: 1380000000, growth: 0.05 },
  { name: '4월', value: 1900000000, growth: 0.06 },
  { name: '5월', value: 2450000000, growth: 0.07 },
  { name: '6월', value: 3100000000, growth: 0.08 },
  { name: '7월', value: 3820000000, growth: 0.09 },
  { name: '8월', value: 4580000000, growth: 0.10 },
]

// Bar Chart - 업종별 매출
export const categorySalesData = [
  { name: '음식점', value: 850000000, color: '#3b82f6' },
  { name: '쇼핑', value: 720000000, color: '#10b981' },
  { name: '교통', value: 450000000, color: '#8b5cf6' },
  { name: '편의점', value: 680000000, color: '#f59e0b' },
  { name: '문화/여가', value: 390000000, color: '#ef4444' },
  { name: '의료', value: 320000000, color: '#ec4899' },
  { name: '교육', value: 280000000, color: '#14b8a6' },
  { name: '기타', value: 510000000, color: '#6366f1' },
]

// Pie Chart - 연령대별 사용 비율
export const ageGroupData = [
  { name: '20대', value: 25, amount: 1250000000 },
  { name: '30대', value: 35, amount: 1750000000 },
  { name: '40대', value: 22, amount: 1100000000 },
  { name: '50대', value: 12, amount: 600000000 },
  { name: '60대+', value: 6, amount: 300000000 },
]

// Radar Chart - 요일별 매출 패턴
export const weeklyPatternData = [
  { name: '월요일', value: 75, average: 68000000 },
  { name: '화요일', value: 72, average: 65000000 },
  { name: '수요일', value: 78, average: 70000000 },
  { name: '목요일', value: 82, average: 74000000 },
  { name: '금요일', value: 95, average: 85000000 },
  { name: '토요일', value: 100, average: 90000000 },
  { name: '일요일', value: 88, average: 79000000 },
]

// Radial Bar Chart - 목표 달성률
export const targetAchievementData = [
  { name: '강남구', value: 95, target: 1000000000, actual: 950000000 },
  { name: '서초구', value: 88, target: 900000000, actual: 792000000 },
  { name: '송파구', value: 82, target: 850000000, actual: 697000000 },
  { name: '마포구', value: 78, target: 800000000, actual: 624000000 },
  { name: '영등포구', value: 71, target: 750000000, actual: 532500000 },
]

// Composed Chart - 매출과 고객수 복합
export const salesAndCustomersData = [
  { name: '1월', sales: 450000000, customers: 12000, avgTransaction: 37500 },
  { name: '2월', sales: 470000000, customers: 12500, avgTransaction: 37600 },
  { name: '3월', sales: 460000000, customers: 12200, avgTransaction: 37700 },
  { name: '4월', sales: 520000000, customers: 13500, avgTransaction: 38500 },
  { name: '5월', sales: 550000000, customers: 14000, avgTransaction: 39300 },
  { name: '6월', sales: 650000000, customers: 16000, avgTransaction: 40600 },
  { name: '7월', sales: 720000000, customers: 17500, avgTransaction: 41100 },
  { name: '8월', sales: 760000000, customers: 18200, avgTransaction: 41800 },
]

// Scatter Chart - 매출-고객 상관관계
export const salesCorrelationData = Array.from({ length: 50 }, (_, i) => ({
  x: Math.floor(Math.random() * 100) + 50, // 고객수 (50-150)
  y: Math.floor(Math.random() * 5000000) + 2000000, // 매출 (200만-700만)
  z: Math.floor(Math.random() * 50000) + 20000, // 평균 거래액
  name: `Store${i + 1}`,
  color: i < 10 ? '#3b82f6' : i < 20 ? '#10b981' : i < 30 ? '#8b5cf6' : i < 40 ? '#f59e0b' : '#ef4444'
}))

// Funnel Chart - 구매 전환율
export const conversionFunnelData = [
  { name: '방문', value: 100000, rate: '100%' },
  { name: '상품 조회', value: 75000, rate: '75%' },
  { name: '장바구니', value: 45000, rate: '45%' },
  { name: '결제 시도', value: 30000, rate: '30%' },
  { name: '구매 완료', value: 25000, rate: '25%' },
]

// Treemap Chart - 계층적 매출 구조
export const hierarchicalSalesData = {
  name: '전체 매출',
  children: [
    {
      name: '음식',
      children: [
        { name: '한식', size: 320000000 },
        { name: '중식', size: 180000000 },
        { name: '일식', size: 150000000 },
        { name: '양식', size: 200000000 },
      ]
    },
    {
      name: '쇼핑',
      children: [
        { name: '의류', size: 280000000 },
        { name: '전자제품', size: 220000000 },
        { name: '화장품', size: 120000000 },
        { name: '생활용품', size: 100000000 },
      ]
    },
    {
      name: '교통',
      children: [
        { name: '택시', size: 180000000 },
        { name: '대중교통', size: 150000000 },
        { name: '주유소', size: 120000000 },
      ]
    },
    {
      name: '편의점',
      children: [
        { name: 'CU', size: 250000000 },
        { name: 'GS25', size: 230000000 },
        { name: '세븐일레븐', size: 200000000 },
      ]
    }
  ]
}

// Heatmap Chart - 시간대별 매출 밀도
export const salesHeatmapData = (() => {
  const hours = Array.from({ length: 24 }, (_, i) => `${i}시`)
  const days = ['월', '화', '수', '목', '금', '토', '일']
  const data: any[] = []
  
  days.forEach((day, dayIndex) => {
    hours.forEach((hour, hourIndex) => {
      // 주말과 저녁 시간대에 높은 값 설정
      let value = Math.random() * 50 + 20
      if (dayIndex >= 5) value *= 1.5 // 주말
      if (hourIndex >= 18 && hourIndex <= 22) value *= 1.8 // 저녁 피크
      if (hourIndex >= 11 && hourIndex <= 13) value *= 1.4 // 점심 피크
      
      data.push({
        x: hourIndex,
        y: day,
        value: Math.floor(value)
      })
    })
  })
  
  return {
    data,
    xLabels: hours,
    yLabels: days
  }
})()

// 지역별 매출 데이터 (서울 25개 구)
export const districtSalesData = [
  { name: '강남구', value: 950000000, rank: 1 },
  { name: '서초구', value: 792000000, rank: 2 },
  { name: '송파구', value: 697000000, rank: 3 },
  { name: '마포구', value: 624000000, rank: 4 },
  { name: '영등포구', value: 532500000, rank: 5 },
  { name: '중구', value: 510000000, rank: 6 },
  { name: '강서구', value: 485000000, rank: 7 },
  { name: '성동구', value: 462000000, rank: 8 },
  { name: '용산구', value: 438000000, rank: 9 },
  { name: '종로구', value: 415000000, rank: 10 },
  { name: '동대문구', value: 392000000, rank: 11 },
  { name: '광진구', value: 368000000, rank: 12 },
  { name: '서대문구', value: 345000000, rank: 13 },
  { name: '강동구', value: 322000000, rank: 14 },
  { name: '노원구', value: 298000000, rank: 15 },
  { name: '양천구', value: 275000000, rank: 16 },
  { name: '구로구', value: 252000000, rank: 17 },
  { name: '은평구', value: 228000000, rank: 18 },
  { name: '성북구', value: 205000000, rank: 19 },
  { name: '동작구', value: 182000000, rank: 20 },
  { name: '관악구', value: 158000000, rank: 21 },
  { name: '중랑구', value: 135000000, rank: 22 },
  { name: '금천구', value: 112000000, rank: 23 },
  { name: '강북구', value: 88000000, rank: 24 },
  { name: '도봉구', value: 65000000, rank: 25 },
]