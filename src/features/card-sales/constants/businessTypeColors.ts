/**
 * Business Type Colors (업종 색상 정의)
 * 15개의 업종 카테고리에 대한 고유 색상 매핑
 */

export interface BusinessTypeColor {
  name: string
  color: string
  rgbColor: [number, number, number, number]
}

// 15개 업종에 대한 색상 정의 (시각적으로 구분 가능한 색상 팔레트)
export const BUSINESS_TYPE_COLORS: BusinessTypeColor[] = [
  // 음식 관련 (빨강/주황 계열)
  { name: '한식', color: '#FF6B6B', rgbColor: [255, 107, 107, 200] },
  { name: '일식/양식/중식', color: '#FF8C42', rgbColor: [255, 140, 66, 200] },
  { name: '제과/커피/패스트푸드', color: '#FFA07A', rgbColor: [255, 160, 122, 200] },
  { name: '음/식료품', color: '#FA8072', rgbColor: [250, 128, 114, 200] },
  
  // 쇼핑/유통 관련 (파랑/청록 계열)
  { name: '백화점', color: '#4169E1', rgbColor: [65, 105, 225, 200] },
  { name: '마트/생활잡화', color: '#00BFFF', rgbColor: [0, 191, 255, 200] },
  { name: '편의점', color: '#87CEEB', rgbColor: [135, 206, 235, 200] },
  { name: '패션/잡화', color: '#4682B4', rgbColor: [70, 130, 180, 200] },
  
  // 의료/건강 관련 (초록 계열)
  { name: '병원', color: '#00FA9A', rgbColor: [0, 250, 154, 200] },
  { name: '약국', color: '#3CB371', rgbColor: [60, 179, 113, 200] },
  { name: '스포츠/헬스시설', color: '#90EE90', rgbColor: [144, 238, 144, 200] },
  
  // 문화/여가 관련 (보라 계열)
  { name: '오락/공연/서점', color: '#9370DB', rgbColor: [147, 112, 219, 200] },
  { name: '레저/문화용품', color: '#BA55D3', rgbColor: [186, 85, 211, 200] },
  { name: '숙박', color: '#8B008B', rgbColor: [139, 0, 139, 200] },
  { name: '여행', color: '#DDA0DD', rgbColor: [221, 160, 221, 200] },
]

// 카테고리 이름으로 색상을 빠르게 찾기 위한 맵
export const BUSINESS_TYPE_COLOR_MAP = BUSINESS_TYPE_COLORS.reduce((acc, cat) => {
  acc[cat.name] = cat.rgbColor
  return acc
}, {} as Record<string, [number, number, number, number]>)

// 카테고리 이름으로 HEX 색상을 찾기 위한 맵
export const BUSINESS_TYPE_HEX_MAP = BUSINESS_TYPE_COLORS.reduce((acc, cat) => {
  acc[cat.name] = cat.color
  return acc
}, {} as Record<string, string>)

// 기본 색상 (카테고리가 매칭되지 않을 때)
export const DEFAULT_CATEGORY_COLOR: [number, number, number, number] = [128, 128, 128, 200]
export const DEFAULT_CATEGORY_HEX = '#808080'

// 기존 이름과의 호환성을 위한 별칭 (deprecated)
export const MIDDLE_CATEGORY_COLORS = BUSINESS_TYPE_COLORS
export const MIDDLE_CATEGORY_COLOR_MAP = BUSINESS_TYPE_COLOR_MAP
export const MIDDLE_CATEGORY_HEX_MAP = BUSINESS_TYPE_HEX_MAP
export type MiddleCategoryColor = BusinessTypeColor