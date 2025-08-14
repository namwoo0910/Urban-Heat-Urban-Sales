'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

mapboxgl.accessToken = 'pk.eyJ1IjoieXN1MTUxNiIsImEiOiJjbWRyMHR2bTQwOTB2MmlzOGdlZmFldnVnIn0.Rv_I_4s0u88CYd7r9JbZDA'

export default function EdaDistrictSelect() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [selectedDistrict, setSelectedDistrict] = useState<string>('없음')
  const [showDialog, setShowDialog] = useState(false)
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    if (!mapContainer.current || map.current) return

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [126.9780, 37.5665],
      zoom: 9.5,
      attributionControl: false
    })

    const mapInstance = map.current

    mapInstance.addControl(new mapboxgl.NavigationControl(), 'top-right')
    mapInstance.addControl(new mapboxgl.AttributionControl({ compact: true }))

    const PATH_SGG = '/data/eda/gu.geojson'
    const PATH_CT = '/data/eda/dong.geojson'

    let SGG_DATA: any = null
    let CT_DATA: any = null
    let dashPhase = 0

    const extendBoundsFromGeoJSON = (bounds: mapboxgl.LngLatBounds, gj: any) => {
      if (!gj || !gj.features) return bounds
      gj.features.forEach((f: any) => {
        const geom = f.geometry
        if (!geom) return
        const coords = (function flatten(c: any): any[] {
          return Array.isArray(c[0]) ? c.flatMap(flatten) : [c]
        })(geom.coordinates || [])
        coords.forEach(([lng, lat]: [number, number]) => bounds.extend([lng, lat]))
      })
      return bounds
    }

    const startDashAnimation = () => {
      if (animationRef.current) return
      
      const tick = () => {
        dashPhase = (dashPhase + 0.02) % 1
        const base = 8, gap = 10
        const offset = gap * dashPhase
        const pattern = [base, gap + offset, base, Math.max(0.01, gap - offset)]
        
        if (mapInstance.getLayer('sgg-select-line')) {
          mapInstance.setPaintProperty('sgg-select-line', 'line-dasharray', pattern)
        }
        animationRef.current = requestAnimationFrame(tick)
      }
      animationRef.current = requestAnimationFrame(tick)
    }

    const stopDashAnimation = () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      if (mapInstance.getLayer('sgg-select-line')) {
        mapInstance.setPaintProperty('sgg-select-line', 'line-dasharray', [1, 0])
      }
    }

    mapInstance.on('load', async () => {
      const [sgg, ct] = await Promise.all([
        fetch(PATH_SGG).then(r => r.json()).catch(() => null),
        fetch(PATH_CT).then(r => r.json()).catch(() => null)
      ])
      SGG_DATA = sgg
      CT_DATA = ct

      if (SGG_DATA) mapInstance.addSource('sgg-src', { type: 'geojson', data: SGG_DATA })
      if (CT_DATA) mapInstance.addSource('ct-src', { type: 'geojson', data: CT_DATA })

      // Base layers
      if (SGG_DATA) {
        mapInstance.addLayer({
          id: 'sgg-fill',
          type: 'fill',
          source: 'sgg-src',
          paint: { 'fill-color': '#1f4b99', 'fill-opacity': 0.15 }
        })
        mapInstance.addLayer({
          id: 'sgg-line',
          type: 'line',
          source: 'sgg-src',
          paint: { 'line-color': '#1f4b99', 'line-width': 1.4 }
        })
      }

      // Selection layers
      if (SGG_DATA) {
        mapInstance.addLayer({
          id: 'sgg-select-fill',
          type: 'fill',
          source: 'sgg-src',
          filter: ['==', ['get', 'SIGUNGU_NM'], '___none___'],
          paint: { 'fill-color': '#4f46e5', 'fill-opacity': 0.28 }
        })
        mapInstance.addLayer({
          id: 'sgg-select-glow',
          type: 'line',
          source: 'sgg-src',
          filter: ['==', ['get', 'SIGUNGU_NM'], '___none___'],
          paint: { 'line-color': '#6366f1', 'line-width': 8, 'line-opacity': 0.18, 'line-blur': 1.2 }
        })
        mapInstance.addLayer({
          id: 'sgg-select-line',
          type: 'line',
          source: 'sgg-src',
          filter: ['==', ['get', 'SIGUNGU_NM'], '___none___'],
          paint: { 'line-color': '#4338ca', 'line-width': 2.2, 'line-dasharray': [1, 0] }
        })
      }

      // 행정동 layers
      if (CT_DATA) {
        mapInstance.addLayer({
          id: 'ct-fill',
          type: 'fill',
          source: 'ct-src',
          filter: ['==', ['get', 'ADM_NM'], '___none___'],
          paint: { 'fill-color': '#10b981', 'fill-opacity': 0.25 }
        })
        mapInstance.addLayer({
          id: 'ct-line',
          type: 'line',
          source: 'ct-src',
          filter: ['==', ['get', 'ADM_NM'], '___none___'],
          paint: { 'line-color': '#059669', 'line-width': 1.5, 'line-opacity': 0.8 }
        })
      }

      // Hover effects
      mapInstance.on('mouseenter', 'sgg-fill', () => {
        mapInstance.getCanvas().style.cursor = 'pointer'
      })
      mapInstance.on('mouseleave', 'sgg-fill', () => {
        mapInstance.getCanvas().style.cursor = ''
      })

      // Click handler
      mapInstance.on('click', 'sgg-fill', (e: any) => {
        const f = e.features && e.features[0]
        if (!f) return

        const props = f.properties || {}
        const guName = props.SIGUNGU_NM || props.SIG_KOR_NM || props.GU_NM || props.nm || '자치구'
        
        setSelectedDistrict(guName)

        // Update selection filter
        const filterByName = ['==', ['get', 'SIGUNGU_NM'], guName]
        if (mapInstance.getLayer('sgg-select-fill')) mapInstance.setFilter('sgg-select-fill', filterByName)
        if (mapInstance.getLayer('sgg-select-glow')) mapInstance.setFilter('sgg-select-glow', filterByName)
        if (mapInstance.getLayer('sgg-select-line')) mapInstance.setFilter('sgg-select-line', filterByName)

        // Show 행정동
        if (mapInstance.getLayer('ct-fill')) {
          const dongFilter = ['==', ['get', 'SIGUNGU_NM'], guName]
          mapInstance.setFilter('ct-fill', dongFilter)
          if (mapInstance.getLayer('ct-line')) {
            mapInstance.setFilter('ct-line', dongFilter)
          }
        }

        // Fit bounds
        if (f.geometry && f.geometry.type) {
          const bounds = new mapboxgl.LngLatBounds()
          const extend = (c: any): void => {
            if (Array.isArray(c[0])) {
              c.forEach(extend)
            } else {
              bounds.extend(c as [number, number])
            }
          }
          extend(f.geometry.coordinates)
          mapInstance.fitBounds(bounds, {
            padding: 60,
            maxZoom: 12.5,
            duration: 900,
            pitch: 35,
            bearing: 20
          })
        }

        startDashAnimation()
        setShowDialog(true)
      })

      // Double click to reset
      mapInstance.on('dblclick', () => {
        setSelectedDistrict('없음')
        stopDashAnimation()
        setShowDialog(false)
        
        ;['sgg-select-fill', 'sgg-select-glow', 'sgg-select-line'].forEach(id => {
          if (mapInstance.getLayer(id)) {
            mapInstance.setFilter(id, ['==', ['get', 'SIGUNGU_NM'], '___none___'])
          }
        })
        
        if (mapInstance.getLayer('ct-fill')) mapInstance.setFilter('ct-fill', ['==', ['get', 'SIGUNGU_NM'], '___none___'])
        if (mapInstance.getLayer('ct-line')) mapInstance.setFilter('ct-line', ['==', ['get', 'SIGUNGU_NM'], '___none___'])
        
        const b = new mapboxgl.LngLatBounds()
        extendBoundsFromGeoJSON(b, SGG_DATA)
        if (!b.isEmpty()) {
          mapInstance.fitBounds(b, {
            padding: 40,
            maxZoom: 12,
            duration: 600,
            pitch: 0,
            bearing: 0
          })
        }
      })

      // Initial fit bounds
      const bounds = new mapboxgl.LngLatBounds()
      extendBoundsFromGeoJSON(bounds, SGG_DATA)
      if (!bounds.isEmpty()) {
        mapInstance.fitBounds(bounds, { padding: 40, maxZoom: 12 })
      }
    })

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [])

  const handleVisualization = () => {
    setShowDialog(false)
    // Add pulse animation effect
    if (map.current) {
      let t = 0
      const pulse = () => {
        t = (t + 0.03) % (2 * Math.PI)
        const opacity = 0.35 + 0.25 * Math.sin(t)
        if (map.current?.getLayer('sgg-select-fill')) {
          map.current.setPaintProperty('sgg-select-fill', 'fill-opacity', opacity)
        }
        requestAnimationFrame(pulse)
      }
      requestAnimationFrame(pulse)
    }
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="absolute inset-0" />
      
      {/* Info Panel */}
      <div className="absolute left-3 top-3 z-10 bg-white text-gray-800 rounded-2xl p-3 shadow-lg min-w-[220px]">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-full bg-blue-50 text-blue-700 mb-2">
          <span>서울</span>
          <span>자치구 선택 모드</span>
        </div>
        <div className="text-sm font-bold text-gray-700">선택된 자치구</div>
        <div className="text-lg font-extrabold text-blue-700 mt-1">{selectedDistrict}</div>
        <div className="text-xs text-gray-500 mt-2">
          지도를 클릭하여 자치구를 선택하세요.<br/>
          선택하면 해당 구의 행정동이 표시됩니다.
        </div>
      </div>

      {/* Dialog */}
      {showDialog && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="bg-gray-900 text-white p-4 rounded-2xl shadow-2xl max-w-2xl text-center backdrop-blur-md">
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
        <strong>Tips:</strong> Double-click to reset view
      </div>
    </div>
  )
}