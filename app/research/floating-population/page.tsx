"use client"

import { lazy, Suspense } from "react"
import dynamic from "next/dynamic"
import FeatureCard from "@/src/features/data-portal/components/DataFeatureCard"
import ResearchHeader from "@/src/features/data-portal/components/ResearchHeader"
import ResearchNavigation from "@/src/features/data-portal/components/PortalNavigation"
import { useState, useEffect } from "react"

// Dynamic import for floating population map
const FloatingPopDistrictMap = lazy(() => import("@/src/features/floating-pop/components/FloatingPopDistrictMap"))

// Dynamic import for animated mesh background
const AnimatedMeshBackground = dynamic(
  () => import("@/src/features/floating-pop/components/AnimatedMeshBackground"),
  { 
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-purple-950 to-pink-950" />
    )
  }
)

const features = [
  {
    icon: "Map",
    title: "도시 맥박",
    description: "서울시 3,380개 격자의 24시간 실시간 유동인구 밀도 시각화로 도시의 맥박을 확인하세요.",
  },
  {
    icon: "RotateCw",
    title: "시간적 흐름",
    description: "새벽부터 저녁까지 인구 패턴의 변화를 관찰하며 도시 생활의 숨겨진 리듬을 발견하세요.",
  },
  {
    icon: "Layers",
    title: "3D 경관",
    description: "인구 밀도가 데이터 산맥처럼 솟아오르며, 시간대별 부드러운 보간으로 웨이브 같은 전환을 만들어냅니다.",
  },
  {
    icon: "Activity",
    title: "실시간 분석",
    description: "유동인구 데이터를 실시간으로 분석하여 지역별 인구 이동 패턴을 파악합니다.",
  },
]

const FloatingPopulationPage = () => {
  const [showVisualization, setShowVisualization] = useState(false)

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const handleEnterVisualization = () => {
    setShowVisualization(true)
  }

  return (
    <div>
      {!showVisualization ? (
        // Landing page with animated mesh background
        <div className="relative h-screen overflow-hidden">
          {/* Animated Mesh Background */}
          <div className="absolute inset-0">
            <AnimatedMeshBackground
              waveSpeed={0.3}
              waveAmplitude={25}
              waveFrequency={1.5}
              breathingSpeed={0.2}
              breathingScale={0.15}
              wireframe={true}
              opacity={0.25}
              color="#9F7AEA"
              targetFPS={60}
              resolution={30}
            />
          </div>
          
          {/* Gradient overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/70 via-purple-950/70 to-pink-950/70" />

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-8">
              <ResearchHeader
                title="유동인구"
                description="서울시 유동인구 실시간 분석을 통한 도시 동선 패턴 연구 및 시공간 시각화"
              />
              <button
                onClick={handleEnterVisualization}
                className="group relative px-8 py-4 bg-gradient-to-r from-indigo-800 to-purple-800 hover:from-indigo-900 hover:to-purple-900 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl"
              >
                <span className="flex items-center gap-3">
                  <span>Map Visualization</span>
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        // Visualization page
        <div className="relative h-screen">
          {/* Visualization Layer with Suspense */}
          <Suspense fallback={
            <div className="absolute inset-0 bg-black flex items-center justify-center">
              <div className="text-white">시각화 로딩 중...</div>
            </div>
          }>
            <FloatingPopDistrictMap />
          </Suspense>
        </div>
      )}

      <ResearchNavigation href="/research/eda" projectName="행정구역 데이터" />
    </div>
  )
}

export default FloatingPopulationPage