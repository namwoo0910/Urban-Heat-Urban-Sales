"use client"

import { lazy, Suspense } from "react"
import FeatureCard from "@/components/research/feature-card"
import ResearchHeader from "@/components/research/research-header"
import ResearchNavigation from "@/components/research/research-navigation"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Map, Layers, Zap } from "lucide-react"

// Dynamic imports for better performance
const HexagonScene = lazy(() => import("@/components/project/hexagon-scene"))

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
        // Landing page with gradient background
        <div className="relative h-screen bg-gradient-to-br from-emerald-950 via-teal-950 to-cyan-950">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-30">
            <div className="w-full h-full bg-gradient-to-t from-black/50 to-transparent">
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="grid grid-cols-10 gap-3 opacity-20">
                  {[...Array(80)].map((_, i) => (
                    <div 
                      key={i} 
                      className="w-4 h-4 bg-white rounded-full animate-pulse"
                      style={{ 
                        animationDelay: `${i * 0.05}s`,
                        transform: `scale(${0.5 + Math.random() * 0.5})`
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

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
            <HexagonScene />
          </Suspense>
        </div>
      )}


      <ResearchNavigation href="/research/floating-population" projectName="유동인구" />
    </div>
  )
}

export default LocalEconomyPage