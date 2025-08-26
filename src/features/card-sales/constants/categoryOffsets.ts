/**
 * 중분류 카테고리별 위치 오프셋 정의
 * 27개 카테고리를 5x6 그리드 형태로 배치하여 겹치지 않도록 함
 */

export interface CategoryOffset {
  dx: number  // 경도 오프셋
  dy: number  // 위도 오프셋
}

// 오프셋 간격 설정 (바가 겹치지 않도록 충분한 간격)
const OFFSET_SCALE = 0.0016  // 약 160m 간격 (2배로 증가)

// 27개 중분류 카테고리에 대한 위치 오프셋 (5x6 그리드)
export const MIDDLE_CATEGORY_OFFSETS: Record<string, CategoryOffset> = {
  // Row 1 (y = 2)
  '가전/가구': { dx: -2 * OFFSET_SCALE, dy: 2 * OFFSET_SCALE },
  '기타요식': { dx: -1 * OFFSET_SCALE, dy: 2 * OFFSET_SCALE },
  '기타유통': { dx: 0, dy: 2 * OFFSET_SCALE },
  '마트/생활잡화': { dx: 1 * OFFSET_SCALE, dy: 2 * OFFSET_SCALE },
  '미용서비스': { dx: 2 * OFFSET_SCALE, dy: 2 * OFFSET_SCALE },
  
  // Row 2 (y = 1)
  '백화점': { dx: -2.5 * OFFSET_SCALE, dy: 1 * OFFSET_SCALE },
  '병원': { dx: -1.5 * OFFSET_SCALE, dy: 1 * OFFSET_SCALE },
  '사무기기/컴퓨터': { dx: -0.5 * OFFSET_SCALE, dy: 1 * OFFSET_SCALE },
  '상품권/복권': { dx: 0.5 * OFFSET_SCALE, dy: 1 * OFFSET_SCALE },
  '생활서비스': { dx: 1.5 * OFFSET_SCALE, dy: 1 * OFFSET_SCALE },
  '숙박': { dx: 2.5 * OFFSET_SCALE, dy: 1 * OFFSET_SCALE },
  
  // Row 3 (y = 0)
  '스포츠/문화/레저': { dx: -2 * OFFSET_SCALE, dy: 0 },
  '스포츠/문화/레저용품': { dx: -1 * OFFSET_SCALE, dy: 0 },
  '약국': { dx: 0, dy: 0 },  // 중앙
  '여행': { dx: 1 * OFFSET_SCALE, dy: 0 },
  '유흥': { dx: 2 * OFFSET_SCALE, dy: 0 },
  
  // Row 4 (y = -1)
  '음/식료품': { dx: -2.5 * OFFSET_SCALE, dy: -1 * OFFSET_SCALE },
  '일식/양식/중식': { dx: -1.5 * OFFSET_SCALE, dy: -1 * OFFSET_SCALE },
  '자동차서비스/용품': { dx: -0.5 * OFFSET_SCALE, dy: -1 * OFFSET_SCALE },
  '자동차판매': { dx: 0.5 * OFFSET_SCALE, dy: -1 * OFFSET_SCALE },
  '제과/커피/패스트푸드': { dx: 1.5 * OFFSET_SCALE, dy: -1 * OFFSET_SCALE },
  '주유': { dx: 2.5 * OFFSET_SCALE, dy: -1 * OFFSET_SCALE },
  
  // Row 5 (y = -2)
  '패션/잡화': { dx: -2 * OFFSET_SCALE, dy: -2 * OFFSET_SCALE },
  '편의점': { dx: -1 * OFFSET_SCALE, dy: -2 * OFFSET_SCALE },
  '학습': { dx: 0, dy: -2 * OFFSET_SCALE },
  '한식': { dx: 1 * OFFSET_SCALE, dy: -2 * OFFSET_SCALE },
  '화장품': { dx: 2 * OFFSET_SCALE, dy: -2 * OFFSET_SCALE }
}

// 기본 오프셋 (카테고리가 매칭되지 않을 때)
export const DEFAULT_OFFSET: CategoryOffset = { dx: 0, dy: 0 }

/**
 * 카테고리명으로 오프셋 가져오기
 */
export function getCategoryOffset(categoryName: string): CategoryOffset {
  return MIDDLE_CATEGORY_OFFSETS[categoryName] || DEFAULT_OFFSET
}