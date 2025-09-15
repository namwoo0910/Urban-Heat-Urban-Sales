"use client"

import { lazy, Suspense } from "react"
import dynamic from "next/dynamic"
import FeatureCard from "@/src/features/data-portal/components/DataFeatureCard"
import ResearchHeader from "@/src/features/data-portal/components/ResearchHeader"
import { useState, useEffect } from "react"
import { Button } from "@/src/shared/components/ui/button"
import { Badge } from "@/src/shared/components/ui/badge"
import { Map, Layers, Zap } from "lucide-react"

// Dynamic imports for better performance
const CardSalesDistrictMap = lazy(() => import("@/src/features/card-sales/components/CardSalesDistrictMap"))

// Dynamic import for animated mesh background
const AnimatedMeshBackground = dynamic(
  () => import("@/src/features/card-sales/components/AnimatedMeshBackground"),
  { 
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-teal-950 to-cyan-950" />
    )
  }
)

const features = [
  {
    icon: "TrendingUp",
    title: "실시간 매출 분석",
    description: "서울시 카드매출 데이터를 실시간으로 분석하여 지역경제 동향을 파악합니다.",
  },
  {
    icon: "MapPin",
    title: "지역별 경제 현황",
    description: "구별, 동별 카드매출 패턴을 통해 지역경제 활성화 정도를 시각화합니다.",
  },
  {
    icon: "BarChart3",
    title: "시계열 분석",
    description: "시간대별, 요일별, 계절별 매출 변화 패턴을 분석하여 인사이트를 도출합니다.",
  },
  {
    icon: "Map",
    title: "3D 데이터 시각화",
    description: "서울시 지리 데이터와 매출 정보를 결합한 고급 3D 헥사곤 레이어 시각화입니다.",
  },
]

const LocalEconomyPage = () => {
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
              color="#00FFE1"
              targetFPS={60}
              resolution={30}
            />
          </div>
          
          {/* Gradient overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/70 via-teal-950/70 to-cyan-950/70" />

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-8">
              <ResearchHeader
                title="카드매출"
                description="서울시 카드매출 데이터 분석을 통한 지역경제 현황 파악 및 트렌드 분석 연구"
              />
              <button
                onClick={handleEnterVisualization}
                className="group relative px-8 py-4 bg-gradient-to-r from-emerald-800 to-teal-800 hover:from-emerald-900 hover:to-teal-900 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl"
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
            <CardSalesDistrictMap />
          </Suspense>
        </div>
      )}


    </div>
  )
}

export default LocalEconomyPage