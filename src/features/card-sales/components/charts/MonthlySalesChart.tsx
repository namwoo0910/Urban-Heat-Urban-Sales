"use client"

import { useMemo } from 'react'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from '@/src/shared/components/ui/chart'
import { getWeatherEventsForChart } from '@/src/features/card-sales/data/weatherEventsData'
import { useFilteredMonthlySales } from '@/src/features/card-sales/hooks/useFilteredMonthlySales'
import { formatSimpleCurrency } from '@/src/shared/utils/salesFormatter'

// 금액 포맷터 (억원 단위)
const formatCurrency = (value: number) => formatSimpleCurrency(value)

// 커스텀 툴팁
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || payload.length === 0) return null

  const data = payload[0].payload
  
  return (
    <div className="rounded-lg border border-gray-200/60 bg-white/95 backdrop-blur-sm p-2 shadow-lg">
      <div className="text-xs text-gray-700 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: '#3B82F6' }}></div>
        <span>매출액: {formatCurrency(data.sales)}</span>
      </div>
    </div>
  )
}

interface MonthlySalesChartProps {
  selectedBusinessType?: string | null
  selectedGuCode?: number | null
  selectedDongCode?: number | null
  selectedGuName?: string | null
  selectedDongName?: string | null
}

export function MonthlySalesChart({
  selectedBusinessType,
  selectedGuCode,
  selectedDongCode,
  selectedGuName,
  selectedDongName
}: MonthlySalesChartProps) {
  // 외부에서 전달된 업종 또는 기본값 '전체' 사용
  const activeCategory = selectedBusinessType || '전체'
  
  // 지역 선택 모드 확인
  const isDongMode = selectedDongCode !== null && selectedDongCode !== undefined
  const isGuMode = selectedGuCode !== null && selectedGuCode !== undefined && !isDongMode
  
  // Get weather events for reference lines
  const weatherEvents = useMemo(() => getWeatherEventsForChart(), [])
  
  // 필터링된 월별 데이터 로드 (구/동 선택에 따라)
  const { monthlyData: salesData, isLoading } = useFilteredMonthlySales(
    selectedGuCode,
    selectedDongCode
  )
  
  // 선택된 카테고리에 따른 차트 데이터 생성
  const chartData = useMemo(() => {
    if (salesData.length === 0) return []
    
    return salesData.map((dataPoint, index) => {
      let salesValue: number
      
      if (activeCategory === '전체') {
        salesValue = dataPoint.total
      } else {
        salesValue = dataPoint.categories[activeCategory] || 0
      }
      
      return {
        name: dataPoint.month,
        monthIndex: index, // Add numeric index for precise positioning
        sales: salesValue,
        formattedSales: salesValue / 100000000 // 억원 단위로 변환
      }
    })
  }, [salesData, activeCategory])

  // Y축 도메인 계산
  const yDomain = useMemo(() => {
    const values = chartData.map(d => d.formattedSales)
    const maxValue = Math.max(...values)
    const minValue = Math.min(...values)
    
    // 적절한 여백 추가
    const padding = (maxValue - minValue) * 0.1
    return [
      Math.floor(minValue - padding),
      Math.ceil(maxValue + padding)
    ]
  }, [chartData])

  // 선택된 지역 표시용 텍스트
  const locationText = useMemo(() => {
    if (selectedDongCode) {
      return `(선택 지역 데이터)`
    } else if (selectedGuCode) {
      return `(선택 구 데이터)`
    }
    return `(서울시 전체)`
  }, [selectedGuCode, selectedDongCode])

  console.log('[MonthlySalesChart] Rendering with category:', activeCategory, 'data:', chartData)

  // 로딩 중일 때
  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-gray-700">데이터 로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="w-full h-full relative">
      {/* 선택된 업종 또는 행정동/자치구 표시 (레이어 컨트롤에서 선택) */}
      <div className="absolute top-0 right-2 z-10 flex flex-col items-end gap-1">
        {isDongMode && selectedDongName && activeCategory !== '전체' ? (
          <div className="text-xs text-blue-600 font-medium">
            {selectedGuName} {selectedDongName} - {activeCategory}
          </div>
        ) : isDongMode && selectedDongName ? (
          <div className="text-xs text-blue-600 font-medium">
            {selectedGuName} {selectedDongName} (전체 업종)
          </div>
        ) : isGuMode && selectedGuName && activeCategory !== '전체' ? (
          <div className="text-xs text-blue-600 font-medium">
            {selectedGuName} - {activeCategory}
          </div>
        ) : isGuMode && selectedGuName ? (
          <div className="text-xs text-blue-600 font-medium">
            {selectedGuName} (전체 업종)
          </div>
        ) : activeCategory !== '전체' ? (
          <div className="text-xs text-blue-600 font-medium">
            {activeCategory}
          </div>
        ) : null}
      </div>

      {/* 차트 제목 */}
      <div className="mb-2">
        <h3 className="text-lg font-bold text-gray-800 mb-1">월별 매출액</h3>
        <p className="text-sm text-gray-600">
          2024년 카드매출 월별 추이 {locationText}
        </p>
      </div>
      
      {/* 차트 */}
      <div className="h-full">
        <ResponsiveContainer width="100%" height="80%">
          <LineChart 
            data={chartData}
            margin={{ top: 10, right: 20, bottom: 5, left: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} stroke="#E5E7EB" />
            
            <XAxis 
              dataKey="monthIndex"
              type="number"
              domain={[0, 11]}
              ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]}
              tickFormatter={(value) => {
                const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
                return monthNames[value] || ''
              }}
              tick={{ fontSize: 12, fill: '#4B5563' }}
              axisLine={{ stroke: '#E5E7EB', strokeOpacity: 0.5 }}
              tickLine={{ stroke: '#E5E7EB', strokeOpacity: 0.5 }}
            />
            
            {/* 매출액 Y축 */}
            <YAxis 
              domain={yDomain}
              tickFormatter={(value) => `${value.toFixed(0)}억`}
              tick={{ fontSize: 11, fill: '#4B5563' }}
              axisLine={{ stroke: '#E5E7EB', strokeOpacity: 0.5 }}
              tickLine={{ stroke: '#E5E7EB', strokeOpacity: 0.5 }}
              label={{
                value: '매출액 (억원)',
                angle: -90,
                position: 'insideLeft',
                style: { textAnchor: 'middle', fill: '#6B7280' }
              }}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            {/* Weather event reference lines - positioned at exact days */}
            {weatherEvents.map((event, index) => (
              <ReferenceLine
                key={`weather-${event.date}-${index}`}
                x={event.precisePosition}
                stroke={event.color}
                strokeOpacity={0.5}
                strokeWidth={2}
              />
            ))}
            
            {/* 매출액 Line */}
            <Line
              type="monotone"
              dataKey="formattedSales"
              name="매출액"
              stroke="#3B82F6"
              strokeOpacity={1}
              strokeWidth={3}
              dot={{ fill: '#3B82F6', fillOpacity: 1, strokeWidth: 2, r: 4, filter: 'drop-shadow(0 2px 4px rgba(59, 130, 246, 0.3))' }}
              activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2, fill: '#fff', filter: 'drop-shadow(0 2px 8px rgba(59, 130, 246, 0.5))' }}
            />
          </LineChart>
        </ResponsiveContainer>
        
        {/* 날씨 이벤트 범례 - X축 중앙 아래 */}
        <div className="flex justify-center gap-6 mt-0 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-4 h-1 bg-blue-500 shadow-sm"></span>
            <span className="text-gray-600 font-medium">한파</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-1 bg-emerald-500 shadow-sm"></span>
            <span className="text-gray-600 font-medium">온화</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-1 bg-red-500 shadow-sm"></span>
            <span className="text-gray-600 font-medium">폭염</span>
          </span>
        </div>
      </div>
    </div>
  )
}