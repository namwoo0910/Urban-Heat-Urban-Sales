"use client"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import FeatureCard from "@/components/research/feature-card"
import ResearchHeader from "@/components/research/research-header"
import ResearchNavigation from "@/components/research/research-navigation"

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
]

const FloatingPopulationPage = () => {
  const router = useRouter()
  const [barHeights, setBarHeights] = useState<number[]>([])

  const handleEnterVisualization = () => {
    router.push('/urbanmountain')
  }

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // Generate random heights client-side only to prevent hydration mismatch
  useEffect(() => {
    const heights = Array.from({ length: 144 }, () => Math.random() * 40 + 10)
    setBarHeights(heights)
  }, [])

  return (
    <div>
      <div className="relative h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        {/* Background Preview */}
        <div className="absolute inset-0 opacity-30">
          <div className="w-full h-full bg-gradient-to-t from-black/50 to-transparent">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="grid grid-cols-12 gap-2 opacity-20">
                {[...Array(144)].map((_, i) => (
                  <div 
                    key={i} 
                    className="w-3 h-8 bg-white rounded-sm animate-pulse"
                    style={{ 
                      animationDelay: `${i * 0.1}s`,
                      height: barHeights[i] ? `${barHeights[i]}px` : '20px'
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
              title="유동인구"
              description="서울시 유동인구 실시간 분석을 통한 도시 동선 패턴 연구 및 시공간 시각화"
            />
            <button
              onClick={handleEnterVisualization}
              className="group relative px-8 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl"
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

      <div className="max-w-7xl mx-auto py-20 px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} {...feature} index={index} />
          ))}
        </div>
      </div>

      <ResearchNavigation href="/research/eda" projectName="행정구역 데이터" />
    </div>
  )
}

export default FloatingPopulationPage