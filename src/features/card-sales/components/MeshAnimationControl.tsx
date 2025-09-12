/**
 * Mesh Animation Control Component
 * Provides UI controls for automatic month progression animation
 */

"use client"

import { useState } from 'react'
import { Play, Pause, RotateCcw, ChevronDown, Repeat } from 'lucide-react'

interface MeshAnimationControlProps {
  isPlaying: boolean
  currentMonth: string
  progress: number // 0-100
  speed: number // 1, 1.5, 2
  loop: boolean
  onTogglePlay: () => void
  onReset: () => void
  onSpeedChange: (speed: number) => void
  onLoopChange: (loop: boolean) => void
  className?: string
}

const MONTH_LABELS = [
  '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월'
]

const SPEED_OPTIONS = [
  { value: 1, label: '1x' },
  { value: 1.5, label: '1.5x' },
  { value: 2, label: '2x' }
]

export function MeshAnimationControl({
  isPlaying,
  currentMonth,
  progress,
  speed,
  loop,
  onTogglePlay,
  onReset,
  onSpeedChange,
  onLoopChange,
  className = ''
}: MeshAnimationControlProps) {
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)
  
  // Extract month number from format '202401' -> 1
  const monthNumber = parseInt(currentMonth.slice(4), 10)
  const monthLabel = MONTH_LABELS[monthNumber - 1] || '1월'
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Play/Pause Button */}
      <button
        onClick={onTogglePlay}
        className="p-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg border border-gray-600 transition-all duration-200 group"
        title={isPlaying ? '일시정지' : '재생'}
      >
        {isPlaying ? (
          <Pause size={16} className="text-cyan-400 group-hover:text-cyan-300" />
        ) : (
          <Play size={16} className="text-cyan-400 group-hover:text-cyan-300" />
        )}
      </button>
      
      {/* Progress Bar with Month Labels */}
      <div className="flex-1 min-w-[200px] max-w-[300px]">
        <div className="relative">
          {/* Month Labels */}
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span className="font-medium">{monthLabel}</span>
            <span className="text-gray-500">2024</span>
          </div>
          
          {/* Progress Bar */}
          <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
            {/* Month segments */}
            <div className="absolute inset-0 flex">
              {MONTH_LABELS.map((_, index) => (
                <div
                  key={index}
                  className="flex-1 border-r border-gray-600 last:border-r-0"
                  style={{ opacity: 0.3 }}
                />
              ))}
            </div>
            
            {/* Overall progress */}
            <div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-300 ease-out"
              style={{
                width: `${((monthNumber - 1) / 12) * 100 + (progress / 12)}%`
              }}
            />
            
            {/* Current month highlight */}
            <div
              className="absolute top-0 h-full bg-cyan-400 opacity-60"
              style={{
                left: `${((monthNumber - 1) / 12) * 100}%`,
                width: `${100 / 12}%`
              }}
            />
          </div>
          
          {/* Tick marks */}
          <div className="absolute top-[29px] left-0 right-0 flex">
            {MONTH_LABELS.map((_, index) => (
              <div
                key={index}
                className="flex-1 relative"
              >
                <div className="absolute left-0 w-px h-1 bg-gray-600" />
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Speed Selector */}
      <div className="relative">
        <button
          onClick={() => setShowSpeedMenu(!showSpeedMenu)}
          className="flex items-center gap-1 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg border border-gray-600 transition-colors duration-200"
        >
          <span className="text-sm font-medium">{speed}x</span>
          <ChevronDown 
            size={14} 
            className={`text-gray-400 transition-transform duration-200 ${showSpeedMenu ? 'rotate-180' : ''}`}
          />
        </button>
        
        {/* Speed Dropdown */}
        {showSpeedMenu && (
          <div className="absolute top-full right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 overflow-hidden">
            {SPEED_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onSpeedChange(option.value)
                  setShowSpeedMenu(false)
                }}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-700 transition-colors duration-150 ${
                  speed === option.value 
                    ? 'bg-cyan-900 text-cyan-200' 
                    : 'text-white'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
        
        {/* Click outside to close */}
        {showSpeedMenu && (
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setShowSpeedMenu(false)}
          />
        )}
      </div>
      
      {/* Loop Toggle */}
      <button
        onClick={() => onLoopChange(!loop)}
        className={`p-2 rounded-lg border transition-all duration-200 ${
          loop 
            ? 'bg-cyan-900 border-cyan-600 text-cyan-300 hover:bg-cyan-800' 
            : 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700'
        }`}
        title={loop ? '반복 켜짐' : '반복 꺼짐'}
      >
        <Repeat size={16} />
      </button>
      
      {/* Reset Button */}
      <button
        onClick={onReset}
        className="p-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg border border-gray-600 transition-colors duration-200 group"
        title="처음으로"
      >
        <RotateCcw size={16} className="text-gray-400 group-hover:text-white" />
      </button>
    </div>
  )
}

/**
 * Compact version for inline use
 */
export function CompactMeshAnimationControl({
  isPlaying,
  currentMonth,
  progress,
  onTogglePlay,
  className = ''
}: Pick<MeshAnimationControlProps, 'isPlaying' | 'currentMonth' | 'progress' | 'onTogglePlay' | 'className'>) {
  // Extract month number from format '202401' -> 1
  const monthNumber = parseInt(currentMonth.slice(4), 10)
  const monthLabel = MONTH_LABELS[monthNumber - 1] || '1월'
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Play/Pause Button */}
      <button
        onClick={onTogglePlay}
        className="p-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg border border-gray-600 transition-all duration-200"
        title={isPlaying ? '일시정지' : '자동 재생'}
      >
        {isPlaying ? (
          <Pause size={14} className="text-cyan-400" />
        ) : (
          <Play size={14} className="text-cyan-400" />
        )}
      </button>
      
      {/* Compact Progress */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">자동 재생</span>
        <div className="w-24 h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-300"
            style={{
              width: `${((monthNumber - 1) / 12) * 100 + (progress / 12)}%`
            }}
          />
        </div>
        <span className="text-xs font-medium text-cyan-400">{monthLabel}</span>
      </div>
    </div>
  )
}