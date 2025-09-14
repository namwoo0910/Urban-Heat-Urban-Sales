/**
 * Daily Time Series Mesh Layer
 * Plays pre-generated daily meshes (366 days) with smooth transitions.
 * Uses usePreGeneratedSeoulMeshLayer with `date` prop to load daily binaries.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { Calendar, Loader2, Pause, Play, SkipBack, SkipForward } from 'lucide-react'
import { usePreGeneratedSeoulMeshLayer } from './SeoulMeshLayer'
import { getAvailableDailyDates } from '../utils/loadStaticMesh'
import { getSeasonalMeshColor, rgbaToHex } from '../utils/seasonalMeshColors'

export interface DailyTimeSeriesProps {
  visible?: boolean
  autoPlay?: boolean
  playSpeed?: number // seconds per step
  wireframe?: boolean
}

/**
 * Returns YYYY-MM-DD label from YYYYMMDD code
 */
function formatDateLabel(dateCode: string): string {
  if (!dateCode || dateCode.length !== 8) return dateCode
  const y = dateCode.slice(0, 4)
  const m = dateCode.slice(4, 6)
  const d = dateCode.slice(6, 8)
  return `${y}-${m}-${d}`
}

/**
 * Daily mesh playback component that returns a DeckGL layer and control API
 */
export function DailyTimeSeriesMeshLayer({
  visible = true,
  autoPlay = false,
  playSpeed = 2,
  wireframe = true
}: DailyTimeSeriesProps) {
  const [dates, setDates] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(autoPlay)
  const [isLoadingList, setIsLoadingList] = useState(true)
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Load available daily dates from index
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setIsLoadingList(true)
      const list = await getAvailableDailyDates()
      if (!cancelled) {
        // Ensure sorted order
        const sorted = [...list].sort()
        setDates(sorted)
        setCurrentIndex(0)
        setIsLoadingList(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Current date code and seasonal color
  const currentDate = dates[currentIndex]
  const currentMonth = currentDate ? currentDate.slice(0, 6) : ''
  const seasonalRgba = currentMonth ? getSeasonalMeshColor(currentMonth) : [0, 255, 225, 255]
  const seasonalHex = useMemo(() => rgbaToHex(seasonalRgba as [number, number, number, number]), [seasonalRgba])

  // Use pre-generated mesh hook with date prop
  const { layer, isLoading } = usePreGeneratedSeoulMeshLayer({
    visible,
    wireframe,
    color: seasonalHex,
    date: currentDate,
    pickable: false,
    opacity: 1,
    animatedOpacity: 0.9
  })

  // Controls
  const handlePlayPause = () => setIsPlaying(v => !v)
  const handleNext = () => {
    if (!dates.length) return
    setCurrentIndex((i) => (i + 1) % dates.length)
  }
  const handlePrevious = () => {
    if (!dates.length) return
    setCurrentIndex((i) => (i - 1 + dates.length) % dates.length)
  }
  const handleSelectIndex = (index: number) => {
    if (index >= 0 && index < dates.length) setCurrentIndex(index)
  }

  // Auto playback
  useEffect(() => {
    if (isPlaying && !isLoading && !isLoadingList && dates.length > 0) {
      playIntervalRef.current = setInterval(() => {
        handleNext()
      }, Math.max(200, playSpeed * 1000))
    } else {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current)
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current)
    }
  }, [isPlaying, isLoading, isLoadingList, playSpeed, dates.length])

  return {
    layer,
    controls: {
      isPlaying,
      isLoading: isLoading || isLoadingList,
      currentIndex,
      total: dates.length,
      currentDate,
      currentLabel: currentDate ? formatDateLabel(currentDate) : '',
      handlePlayPause,
      handleNext,
      handlePrevious,
      handleSelectIndex
    }
  }
}

/**
 * Simple daily timeline controls
 */
export function DailyTimelineControls({
  controls,
  className = ''
}: {
  controls: ReturnType<typeof DailyTimeSeriesMeshLayer>['controls']
  className?: string
}) {
  const { 
    isPlaying,
    isLoading,
    currentIndex,
    total,
    currentLabel,
    handlePlayPause,
    handleNext,
    handlePrevious
  } = controls

  return (
    <div className={`bg-black/90 backdrop-blur-md rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-cyan-400" />
          <span className="text-white font-medium">{currentLabel || 'Loading...'}</span>
        </div>
        <div className="text-sm text-gray-400">{currentIndex + 1} / {total || 0}</div>
      </div>

      {/* Playback controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={handlePrevious}
          disabled={isLoading || total === 0}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
          title="Previous day"
        >
          <SkipBack className="w-5 h-5 text-gray-300" />
        </button>

        <button
          onClick={handlePlayPause}
          disabled={isLoading || total === 0}
          className="p-3 bg-cyan-500/20 hover:bg-cyan-500/30 rounded-lg transition-colors disabled:opacity-50"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6 text-cyan-400" />
          ) : (
            <Play className="w-6 h-6 text-cyan-400" />
          )}
        </button>

        <button
          onClick={handleNext}
          disabled={isLoading || total === 0}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
          title="Next day"
        >
          <SkipForward className="w-5 h-5 text-gray-300" />
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 mt-3 text-gray-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
          <span>Loading daily mesh...</span>
        </div>
      )}
    </div>
  )
}

