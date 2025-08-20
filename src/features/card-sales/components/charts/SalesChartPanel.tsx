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
  ]

  return (
    <div className="bg-black/60 backdrop-blur-md rounded-lg border border-white/10 p-4 h-full flex flex-col">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-white mb-2">매출 분석 대시보드</h2>
        <p className="text-sm text-gray-400">서울시 카드 매출 데이터 시각화</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid grid-cols-7 bg-black/40 border border-white/10 mb-4">
          {charts.map((chart) => (
            <TabsTrigger 
              key={chart.id} 
              value={chart.id}
              className="text-xs data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400"
            >
              {chart.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="flex-1 overflow-hidden">
          {charts.map((chart) => (
            <TabsContent 
              key={chart.id} 
              value={chart.id} 
              className="h-full mt-0"
            >
              <chart.component />
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