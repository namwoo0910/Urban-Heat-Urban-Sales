"use client"

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/shared/components/ui/tabs'
import { DistrictLineChart } from './DistrictLineChart'
import { DistrictAreaChart } from './DistrictAreaChart'
import { DistrictBarChart } from './DistrictBarChart'
import { DistrictPieChart } from './DistrictPieChart'
import { DistrictRadarChart } from './DistrictRadarChart'
import { DistrictHeatmapChart } from './DistrictHeatmapChart'

export function DistrictChartPanel() {
  const [activeTab, setActiveTab] = useState('line')

  const charts = [
    { id: 'line', label: '인구 추이', component: DistrictLineChart },
    { id: 'area', label: '권역별', component: DistrictAreaChart },
    { id: 'bar', label: '구별 비교', component: DistrictBarChart },
    { id: 'pie', label: '면적 비율', component: DistrictPieChart },
    { id: 'radar', label: '특성 분석', component: DistrictRadarChart },
    { id: 'heatmap', label: '활동 히트맵', component: DistrictHeatmapChart },
  ]

  return (
    <div className="bg-black/60 backdrop-blur-md rounded-lg border border-white/10 p-4 h-full flex flex-col">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-white mb-2">행정구역 분석 대시보드</h2>
        <p className="text-sm text-gray-400">서울시 25개 구 행정 데이터 시각화</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid grid-cols-7 bg-black/40 border border-white/10 mb-4">
          {charts.map((chart) => (
            <TabsTrigger 
              key={chart.id} 
              value={chart.id}
              className="text-xs data-[state=active]:bg-purple-600/20 data-[state=active]:text-purple-400"
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
          <span>© 2024 Seoul Administrative Districts Analytics</span>
        </div>
      </div>
    </div>
  )
}