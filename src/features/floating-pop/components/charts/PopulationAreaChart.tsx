"use client"

import { AreaChart } from '@/src/shared/components/charts'
import { cumulativePopulationData } from '../../data/populationChartData'

export function PopulationAreaChart() {
  return (
    <div className="w-full h-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">요일별 누적 유동인구</h3>
        <p className="text-sm text-gray-400">주간 유동인구 누적 패턴</p>
      </div>
      <AreaChart
        data={cumulativePopulationData}
        xDataKey="name"
        yDataKey="value"
        fillColor="#8b5cf6"
        strokeColor="#8b5cf6"
        height={280}
        showGrid={true}
        showTooltip={true}
        gradient={true}
      />
    </div>
  )
}