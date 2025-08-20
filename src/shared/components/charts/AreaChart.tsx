"use client"

import { AreaChart as RechartsAreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { AreaChartProps, defaultColorScheme, gradientDefs } from './types'
import { ChartTooltipContent } from '../ui/chart'

export function AreaChart({
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
  strokeColor = defaultColorScheme[0],
  fillOpacity = 0.6,
  gradient = true
}: AreaChartProps) {
  const gradientId = `area-gradient-${Math.random().toString(36).substr(2, 9)}`
  const gradientColors = gradientDefs.blue

  return (
    <div className={className}>
      <ResponsiveContainer width={width} height={height}>
        <RechartsAreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          {gradient && (
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={gradientColors.start} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={gradientColors.end} stopOpacity={0.1}/>
              </linearGradient>
            </defs>
          )}
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
          <Area
            type="monotone"
            dataKey={yDataKey}
            stroke={strokeColor}
            fill={gradient ? `url(#${gradientId})` : fillColor}
            fillOpacity={gradient ? 1 : fillOpacity}
            animationDuration={animate ? 1500 : 0}
          />
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  )
}