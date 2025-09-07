/**
 * Animated Mesh Background Component
 * Provides smooth, performant 3D mesh animation for landing page
 * Uses modelMatrix for GPU-accelerated transformations
 */

"use client"

import React, { useEffect, useRef, useState, useMemo } from 'react'
import { DeckGL } from '@deck.gl/react'
import { OrthographicView } from '@deck.gl/core'
import type { MapViewState } from '@deck.gl/core'
import { useMeshGeometry } from './SeoulMeshLayer'
import AnimatedMeshLayer from '../layers/AnimatedMeshLayer'

interface AnimatedMeshBackgroundProps {
  // Animation settings
  waveSpeed?: number         // Speed of wave animation
  waveAmplitude?: number     // Height of waves
  waveFrequency?: number     // Frequency of waves
  breathingSpeed?: number    // Speed of breathing effect
  breathingScale?: number    // Scale of breathing effect
  
  // Visual settings
  wireframe?: boolean
  opacity?: number
  color?: string
  
  // Performance settings
  targetFPS?: number
  resolution?: number        // Mesh resolution (30, 60, 90, etc)
}

export default function AnimatedMeshBackground({
  waveSpeed = 0.5,
  waveAmplitude = 30,
  waveFrequency = 2.0,
  breathingSpeed = 0.3,
  breathingScale = 0.1,
  wireframe = true,
  opacity = 0.3,
  color = '#00FFE1',
  targetFPS = 60,
  resolution = 30  // Use lowest resolution for best performance
}: AnimatedMeshBackgroundProps) {
  const animationRef = useRef<number>()
  const timeRef = useRef<number>(0)
  const [animationTime, setAnimationTime] = useState(0)
  
  // Fixed view state for background
  const viewState: MapViewState = useMemo(() => ({
    longitude: 126.978,
    latitude: 37.5665,
    zoom: 10.5,
    pitch: 45,
    bearing: 0,
    maxZoom: 20,
    minZoom: 8
  }), [])
  
  // Create fallback mesh for immediate rendering
  const fallbackMesh = useMemo(() => {
    // Simple plane mesh covering Seoul area
    const size = 2000 // meters
    return {
      positions: new Float32Array([
        -size, -size, 0,
         size, -size, 0,
         size,  size, 0,
        -size,  size, 0
      ]),
      normals: new Float32Array([
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
        0, 0, 1
      ]),
      texCoords: new Float32Array([
        0, 0,
        1, 0,
        1, 1,
        0, 1
      ]),
      indices: new Uint32Array([0, 1, 2, 0, 2, 3])
    }
  }, [])
  
  // Use raw mesh geometry for GPU animation
  const { meshData, loading, error } = useMeshGeometry(resolution)
  
  // Debug logging
  useEffect(() => {
    console.log('🎭 AnimatedMeshBackground State:', {
      hasMeshData: !!meshData,
      loading,
      error: error?.message,
      animationTime: animationTime.toFixed(2),
      waveSpeed,
      waveAmplitude
    })
  }, [meshData, loading, error, animationTime, waveSpeed, waveAmplitude])
  // Create GPU-animated mesh layer
  const animatedLayer = useMemo(() => {
    // Use loaded mesh data or fallback
    let meshObject = null
    
    if (meshData && !loading) {
      // Convert MeshGeometry to deck.gl mesh format
      meshObject = {
        attributes: {
          POSITION: { value: meshData.positions, size: 3 },
          NORMAL: { value: meshData.normals, size: 3 },
          TEXCOORD_0: { value: meshData.texCoords, size: 2 }
        },
        indices: meshData.indices
      }
    } else if (!loading && fallbackMesh) {
      // Use fallback if loading failed
      meshObject = {
        attributes: {
          POSITION: { value: fallbackMesh.positions, size: 3 },
          NORMAL: { value: fallbackMesh.normals, size: 3 },
          TEXCOORD_0: { value: fallbackMesh.texCoords, size: 2 }
        },
        indices: fallbackMesh.indices
      }
    }
    
    if (!meshObject) {
      console.warn('No mesh available for animation')
      return null
    }
    
    // Use center from mesh metadata if available
    const centerX = meshData?.metadata?.center?.x || 126.978
    const centerY = meshData?.metadata?.center?.y || 37.5665
    
    // Create AnimatedMeshLayer with GPU vertex animation
    return new AnimatedMeshLayer({
      id: 'animated-mesh-gpu',
      data: [{ position: [centerX, centerY, 0] }],
      mesh: meshObject,
      sizeScale: 1,
      getPosition: (d: any) => d.position,
      
      // Animation parameters passed to shader
      animationTime: animationTime,
      waveAmplitude: waveAmplitude,
      waveFrequency: waveFrequency * 0.001, // Scale down for mesh coordinates
      waveSpeed: waveSpeed,
      breathingScale: breathingScale,
      
      // Visual properties
      wireframe: wireframe,
      opacity: opacity,
      getColor: (() => {
        const hexToRgb = (hex: string) => {
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
          return result ? [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16),
            255
          ] : [0, 255, 225, 255]
        }
        return hexToRgb(color)
      })(),
      
      // Material
      material: {
        ambient: 0.4,
        diffuse: 0.8,  
        shininess: 32,
        specularColor: wireframe ? [0, 255, 200] : [100, 150, 255]
      },
      
      // Update triggers for animation
      updateTriggers: {
        animationTime: animationTime,
        waveAmplitude: waveAmplitude,
        waveFrequency: waveFrequency,
        waveSpeed: waveSpeed,
        breathingScale: breathingScale
      }
    })
  }, [meshData, loading, fallbackMesh, animationTime, waveAmplitude, waveFrequency, waveSpeed, breathingScale, wireframe, opacity, color])
  
  // Animation loop with visibility detection
  useEffect(() => {
    const frameDuration = 1000 / targetFPS
    let lastFrameTime = performance.now()
    let isVisible = true
    
    const animate = (currentTime: number) => {
      // Pause animation if page is hidden or component is not visible
      if (!isVisible || document.hidden) {
        animationRef.current = requestAnimationFrame(animate)
        return
      }
      
      const deltaTime = currentTime - lastFrameTime
      
      // Limit frame rate for performance
      if (deltaTime >= frameDuration) {
        timeRef.current += deltaTime * 0.001  // Convert to seconds
        setAnimationTime(timeRef.current)
        lastFrameTime = currentTime
      }
      
      animationRef.current = requestAnimationFrame(animate)
    }
    
    // Handle visibility change
    const handleVisibilityChange = () => {
      isVisible = !document.hidden
      if (!isVisible) {
        console.log('AnimatedMeshBackground: Pausing animation (page hidden)')
      } else {
        console.log('AnimatedMeshBackground: Resuming animation (page visible)')
        lastFrameTime = performance.now() // Reset timing to avoid jumps
      }
    }
    
    // Handle Intersection Observer for component visibility
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting
        if (!isVisible) {
          console.log('AnimatedMeshBackground: Pausing animation (component not visible)')
        } else {
          console.log('AnimatedMeshBackground: Resuming animation (component visible)')
          lastFrameTime = performance.now()
        }
      },
      { threshold: 0.1 }
    )
    
    // Observe the component's root element
    const rootElement = document.querySelector('.animated-mesh-background-root')
    if (rootElement) {
      observer.observe(rootElement)
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    animationRef.current = requestAnimationFrame(animate)
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (rootElement) {
        observer.unobserve(rootElement)
      }
      observer.disconnect()
    }
  }, [targetFPS])
  
  // Create view for fixed perspective
  const views = useMemo(() => [
    new OrthographicView({
      id: 'ortho-view',
      controller: false  // Disable user interaction
    })
  ], [])
  
  const layers = useMemo(() => {
    // Use GPU-animated mesh layer
    return animatedLayer ? [animatedLayer] : []
  }, [animatedLayer])
  
  return (
    <div className="absolute inset-0 w-full h-full animated-mesh-background-root">
      <DeckGL
        viewState={viewState}
        views={views}
        layers={layers}
        controller={false}
        getCursor={() => 'default'}
        parameters={{
          clearColor: [0, 0, 0, 0],  // Transparent background
          blend: true,
          blendFunc: [770, 771],  // GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA
          blendEquation: 32774    // GL.FUNC_ADD
        }}
      >
        {/* No base map needed for abstract background */}
      </DeckGL>
      
      {/* Gradient overlay for depth effect */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at 50% 50%, 
              transparent 0%, 
              rgba(0, 0, 0, 0.2) 50%,
              rgba(0, 0, 0, 0.6) 100%
            )
          `
        }}
      />
    </div>
  )
}