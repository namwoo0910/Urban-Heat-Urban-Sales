"use client"

import { ComposedChart } from '@/src/shared/components/charts'
import { populationDensityData } from '../../data/districtChartData'

export function DistrictComposedChart() {
  return (
    <div className="w-full h-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">인구 & 인구밀도 복합 분석</h3>
        <p className="text-sm text-gray-400">주요 구별 인구와 밀도 비교</p>
      </div>
      <ComposedChart
        data={populationDensityData}
        xDataKey="name"
        barDataKey="population"
        lineDataKey="density"
        barColor="#6366f1"
        lineColor="#10b981"
        height={280}
        showGrid={true}
        showTooltip={true}
      />
    </div>
  )
}