/**
 * Dong Boundary Gradient Interpolator
 * 행정동 중심부에서 경계까지 그라데이션 보간
 * 중심부: 원래 매출액 유지
 * 경계: 지정된 높이값(기본 100)으로 고정
 */

import * as turf from '@turf/turf'
import type { Feature, FeatureCollection, Polygon, Point } from 'geojson'
import type {
  GridCell,
  GridData,
  DongBoundary,
  HexagonLayerGridData
} from '../types/grid.types'

export interface DongBoundaryGradientConfig {
  gridSize?: number
  boundaryHeight?: number  // 경계에서의 높이값 (기본 100)
  interpolationType?: 'linear' | 'exponential' | 'logarithmic' | 'smooth'  // 보간 방식 (smooth 추가)
  enableSmoothing?: boolean  // 가우시안 스무싱 적용 여부
  smoothingSigma?: number    // 스무싱 시그마값 (미터 단위)
}

export class DongBoundaryGradientInterpolator {
  // Web Worker support
  private worker: Worker | null = null
  private workerPromise: Promise<any> | null = null
  private config: Required<DongBoundaryGradientConfig>
  private gridCells: GridCell[] = []
  private cachedBoundaryBBox: Map<string, [number, number, number, number]> = new Map()  // Cache for dong bboxes
  private cellDongMapping: Map<number, string[]> = new Map()  // Pre-computed cell-dong mapping
  private simplifiedGeometries: Map<string, any> = new Map()  // Simplified geometries for PIP test
  private nx: number = 80  // Optimized for performance
  private ny: number = 80  // Optimized for performance
  private dx: number = 0
  private dy: number = 0
  private skipBoundaryFilter: boolean = false  // Option to skip Seoul boundary filtering

  constructor(config: DongBoundaryGradientConfig = {}) {
    this.config = {
      gridSize: config.gridSize || 80,  // Optimized for performance (80x80 = 6,400 cells)
      boundaryHeight: config.boundaryHeight || 1000000,  // 1M scale
      interpolationType: config.interpolationType || 'smooth',  // Default to smooth interpolation
      enableSmoothing: config.enableSmoothing ?? false,  // Disabled by default for performance
      smoothingSigma: config.smoothingSigma || 800  // Smoothing sigma in meters
    }
    this.nx = this.ny = this.config.gridSize
    // ALWAYS skip boundary filter for memory optimization
    this.skipBoundaryFilter = true  // Force enabled for memory optimization
  }

  /**
   * Initialize Web Worker for background processing
   */
  public initWorker(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.worker = new Worker('/workers/gradientWorker.js')
        
        this.worker.onmessage = (e) => {
          if (e.data.type === 'READY') {
            console.log('🎯 [DongGradient] Web Worker initialized')
            resolve()
          }
        }
        
        this.worker.onerror = (error) => {
          console.error('❌ [DongGradient] Worker error:', error)
          reject(error)
        }
      } catch (error) {
        console.warn('⚠️ [DongGradient] Worker not available, falling back to main thread')
        resolve() // Continue without worker
      }
    })
  }
  
  /**
   * Process gradient using Web Worker with spatial indexing
   */
  public async processWithWorker(
    dongData: Map<string, number>,
    dongBoundaries: DongBoundary[],
    timeKey: string = 'current',
    onProgress?: (progress: number) => void
  ): Promise<GridData> {
    // Pre-compute spatial index if not already done
    if (this.cellDongMapping.size === 0) {
      this.computeSpatialIndex(dongBoundaries)
    }
    if (!this.worker) {
      console.log('⚠️ [DongGradient] No worker available, using main thread')
      return this.distributeWithGradient(dongData, dongBoundaries, timeKey)
    }
    
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not initialized'))
        return
      }
      
      const messageHandler = (e: MessageEvent) => {
        const { type, data } = e.data
        
        switch (type) {
          case 'PROGRESS':
            if (onProgress) {
              onProgress(data.progress)
            }
            console.log(`📊 [DongGradient] Progress: ${data.progress.toFixed(1)}% (${data.processedDongs}/${data.totalDongs})`)
            break
            
          case 'COMPLETE':
            console.log(`✅ [DongGradient] Worker completed in ${data.elapsedTime.toFixed(2)}ms`)
            if (this.worker) {
              this.worker.removeEventListener('message', messageHandler)
            }
            resolve(data.gridData)
            break
            
          case 'ERROR':
            console.error('❌ [DongGradient] Worker error:', data.error)
            if (this.worker) {
              this.worker.removeEventListener('message', messageHandler)
            }
            reject(new Error(data.error))
            break
        }
      }
      
      this.worker.addEventListener('message', messageHandler)
      
      // Only send boundaries that have actual data
      const activeDongCodes = Array.from(dongData.keys())
      const activeBoundaries = dongBoundaries.filter(b => activeDongCodes.includes(b.adm_cd))
      
      // Create ultra-simplified boundaries for PIP testing
      const simplifiedBoundaries = activeBoundaries.map(boundary => {
        if (!this.simplifiedGeometries.has(boundary.adm_cd)) {
          this.simplifiedGeometries.set(
            boundary.adm_cd,
            this.createSimplifiedGeometry(boundary.geometry, 20)  // Only 20 points for PIP
          )
        }
        return {
          adm_cd: boundary.adm_cd,
          adm_nm: boundary.adm_nm,
          geometry: this.simplifiedGeometries.get(boundary.adm_cd)
        }
      })
      
      // Create cell-dong mapping for Worker
      const cellDongArray = Array.from(this.cellDongMapping.entries())
      
      console.log(`   📤 Sending to Worker: ${simplifiedBoundaries.length} dongs, ${cellDongArray.length} cell mappings`)
      
      // Send data to worker with spatial index
      this.worker.postMessage({
        type: 'PROCESS_GRADIENT',
        data: {
          dongData: Array.from(dongData.entries()),
          dongBoundaries: simplifiedBoundaries,
          gridCells: this.gridCells,
          cellDongMapping: cellDongArray,  // Pre-computed spatial index
          config: this.config,
          timeKey
        }
      })
    })
  }
  
  /**
   * Clean up Web Worker
   */
  public cleanupWorker(): void {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
      console.log('🧹 [DongGradient] Worker terminated')
    }
  }
  
  /**
   * Pre-compute spatial index: which cells overlap with which dong bounding boxes
   */
  private computeSpatialIndex(dongBoundaries: DongBoundary[]): void {
    console.log('📍 [DongGradient] Computing spatial index...')
    const startTime = performance.now()
    
    // Clear previous mappings
    this.cellDongMapping.clear()
    this.cachedBoundaryBBox.clear()
    
    // Pre-compute all dong bounding boxes
    dongBoundaries.forEach(boundary => {
      const dongFeature = turf.feature(boundary.geometry)
      const bbox = turf.bbox(dongFeature)
      this.cachedBoundaryBBox.set(boundary.adm_cd, bbox)
    })
    
    // For each grid cell, determine which dong bboxes it overlaps with
    this.gridCells.forEach(cell => {
      const [x, y] = cell.center
      const overlappingDongs: string[] = []
      
      dongBoundaries.forEach(boundary => {
        const bbox = this.cachedBoundaryBBox.get(boundary.adm_cd)!
        // Check if point is within bbox (with small buffer)
        const buffer = 0.005  // ~500m buffer
        if (x >= bbox[0] - buffer && x <= bbox[2] + buffer && 
            y >= bbox[1] - buffer && y <= bbox[3] + buffer) {
          overlappingDongs.push(boundary.adm_cd)
        }
      })
      
      if (overlappingDongs.length > 0) {
        this.cellDongMapping.set(cell.grid_id, overlappingDongs)
      }
    })
    
    const elapsedTime = performance.now() - startTime
    console.log(`   ✅ Spatial index computed in ${elapsedTime.toFixed(2)}ms`)
    console.log(`   📊 Cells with dong overlaps: ${this.cellDongMapping.size}/${this.gridCells.length}`)
  }
  
  /**
   * Create ultra-simplified geometry for fast PIP tests (10-20 points only)
   */
  private createSimplifiedGeometry(geometry: any, targetPoints: number = 15): any {
    const simplifyRatio = targetPoints / 1000  // Assuming ~1000 points in original
    
    if (geometry.type === 'Polygon') {
      return {
        type: 'Polygon',
        coordinates: geometry.coordinates.map((ring: any[]) => {
          const step = Math.max(1, Math.floor(ring.length / targetPoints))
          const simplified: any[] = []
          for (let i = 0; i < ring.length - 1; i += step) {
            simplified.push(ring[i])
          }
          // Always include last point to close polygon
          simplified.push(ring[ring.length - 1])
          return simplified
        })
      }
    } else if (geometry.type === 'MultiPolygon') {
      return {
        type: 'MultiPolygon',
        coordinates: geometry.coordinates.map((polygon: any) =>
          polygon.map((ring: any[]) => {
            const step = Math.max(1, Math.floor(ring.length / targetPoints))
            const simplified: any[] = []
            for (let i = 0; i < ring.length - 1; i += step) {
              simplified.push(ring[i])
            }
            simplified.push(ring[ring.length - 1])
            return simplified
          })
        )
      }
    }
    return geometry
  }
  
  /**
   * Simplify GeoJSON geometries to reduce memory usage
   */
  private simplifyGeometry(geometry: any): any {
    // Ultra-aggressive reduction for memory optimization
    const KEEP_RATIO = 0.1; // Keep only 10% of points
    
    if (geometry.type === 'Polygon') {
      return {
        type: 'Polygon',
        coordinates: geometry.coordinates.map((ring: any[]) => {
          const simplified: any[] = []
          for (let i = 0; i < ring.length; i++) {
            if (i === 0 || i === ring.length - 1 || i % Math.ceil(1 / KEEP_RATIO) === 0) {
              simplified.push(ring[i])
            }
          }
          return simplified
        })
      }
    } else if (geometry.type === 'MultiPolygon') {
      return {
        type: 'MultiPolygon',
        coordinates: geometry.coordinates.map((polygon: any) =>
          polygon.map((ring: any[]) => {
            const simplified: any[] = []
            for (let i = 0; i < ring.length; i++) {
              if (i === 0 || i === ring.length - 1 || i % Math.ceil(1 / KEEP_RATIO) === 0) {
                simplified.push(ring[i])
              }
            }
            return simplified
          })
        )
      }
    }
    
    return geometry
  }
  
  /**
   * 격자 생성 (기존 gridInterpolator와 동일)
   */
  public createGridCells(seoulBoundary: FeatureCollection<Polygon>): GridCell[] {
    console.log('🗺️ [DongGradient] 그리드 생성 중...')
    console.log(`   📏 그리드 크기: ${this.nx}x${this.ny}`)
    console.log(`   🔧 경계 필터 스킵: ${this.skipBoundaryFilter}`)
    
    const bbox = turf.bbox(seoulBoundary)
    const [minX, minY, maxX, maxY] = bbox
    
    this.dx = (maxX - minX) / this.nx
    this.dy = (maxY - minY) / this.ny
    
    const cells: GridCell[] = []
    let gridId = 0
    
    for (let row = 0; row < this.ny; row++) {
      const y0 = minY + row * this.dy
      
      for (let col = 0; col < this.nx; col++) {
        let x0 = minX + col * this.dx
        
        // 홀수 행은 반 칸씩 오프셋 (육각형 패턴 생성)
        if (row % 2 === 1) {
          x0 += this.dx / 2
        }
        
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
    
    // 서울 경계와 교차하는 셀만 필터링 (옵션)
    let filteredCells: GridCell[]
    
    if (this.skipBoundaryFilter) {
      // TEST MODE: Use all cells within bbox
      console.log('   ⚠️ [DongGradient] 경계 필터 스킵 - 모든 bbox 내 셀 사용')
      const seoulBBox = bbox
      filteredCells = cells.filter(cell => {
        const [x, y] = cell.center
        // Only basic bbox check
        return x >= seoulBBox[0] && x <= seoulBBox[2] && 
               y >= seoulBBox[1] && y <= seoulBBox[3]
      })
    } else {
      // PRODUCTION MODE: Strict boundary filtering
      const seoulBBox = bbox
      filteredCells = cells.filter(cell => {
        const [x, y] = cell.center
        
        // Quick bbox check first
        if (x < seoulBBox[0] || x > seoulBBox[2] || y < seoulBBox[1] || y > seoulBBox[3]) {
          return false
        }
        
        // Then check point in polygon
        const centerPoint = turf.point(cell.center)
        
        return seoulBoundary.features.some(feature => {
          try {
            if (feature.geometry && feature.geometry.type === 'Polygon') {
              return turf.booleanPointInPolygon(centerPoint, feature.geometry)
            } else if (feature.geometry && feature.geometry.type === 'MultiPolygon') {
              return feature.geometry.coordinates.some((polygon: any) => {
                const poly = turf.polygon(polygon)
                return turf.booleanPointInPolygon(centerPoint, poly)
              })
            }
            return false
          } catch (e) {
            return false
          }
        })
      })
    }
    
    filteredCells.forEach((cell, idx) => {
      cell.grid_id = idx
    })
    
    this.gridCells = filteredCells
    console.log(`   ✅ [DongGradient] 유지된 셀: ${this.gridCells.length}개`)
    console.log(`   📊 그리드 밀도: ${(this.gridCells.length / (this.nx * this.ny) * 100).toFixed(1)}%`)
    
    return this.gridCells
  }

  /**
   * 그라데이션 보간 적용
   * 각 행정동 내부에서 중심→경계 그라데이션
   */
  public distributeWithGradient(
    dongData: Map<string, number>,
    dongBoundaries: DongBoundary[],
    timeKey: string = 'current'
  ): GridData {
    const startTime = performance.now()
    console.log('🎨 [DongGradient] 행정동 경계 그라데이션 적용 중...')
    console.log(`   📏 경계 높이값: ${this.config.boundaryHeight}`)
    console.log(`   📐 보간 방식: ${this.config.interpolationType}`)
    console.log(`   📊 그리드 크기: ${this.nx}x${this.ny} = ${this.gridCells.length} cells`)
    console.log(`   🏘️ 처리할 동 개수: ${dongData.size}`)
    
    const gridData: GridData = {}
    gridData[timeKey] = {}
    
    // 모든 격자 셀을 0으로 초기화
    this.gridCells.forEach(cell => {
      gridData[timeKey][cell.grid_id.toString()] = 0
    })
    
    // 각 행정동별로 처리
    dongData.forEach((centerValue, admCd) => {
      // 해당 행정동 경계 찾기
      const dongBoundary = dongBoundaries.find(d => d.adm_cd === admCd)
      if (!dongBoundary || !dongBoundary.geometry) {
        console.warn(`   ⚠️ 행정동 ${admCd}의 경계를 찾을 수 없습니다.`)
        return
      }
      
      // 행정동 중심점 계산
      const dongFeature = turf.feature(dongBoundary.geometry)
      const centroid = turf.centroid(dongFeature)
      const centroidCoords = centroid.geometry.coordinates as [number, number]
      
      // Get or calculate bbox for this dong
      let dongBBox: [number, number, number, number]
      if (this.cachedBoundaryBBox.has(admCd)) {
        dongBBox = this.cachedBoundaryBBox.get(admCd)!
      } else {
        dongBBox = turf.bbox(dongFeature)
        this.cachedBoundaryBBox.set(admCd, dongBBox)
      }
      
      // 행정동 내부의 격자 셀 찾기 (bbox 사전 필터링)
      const cellsInDong: { cell: GridCell; distance: number }[] = []
      
      this.gridCells.forEach(cell => {
        const [x, y] = cell.center
        
        // Quick bbox check first
        if (x < dongBBox[0] || x > dongBBox[2] || y < dongBBox[1] || y > dongBBox[3]) {
          return
        }
        
        const cellPoint = turf.point(cell.center)
        
        try {
          // 셀이 행정동 내부에 있는지 확인
          let isInside = false
          
          if (dongBoundary.geometry.type === 'Polygon') {
            isInside = turf.booleanPointInPolygon(cellPoint, dongBoundary.geometry)
          } else if (dongBoundary.geometry.type === 'MultiPolygon') {
            isInside = dongBoundary.geometry.coordinates.some((polygon: any) => {
              const poly = turf.polygon(polygon)
              return turf.booleanPointInPolygon(cellPoint, poly)
            })
          }
          
          if (isInside) {
            // Euclidean distance for smoother circular gradients
            const dx = centroidCoords[0] - x
            const dy = centroidCoords[1] - y
            const distance = Math.sqrt(dx * dx + dy * dy)  // Euclidean distance in degrees
            cellsInDong.push({ cell, distance })
          }
        } catch (e) {
          // Skip invalid geometries
        }
      })
      
      // 처리 중인 동의 셀 개수 로깅 (처음 몇 개만)
      if (dongData.size <= 5 || Array.from(dongData.keys()).indexOf(admCd) < 3) {
        console.log(`   동 ${admCd}: ${cellsInDong.length}개 셀, 중심값: ${centerValue}`)
      }
      
      if (cellsInDong.length === 0) {
        // 행정동 내부에 셀이 없으면 가장 가까운 셀 하나 선택
        let minDist = Infinity
        let nearestCell: GridCell | null = null
        
        this.gridCells.forEach(cell => {
          const [x, y] = cell.center
          // Euclidean distance for smoother gradients
          const dx = centroidCoords[0] - x
          const dy = centroidCoords[1] - y
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          if (distance < minDist) {
            minDist = distance
            nearestCell = cell
          }
        })
        
        if (nearestCell) {
          cellsInDong.push({ cell: nearestCell, distance: minDist })
        }
      }
      
      // 최대 거리 계산 (정규화용)
      const maxDistance = Math.max(...cellsInDong.map(c => c.distance))
      
      // 각 셀에 그라데이션 값 할당 (간소화된 계산)
      cellsInDong.forEach(({ cell, distance }) => {
        const ratio = maxDistance > 0 ? Math.min(1, distance / maxDistance) : 0
        
        // Enhanced interpolation with smooth cubic spline
        let interpolatedValue: number
        
        if (this.config.interpolationType === 'linear') {
          // Linear interpolation
          interpolatedValue = centerValue + (this.config.boundaryHeight - centerValue) * ratio
        } else if (this.config.interpolationType === 'exponential') {
          // Exponential interpolation (sharper drop-off)
          const expRatio = ratio * ratio
          interpolatedValue = centerValue + (this.config.boundaryHeight - centerValue) * expRatio
        } else if (this.config.interpolationType === 'logarithmic') {
          // Logarithmic interpolation (slower drop-off)
          const logRatio = Math.sqrt(ratio)
          interpolatedValue = centerValue + (this.config.boundaryHeight - centerValue) * logRatio
        } else {
          // Smooth cubic interpolation (smoothstep function)
          // Creates very smooth S-curve transition
          const smoothRatio = ratio * ratio * (3.0 - 2.0 * ratio)  // Smoothstep formula
          interpolatedValue = centerValue + (this.config.boundaryHeight - centerValue) * smoothRatio
        }
        
        // 값 할당 (양수만 저장)
        if (interpolatedValue > 0) {
          gridData[timeKey][cell.grid_id.toString()] = interpolatedValue
        }
      })
    })
    
    // Apply Gaussian smoothing if enabled
    if (this.config.enableSmoothing && this.config.smoothingSigma > 0) {
      console.log(`   🌫️ [DongGradient] Applying Gaussian smoothing (σ=${this.config.smoothingSigma}m)...`)
      this.applyGaussianSmoothing(gridData, timeKey)
    }
    
    // 검증: 총합 계산
    const totalOriginal = Array.from(dongData.values()).reduce((sum, v) => sum + v, 0)
    const totalGrid = Object.values(gridData[timeKey]).reduce((sum, v) => sum + v, 0)
    const elapsedTime = performance.now() - startTime
    console.log(`   🧾 [DongGradient] 원본 총합: ${totalOriginal.toFixed(0)}, 그리드 총합: ${totalGrid.toFixed(0)}`)
    console.log(`   ⏱️ [DongGradient] 처리 시간: ${elapsedTime.toFixed(2)}ms`)
    
    return gridData
  }

  /**
   * 결과를 HexagonLayer 형식으로 변환
   */
  public convertToHexagonData(
    gridData: GridData,
    timeKey: string = 'current'
  ): HexagonLayerGridData[] {
    const result: HexagonLayerGridData[] = []
    const data = gridData[timeKey] || {}
    
    console.log('[DongGradient convertToHexagonData] Grid cells:', this.gridCells.length)
    console.log('[DongGradient convertToHexagonData] Grid data keys:', Object.keys(data).length)
    
    let addedCount = 0
    this.gridCells.forEach(cell => {
      const value = data[cell.grid_id.toString()] || 0
      
      if (value > 0) {
        result.push({
          coordinates: cell.center,
          weight: value,
          gridId: cell.grid_id,
          row: cell.row,
          col: cell.col
        })
        addedCount++
        
        // Log first few for debugging
        if (addedCount <= 3) {
          console.log(`[DongGradient] Cell ${cell.grid_id}:`, {
            coords: cell.center,
            weight: value
          })
        }
      }
    })
    
    console.log(`[DongGradient convertToHexagonData] Created ${result.length} hexagon cells`)
    
    return result
  }

  /**
   * Apply Gaussian smoothing to grid data
   */
  private applyGaussianSmoothing(gridData: GridData, timeKey: string): void {
    const data = gridData[timeKey]
    if (!data) return
    
    // Create 2D array for smoothing
    const grid2D: number[][] = Array(this.ny).fill(null).map(() => Array(this.nx).fill(0))
    const mask: boolean[][] = Array(this.ny).fill(null).map(() => Array(this.nx).fill(false))
    
    // Fill 2D array from grid data
    this.gridCells.forEach(cell => {
      const value = data[cell.grid_id.toString()] || 0
      if (value > 0) {
        grid2D[cell.row][cell.col] = value
        mask[cell.row][cell.col] = true
      }
    })
    
    // Calculate kernel size based on sigma
    const sigmaInCells = Math.max(1, this.config.smoothingSigma / Math.max(this.dx, this.dy))
    const kernelRadius = Math.ceil(sigmaInCells * 2)  // 2-sigma radius for 95% coverage
    
    // Apply Gaussian blur
    const smoothed = this.gaussianBlur2D(grid2D, mask, sigmaInCells, kernelRadius)
    
    // Write back to grid data (preserve total sum)
    const originalSum = Object.values(data).reduce((sum, v) => sum + v, 0)
    let smoothedSum = 0
    
    this.gridCells.forEach(cell => {
      if (mask[cell.row][cell.col]) {
        const smoothedValue = smoothed[cell.row][cell.col]
        data[cell.grid_id.toString()] = smoothedValue
        smoothedSum += smoothedValue
      }
    })
    
    // Normalize to preserve total sum
    if (smoothedSum > 0 && originalSum > 0) {
      const scale = originalSum / smoothedSum
      Object.keys(data).forEach(key => {
        data[key] *= scale
      })
    }
  }
  
  /**
   * 2D Gaussian blur implementation
   */
  private gaussianBlur2D(
    grid: number[][],
    mask: boolean[][],
    sigma: number,
    radius: number
  ): number[][] {
    const result = Array(this.ny).fill(null).map(() => Array(this.nx).fill(0))
    
    // Create Gaussian kernel
    const kernel: number[][] = []
    let kernelSum = 0
    
    for (let dy = -radius; dy <= radius; dy++) {
      const row: number[] = []
      for (let dx = -radius; dx <= radius; dx++) {
        const distance = Math.sqrt(dx * dx + dy * dy)
        const weight = Math.exp(-(distance * distance) / (2 * sigma * sigma))
        row.push(weight)
        kernelSum += weight
      }
      kernel.push(row)
    }
    
    // Normalize kernel
    for (let i = 0; i < kernel.length; i++) {
      for (let j = 0; j < kernel[i].length; j++) {
        kernel[i][j] /= kernelSum
      }
    }
    
    // Apply convolution
    for (let y = 0; y < this.ny; y++) {
      for (let x = 0; x < this.nx; x++) {
        if (!mask[y][x]) continue
        
        let sum = 0
        let weightSum = 0
        
        for (let ky = 0; ky < kernel.length; ky++) {
          for (let kx = 0; kx < kernel[ky].length; kx++) {
            const ny = y + ky - radius
            const nx = x + kx - radius
            
            if (ny >= 0 && ny < this.ny && nx >= 0 && nx < this.nx && mask[ny][nx]) {
              const weight = kernel[ky][kx]
              sum += grid[ny][nx] * weight
              weightSum += weight
            }
          }
        }
        
        result[y][x] = weightSum > 0 ? sum / weightSum : grid[y][x]
      }
    }
    
    return result
  }
  
  // Getters
  public getGridCells(): GridCell[] {
    return this.gridCells
  }
}