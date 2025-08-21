/**
 * 기후-카드매출 데이터 로더
 * 25개 구 JSON 데이터를 로드하고 좌표와 매칭
 */

import { CoordinateMapper } from './coordinateMapper'
import type { 
  ClimateCardSalesData, 
  RawClimateCardSalesData, 
  ClimateFilterOptions 
} from '../types'

// 서울시 25개 구 목록
const SEOUL_DISTRICTS = [
  '강남구', '강동구', '강북구', '강서구', '관악구',
  '광진구', '구로구', '금천구', '노원구', '도봉구',
  '동대문구', '동작구', '마포구', '서대문구', '서초구',
  '성동구', '성북구', '송파구', '양천구', '영등포구',
  '용산구', '은평구', '종로구', '중구', '중랑구'
]

export class ClimateDataLoader {
  private static instance: ClimateDataLoader
  private coordinateMapper: CoordinateMapper
  private cachedData: Map<string, ClimateCardSalesData[]> = new Map()

  private constructor() {
    this.coordinateMapper = CoordinateMapper.getInstance()
  }

  static getInstance(): ClimateDataLoader {
    if (!ClimateDataLoader.instance) {
      ClimateDataLoader.instance = new ClimateDataLoader()
    }
    return ClimateDataLoader.instance
  }

  /**
   * 모든 구의 데이터를 로드하고 좌표 매칭
   */
  async loadAllData(options?: ClimateFilterOptions): Promise<ClimateCardSalesData[]> {
    // 좌표 데이터 먼저 로드
    if (!this.coordinateMapper.loaded) {
      await this.coordinateMapper.loadCoordinates()
    }

    const allData: ClimateCardSalesData[] = []
    
    // 모든 구 데이터 병렬 로드
    const promises = SEOUL_DISTRICTS.map(district => 
      this.loadDistrictData(district, options)
    )
    
    const results = await Promise.all(promises)
    results.forEach(data => allData.push(...data))
    
    console.log(`[ClimateDataLoader] 총 ${allData.length}개 데이터 포인트 로드 완료`)
    
    return allData
  }

  /**
   * 특정 구의 데이터 로드
   */
  async loadDistrictData(
    districtName: string, 
    options?: ClimateFilterOptions
  ): Promise<ClimateCardSalesData[]> {
    try {
      const response = await fetch(`/data/output_json/${districtName}.json`)
      const rawData: RawClimateCardSalesData[] = await response.json()
      
      // 좌표 매칭 및 변환
      const transformedData = rawData
        .map(item => this.transformData(item))
        .filter((item): item is ClimateCardSalesData => item !== null)
      
      // 필터링 적용
      if (options) {
        return this.filterData(transformedData, options)
      }
      
      return transformedData
      
    } catch (error) {
      console.error(`[ClimateDataLoader] ${districtName} 데이터 로드 실패:`, error)
      return []
    }
  }

  /**
   * 원본 데이터를 HexagonLayer 형식으로 변환
   */
  private transformData(raw: RawClimateCardSalesData): ClimateCardSalesData | null {
    // 좌표 매칭
    const coordinate = this.coordinateMapper.getCoordinate(raw.행정동)
    
    if (!coordinate) {
      console.warn(`[ClimateDataLoader] ${raw.행정동}의 좌표를 찾을 수 없습니다`)
      return null
    }

    // 시간대별 인구 추출
    const populationByHour: number[] = []
    for (let hour = 0; hour < 24; hour++) {
      const key = `${hour}시_총생활인구수`
      populationByHour.push(raw[key] || 0)
    }

    // 업종별 매출 추출
    const salesByCategory: Record<string, number> = {}
    Object.keys(raw).forEach(key => {
      if (key.includes('_총매출액') && key !== '총매출액') {
        const category = key.replace('_총매출액', '')
        salesByCategory[category] = raw[key] || 0
      }
    })

    return {
      // HexagonLayer 필수
      coordinates: [coordinate.x, coordinate.y],
      weight: raw.총매출액,
      
      // 기후 데이터
      temperature: raw.일평균기온,
      temperatureMax: raw.일최고기온,
      temperatureMin: raw.일최저기온,
      humidity: raw.일평균습도,
      humidityMax: raw.일최고습도,
      humidityMin: raw.일최저습도,
      discomfortIndex: raw.일평균불쾌지수,
      discomfortIndexMax: raw.일최고불쾌지수,
      discomfortIndexMin: raw.일최저불쾌지수,
      precipitation: raw.일총강수량,
      temperatureGroup: raw.기온그룹,
      
      // 기후 경보
      heatWarning: raw.폭염주의보 as 0 | 1,
      heatAlert: raw.폭염경보 as 0 | 1,
      rainWarning: raw.호우주의보 as 0 | 1,
      rainAlert: raw.호우경보 as 0 | 1,
      
      // 생활인구
      population: raw.일일_총생활인구수,
      populationByHour,
      
      // 매출
      totalSales: raw.총매출액,
      totalTransactions: raw.총매출건수,
      salesByCategory,
      
      // 메타 정보
      date: raw.기준일자,
      dongName: raw.행정동,
      dongCode: raw.행정동코드,
      guName: raw.자치구,
      guCode: raw.자치구코드,
    }
  }

  /**
   * 데이터 필터링
   */
  private filterData(
    data: ClimateCardSalesData[], 
    options: ClimateFilterOptions
  ): ClimateCardSalesData[] {
    let filtered = [...data]
    
    // 날짜 필터
    if (options.date) {
      filtered = filtered.filter(item => item.date === options.date)
    }
    
    // 날짜 범위 필터
    if (options.dateRange) {
      filtered = filtered.filter(item => 
        item.date >= options.dateRange!.start && 
        item.date <= options.dateRange!.end
      )
    }
    
    // 기온 범위 필터
    if (options.temperatureRange) {
      filtered = filtered.filter(item =>
        item.temperature >= options.temperatureRange!.min &&
        item.temperature <= options.temperatureRange!.max
      )
    }
    
    // 습도 범위 필터
    if (options.humidityRange) {
      filtered = filtered.filter(item =>
        item.humidity >= options.humidityRange!.min &&
        item.humidity <= options.humidityRange!.max
      )
    }
    
    // 불쾌지수 범위 필터
    if (options.discomfortIndexRange) {
      filtered = filtered.filter(item =>
        item.discomfortIndex >= options.discomfortIndexRange!.min &&
        item.discomfortIndex <= options.discomfortIndexRange!.max
      )
    }
    
    // 기온그룹 필터
    if (options.temperatureGroups && options.temperatureGroups.length > 0) {
      filtered = filtered.filter(item =>
        options.temperatureGroups!.includes(item.temperatureGroup)
      )
    }
    
    // 구 필터
    if (options.guNames && options.guNames.length > 0) {
      filtered = filtered.filter(item =>
        options.guNames!.includes(item.guName)
      )
    }
    
    // 동 필터
    if (options.dongNames && options.dongNames.length > 0) {
      filtered = filtered.filter(item =>
        options.dongNames!.includes(item.dongName)
      )
    }
    
    // 폭염주의보 필터
    if (options.hasHeatWarning === true) {
      filtered = filtered.filter(item => item.heatWarning === 1)
    }
    
    // 호우주의보 필터
    if (options.hasRainWarning === true) {
      filtered = filtered.filter(item => item.rainWarning === 1)
    }
    
    return filtered
  }

  /**
   * 시간대별 데이터 추출 (특정 시간의 생활인구로 weight 조정)
   */
  getHourlyData(data: ClimateCardSalesData[], hour: number): ClimateCardSalesData[] {
    return data.map(item => ({
      ...item,
      weight: item.populationByHour[hour] || item.weight, // 시간대별 인구를 weight로 사용
      population: item.populationByHour[hour] || item.population
    }))
  }

  /**
   * 캐시 클리어
   */
  clearCache(): void {
    this.cachedData.clear()
  }
}

// 싱글톤 인스턴스 export
export const climateDataLoader = ClimateDataLoader.getInstance()