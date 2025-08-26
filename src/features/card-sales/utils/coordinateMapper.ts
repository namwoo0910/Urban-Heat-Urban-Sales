/**
 * 서울시 행정동 좌표 매핑 유틸리티
 * GeoJSON 파일에서 행정동별 중심점 좌표를 계산하고 관리
 */

import * as turf from '@turf/turf'
import type { Feature, FeatureCollection, Polygon, MultiPolygon } from 'geojson'

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
   * GeoJSON 파일에서 좌표 데이터 로드 및 중심점 계산
   */
  async loadCoordinates(): Promise<void> {
    if (this.isLoaded) return

    try {
      const response = await fetch('/data/local_economy/local_economy_dong.geojson')
      
      if (!response.ok) {
        throw new Error(`Failed to load dong boundaries: ${response.status} ${response.statusText}`)
      }
      
      const geoJsonData: FeatureCollection<Polygon | MultiPolygon> = await response.json()
      
      // 각 feature에서 중심점 계산
      geoJsonData.features.forEach(feature => {
        try {
          // 행정동 이름 추출
          const dongName = feature.properties?.행정동 || feature.properties?.ADM_NM
          const districtName = feature.properties?.자치구 || feature.properties?.SIGUNGU_NM
          
          if (!dongName) {
            console.warn('[CoordinateMapper] 행정동 이름이 없는 feature:', feature.properties)
            return
          }
          
          // 중심점 계산 (Turf.js 사용)
          const centroid = turf.centroid(feature)
          const [x, y] = centroid.geometry.coordinates
          
          // 기본 이름으로 저장
          this.coordinateMap.set(dongName, { x, y })
          
          // 구 이름이 있는 경우 "동이름(구이름)" 형태로도 저장
          if (districtName) {
            this.coordinateMap.set(`${dongName}(${districtName})`, { x, y })
          }
          
          // 가운뎃점(·)이 포함된 경우, 일반 점(.)으로도 매핑 추가
          if (dongName.includes('·')) {
            const normalizedName = dongName.replace(/·/g, '.')
            this.coordinateMap.set(normalizedName, { x, y })
            if (districtName) {
              this.coordinateMap.set(`${normalizedName}(${districtName})`, { x, y })
            }
          }
          
          // 숫자로 끝나는 동의 경우 띄어쓰기 없는 버전도 추가
          // 예: "수유1동" -> "수유1동", "수유 1동" 모두 매핑
          const match = dongName.match(/^(.+?)(\d+동)$/)
          if (match) {
            const [, baseName, numberPart] = match
            const alternativeName = `${baseName} ${numberPart}`
            this.coordinateMap.set(alternativeName, { x, y })
            if (districtName) {
              this.coordinateMap.set(`${alternativeName}(${districtName})`, { x, y })
            }
          }
          
        } catch (error) {
          console.error(`[CoordinateMapper] ${feature.properties?.행정동} 중심점 계산 실패:`, error)
        }
      })
      
      this.isLoaded = true
      console.log(`[CoordinateMapper] ${this.coordinateMap.size}개 행정동 좌표 로드 완료`)
      
      // 디버깅용: 로드된 동 이름 샘플 출력
      const sampleNames = Array.from(this.coordinateMap.keys()).slice(0, 10)
      console.log('[CoordinateMapper] 로드된 동 이름 샘플:', sampleNames)
      
    } catch (error) {
      console.error('[CoordinateMapper] 좌표 데이터 로드 실패:', error)
      throw error
    }
  }

  /**
   * 행정동명으로 좌표 조회 - 괄호 처리 포함
   */
  getCoordinate(dongName: string): { x: number; y: number } | null {
    // 직접 조회
    let coord = this.coordinateMap.get(dongName)
    
    // 괄호가 포함된 경우 (예: "신사동(강남)") 괄호 제거하고 다시 시도
    if (!coord && dongName.includes('(')) {
      const nameWithoutParens = dongName.split('(')[0].trim()
      coord = this.coordinateMap.get(nameWithoutParens)
    }
    
    // 숫자로 끝나는 경우 띄어쓰기 추가/제거하여 재시도
    if (!coord) {
      // "수유1동" -> "수유 1동" 시도
      const withSpace = dongName.replace(/(\D)(\d+동)$/, '$1 $2')
      if (withSpace !== dongName) {
        coord = this.coordinateMap.get(withSpace)
      }
      
      // "수유 1동" -> "수유1동" 시도
      if (!coord) {
        const withoutSpace = dongName.replace(/(\D)\s+(\d+동)$/, '$1$2')
        if (withoutSpace !== dongName) {
          coord = this.coordinateMap.get(withoutSpace)
        }
      }
    }
    
    return coord || null
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