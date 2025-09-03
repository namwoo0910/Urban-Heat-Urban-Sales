/**
 * Selected Area Sales Info Component
 * 선택된 지역의 총 매출액을 표시하는 오버레이 컴포넌트
 */

import React, { useMemo } from 'react'
import { Card } from '@/src/shared/components/ui/card'
import { BarChart } from '@/src/shared/components/charts'
import { TrendingUp, MapPin, Activity, BarChart3 } from 'lucide-react'
import { calculateTotalSales, getTopBusinessTypes, formatCurrency } from '../utils/salesCalculator'
import type { HexagonLayerData } from './LayerManager'
import type { ClimateCardSalesData } from '../types'

interface SelectedAreaSalesInfoProps {
  selectedGu: string | null
  selectedDong: string | null
  hexagonData: HexagonLayerData[] | null
  climateData: ClimateCardSalesData[] | null
  visible?: boolean
  selectedDate?: string | null
}

export function SelectedAreaSalesInfo({
  selectedGu,
  selectedDong,
  hexagonData,
  climateData,
  visible = true,
  selectedDate
}: SelectedAreaSalesInfoProps) {
  // 선택된 지역의 총 매출액 계산 및 업종별 매출 집계
  const areaStats = useMemo(() => {
    if (!hexagonData) {
      return null
    }

    let dataPoints = 0
    let avgTemperature = 0
    let avgTemperatureMax = 0
    let avgTemperatureMin = 0
    let avgDiscomfort = 0
    let totalPrecipitation = 0
    let avgHumidity = 0
    const categorySalesMap: { [key: string]: number } = {}
    const temperatureGroups: Map<string, number> = new Map()
    let latestDate = ''

    console.log('[SelectedAreaSalesInfo] hexagonData 개수:', hexagonData.length)
    if (hexagonData.length > 0) {
      console.log('[SelectedAreaSalesInfo] 첫 번째 데이터 샘플:', hexagonData[0])
      console.log('[SelectedAreaSalesInfo] 선택된 지역 - 구:', selectedGu, '동:', selectedDong)
      
      // 입력 데이터의 weight 합계 확인
      const inputWeightSum = hexagonData.reduce((sum, point) => sum + (point.weight || 0), 0)
      console.log('[SelectedAreaSalesInfo] 입력 weight 합계:', (inputWeightSum/100000000).toFixed(1), '억원')
    }

    // 원본 hexagon 데이터에서 집계
    hexagonData.forEach(point => {
      if (point.originalData) {
        const originalData = point.originalData
        // 선택된 지역이 없으면 모든 데이터 포함
        const includeAll = !selectedGu && !selectedDong
        const matchesGu = includeAll || 
          originalData.guName === selectedGu || 
          originalData.자치구 === selectedGu
        const matchesDong = includeAll || !selectedDong || 
          originalData.dongName === selectedDong ||
          originalData.행정동 === selectedDong
        
        if (matchesGu && matchesDong) {
          // 디버깅: 첫 번째 매칭되는 데이터 상세 로그
          if (dataPoints === 0) {
            console.log('[SelectedAreaSalesInfo] 첫 번째 매칭 데이터:', originalData)
            console.log('[SelectedAreaSalesInfo] 총매출액_업종 존재:', !!originalData.총매출액_업종)
            console.log('[SelectedAreaSalesInfo] 총매출액_업종 내용:', originalData.총매출액_업종)
          }

          // 총매출액_업종 데이터가 있으면 사용
          if (originalData.총매출액_업종) {
            // 카테고리별 집계만 수행 (totalSales는 나중에 계산)
            Object.entries(originalData.총매출액_업종).forEach(([category, sales]) => {
              if (typeof sales === 'number' && sales > 0 && !category.startsWith('sub_')) {
                categorySalesMap[category] = (categorySalesMap[category] || 0) + sales
              }
            })
          }
          
          dataPoints++
          avgTemperature += originalData.temperature || originalData.일평균기온 || 0
          avgTemperatureMax += originalData.temperatureMax || originalData.일최고기온 || 0
          avgTemperatureMin += originalData.temperatureMin || originalData.일최저기온 || 0
          avgDiscomfort += originalData.discomfortIndex || originalData.일평균불쾌지수 || 0
          totalPrecipitation += originalData.precipitation || originalData.일총강수량 || 0
          avgHumidity += originalData.humidity || originalData.일평균습도 || 0
          
          // 기온그룹 카운트
          const tempGroup = originalData.temperatureGroup || originalData.기온그룹
          if (tempGroup) {
            temperatureGroups.set(tempGroup, (temperatureGroups.get(tempGroup) || 0) + 1)
          }
          
          // 최신 날짜 추출
          const date = originalData.date || originalData.기준일자
          if (date && date > latestDate) {
            latestDate = date
          }
        }
      }
    })

    if (dataPoints > 0) {
      avgTemperature = avgTemperature / dataPoints
      avgTemperatureMax = avgTemperatureMax / dataPoints
      avgTemperatureMin = avgTemperatureMin / dataPoints
      avgDiscomfort = avgDiscomfort / dataPoints
      avgHumidity = avgHumidity / dataPoints
    }
    
    // categorySalesMap의 합계로 totalSales 계산 (중복 방지)
    let totalSales = 0
    Object.values(categorySalesMap).forEach(sales => {
      totalSales += sales
    })
    console.log('[SelectedAreaSalesInfo] 총 매출액 계산:', totalSales.toLocaleString(), '원', `(${(totalSales/100000000).toFixed(1)}억원)`)
    console.log('[SelectedAreaSalesInfo] 카테고리 수:', Object.keys(categorySalesMap).length)
    console.log('[SelectedAreaSalesInfo] 처리된 데이터 포인트:', dataPoints)
    
    // 가장 많은 기온그룹 찾기
    let dominantTempGroup = '일반'
    let maxCount = 0
    temperatureGroups.forEach((count, group) => {
      if (count > maxCount) {
        maxCount = count
        dominantTempGroup = group
      }
    })

    // 업종별 매출 상위 10개 추출 (색상 포함)
    const colors = [
      'rgb(59, 130, 246)',  // blue-500
      'rgb(6, 182, 212)',   // cyan-500
      'rgb(20, 184, 166)',  // teal-500
      'rgb(34, 197, 94)',   // green-500
      'rgb(16, 185, 129)',  // emerald-500
      'rgb(251, 146, 60)',  // orange-400
      'rgb(168, 85, 247)',  // purple-500
      'rgb(244, 63, 94)',   // rose-500
      'rgb(236, 72, 153)',  // pink-500
      'rgb(245, 158, 11)'   // amber-500
    ]
    
    const topCategories = Object.entries(categorySalesMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value], index) => ({
        name,
        value: value / 100000000, // 억 단위로 변환
        originalValue: value, // 원본 값 저장 (툴팁용)
        percentage: totalSales > 0 ? (value / totalSales) * 100 : 0,
        color: colors[index] || 'rgb(107, 114, 128)' // gray-500 as fallback
      }))
    
    // 검증: 그래프 합계와 totalSales 비교
    const graphTotal = topCategories.reduce((sum, cat) => sum + cat.originalValue, 0)
    const allCategoriesTotal = Object.values(categorySalesMap).reduce((sum, val) => sum + val, 0)
    console.log('[SelectedAreaSalesInfo] 전체 카테고리 합계:', allCategoriesTotal.toLocaleString(), '원', `(${(allCategoriesTotal/100000000).toFixed(1)}억원)`)
    console.log('[SelectedAreaSalesInfo] 상위 10개 그래프 합계:', graphTotal.toLocaleString(), '원', `(${(graphTotal/100000000).toFixed(1)}억원)`)
    console.log('[SelectedAreaSalesInfo] 최종 totalSales:', totalSales.toLocaleString(), '원', `(${(totalSales/100000000).toFixed(1)}억원)`)
    console.log('[SelectedAreaSalesInfo] 데이터 포인트 수:', dataPoints)

    return {
      totalSales,
      dataPoints,
      avgTemperature,
      avgTemperatureMax,
      avgTemperatureMin,
      avgDiscomfort,
      avgHumidity,
      totalPrecipitation,
      temperatureGroup: dominantTempGroup,
      latestDate,
      topCategories
    }
  }, [hexagonData, selectedGu, selectedDong, selectedDate])

  // formatCurrency는 이제 import한 함수 사용

  if (!visible || !areaStats) {
    return null
  }

  const areaName = selectedDong 
    ? (selectedGu ? `${selectedGu} ${selectedDong}` : selectedDong)
    : (selectedGu || '서울시 전체')

  return (
    <Card className="absolute top-24 left-4 z-10 bg-black/90 backdrop-blur-md border-gray-800/50 shadow-2xl" style={{ width: '380px' }}>
      <div className="p-4 space-y-3">
        {/* 지역, 날짜, 매출액을 한 줄에 - 헤더 */}
        <div className="flex items-center justify-between pb-2 border-b border-gray-800/50">
          <div className="flex items-center gap-3">
            <MapPin className="w-4 h-4 text-blue-400" />
            <h3 className="text-base font-bold text-gray-200">
              {areaName}
            </h3>
            <span className="text-sm text-gray-500">
              {selectedDate || '2024-01-01'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-gray-200">
              {formatCurrency(areaStats.totalSales)}
            </span>
            {/* 극한 날씨일 때만 표시 */}
            {(areaStats.temperatureGroup === '한파' || areaStats.temperatureGroup === '폭염') && (
              <span className={`
                px-2 py-0.5 rounded text-xs font-medium
                ${areaStats.temperatureGroup === '한파' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-red-500/20 text-red-400'}
              `}>
                {areaStats.temperatureGroup}
              </span>
            )}
          </div>
        </div>

        {/* 메타 정보 - 한 줄로 압축 */}
        <div className="flex items-center justify-between text-xs text-gray-600 py-0">
          <span>기온 {areaStats.avgTemperatureMax.toFixed(0)}°/{areaStats.avgTemperatureMin.toFixed(0)}°</span>
          <span>강수 {areaStats.totalPrecipitation.toFixed(0)}mm</span>
          <span>습도 {areaStats.avgHumidity.toFixed(0)}%</span>
          <span>불쾌지수 {areaStats.avgDiscomfort.toFixed(0)}</span>
        </div>

        {/* 업종별 매출 차트 */}
        <div className="pt-0">
          <div style={{ height: '150px', minHeight: '140px', width: '100%' }}>
            <BarChart
              data={areaStats.topCategories || []}
              xDataKey="name"
              yDataKey="value"
              width="100%"
              height={220}
              showGrid={true}
              showTooltip={true}
              barSize={25}
            />
          </div>
        </div>
      </div>
    </Card>
  )
}