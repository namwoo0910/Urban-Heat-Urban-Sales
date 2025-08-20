"use client"

import * as React from "react"
import { cn } from "@/src/shared/utils/cn"

// Chart configuration type
export interface ChartConfig {
  [key: string]: {
    label?: string
    color?: string
    icon?: React.ComponentType<{ className?: string }>
  }
}

// Chart container component
export const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config?: ChartConfig
    children: React.ReactNode
  }
>(({ className, children, config, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("relative", className)}
      {...props}
    >
      {config && (
        <style>
          {Object.entries(config).map(
            ([key, value]) => `
              :root {
                --color-${key}: ${value.color};
              }
            `
          ).join("\n")}
        </style>
      )}
      {children}
    </div>
  )
})
ChartContainer.displayName = "ChartContainer"

// Custom Tooltip Content Component for Recharts
export const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  {
    active?: boolean
    payload?: any[]
    label?: string
    className?: string
    hideLabel?: boolean
  }
>(({ active, payload, label, className, hideLabel = false }, ref) => {
  if (!active || !payload || !payload.length) {
    return null
  }

  return (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border bg-background p-2 shadow-sm",
        className
      )}
    >
      <div className="flex flex-col gap-2">
        {!hideLabel && label && (
          <span className="text-[0.70rem] uppercase text-muted-foreground">
            {label}
          </span>
        )}
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="h-2 w-2 rounded-full" 
              style={{ backgroundColor: entry.color || '#8884d8' }} 
            />
            <span className="text-xs font-medium">
              {entry.name || entry.dataKey}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
})
ChartTooltipContent.displayName = "ChartTooltipContent"

// Re-export recharts components for convenience
export {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Funnel,
  FunnelChart,
  Label,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  Rectangle,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Sector,
  Tooltip,
  Treemap,
  XAxis,
  YAxis,
  ZAxis
} from "recharts"

// Extended ChartConfig type for better TypeScript support
export interface ChartConfig {
  [key: string]: {
    label?: string
    color?: string
    icon?: React.ComponentType<{ className?: string }>
  }
}

// Utility function to format chart values
export const formatChartValue = (value: number, format?: string): string => {
  if (format === "currency") {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }
  
  if (format === "percent") {
    return `${(value * 100).toFixed(1)}%`
  }
  
  if (format === "number") {
    return new Intl.NumberFormat("ko-KR").format(value)
  }
  
  return value.toString()
}

// Default chart colors palette
export const chartColors = {
  primary: "hsl(var(--primary))",
  secondary: "hsl(var(--secondary))",
  accent: "hsl(var(--accent))",
  muted: "hsl(var(--muted))",
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
  info: "#3b82f6",
  purple: "#8b5cf6",
  pink: "#ec4899",
  indigo: "#6366f1",
  teal: "#14b8a6"
}