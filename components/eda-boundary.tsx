'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

mapboxgl.accessToken = 'pk.eyJ1IjoieXN1MTUxNiIsImEiOiJjbWRyMHR2bTQwOTB2MmlzOGdlZmFldnVnIn0.Rv_I_4s0u88CYd7r9JbZDA'

export default function EdaBoundary() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [sggVisible, setSggVisible] = useState(true)
  const [dongVisible, setDongVisible] = useState(true)
  const [jibVisible, setJibVisible] = useState(true)

  useEffect(() => {
    if (!mapContainer.current || map.current) return

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [126.9780, 37.5665], // Seoul City Hall
      zoom: 9.5,
      attributionControl: false
    })

    const mapInstance = map.current

    mapInstance.addControl(new mapboxgl.NavigationControl(), 'top-right')
    mapInstance.addControl(new mapboxgl.AttributionControl({ compact: true }))

    // Paths to GeoJSON files
    const PATH_SGG = '/data/eda/gu.geojson'
    const PATH_DONG = '/data/eda/dong.geojson'
    const PATH_JIB = '/data/eda/ct.geojson'

    // Helper function to extend bounds from GeoJSON
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

    mapInstance.on('load', async () => {
      // Fetch all GeoJSON data
      const [sgg, dong, jib] = await Promise.all([
        fetch(encodeURI(PATH_SGG)).then(r => r.json()).catch(() => null),
        fetch(encodeURI(PATH_DONG)).then(r => r.json()).catch(() => null),
        fetch(encodeURI(PATH_JIB)).then(r => r.json()).catch(() => null),
      ])

      // Add sources
      if (sgg) mapInstance.addSource('sgg-src', { type: 'geojson', data: sgg })
      if (dong) mapInstance.addSource('dong-src', { type: 'geojson', data: dong })
      if (jib) mapInstance.addSource('jib-src', { type: 'geojson', data: jib })

      // Add layers for 자치구
      if (sgg) {
        mapInstance.addLayer({
          id: 'sgg-fill',
          type: 'fill',
          source: 'sgg-src',
          paint: { 'fill-color': '#1864ab', 'fill-opacity': 0.20 }
        })
        mapInstance.addLayer({
          id: 'sgg-line',
          type: 'line',
          source: 'sgg-src',
          paint: { 'line-color': '#1864ab', 'line-width': 1.3 }
        })
      }

      // Add layers for 행정동
      if (dong) {
        mapInstance.addLayer({
          id: 'dong-fill',
          type: 'fill',
          source: 'dong-src',
          paint: { 'fill-color': '#2b8a3e', 'fill-opacity': 0.20 }
        })
        mapInstance.addLayer({
          id: 'dong-line',
          type: 'line',
          source: 'dong-src',
          paint: { 'line-color': '#2b8a3e', 'line-width': 1.0 }
        })
      }

      // Add layers for 집계구
      if (jib) {
        mapInstance.addLayer({
          id: 'jib-line',
          type: 'line',
          source: 'jib-src',
          paint: { 'line-color': '#aa1e72', 'line-width': 0.6 }
        })
      }

      // Bind popup events
      const bindPopup = (layerId: string, fields?: string[]) => {
        if (!mapInstance.getLayer(layerId)) return
        
        mapInstance.on('click', layerId, (e: any) => {
          const props = e.features[0].properties || {}
          let html = "<div style='font-family:system-ui'>"
          if (fields && fields.length) {
            fields.forEach(f => {
              if (props[f] !== undefined) html += `<div><b>${f}</b>: ${props[f]}</div>`
            })
          } else {
            html += `<pre style="white-space:pre-wrap;max-width:260px">${JSON.stringify(props, null, 2)}</pre>`
          }
          html += "</div>"
          new mapboxgl.Popup().setLngLat(e.lngLat).setHTML(html).addTo(mapInstance)
        })
        
        mapInstance.on('mouseenter', layerId, () => {
          mapInstance.getCanvas().style.cursor = 'pointer'
        })
        mapInstance.on('mouseleave', layerId, () => {
          mapInstance.getCanvas().style.cursor = ''
        })
      }

      bindPopup('sgg-fill', ['sigungu_cd', 'nm'])
      bindPopup('dong-fill', ['adm_cd', 'nm'])
      bindPopup('jib-line')

      // Fit bounds to data
      const bounds = new mapboxgl.LngLatBounds()
      extendBoundsFromGeoJSON(bounds, sgg)
      extendBoundsFromGeoJSON(bounds, dong)
      extendBoundsFromGeoJSON(bounds, jib)
      if (!bounds.isEmpty()) {
        mapInstance.fitBounds(bounds, { padding: 40, maxZoom: 12 })
      }
    })

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [])

  // Toggle layer visibility
  useEffect(() => {
    if (!map.current) return
    const mapInstance = map.current

    const toggleLayers = (layerIds: string[], visible: boolean) => {
      layerIds.forEach(lid => {
        if (mapInstance.getLayer(lid)) {
          mapInstance.setLayoutProperty(lid, 'visibility', visible ? 'visible' : 'none')
        }
      })
    }

    toggleLayers(['sgg-fill', 'sgg-line'], sggVisible)
    toggleLayers(['dong-fill', 'dong-line'], dongVisible)
    toggleLayers(['jib-line'], jibVisible)
  }, [sggVisible, dongVisible, jibVisible])

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="absolute inset-0" />
      
      {/* Controls Panel */}
      <div className="absolute top-3 left-3 z-10 bg-white p-3 rounded-xl shadow-lg font-sans">
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

      {/* Back Button */}
      <div className="absolute top-3 right-20 z-10">
        <a
          href="/portfolio/quantum-leap"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to EDA
        </a>
      </div>
    </div>
  )
}