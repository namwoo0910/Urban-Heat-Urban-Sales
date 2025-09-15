"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ChevronDown,
  MapPin,
  Loader2,
  Palette,
  BarChart3,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw
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
}

const PRESET_MESH_COLORS = [
  { name: 'White', color: '#FFFFFF' },  // White default
  { name: 'Gradient Default', color: '#00CED1', isGradient: true },  // Special gradient button
  { name: 'Cyan', color: '#00FFE1' },
  { name: 'Magenta', color: '#FF00E1' },
  { name: 'Yellow', color: '#FFE100' },
  { name: 'Lime', color: '#00FF00' },
  { name: 'Orange', color: '#FF8C00' },
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
  timelineMode = 'monthly',
  onTimelineModeChange,
  // Daily playback props
  isDailyPlaybackActive = false,
  currentDayIndex = 0,
  totalDays = 0,
  currentDate = '',
  onPlayPause,
  onDayChange,
  onSkipToStart,
  onSkipToEnd
}: UnifiedControlsProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <div className={`fixed bottom-[350px] z-50 transition-all duration-300 left-4`}>
      <Card className={`bg-black/90 backdrop-blur-md border-gray-800/50 shadow-2xl text-gray-200 overflow-hidden ${isExpanded ? 'w-[260px]' : 'w-auto'}`}>
        {/* Header with expand/collapse */}
        <div className="flex items-center">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-1 flex items-center justify-between p-2 hover:bg-gray-900/50 transition-colors group"
          >
            <div className="flex items-center space-x-1.5">
              <MapPin size={14} className="text-cyan-400" />
              <span className="font-medium text-xs text-gray-200">메시 레이어</span>
            </div>
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-3.5 h-3.5 text-gray-500 group-hover:text-gray-300 transition-colors" />
            </motion.div>
          </button>
        </div>

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
              <div className="p-2 space-y-2 border-t border-gray-800/50">
                {/* Mesh Layer Controls (always on) */}
                <div className="space-y-2">
                      {/* Height Scale Slider */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1">
                            <BarChart3 size={11} className="text-gray-400" />
                            <Label className="text-gray-300 text-[11px]">높이</Label>
                          </div>
                          <span className="text-[10px] text-gray-500 font-mono">
                            {heightScale >= 1000000000 ?
                              `${(heightScale / 1000000000).toFixed(1)}B` :
                              heightScale >= 1000000 ?
                              `${(heightScale / 1000000).toFixed(0)}M` :
                              heightScale >= 1000 ?
                              `${(heightScale / 1000).toFixed(0)}K` :
                              heightScale.toFixed(0)
                            }
                          </span>
                        </div>
                        <Slider
                          value={[heightScale]}
                          onValueChange={(value) => onHeightScaleChange?.(value[0])}
                          min={10000000}
                          max={5000000000}
                          step={10000000}
                          className="w-full h-1"
                        />
                      </div>

                      {/* Timeline Mode Toggle */}
                      <div className="flex items-center justify-between">
                        <Label className="text-gray-300 text-[11px]">모드</Label>
                        <div className="flex gap-0.5 bg-gray-900/50 rounded p-0.5">
                          <Button
                            size="sm"
                            variant={timelineMode === 'monthly' ? 'default' : 'ghost'}
                            onClick={() => onTimelineModeChange?.('monthly')}
                            className="h-5 px-2 text-[10px]"
                          >
                            월별
                          </Button>
                          <Button
                            size="sm"
                            variant={timelineMode === 'daily' ? 'default' : 'ghost'}
                            onClick={() => onTimelineModeChange?.('daily')}
                            className="h-5 px-2 text-[10px]"
                          >
                            일별
                          </Button>
                        </div>
                      </div>

                      {/* Temperature Color Toggle */}
                      <div className="flex items-center justify-between">
                        <Label className="text-gray-300 text-[11px]">온도 색상 자동</Label>
                        <Switch
                          checked={useTemperatureColor}
                          onCheckedChange={(v) => onUseTemperatureColorChange?.(!!v)}
                          className="scale-75"
                        />
                      </div>

                      {/* Compact Color Picker */}
                      <div className={`space-y-1 ${useTemperatureColor ? 'opacity-50' : ''}`}>
                        <div className="flex items-center gap-1">
                          <Palette size={11} className={useTemperatureColor ? "text-gray-600" : "text-gray-400"} />
                          <Label className={`text-[11px] ${useTemperatureColor ? 'text-gray-500' : 'text-gray-300'}`}>
                            {useTemperatureColor ? '색상 (온도 자동)' : '색상'}
                          </Label>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={meshColor || '#FFFFFF'}
                            onChange={(e) => onMeshColorChange?.(e.target.value)}
                            className={`w-6 h-6 border border-gray-600 rounded ${useTemperatureColor ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                            disabled={useTemperatureColor}
                            title={useTemperatureColor ? "온도 색상 자동이 켜져 있습니다" : "Choose mesh color"}
                          />
                          {/* Preset Colors inline */}
                          {PRESET_MESH_COLORS.map(({ name, color, isGradient }) => (
                            <button
                              key={color}
                              onClick={() => onMeshColorChange?.(color)}
                              className={`w-5 h-5 rounded border border-gray-700 transition-transform ${useTemperatureColor ? 'cursor-not-allowed' : 'hover:scale-110'}`}
                              style={isGradient ? {
                                background: 'linear-gradient(135deg, #FF8C00 0%, #00FF00 50%, #00B4D8 100%)'
                              } : {
                                backgroundColor: color
                              }}
                              disabled={useTemperatureColor}
                              title={useTemperatureColor ? "온도 색상 자동이 켜져 있습니다" : name}
                            />
                          ))}
                          <button
                            onClick={() => onMeshColorChange?.('#00CED1')}
                            className={`ml-auto p-1 rounded transition-colors ${useTemperatureColor ? 'cursor-not-allowed' : 'hover:bg-gray-800'}`}
                            disabled={useTemperatureColor}
                            title={useTemperatureColor ? "온도 색상 자동이 켜져 있습니다" : "Reset to gradient default"}
                          >
                            <RotateCcw size={12} className={useTemperatureColor ? "text-gray-600" : "text-gray-400 hover:text-gray-200"} />
                          </button>
                        </div>
                      </div>

                      {/* Month Selection or Daily Timeline */}
                      {timelineMode === 'monthly' ? (
                        <div className="space-y-1">
                          <Label className="text-gray-300 text-[11px]">월 선택</Label>
                          <InlineMeshMonthToggle
                            selectedMonth={selectedMeshMonth || 2}
                            onMonthChange={onMeshMonthChange || (() => {})}
                            className="w-full"
                          />
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label className="text-gray-300 text-[11px]">일별 재생</Label>
                            <span className="text-[10px] text-gray-500">
                              {currentDate ? currentDate.slice(0,10) : `${currentDayIndex + 1}/${totalDays}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={onSkipToStart}
                              className="p-1 hover:bg-gray-800 rounded transition-colors"
                              title="처음으로"
                            >
                              <SkipBack size={14} className="text-gray-400" />
                            </button>
                            <button
                              onClick={onPlayPause}
                              className="p-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 rounded transition-colors"
                              title={isDailyPlaybackActive ? '일시정지' : '재생'}
                            >
                              {isDailyPlaybackActive ? (
                                <Pause size={14} className="text-cyan-400" />
                              ) : (
                                <Play size={14} className="text-cyan-400" />
                              )}
                            </button>
                            <button
                              onClick={onSkipToEnd}
                              className="p-1 hover:bg-gray-800 rounded transition-colors"
                              title="마지막으로"
                            >
                              <SkipForward size={14} className="text-gray-400" />
                            </button>
                            {totalDays > 0 && (
                              <Slider
                                value={[currentDayIndex]}
                                onValueChange={(value) => onDayChange?.(value[0])}
                                min={0}
                                max={totalDays - 1}
                                step={1}
                                className="flex-1 ml-2 h-1"
                              />
                            )}
                          </div>
                        </div>
                      )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  )
}