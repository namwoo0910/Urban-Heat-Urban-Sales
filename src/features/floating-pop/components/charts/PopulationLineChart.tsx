"use client"

import { LineChart } from '@/src/shared/components/charts'
import { dailySalesData } from '../../data/salesChartData'

export function PopulationLineChart() {
  return (
    <div className="w-full h-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">일별 매출 추이</h3>
        <p className="text-sm text-gray-400">최근 12일간 매출 동향</p>
      </div>
      <LineChart
        data={dailySalesData}
        xDataKey="name"
        yDataKey="value"
        strokeColor="#3b82f6"
        height={280}
        showGrid={true}
        showTooltip={true}
        dot={true}
        curved={true}
      />
    </div>
  )
}