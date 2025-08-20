"use client"

import { LineChart } from '@/src/shared/components/charts'
import { districtTrendData } from '../../data/districtChartData'

export function DistrictLineChart() {
  return (
    <div className="w-full h-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">서울시 인구 변화 추이</h3>
        <p className="text-sm text-gray-400">최근 6년간 인구 변화</p>
      </div>
      <LineChart
        data={districtTrendData}
        xDataKey="name"
        yDataKey="value"
        strokeColor="#8b5cf6"
        height={280}
        showGrid={true}
        showTooltip={true}
        dot={true}
        curved={true}
      />
    </div>
  )
}