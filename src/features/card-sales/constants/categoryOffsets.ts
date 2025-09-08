/**
 * 업종별 위치 오프셋 정의
 * 15개 업종을 3x5 그리드 형태로 배치하여 겹치지 않도록 함
 */

export interface CategoryOffset {
  dx: number  // 경도 오프셋
  dy: number  // 위도 오프셋
}

// 오프셋 간격 설정 (바가 겹치지 않도록 충분한 간격)
const OFFSET_SCALE = 0.0048  // 약 480m 간격 (기존의 3배로 증가)

// 15개 업종에 대한 위치 오프셋 (3x5 그리드)
export const BUSINESS_TYPE_OFFSETS: Record<string, CategoryOffset> = {
  // Row 1 (y = 1)
  '레저/문화용품': { dx: -2 * OFFSET_SCALE, dy: 1 * OFFSET_SCALE },
  '마트/생활잡화': { dx: -1 * OFFSET_SCALE, dy: 1 * OFFSET_SCALE },
  '백화점': { dx: 0, dy: 1 * OFFSET_SCALE },
  '병원': { dx: 1 * OFFSET_SCALE, dy: 1 * OFFSET_SCALE },
  '숙박': { dx: 2 * OFFSET_SCALE, dy: 1 * OFFSET_SCALE },
  
  // Row 2 (y = 0)
  '스포츠/헬스시설': { dx: -2 * OFFSET_SCALE, dy: 0 },
  '약국': { dx: -1 * OFFSET_SCALE, dy: 0 },
  '여행': { dx: 0, dy: 0 },  // 중앙
  '오락/공연/서점': { dx: 1 * OFFSET_SCALE, dy: 0 },
  '음/식료품': { dx: 2 * OFFSET_SCALE, dy: 0 },
  
  // Row 3 (y = -1)
  '일식/양식/중식': { dx: -2 * OFFSET_SCALE, dy: -1 * OFFSET_SCALE },
  '제과/커피/패스트푸드': { dx: -1 * OFFSET_SCALE, dy: -1 * OFFSET_SCALE },
  '패션/잡화': { dx: 0, dy: -1 * OFFSET_SCALE },
  '편의점': { dx: 1 * OFFSET_SCALE, dy: -1 * OFFSET_SCALE },
  '한식': { dx: 2 * OFFSET_SCALE, dy: -1 * OFFSET_SCALE }
}

// 기존 이름 호환성을 위한 별칭 (deprecated)
export const MIDDLE_CATEGORY_OFFSETS = BUSINESS_TYPE_OFFSETS

// 기본 오프셋 (카테고리가 매칭되지 않을 때)
export const DEFAULT_OFFSET: CategoryOffset = { dx: 0, dy: 0 }

/**
 * 카테고리명으로 오프셋 가져오기
 */
export function getCategoryOffset(categoryName: string): CategoryOffset {
  return BUSINESS_TYPE_OFFSETS[categoryName] || DEFAULT_OFFSET
}