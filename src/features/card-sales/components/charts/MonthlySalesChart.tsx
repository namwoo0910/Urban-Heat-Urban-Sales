"use client"

import { useMemo } from 'react'
import { 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer
} from '@/src/shared/components/ui/chart'
import { salesAndCustomersData } from '../../data/salesChartData'

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

// 고객수 포맷터
const formatCustomers = (value: number) => {
  if (value >= 10000) {
    return `${(value / 10000).toFixed(1)}만명`
  }
  return `${value.toLocaleString()}명`
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
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span className="text-gray-300">고객수: {formatCustomers(data.customers)}</span>
        </div>
        <div className="text-xs text-muted-foreground mt-2 border-t pt-1">
          <div>평균 거래액: {formatCurrency(data.avgTransaction)}</div>
        </div>
      </div>
    </div>
  )
}

export function MonthlySalesChart() {
  const chartData = useMemo(() => {
    return salesAndCustomersData.map(item => ({
      ...item,
      formattedSales: item.sales / 100000000, // 억원 단위로 변환
      formattedCustomers: item.customers / 1000 // 천명 단위로 변환 (스케일 조정)
    }))
  }, [])

  return (
    <div className="w-full h-full flex flex-col">
      {/* 차트 제목 */}
      <div className="mb-4">
        <h3 className="text-lg font-bold text-white mb-1">월별 매출액</h3>
        <p className="text-sm text-gray-400">2024년 서울시 카드매출 월별 추이</p>
      </div>
      
      {/* 차트 */}
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart 
            data={chartData}
            margin={{ top: 20, right: 30, bottom: 20, left: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} stroke="#374151" />
            
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 12, fill: '#9CA3AF' }}
              axisLine={{ stroke: '#4B5563' }}
              tickLine={{ stroke: '#4B5563' }}
            />
            
            {/* 매출액 Y축 (왼쪽) */}
            <YAxis 
              yAxisId="sales"
              orientation="left"
              tickFormatter={(value) => `${value}억`}
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
            
            {/* 고객수 Y축 (오른쪽) */}
            <YAxis 
              yAxisId="customers"
              orientation="right"
              tickFormatter={(value) => `${value}천`}
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              axisLine={{ stroke: '#4B5563' }}
              tickLine={{ stroke: '#4B5563' }}
              label={{ 
                value: '고객수 (천명)', 
                angle: 90, 
                position: 'insideRight',
                style: { textAnchor: 'middle', fill: '#9CA3AF' }
              }}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            <Legend 
              wrapperStyle={{ paddingTop: '10px' }}
              iconType="rect"
            />
            
            {/* 매출액 Bar */}
            <Bar 
              yAxisId="sales"
              dataKey="formattedSales"
              name="매출액"
              fill="#3B82F6"
              fillOpacity={0.8}
              radius={[2, 2, 0, 0]}
            />
            
            {/* 고객수 Line */}
            <Line 
              yAxisId="customers"
              type="monotone"
              dataKey="formattedCustomers"
              name="고객수"
              stroke="#10B981"
              strokeWidth={3}
              dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      
      {/* 범례 설명 */}
      <div className="mt-3 text-xs text-gray-400 border-t border-gray-700 pt-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            매출액 (막대)
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            고객수 (선)
          </span>
        </div>
      </div>
    </div>
  )
}