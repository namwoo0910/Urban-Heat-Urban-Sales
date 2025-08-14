"use client"

import { useRef, useState, useCallback } from "react"
import dynamic from "next/dynamic"
import { motion } from "framer-motion"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { TransitionLink } from "@/components/transition-link"
import { ArrowRight } from "lucide-react"
import { AnimationControls } from "@/components/animation-controls"
import type { AnimationConfig } from "@/hooks/use-particle-animations"
import { defaultAnimationConfig } from "@/hooks/use-particle-animations"

// 동적으로 파티클 맵 로드 (SSR 비활성화) - 최적화된 버전 사용
const SeoulMapOptimized = dynamic(
  () => import("@/components/seoul-map-optimized").then((mod) => mod.SeoulMapOptimized),
  { 
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 bg-black">
        <div className="flex items-center justify-center h-full">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-2 border-purple-500/30 animate-ping"></div>
            <div className="absolute inset-0 rounded-full border-2 border-blue-500/30 animate-ping animation-delay-200"></div>
            <div className="absolute inset-0 rounded-full border-2 border-cyan-500/30 animate-ping animation-delay-400"></div>
          </div>
        </div>
      </div>
    )
  }
)

export function Hero() {
  const container = useRef(null)
  
  // Animation configuration state management
  const [animationConfig, setAnimationConfig] = useState<AnimationConfig>({
    ...defaultAnimationConfig,
    waveEnabled: true,
    pulseEnabled: true,
    fireflyEnabled: true,
    trailEnabled: false, // Disabled for performance
  })
  
  // Map style set to pure black background
  const mapStyle = "mapbox://styles/mapbox/dark-v11"
  
  // Handle animation config changes
  const handleAnimationConfigChange = useCallback((changes: Partial<AnimationConfig>) => {
    setAnimationConfig(prev => ({ ...prev, ...changes }))
  }, [])
  
  // Map style change handler removed - using fixed dark theme

  useGSAP(
    () => {
      const tl = gsap.timeline()
      // 타이핑 효과 - 각 글자가 순차적으로 나타남
      tl.fromTo(
        ".hero-char",
        { opacity: 0, y: 20 },
        { 
          opacity: 1, 
          y: 0,
          stagger: 0.05,
          duration: 0.5,
          ease: "power3.out"
        }
      )
        .fromTo(
          ".hero-subtitle",
          { y: 50, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" },
          "-=0.3",
        )
        .fromTo(
          ".hero-button",
          { scale: 0.8, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.8, ease: "elastic.out(1, 0.5)" },
          "-=0.5",
        )
    },
    { scope: container },
  )

  const words = ["CLIMATE", "ECONOMY", "POPULATION"]
  const splitTitle = words.map((word, i) => (
    <span key={i} className="inline-block">
      {word.split("").map((char, j) => (
        <span key={j} className="inline-block hero-char">
          {char}
        </span>
      ))}
      {i < words.length - 1 && <span className="inline-block mx-6 hero-char">·</span>}
    </span>
  ))

  return (
    <div ref={container} className="relative w-full min-h-screen h-screen overflow-hidden">
      {/* 파티클 맵 배경 */}
      <div className="absolute inset-0 z-0">
        <SeoulMapOptimized 
          animationConfig={animationConfig}
          onAnimationConfigChange={handleAnimationConfigChange}
          mapStyle={mapStyle}
          onMapStyleChange={() => {}} // No-op since style is fixed
        />
      </div>
      
      {/* 그라데이션 오버레이 */}
      <div 
        className="absolute inset-0 z-5 pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at 50% 50%, 
              transparent 30%, 
              rgba(0, 0, 0, 0.3) 60%,
              rgba(0, 0, 0, 0.7) 100%
            )
          `,
        }}
      />
      {/* Top text elements */}
      <div className="absolute top-28 left-0 right-0 z-10 flex flex-col items-center text-white text-center px-4">
        <h1 className="hero-title font-['Montserrat'] font-bold tracking-tight text-3xl md:text-4xl lg:text-5xl mb-4 uppercase">{splitTitle}</h1>
        <motion.p
          className="hero-subtitle font-['Montserrat'] font-semibold tracking-wider text-sm md:text-base lg:text-lg text-neutral-300 uppercase"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
        >
          KAIST AI INSTITUTE
        </motion.p>
      </div>
      
      {/* Bottom button */}
      <div className="absolute left-0 right-0 z-10 flex justify-center px-4" style={{ bottom: 'calc(5rem - 5px)' }}>
        <TransitionLink href="/#research">
          <motion.button
            className="hero-button flex items-center gap-1 bg-black/80 hover:bg-black text-white font-['Montserrat'] font-medium py-1 px-3 rounded-full transition-all duration-300 text-xs uppercase tracking-wide border border-white/20"
            whileHover={{ scale: 1.05, transition: { type: "spring", stiffness: 300 } }}
            whileTap={{ scale: 0.95 }}
          >
            EXPLORE SEOUL <ArrowRight size={12} />
          </motion.button>
        </TransitionLink>
      </div>
      
      {/* Animation Controls - positioned above all other elements */}
      <div className="absolute top-[46px] left-4 z-[100]">
        <AnimationControls
          config={animationConfig}
          onConfigChange={handleAnimationConfigChange}
          performanceLevel="high"
          mapStyle={mapStyle}
          onMapStyleChange={() => {}} // No-op since style is fixed
        />
      </div>
      
      {/* 애니메이션 스타일 */}
      <style jsx>{`
        @keyframes ping {
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }
        
        .animation-delay-200 {
          animation-delay: 0.2s;
        }
        
        .animation-delay-400 {
          animation-delay: 0.4s;
        }
      `}</style>
    </div>
  )
}
