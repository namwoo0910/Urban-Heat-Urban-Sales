// 3D 고도 표현을 위한 공통 상수
// 서울 경계선과 데이터 레이어 간의 고도 정렬을 위해 사용

// 기본 고도 스케일 (미터 단위)
export const BASE_ELEVATION_SCALE = 1

// 서울 경계선 3D 고도 설정
export const SEOUL_BOUNDARY_ELEVATION = {
  // 구(SGG) 레벨 고도 - 데이터와 동일한 스케일로 상향 조정
  SGG: {
    BASE: 0,  // 바닥 레벨
    HEIGHT: {
      MIN_ZOOM: 1000,   // 줌 8일 때 높이 (미터)
      MID_ZOOM: 1500,   // 줌 12일 때 높이
      MAX_ZOOM: 2000,   // 줌 16일 때 높이
    },
    HOVER_BOOST: 1.2, // 호버 시 높이 증가 비율
    SELECTED_BOOST: 1.5, // 선택 시 높이 증가 비율
  },
  // 동(DONG) 레벨 고도 - 구보다 약간 낮게
  DONG: {
    BASE: 0,
    HEIGHT: {
      MIN_ZOOM: 500,   // 줌 10일 때 높이
      MID_ZOOM: 750,   // 줌 14일 때 높이
      MAX_ZOOM: 1000,  // 줌 18일 때 높이
    },
  },
}

// 데이터 레이어(ColumnLayer) 고도 설정
export const DATA_LAYER_ELEVATION = {
  // 매출액 기반 고도 계산
  SALES: {
    SCALE_FACTOR: 0.000001,  // 1억원 = 100m (value * 0.000001 * 100000000 = 100)
    MIN_HEIGHT: 10,          // 최소 높이 (미터)
    MAX_HEIGHT: 1000,        // 최대 높이 (미터) - 10억원 상한
  },
  // 기온 기반 고도 계산
  TEMPERATURE: {
    SCALE_FACTOR: 50,        // 기온을 높이로 변환하는 계수
    OFFSET: 20,              // 기온 오프셋 (영하 처리)
  },
  // 불쾌지수 기반 고도 계산
  DISCOMFORT: {
    SCALE_FACTOR: 30,        // 불쾌지수를 높이로 변환하는 계수
  },
  // 습도 기반 고도 계산
  HUMIDITY: {
    SCALE_FACTOR: 20,        // 습도를 높이로 변환하는 계수
  },
}

// 고도 계산 헬퍼 함수
export function calculateDataElevation(
  value: number,
  mode: 'sales' | 'temperature' | 'discomfort' | 'humidity',
  elevationScale: number = 1
): number {
  switch(mode) {
    case 'temperature':
      return ((value + DATA_LAYER_ELEVATION.TEMPERATURE.OFFSET) * DATA_LAYER_ELEVATION.TEMPERATURE.SCALE_FACTOR) * elevationScale
      
    case 'discomfort':
      return (value * DATA_LAYER_ELEVATION.DISCOMFORT.SCALE_FACTOR) * elevationScale
      
    case 'humidity':
      return (value * DATA_LAYER_ELEVATION.HUMIDITY.SCALE_FACTOR) * elevationScale
      
    case 'sales':
    default:
      // 매출액을 선형 스케일로 변경하여 차이를 명확하게 표현
      // 1억원 = 100m 매핑
      const scaledValue = (value / 100000000) * 100 * elevationScale
      const height = Math.max(DATA_LAYER_ELEVATION.SALES.MIN_HEIGHT, 
                             Math.min(DATA_LAYER_ELEVATION.SALES.MAX_HEIGHT, scaledValue))
      return height
  }
}

// 줌 레벨에 따른 서울 경계선 고도 계산
export function calculateBoundaryElevation(
  zoom: number,
  type: 'SGG' | 'DONG',
  isHovered: boolean = false,
  isSelected: boolean = false
): number {
  const config = type === 'SGG' ? SEOUL_BOUNDARY_ELEVATION.SGG : SEOUL_BOUNDARY_ELEVATION.DONG
  
  // 줌 레벨에 따른 기본 높이 보간
  let height: number
  if (zoom <= 8) {
    height = config.HEIGHT.MIN_ZOOM
  } else if (zoom <= 12) {
    const t = (zoom - 8) / 4
    height = config.HEIGHT.MIN_ZOOM + (config.HEIGHT.MID_ZOOM - config.HEIGHT.MIN_ZOOM) * t
  } else if (zoom <= 16) {
    const t = (zoom - 12) / 4
    height = config.HEIGHT.MID_ZOOM + (config.HEIGHT.MAX_ZOOM - config.HEIGHT.MID_ZOOM) * t
  } else {
    height = config.HEIGHT.MAX_ZOOM
  }
  
  // 호버/선택 상태에 따른 높이 조정
  if (isSelected && type === 'SGG') {
    height *= SEOUL_BOUNDARY_ELEVATION.SGG.SELECTED_BOOST
  } else if (isHovered && type === 'SGG') {
    height *= SEOUL_BOUNDARY_ELEVATION.SGG.HOVER_BOOST
  }
  
  return height
}