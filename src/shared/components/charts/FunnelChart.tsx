"use client"

import { FunnelChart as RechartsFunnelChart, Funnel, LabelList, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { FunnelChartProps, defaultColorScheme } from './types'
import { ChartTooltipContent } from '../ui/chart'

export function FunnelChart({
  data,
  width = '100%',
  height = 300,
  className = '',
  showTooltip = true,
  animate = true,
  dataKey = 'value',
  colors = defaultColorScheme,
  labelPosition = 'center'
}: FunnelChartProps) {
  return (
    <div className={className}>
      <ResponsiveContainer width={width} height={height}>
        <RechartsFunnelChart>
          {showTooltip && <Tooltip content={(props) => <ChartTooltipContent {...props} />} />}
          <Funnel
            dataKey={dataKey}
            data={data}
            isAnimationActive={animate}
            animationDuration={1500}
          >
            <LabelList 
              position={labelPosition} 
              fill="#fff" 
              stroke="none"
              className="text-xs font-medium"
            />
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Funnel>
        </RechartsFunnelChart>
      </ResponsiveContainer>
    </div>
  )
}