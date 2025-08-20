"use client"

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/shared/components/ui/tabs'
import { PopulationLineChart } from './PopulationLineChart'
import { PopulationAreaChart } from './PopulationAreaChart'
import { PopulationBarChart } from './PopulationBarChart'
import { PopulationPieChart } from './PopulationPieChart'
import { PopulationRadarChart } from './PopulationRadarChart'
import { PopulationComposedChart } from './PopulationComposedChart'
import { PopulationHeatmapChart } from './PopulationHeatmapChart'

export function PopulationChartPanel() {
  const [activeTab, setActiveTab] = useState('line')

  const charts = [
    { id: 'line', label: '시간대별', component: PopulationLineChart },
    { id: 'area', label: '누적 인구', component: PopulationAreaChart },
    { id: 'bar', label: '지역별', component: PopulationBarChart },
    { id: 'pie', label: '연령대', component: PopulationPieChart },
    { id: 'radar', label: '활동 패턴', component: PopulationRadarChart },
    { id: 'composed', label: '복합 분석', component: PopulationComposedChart },
    { id: 'heatmap', label: '밀도 히트맵', component: PopulationHeatmapChart },
  ]

  return (
    <div className="bg-black/60 backdrop-blur-md rounded-lg border border-white/10 p-4 h-full flex flex-col">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-white mb-2">유동인구 분석 대시보드</h2>
        <p className="text-sm text-gray-400">서울시 실시간 유동인구 데이터 시각화</p>
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
          <span>© 2024 Seoul Floating Population Analytics</span>
        </div>
      </div>
    </div>
  )
}