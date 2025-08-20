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

  // Handle district click
  const handleDistrictClick = useCallback((event: MapLayerMouseEvent) => {
    if (!selectionMode) return false

    const feature = event.features?.[0]
    if (feature && feature.layer?.id === 'sgg-fill') {
      const props = feature.properties || {}
      const guName = props.SIGUNGU_NM || props.SIG_KOR_NM || props.GU_NM || props.nm || '자치구'
      
      setSelectedDistrict(guName)
      setSelectedFeature(feature)
      setShowDialog(true)

      if (feature.geometry && mapRef.current) {
        const bounds = getBounds(feature.geometry)
        if (bounds) {
          mapRef.current.fitBounds(bounds as [[number, number], [number, number]], {
            padding: 60,
            duration: 900
          })
        }
      }

      onDistrictSelect?.(guName, feature)
      return true
    }
    return false
  }, [selectionMode, mapRef, getBounds, onDistrictSelect])

  // Handle double click to reset
  const handleMapReset = useCallback(() => {
    if (!selectionMode) return

    setSelectedDistrict('없음')
    setSelectedFeature(null)
    setShowDialog(false)
    
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [126.9780, 37.5665],
        zoom: 10,
        pitch: 0,
        bearing: 0,
        duration: 1500
      })
    }
  }, [selectionMode, mapRef])

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