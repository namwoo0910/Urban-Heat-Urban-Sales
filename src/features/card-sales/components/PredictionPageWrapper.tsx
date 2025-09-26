"use client"

import { useState, useCallback, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import type { CardSalesDistrictMapHandle } from './CardSalesDistrictMap'

// Dynamic import to avoid SSR issues with deck.gl
const CardSalesDistrictMap = dynamic(
  () => import("./CardSalesDistrictMap"),
  {
    loading: () => (
      <div className="absolute inset-0 bg-black flex items-center justify-center">
        <div className="text-white">AI 예측 시뮬레이션 로딩 중...</div>
      </div>
    ),
    ssr: false
  }
)

export default function PredictionPageWrapper() {
  // Ref to control CardSalesDistrictMap animations
  const mapRef = useRef<CardSalesDistrictMapHandle>(null)

  // State for center controls
  const [temperatureScenario, setTemperatureScenario] = useState('t050')
  const [isAnimating, setIsAnimating] = useState(true) // Start with animation playing
  const [animationType, setAnimationType] = useState<'7days' | '31days' | null>('31days') // Default to 31 days
  const [animationDay, setAnimationDay] = useState(1)
  const [date, setDate] = useState('20240701')

  // Define animation handlers first
  const handleStartAnimation = useCallback((type: '7days' | '31days') => {
    mapRef.current?.startBothAnimations(type)
    setIsAnimating(true)
    setAnimationType(type)
    setAnimationDay(1)
  }, [])

  const handleStopAnimation = useCallback(() => {
    mapRef.current?.stopBothAnimations()
    setIsAnimating(false)
    setAnimationType(null)
    setAnimationDay(1)
  }, [])

  // WebSocket event listeners for controller commands
  useEffect(() => {
    const handleTempScenario = (e: CustomEvent<{ scenario: string }>) => {
      console.log('[PredictionWrapper] temp scenario:', e.detail.scenario)
      setTemperatureScenario(e.detail.scenario)
    }

    const handleStartAnimationEvent = (e: CustomEvent<{ type: '7days' | '31days' }>) => {
      console.log('[PredictionWrapper] start animation:', e.detail.type)
      handleStartAnimation(e.detail.type)
    }

    const handleStopAnimationEvent = () => {
      console.log('[PredictionWrapper] stop animation')
      handleStopAnimation()
    }

    window.addEventListener('viz:prediction:temp-scenario', handleTempScenario as EventListener)
    window.addEventListener('viz:prediction:start-animation', handleStartAnimationEvent as EventListener)
    window.addEventListener('viz:prediction:stop-animation', handleStopAnimationEvent as EventListener)

    return () => {
      window.removeEventListener('viz:prediction:temp-scenario', handleTempScenario as EventListener)
      window.removeEventListener('viz:prediction:start-animation', handleStartAnimationEvent as EventListener)
      window.removeEventListener('viz:prediction:stop-animation', handleStopAnimationEvent as EventListener)
    }
  }, [handleStartAnimation, handleStopAnimation])

  // Auto-start 31-day animation on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapRef.current) {
        console.log('[PredictionWrapper] Auto-starting 31-day animation')
        handleStartAnimation('31days')
      }
    }, 500) // Small delay to ensure map is ready

    return () => clearTimeout(timer)
  }, [handleStartAnimation])

  // Animation polling to sync state
  useEffect(() => {
    if (!mapRef.current) return

    const interval = setInterval(() => {
      const state = mapRef.current?.getAnimationState()
      if (state) {
        // Check if animation just completed
        const wasAnimating = isAnimating
        const isNowAnimating = state.isAnimating

        setIsAnimating(isNowAnimating)
        setAnimationType(state.animationType)
        setAnimationDay(state.animationDay)

        // Update date during animation
        if (isNowAnimating && state.currentDate) {
          setDate(state.currentDate)
        }

        // Auto-stop when animation completes
        if (wasAnimating && !isNowAnimating) {
          setIsAnimating(false)
          setAnimationType(null)
          setAnimationDay(1)
        }
      }
    }, 100) // Poll every 100ms

    return () => clearInterval(interval)
  }, [isAnimating])


  return (
    <div className="relative w-full h-full">
      <CardSalesDistrictMap
        ref={mapRef}
        initialAIPredictionMode={true}
        temperatureScenario={temperatureScenario}
        predictionDate={date}
      />
      {/* Temperature scenario now displayed in the existing info box within CardSalesDistrictMap */}
      {/* PredictionCenterControls removed - now controlled via WebSocket from controller panel */}
    </div>
  )
}