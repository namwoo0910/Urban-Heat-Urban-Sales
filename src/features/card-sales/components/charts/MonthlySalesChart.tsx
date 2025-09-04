"use client"

import { useState, useMemo, useEffect } from 'react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/shared/components/ui/select'
import { loadMonthlySalesData, SALES_CATEGORIES, type MonthlySalesDataPoint } from '@/src/features/card-sales/data/monthlySalesData'
import { getWeatherEventsForChart } from '@/src/features/card-sales/data/weatherEventsData'

// 금액 포맷터 (억원 단위)
const formatCurrency = (value: number) => {
  if (value >= 100000000) {
    return `${(value / 100000000).toFixed(0)}억원`
  }
  if (value >= 10000) {
    return `${(value / 10000).toFixed(0)}만원`
  }
  return `${value.toLocaleString()}원`
}

// 커스텀 툴팁
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || payload.length === 0) return null

  const data = payload[0].payload
  
  return (
    <div className="rounded-lg border bg-background p-3 shadow-lg">
      <p className="font-semibold mb-2 text-white">{label}</p>
      <div className="space-y-1 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded"></div>
          <span className="text-gray-300">매출액: {formatCurrency(data.sales)}</span>
        </div>
      </div>
    </div>
  )
}

export function MonthlySalesChart() {
  const [selectedCategory, setSelectedCategory] = useState<string>('전체')
  const [salesData, setSalesData] = useState<MonthlySalesDataPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Get weather events for reference lines
  const weatherEvents = useMemo(() => getWeatherEventsForChart(), [])
  
  // CSV 데이터 로드
  useEffect(() => {
    loadMonthlySalesData().then((data) => {
      setSalesData(data)
      setIsLoading(false)
      console.log('[MonthlySalesChart] Loaded CSV data:', data)
    }).catch((error) => {
      console.error('[MonthlySalesChart] Failed to load data:', error)
      setIsLoading(false)
    })
  }, [])
  
  // 선택된 카테고리에 따른 차트 데이터 생성
  const chartData = useMemo(() => {
    if (salesData.length === 0) return []
    
    return salesData.map((dataPoint, index) => {
      let salesValue: number
      
      if (selectedCategory === '전체') {
        salesValue = dataPoint.total
      } else {
        salesValue = dataPoint.categories[selectedCategory] || 0
      }
      
      return {
        name: dataPoint.month,
        monthIndex: index, // Add numeric index for precise positioning
        sales: salesValue,
        formattedSales: salesValue / 100000000 // 억원 단위로 변환
      }
    })
  }, [salesData, selectedCategory])

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

  console.log('[MonthlySalesChart] Rendering with category:', selectedCategory, 'data:', chartData)

  // 로딩 중일 때
  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-white">데이터 로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="w-full h-full relative">
      {/* 업종 선택 드롭다운 */}
      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
        <SelectTrigger className="absolute -top-[55px] right-2 z-10 w-[180px] h-8 text-xs bg-white/10 border-white/20 text-white">
          <SelectValue placeholder="업종 선택" />
        </SelectTrigger>
        <SelectContent className="max-h-[300px] overflow-y-auto bg-black/90 border-white/20">
          {SALES_CATEGORIES.map((category) => (
            <SelectItem 
              key={category} 
              value={category} 
              className="text-xs text-white hover:bg-white/10"
            >
              {category}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 차트 제목 */}
      <div className="mb-2">
        <h3 className="text-lg font-bold text-white mb-1">월별 매출액</h3>
        <p className="text-sm text-gray-400">
          2024년 서울시 카드매출 월별 추이 ({selectedCategory})
        </p>
      </div>
      
      {/* 차트 */}
      <div className="flex-1" style={{ minHeight: '250px' }}>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart 
            data={chartData}
            margin={{ top: 10, right: 20, bottom: 5, left: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} stroke="#374151" />
            
            <XAxis 
              dataKey="monthIndex"
              type="number"
              domain={[0, 11]}
              ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]}
              tickFormatter={(value) => {
                const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
                return monthNames[value] || ''
              }}
              tick={{ fontSize: 12, fill: '#9CA3AF' }}
              axisLine={{ stroke: '#4B5563' }}
              tickLine={{ stroke: '#4B5563' }}
            />
            
            {/* 매출액 Y축 */}
            <YAxis 
              domain={yDomain}
              tickFormatter={(value) => `${value.toFixed(0)}억`}
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              axisLine={{ stroke: '#4B5563' }}
              tickLine={{ stroke: '#4B5563' }}
              label={{ 
                value: '매출액 (억원)', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle', fill: '#9CA3AF' }
              }}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            {/* Weather event reference lines - positioned at exact days */}
            {weatherEvents.map((event, index) => (
              <ReferenceLine
                key={`weather-${event.date}-${index}`}
                x={event.precisePosition}
                stroke={event.color}
                strokeOpacity={0.3}
                strokeWidth={1.5}
              />
            ))}
            
            {/* 매출액 Line */}
            <Line 
              type="monotone"
              dataKey="formattedSales"
              name="매출액"
              stroke="#3B82F6"
              strokeWidth={3}
              dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
        
        {/* 날씨 이벤트 범례 - X축 중앙 아래 */}
        <div className="flex justify-center gap-6 mt-0 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-4 h-1 bg-blue-500"></span>
            <span className="text-gray-400">한파</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-1 bg-green-500"></span>
            <span className="text-gray-400">온화</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-1 bg-red-500"></span>
            <span className="text-gray-400">폭염</span>
          </span>
        </div>
      </div>
    </div>
  )
}