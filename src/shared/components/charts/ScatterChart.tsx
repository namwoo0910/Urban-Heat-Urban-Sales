"use client"

import { ScatterChart as RechartsScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import { ScatterChartProps, defaultColorScheme } from './types'
import { ChartTooltipContent } from '../ui/chart'

export function ScatterChart({
  data,
  width = '100%',
  height = 300,
  className = '',
  showTooltip = true,
  showLegend = false,
  showGrid = true,
  animate = true,
  xDataKey = 'x',
  yDataKey = 'y',
  zDataKey = 'z',
  fillColor = defaultColorScheme[3],
  shape = 'circle'
}: ScatterChartProps) {
  return (
    <div className={className}>
      <ResponsiveContainer width={width} height={height}>
        <RechartsScatterChart margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted/20" />
          )}
          <XAxis 
            dataKey={xDataKey}
            type="number"
            name="X"
            className="text-xs"
            tick={{ fill: 'currentColor' }}
            axisLine={{ stroke: 'currentColor', strokeOpacity: 0.1 }}
          />
          <YAxis 
            dataKey={yDataKey}
            type="number"
            name="Y"
            className="text-xs"
            tick={{ fill: 'currentColor' }}
            axisLine={{ stroke: 'currentColor', strokeOpacity: 0.1 }}
          />
          {zDataKey && (
            <ZAxis 
              dataKey={zDataKey} 
              type="number" 
              range={[60, 400]} 
              name="Z"
            />
          )}
          {showTooltip && (
            <Tooltip 
              content={(props) => <ChartTooltipContent {...props} />}
              cursor={{ strokeDasharray: '3 3' }}
            />
          )}
          {showLegend && <Legend />}
          <Scatter 
            name="Data" 
            data={data} 
            fill={fillColor}
            shape={shape}
            animationDuration={animate ? 1500 : 0}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color || fillColor} />
            ))}
          </Scatter>
        </RechartsScatterChart>
      </ResponsiveContainer>
    </div>
  )
}