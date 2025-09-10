/**
 * 서울시 25개 자치구 중심점 좌표 및 라벨 스타일 설정
 */

export interface DistrictLabel {
  name: string
  nameKr: string
  coordinates: [number, number]
  anchor?: 'center' | 'left' | 'right' | 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  offset?: [number, number]
}

export const DISTRICT_LABELS: DistrictLabel[] = [
  { name: 'Gangnam-gu', nameKr: '강남구', coordinates: [127.0475, 37.5173] },
  { name: 'Gangdong-gu', nameKr: '강동구', coordinates: [127.1239, 37.5302] },
  { name: 'Gangbuk-gu', nameKr: '강북구', coordinates: [127.0258, 37.6397] },
  { name: 'Gangseo-gu', nameKr: '강서구', coordinates: [126.8497, 37.5509] },
  { name: 'Gwanak-gu', nameKr: '관악구', coordinates: [126.9515, 37.4784] },
  { name: 'Gwangjin-gu', nameKr: '광진구', coordinates: [127.0824, 37.5385] },
  { name: 'Guro-gu', nameKr: '구로구', coordinates: [126.8874, 37.4954] },
  { name: 'Geumcheon-gu', nameKr: '금천구', coordinates: [126.8956, 37.4567] },
  { name: 'Nowon-gu', nameKr: '노원구', coordinates: [127.0564, 37.6543] },
  { name: 'Dobong-gu', nameKr: '도봉구', coordinates: [127.0473, 37.6688] },
  { name: 'Dongdaemun-gu', nameKr: '동대문구', coordinates: [127.0397, 37.5744] },
  { name: 'Dongjak-gu', nameKr: '동작구', coordinates: [126.9395, 37.5124] },
  { name: 'Mapo-gu', nameKr: '마포구', coordinates: [126.9016, 37.5663] },
  { name: 'Seodaemun-gu', nameKr: '서대문구', coordinates: [126.9368, 37.5791] },
  { name: 'Seocho-gu', nameKr: '서초구', coordinates: [127.0327, 37.4836] },
  { name: 'Seongdong-gu', nameKr: '성동구', coordinates: [127.0369, 37.5634] },
  { name: 'Seongbuk-gu', nameKr: '성북구', coordinates: [127.0186, 37.5894] },
  { name: 'Songpa-gu', nameKr: '송파구', coordinates: [127.1055, 37.5146] },
  { name: 'Yangcheon-gu', nameKr: '양천구', coordinates: [126.8665, 37.5170] },
  { name: 'Yeongdeungpo-gu', nameKr: '영등포구', coordinates: [126.8965, 37.5264] },
  { name: 'Yongsan-gu', nameKr: '용산구', coordinates: [126.9907, 37.5326] },
  { name: 'Eunpyeong-gu', nameKr: '은평구', coordinates: [126.9289, 37.6028] },
  { name: 'Jongno-gu', nameKr: '종로구', coordinates: [126.9797, 37.5735] },
  { name: 'Jung-gu', nameKr: '중구', coordinates: [126.9979, 37.5641] },
  { name: 'Jungnang-gu', nameKr: '중랑구', coordinates: [127.0939, 37.6063] }
]

// 줌 레벨에 따른 폰트 크기 계산
export function getDistrictLabelSize(zoom: number): number {
  if (zoom < 10) return 0 // 숨김
  if (zoom < 11) return 12
  if (zoom < 12) return 14
  if (zoom < 13) return 16
  return 18
}

// 줌 레벨에 따른 불투명도 계산
export function getDistrictLabelOpacity(zoom: number): number {
  if (zoom < 10) return 0
  if (zoom < 10.5) return 0.3
  if (zoom < 11) return 0.6
  return 0.9
}

// 라벨 스타일 설정
export const DISTRICT_LABEL_STYLE = {
  fontFamily: '"Pretendard", "Inter", "Noto Sans KR", -apple-system, BlinkMacSystemFont, sans-serif',
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  textShadow: `
    0 0 10px rgba(0, 0, 0, 0.8),
    0 0 20px rgba(0, 0, 0, 0.6),
    0 2px 4px rgba(0, 0, 0, 0.9)
  `,
  color: '#ffffff',
  backgroundColor: 'rgba(0, 0, 0, 0.4)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  padding: '6px 12px',
  borderRadius: '6px',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  transition: 'all 0.3s ease'
}

// 호버 스타일
export const DISTRICT_LABEL_HOVER_STYLE = {
  ...DISTRICT_LABEL_STYLE,
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  transform: 'scale(1.05)',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
}

// GeoJSON 형식으로 변환
export function getDistrictLabelsGeoJSON() {
  return {
    type: 'FeatureCollection',
    features: DISTRICT_LABELS.map(label => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: label.coordinates
      },
      properties: {
        name: label.name,
        nameKr: label.nameKr,
        anchor: label.anchor || 'center',
        offset: label.offset || [0, 0]
      }
    }))
  }
}