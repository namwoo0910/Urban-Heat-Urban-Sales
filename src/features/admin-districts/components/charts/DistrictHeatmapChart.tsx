"use client"

import { HeatmapChart } from '@/src/shared/components/charts'
import { districtActivityHeatmap } from '../../data/districtChartData'

export function DistrictHeatmapChart() {
  return (
    <div className="w-full h-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">시간대별 구역 활동 밀도</h3>
        <p className="text-sm text-gray-400">24시간 주요 구 활동 패턴</p>
      </div>
      <HeatmapChart
        data={districtActivityHeatmap.data}
        xLabels={districtActivityHeatmap.xLabels}
        yLabels={districtActivityHeatmap.yLabels}
        height={280}
        colorScheme="purple"
      />
    </div>
  )
}