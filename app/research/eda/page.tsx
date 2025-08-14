'use client'

import { useRouter } from "next/navigation"
import QuantumScene from "@/components/project/quantum-scene"
import FeatureCard from "@/components/research/feature-card"
import ResearchHeader from "@/components/research/research-header"
import ResearchNavigation from "@/components/research/research-navigation"

const features = [
  {
    icon: "BarChart3",
    title: "탐색적 데이터 분석",
    description: "서울시 데이터의 숨겨진 패턴과 인사이트를 발굴하는 GPU 가속 데이터 시각화 시스템입니다.",
  },
  {
    icon: "TrendingUp",
    title: "인터랙티브 분석",
    description: "마우스 상호작용을 통해 데이터 필드를 실시간으로 탐색하고 동적 시각 효과를 생성합니다.",
  },
  {
    icon: "Infinity",
    title: "무한한 가능성",
    description: "비결정적 시뮬레이션으로 모든 상호작용이 고유하고 반복되지 않는 패턴을 만들어냅니다.",
  },
]

const EDAPage = () => {
  const router = useRouter()

  const handleEnterVisualization = () => {
    router.push('/eda-visualization')
  }

  return (
    <div>
      <div className="relative h-screen">
        <QuantumScene />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-8">
            <ResearchHeader
              title="EDA"
              description="탐색적 데이터 분석을 통한 서울시 데이터 패턴 발굴 및 시각적 인사이트 도출 연구"
            />
            <button
              onClick={handleEnterVisualization}
              className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl"
            >
              <span className="flex items-center gap-3">
                <span>EDA 시각화 진입</span>
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

      <ResearchNavigation href="/research/local-economy" projectName="Local_economy" />
    </div>
  )
}

export default EDAPage