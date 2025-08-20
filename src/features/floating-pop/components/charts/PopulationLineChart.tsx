"use client"

import { LineChart } from '@/src/shared/components/charts'
import { hourlyPopulationData } from '../../data/populationChartData'

export function PopulationLineChart() {
  return (
    <div className="w-full h-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">시간대별 유동인구 추이</h3>
        <p className="text-sm text-gray-400">24시간 유동인구 변화 패턴</p>
      </div>
      <LineChart
        data={hourlyPopulationData}
        xDataKey="name"
        yDataKey="value"
        strokeColor="#10b981"
        height={280}
        showGrid={true}
        showTooltip={true}
        dot={true}
        curved={true}
      />
    </div>
  )
}