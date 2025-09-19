/**
 * Month Selector with Animation Controls for Mesh Layer
 * Direct selection of months 1-12 with auto-play animation
 */

"use client"

import { useState, useEffect, useRef } from 'react'
import { Calendar, Play, Pause, RotateCcw, Gauge, Repeat } from 'lucide-react'

export interface MeshMonthToggleProps {
  selectedMonth: number // 1-12
  onMonthChange: (month: number) => void
  className?: string
}

const MONTHS = [
  '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월'
]

export function MeshMonthToggle({
  selectedMonth,
  onMonthChange,
  className = ''
}: MeshMonthToggleProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [playSpeed, setPlaySpeed] = useState(1000) // milliseconds per month
  const [loop, setLoop] = useState(true) // Loop by default
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-play logic
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        if (selectedMonth >= 12) {
          if (loop) {
            onMonthChange(1) // Loop back to January
          } else {
            setIsPlaying(false) // Stop at December
          }
        } else {
          onMonthChange(selectedMonth + 1)
        }
      }, playSpeed)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isPlaying, playSpeed, selectedMonth, loop, onMonthChange])

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const handleReset = () => {
    setIsPlaying(false)
    onMonthChange(1)
  }

  const handleSpeedChange = (speed: number) => {
    setPlaySpeed(speed)
  }

  return (
    <div className={`${className}`}>
      {/* Header with Animation Controls */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-cyan-400" />
          <span className="text-sm font-medium text-gray-300">월별 메쉬 데이터</span>
        </div>
        
        {/* Animation Control Buttons */}
        <div className="flex items-center gap-1">
          {/* Play/Pause Button */}
          <button
            onClick={handlePlayPause}
            className={`p-1.5 rounded transition-colors duration-150 ${
              isPlaying
                ? 'bg-orange-500 text-white hover:bg-orange-600'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
            }`}
            title={isPlaying ? '일시정지' : '재생'}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          </button>
          
          {/* Loop Toggle */}
          <button
            onClick={() => setLoop(!loop)}
            className={`p-1.5 rounded transition-colors duration-150 ${
              loop
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
            }`}
            title={loop ? '반복 켜짐' : '반복 꺼짐'}
          >
            <Repeat size={14} />
          </button>
          
          {/* Reset Button */}
          <button
            onClick={handleReset}
            className="p-1.5 bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white rounded transition-colors duration-150"
            title="처음으로"
          >
            <RotateCcw size={14} />
          </button>
          
          {/* Speed Control */}
          <div className="relative group">
            <button
              className="p-1.5 bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white rounded transition-colors duration-150"
              title="재생 속도"
            >
              <Gauge size={14} />
            </button>
            
            {/* Speed Dropdown */}
            <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-600 rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity z-10">
              <button
                onClick={() => handleSpeedChange(2000)}
                className={`block w-full px-3 py-1 text-xs text-left hover:bg-gray-700 ${
                  playSpeed === 2000 ? 'text-cyan-400' : 'text-gray-300'
                }`}
              >
                0.5x (느림)
              </button>
              <button
                onClick={() => handleSpeedChange(1000)}
                className={`block w-full px-3 py-1 text-xs text-left hover:bg-gray-700 ${
                  playSpeed === 1000 ? 'text-cyan-400' : 'text-gray-300'
                }`}
              >
                1x (보통)
              </button>
              <button
                onClick={() => handleSpeedChange(500)}
                className={`block w-full px-3 py-1 text-xs text-left hover:bg-gray-700 ${
                  playSpeed === 500 ? 'text-cyan-400' : 'text-gray-300'
                }`}
              >
                2x (빠름)
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Progress Bar with Month Indicators */}
      <div className="relative mb-3">
        <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
            style={{ width: `${(selectedMonth / 12) * 100}%` }}
          />
          {isPlaying && (
            <div className="absolute inset-0 bg-white/10 animate-pulse" />
          )}
        </div>
        
        {/* Month markers */}
        <div className="flex justify-between mt-1">
          {[1, 3, 6, 9, 12].map(month => (
            <span
              key={month}
              className={`text-xs ${
                selectedMonth === month ? 'text-cyan-400' : 'text-gray-500'
              }`}
            >
              {month}월
            </span>
          ))}
        </div>
      </div>
      
      {/* Simple Month Buttons Grid */}
      <div className="grid grid-cols-6 gap-1">
        {MONTHS.map((month, index) => {
          const monthNumber = index + 1
          return (
            <button
              key={monthNumber}
              onClick={() => {
                setIsPlaying(false)
                onMonthChange(monthNumber)
              }}
              className={`px-3 py-2 text-xs font-medium rounded transition-all duration-150 ${
                selectedMonth === monthNumber
                  ? 'bg-cyan-500 text-white shadow-lg scale-105'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white border border-gray-600'
              }`}
              disabled={isPlaying}
            >
              {month}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Inline variant - horizontal button strip
 */
export function InlineMeshMonthToggle({
  selectedMonth,
  onMonthChange,
  className = ''
}: MeshMonthToggleProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        if (selectedMonth >= 12) {
          setIsPlaying(false)
          onMonthChange(1)
        } else {
          onMonthChange(selectedMonth + 1)
        }
      }, 800) // Faster for inline version
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isPlaying, selectedMonth, onMonthChange])

  return (
    <div className={`${className}`}>
      {/* Compact 2-row grid layout */}
      <div className="grid grid-cols-6 gap-0.5">
        {MONTHS.map((month, index) => {
          const monthNumber = index + 1
          return (
            <button
              key={monthNumber}
              onClick={() => {
                setIsPlaying(false)
                onMonthChange(monthNumber)
              }}
              className={`px-1 py-1 text-[10px] font-medium rounded transition-all duration-150 ${
                selectedMonth === monthNumber
                  ? 'bg-cyan-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white border border-gray-700'
              }`}
              disabled={isPlaying}
            >
              {monthNumber}월
            </button>
          )
        })}
      </div>

      {/* Playback control below */}
      <div className="flex items-center gap-1 mt-1">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`p-0.5 rounded transition-colors duration-150 ${
            isPlaying
              ? 'bg-cyan-500/20 text-cyan-400'
              : 'text-gray-500 hover:text-gray-300'
          }`}
          title={isPlaying ? '정지' : '자동재생'}
        >
          {isPlaying ? <Pause size={10} /> : <Play size={10} />}
        </button>
        <span className="text-[9px] text-gray-500">
          {isPlaying ? '재생 중...' : '자동 재생'}
        </span>
      </div>
    </div>
  )
}