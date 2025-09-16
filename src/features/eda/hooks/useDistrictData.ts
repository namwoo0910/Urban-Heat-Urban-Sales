/**
 * Hook for loading district boundary data for EDA visualization
 */

import { useState, useEffect } from 'react'
import type { Feature, FeatureCollection, Polygon, MultiPolygon } from 'geojson'

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

        // Normalize property keys so deck.gl layers can access names consistently
        const normalizedDongGeoJson = normalizeDongFeatures(dongGeoJson)

        // Extract gu boundaries from dong data (aggregated)
        const guFeatures = extractGuBoundaries(normalizedDongGeoJson)

        setDongData(normalizedDongGeoJson)
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
    const guName = getGuName(feature.properties)

    if (guName) {
      if (!guMap.has(guName)) {
        guMap.set(guName, [])
      }
      guMap.get(guName)?.push(feature)
    }
  })

  // Create simplified gu boundaries (for now, just use first dong as representative)
  const guFeatures: any[] = []
  guMap.forEach((dongFeatures, guName) => {
    if (dongFeatures.length === 0) return

    const mergedFeature = mergeGuGeometry(dongFeatures, guName)
    if (mergedFeature) {
      guFeatures.push(mergedFeature)
    }
  })

  return guFeatures
}

function normalizeDongFeatures(dongData: FeatureCollection): FeatureCollection {
  const normalizedFeatures = dongData.features.map((feature: any) => {
    const properties = feature.properties || {}
    const guName = getGuName(properties)
    const dongName = getDongName(properties)

    return {
      ...feature,
      properties: {
        ...properties,
        ...(guName ? {
          guName,
          SGG_NM: properties?.SGG_NM ?? guName,
          SIG_KOR_NM: properties?.SIG_KOR_NM ?? guName,
          ['자치구']: properties?.['자치구'] ?? guName
        } : {}),
        ...(dongName ? {
          dongName,
          ADM_DR_NM: properties?.ADM_DR_NM ?? dongName,
          DONG_NM: properties?.DONG_NM ?? dongName,
          ['행정동']: properties?.['행정동'] ?? dongName
        } : {})
      }
    }
  })

  return {
    ...dongData,
    features: normalizedFeatures
  }
}

function getGuName(properties: any): string | null {
  return properties?.guName ||
         properties?.SGG_NM ||
         properties?.SIG_KOR_NM ||
         properties?.['자치구'] ||
         null
}

function getDongName(properties: any): string | null {
  return properties?.ADM_DR_NM ||
         properties?.dongName ||
         properties?.DONG_NM ||
         properties?.['행정동'] ||
         null
}

type PolygonFeature = Feature<Polygon | MultiPolygon>

function mergeGuGeometry(features: PolygonFeature[], guName: string): PolygonFeature | null {
  const polygons: number[][][][] = []

  for (const feature of features) {
    const geometry = feature.geometry
    if (!geometry) continue

    if (geometry.type === 'Polygon') {
      polygons.push(geometry.coordinates)
    } else if (geometry.type === 'MultiPolygon') {
      polygons.push(...geometry.coordinates)
    }
  }

  if (polygons.length === 0) {
    return null
  }

  const baseFeature = features[0]
  const geometry = polygons.length === 1
    ? { type: 'Polygon', coordinates: polygons[0] as number[][][] }
    : { type: 'MultiPolygon', coordinates: polygons as number[][][][] }

  return {
    type: 'Feature',
    geometry,
    properties: {
      ...baseFeature.properties,
      guName,
      SGG_NM: baseFeature.properties?.SGG_NM ?? guName,
      SIG_KOR_NM: baseFeature.properties?.SIG_KOR_NM ?? guName,
      ['자치구']: baseFeature.properties?.['자치구'] ?? guName,
      dongCount: features.length
    }
  }
}
