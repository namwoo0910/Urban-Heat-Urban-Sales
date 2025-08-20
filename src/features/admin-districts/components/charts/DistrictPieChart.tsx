"use client"

import { PieChart } from '@/src/shared/components/charts'
import { districtAreaData } from '../../data/districtChartData'

export function DistrictPieChart() {
  return (
    <div className="w-full h-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">행정구역 면적 비율</h3>
        <p className="text-sm text-gray-400">주요 구별 면적 분포</p>
      </div>
      <PieChart
        data={districtAreaData}
        dataKey="value"
        nameKey="name"
        height={280}
        showTooltip={true}
        showLegend={true}
      />
    </div>
  )
}