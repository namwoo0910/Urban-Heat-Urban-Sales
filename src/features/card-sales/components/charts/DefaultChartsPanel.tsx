"use client"

import { MonthlySalesChart } from './MonthlySalesChart'
import { SalesBoxPlotChart } from './SalesBoxPlotChart'

interface DefaultChartsPanelProps {
  selectedGu?: string | null
  selectedGuCode?: number | null
  selectedDong?: string | null
  selectedDongCode?: number | null
  selectedBusinessType?: string | null
  selectedDate?: string | null
}

export function DefaultChartsPanel({
  selectedGu,
  selectedGuCode,
  selectedDong,
  selectedDongCode,
  selectedBusinessType,
  selectedDate
}: DefaultChartsPanelProps) {
  return (
    <div className="h-full flex flex-col gap-4">
      {/* 상단: 월별 매출액 차트 (50% 높이) */}
      <div className="flex-1 min-h-0 bg-white/80 backdrop-blur-sm rounded-lg p-3 border border-gray-200/50 shadow-sm">
        <MonthlySalesChart 
          selectedBusinessType={selectedBusinessType}
          selectedGuCode={selectedGuCode}
          selectedDongCode={selectedDongCode}
          selectedGuName={selectedGu}
          selectedDongName={selectedDong}
        />
      </div>

      {/* 하단: 박스 플롯 차트 (50% 높이) */}
      <div className="flex-1 min-h-0 bg-white/80 backdrop-blur-sm rounded-lg p-3 border border-gray-200/50 shadow-sm">
        <div className="w-full h-full flex flex-col">
          <div className="mb-3 flex-shrink-0">
            <h3 className="text-lg font-bold text-gray-800 mb-1">박스 플롯</h3>
            <p className="text-sm text-gray-600">날씨별 매출 분포 분석</p>
          </div>
          <div className="flex-1 min-h-0">
            <SalesBoxPlotChart 
              selectedBusinessType={selectedBusinessType}
              selectedGuCode={selectedGuCode}
              selectedDongCode={selectedDongCode}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default DefaultChartsPanel