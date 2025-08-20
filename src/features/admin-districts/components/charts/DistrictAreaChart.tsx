"use client"

import { AreaChart } from '@/src/shared/components/charts'
import { cumulativeDistrictData } from '../../data/districtChartData'

export function DistrictAreaChart() {
  return (
    <div className="w-full h-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">권역별 인구 분포</h3>
        <p className="text-sm text-gray-400">서울시 5대 권역 인구</p>
      </div>
      <AreaChart
        data={cumulativeDistrictData}
        xDataKey="name"
        yDataKey="value"
        fillColor="#ec4899"
        strokeColor="#ec4899"
        height={280}
        showGrid={true}
        showTooltip={true}
        gradient={true}
      />
    </div>
  )
}