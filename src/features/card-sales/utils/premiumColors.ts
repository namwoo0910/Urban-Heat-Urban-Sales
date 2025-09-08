/**
 * Premium Color Palettes for HexagonLayer
 * 세련되고 현대적인 색상 팔레트 컬렉션
 */

import type { CSSProperties } from 'react'

export type ColorRange = [number, number, number][]

// 기존 색상 팔레트 (LayerManager에서 이동)
const CLASSIC_COLOR_RANGES = {
  heat: [
    [1, 152, 189],
    [73, 227, 206], 
    [216, 254, 181],
    [254, 237, 177],
    [254, 173, 84],
    [209, 55, 78]
  ] as ColorRange,
  ocean: [
    [12, 44, 132],
    [34, 94, 168],
    [29, 145, 192],
    [65, 182, 196],
    [127, 205, 187],
    [199, 233, 180]
  ] as ColorRange,
  neon: [
    [20, 20, 20],
    [128, 0, 128],
    [255, 0, 128],
    [255, 64, 255],
    [128, 255, 0],
    [0, 255, 255]
  ] as ColorRange,
  fire: [
    [8, 2, 84],
    [66, 3, 94],
    [106, 7, 91],
    [144, 17, 83],
    [181, 34, 69],
    [213, 62, 54],
    [244, 109, 42],
    [254, 174, 50]
  ] as ColorRange
} as const

// 프리미엄 색상 팔레트 (새로 추가)
const PREMIUM_COLOR_RANGES = {
  // 홀로그램 - 보라에서 시안으로 그라데이션
  hologram: [
    [40, 0, 80],      // 진보라
    [80, 0, 160],     // 보라
    [120, 40, 200],   // 연보라
    [160, 80, 240],   // 라벤더
    [200, 120, 255],  // 연시안
    [240, 160, 255]   // 밝은 시안
  ] as ColorRange,
  
  // 오로라 - 북극광 스타일 다채로운 색상
  aurora: [
    [255, 20, 147],   // 핫핑크
    [138, 43, 226],   // 블루바이올렛
    [75, 0, 130],     // 인디고
    [72, 61, 139],    // 다크슬레이트블루
    [0, 100, 0],      // 다크그린
    [173, 255, 47]    // 그린옐로우
  ] as ColorRange,
  
  // 사이버펑크 - 네온 핑크와 시안 조합
  cyberpunk: [
    [20, 20, 30],     // 다크네이비
    [255, 0, 150],    // 네온 핑크
    [255, 20, 147],   // 딥핑크
    [138, 43, 226],   // 블루바이올렛
    [0, 255, 255],    // 시안
    [255, 255, 255]   // 화이트
  ] as ColorRange,
  
  // 석양 - 따뜻한 일몰 색상
  sunset: [
    [255, 94, 77],    // 코랄
    [255, 154, 0],    // 다크오렌지
    [255, 206, 84],   // 골드
    [163, 73, 164],   // 미디엄오키드
    [63, 81, 181],    // 로얄블루
    [25, 25, 112]     // 미드나잇블루
  ] as ColorRange,
  
  // 심해 - 깊은 바다에서 얕은 바다로
  oceanic: [
    [8, 24, 58],      // 심해 다크블루
    [12, 44, 132],    // 딥블루
    [34, 94, 168],    // 스틸블루
    [29, 145, 192],   // 도지블루
    [65, 182, 196],   // 미디엄터쿼이즈
    [199, 233, 180]   // 페일터쿼이즈
  ] as ColorRange
} as const

// 모노톤 색상 팔레트 (단색 계열)
const MONOTONE_COLOR_RANGES = {
  // 미드나이트 블루 - 깊은 남색 단색 그라데이션
  midnight: [
    [10, 10, 30],     // 아주 진한 남색
    [15, 15, 50],     // 진한 남색
    [25, 25, 80],     // 남색
    [35, 35, 110],    // 중간 남색
    [45, 45, 140],    // 밝은 남색
    [60, 60, 170]     // 아주 밝은 남색
  ] as ColorRange,
  
  // 에메랄드 - 고급스러운 에메랄드 그린
  emerald: [
    [0, 40, 30],      // 아주 진한 에메랄드
    [0, 60, 45],      // 진한 에메랄드
    [0, 90, 65],      // 에메랄드
    [0, 120, 85],     // 중간 에메랄드
    [0, 150, 105],    // 밝은 에메랄드
    [0, 180, 125]     // 아주 밝은 에메랄드
  ] as ColorRange,
  
  // 루비 - 고급스러운 루비 레드
  ruby: [
    [60, 0, 20],      // 아주 진한 루비
    [90, 0, 30],      // 진한 루비
    [130, 0, 45],     // 루비
    [170, 0, 60],     // 중간 루비
    [210, 0, 75],     // 밝은 루비
    [240, 0, 90]      // 아주 밝은 루비
  ] as ColorRange,
  
  // 자수정 - 신비로운 보라색
  amethyst: [
    [40, 0, 60],      // 아주 진한 자수정
    [60, 0, 90],      // 진한 자수정
    [80, 0, 120],     // 자수정
    [100, 0, 150],    // 중간 자수정
    [120, 0, 180],    // 밝은 자수정
    [140, 0, 210]     // 아주 밝은 자수정
  ] as ColorRange,
  
  // 골드 - 황금빛 그라데이션
  gold: [
    [80, 60, 0],      // 아주 진한 금색
    [120, 90, 0],     // 진한 금색
    [160, 120, 0],    // 금색
    [200, 150, 0],    // 중간 금색
    [240, 180, 0],    // 밝은 금색
    [255, 210, 0]     // 아주 밝은 금색
  ] as ColorRange,
  
  // 실버 - 은빛 그라데이션
  silver: [
    [60, 60, 65],     // 아주 진한 은색
    [90, 90, 95],     // 진한 은색
    [120, 120, 125],  // 은색
    [150, 150, 155],  // 중간 은색
    [180, 180, 185],  // 밝은 은색
    [210, 210, 215]   // 아주 밝은 은색
  ] as ColorRange,
  
  // 오렌지 - 따뜻한 주황색 그라데이션
  orange: [
    [80, 40, 0],      // 아주 진한 주황
    [120, 60, 0],     // 진한 주황
    [160, 80, 0],     // 중간 진한 주황
    [200, 100, 0],    // 주황
    [240, 120, 0],    // 밝은 주황
    [255, 150, 30]    // 아주 밝은 주황
  ] as ColorRange,
  
  // 틸블루 - 오렌지와 보색 관계의 청록색 그라데이션
  tealblue: [
    [0, 40, 50],      // 아주 진한 틸
    [0, 60, 75],      // 진한 틸
    [0, 80, 100],     // 중간 진한 틸
    [0, 120, 140],    // 틸블루
    [0, 160, 180],    // 밝은 틸블루
    [0, 200, 220]     // 아주 밝은 틸블루
  ] as ColorRange
} as const

// 글로우 효과 색상 팔레트 (빛나는 효과)
const GLOW_COLOR_RANGES = {
  // 네온 블루 - 빛나는 청색
  neonBlue: [
    [0, 0, 20],       // 거의 검정
    [0, 20, 60],      // 아주 진한 파랑
    [0, 60, 150],     // 진한 파랑
    [0, 120, 255],    // 밝은 파랑
    [100, 180, 255],  // 빛나는 파랑
    [200, 230, 255]   // 흰색에 가까운 파랑
  ] as ColorRange,
  
  // 네온 핑크 - 빛나는 분홍
  neonPink: [
    [20, 0, 10],      // 거의 검정
    [60, 0, 30],      // 아주 진한 분홍
    [150, 0, 75],     // 진한 분홍
    [255, 0, 127],    // 밝은 분홍
    [255, 100, 180],  // 빛나는 분홍
    [255, 200, 230]   // 흰색에 가까운 분홍
  ] as ColorRange,
  
  // 네온 그린 - 빛나는 녹색
  neonGreen: [
    [0, 20, 0],       // 거의 검정
    [0, 60, 0],       // 아주 진한 초록
    [0, 150, 0],      // 진한 초록
    [0, 255, 0],      // 밝은 초록
    [100, 255, 100],  // 빛나는 초록
    [200, 255, 200]   // 흰색에 가까운 초록
  ] as ColorRange,
  
  // 플라즈마 글로우 - 플라즈마 효과
  plasmaGlow: [
    [10, 0, 20],      // 거의 검정
    [50, 0, 100],     // 진한 보라
    [100, 0, 200],    // 보라
    [150, 50, 255],   // 밝은 보라
    [200, 150, 255],  // 빛나는 보라
    [240, 220, 255]   // 흰색에 가까운 보라
  ] as ColorRange,
  
  // 라바 글로우 - 용암 효과
  lavaGlow: [
    [20, 0, 0],       // 거의 검정
    [80, 0, 0],       // 아주 진한 빨강
    [180, 20, 0],     // 진한 빨강
    [255, 80, 0],     // 오렌지
    [255, 180, 0],    // 밝은 오렌지
    [255, 255, 100]   // 노란색에 가까운 흰색
  ] as ColorRange
} as const

// 그라데이션 색상 팔레트 (부드러운 전환)
const GRADIENT_COLOR_RANGES = {
  // 아주르 - 하늘색 그라데이션
  azure: [
    [230, 240, 255],  // 아주 연한 하늘색
    [200, 220, 250],  // 연한 하늘색
    [150, 190, 240],  // 하늘색
    [100, 160, 230],  // 중간 하늘색
    [50, 130, 220],   // 진한 하늘색
    [0, 100, 210]     // 아주 진한 하늘색
  ] as ColorRange,
  
  // 코랄 - 산호색 그라데이션
  coral: [
    [255, 230, 220],  // 아주 연한 산호색
    [255, 200, 180],  // 연한 산호색
    [255, 160, 140],  // 산호색
    [255, 120, 100],  // 중간 산호색
    [255, 80, 60],    // 진한 산호색
    [255, 40, 20]     // 아주 진한 산호색
  ] as ColorRange,
  
  // 제이드 - 옥색 그라데이션
  jade: [
    [220, 255, 240],  // 아주 연한 옥색
    [180, 240, 210],  // 연한 옥색
    [140, 220, 180],  // 옥색
    [100, 200, 150],  // 중간 옥색
    [60, 180, 120],   // 진한 옥색
    [20, 160, 90]     // 아주 진한 옥색
  ] as ColorRange,
  
  // 라벤더 - 연보라 그라데이션
  lavender: [
    [245, 240, 255],  // 아주 연한 라벤더
    [225, 210, 250],  // 연한 라벤더
    [205, 180, 245],  // 라벤더
    [185, 150, 240],  // 중간 라벤더
    [165, 120, 235],  // 진한 라벤더
    [145, 90, 230]    // 아주 진한 라벤더
  ] as ColorRange,
  
  // 피치 - 복숭아색 그라데이션
  peach: [
    [255, 245, 235],  // 아주 연한 복숭아
    [255, 230, 210],  // 연한 복숭아
    [255, 210, 180],  // 복숭아
    [255, 190, 150],  // 중간 복숭아
    [255, 170, 120],  // 진한 복숭아
    [255, 150, 90]    // 아주 진한 복숭아
  ] as ColorRange
} as const

// 기후 관련 색상 팔레트 (새로 추가)
const CLIMATE_COLOR_RANGES = {
  // 기온 그라데이션 (한파 → 일반 → 온화 → 폭염)
  temperature: [
    [0, 100, 255],    // 한파 (파랑)
    [0, 150, 200],    // 차가움 (청록)
    [0, 200, 100],    // 일반 (초록)
    [150, 200, 0],    // 온화 (연두)
    [255, 200, 0],    // 따뜻함 (노랑)
    [255, 50, 0]      // 폭염 (빨강)
  ] as ColorRange,
  
  // 불쾌지수 그라데이션 (쾌적 → 보통 → 불쾌)
  discomfort: [
    [0, 200, 0],      // 매우 쾌적 (초록)
    [100, 255, 100],  // 쾌적 (연초록)
    [255, 255, 0],    // 보통 (노랑)
    [255, 150, 0],    // 약간 불쾌 (주황)
    [255, 50, 0],     // 불쾌 (빨강)
    [200, 0, 0]       // 매우 불쾌 (진빨강)
  ] as ColorRange,
  
  // 기후 경보 (정상 → 주의보 → 경보)
  alert: [
    [100, 100, 100],  // 정상 (회색)
    [150, 150, 150],  // 정상 (밝은 회색)
    [255, 200, 0],    // 주의 (노랑)
    [255, 165, 0],    // 주의보 (주황)
    [255, 50, 0],     // 경보 (빨강)
    [200, 0, 0]       // 심각 (진빨강)
  ] as ColorRange,
  
  // 강수량 그라데이션 (없음 → 많음)
  precipitation: [
    [255, 255, 200],  // 없음 (밝은 노랑)
    [200, 200, 255],  // 약간 (연한 파랑)
    [150, 150, 255],  // 보통 (파랑)
    [100, 100, 255],  // 많음 (진한 파랑)
    [50, 50, 200],    // 매우 많음 (진파랑)
    [0, 0, 150]       // 폭우 (짙은 파랑)
  ] as ColorRange
} as const

// 기온그룹별 고정 색상 (한파, 일반, 온화, 폭염)
export const TEMPERATURE_GROUP_COLORS = {
  '한파': [0, 100, 255],     // 파랑
  '일반': [0, 200, 100],     // 초록
  '온화': [255, 200, 0],     // 노랑
  '폭염': [255, 50, 0]       // 빨강
} as const

// 전체 색상 팔레트 통합
export const COLOR_RANGES = {
  ...CLASSIC_COLOR_RANGES,
  ...PREMIUM_COLOR_RANGES,
  ...CLIMATE_COLOR_RANGES,
  ...MONOTONE_COLOR_RANGES,
  ...GLOW_COLOR_RANGES,
  ...GRADIENT_COLOR_RANGES
} as const

export type ColorScheme = keyof typeof COLOR_RANGES

// 색상 팔레트 메타데이터
export const COLOR_PALETTE_INFO = {
  // 클래식 팔레트
  heat: {
    name: "Heat (열)",
    description: "파랑에서 빨강으로 변하는 클래식 히트맵",
    category: "classic",
    gradient: "from-blue-500 to-red-500"
  },
  ocean: {
    name: "Ocean (바다)", 
    description: "깊은 바다에서 얕은 바다로",
    category: "classic",
    gradient: "from-blue-900 to-cyan-400"
  },
  neon: {
    name: "Neon (네온)",
    description: "어두운 배경의 네온 색상",
    category: "classic", 
    gradient: "from-purple-500 to-cyan-400"
  },
  fire: {
    name: "Fire (불)",
    description: "불꽃 같은 강렬한 색상",
    category: "classic",
    gradient: "from-purple-900 to-yellow-400"
  },
  
  // 프리미엄 팔레트
  hologram: {
    name: "Hologram (홀로그램)",
    description: "미래적이고 세련된 홀로그램 효과",
    category: "premium",
    gradient: "from-purple-600 via-blue-500 to-cyan-300"
  },
  aurora: {
    name: "Aurora (오로라)",
    description: "신비로운 북극광의 다채로운 색상",
    category: "premium", 
    gradient: "from-pink-500 via-purple-600 via-blue-600 to-green-400"
  },
  cyberpunk: {
    name: "Cyberpunk (사이버펑크)",
    description: "네온사인이 가득한 미래 도시",
    category: "premium",
    gradient: "from-gray-900 via-pink-500 via-purple-500 to-cyan-400"
  },
  sunset: {
    name: "Sunset (석양)",
    description: "따뜻하고 로맨틱한 일몰 색상",
    category: "premium",
    gradient: "from-orange-400 via-pink-500 via-purple-600 to-blue-800"
  },
  oceanic: {
    name: "Oceanic (심해)",
    description: "신비로운 깊은 바다의 그라데이션", 
    category: "premium",
    gradient: "from-blue-900 via-blue-600 via-teal-400 to-cyan-200"
  },
  
  // 기후 팔레트
  temperature: {
    name: "Temperature (기온)",
    description: "한파에서 폭염까지 기온 변화",
    category: "climate",
    gradient: "from-blue-500 via-green-500 via-yellow-400 to-red-500"
  },
  discomfort: {
    name: "Discomfort (불쾌지수)",
    description: "쾌적함에서 불쾌함까지",
    category: "climate",
    gradient: "from-green-500 via-yellow-400 to-red-600"
  },
  alert: {
    name: "Alert (경보)",
    description: "정상에서 경보까지 단계별 표시",
    category: "climate",
    gradient: "from-gray-400 via-yellow-400 via-orange-500 to-red-600"
  },
  precipitation: {
    name: "Precipitation (강수량)",
    description: "맑음에서 폭우까지 강수량 표시",
    category: "climate",
    gradient: "from-yellow-200 via-blue-400 to-blue-800"
  },
  
  // 모노톤 팔레트
  midnight: {
    name: "Midnight (미드나이트)",
    description: "깊고 신비로운 남색 단색 그라데이션",
    category: "monotone",
    gradient: "from-blue-950 to-blue-600"
  },
  emerald: {
    name: "Emerald (에메랄드)",
    description: "고급스러운 에메랄드 그린 단색",
    category: "monotone",
    gradient: "from-emerald-900 to-emerald-400"
  },
  ruby: {
    name: "Ruby (루비)",
    description: "강렬한 루비 레드 단색",
    category: "monotone",
    gradient: "from-red-900 to-red-400"
  },
  amethyst: {
    name: "Amethyst (자수정)",
    description: "신비로운 보라색 단색",
    category: "monotone",
    gradient: "from-purple-900 to-purple-400"
  },
  gold: {
    name: "Gold (골드)",
    description: "황금빛 단색 그라데이션",
    category: "monotone",
    gradient: "from-yellow-800 to-yellow-400"
  },
  silver: {
    name: "Silver (실버)",
    description: "은빛 단색 그라데이션",
    category: "monotone",
    gradient: "from-gray-700 to-gray-300"
  },
  
  // 글로우 팔레트
  neonBlue: {
    name: "Neon Blue (네온 블루)",
    description: "빛나는 청색 글로우 효과",
    category: "glow",
    gradient: "from-black via-blue-600 to-blue-200"
  },
  neonPink: {
    name: "Neon Pink (네온 핑크)",
    description: "빛나는 분홍색 글로우 효과",
    category: "glow",
    gradient: "from-black via-pink-500 to-pink-200"
  },
  neonGreen: {
    name: "Neon Green (네온 그린)",
    description: "빛나는 녹색 글로우 효과",
    category: "glow",
    gradient: "from-black via-green-500 to-green-200"
  },
  plasmaGlow: {
    name: "Plasma (플라즈마)",
    description: "플라즈마 빛 효과",
    category: "glow",
    gradient: "from-black via-purple-500 to-purple-200"
  },
  lavaGlow: {
    name: "Lava (라바)",
    description: "용암처럼 빛나는 효과",
    category: "glow",
    gradient: "from-black via-orange-600 to-yellow-300"
  },
  
  // 그라데이션 팔레트
  azure: {
    name: "Azure (아주르)",
    description: "부드러운 하늘색 그라데이션",
    category: "gradient",
    gradient: "from-sky-100 to-sky-700"
  },
  coral: {
    name: "Coral (코랄)",
    description: "부드러운 산호색 그라데이션",
    category: "gradient",
    gradient: "from-orange-100 to-orange-600"
  },
  jade: {
    name: "Jade (제이드)",
    description: "부드러운 옥색 그라데이션",
    category: "gradient",
    gradient: "from-teal-100 to-teal-700"
  },
  lavender: {
    name: "Lavender (라벤더)",
    description: "부드러운 연보라 그라데이션",
    category: "gradient",
    gradient: "from-purple-100 to-purple-600"
  },
  peach: {
    name: "Peach (피치)",
    description: "부드러운 복숭아색 그라데이션",
    category: "gradient",
    gradient: "from-orange-100 to-orange-500"
  }
} as const

// 색상 팔레트 미리보기 CSS 생성
export const getColorPreviewStyle = (scheme: ColorScheme): CSSProperties => {
  const colors = COLOR_RANGES[scheme]
  
  // undefined 체크 - 기본값으로 oceanic 사용
  if (!colors) {
    console.warn(`[getColorPreviewStyle] Unknown color scheme: ${scheme}, using oceanic as fallback`)
    const fallbackColors = COLOR_RANGES.oceanic
    const rgbColors = fallbackColors.map(([r, g, b]) => `rgb(${r}, ${g}, ${b})`).join(', ')
    return {
      background: `linear-gradient(to right, ${rgbColors})`
    }
  }
  
  const rgbColors = colors.map(([r, g, b]) => `rgb(${r}, ${g}, ${b})`).join(', ')
  return {
    background: `linear-gradient(to right, ${rgbColors})`
  }
}

export default COLOR_RANGES