"use client"

import { RadarChart } from '@/src/shared/components/charts'
import { weeklyPatternData } from '../../data/salesChartData'

export function PopulationRadarChart() {
  return (
    <div className="w-full h-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">요일별 매출 패턴</h3>
        <p className="text-sm text-gray-400">주간 매출 분포 분석</p>
      </div>
      <RadarChart
        data={weeklyPatternData}
        dataKey="value"
        height={280}
        showTooltip={true}
        fillColor="#8b5cf6"
        strokeColor="#8b5cf6"
        fillOpacity={0.6}
      />
    </div>
  )
}