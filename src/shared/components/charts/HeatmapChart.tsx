"use client"

import { HeatmapProps } from './types'

export function HeatmapChart({
  data,
  xLabels = [],
  yLabels = [],
  colorScale = ['#f3f4f6', '#fbbf24', '#f59e0b', '#ea580c', '#dc2626'],
  width = '100%',
  height = 300,
  className = ''
}: HeatmapProps) {
  // Find min and max values for color scaling
  const values = data.map(d => d.value)
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const range = maxValue - minValue

  // Get color based on value
  const getColor = (value: number) => {
    const normalized = (value - minValue) / range
    const index = Math.floor(normalized * (colorScale.length - 1))
    return colorScale[Math.min(index, colorScale.length - 1)]
  }

  // Get unique labels if not provided
  const uniqueX = xLabels.length ? xLabels : [...new Set(data.map(d => String(d.x)))]
  const uniqueY = yLabels.length ? yLabels : [...new Set(data.map(d => String(d.y)))]

  // Create matrix
  const matrix: { [key: string]: { [key: string]: number | null } } = {}
  uniqueY.forEach(y => {
    matrix[y] = {}
    uniqueX.forEach(x => {
      matrix[y][x] = null
    })
  })

  // Fill matrix with data
  data.forEach(d => {
    const x = String(d.x)
    const y = String(d.y)
    if (matrix[y]) {
      matrix[y][x] = d.value
    }
  })

  const cellWidth = 100 / uniqueX.length
  const cellHeight = 100 / uniqueY.length

  return (
    <div className={className} style={{ width, height: typeof height === 'number' ? `${height}px` : height }}>
      <div className="relative w-full h-full">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-8 bottom-0 w-16 flex flex-col justify-between text-xs">
          {uniqueY.map(label => (
            <div key={label} className="flex items-center justify-end pr-2" style={{ height: `${cellHeight}%` }}>
              {label}
            </div>
          ))}
        </div>

        {/* Heatmap grid */}
        <div className="absolute left-16 right-0 top-8 bottom-8">
          <svg width="100%" height="100%" className="border border-muted/20">
            {uniqueY.map((yLabel, yIndex) => (
              uniqueX.map((xLabel, xIndex) => {
                const value = matrix[yLabel][xLabel]
                if (value === null) return null
                
                return (
                  <g key={`${xLabel}-${yLabel}`}>
                    <rect
                      x={`${xIndex * cellWidth}%`}
                      y={`${yIndex * cellHeight}%`}
                      width={`${cellWidth}%`}
                      height={`${cellHeight}%`}
                      fill={getColor(value)}
                      stroke="white"
                      strokeWidth="1"
                      className="transition-opacity hover:opacity-80"
                    >
                      <title>{`${xLabel}, ${yLabel}: ${value}`}</title>
                    </rect>
                    {cellWidth > 5 && cellHeight > 10 && (
                      <text
                        x={`${xIndex * cellWidth + cellWidth / 2}%`}
                        y={`${yIndex * cellHeight + cellHeight / 2}%`}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="white"
                        fontSize="10"
                        className="pointer-events-none"
                      >
                        {value}
                      </text>
                    )}
                  </g>
                )
              })
            ))}
          </svg>
        </div>

        {/* X-axis labels */}
        <div className="absolute left-16 right-0 bottom-0 h-8 flex justify-between text-xs">
          {uniqueX.map(label => (
            <div key={label} className="flex justify-center items-start pt-2" style={{ width: `${cellWidth}%` }}>
              {label}
            </div>
          ))}
        </div>

        {/* Color scale legend */}
        <div className="absolute top-0 right-0 flex items-center gap-2 text-xs">
          <span>{minValue}</span>
          <div className="flex h-4">
            {colorScale.map((color, index) => (
              <div key={index} className="w-4 h-full" style={{ backgroundColor: color }} />
            ))}
          </div>
          <span>{maxValue}</span>
        </div>
      </div>
    </div>
  )
}