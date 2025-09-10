"use client"

import { AreaChart } from '@/src/shared/components/charts'
import { cumulativeSalesData } from '../../data/salesChartData'

export function PopulationAreaChart() {
  return (
    <div className="w-full h-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">누적 매출 현황</h3>
        <p className="text-sm text-gray-400">월별 누적 매출 성장률</p>
      </div>
      <AreaChart
        data={cumulativeSalesData}
        xDataKey="name"
        yDataKey="value"
        fillColor="#10b981"
        strokeColor="#10b981"
        height={280}
        showGrid={true}
        showTooltip={true}
        gradient={true}
      />
    </div>
  )
}