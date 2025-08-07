"use client"

import dynamic from "next/dynamic"
import { motion } from "framer-motion"

// SSR 비활성화 - Mapbox와 deck.gl은 브라우저에서만 작동
const SeoulMapEnhanced = dynamic(
  () => import("@/components/seoul-map-enhanced").then((mod) => mod.SeoulMapEnhanced),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-2 border-purple-500/30 animate-ping"></div>
            <div className="absolute inset-0 rounded-full border-2 border-blue-500/30 animate-ping animation-delay-200"></div>
            <div className="absolute inset-0 rounded-full border-2 border-cyan-500/30 animate-ping animation-delay-400"></div>
            <div className="relative flex items-center justify-center h-full">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
            </div>
          </div>
          <p className="text-xl font-light bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Enhanced Particle System
          </p>
          <p className="text-sm text-white/60 mt-2">Initializing Seoul visualization...</p>
        </div>
      </div>
    )
  }
)

export default function TestEnhancedPage() {
  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* 메인 맵 컨테이너 */}
      <div className="absolute inset-0">
        <SeoulMapEnhanced />
      </div>
      
      {/* Hero 스타일 텍스트 오버레이 */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-white text-center px-4 pointer-events-none">
        <motion.h1 
          className="font-bold text-5xl md:text-7xl lg:text-8xl mb-6"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          <span className="inline-block bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Seoul
          </span>
          <span className="inline-block ml-4 text-white/90">
            Particles
          </span>
        </motion.h1>
        
        <motion.p
          className="text-lg md:text-xl lg:text-2xl max-w-3xl mb-8 text-white/70"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
        >
          Experience the dynamic visualization of Seoul with thousands of animated particles
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1, duration: 0.8, type: "spring" }}
          className="pointer-events-auto"
        >
          <button className="px-8 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white font-medium hover:bg-white/20 transition-all duration-300 hover:scale-105">
            Explore Seoul
          </button>
        </motion.div>
      </div>
      
      {/* 정보 패널 */}
      <motion.div 
        className="absolute top-4 left-4 bg-black/60 backdrop-blur-md rounded-lg border border-purple-500/20 p-4 text-white z-20"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.5, duration: 0.8 }}
      >
        <h3 className="font-bold text-lg mb-2 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
          Enhanced Effects
        </h3>
        <div className="text-xs text-white/70 space-y-1">
          <div>🌟 8,000 animated particles</div>
          <div>🔗 Dynamic connections</div>
          <div>✨ Multi-layer glow effects</div>
          <div>🎨 Gradient color system</div>
          <div>🌊 Wave motion animation</div>
          <div>🔄 Auto-rotation camera</div>
        </div>
      </motion.div>
      
      {/* 스타일 태그 추가 */}
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