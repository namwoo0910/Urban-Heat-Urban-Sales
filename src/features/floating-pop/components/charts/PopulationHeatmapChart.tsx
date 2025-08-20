"use client"

import { HeatmapChart } from '@/src/shared/components/charts'
import { populationHeatmapData } from '../../data/populationChartData'

export function PopulationHeatmapChart() {
  return (
    <div className="w-full h-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">시간대별 지역 밀도 히트맵</h3>
        <p className="text-sm text-gray-400">24시간 주요 지역 유동인구 밀도</p>
      </div>
      <HeatmapChart
        data={populationHeatmapData.data}
        xLabels={populationHeatmapData.xLabels}
        yLabels={populationHeatmapData.yLabels}
        height={280}
        colorScheme="green"
      />
    </div>
  )
}