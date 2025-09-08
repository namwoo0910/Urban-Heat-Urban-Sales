"use client"

import { MonthlySalesChart } from './MonthlySalesChart'
import { SalesBoxPlotChart } from './SalesBoxPlotChart'

export function DefaultChartsPanel() {
  return (
    <div className="h-full flex flex-col gap-4">
      {/* 상단: 월별 매출액 차트 (50% 높이) */}
      <div className="flex-1 min-h-0 bg-gray-900/20 rounded-lg p-3 border border-gray-700/30">
        <MonthlySalesChart />
      </div>

      {/* 하단: 박스 플롯 차트 (50% 높이) */}
      <div className="flex-1 min-h-0 bg-gray-900/20 rounded-lg p-3 border border-gray-700/30">
        <div className="w-full h-full flex flex-col">
          <div className="mb-3 flex-shrink-0">
            <h3 className="text-lg font-bold text-white mb-1">박스 플롯</h3>
            <p className="text-sm text-gray-400">날씨별 매출 분포 분석</p>
          </div>
          <div className="flex-1 min-h-0">
            <SalesBoxPlotChart />
          </div>
        </div>
      </div>
    </div>
  )
}