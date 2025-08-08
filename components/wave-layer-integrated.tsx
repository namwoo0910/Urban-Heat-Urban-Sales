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

// Vertex shader with scaled heights for proper alignment
const vertexShader = `
  uniform float time;
  uniform sampler2D populationTexture;
  uniform float heightScale;
  uniform float waveIntensity;
  uniform float zoomLevel;
  
  varying float vHeight;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying float vMask;
  varying float vEdge;
  
  void main() {
    vUv = uv;
    
    // Read boundary mask from green channel of texture
    vec4 populationData = texture2D(populationTexture, uv);
    vMask = populationData.g;
    
    // Calculate edge detection for boundary glow
    float texelSize = 1.0 / 64.0;
    vec2 uvL = clamp(uv - vec2(texelSize, 0.0), 0.0, 1.0);
    vec2 uvR = clamp(uv + vec2(texelSize, 0.0), 0.0, 1.0);
    vec2 uvU = clamp(uv - vec2(0.0, texelSize), 0.0, 1.0);
    vec2 uvD = clamp(uv + vec2(0.0, texelSize), 0.0, 1.0);
    
    float maskL = texture2D(populationTexture, uvL).g;
    float maskR = texture2D(populationTexture, uvR).g;
    float maskU = texture2D(populationTexture, uvU).g;
    float maskD = texture2D(populationTexture, uvD).g;
    vEdge = abs(vMask - maskL) + abs(vMask - maskR) + abs(vMask - maskU) + abs(vMask - maskD);
    
    // Scale height based on zoom level for consistent appearance
    float zoomScale = pow(2.0, (11.2 - zoomLevel) * 0.5); // Scale relative to default zoom 11.2
    float populationHeight = populationData.r * heightScale * 100.0 * zoomScale;
    
    if (vMask < 0.5) {
      populationHeight = 0.0;
    }
    
    populationHeight = clamp(populationHeight, 0.0, 300.0 * zoomScale);
    
    float waveEffect = 0.0;
    if (vMask > 0.5) {
      // Sharp, angular wave patterns
      float freq1 = position.x * 0.015 + time * 3.0;
      float freq2 = position.z * 0.012 + time * 2.5;
      float freq3 = (position.x + position.z) * 0.008 + time * 4.0;
      float freq4 = (position.x - position.z) * 0.02 + time * 3.5;
      
      // Triangle wave functions for sharp motion
      float wave1 = (2.0 * abs(fract(freq1) - 0.5) - 0.5) * waveIntensity * 25.0 * zoomScale;
      float wave2 = (2.0 * abs(fract(freq2) - 0.5) - 0.5) * waveIntensity * 20.0 * zoomScale;
      
      // Sawtooth wave for more aggressive motion
      float wave3 = (fract(freq3) * 2.0 - 1.0) * waveIntensity * 15.0 * zoomScale;
      
      // Square wave with smoothing for sharp edges
      float wave4 = sign(sin(freq4)) * waveIntensity * 12.0 * zoomScale;
      
      // Sharp base oscillation with triangle wave
      float baseOscillation = (2.0 * abs(fract(time * 0.8) - 0.5) - 0.5) * 18.0 * zoomScale;
      
      // Combine waves with different phases for complexity
      waveEffect = wave1 + wave2 + wave3 + wave4 + baseOscillation;
      
      // Add noise-like sharp details
      float noiseFreq = (position.x + position.z) * 0.03 + time * 5.0;
      float sharpNoise = (fract(noiseFreq) > 0.5 ? 1.0 : -1.0) * waveIntensity * 8.0 * zoomScale;
      waveEffect += sharpNoise;
    }
    
    vec3 newPosition = position;
    newPosition.y = populationHeight + waveEffect;
    
    vHeight = newPosition.y;
    
    vec2 texelSizeVec = vec2(1.0) / vec2(64.0);
    float heightL = texture2D(populationTexture, clamp(uv - vec2(texelSizeVec.x, 0.0), 0.0, 1.0)).r * heightScale * 100.0 * zoomScale;
    float heightR = texture2D(populationTexture, clamp(uv + vec2(texelSizeVec.x, 0.0), 0.0, 1.0)).r * heightScale * 100.0 * zoomScale;
    float heightU = texture2D(populationTexture, clamp(uv - vec2(0.0, texelSizeVec.y), 0.0, 1.0)).r * heightScale * 100.0 * zoomScale;
    float heightD = texture2D(populationTexture, clamp(uv + vec2(0.0, texelSizeVec.y), 0.0, 1.0)).r * heightScale * 100.0 * zoomScale;
    
    heightL = clamp(heightL, 0.0, 300.0 * zoomScale);
    heightR = clamp(heightR, 0.0, 300.0 * zoomScale);
    heightU = clamp(heightU, 0.0, 300.0 * zoomScale);
    heightD = clamp(heightD, 0.0, 300.0 * zoomScale);
    
    vec3 tangentX = vec3(20.0, heightR - heightL, 0.0);
    vec3 tangentZ = vec3(0.0, heightD - heightU, 20.0);
    vNormal = normalize(cross(tangentX, tangentZ));
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`

// Modern fragment shader with sharp design and no white boundaries
const fragmentShader = `
  uniform float time;
  uniform float modernIntensity;
  varying float vHeight;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying float vMask;
  varying float vEdge;
  
  void main() {
    // Hard boundary clipping - no soft edges
    if (vMask < 0.5) {
      discard;
    }
    
    float heightNorm = clamp(vHeight / 500.0, 0.0, 1.0);
    
    // Modern color palette - deep blues to electric cyans
    vec3 deepNavy = vec3(0.02, 0.05, 0.15);
    vec3 richBlue = vec3(0.1, 0.2, 0.4);
    vec3 electricCyan = vec3(0.0, 0.6, 0.8);
    vec3 brightCyan = vec3(0.2, 0.8, 1.0);
    vec3 neonAccent = vec3(0.4, 0.7, 1.0);
    
    vec3 baseColor;
    if (heightNorm < 0.2) {
      baseColor = mix(deepNavy, richBlue, heightNorm * 5.0);
    } else if (heightNorm < 0.5) {
      baseColor = mix(richBlue, electricCyan, (heightNorm - 0.2) * 3.33);
    } else if (heightNorm < 0.8) {
      baseColor = mix(electricCyan, brightCyan, (heightNorm - 0.5) * 3.33);
    } else {
      baseColor = mix(brightCyan, neonAccent, (heightNorm - 0.8) * 5.0);
    }
    
    // Dynamic color shifting for modern effect
    float colorShift = sin(time * 1.5 + vUv.x * 8.0 + vUv.y * 6.0) * 0.15 + 0.85;
    float intensityBoost = 1.0 + heightNorm * 0.5; // Higher areas more vibrant
    baseColor *= colorShift * intensityBoost;
    
    // Modern lighting model with rim lighting
    vec3 lightDir = normalize(vec3(1.0, 3.0, 1.0));
    float NdotL = max(0.0, dot(vNormal, lightDir));
    
    // Ambient lighting
    float ambient = 0.3;
    
    // Rim lighting for modern edge definition
    vec3 viewDir = normalize(vec3(0.0, 1.0, 0.0)); // Simplified view direction
    float rimPower = 1.0 - max(0.0, dot(vNormal, viewDir));
    float rimLight = pow(rimPower, 2.0) * 0.6;
    
    // Combine lighting
    float totalLight = ambient + NdotL * 0.7 + rimLight;
    
    // NO edge glow - removed completely for clean boundaries
    
    // Final color with metallic properties
    vec3 finalColor = baseColor * totalLight;
    
    // Add subtle iridescence based on viewing angle
    float iridescence = sin(rimPower * 3.14159 + time * 2.0) * 0.1 + 0.9;
    finalColor *= iridescence;
    
    // Hard boundary fade - much sharper than before
    float boundaryFade = step(0.5, vMask); // Hard step instead of smooth
    
    // High contrast alpha for crisp definition
    float alpha = (0.9 + heightNorm * 0.1) * boundaryFade;
    
    gl_FragColor = vec4(finalColor, alpha);
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
  const surfaceRef = useRef<THREE.Mesh | null>(null)
  const uniformsRef = useRef<any>(null)
  const populationTextureRef = useRef<THREE.DataTexture | null>(null)
  const animationIdRef = useRef<number | null>(null)
  const boundaryDataRef = useRef<SeoulBoundaryData | null>(null)
  const timeRef = useRef(0)
  const [isInitialized, setIsInitialized] = useState(false)
  
  // Convert mapbox camera position to state object
  const mapboxState = mapboxCameraPos ? {
    center: { lng: mapboxCameraPos.longitude, lat: mapboxCameraPos.latitude },
    zoom: mapboxCameraPos.zoom,
    pitch: mapboxCameraPos.pitch,
    bearing: mapboxCameraPos.bearing
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
    
    // Create surface geometry with size matching the base scale
    const geometry = new THREE.PlaneGeometry(1000, 1000, textureSize - 1, textureSize - 1)
    geometry.rotateX(-Math.PI / 2)
    
    // Create uniforms with modern design controls
    const uniforms = {
      time: { value: 0 },
      populationTexture: { value: populationTexture },
      heightScale: { value: 3.0 },
      waveIntensity: { value: 1.5 },
      zoomLevel: { value: 11.2 },
      modernIntensity: { value: 1.0 }
    }
    uniformsRef.current = uniforms
    
    // Create shader material
    const material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      transparent: true,
      side: THREE.DoubleSide
    })
    
    // Create mesh
    const surface = new THREE.Mesh(geometry, material)
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
    uniformsRef.current.waveIntensity.value = animationConfig.waveEnabled ? animationConfig.waveFrequency * 2.0 : 1.5
    uniformsRef.current.zoomLevel.value = mapboxState.zoom || 11.2
    uniformsRef.current.modernIntensity.value = 1.2 // Enhanced modern effect
  }, [isInitialized, animationConfig, mapboxState.zoom])
  
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