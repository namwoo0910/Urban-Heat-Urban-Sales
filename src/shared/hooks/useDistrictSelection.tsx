'use client'

import { useState, useCallback, useRef } from 'react'
import type { MapRef, MapLayerMouseEvent } from 'react-map-gl'

interface UseDistrictSelectionProps {
  mapRef: React.RefObject<MapRef | null>
  onDistrictSelect?: (districtName: string, feature: any) => void
}

export function useDistrictSelection({ mapRef, onDistrictSelect }: UseDistrictSelectionProps) {
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedDistrict, setSelectedDistrict] = useState<string>('없음')
  const [selectedFeature, setSelectedFeature] = useState<any>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [sggVisible, setSggVisible] = useState(true)
  const [dongVisible, setDongVisible] = useState(true)
  const [jibVisible, setJibVisible] = useState(false)
  const animationRef = useRef<number | null>(null)
  const [dashPhase, setDashPhase] = useState(0)

  // Get bounds from geometry
  const getBounds = useCallback((geometry: any) => {
    if (!geometry || !geometry.coordinates) return null
    
    let minLng = Infinity, minLat = Infinity
    let maxLng = -Infinity, maxLat = -Infinity
    
    const processCoords = (coords: any): void => {
      if (Array.isArray(coords[0])) {
        coords.forEach(processCoords)
      } else {
        const [lng, lat] = coords
        minLng = Math.min(minLng, lng)
        maxLng = Math.max(maxLng, lng)
        minLat = Math.min(minLat, lat)
        maxLat = Math.max(maxLat, lat)
      }
    }
    
    processCoords(geometry.coordinates)
    
    return [[minLng, minLat], [maxLng, maxLat]]
  }, [])

  // Handle district click (both 자치구 and 행정동)
  const handleDistrictClick = useCallback((event: MapLayerMouseEvent) => {
    // console.log('[Click Event Received]', {
    //   hasFeatures: !!event.features,
    //   featureCount: event.features?.length,
    //   firstFeatureLayer: event.features?.[0]?.layer?.id
    // })
    
    const feature = event.features?.[0]
    
    // Check if clicked on 자치구 or 행정동
    if (feature && (feature.layer?.id === 'sgg-fill' || feature.layer?.id === 'dong-fill')) {
      const props = feature.properties || {}
      let districtName = ''
      
      // For 자치구 (sgg)
      if (feature.layer.id === 'sgg-fill') {
        districtName = props.SIGUNGU_NM || props.SIG_KOR_NM || props.GU_NM || props.nm || '자치구'
      }
      // For 행정동 (dong)
      else if (feature.layer.id === 'dong-fill') {
        districtName = props.행정동 || props.ADM_NM || props.H_DONG_NM || props.DONG_NM || props.ADM_DR_NM || props.nm || '행정동'
      }
      
      setSelectedDistrict(districtName)
      setSelectedFeature(feature)
      setShowDialog(true)

      if (feature.geometry && mapRef.current) {
        const bounds = getBounds(feature.geometry)
        if (bounds) {
          mapRef.current.fitBounds(bounds as [[number, number], [number, number]], {
            padding: 80,
            duration: 800,  // Smooth animation for better UX
            essential: true  // This animation is essential with respect to prefers-reduced-motion
          })
        }
      }

      // console.log('[District Selected]', {
      //   layerId: feature.layer.id,
      //   districtName
      // })
      
      onDistrictSelect?.(districtName, feature)
      return true
    }
    return false
  }, [mapRef, getBounds, onDistrictSelect])

  // Handle double click to reset
  const handleMapReset = useCallback(() => {

    setSelectedDistrict('없음')
    setSelectedFeature(null)
    setShowDialog(false)
    
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [126.9780, 37.5665],
        zoom: 10,
        pitch: 0,
        bearing: 0,
        duration: 1000,  // Faster reset animation
        essential: true
      })
    }
  }, [mapRef])

  // Start dash animation
  const startDashAnimation = useCallback(() => {
    const animate = () => {
      setDashPhase(prev => (prev + 0.5) % 100)
      animationRef.current = requestAnimationFrame(animate)
    }
    animationRef.current = requestAnimationFrame(animate)
  }, [])

  // Stop dash animation
  const stopDashAnimation = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    setDashPhase(0)
  }, [])

  return {
    // States
    selectionMode,
    selectedDistrict,
    selectedFeature,
    showDialog,
    sggVisible,
    dongVisible,
    jibVisible,
    dashPhase,
    
    // Setters
    setSelectionMode,
    setSelectedDistrict,
    setSelectedFeature,
    setShowDialog,
    setSggVisible,
    setDongVisible,
    setJibVisible,
    
    // Handlers
    handleDistrictClick,
    handleMapReset,
    startDashAnimation,
    stopDashAnimation,
    getBounds
  }
}