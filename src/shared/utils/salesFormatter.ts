/**
 * 매출액을 한국식 단위로 포맷팅
 * @param amount 원 단위 금액
 * @param options 포맷팅 옵션
 * @returns 포맷팅된 금액 문자열
 */
export function formatKoreanCurrency(
  amount: number,
  options: {
    decimals?: number // 소수점 자릿수 (기본값: 자동)
    forceUnit?: '억' | '천만' | '백만' | '만' | '원' // 특정 단위 강제
    showWon?: boolean // '원' 표시 여부 (기본값: true)
  } = {}
): string {
  const { decimals, forceUnit, showWon = true } = options
  const wonSuffix = showWon ? '원' : ''
  
  // 0원 처리
  if (amount === 0) {
    return `0${wonSuffix}`
  }
  
  // 음수 처리
  const sign = amount < 0 ? '-' : ''
  const absAmount = Math.abs(amount)
  
  // 강제 단위가 지정된 경우
  if (forceUnit) {
    switch (forceUnit) {
      case '억':
        return `${sign}${formatWithDecimals(absAmount / 100000000, decimals)}억${wonSuffix}`
      case '천만':
        return `${sign}${formatWithDecimals(absAmount / 10000000, decimals)}천만${wonSuffix}`
      case '백만':
        return `${sign}${formatWithDecimals(absAmount / 1000000, decimals)}백만${wonSuffix}`
      case '만':
        return `${sign}${formatWithDecimals(absAmount / 10000, decimals)}만${wonSuffix}`
      case '원':
        return `${sign}${absAmount.toLocaleString()}${wonSuffix}`
    }
  }
  
  // 자동 단위 선택
  const billion = absAmount / 100000000
  const tenMillion = absAmount / 10000000
  const million = absAmount / 1000000
  const tenThousand = absAmount / 10000
  
  // 10억 이상
  if (billion >= 10) {
    const decimalPlaces = decimals ?? 0
    return `${sign}${formatWithDecimals(billion, decimalPlaces)}억${wonSuffix}`
  }
  // 1억 이상
  else if (billion >= 1) {
    const decimalPlaces = decimals ?? 1
    return `${sign}${formatWithDecimals(billion, decimalPlaces)}억${wonSuffix}`
  }
  // 1천만 이상
  else if (tenMillion >= 1) {
    const decimalPlaces = decimals ?? (tenMillion >= 10 ? 0 : 1)
    return `${sign}${formatWithDecimals(tenMillion, decimalPlaces)}천만${wonSuffix}`
  }
  // 100만 이상
  else if (million >= 1) {
    const decimalPlaces = decimals ?? (million >= 100 ? 0 : 1)
    return `${sign}${formatWithDecimals(million, decimalPlaces)}백만${wonSuffix}`
  }
  // 1만 이상
  else if (tenThousand >= 1) {
    const decimalPlaces = decimals ?? (tenThousand >= 100 ? 0 : 1)
    return `${sign}${formatWithDecimals(tenThousand, decimalPlaces)}만${wonSuffix}`
  }
  // 1만 미만
  else {
    return `${sign}${absAmount.toLocaleString()}${wonSuffix}`
  }
}

/**
 * 숫자를 지정된 소수점 자릿수로 포맷
 */
function formatWithDecimals(value: number, decimals?: number): string {
  if (decimals === undefined) {
    // 자동으로 의미있는 소수점 자릿수 결정
    if (value >= 100) return Math.round(value).toLocaleString()
    if (value >= 10) return value.toFixed(1)
    return value.toFixed(2)
  }
  
  if (decimals === 0) {
    return Math.round(value).toLocaleString()
  }
  
  return value.toFixed(decimals)
}

/**
 * 간단한 포맷팅 (억/천만 단위만)
 */
export function formatSimpleCurrency(amount: number): string {
  const billion = amount / 100000000
  const tenMillion = amount / 10000000
  
  if (billion >= 1) {
    return `${billion.toFixed(1)}억원`
  } else if (tenMillion >= 1) {
    return `${Math.round(tenMillion)}천만원`
  } else {
    const million = amount / 1000000
    return `${million.toFixed(1)}백만원`
  }
}