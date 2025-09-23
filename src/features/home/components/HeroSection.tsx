"use client"

import { useRef, useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { motion } from "framer-motion"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { TransitionLink } from "@/src/shared/components/navigation/TransitionLink"
import { ArrowRight, Circle, Map } from "lucide-react"

// 동적으로 파티클 맵 로드 (SSR 비활성화) - 최적화된 버전 사용
const SeoulMapOptimized = dynamic(
  () => import("./ParticleMapSeoul").then((mod) => mod.SeoulMapOptimized),
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

// Fixed animation configuration for optimal particle effects
const FIXED_ANIMATION_CONFIG = {
  waveEnabled: true,
  waveSpeed: 2.0,
  waveAmplitude: 0.01,
  pulseEnabled: true,
  pulseSpeed: 0.005,
  pulseIntensity: 0.5,
  fireflyEnabled: true,
  fireflySpeed: 0.002,
  fireflyRandomness: 1.0,
  colorCycleEnabled: false,
  colorCycleSpeed: 0.002,
  orbitalEnabled: false,
  orbitalSpeed: 0.001,
  orbitalRadius: 0.002,
  autoRotateEnabled: false,
  autoRotateSpeed: 0.5,
  colorTheme: 'current' as const,
  blackBackgroundEnabled: false,
  trailEnabled: false,
  trailLength: 5,
  flowFieldEnabled: false,
  flowFieldStrength: 1.0,
  attractionEnabled: false,
  attractionStrength: 1.0,
  morphEnabled: false,
  morphSpeed: 1.0
}

export function Hero() {
  const container = useRef(null)
  const [displayMode, setDisplayMode] = useState<'circular' | 'transitioning' | 'map'>('circular')
  const [hasExplored, setHasExplored] = useState(false)
  const [showCenterText, setShowCenterText] = useState(true)
  const [showTopText, setShowTopText] = useState(false)

  // Map style set to pure black background
  const mapStyle = "mapbox://styles/mapbox/dark-v11"

  // Handle explore button click
  const handleExploreClick = () => {
    if (displayMode === 'circular') {
      setDisplayMode('transitioning')
      setHasExplored(true)
      setShowCenterText(false) // Hide center text when transitioning
      // The ParticleMapSeoul component will handle the actual transition
      // once map particles are loaded
    }
  }

  useEffect(() => {
    const onRemoteExplore = () => handleExploreClick()
    window.addEventListener('hero:explore', onRemoteExplore)
    return () => window.removeEventListener('hero:explore', onRemoteExplore)
  }, [handleExploreClick])

  useGSAP(
    () => {
      const tl = gsap.timeline()

      if (showCenterText && displayMode === 'circular') {
        // Animate center text word by word when in circular mode
        tl.fromTo(
          ".center-word",
          { opacity: 0, scale: 0.8, y: 20 },
          {
            opacity: 1,
            scale: 1,
            y: 0,
            stagger: 0.3, // 0.3s delay between each word
            duration: 0.6,
            ease: "power3.out"
          }
        )
      }

      if (showTopText) {
        // Animate top text when map is formed - sequential word animation
        tl.fromTo(
          ".hero-word-1",
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: "power3.out"
          }
        )
          .fromTo(
            ".hero-word-2",
            { opacity: 0, y: 20 },
            {
              opacity: 1,
              y: 0,
              duration: 0.4,
              ease: "power3.out"
            },
            "-=0.2"
          )
          .fromTo(
            ".hero-word-3",
            { opacity: 0, y: 20 },
            {
              opacity: 1,
              y: 0,
              duration: 0.6,
              ease: "power3.out"
            },
            "-=0.2"
          )
          .fromTo(
            ".hero-subtitle",
            { y: 50, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" },
            "-=0.3",
          )
      }

      // Always animate the button
      tl.fromTo(
        ".hero-button",
        { scale: 0.8, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.8, ease: "elastic.out(1, 0.5)" },
        "-=0.5",
      )
    },
    { scope: container, dependencies: [showCenterText, showTopText, displayMode] },
  )

  const splitTitle = (
    <div className="flex items-center justify-center">
      <span className="hero-word-1 font-['Montserrat'] font-bold text-3xl md:text-4xl lg:text-5xl tracking-wider bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
        Urban Heat
      </span>
      <span className="hero-word-2 inline-block mx-4 font-['Montserrat'] font-light text-3xl md:text-4xl lg:text-5xl text-white/70">,</span>
      <span className="hero-word-3 font-['Montserrat'] font-bold text-3xl md:text-4xl lg:text-5xl tracking-wider bg-gradient-to-r from-teal-400 to-cyan-600 bg-clip-text text-transparent">
        Urban Sales
      </span>
    </div>
  )

  return (
    <div ref={container} className="relative w-full min-h-screen h-screen overflow-hidden">
      {/* 파티클 맵 배경 */}
      <div className="absolute inset-0 z-0">
        <SeoulMapOptimized
          animationConfig={FIXED_ANIMATION_CONFIG as any}
          onAnimationConfigChange={() => {}}
          mapStyle={mapStyle}
          displayMode={displayMode}
          onDisplayModeChange={(mode) => {
            setDisplayMode(mode)
            if (mode === 'map') {
              // Show top text when map is fully formed
              setShowTopText(true)
            }
          }}
        />
      </div>
      
      {/* Center text for circular mode */}
      {showCenterText && displayMode === 'circular' && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="text-white text-center">
            <div className="flex flex-col items-center space-y-6">
              <span className="center-word font-['Montserrat'] font-bold text-3xl md:text-4xl lg:text-5xl tracking-wider bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">SEOUL</span>
              <span className="center-word font-['Montserrat'] font-light text-3xl md:text-4xl lg:text-5xl tracking-wider text-white/70">X</span>
              <span className="center-word font-['Montserrat'] font-bold text-3xl md:text-4xl lg:text-5xl tracking-wider bg-gradient-to-r from-teal-400 to-cyan-600 bg-clip-text text-transparent">URBAN AI</span>
            </div>
          </div>
        </div>
      )}

      {/* Top text elements - shown after map formation */}
      {showTopText && (
        <div className="absolute left-0 right-0 z-10 flex flex-col items-center text-white text-center px-4" style={{ top: 'calc(7rem - 10px)' }}>
          <div className="hero-title mb-4">{splitTitle}</div>
          <motion.p
            className="hero-subtitle font-['Montserrat'] font-semibold tracking-wider text-sm md:text-base lg:text-lg text-neutral-300 uppercase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
          >
            KAIST AI INSTITUTE
          </motion.p>
        </div>
      )}
      
      {/* Bottom button */}
      <div className="absolute left-0 right-0 z-10 flex justify-center px-4" style={{ bottom: 'calc(5rem - 5px)' }}>
        {!hasExplored ? (
          <motion.button
            onClick={handleExploreClick}
            className="hero-button flex items-center gap-2 bg-black/80 hover:bg-black text-white font-['Montserrat'] font-medium py-2 px-4 rounded-full transition-all duration-300 text-sm uppercase tracking-wide border border-white/20"
            whileHover={{ scale: 1.05, transition: { type: "spring", stiffness: 300 } }}
            whileTap={{ scale: 0.95 }}
            disabled={displayMode === 'transitioning'}
          >
            {displayMode === 'circular' && (
              <>
                <Circle size={16} className="animate-pulse" />
                EXPLORE SEOUL
                <ArrowRight size={16} />
              </>
            )}
            {displayMode === 'transitioning' && (
              <>
                TRANSITIONING...
                <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin ml-2" />
              </>
            )}
          </motion.button>
        ) : (
          <TransitionLink href="/research-section">
            <motion.button
              className="hero-button flex items-center gap-2 bg-black/80 hover:bg-black text-white font-['Montserrat'] font-medium py-2 px-4 rounded-full transition-all duration-300 text-sm uppercase tracking-wide border border-white/20"
              whileHover={{ scale: 1.05, transition: { type: "spring", stiffness: 300 } }}
              whileTap={{ scale: 0.95 }}
            >
              <Map size={16} />
              VIEW ANALYTICS
              <ArrowRight size={16} />
            </motion.button>
          </TransitionLink>
        )}
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
