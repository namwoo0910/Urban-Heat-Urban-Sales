/**
 * 월별 데이터 파일에서 사용 가능한 날짜 목록을 추출하는 유틸리티
 */

export interface AvailableDates {
  [yearMonth: string]: string[] // e.g., "2024-01": ["2024-01-01", "2024-01-02", ...]
}

class DateExtractor {
  private static instance: DateExtractor
  private availableDates: AvailableDates = {}
  private isLoaded: boolean = false
  private loadingPromise: Promise<void> | null = null

  private constructor() {}

  static getInstance(): DateExtractor {
    if (!DateExtractor.instance) {
      DateExtractor.instance = new DateExtractor()
    }
    return DateExtractor.instance
  }

  /**
   * 모든 월별 데이터 파일에서 사용 가능한 날짜 목록을 로드
   */
  async loadAvailableDates(): Promise<AvailableDates> {
    // 이미 로딩 중이면 기다림
    if (this.loadingPromise) {
      await this.loadingPromise
      return this.availableDates
    }

    // 이미 로드됨
    if (this.isLoaded) {
      return this.availableDates
    }

    this.loadingPromise = this.doLoad()
    await this.loadingPromise
    this.loadingPromise = null
    
    return this.availableDates
  }

  private async doLoad(): Promise<void> {
    try {
      // 2024년 1월부터 12월까지 모든 월 체크
      const months = [
        '2024-01', '2024-02', '2024-03', '2024-04',
        '2024-05', '2024-06', '2024-07', '2024-08',
        '2024-09', '2024-10', '2024-11', '2024-12'
      ]

      for (const yearMonth of months) {
        try {
          const response = await fetch(`/data/local_economy/monthly/${yearMonth}.json`)
          
          if (response.ok) {
            const data = await response.json()
            
            // 해당 월의 모든 고유 날짜 추출
            const uniqueDates = new Set<string>()
            data.forEach((item: any) => {
              if (item.기준일자) {
                uniqueDates.add(item.기준일자)
              }
            })
            
            // 날짜 정렬
            const sortedDates = Array.from(uniqueDates).sort()
            this.availableDates[yearMonth] = sortedDates
            
            console.log(`[DateExtractor] ${yearMonth}: ${sortedDates.length}개 날짜 발견`)
          }
        } catch (error) {
          console.warn(`[DateExtractor] ${yearMonth} 데이터 로드 실패:`, error)
        }
      }
      
      this.isLoaded = true
      console.log('[DateExtractor] 전체 날짜 로드 완료:', this.availableDates)
      
    } catch (error) {
      console.error('[DateExtractor] 날짜 추출 실패:', error)
      this.isLoaded = false
    }
  }

  /**
   * 특정 월의 사용 가능한 날짜 목록 반환
   */
  getDatesForMonth(yearMonth: string): string[] {
    return this.availableDates[yearMonth] || []
  }

  /**
   * 모든 사용 가능한 날짜 목록 반환 (평면 배열)
   */
  getAllDates(): string[] {
    const allDates: string[] = []
    Object.values(this.availableDates).forEach(dates => {
      allDates.push(...dates)
    })
    return allDates.sort()
  }

  /**
   * 사용 가능한 년월 목록 반환
   */
  getAvailableMonths(): string[] {
    return Object.keys(this.availableDates).sort()
  }

  /**
   * 캐시 클리어
   */
  clearCache(): void {
    this.availableDates = {}
    this.isLoaded = false
    this.loadingPromise = null
  }
}

// 싱글톤 인스턴스 export
export const dateExtractor = DateExtractor.getInstance()