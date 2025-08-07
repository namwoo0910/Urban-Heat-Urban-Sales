"use client"

import { useRef } from "react"
import dynamic from "next/dynamic"
import { motion } from "framer-motion"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { TransitionLink } from "@/components/transition-link"
import { ArrowRight } from "lucide-react"

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

  useGSAP(
    () => {
      const tl = gsap.timeline()
      tl.fromTo(
        ".hero-title span",
        { y: 100, opacity: 0 },
        { y: 0, opacity: 1, stagger: 0.1, duration: 1, ease: "power3.out" },
      )
        .fromTo(
          ".hero-subtitle",
          { y: 50, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" },
          "-=0.6",
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

  const title = "Innovate. Create. Inspire."
  const splitTitle = title.split(" ").map((word, i) => (
    <span key={i} className="inline-block overflow-hidden">
      <span className="inline-block">{word}&nbsp;</span>
    </span>
  ))

  return (
    <div ref={container} className="relative w-full h-screen overflow-hidden">
      {/* 파티클 맵 배경 */}
      <div className="absolute inset-0 z-0">
        <SeoulMapOptimized />
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
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-white text-center px-4">
        <h1 className="hero-title font-bold text-5xl md:text-7xl lg:text-8xl mb-6">{splitTitle}</h1>
        <motion.p
          className="hero-subtitle text-lg md:text-xl lg:text-2xl max-w-3xl mb-8 text-neutral-300"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
        >
          We craft award-winning digital experiences that blend creativity with cutting-edge technology.
        </motion.p>
        <TransitionLink href="/#portfolio">
          <motion.button
            className="hero-button flex items-center gap-2 bg-white text-black font-semibold py-3 px-6 rounded-full transition-transform duration-300"
            whileHover={{ scale: 1.05, transition: { type: "spring", stiffness: 300 } }}
            whileTap={{ scale: 0.95 }}
          >
            Explore Our Work <ArrowRight size={20} />
          </motion.button>
        </TransitionLink>
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
