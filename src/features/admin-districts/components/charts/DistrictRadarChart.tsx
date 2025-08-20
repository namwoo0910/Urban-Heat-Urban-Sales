"use client"

import { RadarChart } from '@/src/shared/components/charts'
import { districtCharacteristics } from '../../data/districtChartData'

export function DistrictRadarChart() {
  return (
    <div className="w-full h-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">행정구역 특성 분석</h3>
        <p className="text-sm text-gray-400">다차원 지표 비교</p>
      </div>
      <RadarChart
        data={districtCharacteristics}
        dataKey="value"
        categoryKey="name"
        fillColor="#f59e0b"
        strokeColor="#f59e0b"
        height={280}
        showTooltip={true}
      />
    </div>
  )
}