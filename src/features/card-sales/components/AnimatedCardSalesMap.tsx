/**
 * Animated Card Sales Map
 * Test component for time series animation functionality
 */

"use client"

import React, { useEffect, useState } from "react"
import { DeckGL } from '@deck.gl/react'
import { Map as MapGL } from 'react-map-gl'
import type { MapViewState } from '@deck.gl/core'
// import { OptimizedTimeSeriesMeshLayer, OptimizedTimelineControls } from './OptimizedTimeSeriesMeshLayer' // Removed - optimized data deleted
import { getCachedTimeSeriesData } from '../utils/timeSeriesDataLoader'
import { loadDistrictData } from '@/src/shared/utils/districtUtils'
import { MAPBOX_TOKEN } from '@/src/shared/constants/mapConfig'
import { Play, Square, Settings } from 'lucide-react'

interface TimeSeriesData {
  month: string
  dongSalesMap: Map<number, number>
  label: string
}

const INITIAL_VIEW_STATE: MapViewState = {
  longitude: 126.978,
  latitude: 37.5665,
  zoom: 10.5,
  pitch: 45,
  bearing: 0
}

export function AnimatedCardSalesMap() {
  const [viewState, setViewState] = useState<MapViewState>(INITIAL_VIEW_STATE)
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([])
  const [districtData, setDistrictData] = useState<any[]>([])
  const [dongData, setDongData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentMonth, setCurrentMonth] = useState<string>('')
  const [showSettings, setShowSettings] = useState(false)
  const [autoPlay, setAutoPlay] = useState(false) // Changed default to false to prevent background processing
  const [playSpeed, setPlaySpeed] = useState(3)
  
  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        console.log('[AnimatedCardSalesMap] Starting data load')
        
        // Load district and dong data
        const [districts, dongData] = await Promise.all([
          loadDistrictData('sgg'),
          loadDistrictData('dong')
        ])
        
        if (!districts || !dongData) {
          throw new Error('Failed to load district boundaries')
        }
        
        setDistrictData(districts)
        setDongData(dongData)
        console.log('[AnimatedCardSalesMap] District data loaded')
        
        // Load time series sales data
        const seriesData = await getCachedTimeSeriesData(true)
        if (seriesData.length === 0) {
          throw new Error('No time series data loaded')
        }
        
        setTimeSeriesData(seriesData)
        setCurrentMonth(seriesData[0]?.month || '')
        console.log(`[AnimatedCardSalesMap] Time series data loaded: ${seriesData.length} months`)
        
      } catch (err) {
        console.error('[AnimatedCardSalesMap] Failed to load data:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }
    
    loadData()
  }, [])
  
  // Create optimized animated mesh layer - REMOVED (OptimizedTimeSeriesMeshLayer deleted)
  // Extract months from timeSeriesData for optimized loader
  const months = timeSeriesData.map(d => d.month)

  // Temporary placeholder until mesh layer is reimplemented
  const animatedMesh = {
    layer: null,
    controls: {
      currentMonthIndex: 0,
      setCurrentMonthIndex: () => {},
      isPlaying: false,
      togglePlay: () => {},
      nextMonth: () => {},
      prevMonth: () => {},
      goToMonth: () => {}
    }
  }
  
  if (isLoading) {
    return (
      <div className="w-full h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mb-4"></div>
          <p className="text-white">Loading animated card sales data...</p>
          <p className="text-gray-400 text-sm mt-2">This may take a few seconds</p>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="w-full h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-red-400">
          <h2 className="text-xl font-bold mb-2">Error Loading Data</h2>
          <p>{error}</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="relative w-full h-screen bg-gray-900">
      {/* Map */}
      <DeckGL
        initialViewState={INITIAL_VIEW_STATE}
        controller={{ dragRotate: true, touchRotate: true }}
        layers={animatedMesh.layer ? [animatedMesh.layer] : []}
        onViewStateChange={({ viewState }) => setViewState(viewState as any)}
        getTooltip={({ object, x, y }) => {
          if (object) {
            return {
              html: `
                <div class="bg-black/90 text-white p-3 rounded-lg border border-gray-700">
                  <div class="font-medium">${currentMonth}</div>
                  <div class="text-sm text-gray-300">Interactive mesh layer</div>
                </div>
              `,
              style: {
                fontSize: '12px',
                fontFamily: 'system-ui',
                color: 'white'
              }
            }
          }
          return null
        }}
      >
        <MapGL
          mapboxAccessToken={MAPBOX_TOKEN}
          mapStyle="mapbox://styles/mapbox/dark-v11"
          style={{ width: '100%', height: '100%' }}
        >
          {/* Semi-transparent overlay for very dark mode */}
          <div 
            className="absolute inset-0 bg-black/70 pointer-events-none" 
            style={{ mixBlendMode: 'multiply' }}
          />
        </MapGL>
      </DeckGL>
      
      {/* Header */}
      <div className="absolute top-4 left-4 z-10">
        <div className="bg-black/90 backdrop-blur-md rounded-lg p-4">
          <h1 className="text-xl font-bold text-white mb-1">
            서울시 카드매출액 시계열 애니메이션
          </h1>
          <p className="text-gray-400 text-sm">
            월별 데이터가 자동으로 전환되며 높이가 애니메이션됩니다
          </p>
        </div>
      </div>
      
      {/* Current month display */}
      <div className="absolute top-4 right-4 z-10">
        <div className="bg-black/90 backdrop-blur-md rounded-lg p-4">
          <div className="text-2xl font-bold text-cyan-400">
            {timeSeriesData.find(d => d.month === currentMonth)?.label || currentMonth}
          </div>
          <div className="text-sm text-gray-400">
            {timeSeriesData.findIndex(d => d.month === currentMonth) + 1} / {timeSeriesData.length}
          </div>
        </div>
      </div>
      
      {/* Settings panel */}
      {showSettings && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
          <div className="bg-black/90 backdrop-blur-md rounded-lg p-4 w-80">
            <h3 className="text-white font-medium mb-4">Animation Settings</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm mb-2">
                  Auto Play
                </label>
                <button
                  onClick={() => setAutoPlay(!autoPlay)}
                  className={`
                    px-3 py-1 rounded text-sm transition-colors
                    ${autoPlay 
                      ? 'bg-cyan-500 text-white' 
                      : 'bg-gray-700 text-gray-300'
                    }
                  `}
                >
                  {autoPlay ? 'Enabled' : 'Disabled'}
                </button>
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm mb-2">
                  Play Speed: {playSpeed}s per month
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={playSpeed}
                  onChange={(e) => setPlaySpeed(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Settings toggle */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="absolute top-20 right-4 z-10 p-3 bg-black/90 backdrop-blur-md rounded-lg hover:bg-gray-800/90 transition-colors"
        title="Animation Settings"
      >
        <Settings className="w-5 h-5 text-gray-300" />
      </button>
      
      {/* Timeline controls - Commented out (OptimizedTimelineControls deleted) */}
      {/* <div className="absolute bottom-4 left-4 right-4 z-10">
        <OptimizedTimelineControls
          months={months}
          controls={animatedMesh.controls}
          className="max-w-2xl mx-auto"
        />
      </div> */}
      
      {/* Performance stats */}
      <div className="absolute bottom-4 right-4 z-10">
        <div className="bg-black/90 backdrop-blur-md rounded-lg p-3">
          <div className="text-xs text-gray-400 space-y-1">
            <div>Months: {timeSeriesData.length}</div>
            <div>Current: {currentMonth}</div>
            <div>Auto: {autoPlay ? 'ON' : 'OFF'}</div>
            <div>Speed: {playSpeed}s</div>
          </div>
        </div>
      </div>
      
      {/* Instructions */}
      <div className="absolute bottom-20 left-4 z-10">
        <div className="bg-black/90 backdrop-blur-md rounded-lg p-3">
          <div className="text-sm text-gray-300 space-y-1">
            <div>• 마우스로 지도 회전/줌</div>
            <div>• 타임라인으로 월 선택</div>
            <div>• Play/Pause로 자동 재생</div>
          </div>
        </div>
      </div>
    </div>
  )
}