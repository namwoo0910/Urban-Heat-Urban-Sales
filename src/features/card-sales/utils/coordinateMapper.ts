/**
 * 서울시 행정동 좌표 매핑 유틸리티
 * CSV 파일에서 행정동별 중심점 좌표를 로드하고 관리
 */

interface DongCoordinate {
  code: string
  name: string
  x: number // 경도
  y: number // 위도
}

export class CoordinateMapper {
  private static instance: CoordinateMapper
  private coordinateMap: Map<string, { x: number; y: number }> = new Map()
  private isLoaded = false

  private constructor() {}

  static getInstance(): CoordinateMapper {
    if (!CoordinateMapper.instance) {
      CoordinateMapper.instance = new CoordinateMapper()
    }
    return CoordinateMapper.instance
  }

  /**
   * CSV 파일에서 좌표 데이터 로드
   */
  async loadCoordinates(): Promise<void> {
    if (this.isLoaded) return

    try {
      const response = await fetch('/data/output_json/서울시_행정동_위경도좌표.csv')
      const text = await response.text()
      
      // CSV 파싱
      const lines = text.split('\n')
      const headers = lines[0].split(',')
      
      // BOM 제거
      if (headers[0].charCodeAt(0) === 0xFEFF) {
        headers[0] = headers[0].substring(1)
      }
      
      // 헤더 인덱스 찾기
      const nameIdx = headers.findIndex(h => h.includes('ADM_DR_NM'))
      const xIdx = headers.findIndex(h => h.includes('D_x'))
      const yIdx = headers.findIndex(h => h.includes('D_y'))
      
      // 데이터 파싱
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue
        
        const values = line.split(',')
        const dongName = values[nameIdx]
        const x = parseFloat(values[xIdx])
        const y = parseFloat(values[yIdx])
        
        if (dongName && !isNaN(x) && !isNaN(y)) {
          this.coordinateMap.set(dongName, { x, y })
        }
      }
      
      this.isLoaded = true
      console.log(`[CoordinateMapper] ${this.coordinateMap.size}개 행정동 좌표 로드 완료`)
      
    } catch (error) {
      console.error('[CoordinateMapper] 좌표 데이터 로드 실패:', error)
      throw error
    }
  }

  /**
   * 행정동명으로 좌표 조회
   */
  getCoordinate(dongName: string): { x: number; y: number } | null {
    return this.coordinateMap.get(dongName) || null
  }

  /**
   * 모든 좌표 데이터 반환
   */
  getAllCoordinates(): Map<string, { x: number; y: number }> {
    return new Map(this.coordinateMap)
  }

  /**
   * 로드 상태 확인
   */
  get loaded(): boolean {
    return this.isLoaded
  }

  /**
   * 좌표 데이터 크기
   */
  get size(): number {
    return this.coordinateMap.size
  }
}