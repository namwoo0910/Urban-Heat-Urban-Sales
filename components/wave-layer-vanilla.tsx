"use client"

import { useRef, useEffect } from 'react'
import * as THREE from 'three'
import type { AnimationConfig } from '@/hooks/use-particle-animations'
import { loadSeoulBoundaries, isPointInSeoul } from '@/utils/seoul-boundaries'
import type { SeoulBoundaryData } from '@/utils/seoul-boundaries'

// Global Three.js variables (following urbanwave pattern)
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let surface: THREE.Mesh | null = null
let uniforms: any = null
let populationTexture: THREE.DataTexture | null = null
let animationId: number | null = null

// Constants
const textureSize = 64 // Using 64x64 texture like urbanwave
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
  let multiplier = 0.3 // 기본값 (새벽)
  
  // 출근 시간 (7-9시)
  if (hour >= 7 && hour <= 9) multiplier = 1.8
  // 점심 시간 (12-13시)  
  else if (hour >= 12 && hour <= 13) multiplier = 1.4
  // 퇴근 시간 (18-19시)
  else if (hour >= 18 && hour <= 19) multiplier = 2.0
  // 저녁 시간 (20-22시)
  else if (hour >= 20 && hour <= 22) multiplier = 1.6
  // 오전/오후 업무시간
  else if (hour >= 10 && hour <= 11) multiplier = 1.2
  else if (hour >= 14 && hour <= 17) multiplier = 1.3
  // 심야시간 (23-5시)
  else if (hour >= 23 || hour <= 5) multiplier = 0.2
  
  return baseWeight * multiplier * (0.7 + Math.random() * 0.6)
}

// Vertex shader (exact copy from urbanwave)
const vertexShader = `
  uniform float time;
  uniform sampler2D populationTexture;
  uniform float heightScale;
  uniform float waveIntensity;
  
  varying float vHeight;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying float vMask;
  
  bool isInsideSeoul(vec2 uv) {
    vec2 coords = vec2(126.76 + (127.18 - 126.76) * uv.x, 37.42 + (37.70 - 37.42) * uv.y);
    float lng = coords.x;
    float lat = coords.y;
    
    vec2 center = vec2(126.97, 37.56);
    vec2 radii = vec2(0.21, 0.14);
    vec2 normalized = (coords - center) / radii;
    float distance = length(normalized);
    
    return distance < 1.0;
  }
  
  void main() {
    vUv = uv;
    vMask = isInsideSeoul(uv) ? 1.0 : 0.0;
    
    vec4 populationData = texture2D(populationTexture, uv);
    float populationHeight = populationData.r * heightScale * 300.0;
    
    if (vMask < 0.5) {
      populationHeight = 0.0;
    }
    
    populationHeight = clamp(populationHeight, 0.0, 800.0);
    
    float waveEffect = 0.0;
    if (vMask > 0.5) {
      float wave1 = sin(position.x * 0.01 + time * 2.0) * waveIntensity * 20.0;
      float wave2 = cos(position.z * 0.01 + time * 1.5) * waveIntensity * 15.0;
      float wave3 = sin((position.x + position.z) * 0.005 + time * 3.0) * waveIntensity * 10.0;
      waveEffect = wave1 + wave2 + wave3;
    }
    
    vec3 newPosition = position;
    newPosition.y = populationHeight + waveEffect;
    
    vHeight = newPosition.y;
    
    vec2 texelSize = vec2(1.0) / vec2(64.0);
    float heightL = texture2D(populationTexture, clamp(uv - vec2(texelSize.x, 0.0), 0.0, 1.0)).r * heightScale * 300.0;
    float heightR = texture2D(populationTexture, clamp(uv + vec2(texelSize.x, 0.0), 0.0, 1.0)).r * heightScale * 300.0;
    float heightU = texture2D(populationTexture, clamp(uv - vec2(0.0, texelSize.y), 0.0, 1.0)).r * heightScale * 300.0;
    float heightD = texture2D(populationTexture, clamp(uv + vec2(0.0, texelSize.y), 0.0, 1.0)).r * heightScale * 300.0;
    
    heightL = clamp(heightL, 0.0, 800.0);
    heightR = clamp(heightR, 0.0, 800.0);
    heightU = clamp(heightU, 0.0, 800.0);
    heightD = clamp(heightD, 0.0, 800.0);
    
    vec3 tangentX = vec3(40.0, heightR - heightL, 0.0);
    vec3 tangentZ = vec3(0.0, heightD - heightU, 40.0);
    vNormal = normalize(cross(tangentX, tangentZ));
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`

// Fragment shader (exact copy from urbanwave)
const fragmentShader = `
  uniform float time;
  varying float vHeight;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying float vMask;
  
  void main() {
    if (vMask < 0.5) {
      discard;
    }
    
    float heightNorm = clamp(vHeight / 500.0, 0.0, 1.0);
    
    vec3 darkGray = vec3(0.15, 0.15, 0.18);
    vec3 lightGray = vec3(0.7, 0.7, 0.75);
    vec3 baseColor = mix(darkGray, lightGray, heightNorm);
    
    float timeColor = sin(time * 2.0 + vUv.x * 10.0 + vUv.y * 8.0) * 0.1 + 0.9;
    baseColor *= timeColor;
    
    vec3 lightDir = normalize(vec3(1.0, 2.0, 1.0));
    float light = max(0.3, dot(vNormal, lightDir));
    
    float edge = smoothstep(0.0, 0.3, heightNorm);
    vec3 finalColor = baseColor * light + vec3(0.1, 0.15, 0.2) * edge;
    
    vec2 center = vec2(0.5, 0.5);
    float distanceFromCenter = length((vUv - center) * vec2(1.0, 0.7)) * 2.0;
    float fadeFactor = smoothstep(0.9, 1.0, distanceFromCenter);
    float alpha = (0.85 + heightNorm * 0.15) * (1.0 - fadeFactor);
    
    gl_FragColor = vec4(finalColor, alpha);
  }
`

// Mapbox coordinate transformation (from urbanwave)
function lngLatToWorld(lng: number, lat: number, zoom: number) {
  const scale = Math.pow(2, zoom)
  const worldSize = 512 * scale
  const lambda = lng * Math.PI / 180
  const phi = lat * Math.PI / 180
  const x = worldSize * (lambda + Math.PI) / (2 * Math.PI)
  const y = worldSize * (1 - (Math.log(Math.tan(Math.PI / 4 + phi / 2)) + Math.PI) / (2 * Math.PI))
  return { x, y }
}

// Update population surface data
function updatePopulationSurface(boundaryData: SeoulBoundaryData | null) {
  if (!populationTexture) return
  
  const textureData = new Float32Array(textureSize * textureSize * 4)
  const currentHour = Math.floor((Date.now() / 1000 / 60) % 24)
  
  for (let y = 0; y < textureSize; y++) {
    for (let x = 0; x < textureSize; x++) {
      const lat = seoulBounds.minLat + (seoulBounds.maxLat - seoulBounds.minLat) * (y / (textureSize - 1))
      const lng = seoulBounds.minLng + (seoulBounds.maxLng - seoulBounds.minLng) * (x / (textureSize - 1))
      
      // Check if point is inside Seoul
      const isInSeoul = boundaryData ? isPointInSeoul(lng, lat, boundaryData) : true
      
      let totalWeight = 0
      let totalDistance = 0
      
      if (isInSeoul) {
        // Inverse Distance Weighting
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
      textureData[index] = populationValue     // R
      textureData[index + 1] = 0              // G
      textureData[index + 2] = 0              // B
      textureData[index + 3] = 1              // A
    }
  }
  
  populationTexture.image.data = textureData
  populationTexture.needsUpdate = true
}

// Update camera and surface position
function updateCameraAndSurface(mapboxState: any) {
  if (!surface || !camera || !mapboxState) return
  
  const { center, zoom, bearing, pitch } = mapboxState
  
  // Convert Seoul bounds to world coordinates
  const minWorld = lngLatToWorld(seoulBounds.minLng, seoulBounds.minLat, zoom)
  const maxWorld = lngLatToWorld(seoulBounds.maxLng, seoulBounds.maxLat, zoom)
  const centerWorld = lngLatToWorld(center.lng, center.lat, zoom)
  
  // Calculate surface dimensions
  const surfaceWidth = maxWorld.x - minWorld.x
  const surfaceHeight = maxWorld.y - minWorld.y
  const surfaceCenterX = (minWorld.x + maxWorld.x) / 2 - centerWorld.x
  const surfaceCenterY = (minWorld.y + maxWorld.y) / 2 - centerWorld.y
  
  // Update surface scale and position
  surface.scale.set(surfaceWidth / 2000, 1, surfaceHeight / 2000)
  surface.position.set(surfaceCenterX, 0, -surfaceCenterY)
  surface.rotation.y = -bearing * Math.PI / 180
  
  // Update camera (Mapbox camera sync)
  const altitude = 1.5 / Math.tan(pitch * Math.PI / 360) * Math.max(surfaceWidth, surfaceHeight)
  camera.position.set(0, altitude, altitude * 0.3)
  camera.lookAt(surfaceCenterX, 0, -surfaceCenterY)
  camera.fov = 60
  camera.updateProjectionMatrix()
}

interface WaveLayerProps {
  animationConfig: AnimationConfig
  mapboxCameraPos?: { longitude: number; latitude: number; zoom: number; pitch: number; bearing: number }
}

export function WaveLayer({ animationConfig, mapboxCameraPos }: WaveLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const boundaryDataRef = useRef<SeoulBoundaryData | null>(null)
  const animationSpeedRef = useRef(1)
  const timeRef = useRef(0)
  
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
  
  useEffect(() => {
    // Load Seoul boundaries
    loadSeoulBoundaries()
      .then(data => {
        boundaryDataRef.current = data
        updatePopulationSurface(data)
      })
      .catch(err => console.warn('Failed to load Seoul boundaries:', err))
  }, [])
  
  useEffect(() => {
    if (!containerRef.current) return
    
    // Initialize Three.js (following urbanwave pattern)
    scene = new THREE.Scene()
    
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100000)
    
    renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: "high-performance"
    })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(0x000000, 0)
    containerRef.current.appendChild(renderer.domElement)
    
    // Create population texture
    const textureData = new Float32Array(textureSize * textureSize * 4)
    populationTexture = new THREE.DataTexture(textureData, textureSize, textureSize, THREE.RGBAFormat, THREE.FloatType)
    populationTexture.needsUpdate = true
    
    // Create surface geometry
    const geometry = new THREE.PlaneGeometry(2000, 2000, textureSize - 1, textureSize - 1)
    geometry.rotateX(-Math.PI / 2)
    
    // Create uniforms
    uniforms = {
      time: { value: 0 },
      populationTexture: { value: populationTexture },
      heightScale: { value: 1.5 },
      waveIntensity: { value: 0.8 }
    }
    
    // Create shader material
    const material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      transparent: true,
      side: THREE.DoubleSide
    })
    
    // Create mesh
    surface = new THREE.Mesh(geometry, material)
    scene.add(surface)
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4)
    scene.add(ambientLight)
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6)
    directionalLight.position.set(100, 200, 100)
    scene.add(directionalLight)
    
    // Initial update
    updatePopulationSurface(boundaryDataRef.current)
    updateCameraAndSurface(mapboxState)
    
    // Animation loop (following urbanwave pattern)
    const animate = () => {
      animationId = requestAnimationFrame(animate)
      
      // Update time uniform
      timeRef.current += 0.016 * animationSpeedRef.current
      uniforms.time.value = timeRef.current
      
      // Update uniforms based on animation config
      uniforms.heightScale.value = animationConfig.waveEnabled ? animationConfig.waveAmplitude : 1.5
      uniforms.waveIntensity.value = animationConfig.waveEnabled ? animationConfig.waveFrequency : 0.8
      
      // Update camera and surface position
      updateCameraAndSurface(mapboxState)
      
      // Render
      if (renderer && scene && camera) {
        renderer.render(scene, camera)
      }
    }
    
    // Start animation
    animate()
    
    // Handle window resize
    const handleResize = () => {
      if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight
        camera.updateProjectionMatrix()
        renderer.setSize(window.innerWidth, window.innerHeight)
      }
    }
    window.addEventListener('resize', handleResize)
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
      
      if (renderer) {
        renderer.dispose()
        if (containerRef.current && renderer.domElement) {
          containerRef.current.removeChild(renderer.domElement)
        }
      }
      
      if (populationTexture) {
        populationTexture.dispose()
      }
      
      scene = null
      camera = null
      renderer = null
      surface = null
      uniforms = null
      populationTexture = null
    }
  }, []) // Initialize only once
  
  // Update animation speed based on config
  useEffect(() => {
    animationSpeedRef.current = animationConfig.animationSpeed
  }, [animationConfig.animationSpeed])
  
  // Update camera when mapbox position changes
  useEffect(() => {
    updateCameraAndSurface(mapboxState)
  }, [mapboxState])
  
  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-10"
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
    />
  )
}