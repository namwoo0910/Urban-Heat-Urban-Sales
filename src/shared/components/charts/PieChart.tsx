"use client"

import { PieChart as RechartsPieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { PieChartProps, defaultColorScheme } from './types'
import { ChartTooltipContent } from '../ui/chart'

export function PieChart({
  data,
  width = '100%',
  height = 300,
  className = '',
  showTooltip = true,
  showLegend = true,
  animate = true,
  dataKey = 'value',
  innerRadius = 0,
  outerRadius = 80,
  startAngle = 90,
  endAngle = -270,
  paddingAngle = 2,
  colors = defaultColorScheme
}: PieChartProps) {
  const RADIAN = Math.PI / 180
  
  const renderCustomizedLabel = ({
    cx, cy, midAngle, innerRadius, outerRadius, percent
  }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  return (
    <div className={className}>
      <ResponsiveContainer width={width} height={height}>
        <RechartsPieChart>
          {showTooltip && <Tooltip content={(props) => <ChartTooltipContent {...props} />} />}
          {showLegend && <Legend />}
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={outerRadius}
            innerRadius={innerRadius}
            fill="#8884d8"
            dataKey={dataKey}
            startAngle={startAngle}
            endAngle={endAngle}
            paddingAngle={paddingAngle}
            animationDuration={animate ? 1500 : 0}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  )
}