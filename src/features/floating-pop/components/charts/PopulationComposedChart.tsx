"use client"

import { ComposedChart } from '@/src/shared/components/charts'
import { populationAndDwellData } from '../../data/populationChartData'

export function PopulationComposedChart() {
  return (
    <div className="w-full h-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">유동인구 & 체류시간 복합 분석</h3>
        <p className="text-sm text-gray-400">지역별 유동인구와 평균 체류시간</p>
      </div>
      <ComposedChart
        data={populationAndDwellData}
        xDataKey="name"
        barDataKey="population"
        lineDataKey="dwellTime"
        barColor="#3b82f6"
        lineColor="#ef4444"
        height={280}
        showGrid={true}
        showTooltip={true}
      />
    </div>
  )
}