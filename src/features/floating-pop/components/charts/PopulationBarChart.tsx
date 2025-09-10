"use client"

import { useMemo } from 'react'
import { BarChart } from '@/src/shared/components/charts'
import { categorySalesData } from '../../data/salesChartData'
import { useLayerState } from '../../hooks/useCardSalesData'
import { COLOR_RANGES } from '../../utils/premiumColors'

export function PopulationBarChart() {
  const { layerConfig } = useLayerState()
  const colorScheme = layerConfig.colorScheme
  
  // 색상 스키마에 맞춰 데이터 색상 업데이트
  const enhancedData = useMemo(() => {
    const colors = COLOR_RANGES[colorScheme]
    if (!colors) return categorySalesData
    
    return categorySalesData.map((item, index) => ({
      ...item,
      // 색상 스키마의 색상을 RGB에서 HEX로 변환
      color: `rgb(${colors[index % colors.length].join(',')})`
    }))
  }, [colorScheme])
  
  return (
    <div className="w-full h-full flex flex-col">
      <div className="mb-2 flex-shrink-0">
        <h3 className="text-base font-semibold text-white">업종별 매출 분석</h3>
        <p className="text-xs text-gray-400">카테고리별 매출 비교</p>
      </div>
      <div className="flex-1 min-h-0">
        <BarChart
          data={enhancedData}
          xDataKey="name"
          yDataKey="value"
          width="100%"
          height="100%"
          showGrid={true}
          showTooltip={true}
          barSize={35}
        />
      </div>
    </div>
  )
}