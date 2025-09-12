/**
 * Hook for managing automatic month progression animation
 * Cycles through months sequentially with configurable speed and loop options
 */

import { useState, useEffect, useCallback, useRef } from 'react'

// Month list for cycling
const MONTH_OPTIONS = [
  '202401', '202402', '202403', '202404', '202405', '202406',
  '202407', '202408', '202409', '202410', '202411', '202412'
]

interface AutoPlayMeshAnimationProps {
  initialMonth?: string
  intervalDuration?: number // Duration in milliseconds between month changes
  loop?: boolean // Whether to loop back to January after December
  onMonthChange?: (month: string) => void
  onCycleComplete?: () => void // Called when reaching December (or looping)
}

interface AutoPlayMeshAnimationReturn {
  currentMonth: string
  isPlaying: boolean
  currentMonthIndex: number
  totalMonths: number
  progress: number // 0-100 percentage
  play: () => void
  pause: () => void
  toggle: () => void
  reset: () => void
  setSpeed: (speed: number) => void // 1, 1.5, 2
  setLoop: (loop: boolean) => void
  jumpToMonth: (month: string) => void
  nextMonth: () => void
  previousMonth: () => void
}

export function useAutoPlayMeshAnimation({
  initialMonth = '202401',
  intervalDuration = 3000, // Default 3 seconds per month
  loop = true,
  onMonthChange,
  onCycleComplete
}: AutoPlayMeshAnimationProps = {}): AutoPlayMeshAnimationReturn {
  const [currentMonth, setCurrentMonth] = useState(initialMonth)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeedState] = useState(1) // Speed multiplier
  const [loopEnabled, setLoopEnabled] = useState(loop)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [progress, setProgress] = useState(0)
  const startTimeRef = useRef<number>(0)
  
  // Get current month index
  const currentMonthIndex = MONTH_OPTIONS.indexOf(currentMonth)
  const totalMonths = MONTH_OPTIONS.length
  
  // Calculate effective interval based on speed
  const effectiveInterval = intervalDuration / speed
  
  // Clear all intervals
  const clearIntervals = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
    setProgress(0)
  }, [])
  
  // Advance to next month
  const nextMonth = useCallback(() => {
    console.log('[useAutoPlayMeshAnimation] nextMonth called')
    setCurrentMonth(current => {
      const currentIndex = MONTH_OPTIONS.indexOf(current)
      console.log('[useAutoPlayMeshAnimation] Current month:', current, 'Index:', currentIndex)
      let nextIndex = currentIndex + 1
      
      // Handle end of year
      if (nextIndex >= MONTH_OPTIONS.length) {
        if (loopEnabled) {
          nextIndex = 0 // Loop back to January
          onCycleComplete?.()
        } else {
          // Stop at December
          setIsPlaying(false)
          clearIntervals()
          onCycleComplete?.()
          return current // Stay at December
        }
      }
      
      const newMonth = MONTH_OPTIONS[nextIndex]
      console.log('[useAutoPlayMeshAnimation] New month:', newMonth)
      onMonthChange?.(newMonth)
      setProgress(0) // Reset progress for new month
      startTimeRef.current = Date.now() // Reset start time
      return newMonth
    })
  }, [loopEnabled, onMonthChange, onCycleComplete, clearIntervals])
  
  // Go to previous month
  const previousMonth = useCallback(() => {
    setCurrentMonth(current => {
      const currentIndex = MONTH_OPTIONS.indexOf(current)
      let prevIndex = currentIndex - 1
      
      // Handle beginning of year
      if (prevIndex < 0) {
        if (loopEnabled) {
          prevIndex = MONTH_OPTIONS.length - 1 // Loop to December
        } else {
          return current // Stay at January
        }
      }
      
      const newMonth = MONTH_OPTIONS[prevIndex]
      onMonthChange?.(newMonth)
      setProgress(0)
      startTimeRef.current = Date.now()
      return newMonth
    })
  }, [loopEnabled, onMonthChange])
  
  // Jump to specific month
  const jumpToMonth = useCallback((month: string) => {
    if (MONTH_OPTIONS.includes(month)) {
      setCurrentMonth(month)
      onMonthChange?.(month)
      setProgress(0)
      startTimeRef.current = Date.now()
    }
  }, [onMonthChange])
  
  // Play animation
  const play = useCallback(() => {
    console.log('[useAutoPlayMeshAnimation] Play called, effectiveInterval:', effectiveInterval)
    setIsPlaying(true)
    startTimeRef.current = Date.now()
    setProgress(0)
    
    // Set up main interval for month changes
    intervalRef.current = setInterval(() => {
      console.log('[useAutoPlayMeshAnimation] Interval triggered, calling nextMonth')
      nextMonth()
    }, effectiveInterval)
    
    // Set up progress interval for smooth progress bar updates
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current
      const newProgress = Math.min((elapsed / effectiveInterval) * 100, 100)
      setProgress(newProgress)
    }, 50) // Update every 50ms for smooth animation
  }, [nextMonth, effectiveInterval])
  
  // Pause animation
  const pause = useCallback(() => {
    setIsPlaying(false)
    clearIntervals()
  }, [clearIntervals])
  
  // Toggle play/pause
  const toggle = useCallback(() => {
    console.log('[useAutoPlayMeshAnimation] Toggle called, isPlaying:', isPlaying)
    if (isPlaying) {
      pause()
    } else {
      play()
    }
  }, [isPlaying, play, pause])
  
  // Reset to first month
  const reset = useCallback(() => {
    pause()
    setCurrentMonth(MONTH_OPTIONS[0])
    onMonthChange?.(MONTH_OPTIONS[0])
    setProgress(0)
  }, [pause, onMonthChange])
  
  // Set animation speed
  const setSpeed = useCallback((newSpeed: number) => {
    setSpeedState(newSpeed)
    // If playing, restart with new speed
    if (isPlaying) {
      pause()
      // Use setTimeout to ensure state updates before restarting
      setTimeout(() => play(), 0)
    }
  }, [isPlaying, play, pause])
  
  // Set loop enabled
  const setLoop = useCallback((enabled: boolean) => {
    setLoopEnabled(enabled)
  }, [])
  
  // Clean up intervals on unmount or when dependencies change
  useEffect(() => {
    return () => {
      clearIntervals()
    }
  }, [clearIntervals])
  
  // Restart animation when speed changes while playing
  useEffect(() => {
    if (isPlaying) {
      clearIntervals()
      startTimeRef.current = Date.now()
      
      // Set up new intervals with updated speed
      intervalRef.current = setInterval(() => {
        nextMonth()
      }, effectiveInterval)
      
      progressIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current
        const newProgress = Math.min((elapsed / effectiveInterval) * 100, 100)
        setProgress(newProgress)
      }, 50)
    }
  }, [effectiveInterval, isPlaying, nextMonth, clearIntervals])
  
  return {
    currentMonth,
    isPlaying,
    currentMonthIndex,
    totalMonths,
    progress,
    play,
    pause,
    toggle,
    reset,
    setSpeed,
    setLoop,
    jumpToMonth,
    nextMonth,
    previousMonth
  }
}