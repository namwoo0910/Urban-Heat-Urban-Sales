/**
 * Seasonal mesh colors for quarterly periods
 * Q1: Jan–Mar, Q2: Apr–Jun, Q3: Jul–Sep, Q4: Oct–Dec
 */

import type { RGBAColor } from '@deck.gl/core'
import { rgbaToHex } from '@/src/shared/utils/colorUtils'

// Seasonal colors with characteristic tones for a dark map
// Quarter mapping used in this app:
// - 1~3월: 겨울 (Winter)   → 차가운 푸른색
// - 4~6월: 봄 (Spring)    → 화사한 핑크/파스텔
// - 7~9월: 여름 (Summer)  → 뜨거운 레드/오렌지
// - 10~12월: 가을 (Autumn) → 낙엽색(번트 오렌지/브라운)
const SEASONAL_COLORS: Record<'Q1' | 'Q2' | 'Q3' | 'Q4', RGBAColor> = {
  Q1: [145, 200, 255, 255],  // Winter: Cool ice blue (#91C8FF)
  Q2: [255, 154, 213, 255],  // Spring: Bright blossom pink (#FF9AD5)
  Q3: [255, 69, 0, 255],     // Summer: Hot orange-red (#FF4500)
  Q4: [198, 120, 40, 255],   // Autumn: Burnt leaf orange (#C67828)
}

/**
 * Returns seasonal RGBA color for a given month.
 * Accepts 'YYYYMM' or month number (1-12).
 */
export function getSeasonalMeshColor(month: string | number): RGBAColor {
  let m: number
  if (typeof month === 'string') {
    // Extract MM from YYYYMM or handle 'MM'
    const mm = month.length >= 6 ? month.slice(4, 6) : month
    m = parseInt(mm, 10)
  } else {
    m = month
  }

  if (isNaN(m) || m < 1 || m > 12) {
    // Fallback cyan
    return SEASONAL_COLORS.Q1
  }

  if (m >= 1 && m <= 3) return SEASONAL_COLORS.Q1  // Winter
  if (m >= 4 && m <= 6) return SEASONAL_COLORS.Q2  // Spring
  if (m >= 7 && m <= 9) return SEASONAL_COLORS.Q3  // Summer
  return SEASONAL_COLORS.Q4                         // Autumn
}

/**
 * Returns seasonal color as hex string for use in components expecting hex (e.g., deck.gl layer props)
 */
export function getSeasonalMeshHexColor(month: string | number): string {
  const rgba = getSeasonalMeshColor(month)
  return rgbaToHex(rgba as [number, number, number, number])
}
