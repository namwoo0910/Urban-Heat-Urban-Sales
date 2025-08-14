'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Map, { Source, Layer, NavigationControl, Popup } from 'react-map-gl'
import type { MapRef, MapLayerMouseEvent } from 'react-map-gl'
import { geoJSONLoader } from '@/utils/geojson-loader'
import 'mapbox-gl/dist/mapbox-gl.css'

const MAPBOX_TOKEN = 'pk.eyJ1IjoieXN1MTUxNiIsImEiOiJjbWRyMHR2bTQwOTB2MmlzOGdlZmFldnVnIn0.Rv_I_4s0u88CYd7r9JbZDA'

export default function EdaCombined() {
  const mapRef = useRef<MapRef>(null)
  const [viewState, setViewState] = useState({
    longitude: 126.9780,
    latitude: 37.5665,
    zoom: 9.5,
    pitch: 0,
    bearing: 0
  })
  
  // Layer visibility states
  const [sggVisible, setSggVisible] = useState(true)
  const [dongVisible, setDongVisible] = useState(true)
  const [jibVisible, setJibVisible] = useState(true)
  
  // Selection states
  const [selectedDistrict, setSelectedDistrict] = useState<string>('없음')
  const [showDialog, setShowDialog] = useState(false)
  const [selectionMode, setSelectionMode] = useState(true)
  const [selectedFeature, setSelectedFeature] = useState<any>(null)
  
  // GeoJSON data states
  const [sggData, setSggData] = useState<any>(null)
  const [dongData, setDongData] = useState<any>(null)
  const [jibData, setJibData] = useState<any>(null)
  
  // Popup state
  const [popupInfo, setPopupInfo] = useState<{
    longitude: number
    latitude: number
    properties: any
  } | null>(null)

  // Animation state
  const [dashPhase, setDashPhase] = useState(0)
  const animationRef = useRef<number | null>(null)

  // Load GeoJSON data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [sgg, dong, jib] = await Promise.all([
          geoJSONLoader.loadWithCache('/data/eda/gu.geojson'),
          geoJSONLoader.loadWithCache('/data/eda/dong.geojson'),
          geoJSONLoader.loadWithCache('/data/eda/ct.geojson')
        ])
        setSggData(sgg)
        setDongData(dong)
        setJibData(jib)
      } catch (error) {
        console.error('Error loading GeoJSON data:', error)
      }
    }
    loadData()
  }, [])

  // Dash animation for selected district
  useEffect(() => {
    if (selectedFeature && selectionMode) {
      const animate = () => {
        setDashPhase(prev => (prev + 0.5) % 100)
        animationRef.current = requestAnimationFrame(animate)
      }
      animationRef.current = requestAnimationFrame(animate)
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      setDashPhase(0)
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [selectedFeature, selectionMode])

  // Handle district click in selection mode
  const handleMapClick = useCallback((event: MapLayerMouseEvent) => {
    if (!selectionMode) {
      // In layer view mode, show popup
      const feature = event.features?.[0]
      if (feature) {
        setPopupInfo({
          longitude: event.lngLat.lng,
          latitude: event.lngLat.lat,
          properties: feature.properties
        })
      }
      return
    }

    // In selection mode, handle district selection
    const feature = event.features?.[0]
    if (feature && feature.layer.id === 'sgg-fill') {
      const props = feature.properties || {}
      const guName = props.SIGUNGU_NM || props.SIG_KOR_NM || props.GU_NM || props.nm || '자치구'
      
      setSelectedDistrict(guName)
      setSelectedFeature(feature)
      setShowDialog(true)

      // Zoom to selected district
      if (feature.geometry && mapRef.current) {
        const bounds = getBounds(feature.geometry)
        if (bounds) {
          mapRef.current.fitBounds(bounds, {
            padding: 60,
            duration: 900
          })
          setViewState(prev => ({
            ...prev,
            pitch: 35,
            bearing: 20
          }))
        }
      }
    }
  }, [selectionMode])

  // Handle double click to reset
  const handleMapDblClick = useCallback(() => {
    if (!selectionMode) return
    
    setSelectedDistrict('없음')
    setSelectedFeature(null)
    setShowDialog(false)
    
    // Reset view
    setViewState({
      longitude: 126.9780,
      latitude: 37.5665,
      zoom: 9.5,
      pitch: 0,
      bearing: 0
    })
  }, [selectionMode])

  // Helper function to get bounds from geometry
  const getBounds = (geometry: any) => {
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
  }

  const handleVisualization = () => {
    setShowDialog(false)
    // Pulse animation effect would go here
    console.log('Starting population visualization for', selectedDistrict)
  }

  // Layer paint properties
  const sggFillPaint = {
    'fill-color': '#1864ab',
    'fill-opacity': 0.20
  }

  const sggLinePaint = {
    'line-color': '#1864ab',
    'line-width': 1.3
  }

  const dongFillPaint = {
    'fill-color': '#2b8a3e',
    'fill-opacity': 0.20
  }

  const dongLinePaint = {
    'line-color': '#2b8a3e',
    'line-width': 1.0
  }

  const jibLinePaint = {
    'line-color': '#aa1e72',
    'line-width': 0.6
  }

  const selectedFillPaint = {
    'fill-color': '#4f46e5',
    'fill-opacity': 0.28
  }

  const selectedLinePaint = {
    'line-color': '#4338ca',
    'line-width': 2.2,
    'line-dasharray': [8, dashPhase % 10 + 10, 8, Math.max(0.01, 10 - dashPhase % 10)]
  }

  return (
    <div className="relative w-full h-full">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/light-v11"
        onClick={handleMapClick}
        onDblClick={handleMapDblClick}
        interactiveLayerIds={['sgg-fill', 'dong-fill', 'jib-line']}
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="top-right" />

        {/* 자치구 Layers */}
        {sggData && (
          <Source id="sgg-source" type="geojson" data={sggData}>
            <Layer
              id="sgg-fill"
              type="fill"
              paint={sggFillPaint}
              layout={{ visibility: (!selectionMode && sggVisible) || selectionMode ? 'visible' : 'none' }}
            />
            <Layer
              id="sgg-line"
              type="line"
              paint={sggLinePaint}
              layout={{ visibility: (!selectionMode && sggVisible) || selectionMode ? 'visible' : 'none' }}
            />
            
            {/* Selected district highlight */}
            <Layer
              id="sgg-select-fill"
              type="fill"
              paint={selectedFillPaint}
              filter={['==', ['get', 'SIGUNGU_NM'], selectedDistrict]}
              layout={{ visibility: selectionMode && selectedFeature ? 'visible' : 'none' }}
            />
            <Layer
              id="sgg-select-line"
              type="line"
              paint={selectedLinePaint}
              filter={['==', ['get', 'SIGUNGU_NM'], selectedDistrict]}
              layout={{ visibility: selectionMode && selectedFeature ? 'visible' : 'none' }}
            />
          </Source>
        )}

        {/* 행정동 Layers */}
        {dongData && (
          <Source id="dong-source" type="geojson" data={dongData}>
            <Layer
              id="dong-fill"
              type="fill"
              paint={dongFillPaint}
              layout={{ visibility: !selectionMode && dongVisible ? 'visible' : 'none' }}
            />
            <Layer
              id="dong-line"
              type="line"
              paint={dongLinePaint}
              layout={{ visibility: !selectionMode && dongVisible ? 'visible' : 'none' }}
            />
            <Layer
              id="dong-select-fill"
              type="fill"
              paint={{ 'fill-color': '#10b981', 'fill-opacity': 0.25 }}
              filter={['==', ['get', 'SIGUNGU_NM'], selectedDistrict]}
              layout={{ visibility: selectionMode && selectedFeature ? 'visible' : 'none' }}
            />
            <Layer
              id="dong-select-line"
              type="line"
              paint={{ 'line-color': '#059669', 'line-width': 1.5, 'line-opacity': 0.8 }}
              filter={['==', ['get', 'SIGUNGU_NM'], selectedDistrict]}
              layout={{ visibility: selectionMode && selectedFeature ? 'visible' : 'none' }}
            />
          </Source>
        )}

        {/* 집계구 Layers */}
        {jibData && !selectionMode && (
          <Source id="jib-source" type="geojson" data={jibData}>
            <Layer
              id="jib-line"
              type="line"
              paint={jibLinePaint}
              layout={{ visibility: jibVisible ? 'visible' : 'none' }}
            />
          </Source>
        )}

        {/* Popup */}
        {popupInfo && !selectionMode && (
          <Popup
            longitude={popupInfo.longitude}
            latitude={popupInfo.latitude}
            anchor="bottom"
            onClose={() => setPopupInfo(null)}
          >
            <div style={{ fontFamily: 'system-ui', fontSize: '12px', maxWidth: '200px' }}>
              {Object.entries(popupInfo.properties || {}).map(([key, value]) => (
                <div key={key}>
                  <strong>{key}:</strong> {String(value)}
                </div>
              ))}
            </div>
          </Popup>
        )}
      </Map>
      
      {/* Controls Panel */}
      <div className="absolute left-3 z-10 bg-white p-4 rounded-xl shadow-lg font-sans max-w-xs" style={{ top: '63px' }}>
        <div className="mb-4">
          <strong className="text-gray-800 text-lg">모드 선택</strong>
          <div className="mt-2 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                checked={!selectionMode}
                onChange={() => setSelectionMode(false)}
                className="w-4 h-4"
              />
              <span className="text-gray-700">레이어 보기 모드</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                checked={selectionMode}
                onChange={() => setSelectionMode(true)}
                className="w-4 h-4"
              />
              <span className="text-gray-700">자치구 선택 모드</span>
            </label>
          </div>
        </div>

        {!selectionMode ? (
          // Layer toggle controls
          <div>
            <strong className="text-gray-800">레이어</strong>
            <label className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                checked={sggVisible}
                onChange={(e) => setSggVisible(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-gray-700">자치구</span>
            </label>
            <label className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                checked={dongVisible}
                onChange={(e) => setDongVisible(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-gray-700">행정동</span>
            </label>
            <label className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                checked={jibVisible}
                onChange={(e) => setJibVisible(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-gray-700">집계구</span>
            </label>
            
            <div className="mt-3 text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 bg-[#1864ab] rounded-sm"></span>
                <span>자치구 (파랑)</span>
              </div>
              <div className="flex items-center gap-1 mt-1">
                <span className="inline-block w-3 h-3 bg-[#2b8a3e] rounded-sm"></span>
                <span>행정동 (초록)</span>
              </div>
              <div className="flex items-center gap-1 mt-1">
                <span className="inline-block w-3 h-3 bg-[#aa1e72] rounded-sm"></span>
                <span>집계구 (자홍)</span>
              </div>
            </div>
          </div>
        ) : (
          // Selection mode info
          <div>
            <div className="text-sm font-bold text-gray-700">선택된 자치구</div>
            <div className="text-lg font-extrabold text-blue-700 mt-1">{selectedDistrict}</div>
            <div className="text-xs text-gray-500 mt-2">
              지도를 클릭하여 자치구를 선택하세요.<br/>
              더블클릭으로 선택을 초기화합니다.
            </div>
          </div>
        )}
      </div>

      {/* Dialog */}
      {showDialog && selectionMode && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div className="bg-gray-900 text-white p-4 rounded-2xl shadow-2xl max-w-2xl text-center backdrop-blur-md pointer-events-auto">
            <div className="text-sm font-semibold mb-3">
              해당 지역의 유동인구 시각화를 진행할까요?<br/>
              <small className="text-gray-400">Would you like to visualize the floating population for this area?</small>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleVisualization}
                className="px-4 py-2 bg-green-500 text-gray-900 rounded-xl font-bold hover:bg-green-400 transition-colors"
              >
                네 / Yes
              </button>
              <button
                onClick={() => setShowDialog(false)}
                className="px-4 py-2 bg-gray-600 text-gray-200 rounded-xl font-bold hover:bg-gray-500 transition-colors"
              >
                아니오 / No
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back Button */}
      <div className="absolute top-3 right-20 z-10">
        <a
          href="/research/eda"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to EDA
        </a>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-3 left-3 z-10 bg-white/90 text-gray-700 rounded-lg p-2 text-xs">
        <strong>Tips:</strong> 모드를 변경하여 레이어 토글 또는 자치구 선택 기능을 사용하세요
      </div>
    </div>
  )
}