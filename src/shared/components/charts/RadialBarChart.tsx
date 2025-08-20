"use client"

import { RadialBarChart as RechartsRadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { RadialBarChartProps, defaultColorScheme } from './types'

export function RadialBarChart({
  data,
  width = '100%',
  height = 300,
  className = '',
  showTooltip = true,
  showLegend = false,
  animate = true,
  dataKey = 'value',
  innerRadius = 30,
  outerRadius = 90,
  startAngle = 90,
  endAngle = -270,
  colors = defaultColorScheme,
  showBackground = true
}: RadialBarChartProps) {
  // Add colors to data
  const dataWithColors = data.map((item, index) => ({
    ...item,
    fill: colors[index % colors.length]
  }))

  const style = {
    top: '50%',
    right: 0,
    transform: 'translate(0, -50%)',
    lineHeight: '24px'
  }

  return (
    <div className={className}>
      <ResponsiveContainer width={width} height={height}>
        <RechartsRadialBarChart 
          cx="50%" 
          cy="50%" 
          innerRadius={innerRadius} 
          outerRadius={outerRadius} 
          barSize={10} 
          data={dataWithColors}
          startAngle={startAngle}
          endAngle={endAngle}
        >
          <PolarAngleAxis
            type="number"
            domain={[0, 100]}
            angleAxisId={0}
            tick={false}
          />
          {showBackground && (
            <RadialBar
              background={{ fill: 'currentColor', fillOpacity: 0.05 }}
              dataKey={dataKey}
              cornerRadius={10}
              animationDuration={animate ? 1500 : 0}
            />
          )}
          {!showBackground && (
            <RadialBar
              dataKey={dataKey}
              cornerRadius={10}
              animationDuration={animate ? 1500 : 0}
            />
          )}
          {showTooltip && <Tooltip />}
          {showLegend && <Legend iconSize={10} layout="vertical" verticalAlign="middle" wrapperStyle={style} />}
        </RechartsRadialBarChart>
      </ResponsiveContainer>
    </div>
  )
}