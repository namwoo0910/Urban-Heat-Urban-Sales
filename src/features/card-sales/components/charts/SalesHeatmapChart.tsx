"use client"

import { HeatmapChart } from '@/src/shared/components/charts'
import { salesHeatmapData } from '../../data/salesChartData'

export function SalesHeatmapChart() {
  return (
    <div className="w-full h-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">시간대별 매출 히트맵</h3>
        <p className="text-sm text-gray-400">요일/시간별 매출 밀도</p>
      </div>
      <HeatmapChart
        data={salesHeatmapData.data}
        xLabels={salesHeatmapData.xLabels}
        yLabels={salesHeatmapData.yLabels}
        height={280}
        colorScale={['#1e293b', '#3b82f6', '#60a5fa', '#fbbf24', '#ef4444']}
      />
    </div>
  )
}