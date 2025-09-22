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

        // Check for cached data first
        const cachedGuData = sessionStorage.getItem('seoul_gu_data')
        const cachedDongData = sessionStorage.getItem('seoul_dong_data')

        if (cachedGuData && cachedDongData) {
          console.log('Loading district data from cache')
          const guGeoJson = JSON.parse(cachedGuData) as FeatureCollection
          const dongGeoJson = JSON.parse(cachedDongData) as FeatureCollection

          const normalizedGuGeoJson = normalizeGuFeatures(guGeoJson)
          const normalizedDongGeoJson = normalizeDongFeatures(dongGeoJson)

          setGuData(normalizedGuGeoJson)
          setDongData(normalizedDongGeoJson)
          setIsLoading(false)
          return
        }

        // Load district boundary data separately
        // Load gu boundaries from seoul_boundary.geojson
        console.log('Fetching gu boundary data...')
        const guResponse = await fetch('/seoul_boundary.geojson', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(30000), // 30 second timeout
        })

        if (!guResponse.ok) {
          throw new Error(`Failed to load gu data: ${guResponse.status} ${guResponse.statusText}`)
        }

        // Validate response before parsing
        const guContentType = guResponse.headers.get('content-type')
        const guContentLength = guResponse.headers.get('content-length')
        console.log('Gu response headers:', {
          contentType: guContentType,
          contentLength: guContentLength,
          status: guResponse.status
        })

        // Parse JSON with error handling
        let guGeoJson: FeatureCollection
        try {
          const guText = await guResponse.text()
          if (!guText || guText.trim() === '') {
            throw new Error('Empty response body for gu data')
          }
          console.log(`Gu data loaded: ${guText.length} characters`)
          guGeoJson = JSON.parse(guText) as FeatureCollection
        } catch (parseError) {
          console.error('Failed to parse gu JSON:', parseError)
          throw new Error(`Failed to parse gu data as JSON: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`)
        }

        // Load dong boundaries from local_economy_dong.geojson
        console.log('Fetching dong boundary data...')
        const dongResponse = await fetch('/data/local_economy/local_economy_dong.geojson', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(30000), // 30 second timeout
        })

        if (!dongResponse.ok) {
          throw new Error(`Failed to load dong data: ${dongResponse.status} ${dongResponse.statusText}`)
        }

        // Validate dong response before parsing
        const dongContentType = dongResponse.headers.get('content-type')
        const dongContentLength = dongResponse.headers.get('content-length')
        console.log('Dong response headers:', {
          contentType: dongContentType,
          contentLength: dongContentLength,
          status: dongResponse.status
        })

        // Parse JSON with error handling
        let dongGeoJson: FeatureCollection
        try {
          const dongText = await dongResponse.text()
          if (!dongText || dongText.trim() === '') {
            throw new Error('Empty response body for dong data')
          }
          console.log(`Dong data loaded: ${dongText.length} characters`)
          dongGeoJson = JSON.parse(dongText) as FeatureCollection
        } catch (parseError) {
          console.error('Failed to parse dong JSON:', parseError)
          throw new Error(`Failed to parse dong data as JSON: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`)
        }

        // Normalize property keys so deck.gl layers can access names consistently
        const normalizedGuGeoJson = normalizeGuFeatures(guGeoJson)
        const normalizedDongGeoJson = normalizeDongFeatures(dongGeoJson)

        // Cache the data for future use
        try {
          sessionStorage.setItem('seoul_gu_data', JSON.stringify(guGeoJson))
          sessionStorage.setItem('seoul_dong_data', JSON.stringify(dongGeoJson))
          console.log('District data cached successfully')
        } catch (cacheError) {
          console.warn('Failed to cache district data:', cacheError)
          // Continue even if caching fails
        }

        setGuData(normalizedGuGeoJson)
        setDongData(normalizedDongGeoJson)

      } catch (err) {
        console.error('Failed to load district data:', err)

        // Provide more detailed error information
        let errorMessage = 'Failed to load district data'
        if (err instanceof Error) {
          errorMessage = err.message
          if (err.name === 'AbortError') {
            errorMessage = 'Request timed out while loading district data. Please check your network connection and try again.'
          }
        }

        setError(new Error(errorMessage))

        // Try to load from a fallback if main loading fails
        console.log('Attempting to load fallback data...')
        try {
          // Try loading smaller test data or default boundaries
          const fallbackGuResponse = await fetch('/data/eda/seoul_gu.geojson')
          const fallbackDongResponse = await fetch('/data/eda/seoul_dong.geojson')

          if (fallbackGuResponse.ok && fallbackDongResponse.ok) {
            const fallbackGuData = await fallbackGuResponse.json() as FeatureCollection
            const fallbackDongData = await fallbackDongResponse.json() as FeatureCollection

            const normalizedGuGeoJson = normalizeGuFeatures(fallbackGuData)
            const normalizedDongGeoJson = normalizeDongFeatures(fallbackDongData)

            setGuData(normalizedGuGeoJson)
            setDongData(normalizedDongGeoJson)
            console.log('Loaded fallback district data successfully')
            setError(null) // Clear error if fallback succeeds
          }
        } catch (fallbackErr) {
          console.error('Fallback loading also failed:', fallbackErr)
        }
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
