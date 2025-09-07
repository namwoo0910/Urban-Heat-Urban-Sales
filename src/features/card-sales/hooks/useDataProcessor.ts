/**
 * useDataProcessor Hook
 * 
 * Centralized data processing hook for the CardSalesDistrictMap component.
 * Handles data loading, transformation, and caching.
 */

import { useMemo, useEffect, useState } from 'react'
import { useOptimizedMonthlyData } from './useOptimizedMonthlyData'
import { useBinaryOptimizedData } from './useBinaryOptimizedData'
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
  
  // Sales data
  const { 
    dongSalesMap, 
    dongSalesByTypeMap,
    isLoading: isSalesLoading,
    error: salesError 
  } = useOptimizedMonthlyData(filters)
  
  // Binary optimized data
  const { 
    optimizedDongData,
    optimizedDongMap,
    dongColorMap,
    isLoading: isBinaryLoading,
    error: binaryError
  } = useBinaryOptimizedData()
  
  // Height interpolation
  const heightInterpolation = useHeightInterpolation(dongSalesMap)
  
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
  
  // Process dong data with 3D heights
  const dongData3D = useMemo(() => {
    if (!dongData || !dongSalesMap || dongSalesMap.size === 0) {
      return null
    }
    
    // Add height and sales data to each dong feature
    const features = dongData.features.map((feature: any) => {
      const dongCode = feature.properties?.ADM_DR_CD || 
                      feature.properties?.dongCode || 
                      feature.properties?.dong_code ||
                      feature.properties?.['행정동코드'] ||
                      feature.properties?.DONG_CD
      
      const sales = dongCode ? dongSalesMap.get(Number(dongCode)) || 0 : 0
      const height = heightInterpolation?.getInterpolatedHeight(Number(dongCode)) || 0
      
      return {
        ...feature,
        properties: {
          ...feature.properties,
          height,
          sales,
          dongCode: Number(dongCode)
        }
      }
    })
    
    return {
      ...dongData,
      features
    } as FeatureCollection
  }, [dongData, dongSalesMap, heightInterpolation])
  
  // Combine loading states
  const isLoading = isLoadingBoundaries || isSalesLoading || isBinaryLoading
  const error = boundaryError || salesError || binaryError
  
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