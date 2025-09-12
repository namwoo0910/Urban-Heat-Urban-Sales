/**
 * Animation control component for sequential mesh layer transitions
 * Provides play/pause, speed control, and progress indication
 */

"use client"

import { useState, useEffect } from 'react'
import { Play, Pause, SkipBack, SkipForward, ChevronLeft, ChevronRight, RotateCw } from 'lucide-react'

interface MeshAnimationControlsProps {
  isPlaying: boolean
  currentMonthIndex: number
  totalMonths: number
  speed: number
  progress?: number
  currentMonthInfo?: {
    displayName: string
    shortName: string
  }
  onPlay: () => void
  onPause: () => void
  onNext: () => void
  onPrevious: () => void
  onReset?: () => void
  onSpeedChange: (speed: number) => void
  onMonthSelect?: (index: number) => void
  className?: string
}

export function MeshAnimationControls({
  isPlaying,
  currentMonthIndex,
  totalMonths,
  speed,
  progress = 0,
  currentMonthInfo,
  onPlay,
  onPause,
  onNext,
  onPrevious,
  onReset,
  onSpeedChange,
  onMonthSelect,
  className = ''
}: MeshAnimationControlsProps) {
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)
  
  const speedOptions = [
    { value: 0.5, label: '0.5x' },
    { value: 1, label: '1x' },
    { value: 1.5, label: '1.5x' },
    { value: 2, label: '2x' },
    { value: 3, label: '3x' }
  ]

  const monthNames = [
    '1월', '2월', '3월', '4월', '5월', '6월',
    '7월', '8월', '9월', '10월', '11월', '12월'
  ]

  return (
    <div className={`flex items-center gap-3 px-4 py-2 bg-gray-900/90 backdrop-blur-sm rounded-lg border border-gray-700 ${className}`}>
      {/* Previous Month */}
      <button
        onClick={onPrevious}
        className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
        title="이전 월"
      >
        <ChevronLeft size={18} />
      </button>

      {/* Play/Pause Button */}
      <button
        onClick={isPlaying ? onPause : onPlay}
        className="p-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg transition-colors"
        title={isPlaying ? '일시정지' : '재생'}
      >
        {isPlaying ? <Pause size={20} /> : <Play size={20} />}
      </button>

      {/* Next Month */}
      <button
        onClick={onNext}
        className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
        title="다음 월"
      >
        <ChevronRight size={18} />
      </button>

      {/* Reset Button */}
      {onReset && (
        <button
          onClick={onReset}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
          title="처음으로"
        >
          <RotateCw size={16} />
        </button>
      )}

      {/* Divider */}
      <div className="w-px h-6 bg-gray-600" />

      {/* Month Display & Progress */}
      <div className="flex-1 min-w-[120px]">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-white">
            {currentMonthInfo?.displayName || `${monthNames[currentMonthIndex]} 2024`}
          </span>
          <span className="text-xs text-gray-400">
            {currentMonthIndex + 1} / {totalMonths}
          </span>
        </div>
        {/* Progress Bar */}
        <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-cyan-500 transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-gray-600" />

      {/* Speed Control */}
      <div className="relative">
        <button
          onClick={() => setShowSpeedMenu(!showSpeedMenu)}
          className="px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors flex items-center gap-1"
        >
          <span>{speed}x</span>
          <ChevronLeft size={14} className={`transition-transform ${showSpeedMenu ? 'rotate-90' : '-rotate-90'}`} />
        </button>
        
        {showSpeedMenu && (
          <>
            <div 
              className="fixed inset-0 z-40"
              onClick={() => setShowSpeedMenu(false)}
            />
            <div className="absolute bottom-full left-0 mb-2 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 overflow-hidden">
              {speedOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onSpeedChange(option.value)
                    setShowSpeedMenu(false)
                  }}
                  className={`w-full px-4 py-2 text-sm text-left hover:bg-gray-700 transition-colors ${
                    speed === option.value 
                      ? 'bg-cyan-900 text-cyan-200' 
                      : 'text-white'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Month Selector (Optional) */}
      {onMonthSelect && (
        <>
          <div className="w-px h-6 bg-gray-600" />
          <select
            value={currentMonthIndex}
            onChange={(e) => onMonthSelect(parseInt(e.target.value))}
            className="px-2 py-1 text-sm bg-gray-800 text-white border border-gray-600 rounded focus:outline-none focus:border-cyan-500"
          >
            {monthNames.map((name, index) => (
              <option key={index} value={index}>
                {name}
              </option>
            ))}
          </select>
        </>
      )}
    </div>
  )
}

/**
 * Compact animation controls for inline use
 */
export function CompactMeshAnimationControls({
  isPlaying,
  currentMonthInfo,
  onToggle,
  className = ''
}: {
  isPlaying: boolean
  currentMonthInfo?: { shortName: string }
  onToggle: () => void
  className?: string
}) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg border border-gray-600 transition-colors ${className}`}
    >
      {isPlaying ? (
        <>
          <Pause size={14} />
          <span className="text-xs">일시정지</span>
        </>
      ) : (
        <>
          <Play size={14} />
          <span className="text-xs">자동재생</span>
        </>
      )}
      {currentMonthInfo && (
        <>
          <div className="w-px h-4 bg-gray-600" />
          <span className="text-xs text-cyan-400">{currentMonthInfo.shortName}</span>
        </>
      )}
    </button>
  )
}