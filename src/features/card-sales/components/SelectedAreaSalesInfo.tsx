/**
 * Selected Area Sales Info Component
 * 선택된 지역의 총 매출액을 표시하는 오버레이 컴포넌트
 */

import React, { useMemo } from 'react'
import { Card } from '@/src/shared/components/ui/card'
import { TrendingUp, MapPin, Activity } from 'lucide-react'
import type { HexagonLayerData } from './LayerManager'
import type { ClimateCardSalesData } from '../types'

interface SelectedAreaSalesInfoProps {
  selectedGu: string | null
  selectedDong: string | null
  hexagonData: HexagonLayerData[] | null
  climateData: ClimateCardSalesData[] | null
  visible?: boolean
}

export function SelectedAreaSalesInfo({
  selectedGu,
  selectedDong,
  hexagonData,
  climateData,
  visible = true
}: SelectedAreaSalesInfoProps) {
  // 선택된 지역의 총 매출액 계산
  const areaStats = useMemo(() => {
    if (!hexagonData || (!selectedGu && !selectedDong)) {
      return null
    }

    let totalSales = 0
    let dataPoints = 0
    let avgTemperature = 0
    let avgDiscomfort = 0

    // 원본 hexagon 데이터에서 집계
    hexagonData.forEach(point => {
      if (point.originalData) {
        const matchesGu = !selectedGu || point.originalData.guName === selectedGu
        const matchesDong = !selectedDong || point.originalData.dongName === selectedDong
        
        if (matchesGu && matchesDong) {
          totalSales += point.weight
          dataPoints++
          avgTemperature += point.originalData.temperature || 0
          avgDiscomfort += point.originalData.discomfortIndex || 0
        }
      }
    })

    if (dataPoints > 0) {
      avgTemperature = avgTemperature / dataPoints
      avgDiscomfort = avgDiscomfort / dataPoints
    }

    return {
      totalSales,
      dataPoints,
      avgTemperature,
      avgDiscomfort
    }
  }, [hexagonData, selectedGu, selectedDong])

  // 숫자 포맷팅
  const formatCurrency = (value: number): string => {
    if (value >= 1000000000) {
      return `${(value / 1000000000).toFixed(1)}억원`
    } else if (value >= 10000000) {
      return `${(value / 10000000).toFixed(1)}천만원`
    } else if (value >= 10000) {
      return `${(value / 10000).toFixed(0)}만원`
    } else {
      return `${value.toLocaleString()}원`
    }
  }

  if (!visible || !areaStats || (!selectedGu && !selectedDong)) {
    return null
  }

  const areaName = selectedDong || selectedGu || '전체'

  return (
    <Card className="absolute top-24 left-4 z-10 bg-gray-900/95 backdrop-blur-sm border-gray-700 shadow-2xl max-w-sm">
      <div className="p-4 space-y-3">
        {/* 지역명 헤더 */}
        <div className="flex items-center gap-2 pb-2 border-b border-gray-700">
          <MapPin className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-bold text-white">
            {areaName}
          </h3>
        </div>

        {/* 총 매출액 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">총 매출액</span>
            <TrendingUp className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {formatCurrency(areaStats.totalSales)}
          </div>
        </div>

        {/* 추가 통계 */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-800">
          <div className="space-y-1">
            <span className="text-xs text-gray-500">평균 기온</span>
            <div className="text-sm font-medium text-gray-300">
              {areaStats.avgTemperature.toFixed(1)}°C
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-gray-500">불쾌지수</span>
            <div className="text-sm font-medium text-gray-300">
              {areaStats.avgDiscomfort.toFixed(1)}
            </div>
          </div>
        </div>

        {/* 데이터 포인트 수 */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-800">
          <Activity className="w-3 h-3 text-gray-500" />
          <span className="text-xs text-gray-500">
            {`${areaStats.dataPoints}개 데이터 포인트`}
          </span>
        </div>
      </div>
    </Card>
  )
}