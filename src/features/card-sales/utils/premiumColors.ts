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
  ...CLIMATE_COLOR_RANGES
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
  }
} as const

// 색상 팔레트 미리보기 CSS 생성
export const getColorPreviewStyle = (scheme: ColorScheme): CSSProperties => {
  const colors = COLOR_RANGES[scheme]
  const rgbColors = colors.map(([r, g, b]) => `rgb(${r}, ${g}, ${b})`).join(', ')
  return {
    background: `linear-gradient(to right, ${rgbColors})`
  }
}

export default COLOR_RANGES