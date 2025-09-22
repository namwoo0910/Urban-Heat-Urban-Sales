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
  
  // Load district boundary data with optimized parallel fetching
  useEffect(() => {
    const loadBoundaries = async () => {
      try {
        setIsLoadingBoundaries(true)

        // Parallel loading of all boundary data including Seoul boundary
        const boundaryPromises = [
          loadDistrictData('sgg'),
          loadDistrictData('dong'),
          loadDistrictData('jib'),
          // Seoul boundary fetch with proper error handling
          fetch('/seoul_boundary.geojson', {
            // @ts-ignore - Next.js specific fetch options
            next: {
              tags: ['seoul-boundary'],
              revalidate: 86400 // 24 hour cache
            },
            cache: 'force-cache'
          }).then(response =>
            response.ok ? response.json() : null
          ).catch(() => null)
        ]

        const [sgg, dong, jib, seoulBoundary] = await Promise.all(boundaryPromises)

        // Update state in batch
        setSggData(sgg)
        setDongData(dong)
        setJibData(jib)
        if (seoulBoundary) {
          setSeoulBoundaryData(seoulBoundary)
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