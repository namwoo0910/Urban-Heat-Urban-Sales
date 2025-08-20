"use client"

import { PieChart } from '@/src/shared/components/charts'
import { ageDistributionData } from '../../data/populationChartData'

export function PopulationPieChart() {
  return (
    <div className="w-full h-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">연령대별 유동인구 분포</h3>
        <p className="text-sm text-gray-400">전체 유동인구 대비 비율</p>
      </div>
      <PieChart
        data={ageDistributionData}
        dataKey="value"
        nameKey="name"
        height={280}
        showTooltip={true}
        showLegend={true}
      />
    </div>
  )
}