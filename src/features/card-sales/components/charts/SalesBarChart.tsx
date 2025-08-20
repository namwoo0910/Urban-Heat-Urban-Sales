"use client"

import { BarChart } from '@/src/shared/components/charts'
import { categorySalesData } from '../../data/salesChartData'

export function SalesBarChart() {
  return (
    <div className="w-full h-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">업종별 매출 분석</h3>
        <p className="text-sm text-gray-400">카테고리별 매출 비교</p>
      </div>
      <BarChart
        data={categorySalesData}
        xDataKey="name"
        yDataKey="value"
        height={280}
        showGrid={true}
        showTooltip={true}
        barSize={40}
      />
    </div>
  )
}