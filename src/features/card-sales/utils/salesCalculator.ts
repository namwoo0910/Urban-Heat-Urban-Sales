/**
 * 매출액 계산 유틸리티
 * 모든 컴포넌트에서 일관된 매출 계산을 보장
 */

import { formatSimpleCurrency } from '@/src/shared/utils/salesFormatter'

/**
 * 업종별 매출 데이터에서 총 매출액 계산
 * @param salesByCategory 업종별 매출 객체
 * @returns 총 매출액
 */
export function calculateTotalSales(
  salesByCategory: Record<string, number> | undefined | null
): number {
  if (!salesByCategory) {
    console.log('[SalesCalculator] salesByCategory is null/undefined')
    return 0
  }

  let total = 0
  Object.entries(salesByCategory).forEach(([category, amount]) => {
    // sub_ 로 시작하는 서브카테고리는 제외 (중복 방지)
    if (typeof amount === 'number' && amount > 0 && !category.startsWith('sub_')) {
      total += amount
    }
  })

  console.log(`[SalesCalculator] 총 매출 계산: ${total.toLocaleString()}원 (${Object.keys(salesByCategory).length}개 카테고리)`)
  return total
}

/**
 * 특정 업종의 매출액 계산
 * @param salesByCategory 업종별 매출 객체
 * @param businessType 업종명
 * @returns 해당 업종 매출액
 */
export function calculateBusinessTypeSales(
  salesByCategory: Record<string, number> | undefined | null,
  businessType: string | null
): number {
  if (!salesByCategory || !businessType) {
    return 0
  }

  const sales = salesByCategory[businessType] || 0
  console.log(`[SalesCalculator] ${businessType} 매출: ${sales.toLocaleString()}원`)
  return sales
}

/**
 * 상위 N개 업종 추출
 * @param salesByCategory 업종별 매출 객체
 * @param topN 추출할 상위 업종 수
 * @returns 상위 업종 배열
 */
export function getTopBusinessTypes(
  salesByCategory: Record<string, number> | undefined | null,
  topN: number = 10
): Array<{ name: string; value: number; percentage: number }> {
  if (!salesByCategory) {
    return []
  }

  const totalSales = calculateTotalSales(salesByCategory)
  
  const sorted = Object.entries(salesByCategory)
    .filter(([cat, sales]) => sales && sales > 0 && !cat.startsWith('sub_'))
    .sort(([, a], [, b]) => (b || 0) - (a || 0))
    .slice(0, topN)
    .map(([name, value]) => ({
      name,
      value,
      percentage: totalSales > 0 ? (value / totalSales) * 100 : 0
    }))

  console.log(`[SalesCalculator] 상위 ${topN}개 업종 추출 완료`)
  return sorted
}

/**
 * 금액을 읽기 쉬운 형식으로 변환
 * @param value 금액 (원)
 * @returns 포맷된 문자열
 * @deprecated Use formatSimpleCurrency from @/src/shared/utils/salesFormatter instead
 */
export function formatCurrency(value: number): string {
  return formatSimpleCurrency(value)
}