"use client"

import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Palette, Play, Pause } from "lucide-react"
import { Card } from "@/src/shared/components/ui/card"
import { Label } from "@/src/shared/components/ui/label"
import { Slider } from "@/src/shared/components/ui/slider"

interface LayerControlsProps {
  // Animation controls
  isAnimating: boolean
  animationType: '7days' | '31days' | null
  animationDay: number
  onStartAnimation: (type: '7days' | '31days') => void
  onStopAnimation: () => void

  // Color controls
  meshColor: string
  onMeshColorChange: (color: string) => void
  useTemperatureColor: boolean
  onUseTemperatureColorChange: (enabled: boolean) => void

  // Label for the control panel
  layerLabel: string

  // Temperature scenario (for prediction layer)
  temperatureScenario?: string
  onTemperatureScenarioChange?: (scenario: string) => void
  showTemperatureScenarios?: boolean

  // Date slider (for both actual and prediction layers)
  date?: string
  onDateChange?: (date: string) => void
  showDate?: boolean
  dateLabel?: string  // Label for date slider (e.g., "실제 날짜 (7월)" or "예측 날짜 (7월)")
}

const PRESET_MESH_COLORS = [
  { name: 'White', color: '#FFFFFF' },
  { name: 'Gradient', color: '#00CED1', isGradient: true },
  { name: 'Cyan', color: '#00FFE1' },
  { name: 'Yellow', color: '#FFE100' },
  { name: 'Purple', color: '#9400D3' },
]

function LayerControls({
  isAnimating,
  animationType,
  animationDay,
  onStartAnimation,
  onStopAnimation,
  meshColor,
  onMeshColorChange,
  useTemperatureColor,
  onUseTemperatureColorChange,
  layerLabel,
  temperatureScenario = 't001',
  onTemperatureScenarioChange,
  showTemperatureScenarios = false,
  date = '20240701',
  onDateChange,
  showDate = false,
  dateLabel = '날짜 (7월)'
}: LayerControlsProps) {
  return (
    <div className="bg-black/85 backdrop-blur-md rounded-xl border border-purple-500/20 shadow-2xl overflow-hidden">
      {/* Layer Label */}
      <div className="bg-gradient-to-r from-purple-600/30 to-purple-700/30 px-3 py-1.5 border-b border-purple-500/20">
        <span className="text-xs font-semibold text-purple-200">{layerLabel}</span>
      </div>

      {/* Temperature Scenario Tabs (Prediction layer only) */}
      {showTemperatureScenarios && (
        <div className="flex divide-x divide-purple-500/20 border-b border-purple-500/20">
          {[
            { value: 't050', label: '+5°C' },
            { value: 't100', label: '+10°C' },
            { value: 't150', label: '+15°C' },
            { value: 't200', label: '+20°C' }
          ].map(scenario => (
            <button
              key={scenario.value}
              onClick={() => onTemperatureScenarioChange?.(scenario.value)}
              className={`flex-1 px-2 py-1.5 text-[10px] font-medium transition-all ${
                temperatureScenario === scenario.value
                  ? 'bg-gradient-to-b from-purple-600 to-purple-700 text-white'
                  : 'text-purple-300 hover:bg-purple-900/30'
              }`}
            >
              {scenario.label}
            </button>
          ))}
        </div>
      )}

      {/* Date Slider (for both actual and prediction layers) */}
      {showDate && (
        <div className="px-2 pt-2 pb-1">
          <div className="space-y-1">
            <Label className="text-purple-200 text-[10px]">{dateLabel}</Label>
            <div className="flex items-center gap-1">
              <Slider
                value={[parseInt(date.slice(-2)) - 1]}
                onValueChange={(value) => {
                  const day = (value[0] + 1).toString().padStart(2, '0')
                  onDateChange?.(`202407${day}`)
                }}
                min={0}
                max={30}
                step={1}
                className="flex-1 h-1"
              />
              <span className="text-[9px] text-purple-300 font-mono w-6">
                {parseInt(date.slice(-2))}일
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Playback Controls */}
      <div className="p-2 space-y-1.5">
        {!isAnimating ? (
          <div className="flex gap-1">
            <button
              onClick={() => onStartAnimation('7days')}
              className="flex-1 bg-gradient-to-r from-purple-600/80 to-pink-600/80 hover:from-purple-600 hover:to-pink-600 text-white px-2 py-1 rounded-lg transition-all flex items-center justify-center gap-1 text-[10px] font-medium"
            >
              <Play size={10} />
              7일
            </button>
            <button
              onClick={() => onStartAnimation('31days')}
              className="flex-1 bg-gradient-to-r from-purple-600/80 to-pink-600/80 hover:from-purple-600 hover:to-pink-600 text-white px-2 py-1 rounded-lg transition-all flex items-center justify-center gap-1 text-[10px] font-medium"
            >
              <Play size={10} />
              31일
            </button>
          </div>
        ) : (
          <>
            {/* Stop button and progress */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={onStopAnimation}
                className="bg-red-600/80 hover:bg-red-600 text-white px-2 py-1 rounded-lg transition-all flex items-center gap-1 text-[10px] font-medium"
              >
                <Pause size={10} />
                정지
              </button>
              <div className="flex-1 bg-purple-900/30 rounded-lg px-2 py-1">
                <div className="flex items-center justify-between">
                  <span className="text-purple-200 text-[9px] font-medium">
                    {animationType === '7days' ? '7일' : '31일'} 재생중
                  </span>
                  <span className="text-white text-[10px] font-bold">
                    {animationDay}/{animationType === '7days' ? '7' : '31'}
                  </span>
                </div>
                {/* Progress bar */}
                <div className="mt-0.5 h-0.5 bg-purple-950/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-400 to-pink-400 transition-all duration-300"
                    style={{
                      width: `${(animationDay / (animationType === '7days' ? 7 : 31)) * 100}%`
                    }}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Color Controls */}
      <div className="px-2 pb-2 pt-1 border-t border-purple-500/10">
        <div className="flex items-center gap-1">
          <Palette size={10} className="text-gray-500" />
          {PRESET_MESH_COLORS.map(({ name, color, isGradient }) => (
            <button
              key={color}
              onClick={() => onMeshColorChange(color)}
              className={`w-3.5 h-3.5 rounded border border-gray-700 hover:scale-110 transition-transform ${
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
            onClick={() => onUseTemperatureColorChange(!useTemperatureColor)}
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
      </div>
    </div>
  )
}

export default function DualLayerControls({
  // Actual layer props
  isActualAnimating,
  actualAnimationType,
  actualAnimationDay,
  onStartActualAnimation,
  onStopActualAnimation,
  actualMeshColor,
  onActualMeshColorChange,
  useActualTemperatureColor,
  onUseActualTemperatureColorChange,
  actualDate,
  onActualDateChange,

  // Prediction layer props
  isPredictionAnimating,
  predictionAnimationType,
  predictionAnimationDay,
  onStartPredictionAnimation,
  onStopPredictionAnimation,
  predictionMeshColor,
  onPredictionMeshColorChange,
  usePredictionTemperatureColor,
  onUsePredictionTemperatureColorChange,

  // Prediction-specific props
  predictionDate,
  onPredictionDateChange,
  temperatureScenario,
  onTemperatureScenarioChange
}: {
  // Actual layer props
  isActualAnimating: boolean
  actualAnimationType: '7days' | '31days' | null
  actualAnimationDay: number
  onStartActualAnimation: (type: '7days' | '31days') => void
  onStopActualAnimation: () => void
  actualMeshColor: string
  onActualMeshColorChange: (color: string) => void
  useActualTemperatureColor: boolean
  onUseActualTemperatureColorChange: (enabled: boolean) => void
  actualDate?: string
  onActualDateChange?: (date: string) => void

  // Prediction layer props
  isPredictionAnimating: boolean
  predictionAnimationType: '7days' | '31days' | null
  predictionAnimationDay: number
  onStartPredictionAnimation: (type: '7days' | '31days') => void
  onStopPredictionAnimation: () => void
  predictionMeshColor: string
  onPredictionMeshColorChange: (color: string) => void
  usePredictionTemperatureColor: boolean
  onUsePredictionTemperatureColorChange: (enabled: boolean) => void

  // Prediction-specific props
  predictionDate?: string
  onPredictionDateChange?: (date: string) => void
  temperatureScenario?: string
  onTemperatureScenarioChange?: (scenario: string) => void
}) {
  return (
    <div className="fixed bottom-4 left-0 right-0 z-30 pointer-events-none">
      <div className="flex justify-between px-4">
        {/* Left side - Actual Data Controls */}
        <div className="pointer-events-auto" style={{ maxWidth: '380px' }}>
          <LayerControls
            layerLabel="실제 데이터"
            isAnimating={isActualAnimating}
            animationType={actualAnimationType}
            animationDay={actualAnimationDay}
            onStartAnimation={onStartActualAnimation}
            onStopAnimation={onStopActualAnimation}
            meshColor={actualMeshColor}
            onMeshColorChange={onActualMeshColorChange}
            useTemperatureColor={useActualTemperatureColor}
            onUseTemperatureColorChange={onUseActualTemperatureColorChange}
            showDate={true}
            date={actualDate}
            onDateChange={onActualDateChange}
            dateLabel="실제 날짜 (7월)"
          />
        </div>

        {/* Right side - Prediction Data Controls */}
        <div className="pointer-events-auto" style={{ maxWidth: '380px' }}>
          <LayerControls
            layerLabel="AI 예측"
            isAnimating={isPredictionAnimating}
            animationType={predictionAnimationType}
            animationDay={predictionAnimationDay}
            onStartAnimation={onStartPredictionAnimation}
            onStopAnimation={onStopPredictionAnimation}
            meshColor={predictionMeshColor}
            onMeshColorChange={onPredictionMeshColorChange}
            useTemperatureColor={usePredictionTemperatureColor}
            onUseTemperatureColorChange={onUsePredictionTemperatureColorChange}
            showTemperatureScenarios={true}
            temperatureScenario={temperatureScenario}
            onTemperatureScenarioChange={onTemperatureScenarioChange}
            showDate={true}
            date={predictionDate}
            onDateChange={onPredictionDateChange}
            dateLabel="예측 날짜 (7월)"
          />
        </div>
      </div>
    </div>
  )
}