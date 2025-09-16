/**
 * Hook for loading district boundary data for EDA visualization
 */

import { useState, useEffect } from 'react'
import type { FeatureCollection } from 'geojson'

interface UseDistrictDataResult {
  guData: FeatureCollection | null
  dongData: FeatureCollection | null
  isLoading: boolean
  error: Error | null
}

export function useDistrictData(): UseDistrictDataResult {
  const [guData, setGuData] = useState<FeatureCollection | null>(null)
  const [dongData, setDongData] = useState<FeatureCollection | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Load district boundary data
        // First try to load the dong data which includes both gu and dong boundaries
        const dongResponse = await fetch('/data/local_economy/local_economy_dong.geojson')

        if (!dongResponse.ok) {
          throw new Error(`Failed to load district data: ${dongResponse.status}`)
        }

        const dongGeoJson = await dongResponse.json() as FeatureCollection

        // Extract gu boundaries from dong data (aggregated)
        const guFeatures = extractGuBoundaries(dongGeoJson)

        setDongData(dongGeoJson)
        setGuData({
          type: 'FeatureCollection',
          features: guFeatures
        })

      } catch (err) {
        console.error('Failed to load district data:', err)
        setError(err instanceof Error ? err : new Error('Unknown error'))
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  return {
    guData,
    dongData,
    isLoading,
    error
  }
}

/**
 * Extract gu (district) boundaries from dong-level data
 */
function extractGuBoundaries(dongData: FeatureCollection): any[] {
  const guMap = new Map<string, any[]>()

  // Group dong features by gu
  dongData.features.forEach((feature: any) => {
    const guName = feature.properties?.SIG_KOR_NM ||
                   feature.properties?.SGG_NM ||
                   feature.properties?.guName

    if (guName) {
      if (!guMap.has(guName)) {
        guMap.set(guName, [])
      }
      guMap.get(guName)?.push(feature)
    }
  })

  // Create simplified gu boundaries (for now, just use first dong as representative)
  // In production, you'd want to merge the geometries properly
  const guFeatures: any[] = []
  guMap.forEach((dongFeatures, guName) => {
    if (dongFeatures.length > 0) {
      // Use the first dong's properties as base and override with gu-specific data
      const firstDong = dongFeatures[0]
      guFeatures.push({
        type: 'Feature',
        properties: {
          ...firstDong.properties,
          guName,
          SGG_NM: guName,
          // Aggregate statistics could go here
          dongCount: dongFeatures.length
        },
        geometry: firstDong.geometry // Simplified - should merge boundaries in production
      })
    }
  })

  return guFeatures
}