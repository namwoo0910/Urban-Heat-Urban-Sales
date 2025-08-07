"use client"

import { useEffect, useRef } from "react"

export default function TestSimpleMapPage() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)

  useEffect(() => {
    // 동적으로 mapbox-gl 로드
    const loadMapbox = async () => {
      try {
        // @ts-ignore
        const mapboxgl = (await import('mapbox-gl')).default
        await import('mapbox-gl/dist/mapbox-gl.css')
        
        mapboxgl.accessToken = 'pk.eyJ1IjoieXN1MTUxNiIsImEiOiJjbWRyMHR2bTQwOTB2MmlzOGdlZmFldnVnIn0.Rv_I_4s0u88CYd7r9JbZDA'
        
        if (!mapContainer.current) return
        
        console.log('Initializing map with token:', mapboxgl.accessToken)
        
        mapRef.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [126.978, 37.5665],
          zoom: 10
        })
        
        mapRef.current.on('load', () => {
          console.log('Map loaded successfully!')
        })
        
        mapRef.current.on('error', (e: any) => {
          console.error('Map error:', e)
        })
      } catch (error) {
        console.error('Failed to load Mapbox:', error)
      }
    }
    
    loadMapbox()
    
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
      }
    }
  }, [])

  return (
    <div className="w-full h-screen relative">
      <div ref={mapContainer} className="w-full h-full" />
      <div className="absolute top-4 left-4 bg-white p-4 rounded shadow">
        <h3 className="font-bold">Simple Mapbox Test</h3>
        <p className="text-sm">Check console for logs</p>
      </div>
    </div>
  )
}