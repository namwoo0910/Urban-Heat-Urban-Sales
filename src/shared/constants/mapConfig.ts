/**
 * @shared 맵박스 설정 상수
 * @description 프로젝트 전체에서 사용되는 맵박스 관련 설정
 */

// Mapbox 액세스 토큰 (환경변수에서만 가져옴)
export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ""

// 토큰이 설정되지 않았을 때 경고
if (!MAPBOX_TOKEN) {
  console.warn("⚠️ MAPBOX_TOKEN이 설정되지 않았습니다. .env.local 파일에 NEXT_PUBLIC_MAPBOX_TOKEN을 설정해주세요.")
}

// 기본 맵 스타일
export const MAP_STYLES = {
  dark: "mapbox://styles/mapbox/dark-v11",
  light: "mapbox://styles/mapbox/light-v11",
  streets: "mapbox://styles/mapbox/streets-v12",
  satellite: "mapbox://styles/mapbox/satellite-streets-v12"
}

// 프로젝트 기본 테마 (다크 테마로 통일)
export const DEFAULT_MAP_STYLE = MAP_STYLES.dark

// 서울 중심 좌표
export const SEOUL_CENTER = {
  longitude: 126.9780,
  latitude: 37.5665,
  zoom: 10
}

// 서울 경계 박스
export const SEOUL_BOUNDS = {
  minLng: 126.7643,
  maxLng: 127.1836,
  minLat: 37.4288,
  maxLat: 37.7015
}