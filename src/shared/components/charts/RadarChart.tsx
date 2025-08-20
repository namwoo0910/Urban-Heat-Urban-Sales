"use client"

import { Radar, RadarChart as RechartsRadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { RadarChartProps, defaultColorScheme } from './types'
import { ChartTooltipContent } from '../ui/chart'

export function RadarChart({
  data,
  width = '100%',
  height = 300,
  className = '',
  showTooltip = true,
  showLegend = false,
  animate = true,
  dataKey = 'value',
  fillColor = defaultColorScheme[2],
  strokeColor = defaultColorScheme[2],
  fillOpacity = 0.6
}: RadarChartProps) {
  return (
    <div className={className}>
      <ResponsiveContainer width={width} height={height}>
        <RechartsRadarChart data={data}>
          <PolarGrid 
            className="stroke-muted/20"
            strokeDasharray="3 3"
          />
          <PolarAngleAxis 
            dataKey="name" 
            className="text-xs"
            tick={{ fill: 'currentColor' }}
          />
          <PolarRadiusAxis 
            className="text-xs"
            tick={{ fill: 'currentColor' }}
            axisLine={false}
            angle={90}
          />
          {showTooltip && <Tooltip content={(props) => <ChartTooltipContent {...props} />} />}
          {showLegend && <Legend />}
          <Radar 
            name="Value" 
            dataKey={dataKey} 
            stroke={strokeColor} 
            fill={fillColor} 
            fillOpacity={fillOpacity}
            animationDuration={animate ? 1500 : 0}
          />
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  )
}