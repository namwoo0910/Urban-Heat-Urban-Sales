"use client"

import { RadarChart } from '@/src/shared/components/charts'
import { activityPatternData } from '../../data/populationChartData'

export function PopulationRadarChart() {
  return (
    <div className="w-full h-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">시간대별 활동 패턴</h3>
        <p className="text-sm text-gray-400">하루 중 활동 강도 분석</p>
      </div>
      <RadarChart
        data={activityPatternData}
        dataKey="value"
        categoryKey="name"
        fillColor="#ec4899"
        strokeColor="#ec4899"
        height={280}
        showTooltip={true}
      />
    </div>
  )
}