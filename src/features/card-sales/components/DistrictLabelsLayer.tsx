"use client"

import React, { useEffect, useState } from 'react'
import { useMap } from 'react-map-gl'
import { DISTRICT_LABELS, getDistrictLabelsGeoJSON, getDistrictLabelSize, getDistrictLabelOpacity } from '../data/districtCentersWithLabels'

interface DistrictLabelsLayerProps {
  visible?: boolean
  onClick?: (districtName: string) => void
}

export function DistrictLabelsLayer({ visible = true, onClick }: DistrictLabelsLayerProps) {
  const { current: map } = useMap()
  const [isLoaded, setIsLoaded] = useState(false)
  const [currentZoom, setCurrentZoom] = useState(11)

  useEffect(() => {
    if (!map) return

    const handleLoad = () => {
      // Add source for district labels
      if (!map.getSource('district-labels')) {
        map.addSource('district-labels', {
          type: 'geojson',
          data: getDistrictLabelsGeoJSON()
        })
      }

      // Add symbol layer for district names
      if (!map.getLayer('district-labels-layer')) {
        map.addLayer({
          id: 'district-labels-layer',
          type: 'symbol',
          source: 'district-labels',
          layout: {
            'text-field': ['get', 'nameKr'],
            'text-font': ['Noto Sans KR Bold', 'Open Sans Bold'],
            'text-size': [
              'interpolate',
              ['linear'],
              ['zoom'],
              10, 0,
              10.5, 12,
              11, 14,
              12, 16,
              13, 18,
              14, 20
            ],
            'text-anchor': ['get', 'anchor'],
            'text-offset': ['get', 'offset'],
            'text-allow-overlap': false,
            'text-ignore-placement': false,
            'text-optional': true
          },
          paint: {
            'text-color': '#ffffff',
            'text-halo-color': 'rgba(0, 0, 0, 0.8)',
            'text-halo-width': 2,
            'text-halo-blur': 1,
            'text-opacity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              10, 0,
              10.5, 0.4,
              11, 0.7,
              11.5, 0.9,
              12, 1
            ]
          }
        })

        // Add background layer for labels (rectangle behind text)
        map.addLayer({
          id: 'district-labels-bg',
          type: 'symbol',
          source: 'district-labels',
          layout: {
            'text-field': ['get', 'nameKr'],
            'text-font': ['Noto Sans KR Bold', 'Open Sans Bold'],
            'text-size': [
              'interpolate',
              ['linear'],
              ['zoom'],
              10, 0,
              10.5, 14,
              11, 16,
              12, 18,
              13, 20,
              14, 22
            ],
            'text-anchor': ['get', 'anchor'],
            'text-offset': ['get', 'offset'],
            'text-allow-overlap': false,
            'text-ignore-placement': false,
            'text-optional': true
          },
          paint: {
            'text-color': 'transparent',
            'text-halo-color': 'rgba(0, 0, 0, 0.4)',
            'text-halo-width': 20,
            'text-halo-blur': 10,
            'text-opacity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              10, 0,
              10.5, 0.3,
              11, 0.5,
              11.5, 0.6,
              12, 0.7
            ]
          }
        }, 'district-labels-layer') // Place behind the text layer
      }

      setIsLoaded(true)
    }

    // Handle zoom change
    const handleZoom = () => {
      setCurrentZoom(map.getZoom())
    }

    // Handle click on labels
    const handleClick = (e: any) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ['district-labels-layer']
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
        layers: ['district-labels-layer']
      })

      map.getCanvas().style.cursor = features.length > 0 ? 'pointer' : ''
    }

    if (map.loaded()) {
      handleLoad()
    } else {
      map.on('load', handleLoad)
    }

    map.on('zoom', handleZoom)
    map.on('click', handleClick)
    map.on('mousemove', handleMouseMove)

    return () => {
      map.off('load', handleLoad)
      map.off('zoom', handleZoom)
      map.off('click', handleClick)
      map.off('mousemove', handleMouseMove)
    }
  }, [map, onClick])

  // Update visibility
  useEffect(() => {
    if (!map || !isLoaded) return

    const opacity = visible ? 1 : 0
    
    if (map.getLayer('district-labels-layer')) {
      map.setLayoutProperty('district-labels-layer', 'visibility', visible ? 'visible' : 'none')
    }
    
    if (map.getLayer('district-labels-bg')) {
      map.setLayoutProperty('district-labels-bg', 'visibility', visible ? 'visible' : 'none')
    }
  }, [map, visible, isLoaded])

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