"use client"

import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import { BarChartProps, defaultColorScheme } from './types'
import { ChartTooltipContent } from '../ui/chart'

// Y축 포맷터 - 한국식 금액 단위로 변환
function formatYAxisTick(value: number): string {
  if (value >= 100000000) {
    // 억 단위
    return Math.floor(value / 100000000).toString()
  } else if (value >= 10000000) {
    // 천만 단위
    return Math.floor(value / 10000000).toString()
  } else if (value >= 1000000) {
    // 백만 단위
    return Math.floor(value / 1000000).toString()
  } else if (value >= 10000) {
    // 만 단위
    return Math.floor(value / 10000).toString()
  }
  return value.toString()
}

// 데이터의 최대값을 기준으로 단위 결정
function getYAxisUnit(data: any[], yDataKey: string): string {
  const maxValue = Math.max(...data.map(d => d[yDataKey] || 0))
  
  if (maxValue >= 100000000) {
    return '(억원)'
  } else if (maxValue >= 10000000) {
    return '(천만원)'
  } else if (maxValue >= 1000000) {
    return '(백만원)'
  } else if (maxValue >= 10000) {
    return '(만원)'
  }
  return '(원)'
}

export function BarChart({
  data,
  width = '100%',
  height = 300,
  className = '',
  showTooltip = true,
  showLegend = false,
  showGrid = true,
  animate = true,
  xDataKey = 'name',
  yDataKey = 'value',
  fillColor = defaultColorScheme[0],
  barSize = 40,
  horizontal = false
}: BarChartProps) {
  console.log('[BarChart] Received data:', data)
  console.log('[BarChart] Data length:', data?.length)
  console.log('[BarChart] First item:', data?.[0])
  console.log('[BarChart] Width:', width, 'Height:', height)
  
  // 데이터 유효성 체크
  if (!data || !Array.isArray(data) || data.length === 0) {
    console.warn('[BarChart] Invalid or empty data')
    return <div className={className}>No data available</div>
  }
  
  const ChartComponent = horizontal ? RechartsBarChart : RechartsBarChart
  const yAxisUnit = getYAxisUnit(data, yDataKey)
  
  return (
    <div className={className} style={{ width: '100%', height: typeof height === 'number' ? `${height}px` : height }}>
      <ResponsiveContainer width={width} height="100%">
        <ChartComponent 
          data={data} 
          margin={{ top: 5, right: 5, left: -55, bottom: 20 }}
          layout={horizontal ? 'horizontal' : undefined}
        >
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted/20" />
          )}
          <XAxis 
            type={horizontal ? 'number' : 'category'}
            dataKey={horizontal ? undefined : xDataKey}
            className="text-xs"
            tick={(props) => {
              const { x, y, payload } = props;
              const lines = payload.value.split('/'); // 슬래시로 나누기
              return (
                <text x={x} y={y + 10} fill="#9CA3AF" fontSize={10} textAnchor="middle">
                  {lines.map((line, index) => (
                    <tspan x={x} dy={index === 0 ? 0 : 12} key={index}>
                      {line}
                    </tspan>
                  ))}
                </text>
              );
            }}
            axisLine={{ stroke: 'currentColor', strokeOpacity: 0.1 }}
            height={100}
            interval={0}
          />
          <YAxis 
            type={horizontal ? 'category' : 'number'}
            dataKey={horizontal ? xDataKey : undefined}
            className="text-xs"
            tick={{ fill: 'currentColor' }}
            axisLine={{ stroke: 'currentColor', strokeOpacity: 0.1 }}
            tickFormatter={!horizontal ? formatYAxisTick : undefined}
            label={{ 
              value: !horizontal ? yAxisUnit : '', 
              position: 'insideLeft',
              angle: -90,
              style: { textAnchor: 'middle', fill: 'currentColor', fontSize: 11 }
            }}
          />
          {showTooltip && (
            <Tooltip 
              content={(props) => <ChartTooltipContent {...props} />}
              cursor={{ fill: 'transparent' }}
            />
          )}
          {showLegend && <Legend />}
          <Bar 
            dataKey={yDataKey} 
            fill={fillColor}
            barSize={barSize}
            animationDuration={animate ? 1500 : 0}
            radius={[4, 4, 0, 0]}
            label={(props) => {
              const { x, y, width, value } = props;
              return (
                <text 
                  x={x + width / 2} 
                  y={y - 5} 
                  fill="#9CA3AF" 
                  fontSize={9} 
                  textAnchor="middle"
                >
                  {value.toFixed(0)}억
                </text>
              );
            }}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color || fillColor} />
            ))}
          </Bar>
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  )
}