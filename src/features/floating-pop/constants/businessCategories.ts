/**
 * Business Category Colors and Data
 * 업종 카테고리 색상 및 데이터 정의
 */

export interface BusinessCategory {
  name: string
  color: string
  rgbColor: [number, number, number, number]
}

export const BUSINESS_CATEGORIES: BusinessCategory[] = [
  { 
    name: '음식', 
    color: '#FF6B6B',
    rgbColor: [255, 107, 107, 200]
  },
  { 
    name: '쇼핑', 
    color: '#4ECDC4',
    rgbColor: [78, 205, 196, 200]
  },
  { 
    name: '교통', 
    color: '#FFD93D',
    rgbColor: [255, 217, 61, 200]
  },
  { 
    name: '문화/여가', 
    color: '#A855F7',
    rgbColor: [168, 85, 247, 200]
  },
  { 
    name: '의료/건강', 
    color: '#6BCF7F',
    rgbColor: [107, 207, 127, 200]
  },
  { 
    name: '교육', 
    color: '#FF8C42',
    rgbColor: [255, 140, 66, 200]
  },
  { 
    name: '숙박', 
    color: '#4682B4',
    rgbColor: [70, 130, 180, 200]
  },
  { 
    name: '금융', 
    color: '#FD79A8',
    rgbColor: [253, 121, 168, 200]
  },
  { 
    name: '생활서비스', 
    color: '#9370DB',
    rgbColor: [147, 112, 219, 200]
  },
  { 
    name: '공공/기관', 
    color: '#A29BFE',
    rgbColor: [162, 155, 254, 200]
  }
]

export const BUSINESS_CATEGORY_COLOR_MAP = BUSINESS_CATEGORIES.reduce((acc, cat) => {
  acc[cat.name] = cat.rgbColor
  return acc
}, {} as Record<string, [number, number, number, number]>)