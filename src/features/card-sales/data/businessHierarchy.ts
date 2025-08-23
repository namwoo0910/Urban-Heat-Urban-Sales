/**
 * Business Category Data - Based on Actual Data Structure
 * 실제 데이터에 있는 중분류와 소분류 그대로 사용
 */

// 실제 데이터의 모든 중분류 (27개)
export const actualMiddleCategories = [
  "가전/가구",
  "기타요식",
  "기타유통",
  "마트/생활잡화",
  "미용서비스",
  "백화점",
  "병원",
  "사무기기/컴퓨터",
  "상품권/복권",
  "생활서비스",
  "숙박",
  "스포츠/문화/레저",
  "스포츠/문화/레저용품",
  "약국",
  "여행",
  "유흥",
  "음/식료품",
  "일식/양식/중식",
  "자동차서비스/용품",
  "자동차판매",
  "제과/커피/패스트푸드",
  "주유",
  "패션/잡화",
  "편의점",
  "학습",
  "한식",
  "화장품",
];

// 실제 데이터의 모든 소분류 (80개)
export const actualSubCategories = [
  "LPG가스",
  "가구",
  "가전",
  "게임방/오락실",
  "기타식품",
  "기타요식",
  "기타유통",
  "노래방",
  "농수산물",
  "대형마트",
  "독서실",
  "동물병원",
  "면세점",
  "모텔,여관,기타숙박",
  "문화용품",
  "미용서비스",
  "미용실",
  "백화점",
  "보건소",
  "부동산중개",
  "사무기기/문구용품",
  "상품권/복권",
  "생활잡화/수입상품점",
  "서적",
  "서점",
  "세탁소",
  "쇼핑몰",
  "수입자동차",
  "수제용품점",
  "슈퍼마켓 기업형",
  "슈퍼마켓 일반형",
  "스포츠/레저용품",
  "스포츠시설",
  "시계/귀금속",
  "신차판매",
  "실내/실외골프장",
  "싸우나/목욕탕",
  "악기/음반",
  "안마/마사지",
  "애완동물",
  "약국",
  "양식",
  "여행사/항공사",
  "영화/공연",
  "예식장/결혼서비스",
  "오토바이",
  "완구/아동용자전거",
  "유흥업소",
  "의복/의류",
  "인테리어/건축자재/주방기구",
  "일반병원",
  "일식",
  "자동차서비스",
  "자동차용품",
  "전용매장",
  "정육점",
  "제과점",
  "종합레저타운/놀이동산",
  "종합병원",
  "주류판매",
  "주유소",
  "주차장",
  "중고차판매",
  "중고품판매점",
  "중식",
  "체인점",
  "치과병원",
  "커피전문점",
  "컴퓨터/소프트웨어",
  "패션잡화",
  "패스트푸드",
  "편의점",
  "학원/학습지",
  "한식",
  "한의원",
  "할인점/슈퍼마켓/양판점",
  "헬스장",
  "호텔/콘도",
  "화원",
  "화장품",
];

// Helper functions
export const getAllMiddleCategories = (): string[] => {
  return actualMiddleCategories;
}

export const getAllSubCategories = (): string[] => {
  return actualSubCategories;
}

// 기존 코드 호환성을 위한 함수들 (deprecated - 추후 제거 예정)
export const getSubCategoriesByMiddle = (middleCategory: string): string[] => {
  // 실제 데이터는 중분류-소분류 매핑이 1:1이 아니므로
  // 필터링 로직에서 직접 처리하도록 변경
  console.warn('getSubCategoriesByMiddle is deprecated. Use actualSubCategories directly.');
  return actualSubCategories;
}

export const findMiddleCategoryBySubCategory = (subCategory: string): string | null => {
  // 실제 데이터에서는 중분류-소분류 관계가 명확하지 않음
  console.warn('findMiddleCategoryBySubCategory is deprecated.');
  return null;
}

// 기존 businessHierarchy 인터페이스 제거 (평면 구조로 변경)
export interface BusinessHierarchy {
  [key: string]: string[]
}

// 빈 객체로 유지 (기존 코드 호환성)
export const businessHierarchy: BusinessHierarchy = {};

// categoryCodeMap 제거 (실제 데이터는 한글 이름 직접 사용)
export const categoryCodeMap: Record<string, string> = {};