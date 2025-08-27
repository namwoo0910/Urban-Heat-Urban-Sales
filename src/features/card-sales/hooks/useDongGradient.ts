/**
 * Dong Gradient Hook with Gradient Bar Data Support
 * Loads and manages dong-gradient-bars.json for 3D gradient visualization
 */

import { useState, useEffect, useCallback } from 'react'
import type { HexagonLayerData } from '../components/LayerManager'
import type { ClimateCardSalesData } from '../types'
import type { DongGradientData } from '../layers/DongGradientLayer'

interface UseDongGradientResult {
  gradientData: DongGradientData[] | null
  isProcessing: boolean
  error: string | null
}

export function useDongGradient(
  hexagonData: HexagonLayerData[] | null,
  climateData: ClimateCardSalesData[] | null,
  enabled: boolean = false
): UseDongGradientResult {
  const [gradientData, setGradientData] = useState<DongGradientData[] | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load dong-gradient-bars.json directly
  useEffect(() => {
    if (!enabled) return

    const loadGradientBars = async () => {
      setIsProcessing(true)
      try {
        // Load the pre-generated gradient bar data
        const response = await fetch('/data/dong-gradient-bars.json')
        if (!response.ok) throw new Error('Failed to load dong-gradient-bars.json')
        
        const gradientBarData: DongGradientData[] = await response.json()
        
        console.log('[useDongGradient] Loaded gradient bar data:', {
          totalDongs: gradientBarData.length,
          firstDong: gradientBarData[0]?.dongName,
          totalBars: gradientBarData.reduce((sum, d) => sum + (d.totalBars || 0), 0)
        })
        
        setGradientData(gradientBarData)
        setError(null)
      } catch (err) {
        console.error('[useDongGradient] Error loading gradient bars:', err)
        setError('Failed to load dong gradient bars')
        setGradientData(null)
      } finally {
        setIsProcessing(false)
      }
    }

    loadGradientBars()
  }, [enabled])

  return {
    gradientData,
    isProcessing,
    error
  }
}