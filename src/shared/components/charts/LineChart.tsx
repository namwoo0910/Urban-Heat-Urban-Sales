"use client"

import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { LineChartProps, defaultColorScheme } from './types'
import { ChartTooltipContent } from '../ui/chart'

export function LineChart({
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
  strokeColor = defaultColorScheme[0],
  strokeWidth = 2,
  dot = true,
  curved = true
}: LineChartProps) {
  return (
    <div className={className}>
      <ResponsiveContainer width={width} height={height}>
        <RechartsLineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted/20" />
          )}
          <XAxis 
            dataKey={xDataKey}
            className="text-xs"
            tick={{ fill: 'currentColor' }}
            axisLine={{ stroke: 'currentColor', strokeOpacity: 0.1 }}
          />
          <YAxis 
            className="text-xs"
            tick={{ fill: 'currentColor' }}
            axisLine={{ stroke: 'currentColor', strokeOpacity: 0.1 }}
          />
          {showTooltip && (
            <Tooltip 
              content={(props) => <ChartTooltipContent {...props} />}
              cursor={{ strokeDasharray: '3 3' }}
            />
          )}
          {showLegend && <Legend />}
          <Line
            type={curved ? 'monotone' : 'linear'}
            dataKey={yDataKey}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            dot={dot}
            animationDuration={animate ? 1500 : 0}
            activeDot={{ r: 6 }}
          />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  )
}