import { useState, useEffect, useMemo } from 'react'

interface MonthlySalesData {
  month: string
  total: number
  categories: { [key: string]: number }
}

interface LocalEconomyDataPoint {
  자치구코드: number
  행정동코드: number
  총매출액: number
  총매출액_업종: { [key: string]: number }
  기준일자: string
}

/**
 * 필터링된 월별 매출 데이터를 로드하고 집계하는 커스텀 훅
 */
export function useFilteredMonthlySales(
  selectedGuCode?: number | null,
  selectedDongCode?: number | null
) {
  const [monthlyData, setMonthlyData] = useState<MonthlySalesData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadAndAggregateData = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const months = [
          '2024-01', '2024-02', '2024-03', '2024-04', '2024-05', '2024-06',
          '2024-07', '2024-08', '2024-09', '2024-10', '2024-11', '2024-12'
        ]
        
        const aggregatedData: MonthlySalesData[] = []
        
        for (const month of months) {
          const response = await fetch(`/data/local_economy/monthly/${month}.json`)
          if (!response.ok) {
            throw new Error(`Failed to load data for ${month}`)
          }
          
          const rawData: LocalEconomyDataPoint[] = await response.json()
          
          // 필터링: 구/동 선택에 따라
          let filteredData = rawData
          
          if (selectedGuCode) {
            filteredData = filteredData.filter(d => d.자치구코드 === selectedGuCode)
          }
          
          if (selectedDongCode) {
            filteredData = filteredData.filter(d => d.행정동코드 === selectedDongCode)
          }
          
          // 집계: 전체 매출과 업종별 매출
          const totalSales = filteredData.reduce((sum, d) => sum + (d.총매출액 || 0), 0)
          
          // 업종별 집계
          const categorySales: { [key: string]: number } = {}
          const businessTypes = new Set<string>()
          
          // 모든 업종 수집
          filteredData.forEach(d => {
            if (d.총매출액_업종) {
              Object.keys(d.총매출액_업종).forEach(type => businessTypes.add(type))
            }
          })
          
          // 업종별 합계 계산
          businessTypes.forEach(type => {
            categorySales[type] = filteredData.reduce((sum, d) => {
              return sum + (d.총매출액_업종?.[type] || 0)
            }, 0)
          })
          
          // 월 이름 포맷 (예: "2024-01" -> "1월")
          const monthNumber = parseInt(month.split('-')[1])
          const monthName = `${monthNumber}월`
          
          aggregatedData.push({
            month: monthName,
            total: totalSales,
            categories: categorySales
          })
        }
        
        console.log('[useFilteredMonthlySales] Aggregated data:', {
          guCode: selectedGuCode,
          dongCode: selectedDongCode,
          dataPoints: aggregatedData.length,
          firstMonth: aggregatedData[0]
        })
        
        setMonthlyData(aggregatedData)
      } catch (err) {
        console.error('[useFilteredMonthlySales] Error loading data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setIsLoading(false)
      }
    }
    
    loadAndAggregateData()
  }, [selectedGuCode, selectedDongCode])
  
  return {
    monthlyData,
    isLoading,
    error
  }
}