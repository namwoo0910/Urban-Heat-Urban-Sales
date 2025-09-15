/**
 * useDataProcessor Hook
 * 
 * Centralized data processing hook for the CardSalesDistrictMap component.
 * Handles data loading, transformation, and caching.
 */

import { useMemo, useEffect, useState } from 'react'
// import { useOptimizedMonthlyData } from './useOptimizedMonthlyData' // Removed - optimized data deleted
// import { useBinaryOptimizedData } from './useBinaryOptimizedData' // Moved to del
import { useHeightInterpolation } from './useHeightInterpolation'
import { loadDistrictData } from '@/src/shared/utils/districtUtils'
import type { FeatureCollection } from 'geojson'
import type { FilterState } from '../components/LocalEconomyFilterPanel'

interface UseDataProcessorReturn {
  // District data
  sggData: FeatureCollection | null
  dongData: FeatureCollection | null
  jibData: FeatureCollection | null
  dongData3D: FeatureCollection | null
  seoulBoundaryData: FeatureCollection | null
  
  // Sales data
  dongSalesMap: Map<number, number>
  dongSalesByTypeMap: Map<number, Map<string, number>>
  
  // Loading states
  isLoading: boolean
  error: Error | null
  
  // Height interpolation
  heightInterpolation: any
}

export function useDataProcessor(filters?: FilterState): UseDataProcessorReturn {
  // District boundary data
  const [sggData, setSggData] = useState<FeatureCollection | null>(null)
  const [dongData, setDongData] = useState<FeatureCollection | null>(null)
  const [jibData, setJibData] = useState<FeatureCollection | null>(null)
  const [seoulBoundaryData, setSeoulBoundaryData] = useState<FeatureCollection | null>(null)
  const [isLoadingBoundaries, setIsLoadingBoundaries] = useState(true)
  const [boundaryError, setBoundaryError] = useState<Error | null>(null)
  
  // Sales data - removed optimized data loading
  const data = null
  const isSalesLoading = false
  const salesError = null

  // Create empty maps for now since polygon layers are removed
  const dongSalesMap = new Map<number, number>()
  const dongSalesByTypeMap = new Map<number, Map<string, number>>()
  
  // Binary optimized data - commented out (moved to del)
  // const { 
  //   optimizedDongData,
  //   optimizedDongMap,
  //   dongColorMap,
  //   isLoading: isBinaryLoading,
  //   error: binaryError
  // } = useBinaryOptimizedData()
  
  // Temporary placeholder values
  const isBinaryLoading = false
  const binaryError = null
  
  // Height interpolation - disabled since polygon layers are removed
  const heightInterpolation = null
  
  // Load district boundary data
  useEffect(() => {
    const loadBoundaries = async () => {
      try {
        setIsLoadingBoundaries(true)
        const [sgg, dong, jib] = await Promise.all([
          loadDistrictData('sgg'),
          loadDistrictData('dong'),
          loadDistrictData('jib')
        ])
        
        setSggData(sgg)
        setDongData(dong)
        setJibData(jib)
        
        // Load Seoul boundary if available
        try {
          const response = await fetch('/seoul_boundary.geojson')
          if (response.ok) {
            const boundary = await response.json()
            setSeoulBoundaryData(boundary)
          }
        } catch (err) {
          console.warn('Seoul boundary data not available:', err)
        }
        
        setIsLoadingBoundaries(false)
      } catch (err) {
        console.error('Error loading district boundaries:', err)
        setBoundaryError(err as Error)
        setIsLoadingBoundaries(false)
      }
    }
    
    loadBoundaries()
  }, [])
  
  // dongData3D removed - no longer needed without polygon layers
  const dongData3D = null
  
  // Combine loading states
  const isLoading = isLoadingBoundaries || isSalesLoading || isBinaryLoading
  const error = boundaryError || (salesError ? new Error(salesError) : null) || binaryError
  
  return {
    // District data
    sggData,
    dongData,
    jibData,
    dongData3D,
    seoulBoundaryData,
    
    // Sales data
    dongSalesMap,
    dongSalesByTypeMap,
    
    // Loading states
    isLoading,
    error,
    
    // Height interpolation
    heightInterpolation
  }
}