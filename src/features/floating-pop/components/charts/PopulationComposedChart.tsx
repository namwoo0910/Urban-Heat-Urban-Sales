"use client"

import { ComposedChart } from '@/src/shared/components/charts'
import { salesAndCustomersData } from '../../data/salesChartData'

export function PopulationComposedChart() {
  return (
    <div className="w-full h-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">매출 & 고객 복합 분석</h3>
        <p className="text-sm text-gray-400">매출과 고객수 상관관계</p>
      </div>
      <ComposedChart
        data={salesAndCustomersData}
        height={280}
        showGrid={true}
        showTooltip={true}
        showLegend={true}
        bars={[
          { dataKey: 'sales', fill: '#3b82f6' }
        ]}
        lines={[
          { dataKey: 'customers', stroke: '#f59e0b', type: 'monotone' }
        ]}
      />
    </div>
  )
}