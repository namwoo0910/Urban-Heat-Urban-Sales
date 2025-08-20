"use client"

import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import { BarChartProps, defaultColorScheme } from './types'
import { ChartTooltipContent } from '../ui/chart'

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
  const ChartComponent = horizontal ? RechartsBarChart : RechartsBarChart
  
  return (
    <div className={className}>
      <ResponsiveContainer width={width} height={height}>
        <ChartComponent 
          data={data} 
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          layout={horizontal ? 'horizontal' : 'vertical'}
        >
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted/20" />
          )}
          <XAxis 
            type={horizontal ? 'number' : 'category'}
            dataKey={horizontal ? undefined : xDataKey}
            className="text-xs"
            tick={{ fill: 'currentColor' }}
            axisLine={{ stroke: 'currentColor', strokeOpacity: 0.1 }}
          />
          <YAxis 
            type={horizontal ? 'category' : 'number'}
            dataKey={horizontal ? xDataKey : undefined}
            className="text-xs"
            tick={{ fill: 'currentColor' }}
            axisLine={{ stroke: 'currentColor', strokeOpacity: 0.1 }}
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