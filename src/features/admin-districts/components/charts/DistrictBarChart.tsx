"use client"

import { BarChart } from '@/src/shared/components/charts'
import { districtPopulationData } from '../../data/districtChartData'

export function DistrictBarChart() {
  return (
    <div className="w-full h-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">구별 인구 비교</h3>
        <p className="text-sm text-gray-400">상위 8개 구 인구 현황</p>
      </div>
      <BarChart
        data={districtPopulationData}
        xDataKey="name"
        yDataKey="value"
        fillColor="#14b8a6"
        height={280}
        showGrid={true}
        showTooltip={true}
      />
    </div>
  )
}