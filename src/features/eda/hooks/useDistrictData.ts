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

        // Load district boundary data separately
        // Load gu boundaries from seoul_boundary.geojson
        const guResponse = await fetch('/seoul_boundary.geojson')

        if (!guResponse.ok) {
          throw new Error(`Failed to load gu data: ${guResponse.status}`)
        }

        const guGeoJson = await guResponse.json() as FeatureCollection

        // Load dong boundaries from local_economy_dong.geojson
        const dongResponse = await fetch('/data/local_economy/local_economy_dong.geojson')

        if (!dongResponse.ok) {
          throw new Error(`Failed to load dong data: ${dongResponse.status}`)
        }

        const dongGeoJson = await dongResponse.json() as FeatureCollection

        // Normalize property keys so deck.gl layers can access names consistently
        const normalizedGuGeoJson = normalizeGuFeatures(guGeoJson)
        const normalizedDongGeoJson = normalizeDongFeatures(dongGeoJson)

        setGuData(normalizedGuGeoJson)
        setDongData(normalizedDongGeoJson)

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
 * Normalize gu features to have consistent property names
 */
function normalizeGuFeatures(guData: FeatureCollection): FeatureCollection {
  const normalizedFeatures = guData.features.map((feature: any) => {
    const properties = feature.properties || {}

    // Extract gu name from various possible property keys
    const guName = properties.SGG_NM?.replace('서울특별시 ', '') ||
                   properties.SIG_KOR_NM ||
                   properties.guName ||
                   properties['자치구'] ||
                   ''

    // Extract gu code
    const guCode = properties.ADM_SECT_C ? parseInt(properties.ADM_SECT_C) : null

    return {
      ...feature,
      properties: {
        ...properties,
        guName,
        guCode,
        SGG_NM: guName,
        SIG_KOR_NM: guName,
        ['자치구']: guName,
        ['자치구코드']: guCode
      }
    }
  })

  return {
    type: 'FeatureCollection',
    features: normalizedFeatures
  }
}

function normalizeDongFeatures(dongData: FeatureCollection): FeatureCollection {
  const normalizedFeatures = dongData.features.map((feature: any) => {
    const properties = feature.properties || {}
    const guName = getGuName(properties)
    const dongName = getDongName(properties)

    // Extract gu code
    const guCode = properties['자치구코드'] || null

    return {
      ...feature,
      properties: {
        ...properties,
        ...(guName ? {
          guName,
          guCode,
          SGG_NM: properties?.SGG_NM ?? guName,
          SIG_KOR_NM: properties?.SIG_KOR_NM ?? guName,
          ['자치구']: properties?.['자치구'] ?? guName,
          ['자치구코드']: guCode
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

// Removed mergeGuGeometry function as we now load gu boundaries directly from seoul_boundary.geojson
