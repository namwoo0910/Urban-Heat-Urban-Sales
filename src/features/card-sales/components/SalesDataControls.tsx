"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ChevronDown,
  MapPin,
  Palette,
  BarChart3,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Brain,
  Calendar
} from "lucide-react"
import { Card } from "@/src/shared/components/ui/card"
import { Label } from "@/src/shared/components/ui/label"
import { Slider } from "@/src/shared/components/ui/slider"
import { Button } from "@/src/shared/components/ui/button"
import { Switch } from "@/src/shared/components/ui/switch"
import { InlineMeshMonthToggle } from "./MeshMonthToggle"

interface UnifiedControlsProps {
  // Height scale props
  heightScale?: number
  onHeightScaleChange?: (scale: number) => void

  // Mesh layer props (always on, no toggle)
  meshColor?: string
  onMeshColorChange?: (color: string) => void
  selectedMeshMonth?: number  // 1-12
  onMeshMonthChange?: (month: number) => void
  // Temperature color toggle
  useTemperatureColor?: boolean
  onUseTemperatureColorChange?: (enabled: boolean) => void
  // Timeline mode & daily playback
  timelineMode?: 'monthly' | 'daily'
  onTimelineModeChange?: (mode: 'monthly' | 'daily') => void
  // Daily playback props
  isDailyPlaybackActive?: boolean
  currentDayIndex?: number
  totalDays?: number
  currentDate?: string
  onPlayPause?: () => void
  onDayChange?: (index: number) => void
  onSkipToStart?: () => void
  onSkipToEnd?: () => void
  // AI Prediction mode - only for conditional UI
  isAIPredictionMode?: boolean
}

const PRESET_MESH_COLORS = [
  { name: 'White', color: '#FFFFFF' },
  { name: 'Gradient', color: '#00CED1', isGradient: true },
  { name: 'Cyan', color: '#00FFE1' },
  { name: 'Yellow', color: '#FFE100' },
  { name: 'Purple', color: '#9400D3' },
]

export default function UnifiedControls({
  // Height scale props
  heightScale = 200000000,
  onHeightScaleChange,

  // Mesh layer props (always on)
  meshColor = '#FFFFFF',
  onMeshColorChange,
  selectedMeshMonth = 2,  // Default to February
  onMeshMonthChange,
  useTemperatureColor = false,
  onUseTemperatureColorChange,
  timelineMode = 'daily',
  onTimelineModeChange,
  // Daily playback props
  isDailyPlaybackActive = false,
  currentDayIndex = 0,
  totalDays = 0,
  currentDate = '',
  onPlayPause,
  onDayChange,
  onSkipToStart,
  onSkipToEnd,
  // AI Prediction mode
  isAIPredictionMode = false
}: UnifiedControlsProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <div className={`fixed bottom-4 z-50 transition-all duration-300`} style={{ left: '64px' }}>
      {!isAIPredictionMode && (
        <Card className={`bg-black/90 backdrop-blur-md border-gray-800/50 shadow-2xl text-gray-200 overflow-hidden ${isExpanded ? 'w-[200px]' : 'w-auto'}`}>
        {/* Header with expand/collapse */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-gray-900/50 transition-colors group"
        >
          <div className="flex items-center space-x-1">
            <MapPin size={12} className="text-cyan-400" />
            <span className="font-medium text-[11px] text-gray-200">메시</span>
          </div>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-3 h-3 text-gray-500 group-hover:text-gray-300" />
          </motion.div>
        </button>

        {/* Collapsible Content */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              key="content"
              initial="collapsed"
              animate="open"
              exit="collapsed"
              variants={{
                open: { opacity: 1, height: "auto" },
                collapsed: { opacity: 0, height: 0 }
              }}
              transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
            >
              <div className="px-2 py-1.5 space-y-1.5 border-t border-gray-800/50">
                {/* Height Scale Slider - Compact */}
                <div className="flex items-center gap-2">
                  <BarChart3 size={10} className="text-gray-500" />
                  <Slider
                    value={[heightScale]}
                    onValueChange={(value) => onHeightScaleChange?.(value[0])}
                    min={10000000}
                    max={5000000000}
                    step={10000000}
                    className="flex-1 h-1"
                  />
                  <span className="text-[9px] text-gray-500 font-mono w-8 text-right">
                    {heightScale >= 1000000000 ?
                      `${(heightScale / 1000000000).toFixed(1)}B` :
                      heightScale >= 1000000 ?
                      `${(heightScale / 1000000).toFixed(0)}M` :
                      `${(heightScale / 10000000).toFixed(0)}0M`
                    }
                  </span>
                </div>

                {/* Mode Toggle + Timeline Selector in One Row - Hide in AI mode */}
                {!isAIPredictionMode && timelineMode === 'monthly' ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-gray-400">월</span>
                      <InlineMeshMonthToggle
                        selectedMonth={selectedMeshMonth || 2}
                        onMonthChange={onMeshMonthChange || (() => {})}
                        className="flex-1"
                      />
                      <button
                        onClick={() => onTimelineModeChange?.('daily')}
                        className="p-0.5 hover:bg-gray-800 rounded transition-colors"
                        title="일별 모드로 전환"
                      >
                        <Calendar size={10} className="text-gray-500" />
                      </button>
                    </div>
                  </div>
                ) : !isAIPredictionMode ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-gray-400">일</span>
                      <button
                        onClick={onPlayPause}
                        className="p-0.5 bg-cyan-500/20 hover:bg-cyan-500/30 rounded"
                        title={isDailyPlaybackActive ? '일시정지' : '재생'}
                      >
                        {isDailyPlaybackActive ? (
                          <Pause size={10} className="text-cyan-400" />
                        ) : (
                          <Play size={10} className="text-cyan-400" />
                        )}
                      </button>
                      {totalDays > 0 && (
                        <Slider
                          value={[currentDayIndex]}
                          onValueChange={(value) => onDayChange?.(value[0])}
                          min={0}
                          max={totalDays - 1}
                          step={1}
                          className="flex-1 h-1"
                        />
                      )}
                      <span className="text-[8px] text-gray-500 w-12 text-right">
                        {currentDate ? currentDate.slice(5,10) : `${currentDayIndex + 1}/${totalDays}`}
                      </span>
                      <button
                        onClick={() => onTimelineModeChange?.('monthly')}
                        className="p-0.5 hover:bg-gray-800 rounded transition-colors"
                        title="월별 모드로 전환"
                      >
                        <Calendar size={10} className="text-gray-500" />
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* Color Quick Presets - Simplified - Hide in AI mode */}
                {!isAIPredictionMode && !useTemperatureColor && (
                  <div className="flex items-center gap-1">
                    <Palette size={10} className="text-gray-500" />
                    {PRESET_MESH_COLORS.map(({ name, color, isGradient }) => (
                      <button
                        key={color}
                        onClick={() => onMeshColorChange?.(color)}
                        className={`w-4 h-4 rounded border border-gray-700 hover:scale-110 transition-transform ${
                          meshColor === color ? 'ring-1 ring-cyan-400' : ''
                        }`}
                        style={isGradient ? {
                          background: 'linear-gradient(135deg, #FF8C00 0%, #00FF00 50%, #00B4D8 100%)'
                        } : {
                          backgroundColor: color
                        }}
                        title={name}
                      />
                    ))}
                    <button
                      onClick={() => onUseTemperatureColorChange?.(!useTemperatureColor)}
                      className={`ml-auto text-[9px] px-1.5 py-0.5 rounded transition-colors ${
                        useTemperatureColor
                          ? 'bg-cyan-500/20 text-cyan-400'
                          : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
                      }`}
                      title="온도 색상 토글"
                    >
                      온도
                    </button>
                  </div>
                )}

              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </Card>
      )}
    </div>
  )
}