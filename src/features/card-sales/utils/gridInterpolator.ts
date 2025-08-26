/**
 * Seoul Grid Interpolator
 * grid_0811.py의 SeoulCentroidInterpolator를 TypeScript로 완전 재현
 * 행정동 중심점 기반 격자 보간 시스템
 */

import * as turf from '@turf/turf'
import type { Feature, FeatureCollection, Polygon, Point } from 'geojson'
import { GaussianBlur } from './gaussianBlur'
import type {
  GridCell,
  DistributionMethod,
  WeightMatrix,
  GridData,
  InterpolatorConfig,
  DongBoundary,
  GridInterpolationResult,
  GridMetadata,
  HexagonLayerGridData
} from '../types/grid.types'

export class SeoulGridInterpolator {
  private config: Required<InterpolatorConfig>
  private gridCells: GridCell[] = []
  private gridCentroids: Map<number, [number, number]> = new Map()
  private weights: WeightMatrix = {}
  private gaussianBlur: GaussianBlur
  private nx: number = 80
  private ny: number = 80
  private dx: number = 0
  private dy: number = 0

  constructor(config: InterpolatorConfig = {}) {
    this.config = {
      gridSize: config.gridSize || 80,
      crsEqualArea: config.crsEqualArea || 'EPSG:5186',
      crsWGS84: config.crsWGS84 || 'EPSG:4326',
      distributionMethod: config.distributionMethod || 'gaussian',
      distributionRadius: config.distributionRadius || 1000.0,
      enableSmoothing: config.enableSmoothing ?? true,
      smoothingSigma: config.smoothingSigma || 500.0
    }
    
    this.gaussianBlur = new GaussianBlur()
    this.nx = this.ny = this.config.gridSize
  }

  /**
   * 격자 생성 및 필터링
   * grid_0811.py 라인 91-133
   */
  public createGridCells(seoulBoundary: FeatureCollection<Polygon>): GridCell[] {
    console.log('🗺️ 그리드 생성 중... (폴리곤 셀)')
    
    // 1. 서울 경계의 bounding box 계산
    const bbox = turf.bbox(seoulBoundary)
    const [minX, minY, maxX, maxY] = bbox
    
    // 2. 격자 크기 계산
    this.dx = (maxX - minX) / this.nx
    this.dy = (maxY - minY) / this.ny
    
    // 3. 격자 생성
    const cells: GridCell[] = []
    let gridId = 0
    
    for (let row = 0; row < this.ny; row++) {
      const y0 = minY + row * this.dy
      
      for (let col = 0; col < this.nx; col++) {
        const x0 = minX + col * this.dx
        
        // 격자 셀 폴리곤 생성
        const cellPolygon: Polygon = {
          type: 'Polygon',
          coordinates: [[
            [x0, y0],
            [x0 + this.dx, y0],
            [x0 + this.dx, y0 + this.dy],
            [x0, y0 + this.dy],
            [x0, y0]
          ]]
        }
        
        cells.push({
          grid_id: gridId,
          row: row,
          col: col,
          geometry: cellPolygon,
          center: [x0 + this.dx / 2, y0 + this.dy / 2]
        })
        
        gridId++
      }
    }
    
    console.log(`   📦 전체 셀 수: ${cells.length} (${this.nx} x ${this.ny})`)
    
    // 4. 서울 경계와 교차하는 셀만 필터링
    console.log('🔍 서울 내부와 교차하는 셀 필터링...')
    
    const filteredCells = cells.filter(cell => {
      const centerPoint = turf.point(cell.center)
      
      // 어떤 동 경계든 내부에 있으면 서울 내부로 판정
      return seoulBoundary.features.some(feature => {
        try {
          if (feature.geometry && feature.geometry.type === 'Polygon') {
            return turf.booleanPointInPolygon(centerPoint, feature.geometry)
          } else if (feature.geometry && feature.geometry.type === 'MultiPolygon') {
            // MultiPolygon인 경우 처리
            return feature.geometry.coordinates.some((polygon: any) => {
              const poly = turf.polygon(polygon)
              return turf.booleanPointInPolygon(centerPoint, poly)
            })
          }
          return false
        } catch (e) {
          // 교차 검사 실패 시 false
          return false
        }
      })
    })
    
    // 격자 ID 재할당
    filteredCells.forEach((cell, idx) => {
      cell.grid_id = idx
      this.gridCentroids.set(idx, cell.center)
    })
    
    this.gridCells = filteredCells
    console.log(`   ✅ 유지된 셀: ${this.gridCells.length} (서울 내부 교차)`)
    
    return this.gridCells
  }

  /**
   * 행정동 중심점 계산
   * grid_0811.py 라인 65-71
   */
  public calculateCentroids(dongBoundaries: DongBoundary[]): Map<string, [number, number]> {
    console.log('🎯 행정동 무게중심 계산 중...')
    
    const centroids = new Map<string, [number, number]>()
    
    dongBoundaries.forEach(dong => {
      const feature = turf.feature(dong.geometry)
      const centroid = turf.centroid(feature)
      centroids.set(dong.adm_cd, centroid.geometry.coordinates as [number, number])
    })
    
    console.log(`   ✅ 무게중심: ${centroids.size}개`)
    return centroids
  }

  /**
   * 거리 기반 가중치 계산
   * grid_0811.py 라인 138-194
   */
  public buildCentroidWeights(
    dongCentroids: Map<string, [number, number]>
  ): WeightMatrix {
    console.log(`🧮 무게중심 기반 거리 가중치 계산 중... (방식: ${this.config.distributionMethod})`)
    console.log(`   📏 분배 반경: ${this.config.distributionRadius}m`)
    
    const weights: WeightMatrix = {}
    
    // 각 행정동에 대해
    dongCentroids.forEach((dongPoint, admCd) => {
      const distances: number[] = []
      const gridIds: number[] = []
      
      // 각 격자 셀과의 거리 계산
      this.gridCells.forEach(cell => {
        const distance = turf.distance(
          turf.point(dongPoint),
          turf.point(cell.center),
          { units: 'meters' }
        )
        
        // 분배 반경 내의 셀만 고려
        if (distance <= this.config.distributionRadius) {
          distances.push(distance)
          gridIds.push(cell.grid_id)
        }
      })
      
      // 반경 내에 셀이 없으면 가장 가까운 셀 1개 선택
      if (distances.length === 0) {
        let minDist = Infinity
        let nearestGridId = -1
        
        this.gridCells.forEach(cell => {
          const distance = turf.distance(
            turf.point(dongPoint),
            turf.point(cell.center),
            { units: 'meters' }
          )
          
          if (distance < minDist) {
            minDist = distance
            nearestGridId = cell.grid_id
          }
        })
        
        if (nearestGridId !== -1) {
          distances.push(minDist)
          gridIds.push(nearestGridId)
        }
      }
      
      // 거리 기반 가중치 계산
      const cellWeights = this.calculateWeights(distances)
      
      // 정규화 (합이 1이 되도록)
      const totalWeight = cellWeights.reduce((sum, w) => sum + w, 0)
      const normalizedWeights = totalWeight > 0
        ? cellWeights.map(w => w / totalWeight)
        : cellWeights
      
      // 저장
      weights[admCd] = {}
      gridIds.forEach((gridId, idx) => {
        weights[admCd][gridId] = normalizedWeights[idx]
      })
    })
    
    this.weights = weights
    
    // 검증 출력
    const avgCellsPerDong = Object.values(weights)
      .reduce((sum, w) => sum + Object.keys(w).length, 0) / Object.keys(weights).length
    console.log(`   ✅ 동당 평균 영향받는 셀 수: ${avgCellsPerDong.toFixed(1)}개`)
    
    return weights
  }

  /**
   * 거리 배열을 가중치 배열로 변환
   * grid_0811.py 라인 195-217
   */
  private calculateWeights(distances: number[]): number[] {
    if (distances.length === 0) return []
    
    switch (this.config.distributionMethod) {
      case 'gaussian': {
        // 가우시안 가중치: exp(-d²/2σ²)
        const sigma = this.config.distributionRadius / 3.0 // 3σ = radius
        return distances.map(d => Math.exp(-(d * d) / (2 * sigma * sigma)))
      }
      
      case 'inverse_distance': {
        // 역거리 가중치: 1/(1+d)
        return distances.map(d => 1.0 / (1.0 + d))
      }
      
      case 'nearest': {
        // 가장 가까운 셀에만 모든 가중치
        const weights = new Array(distances.length).fill(0)
        const minIdx = distances.indexOf(Math.min(...distances))
        weights[minIdx] = 1.0
        return weights
      }
      
      default:
        throw new Error(`Unknown distribution method: ${this.config.distributionMethod}`)
    }
  }

  /**
   * 데이터 분배
   * grid_0811.py 라인 221-258
   */
  public distributeData(
    dongData: Map<string, number>,
    timeKey: string = 'current'
  ): GridData {
    if (Object.keys(this.weights).length === 0) {
      throw new Error('가중치가 없습니다. buildCentroidWeights()를 먼저 실행하세요.')
    }
    
    console.log('📦 그리드 데이터 분배 중 (무게중심 기반)...')
    
    const gridData: GridData = {}
    gridData[timeKey] = {}
    
    // 모든 격자 셀을 0으로 초기화
    this.gridCells.forEach(cell => {
      gridData[timeKey][cell.grid_id.toString()] = 0
    })
    
    // 각 행정동의 데이터를 가중치에 따라 분배
    dongData.forEach((value, admCd) => {
      if (this.weights[admCd]) {
        Object.entries(this.weights[admCd]).forEach(([gridId, weight]) => {
          gridData[timeKey][gridId] = (gridData[timeKey][gridId] || 0) + value * weight
        })
      }
    })
    
    // 선택적 스무딩
    if (this.config.enableSmoothing && this.config.smoothingSigma > 0) {
      console.log(`🌫️ 추가 스무딩 적용 (σ≈${this.config.smoothingSigma}m)`)
      gridData[timeKey] = this.applySmoothing(gridData[timeKey])
    }
    
    // 검증: 총합 보존 여부
    const totalOriginal = Array.from(dongData.values()).reduce((sum, v) => sum + v, 0)
    const totalGrid = Object.values(gridData[timeKey]).reduce((sum, v) => sum + v, 0)
    console.log(`   🧾 검증[${timeKey}] 동합=${totalOriginal.toFixed(3)}, 그리드합=${totalGrid.toFixed(3)}, 차이=${(totalGrid - totalOriginal).toFixed(6)}`)
    
    return gridData
  }

  /**
   * Gaussian 스무딩 적용
   * grid_0811.py 라인 303-339
   */
  private applySmoothing(gridMap: { [gridId: string]: number }): { [gridId: string]: number } {
    // 미터 단위 시그마를 셀 단위로 변환
    const sigmaX = this.config.smoothingSigma / (this.dx * 111000 * Math.cos(37.5 * Math.PI / 180)) // 경도
    const sigmaY = this.config.smoothingSigma / (this.dy * 111000) // 위도
    
    // 격자 정보 준비
    const gridInfo = this.gridCells.map(cell => ({
      row: cell.row,
      col: cell.col
    }))
    
    // Map으로 변환
    const dataMap = new Map<number, number>()
    Object.entries(gridMap).forEach(([gridId, value]) => {
      dataMap.set(parseInt(gridId), value)
    })
    
    // 스무딩 적용
    const smoothedMap = this.gaussianBlur.smoothGridData(
      dataMap,
      gridInfo,
      { rows: this.ny, cols: this.nx },
      Math.max(sigmaX, sigmaY)
    )
    
    // 다시 객체로 변환
    const result: { [gridId: string]: number } = {}
    smoothedMap.forEach((value, gridId) => {
      result[gridId.toString()] = value
    })
    
    return result
  }

  /**
   * HexagonLayer용 데이터 변환
   */
  public toHexagonLayerData(gridData: GridData, timeKey: string = 'current'): HexagonLayerGridData[] {
    const data = gridData[timeKey] || {}
    
    return this.gridCells
      .filter(cell => data[cell.grid_id.toString()] > 0)
      .map(cell => ({
        coordinates: cell.center,
        weight: data[cell.grid_id.toString()] || 0,
        gridId: cell.grid_id,
        row: cell.row,
        col: cell.col
      }))
  }

  /**
   * 메타데이터 생성
   * grid_0811.py 라인 370-388
   */
  public generateMetadata(gridData: GridData): GridMetadata {
    const bounds = this.gridCells.reduce((acc, cell) => {
      const [x, y] = cell.center
      return {
        minX: Math.min(acc.minX, x),
        minY: Math.min(acc.minY, y),
        maxX: Math.max(acc.maxX, x),
        maxY: Math.max(acc.maxY, y)
      }
    }, { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity })
    
    return {
      gridSize: this.config.gridSize,
      crsProcessing: this.config.crsEqualArea,
      crsOutput: this.config.crsWGS84,
      nCells: this.gridCells.length,
      timePeriods: Object.keys(gridData),
      distribution: {
        method: this.config.distributionMethod,
        radiusM: this.config.distributionRadius
      },
      smoothing: {
        enabled: this.config.enableSmoothing,
        sigmaM: this.config.smoothingSigma
      },
      bounds,
      description: '서울 카드매출 그리드(무게중심 기반 거리 가중 분배)',
      timestamp: new Date().toISOString()
    }
  }

  /**
   * 전체 처리 파이프라인
   */
  public async processData(
    dongData: Map<string, number>,
    dongBoundaries: DongBoundary[],
    seoulBoundary: FeatureCollection<Polygon>,
    timeKey: string = 'current'
  ): Promise<GridInterpolationResult> {
    // 1. 격자 생성
    this.createGridCells(seoulBoundary)
    
    // 2. 행정동 중심점 계산
    const centroids = this.calculateCentroids(dongBoundaries)
    
    // 3. 가중치 계산
    this.buildCentroidWeights(centroids)
    
    // 4. 데이터 분배
    const gridData = this.distributeData(dongData, timeKey)
    
    // 5. 메타데이터 생성
    const metadata = this.generateMetadata(gridData)
    
    return {
      gridCells: this.gridCells,
      gridData,
      weights: this.weights,
      metadata
    }
  }

  // Getter methods
  public getGridCells(): GridCell[] { return this.gridCells }
  public getWeights(): WeightMatrix { return this.weights }
  public getConfig(): Required<InterpolatorConfig> { return this.config }
}