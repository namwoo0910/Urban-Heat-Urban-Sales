"use client"

import { BarChart } from '@/src/shared/components/charts'
import { districtPopulationData } from '../../data/populationChartData'

export function PopulationBarChart() {
  return (
    <div className="w-full h-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">주요 지역별 유동인구</h3>
        <p className="text-sm text-gray-400">상위 8개 지역 일일 평균</p>
      </div>
      <BarChart
        data={districtPopulationData}
        xDataKey="name"
        yDataKey="value"
        fillColor="#f59e0b"
        height={280}
        showGrid={true}
        showTooltip={true}
      />
    </div>
  )
}