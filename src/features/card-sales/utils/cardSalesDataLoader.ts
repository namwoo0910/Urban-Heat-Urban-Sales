/**
 * 카드매출 데이터 로더
 * 서울시 구/동별 카드 매출 데이터를 로드하고 좌표와 매칭
 */

import { CoordinateMapper } from './coordinateMapper'
import { calculateTotalSales } from './salesCalculator'
import type { 
  ClimateCardSalesData, 
  RawClimateCardSalesData, 
  ClimateFilterOptions 
} from '../types'

export class CardSalesDataLoader {
  private static instance: CardSalesDataLoader
  private coordinateMapper: CoordinateMapper
    private consolidatedData: RawClimateCardSalesData[] | null = null
  private monthlyDataCache: Map<string, RawClimateCardSalesData[]> = new Map() // 월별 데이터 캐시
  private currentMonth: string | null = null // 현재 로드된 월

  private constructor() {
    this.coordinateMapper = CoordinateMapper.getInstance()
  }

  static getInstance(): CardSalesDataLoader {
    if (!CardSalesDataLoader.instance) {
      CardSalesDataLoader.instance = new CardSalesDataLoader()
    }
    return CardSalesDataLoader.instance
  }

  /**
   * 월별 통합 데이터 로드 (개선된 캐싱)
   */
  private async loadMonthlyData(yearMonth: string): Promise<RawClimateCardSalesData[]> {
    // 이미 캐시된 월 데이터가 있으면 재사용
    if (this.monthlyDataCache.has(yearMonth)) {
            this.currentMonth = yearMonth
      this.consolidatedData = this.monthlyDataCache.get(yearMonth)!
      return this.consolidatedData
    }

    try {
            
      // 월별 데이터 파일 로드 (예: 2024-01.json)
      const response = await fetch(`/data/local_economy/monthly/${yearMonth}.json`)
      
      if (!response.ok) {
        // 월별 파일이 없으면 기존 통합 파일 시도
                const fallbackResponse = await fetch('/data/local_economy/seoul_all_districts.json')
        
        if (!fallbackResponse.ok) {
          throw new Error('데이터 파일을 찾을 수 없습니다')
        }
        
        const allData = await fallbackResponse.json()
        // 해당 월 데이터만 필터링
        this.consolidatedData = allData.filter((item: any) => 
          item.기준일자?.startsWith(yearMonth)
        )
      } else {
        this.consolidatedData = await response.json()
      }
      
      // 캐시에 저장 (메모리 관리를 위해 최대 3개월까지만 캐시)
      if (this.monthlyDataCache.size >= 3) {
        // 가장 오래된 캐시 삭제
        const firstKey = this.monthlyDataCache.keys().next().value
        if (firstKey) {
          this.monthlyDataCache.delete(firstKey)
        }
              }
      
      if (this.consolidatedData) {
        this.monthlyDataCache.set(yearMonth, this.consolidatedData)
      }
      this.currentMonth = yearMonth
      
            return this.consolidatedData || []
      
    } catch (error) {
      console.error(`[CardSalesDataLoader] 데이터 로드 실패:`, error)
      return []
    }
  }

  /**
   * 모든 구의 데이터를 로드하고 좌표 매칭 (개선된 버전)
   */
  async loadAllData(options?: ClimateFilterOptions): Promise<ClimateCardSalesData[]> {
    // 좌표 데이터 먼저 로드
    if (!this.coordinateMapper.loaded) {
      await this.coordinateMapper.loadCoordinates()
    }

    // 날짜에서 년월 추출 (기본값: 2024-01)
    const date = options?.date || '2024-01-01'
    const yearMonth = date.substring(0, 7)
    
        
    // 월별 통합 데이터 로드
    const monthlyData = await this.loadMonthlyData(yearMonth)
    
    // 데이터 변환 및 좌표 매칭
    const allData: ClimateCardSalesData[] = []
    
    for (const rawItem of monthlyData) {
      const transformedItem = this.transformData(rawItem, rawItem.자치구)
      if (transformedItem) {
        allData.push(transformedItem)
      }
    }
    
        
    // 특정 날짜로 필터링 (options에 date가 있는 경우)
    if (options) {
      const filteredData = this.filterData(allData, options)
            return filteredData
    }
    
    return allData
  }

  /**
   * 특정 구의 데이터 로드 (새로운 통합 데이터에서 필터링)
   */
  async loadDistrictData(
    districtName: string, 
    options?: ClimateFilterOptions
  ): Promise<ClimateCardSalesData[]> {
    try {
      // 통합 데이터가 없으면 먼저 로드
      if (!this.consolidatedData) {
        const date = options?.date || '2024-01-01'
        const yearMonth = date.substring(0, 7)
        await this.loadMonthlyData(yearMonth)
      }
      
      // 해당 구의 데이터만 필터링
      const districtData = this.consolidatedData?.filter(
        item => item.자치구 === districtName
      ) || []
      
      // 좌표 매칭 및 변환
      const transformedData = districtData
        .map(item => this.transformData(item, districtName))
        .filter((item): item is ClimateCardSalesData => item !== null)
      
      const skippedCount = districtData.length - transformedData.length
      if (skippedCount > 0) {
              }
      
      // 필터링 적용
      if (options) {
        return this.filterData(transformedData, options)
      }
      
      return transformedData
      
    } catch (error) {
      console.error(`[CardSalesDataLoader] ${districtName} 데이터 로드 실패:`, error)
      return []
    }
  }

  /**
   * 원본 데이터를 카드 매출 데이터 형식으로 변환
   */
  private transformData(raw: RawClimateCardSalesData, districtName?: string): ClimateCardSalesData | null {
    // 좌표 매칭 - 구 정보를 활용한 우선순위 처리
    let coordinate = this.coordinateMapper.getCoordinate(raw.행정동)
    
    // 괄호가 포함된 경우 먼저 시도 (예: "신사동(강남)")
    if (!coordinate && raw.행정동.includes('(')) {
      // 괄호 제거하고 다시 시도
      const nameWithoutParens = raw.행정동.split('(')[0].trim()
      coordinate = this.coordinateMapper.getCoordinate(nameWithoutParens)
      
      // 여러 개가 있을 수 있으므로 구 정보로 검증이 필요
      // 하지만 현재 CSV에는 구 정보가 없으므로 일단 찾은 것 사용
    }
    
    if (!coordinate) {
      // 정말 못 찾은 경우만 에러 로그
      console.error(`[CardSalesDataLoader] ⚠️ ${districtName} ${raw.행정동}의 좌표를 찾을 수 없습니다.`)
      return null
    }

    // 업종별 매출 추출 (새로운 구조 지원)
    const salesByCategory: Record<string, number> = {}
    
    // 새로운 구조: 총매출액_업종에서 추출
    if (raw.총매출액_업종) {
      Object.entries(raw.총매출액_업종).forEach(([category, amount]) => {
        if (amount && amount > 0) {
          salesByCategory[category] = amount
        }
      })
    }
    
    // 이전 구조 호환성 유지 (fallback)
    if (!raw.총매출액_업종) {
      Object.keys(raw).forEach(key => {
        if (key.includes('_총매출액') && key !== '총매출액') {
          const category = key.replace('_총매출액', '')
          salesByCategory[category] = raw[key] || 0
        }
      })
    }

    // 총 매출액 계산 - 통합 함수 사용
    const totalSales = raw.총매출액 || calculateTotalSales(salesByCategory)

    return {
      // 좌표 및 가중치
      coordinates: [coordinate.x, coordinate.y],
      weight: totalSales,
      
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
      
      // 기후 경보 (옵셔널 필드 처리)
      heatWarning: (raw.폭염주의보 || 0) as 0 | 1,
      heatAlert: (raw.폭염경보 || 0) as 0 | 1,
      rainWarning: (raw.호우주의보 || 0) as 0 | 1,
      rainAlert: (raw.호우경보 || 0) as 0 | 1,

      // 매출
      totalSales: totalSales,
      totalTransactions: raw.총매출건수 || 0,
      salesByCategory,
      
      // 메타 정보 - 이제 JSON에 포함된 코드 사용
      date: raw.기준일자,
      dongName: raw.행정동,
      dongCode: raw.행정동코드 || 0,
      guName: raw.자치구 || districtName || '',
      guCode: String(raw.자치구코드 || ''),
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
    
    // 날짜 필터 - "전체" 또는 빈 값인 경우 필터링하지 않음
    if (options.date && options.date !== '전체' && options.date !== '') {
      filtered = filtered.filter(item => item.date === options.date)
          } else {
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
   * 캐시 클리어
   */
  clearCache(): void {
    this.consolidatedData = null
    this.monthlyDataCache.clear()
    this.currentMonth = null
  }
  
  /**
   * 현재 로드된 월 반환
   */
  getCurrentMonth(): string | null {
    return this.currentMonth
  }
}

// 싱글톤 인스턴스 export
export const cardSalesDataLoader = CardSalesDataLoader.getInstance()