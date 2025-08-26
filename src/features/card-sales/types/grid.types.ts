/**
 * Grid interpolation 관련 타입 정의
 * grid_0811.py의 데이터 구조를 TypeScript로 재현
 */

import type { Feature, Polygon, Point } from 'geojson'

/**
 * 격자 셀 정의
 */
export interface GridCell {
  grid_id: number
  row: number
  col: number
  geometry: Polygon
  center: [number, number] // [경도, 위도]
}

/**
 * 가중치 분배 방식
 */
export type DistributionMethod = 'gaussian' | 'inverse_distance' | 'nearest'

/**
 * 가중치 매트릭스
 * 행정동 ID -> 격자 ID -> 가중치
 */
export interface WeightMatrix {
  [dongId: string]: {
    [gridId: number]: number
  }
}

/**
 * 격자 데이터 (시간대별)
 */
export interface GridData {
  [timeKey: string]: {
    [gridId: string]: number
  }
}

/**
 * 보간 설정
 */
export interface InterpolatorConfig {
  gridSize?: number              // 격자 크기 (기본 80x80)
  crsEqualArea?: string          // 등면적 투영 (기본 EPSG:5186)
  crsWGS84?: string             // WGS84 (기본 EPSG:4326)
  distributionMethod?: DistributionMethod  // 분배 방식
  distributionRadius?: number    // 분배 반경 (미터)
  enableSmoothing?: boolean      // 스무딩 적용 여부
  smoothingSigma?: number        // 스무딩 시그마 (미터)
}

/**
 * 행정동 경계 데이터
 */
export interface DongBoundary {
  adm_cd: string      // 행정동 코드 (String으로 통일)
  adm_nm: string      // 행정동 이름
  geometry: Polygon   // 경계 폴리곤
}

/**
 * 격자 보간 결과
 */
export interface GridInterpolationResult {
  gridCells: GridCell[]          // 격자 셀 목록
  gridData: GridData             // 격자별 데이터
  weights: WeightMatrix          // 가중치 매트릭스
  metadata: GridMetadata         // 메타데이터
}

/**
 * 메타데이터
 */
export interface GridMetadata {
  gridSize: number
  crsProcessing: string
  crsOutput: string
  nCells: number
  timePeriods?: string[]
  distribution: {
    method: DistributionMethod
    radiusM: number
  }
  smoothing: {
    enabled: boolean
    sigmaM: number
  }
  bounds: {
    minX: number
    minY: number
    maxX: number
    maxY: number
  }
  totalSum?: {
    original: number
    distributed: number
    difference: number
  }
  description: string
  timestamp: string
}

/**
 * HexagonLayer용 데이터 포맷
 */
export interface HexagonLayerGridData {
  coordinates: [number, number]
  weight: number
  gridId: number
  row: number
  col: number
  dongContributions?: {
    [dongName: string]: number
  }
}