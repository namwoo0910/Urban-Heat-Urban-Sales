"use client"

import { MonthlySalesChart } from './MonthlySalesChart'
import { SalesBoxPlotChart } from './SalesBoxPlotChart'

export function DefaultChartsPanel() {
  return (
    <div className="bg-black/90 backdrop-blur-md rounded-lg border border-gray-800/50 shadow-2xl p-4 h-full flex flex-col">
      {/* 헤더 */}
      <div className="mb-4 flex-shrink-0">
        <h2 className="text-xl font-bold text-gray-200 mb-2">매출 분석 대시보드</h2>
        <p className="text-sm text-gray-600">서울시 카드 매출 데이터 시각화</p>
      </div>

      {/* 차트 영역 */}
      <div className="flex-1 flex flex-col gap-4 min-h-0">
        {/* 상단: 월별 매출액 차트 (40% 높이) */}
        <div className="flex-[2] min-h-0 bg-gray-900/30 rounded-lg p-3 border border-gray-700/50">
          <MonthlySalesChart />
        </div>

        {/* 하단: 박스 플롯 차트 (60% 높이) */}
        <div className="flex-[3] min-h-0 bg-gray-900/30 rounded-lg p-3 border border-gray-700/50">
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
    </div>
  )
}