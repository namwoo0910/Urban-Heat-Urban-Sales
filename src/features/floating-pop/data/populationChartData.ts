// 유동인구 차트용 데이터

// Line Chart - 시간대별 유동인구 추이
export const hourlyPopulationData = [
  { name: '00시', value: 12000, density: 'low' },
  { name: '03시', value: 8000, density: 'low' },
  { name: '06시', value: 25000, density: 'medium' },
  { name: '09시', value: 85000, density: 'high' },
  { name: '12시', value: 95000, density: 'high' },
  { name: '15시', value: 75000, density: 'high' },
  { name: '18시', value: 110000, density: 'very-high' },
  { name: '21시', value: 65000, density: 'medium' },
  { name: '24시', value: 20000, density: 'low' },
]

// Area Chart - 누적 유동인구
export const cumulativePopulationData = [
  { name: '월', value: 2100000, weekday: true },
  { name: '화', value: 2250000, weekday: true },
  { name: '수', value: 2300000, weekday: true },
  { name: '목', value: 2400000, weekday: true },
  { name: '금', value: 2650000, weekday: true },
  { name: '토', value: 2850000, weekday: false },
  { name: '일', value: 2550000, weekday: false },
]

// Bar Chart - 지역별 유동인구
export const districtPopulationData = [
  { name: '강남역', value: 450000, color: '#3b82f6' },
  { name: '홍대입구', value: 380000, color: '#10b981' },
  { name: '명동', value: 420000, color: '#8b5cf6' },
  { name: '여의도', value: 320000, color: '#f59e0b' },
  { name: '신촌', value: 350000, color: '#ef4444' },
  { name: '잠실', value: 380000, color: '#ec4899' },
  { name: '건대입구', value: 290000, color: '#14b8a6' },
  { name: '이태원', value: 310000, color: '#6366f1' },
]

// Pie Chart - 연령대별 유동인구 분포
export const ageDistributionData = [
  { name: '10대', value: 8, count: 160000 },
  { name: '20대', value: 32, count: 640000 },
  { name: '30대', value: 28, count: 560000 },
  { name: '40대', value: 18, count: 360000 },
  { name: '50대', value: 10, count: 200000 },
  { name: '60대+', value: 4, count: 80000 },
]

// Radar Chart - 시간대별 활동 패턴
export const activityPatternData = [
  { name: '새벽', value: 15, time: '00-06시' },
  { name: '출근', value: 85, time: '06-09시' },
  { name: '오전', value: 60, time: '09-12시' },
  { name: '점심', value: 95, time: '12-14시' },
  { name: '오후', value: 70, time: '14-18시' },
  { name: '퇴근', value: 100, time: '18-21시' },
  { name: '저녁', value: 75, time: '21-24시' },
]

// Composed Chart - 유동인구와 체류시간 복합
export const populationAndDwellData = [
  { name: '강남', population: 450000, dwellTime: 35, satisfaction: 85 },
  { name: '홍대', population: 380000, dwellTime: 45, satisfaction: 90 },
  { name: '명동', population: 420000, dwellTime: 38, satisfaction: 82 },
  { name: '여의도', population: 320000, dwellTime: 25, satisfaction: 75 },
  { name: '신촌', population: 350000, dwellTime: 42, satisfaction: 88 },
  { name: '잠실', population: 380000, dwellTime: 40, satisfaction: 86 },
  { name: '건대', population: 290000, dwellTime: 48, satisfaction: 92 },
  { name: '이태원', population: 310000, dwellTime: 52, satisfaction: 94 },
]

// Heatmap Chart - 시간대별 지역 밀도
export const populationHeatmapData = (() => {
  const hours = Array.from({ length: 24 }, (_, i) => `${i}시`)
  const districts = ['강남', '홍대', '명동', '여의도', '신촌', '잠실', '건대']
  const data: any[] = []
  
  districts.forEach((district, districtIndex) => {
    hours.forEach((hour, hourIndex) => {
      // 특정 지역과 시간대에 높은 값 설정
      let value = Math.random() * 30 + 10
      
      // 강남 - 출퇴근 시간 피크
      if (district === '강남' && (hourIndex === 8 || hourIndex === 18)) value *= 2.5
      
      // 홍대/신촌 - 저녁 시간 피크
      if ((district === '홍대' || district === '신촌') && hourIndex >= 19 && hourIndex <= 23) value *= 2.2
      
      // 명동 - 낮 시간 피크
      if (district === '명동' && hourIndex >= 10 && hourIndex <= 17) value *= 2.0
      
      // 여의도 - 평일 낮 시간
      if (district === '여의도' && hourIndex >= 9 && hourIndex <= 18) value *= 1.8
      
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

// 지하철역별 유동인구 데이터
export const stationPopulationData = [
  { name: '강남역', value: 520000, line: '2호선', rank: 1 },
  { name: '잠실역', value: 480000, line: '2호선', rank: 2 },
  { name: '홍대입구역', value: 460000, line: '2호선', rank: 3 },
  { name: '신림역', value: 440000, line: '2호선', rank: 4 },
  { name: '구로디지털단지역', value: 420000, line: '2호선', rank: 5 },
  { name: '역삼역', value: 400000, line: '2호선', rank: 6 },
  { name: '신촌역', value: 380000, line: '2호선', rank: 7 },
  { name: '을지로입구역', value: 360000, line: '2호선', rank: 8 },
  { name: '건대입구역', value: 340000, line: '2호선', rank: 9 },
  { name: '성수역', value: 320000, line: '2호선', rank: 10 },
]

// 유동인구 이동 패턴 데이터
export const movementPatternData = [
  { from: '주거지역', to: '업무지역', value: 450000, time: '07-09시' },
  { from: '업무지역', to: '상업지역', value: 320000, time: '12-13시' },
  { from: '상업지역', to: '업무지역', value: 280000, time: '13-14시' },
  { from: '업무지역', to: '주거지역', value: 480000, time: '18-20시' },
  { from: '주거지역', to: '상업지역', value: 250000, time: '19-21시' },
  { from: '상업지역', to: '유흥지역', value: 180000, time: '21-23시' },
]

// 체류 시간 분포 데이터
export const dwellTimeDistribution = [
  { name: '10분 미만', value: 35, count: 700000 },
  { name: '10-30분', value: 28, count: 560000 },
  { name: '30분-1시간', value: 20, count: 400000 },
  { name: '1-2시간', value: 12, count: 240000 },
  { name: '2시간 이상', value: 5, count: 100000 },
]