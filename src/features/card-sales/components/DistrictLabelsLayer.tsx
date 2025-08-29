"use client"

import React, { useEffect, useState } from 'react'
import { useMap } from 'react-map-gl'
import { DISTRICT_LABELS, getDistrictLabelsGeoJSON } from '../data/districtCentersWithLabels'

interface DistrictLabelsLayerProps {
  visible?: boolean
  onClick?: (districtName: string) => void
  minZoom?: number
}

export function DistrictLabelsLayer({ visible = true, onClick, minZoom = 10 }: DistrictLabelsLayerProps) {
  const { current: mapRef } = useMap()
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (!mapRef) return

    // Get the actual Mapbox GL instance
    const map = mapRef.getMap()
    if (!map) return

    const handleLoad = () => {
      // Add source for district labels
      if (!map.getSource('district-labels')) {
        map.addSource('district-labels', {
          type: 'geojson',
          data: getDistrictLabelsGeoJSON()
        })
      }

      // Add background glow layer for better visibility
      if (!map.getLayer('district-labels-glow')) {
        map.addLayer({
          id: 'district-labels-glow',
          type: 'symbol',
          source: 'district-labels',
          minzoom: minZoom,
          layout: {
            'text-field': ['get', 'nameKr'],
            'text-font': ['Pretendard Bold', 'Noto Sans KR Bold', 'Arial Unicode MS Bold'],
            'text-size': [
              'interpolate',
              ['linear'],
              ['zoom'],
              10, 14,
              11, 16,
              12, 18,
              13, 20,
              14, 22
            ],
            'text-anchor': 'center',
            'text-allow-overlap': false,
            'text-ignore-placement': false,
            'symbol-placement': 'point',
            'text-justify': 'center',
            'text-pitch-alignment': 'viewport',
            'text-rotation-alignment': 'viewport'
          },
          paint: {
            'text-color': 'transparent',
            'text-halo-color': 'rgba(0, 0, 0, 0.5)',
            'text-halo-width': 15,
            'text-halo-blur': 15,
            'text-opacity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              10, 0,
              10.3, 0.3,
              10.6, 0.5,
              11, 0.6,
              12, 0.7
            ]
          }
        })
      }

      // Add main text layer for district names
      if (!map.getLayer('district-labels-text')) {
        map.addLayer({
          id: 'district-labels-text',
          type: 'symbol',
          source: 'district-labels',
          minzoom: minZoom,
          layout: {
            'text-field': ['get', 'nameKr'],
            'text-font': ['Pretendard Bold', 'Noto Sans KR Bold', 'Arial Unicode MS Bold'],
            'text-size': [
              'interpolate',
              ['linear'],
              ['zoom'],
              10, 12,
              10.5, 13,
              11, 14,
              11.5, 15,
              12, 16,
              12.5, 17,
              13, 18,
              14, 20
            ],
            'text-anchor': 'center',
            'text-allow-overlap': false,
            'text-ignore-placement': false,
            'symbol-placement': 'point',
            'text-justify': 'center',
            'text-pitch-alignment': 'viewport',
            'text-rotation-alignment': 'viewport',
            'text-variable-anchor': ['center', 'top', 'bottom', 'left', 'right'],
            'text-radial-offset': 0.5,
            'text-letter-spacing': 0.05,
            'text-max-width': 10
          },
          paint: {
            'text-color': '#ffffff',
            'text-halo-color': 'rgba(0, 0, 0, 0.85)',
            'text-halo-width': 2,
            'text-halo-blur': 0.5,
            'text-opacity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              10, 0,
              10.3, 0.4,
              10.6, 0.7,
              11, 0.85,
              11.5, 0.95,
              12, 1
            ]
          }
        })
      }

      // Add English sub-labels (optional, smaller text)
      if (!map.getLayer('district-labels-sub')) {
        map.addLayer({
          id: 'district-labels-sub',
          type: 'symbol',
          source: 'district-labels',
          minzoom: 11,
          layout: {
            'text-field': ['get', 'name'],
            'text-font': ['Pretendard Regular', 'Open Sans Regular', 'Arial Unicode MS Regular'],
            'text-size': [
              'interpolate',
              ['linear'],
              ['zoom'],
              11, 8,
              12, 9,
              13, 10,
              14, 11
            ],
            'text-anchor': 'top',
            'text-offset': [0, 1.2],
            'text-allow-overlap': false,
            'text-ignore-placement': false,
            'symbol-placement': 'point',
            'text-justify': 'center',
            'text-transform': 'uppercase',
            'text-letter-spacing': 0.1
          },
          paint: {
            'text-color': 'rgba(255, 255, 255, 0.7)',
            'text-halo-color': 'rgba(0, 0, 0, 0.7)',
            'text-halo-width': 1.5,
            'text-halo-blur': 0.5,
            'text-opacity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              11, 0,
              11.5, 0.5,
              12, 0.7,
              13, 0.8
            ]
          }
        })
      }

      setIsLoaded(true)
    }

    // Handle click on labels
    const handleClick = (e: any) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ['district-labels-text', 'district-labels-sub']
      })

      if (features && features.length > 0) {
        const districtName = features[0].properties?.nameKr
        if (districtName && onClick) {
          onClick(districtName)
        }
      }
    }

    // Handle hover effects
    const handleMouseMove = (e: any) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ['district-labels-text', 'district-labels-sub']
      })

      map.getCanvas().style.cursor = features.length > 0 ? 'pointer' : ''
    }

    if (map.loaded()) {
      handleLoad()
    } else {
      map.on('load', handleLoad)
    }

    map.on('click', handleClick)
    map.on('mousemove', handleMouseMove)

    return () => {
      map.off('load', handleLoad)
      map.off('click', handleClick)
      map.off('mousemove', handleMouseMove)
    }
  }, [mapRef, onClick, minZoom])

  // Update visibility
  useEffect(() => {
    if (!mapRef || !isLoaded) return
    
    const map = mapRef.getMap()
    if (!map) return

    const layerIds = ['district-labels-glow', 'district-labels-text', 'district-labels-sub']
    
    layerIds.forEach(layerId => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none')
      }
    })
  }, [mapRef, visible, isLoaded])

  return null
}

// Alternative implementation using HTML overlay for more styling control
export function DistrictLabelsOverlay({ visible = true, onClick, viewState }: any) {
  const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null)

  if (!visible || viewState.zoom < 10) return null

  const fontSize = getDistrictLabelSize(viewState.zoom)
  const opacity = getDistrictLabelOpacity(viewState.zoom)

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1000 }}>
      {DISTRICT_LABELS.map(label => {
        // Convert lat/lng to screen position
        const [x, y] = [label.coordinates[0], label.coordinates[1]]
        
        // Simple projection (this would need proper viewport calculation in production)
        const screenX = ((x - viewState.longitude) * 40000 * Math.pow(2, viewState.zoom - 10)) + window.innerWidth / 2
        const screenY = (-(y - viewState.latitude) * 60000 * Math.pow(2, viewState.zoom - 10)) + window.innerHeight / 2

        const isHovered = hoveredDistrict === label.nameKr

        return (
          <div
            key={label.nameKr}
            className="absolute pointer-events-auto cursor-pointer transition-all duration-300"
            style={{
              left: `${screenX}px`,
              top: `${screenY}px`,
              transform: `translate(-50%, -50%) scale(${isHovered ? 1.1 : 1})`,
              opacity,
              fontSize: `${fontSize}px`,
              zIndex: isHovered ? 1001 : 1000
            }}
            onMouseEnter={() => setHoveredDistrict(label.nameKr)}
            onMouseLeave={() => setHoveredDistrict(null)}
            onClick={() => onClick?.(label.nameKr)}
          >
            <div
              className="px-3 py-1.5 rounded-lg font-bold tracking-wider"
              style={{
                backgroundColor: isHovered ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.5)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: `1px solid ${isHovered ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.2)'}`,
                boxShadow: isHovered 
                  ? '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1) inset'
                  : '0 4px 16px rgba(0, 0, 0, 0.4)',
                color: '#ffffff',
                textShadow: '0 2px 8px rgba(0, 0, 0, 0.8)',
                fontFamily: '"Pretendard", "Inter", sans-serif'
              }}
            >
              <div className="text-[8px] uppercase tracking-[0.2em] opacity-70 mb-0.5">
                {label.name.replace('-gu', '')}
              </div>
              <div className="font-black">
                {label.nameKr}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}