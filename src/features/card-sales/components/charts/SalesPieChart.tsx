"use client"

import { PieChart } from '@/src/shared/components/charts'
import { ageGroupData } from '../../data/salesChartData'

export function SalesPieChart() {
  return (
    <div className="w-full h-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">연령대별 사용 비율</h3>
        <p className="text-sm text-gray-400">고객 연령 분포</p>
      </div>
      <PieChart
        data={ageGroupData}
        dataKey="value"
        height={280}
        showTooltip={true}
        showLegend={true}
        innerRadius={30}
        outerRadius={80}
      />
    </div>
  )
}