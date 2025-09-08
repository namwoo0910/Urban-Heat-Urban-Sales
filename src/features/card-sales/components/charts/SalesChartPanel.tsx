"use client"

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/shared/components/ui/tabs'
import { SalesLineChart } from './SalesLineChart'
import { SalesAreaChart } from './SalesAreaChart'
import { SalesBarChart } from './SalesBarChart'
import { SalesPieChart } from './SalesPieChart'
import { SalesRadarChart } from './SalesRadarChart'
import { SalesComposedChart } from './SalesComposedChart'
import { SalesHeatmapChart } from './SalesHeatmapChart'
import { SalesBoxPlotChart } from './SalesBoxPlotChart'
import { NormalizedSalesBoxPlotRecharts } from './NormalizedSalesBoxPlotRecharts'

export function SalesChartPanel() {
  const [activeTab, setActiveTab] = useState('line')

  const charts = [
    { id: 'line', label: '매출 추이', component: SalesLineChart },
    { id: 'area', label: '누적 매출', component: SalesAreaChart },
    { id: 'bar', label: '업종별', component: SalesBarChart },
    { id: 'pie', label: '연령대', component: SalesPieChart },
    { id: 'radar', label: '요일 패턴', component: SalesRadarChart },
    { id: 'composed', label: '복합 분석', component: SalesComposedChart },
    { id: 'heatmap', label: '히트맵', component: SalesHeatmapChart },
    { id: 'boxplot', label: '날씨 영향', component: SalesBoxPlotChart },
    { id: 'normalized', label: '정규화 분석', component: NormalizedSalesBoxPlotRecharts },
  ]

  return (
    <div className="bg-black/90 backdrop-blur-md rounded-lg border border-gray-800/50 shadow-2xl p-4 h-full flex flex-col">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-200 mb-2">매출 분석 대시보드</h2>
        <p className="text-sm text-gray-600">서울시 카드 매출 데이터 시각화</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-w-0">
        <TabsList className="grid grid-cols-3 lg:grid-cols-9 gap-1 bg-gray-900/50 border border-gray-800/50 mb-2 h-auto p-1 flex-shrink-0">
          {charts.map((chart) => (
            <TabsTrigger 
              key={chart.id} 
              value={chart.id}
              className="text-[9px] lg:text-[11px] data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400 h-7 lg:h-8 px-1 lg:px-2"
            >
              {chart.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="flex-1 min-h-0 overflow-hidden">
          {charts.map((chart) => (
            <TabsContent 
              key={chart.id} 
              value={chart.id} 
              className="h-full mt-0 p-2"
            >
              <div className="w-full h-full overflow-x-auto overflow-y-hidden">
                <div className="min-w-[600px] h-full">
                  <chart.component />
                </div>
              </div>
            </TabsContent>
          ))}
        </div>
      </Tabs>

      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="flex justify-between items-center text-xs text-gray-400">
          <span>데이터 업데이트: {new Date().toLocaleString('ko-KR')}</span>
          <span>© 2024 Seoul Card Sales Analytics</span>
        </div>
      </div>
    </div>
  )
}