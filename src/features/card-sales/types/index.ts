/**
 * 기후-카드매출 데이터 타입 정의
 */

// 기온 그룹 타입
export type TemperatureGroup = '한파' | '일반' | '온화' | '폭염'

// HexagonLayer용 데이터 포맷
export interface ClimateCardSalesData {
  // 필수 - HexagonLayer 요구사항
  coordinates: [number, number] // [경도, 위도]
  weight: number // 가중치 (매출액)
  
  // 기후 데이터
  temperature: number // 일평균기온
  temperatureMax: number // 일최고기온
  temperatureMin: number // 일최저기온
  humidity: number // 일평균습도
  humidityMax: number // 일최고습도
  humidityMin: number // 일최저습도
  discomfortIndex: number // 일평균불쾌지수
  discomfortIndexMax: number // 일최고불쾌지수
  discomfortIndexMin: number // 일최저불쾌지수
  precipitation: number // 일총강수량
  temperatureGroup: TemperatureGroup // 기온그룹
  
  // 기후 경보
  heatWarning: 0 | 1 // 폭염주의보
  heatAlert: 0 | 1 // 폭염경보
  rainWarning: 0 | 1 // 호우주의보
  rainAlert: 0 | 1 // 호우경보
  
  // 생활인구 데이터
  population: number // 일일_총생활인구수
  populationByHour: number[] // 0시~23시 시간대별 인구
  
  // 매출 데이터
  totalSales: number // 총매출액
  totalTransactions: number // 총매출건수
  salesByCategory?: Record<string, number> // 업종별 매출액
  
  // 메타 정보
  date: string // 기준일자
  dongName: string // 행정동명
  dongCode: number // 행정동코드
  guName: string // 자치구명
  guCode: string // 자치구코드
}

// 원본 JSON 데이터 타입
export interface RawClimateCardSalesData {
  기준일자: string
  행정동: string
  행정동코드: number
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
  일일_총생활인구수: number
  [key: string]: any // 시간대별 인구, 성별/연령대별 인구, 업종별 매출 등
  자치구: string
  자치구코드: string
  총매출액: number
  총매출건수: number
  폭염주의보: number
  폭염경보: number
  호우주의보: number
  호우경보: number
  기온그룹: TemperatureGroup
}

// 필터링 옵션
export interface ClimateFilterOptions {
  date?: string // 특정 날짜
  dateRange?: { start: string; end: string } // 날짜 범위
  hour?: number // 특정 시간대 (0-23)
  temperatureRange?: { min: number; max: number } // 기온 범위
  humidityRange?: { min: number; max: number } // 습도 범위
  discomfortIndexRange?: { min: number; max: number } // 불쾌지수 범위
  temperatureGroups?: TemperatureGroup[] // 기온그룹 필터
  guNames?: string[] // 특정 구 필터
  dongNames?: string[] // 특정 동 필터
  hasHeatWarning?: boolean // 폭염주의보 있는 데이터만
  hasRainWarning?: boolean // 호우주의보 있는 데이터만
}

// 색상 모드
export type ColorMode = 'temperature' | 'temperatureGroup' | 'discomfort' | 'alert' | 'sales' | 'humidity'

// 집계 데이터
export interface AggregatedData {
  totalSales: number
  averageTemperature: number
  averageHumidity: number
  averageDiscomfortIndex: number
  totalPopulation: number
  dataPoints: number
}