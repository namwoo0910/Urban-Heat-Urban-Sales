/**
 * Business Category Hierarchy Data
 * 업종 중분류-소분류 계층 구조
 */

export interface BusinessHierarchy {
  [key: string]: string[]
}

export const businessHierarchy: BusinessHierarchy = {
  "음식": [
    "한식",
    "중식",
    "일식",
    "양식",
    "패스트푸드",
    "카페/베이커리",
    "주점",
    "기타음식점"
  ],
  "쇼핑": [
    "백화점",
    "대형마트",
    "슈퍼마켓",
    "편의점",
    "의류/신발",
    "화장품",
    "전자제품",
    "가구/인테리어",
    "서적/문구",
    "스포츠용품",
    "기타소매"
  ],
  "교통": [
    "대중교통",
    "택시",
    "주유소",
    "주차장",
    "자동차정비",
    "렌터카",
    "기타교통"
  ],
  "문화/여가": [
    "영화관",
    "공연장",
    "놀이공원",
    "스포츠시설",
    "헬스/피트니스",
    "노래방",
    "PC방",
    "당구장/볼링장",
    "기타여가"
  ],
  "의료/건강": [
    "종합병원",
    "병원",
    "의원",
    "치과",
    "한의원",
    "약국",
    "안경점",
    "건강관리",
    "미용/피부관리"
  ],
  "교육": [
    "학원",
    "유치원/어린이집",
    "대학교",
    "도서관",
    "교육서비스",
    "기타교육"
  ],
  "숙박": [
    "호텔",
    "모텔/여관",
    "펜션/민박",
    "게스트하우스",
    "기타숙박"
  ],
  "금융": [
    "은행",
    "증권",
    "보험",
    "카드사",
    "기타금융"
  ],
  "생활서비스": [
    "부동산",
    "세탁소",
    "이발소/미용실",
    "목욕탕/사우나",
    "수리서비스",
    "사진관",
    "통신서비스",
    "기타서비스"
  ],
  "공공/기관": [
    "관공서",
    "우체국",
    "공공시설",
    "복지시설",
    "기타공공"
  ]
}

// Helper functions
export const getAllMiddleCategories = (): string[] => {
  return Object.keys(businessHierarchy).sort()
}

export const getSubCategoriesByMiddle = (middleCategory: string): string[] => {
  return businessHierarchy[middleCategory] || []
}

export const findMiddleCategoryBySubCategory = (subCategory: string): string | null => {
  for (const [middle, subs] of Object.entries(businessHierarchy)) {
    if (subs.includes(subCategory)) {
      return middle
    }
  }
  return null
}

// Category code mapping for data filtering
export const categoryCodeMap: Record<string, string> = {
  // 음식
  "한식": "FOOD_KOREAN",
  "중식": "FOOD_CHINESE",
  "일식": "FOOD_JAPANESE",
  "양식": "FOOD_WESTERN",
  "패스트푸드": "FOOD_FASTFOOD",
  "카페/베이커리": "FOOD_CAFE",
  "주점": "FOOD_BAR",
  "기타음식점": "FOOD_OTHER",
  
  // 쇼핑
  "백화점": "SHOP_DEPARTMENT",
  "대형마트": "SHOP_MART",
  "슈퍼마켓": "SHOP_SUPER",
  "편의점": "SHOP_CONVENIENCE",
  "의류/신발": "SHOP_CLOTHING",
  "화장품": "SHOP_COSMETICS",
  "전자제품": "SHOP_ELECTRONICS",
  "가구/인테리어": "SHOP_FURNITURE",
  "서적/문구": "SHOP_BOOKS",
  "스포츠용품": "SHOP_SPORTS",
  "기타소매": "SHOP_OTHER",
  
  // 교통
  "대중교통": "TRANS_PUBLIC",
  "택시": "TRANS_TAXI",
  "주유소": "TRANS_GAS",
  "주차장": "TRANS_PARKING",
  "자동차정비": "TRANS_REPAIR",
  "렌터카": "TRANS_RENTAL",
  "기타교통": "TRANS_OTHER",
  
  // 문화/여가
  "영화관": "CULTURE_MOVIE",
  "공연장": "CULTURE_PERFORMANCE",
  "놀이공원": "CULTURE_AMUSEMENT",
  "스포츠시설": "CULTURE_SPORTS",
  "헬스/피트니스": "CULTURE_FITNESS",
  "노래방": "CULTURE_KARAOKE",
  "PC방": "CULTURE_PCROOM",
  "당구장/볼링장": "CULTURE_BILLIARDS",
  "기타여가": "CULTURE_OTHER",
  
  // 의료/건강
  "종합병원": "MEDICAL_GENERAL",
  "병원": "MEDICAL_HOSPITAL",
  "의원": "MEDICAL_CLINIC",
  "치과": "MEDICAL_DENTAL",
  "한의원": "MEDICAL_ORIENTAL",
  "약국": "MEDICAL_PHARMACY",
  "안경점": "MEDICAL_OPTICAL",
  "건강관리": "MEDICAL_HEALTH",
  "미용/피부관리": "MEDICAL_BEAUTY",
  
  // 교육
  "학원": "EDU_ACADEMY",
  "유치원/어린이집": "EDU_KINDERGARTEN",
  "대학교": "EDU_UNIVERSITY",
  "도서관": "EDU_LIBRARY",
  "교육서비스": "EDU_SERVICE",
  "기타교육": "EDU_OTHER",
  
  // 숙박
  "호텔": "LODGE_HOTEL",
  "모텔/여관": "LODGE_MOTEL",
  "펜션/민박": "LODGE_PENSION",
  "게스트하우스": "LODGE_GUEST",
  "기타숙박": "LODGE_OTHER",
  
  // 금융
  "은행": "FINANCE_BANK",
  "증권": "FINANCE_STOCK",
  "보험": "FINANCE_INSURANCE",
  "카드사": "FINANCE_CARD",
  "기타금융": "FINANCE_OTHER",
  
  // 생활서비스
  "부동산": "SERVICE_REALESTATE",
  "세탁소": "SERVICE_LAUNDRY",
  "이발소/미용실": "SERVICE_HAIR",
  "목욕탕/사우나": "SERVICE_BATH",
  "수리서비스": "SERVICE_REPAIR",
  "사진관": "SERVICE_PHOTO",
  "통신서비스": "SERVICE_TELECOM",
  "기타서비스": "SERVICE_OTHER",
  
  // 공공/기관
  "관공서": "PUBLIC_GOVERNMENT",
  "우체국": "PUBLIC_POST",
  "공공시설": "PUBLIC_FACILITY",
  "복지시설": "PUBLIC_WELFARE",
  "기타공공": "PUBLIC_OTHER"
}