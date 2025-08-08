"use client"

import { useRef, useEffect, useLayoutEffect, useState } from 'react'
import * as THREE from 'three'
import type { AnimationConfig } from '@/hooks/use-particle-animations'
import { loadSeoulBoundaries, isPointInSeoul } from '@/utils/seoul-boundaries'
import type { SeoulBoundaryData } from '@/utils/seoul-boundaries'

// Constants matching urbanwave
const textureSize = 64
const seoulBounds = {
  minLat: 37.42,
  maxLat: 37.70,
  minLng: 126.76,
  maxLng: 127.18
}

// Seoul population data points (from urbanwave)
const seoulPoints = [
  { lat: 37.5735, lng: 126.9788, weight: 1.2 }, // 종로
  { lat: 37.5636, lng: 126.9809, weight: 1.8 }, // 명동
  { lat: 37.5662, lng: 126.9915, weight: 1.1 }, // 을지로
  { lat: 37.5649, lng: 127.0177, weight: 0.9 }, // 신당
  { lat: 37.5219, lng: 126.9245, weight: 1.5 }, // 여의도
  { lat: 37.5492, lng: 126.9137, weight: 1.0 }, // 합정
  { lat: 37.5563, lng: 126.9062, weight: 0.8 }, // 망원
  { lat: 37.5637, lng: 126.9256, weight: 1.1 }, // 연남
  { lat: 37.5563, lng: 126.9197, weight: 1.4 }, // 서교(홍대)
  { lat: 37.5443, lng: 126.9512, weight: 1.0 }, // 공덕
  { lat: 37.5340, lng: 127.0026, weight: 1.2 }, // 한남
  { lat: 37.5349, lng: 126.9941, weight: 1.6 }, // 이태원
  { lat: 37.5825, lng: 127.0021, weight: 0.9 }, // 혜화
  { lat: 37.5759, lng: 127.0228, weight: 0.7 }, // 창신
  { lat: 37.5169, lng: 126.9396, weight: 0.6 }, // 영등포
  { lat: 37.4829, lng: 126.8967, weight: 0.5 }, // 대림
  { lat: 37.5267, lng: 126.8986, weight: 0.8 }, // 당산
  { lat: 37.5511, lng: 126.9227, weight: 1.3 }, // 홍익
  { lat: 37.5650, lng: 127.0495, weight: 0.7 }, // 동대문
  { lat: 37.5400, lng: 127.0669, weight: 0.9 }, // 성수
  { lat: 37.5172, lng: 127.0473, weight: 1.1 }, // 강남
  { lat: 37.5012, lng: 127.0396, weight: 1.7 }, // 역삼
  { lat: 37.4979, lng: 127.0276, weight: 1.4 }, // 서초
  { lat: 37.4846, lng: 127.0320, weight: 1.0 }, // 방배
  { lat: 37.5208, lng: 127.1230, weight: 0.8 }, // 송파
  { lat: 37.5145, lng: 127.1059, weight: 1.2 }, // 잠실
]

// Hourly pattern generation (from urbanwave)
function generateHourlyPattern(baseWeight: number, hour: number): number {
  let multiplier = 0.3
  
  if (hour >= 7 && hour <= 9) multiplier = 1.8
  else if (hour >= 12 && hour <= 13) multiplier = 1.4
  else if (hour >= 18 && hour <= 19) multiplier = 2.0
  else if (hour >= 20 && hour <= 22) multiplier = 1.6
  else if (hour >= 10 && hour <= 11) multiplier = 1.2
  else if (hour >= 14 && hour <= 17) multiplier = 1.3
  else if (hour >= 23 || hour <= 5) multiplier = 0.2
  
  return baseWeight * multiplier * (0.7 + Math.random() * 0.6)
}

// Particle vertex shader with wave displacement
const vertexShader = `
  attribute vec2 particleUV;
  
  uniform float time;
  uniform sampler2D populationTexture;
  uniform float heightScale;
  uniform float waveIntensity;
  uniform float zoomLevel;
  uniform float wavePattern; // 0: sine, 1: triangle, 2: sawtooth, 3: square
  uniform float animationSpeed;
  uniform float heightMultiplier;
  uniform float particleSize;
  uniform float particleOpacity;
  
  varying float vHeight;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying float vMask;
  varying float vPointSize;
  
  void main() {
    vUv = particleUV;
    
    // Read boundary mask from green channel of texture
    vec4 populationData = texture2D(populationTexture, vUv);
    vMask = populationData.g;
    
    // Scale height based on zoom level for consistent appearance
    float zoomScale = pow(2.0, (11.2 - zoomLevel) * 0.5);
    float populationHeight = populationData.r * heightScale * 100.0 * zoomScale;
    
    if (vMask < 0.5) {
      populationHeight = 0.0;
    }
    
    // Smoother height curve for better 3D appearance
    populationHeight = pow(populationHeight / (300.0 * zoomScale), 0.85) * 300.0 * zoomScale;
    populationHeight = clamp(populationHeight, 0.0, 300.0 * zoomScale);
    
    float waveEffect = 0.0;
    if (vMask > 0.5) {
      // Adjusted time with animation speed
      float animTime = time * animationSpeed;
      
      // Wave patterns based on uniform
      float freq1 = position.x * 0.015 + animTime * 3.0;
      float freq2 = position.z * 0.012 + animTime * 2.5;
      float freq3 = (position.x + position.z) * 0.008 + animTime * 4.0;
      float freq4 = (position.x - position.z) * 0.02 + animTime * 3.5;
      
      float wave1, wave2, wave3, wave4, baseOscillation;
      
      // Different wave patterns with increased amplitude for more undulation
      if (wavePattern < 0.5) {
        // Sine wave (smooth)
        wave1 = sin(freq1) * waveIntensity * 45.0 * zoomScale;
        wave2 = sin(freq2) * waveIntensity * 40.0 * zoomScale;
        wave3 = sin(freq3) * waveIntensity * 35.0 * zoomScale;
        wave4 = sin(freq4) * waveIntensity * 30.0 * zoomScale;
        baseOscillation = sin(animTime * 0.6) * 35.0 * zoomScale;
      } else if (wavePattern < 1.5) {
        // Triangle wave (sharp)
        wave1 = (2.0 * abs(fract(freq1) - 0.5) - 0.5) * waveIntensity * 45.0 * zoomScale;
        wave2 = (2.0 * abs(fract(freq2) - 0.5) - 0.5) * waveIntensity * 40.0 * zoomScale;
        wave3 = (2.0 * abs(fract(freq3) - 0.5) - 0.5) * waveIntensity * 35.0 * zoomScale;
        wave4 = (2.0 * abs(fract(freq4) - 0.5) - 0.5) * waveIntensity * 30.0 * zoomScale;
        baseOscillation = (2.0 * abs(fract(animTime * 0.6) - 0.5) - 0.5) * 35.0 * zoomScale;
      } else if (wavePattern < 2.5) {
        // Sawtooth wave (aggressive)
        wave1 = (fract(freq1) * 2.0 - 1.0) * waveIntensity * 45.0 * zoomScale;
        wave2 = (fract(freq2) * 2.0 - 1.0) * waveIntensity * 40.0 * zoomScale;
        wave3 = (fract(freq3) * 2.0 - 1.0) * waveIntensity * 35.0 * zoomScale;
        wave4 = (fract(freq4) * 2.0 - 1.0) * waveIntensity * 30.0 * zoomScale;
        baseOscillation = (fract(animTime * 0.6) * 2.0 - 1.0) * 35.0 * zoomScale;
      } else {
        // Square wave (digital)
        wave1 = sign(sin(freq1)) * waveIntensity * 45.0 * zoomScale;
        wave2 = sign(sin(freq2)) * waveIntensity * 40.0 * zoomScale;
        wave3 = sign(sin(freq3)) * waveIntensity * 35.0 * zoomScale;
        wave4 = sign(sin(freq4)) * waveIntensity * 30.0 * zoomScale;
        baseOscillation = sign(sin(animTime * 0.6)) * 35.0 * zoomScale;
      }
      
      // Combine waves with different phases for complexity
      waveEffect = wave1 + wave2 + wave3 + wave4 + baseOscillation;
      
      // Add large-scale undulation for ocean-like movement
      float oceanWave = sin(position.x * 0.005 + animTime * 0.5) * sin(position.z * 0.005 + animTime * 0.3) * waveIntensity * 50.0 * zoomScale;
      waveEffect += oceanWave;
      
      // Add noise-like sharp details
      float noiseFreq = (position.x + position.z) * 0.03 + animTime * 5.0;
      float sharpNoise = (fract(noiseFreq) > 0.5 ? 1.0 : -1.0) * waveIntensity * 8.0 * zoomScale;
      waveEffect += sharpNoise;
    }
    
    vec3 newPosition = position;
    newPosition.y = (populationHeight + waveEffect) * heightMultiplier;
    
    vHeight = newPosition.y;
    
    // Calculate normal for lighting (approximate from height gradient)
    vec2 texelSize = vec2(1.0 / 64.0);
    float heightL = texture2D(populationTexture, clamp(vUv - vec2(texelSize.x, 0.0), 0.0, 1.0)).r * heightScale * 100.0 * zoomScale;
    float heightR = texture2D(populationTexture, clamp(vUv + vec2(texelSize.x, 0.0), 0.0, 1.0)).r * heightScale * 100.0 * zoomScale;
    float heightU = texture2D(populationTexture, clamp(vUv - vec2(0.0, texelSize.y), 0.0, 1.0)).r * heightScale * 100.0 * zoomScale;
    float heightD = texture2D(populationTexture, clamp(vUv + vec2(0.0, texelSize.y), 0.0, 1.0)).r * heightScale * 100.0 * zoomScale;
    
    vec3 tangentX = vec3(20.0, heightR - heightL, 0.0);
    vec3 tangentZ = vec3(0.0, heightD - heightU, 20.0);
    vNormal = normalize(cross(tangentX, tangentZ));
    
    // Calculate particle size based on height, zoom, and size uniform
    vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);
    float heightFactor = 0.5 + (vHeight / (300.0 * zoomScale)) * 0.5;
    vPointSize = (8.0 + heightFactor * 12.0) * zoomScale * particleSize * (300.0 / -mvPosition.z);
    gl_PointSize = vPointSize;
    
    gl_Position = projectionMatrix * mvPosition;
  }
`

// Particle fragment shader with color gradient
const fragmentShader = `
  uniform float time;
  uniform float modernIntensity;
  uniform float colorIntensity;
  uniform float edgeGlow;
  uniform float particleOpacity;
  uniform float colorBrightness;
  varying float vHeight;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying float vMask;
  varying float vPointSize;
  
  void main() {
    // Skip particles outside Seoul boundary
    if (vMask < 0.5) {
      discard;
    }
    
    // Create circular particle shape
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    if (dist > 0.5) {
      discard;
    }
    
    // Soft edge for particles
    float edgeFade = 1.0 - smoothstep(0.3, 0.5, dist);
    
    float heightNorm = clamp(vHeight / 500.0, 0.0, 1.0);
    
    // Pastel palette directly matching particle layer colors
    vec3 blueViolet = vec3(0.541, 0.169, 0.886);      // Blue violet (138, 43, 226)
    vec3 royalBlue = vec3(0.255, 0.412, 0.882);       // Royal blue (65, 105, 225)
    vec3 deepSkyBlue = vec3(0.0, 0.749, 1.0);         // Deep sky blue (0, 191, 255)
    vec3 mediumTurquoise = vec3(0.282, 0.82, 0.8);    // Medium turquoise (72, 209, 204)
    vec3 mediumPurple = vec3(0.576, 0.439, 0.859);    // Medium purple (147, 112, 219)
    vec3 cornflowerBlue = vec3(0.392, 0.584, 0.929);  // Cornflower blue (100, 149, 237)
    vec3 powderBlue = vec3(0.69, 0.878, 0.902);       // Powder blue (176, 224, 230)
    vec3 hotPink = vec3(1.0, 0.412, 0.706);           // Hot pink (255, 105, 180)
    vec3 plum = vec3(0.867, 0.627, 0.867);            // Plum (221, 160, 221)
    
    vec3 baseColor;
    if (heightNorm < 0.15) {
      baseColor = mix(blueViolet, royalBlue, heightNorm * 6.67);
    } else if (heightNorm < 0.3) {
      baseColor = mix(royalBlue, deepSkyBlue, (heightNorm - 0.15) * 6.67);
    } else if (heightNorm < 0.45) {
      baseColor = mix(deepSkyBlue, mediumTurquoise, (heightNorm - 0.3) * 6.67);
    } else if (heightNorm < 0.6) {
      baseColor = mix(mediumTurquoise, cornflowerBlue, (heightNorm - 0.45) * 6.67);
    } else if (heightNorm < 0.75) {
      baseColor = mix(cornflowerBlue, powderBlue, (heightNorm - 0.6) * 6.67);
    } else if (heightNorm < 0.9) {
      baseColor = mix(powderBlue, hotPink, (heightNorm - 0.75) * 6.67);
    } else {
      baseColor = mix(hotPink, plum, (heightNorm - 0.9) * 10.0);
    }
    
    // Dynamic color shifting matching particle animation
    float wavePattern = sin(time * 1.5 + vUv.x * 6.0) * cos(time * 1.0 + vUv.y * 4.0);
    float colorShift = wavePattern * 0.12 + 0.95;  // Slightly more vibrant for particle colors
    float intensityBoost = 0.85 + heightNorm * 0.4; // More dynamic intensity gradient
    
    // Color oscillation for particle-like shimmer effect
    vec3 oscillation = vec3(
      sin(time * 2.0 + heightNorm * 3.14) * 0.05,
      cos(time * 1.8 + heightNorm * 3.14) * 0.05,
      sin(time * 1.5 + heightNorm * 2.0) * 0.06
    );
    
    baseColor = (baseColor + oscillation) * colorShift * intensityBoost * colorIntensity;
    
    // Enhanced 3D lighting model for better depth perception
    vec3 lightDir1 = normalize(vec3(1.0, 3.0, 0.5));  // Main light from above-front
    vec3 lightDir2 = normalize(vec3(-0.5, 2.0, -0.3)); // Fill light from opposite side
    
    float NdotL1 = max(0.0, dot(vNormal, lightDir1));
    float NdotL2 = max(0.0, dot(vNormal, lightDir2));
    
    // Vibrant ambient matching particle layer brightness
    float ambient = 0.5 + heightNorm * 0.15 - (1.0 - heightNorm) * 0.05; // Less contrast for softer look
    
    // Fresnel effect for translucent edges
    vec3 viewDir = normalize(vec3(0.0, 1.0, 0.3));
    float fresnel = pow(1.0 - max(0.0, dot(vNormal, viewDir)), 2.0);
    float rimLight = fresnel * 0.4 * (0.8 + heightNorm * 0.4);
    
    // Softer specular for wet/glossy surface
    vec3 halfVector1 = normalize(lightDir1 + viewDir);
    vec3 halfVector2 = normalize(lightDir2 + viewDir);
    float specular1 = pow(max(0.0, dot(vNormal, halfVector1)), 16.0) * 0.3;
    float specular2 = pow(max(0.0, dot(vNormal, halfVector2)), 24.0) * 0.15;
    
    // Subsurface scattering approximation for translucent material
    float subsurface = (1.0 - NdotL1) * 0.15 * heightNorm;
    
    // Shadow mapping for valleys (occlusion)
    float occlusion = 1.0 - (1.0 - heightNorm) * 0.3; // Darker in low areas
    
    // Combine lighting with depth-aware weighting
    float mainLight = NdotL1 * 0.5 + NdotL2 * 0.25;
    float totalLight = (ambient + mainLight + rimLight + specular1 + specular2 + subsurface) * occlusion;
    
    // Apply lighting to base color with brightness control
    vec3 finalColor = baseColor * totalLight * colorBrightness;
    
    // Subtle iridescence for pastel shimmer
    vec3 iridescence = vec3(
      sin(fresnel * 3.14159 + time * 1.0) * 0.05 + 0.98,
      sin(fresnel * 3.14159 + time * 1.0 + 2.094) * 0.05 + 0.98,
      sin(fresnel * 3.14159 + time * 1.0 + 4.189) * 0.05 + 0.98
    );
    finalColor *= iridescence;
    
    // Atmospheric perspective matching particle layer atmosphere
    float fogDistance = 1.0 - heightNorm * 0.5; // Higher areas less foggy
    vec3 fogColor = vec3(0.75, 0.78, 0.92); // Slightly purple-tinted fog to match particle palette
    float fogAmount = fogDistance * 0.15; // Subtler fog for clearer colors
    finalColor = mix(finalColor, fogColor, fogAmount);
    
    // Depth-based saturation (distant/low areas less saturated)
    float saturation = 0.7 + heightNorm * 0.3;
    vec3 gray = vec3(dot(finalColor, vec3(0.299, 0.587, 0.114)));
    finalColor = mix(gray, finalColor, saturation);
    
    // Vibrant glow for peaks matching particle shimmer
    if (heightNorm > 0.7) {
      float glowIntensity = (heightNorm - 0.7) * 3.33;
      vec3 glowColor = mix(finalColor, vec3(0.95, 0.85, 1.0), 0.4); // Purple-pink glow
      finalColor = mix(finalColor, glowColor, glowIntensity * 0.4);
    }
    
    // Particle alpha with edge fade and opacity control
    float particleAlpha = (0.7 + heightNorm * 0.3) * edgeFade * particleOpacity;
    
    gl_FragColor = vec4(finalColor, particleAlpha);
  }
`

// Coordinate transformation to match DeckGL's Web Mercator projection
function lngLatToWorld(lng: number, lat: number, zoom: number) {
  // Use the same projection as DeckGL (Web Mercator)
  const scale = Math.pow(2, zoom)
  const worldScale = 512 * scale / (2 * Math.PI)
  
  // Convert to radians
  const lambda = lng * Math.PI / 180
  const phi = lat * Math.PI / 180
  
  // Web Mercator projection
  const x = worldScale * (lambda + Math.PI)
  const y = worldScale * (Math.PI - Math.log(Math.tan(Math.PI / 4 + phi / 2)))
  
  return { x, y, scale: worldScale }
}

interface WaveLayerProps {
  animationConfig: AnimationConfig
  mapboxCameraPos?: { longitude: number; latitude: number; zoom: number; pitch: number; bearing: number }
}

export function WaveLayer({ animationConfig, mapboxCameraPos }: WaveLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const surfaceRef = useRef<THREE.Points | null>(null)
  const uniformsRef = useRef<any>(null)
  const populationTextureRef = useRef<THREE.DataTexture | null>(null)
  const animationIdRef = useRef<number | null>(null)
  const boundaryDataRef = useRef<SeoulBoundaryData | null>(null)
  const timeRef = useRef(0)
  const [isInitialized, setIsInitialized] = useState(false)
  
  // Convert mapbox camera position to state object (no rotation for wave layer by default)
  const mapboxState = mapboxCameraPos ? {
    center: { lng: mapboxCameraPos.longitude, lat: mapboxCameraPos.latitude },
    zoom: mapboxCameraPos.zoom,
    pitch: 65,  // Fixed pitch
    bearing: 0   // No rotation for wave layer (fixed)
  } : {
    center: { lng: 126.978, lat: 37.5665 },
    zoom: 11.2,
    pitch: 65,
    bearing: 0
  }
  
  // Load Seoul boundaries
  useEffect(() => {
    loadSeoulBoundaries()
      .then(data => {
        boundaryDataRef.current = data
        updatePopulationSurface()
      })
      .catch(err => console.warn('Failed to load Seoul boundaries:', err))
  }, [])
  
  // Update population surface data
  const updatePopulationSurface = () => {
    if (!populationTextureRef.current) return
    
    const textureData = new Float32Array(textureSize * textureSize * 4)
    const currentHour = Math.floor((Date.now() / 1000 / 60) % 24)
    
    for (let y = 0; y < textureSize; y++) {
      for (let x = 0; x < textureSize; x++) {
        const lat = seoulBounds.minLat + (seoulBounds.maxLat - seoulBounds.minLat) * (y / (textureSize - 1))
        const lng = seoulBounds.minLng + (seoulBounds.maxLng - seoulBounds.minLng) * (x / (textureSize - 1))
        
        const isInSeoul = boundaryDataRef.current ? isPointInSeoul(lng, lat, boundaryDataRef.current) : true
        
        let totalWeight = 0
        let totalDistance = 0
        
        if (isInSeoul) {
          seoulPoints.forEach(point => {
            const distance = Math.sqrt(
              Math.pow((lat - point.lat) * 111000, 2) + 
              Math.pow((lng - point.lng) * 111000 * Math.cos(lat * Math.PI / 180), 2)
            )
            
            if (distance < 100) {
              totalWeight += generateHourlyPattern(point.weight, currentHour) * 10
            } else {
              const weight = generateHourlyPattern(point.weight, currentHour) / Math.pow(distance / 1000, 1.5)
              totalWeight += weight
              totalDistance += 1
            }
          })
        }
        
        let populationValue = totalDistance > 0 ? (totalWeight / Math.max(1, totalDistance)) : 0.1
        populationValue = isInSeoul ? Math.max(0.05, Math.min(populationValue, 3.0)) : 0
        
        const index = (y * textureSize + x) * 4
        textureData[index] = populationValue
        textureData[index + 1] = isInSeoul ? 1.0 : 0.0  // Store boundary mask in green channel
        textureData[index + 2] = 0
        textureData[index + 3] = 1
      }
    }
    
    if (populationTextureRef.current.image) {
      populationTextureRef.current.image.data = textureData
      populationTextureRef.current.needsUpdate = true
    }
  }
  
  // Update camera and surface position to match DeckGL/Mapbox coordinate system
  const updateCameraAndSurface = () => {
    if (!surfaceRef.current || !cameraRef.current) return
    
    const { center, zoom, bearing, pitch } = mapboxState
    
    const minWorld = lngLatToWorld(seoulBounds.minLng, seoulBounds.minLat, zoom)
    const maxWorld = lngLatToWorld(seoulBounds.maxLng, seoulBounds.maxLat, zoom)
    const centerWorld = lngLatToWorld(center.lng, center.lat, zoom)
    
    // Calculate the actual world size in meters (approximate)
    // At zoom 11.2, 1 pixel ≈ 38 meters
    const metersPerPixel = 156543.03392 * Math.cos(center.lat * Math.PI / 180) / Math.pow(2, zoom)
    
    const surfaceWidth = maxWorld.x - minWorld.x
    const surfaceHeight = maxWorld.y - minWorld.y
    const surfaceCenterX = (minWorld.x + maxWorld.x) / 2 - centerWorld.x
    const surfaceCenterY = (minWorld.y + maxWorld.y) / 2 - centerWorld.y
    
    // Scale the surface to match the actual geographic scale
    // Use a base scale that matches the particle layer's visual scale
    const baseScale = 1000 // Base geometry size
    const scaleFactorX = surfaceWidth / baseScale
    const scaleFactorZ = surfaceHeight / baseScale
    
    surfaceRef.current.scale.set(scaleFactorX, 1, scaleFactorZ)
    surfaceRef.current.position.set(surfaceCenterX, 0, -surfaceCenterY)
    
    // Apply rotation for bearing
    surfaceRef.current.rotation.y = -bearing * Math.PI / 180
    
    // Calculate camera position to match mapbox perspective
    // Convert pitch to radians and calculate camera distance
    const pitchRad = pitch * Math.PI / 180
    const fovRad = 60 * Math.PI / 180 // Field of view in radians
    
    // Calculate camera distance based on the view frustum
    const viewportHeight = Math.max(surfaceWidth, surfaceHeight)
    const cameraDistance = (viewportHeight / 2) / Math.tan(fovRad / 2)
    
    // Position camera based on pitch angle
    const cameraHeight = cameraDistance * Math.sin(pitchRad)
    const cameraOffset = cameraDistance * Math.cos(pitchRad)
    
    cameraRef.current.position.set(
      surfaceCenterX - Math.sin(bearing * Math.PI / 180) * cameraOffset,
      cameraHeight,
      -surfaceCenterY - Math.cos(bearing * Math.PI / 180) * cameraOffset
    )
    
    cameraRef.current.lookAt(surfaceCenterX, 0, -surfaceCenterY)
    cameraRef.current.fov = 60
    cameraRef.current.updateProjectionMatrix()
  }
  
  // Initialize Three.js scene - use useLayoutEffect for DOM manipulation
  useLayoutEffect(() => {
    if (!containerRef.current || isInitialized) return
    
    // Scene
    const scene = new THREE.Scene()
    sceneRef.current = scene
    
    // Camera
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100000)
    camera.position.set(0, 5000, 5000)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera
    
    // Renderer
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: "high-performance"
    })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(window.devicePixelRatio)
    rendererRef.current = renderer
    
    // Add renderer to DOM
    containerRef.current.appendChild(renderer.domElement)
    
    // Create population texture
    const textureData = new Float32Array(textureSize * textureSize * 4)
    const populationTexture = new THREE.DataTexture(
      textureData, 
      textureSize, 
      textureSize, 
      THREE.RGBAFormat, 
      THREE.FloatType
    )
    populationTexture.needsUpdate = true
    populationTextureRef.current = populationTexture
    
    // Create particle geometry with grid positions
    const particleCount = 100 // Grid size (100x100 = 10,000 particles)
    const geometry = new THREE.BufferGeometry()
    
    const positions = []
    const uvs = []
    
    // Generate grid of particles
    for (let i = 0; i < particleCount; i++) {
      for (let j = 0; j < particleCount; j++) {
        // Position in 3D space (spread across the surface)
        const x = (i / (particleCount - 1) - 0.5) * 1000
        const z = (j / (particleCount - 1) - 0.5) * 1000
        positions.push(x, 0, z)
        
        // UV coordinates for texture sampling
        uvs.push(i / (particleCount - 1), j / (particleCount - 1))
      }
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('particleUV', new THREE.Float32BufferAttribute(uvs, 2))
    
    // Create uniforms with modern design controls
    const uniforms = {
      time: { value: 0 },
      populationTexture: { value: populationTexture },
      heightScale: { value: 3.0 },
      waveIntensity: { value: 1.5 },
      zoomLevel: { value: 11.2 },
      modernIntensity: { value: 1.0 },
      wavePattern: { value: 0.0 }, // 0: sine, 1: triangle, 2: sawtooth, 3: square
      animationSpeed: { value: 1.0 },
      heightMultiplier: { value: 1.0 },
      colorIntensity: { value: 1.0 },
      edgeGlow: { value: 1.0 },
      particleSize: { value: 1.0 },
      particleOpacity: { value: 0.8 },
      colorBrightness: { value: 1.2 }
    }
    uniformsRef.current = uniforms
    
    // Create shader material for particles
    const material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: false
    })
    
    // Create particle system
    const surface = new THREE.Points(geometry, material)
    surfaceRef.current = surface
    scene.add(surface)
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4)
    scene.add(ambientLight)
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6)
    directionalLight.position.set(100, 200, 100)
    scene.add(directionalLight)
    
    // Initial update
    updatePopulationSurface()
    updateCameraAndSurface()
    
    // Start animation loop immediately
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate)
      
      // Update time
      timeRef.current += 0.016
      
      // Update uniforms including zoom level and modern controls
      if (uniformsRef.current) {
        uniformsRef.current.time.value = timeRef.current
        uniformsRef.current.heightScale.value = 3.0
        uniformsRef.current.waveIntensity.value = 1.5
        uniformsRef.current.zoomLevel.value = mapboxState.zoom || 11.2
        uniformsRef.current.modernIntensity.value = 1.0
        // These will be updated in the effect below with animation config
      }
      
      // Update camera and surface
      updateCameraAndSurface()
      
      // Render
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current)
      }
    }
    
    animate()
    
    setIsInitialized(true)
    
    // Handle window resize
    const handleResize = () => {
      if (cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = window.innerWidth / window.innerHeight
        cameraRef.current.updateProjectionMatrix()
        rendererRef.current.setSize(window.innerWidth, window.innerHeight)
      }
    }
    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
      
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }
      
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement)
        rendererRef.current.dispose()
      }
      
      if (populationTextureRef.current) {
        populationTextureRef.current.dispose()
      }
      
      setIsInitialized(false)
    }
  }, []) // Only run once on mount
  
  // Update animation config when it changes
  useEffect(() => {
    if (!isInitialized || !uniformsRef.current) return
    
    // Update the uniforms based on animation config with modern scaling
    uniformsRef.current.heightScale.value = animationConfig.waveEnabled ? animationConfig.waveAmplitude * 2.5 : 2.5
    uniformsRef.current.waveIntensity.value = animationConfig.waveEnabled ? animationConfig.waveSpeed * 2000.0 : 1.5
    uniformsRef.current.zoomLevel.value = mapboxState.zoom || 11.2
    uniformsRef.current.modernIntensity.value = 1.2 // Enhanced modern effect
    
    // Update new wave animation uniforms
    // Map wave pattern string to numeric value
    const patternMap = { 'sine': 0, 'triangle': 1, 'sawtooth': 2, 'square': 3 }
    uniformsRef.current.wavePattern.value = patternMap[animationConfig.wavePattern] || 0
    uniformsRef.current.animationSpeed.value = animationConfig.waveAnimationSpeed || 1.0
    uniformsRef.current.heightMultiplier.value = animationConfig.waveHeightMultiplier || 1.0
    uniformsRef.current.colorIntensity.value = animationConfig.waveColorIntensity || 1.0
    uniformsRef.current.edgeGlow.value = animationConfig.waveEdgeGlow || 1.0
    
    // Update particle visibility uniforms
    uniformsRef.current.particleSize.value = animationConfig.waveParticleSize || 1.0
    uniformsRef.current.particleOpacity.value = animationConfig.waveParticleOpacity || 0.8
    uniformsRef.current.colorBrightness.value = animationConfig.waveColorBrightness || 1.2
  }, [isInitialized, animationConfig, mapboxState.zoom])
  
  // Update particle density when it changes
  useEffect(() => {
    if (!isInitialized || !surfaceRef.current || !sceneRef.current) return
    
    const particleCount = animationConfig.waveParticleDensity || 100
    
    // Create new geometry with updated particle count
    const geometry = new THREE.BufferGeometry()
    const positions = []
    const uvs = []
    
    // Generate grid of particles
    for (let i = 0; i < particleCount; i++) {
      for (let j = 0; j < particleCount; j++) {
        // Position in 3D space (spread across the surface)
        const x = (i / (particleCount - 1) - 0.5) * 1000
        const z = (j / (particleCount - 1) - 0.5) * 1000
        positions.push(x, 0, z)
        
        // UV coordinates for texture sampling
        uvs.push(i / (particleCount - 1), j / (particleCount - 1))
      }
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('particleUV', new THREE.Float32BufferAttribute(uvs, 2))
    
    // Update the particles geometry
    const oldGeometry = surfaceRef.current.geometry
    surfaceRef.current.geometry = geometry
    oldGeometry.dispose()
  }, [isInitialized, animationConfig.waveParticleDensity])
  
  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ 
        zIndex: 10,
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%'
      }}
    >
      {/* Show loading state while initializing */}
      {!isInitialized && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white bg-black/50 px-4 py-2 rounded">
            Initializing Wave Layer...
          </div>
        </div>
      )}
    </div>
  )
}