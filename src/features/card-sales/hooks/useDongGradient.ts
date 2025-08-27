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

  // Load dong-gradient-bars.json and merge with sales data
  useEffect(() => {
    if (!enabled) return

    const loadGradientBars = async () => {
      setIsProcessing(true)
      try {
        // Load the pre-generated gradient bar data
        const response = await fetch('/data/dong-gradient-bars.json')
        if (!response.ok) throw new Error('Failed to load dong-gradient-bars.json')
        
        const gradientBarData: DongGradientData[] = await response.json()
        
        // Calculate total sales per dong from climate data
        const dongSalesMap = new Map<string, number>()
        if (climateData && climateData.length > 0) {
          climateData.forEach(item => {
            const dongName = item.dongName || ''
            const sales = item.totalSales || 0
            if (dongName && sales > 0) {
              const currentSales = dongSalesMap.get(dongName) || 0
              dongSalesMap.set(dongName, currentSales + sales)
            }
          })
        }
        
        // Add sales data to each dong's gradient data
        const enrichedData = gradientBarData.map(dongData => ({
          ...dongData,
          value: dongSalesMap.get(dongData.dongName) || 0, // Total sales for this dong
        }))
        
        console.log('[useDongGradient] Loaded gradient bar data with sales:', {
          totalDongs: enrichedData.length,
          firstDong: enrichedData[0]?.dongName,
          firstDongSales: enrichedData[0]?.value,
          totalBars: enrichedData.reduce((sum, d) => sum + (d.totalBars || 0), 0),
          dongsWithSales: enrichedData.filter(d => d.value > 0).length
        })
        
        setGradientData(enrichedData)
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
  }, [enabled, climateData])

  return {
    gradientData,
    isProcessing,
    error
  }
}