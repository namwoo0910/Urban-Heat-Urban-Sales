"use client"

import { Treemap, ResponsiveContainer, Tooltip } from 'recharts'
import { TreemapProps, defaultColorScheme } from './types'

interface TreemapData {
  name: string
  size?: number
  children?: TreemapData[]
  color?: string
}

const CustomizedContent = (props: any) => {
  const { root, depth, x, y, width, height, index, colors, name, size } = props

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: colors[index % colors.length],
          stroke: '#fff',
          strokeWidth: 2 / (depth + 1e-10),
          strokeOpacity: 1 / (depth + 1e-10),
        }}
      />
      {depth === 1 && width > 50 && height > 30 && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - 7}
            textAnchor="middle"
            fill="#fff"
            fontSize={12}
            fontWeight="500"
          >
            {name}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + 7}
            textAnchor="middle"
            fill="#fff"
            fontSize={10}
            fillOpacity={0.9}
          >
            {size?.toLocaleString()}
          </text>
        </>
      )}
    </g>
  )
}

export function TreemapChart({
  data,
  width = '100%',
  height = 300,
  className = '',
  showTooltip = true,
  animate = true,
  dataKey = 'size',
  aspectRatio = 4 / 3,
  colors = defaultColorScheme
}: TreemapProps) {
  // Transform flat data to hierarchical if needed
  const treeData = Array.isArray(data) ? { name: 'Root', children: data } : data

  return (
    <div className={className}>
      <ResponsiveContainer width={width} height={height}>
        <Treemap
          data={[treeData]}
          dataKey={dataKey}
          aspectRatio={aspectRatio}
          stroke="#fff"
          fill="#8884d8"
          isAnimationActive={animate}
          animationDuration={1500}
          content={<CustomizedContent colors={colors} />}
        >
          {showTooltip && <Tooltip />}
        </Treemap>
      </ResponsiveContainer>
    </div>
  )
}