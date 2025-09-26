"use client"

import React from "react"
import { Play, Pause } from "lucide-react"
import { Slider } from "@/src/shared/components/ui/slider"

interface PredictionCenterControlsProps {
  // Temperature scenario
  temperatureScenario: string
  onTemperatureScenarioChange: (scenario: string) => void

  // Animation controls
  isAnimating: boolean
  animationType: '7days' | '31days' | null
  animationDay: number
  onStartAnimation: (type: '7days' | '31days') => void
  onStopAnimation: () => void

  // Date control
  date: string
  onDateChange: (date: string) => void
}

export default function PredictionCenterControls({
  temperatureScenario,
  onTemperatureScenarioChange,
  isAnimating,
  animationType,
  animationDay,
  onStartAnimation,
  onStopAnimation,
  date,
  onDateChange
}: PredictionCenterControlsProps) {
  return (
    <div className="absolute z-30 left-1/2 bottom-20 transform -translate-x-1/2">
      <div className="bg-black/90 backdrop-blur-xl rounded-2xl border border-gray-800/50 shadow-2xl overflow-hidden min-w-[500px]">
        {/* Temperature Scenario Tabs */}
        <div className="flex divide-x divide-gray-700">
          {[
            { value: 't050', label: '+5°C' },
            { value: 't100', label: '+10°C' },
            { value: 't150', label: '+15°C' },
            { value: 't200', label: '+20°C' }
          ].map(scenario => (
            <button
              key={scenario.value}
              onClick={() => onTemperatureScenarioChange(scenario.value)}
              className={`flex-1 px-6 py-3 text-sm font-semibold transition-all ${
                temperatureScenario === scenario.value
                  ? 'bg-gradient-to-b from-purple-600 to-purple-700 text-white shadow-inner'
                  : 'text-gray-400 hover:bg-gray-900/50 hover:text-gray-200'
              }`}
            >
              {scenario.label}
            </button>
          ))}
        </div>

        {/* Playback and Date Controls */}
        <div className="flex items-center gap-4 p-4 border-t border-gray-700">
          {/* Playback Controls */}
          <div className="flex gap-2">
            {!isAnimating ? (
              <>
                <button
                  onClick={() => onStartAnimation('7days')}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-4 py-2 rounded-lg transition-all flex items-center gap-2 text-sm font-medium shadow-lg"
                >
                  <Play size={14} />
                  7일 재생
                </button>
                <button
                  onClick={() => onStartAnimation('31days')}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-4 py-2 rounded-lg transition-all flex items-center gap-2 text-sm font-medium shadow-lg"
                >
                  <Play size={14} />
                  31일 재생
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={onStopAnimation}
                  className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg transition-all flex items-center gap-2 text-sm font-medium shadow-lg"
                >
                  <Pause size={14} />
                  정지
                </button>
                <div className="bg-gray-900/50 rounded-lg px-4 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-sm">
                      {animationType === '7days' ? '7일' : '31일'} 재생중
                    </span>
                    <span className="text-white text-sm font-bold">
                      {animationDay}/{animationType === '7days' ? '7' : '31'}일
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Date Slider */}
          <div className="flex-1 flex items-center gap-3">
            <span className="text-gray-400 text-sm whitespace-nowrap">날짜</span>
            <div className="flex-1 flex items-center gap-2">
              <Slider
                value={[parseInt(date.slice(-2)) - 1]}
                onValueChange={(value) => {
                  const day = (value[0] + 1).toString().padStart(2, '0')
                  onDateChange(`202407${day}`)
                }}
                min={0}
                max={30}
                step={1}
                className="flex-1"
              />
              <span className="text-white text-sm font-mono min-w-[40px]">
                7월 {parseInt(date.slice(-2))}일
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}