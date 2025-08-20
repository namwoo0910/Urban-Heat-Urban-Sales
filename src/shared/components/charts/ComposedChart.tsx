"use client"

import { ComposedChart as RechartsComposedChart, Line, Bar, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { ComposedChartProps, defaultColorScheme } from './types'
import { ChartTooltipContent } from '../ui/chart'

export function ComposedChart({
  data,
  width = '100%',
  height = 300,
  className = '',
  showTooltip = true,
  showLegend = true,
  showGrid = true,
  animate = true,
  lines = [],
  bars = [],
  areas = []
}: ComposedChartProps) {
  return (
    <div className={className}>
      <ResponsiveContainer width={width} height={height}>
        <RechartsComposedChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted/20" />
          )}
          <XAxis 
            dataKey="name"
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
          
          {areas.map((area, index) => (
            <Area
              key={`area-${index}`}
              type="monotone"
              dataKey={area.dataKey}
              fill={area.fill || defaultColorScheme[index + 4]}
              stroke={area.stroke || defaultColorScheme[index + 4]}
              fillOpacity={0.6}
              animationDuration={animate ? 1500 : 0}
            />
          ))}
          
          {bars.map((bar, index) => (
            <Bar
              key={`bar-${index}`}
              dataKey={bar.dataKey}
              fill={bar.fill || defaultColorScheme[index + 2]}
              animationDuration={animate ? 1500 : 0}
              radius={[4, 4, 0, 0]}
            />
          ))}
          
          {lines.map((line, index) => (
            <Line
              key={`line-${index}`}
              type={line.type || 'monotone'}
              dataKey={line.dataKey}
              stroke={line.stroke || defaultColorScheme[index]}
              strokeWidth={2}
              dot={false}
              animationDuration={animate ? 1500 : 0}
            />
          ))}
        </RechartsComposedChart>
      </ResponsiveContainer>
    </div>
  )
}