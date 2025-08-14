"use client"

import * as THREE from "three"
import { Canvas, extend, useFrame } from "@react-three/fiber"
import { shaderMaterial } from "@react-three/drei"
import { useMemo, useRef } from "react"

const LocalEconomyMaterial = shaderMaterial(
  { uTime: 0, uMouse: new THREE.Vector2() },
  // vertex shader
  `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // fragment shader
  `
    uniform float uTime;
    uniform vec2 uMouse;
    varying vec2 vUv;

    float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    float noise(vec2 st) {
        vec2 i = floor(st);
        vec2 f = fract(st);
        float a = random(i);
        float b = random(i + vec2(1.0, 0.0));
        float c = random(i + vec2(0.0, 1.0));
        float d = random(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.y * u.x;
    }

    void main() {
      vec2 st = vUv;
      st.x *= 1.6; // Aspect ratio correction
      
      // Economic activity pulse effect based on mouse
      float activity = smoothstep(0.4, 0.0, distance(uMouse, vUv)) * 0.15;

      // Data flow lines (representing card transactions)
      float dataFlow = sin(vUv.y * 600.0 + uTime * 2.0) * 0.03;
      
      // Economic zone grid (representing Seoul districts)
      vec2 grid_uv = fract(st * vec2(25.0, 18.0));
      float grid = (1.0 - step(0.08, grid_uv.x)) + (1.0 - step(0.08, grid_uv.y));
      grid = clamp(grid, 0.0, 1.0);

      // Base color (warm economic theme)
      vec3 color = vec3(0.1, 0.05, 0.0);
      
      // Add economic zone grid (golden color for prosperity)
      color += vec3(1.0, 0.8, 0.3) * grid * 0.4;
      
      // Add market fluctuation noise
      color += noise(st * 8.0 + uTime * 0.3) * 0.15;
      
      // Add transaction flow lines
      color += dataFlow * vec3(0.8, 0.6, 0.2);

      // Add economic activity hotspots (mouse interaction)
      float mouseDist = distance(uMouse, vUv);
      color += smoothstep(0.3, 0.0, mouseDist) * vec3(1.0, 0.7, 0.3);
      
      // Add pulsing economic indicators
      float pulse = sin(uTime * 3.0) * 0.05 + 0.05;
      color += pulse * vec3(0.9, 0.5, 0.1);

      gl_FragColor = vec4(color, 1.0);
    }
  `,
)

extend({ LocalEconomyMaterial })

const Scene = () => {
  const materialRef = useRef<any>(null)
  const mousePos = useMemo(() => new THREE.Vector2(), [])

  useFrame((state, delta) => {
    if (materialRef.current) {
      materialRef.current.uTime += delta
      materialRef.current.uMouse.lerp(state.mouse, 0.05)
    }
  })

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      {/* @ts-ignore */}
      <localEconomyMaterial ref={materialRef} />
    </mesh>
  )
}

const LocalEconomyScene = () => {
  return (
    <Canvas camera={{ position: [0, 0, 1] }}>
      <Scene />
    </Canvas>
  )
}

export default LocalEconomyScene