/**
 * @shared 맵박스 설정 상수
 * @description 프로젝트 전체에서 사용되는 맵박스 관련 설정
 */

// Mapbox 액세스 토큰 (환경변수 우선, 하드코딩된 값은 폴백)
export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 
  "pk.eyJ1IjoieXN1MTUxNiIsImEiOiJjbWRyMHR2bTQwOTB2MmlzOGdlZmFldnVnIn0.Rv_I_4s0u88CYd7r9JbZDA"

// 기본 맵 스타일
export const MAP_STYLES = {
  dark: "mapbox://styles/mapbox/dark-v11",
  light: "mapbox://styles/mapbox/light-v11",
  streets: "mapbox://styles/mapbox/streets-v12",
  satellite: "mapbox://styles/mapbox/satellite-streets-v12"
}

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