'use client'

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import FeatureCard from "@/src/features/data-portal/components/DataFeatureCard"
import ResearchHeader from "@/src/features/data-portal/components/ResearchHeader"

const features = [
  {
    icon: "BarChart3",
    title: "서울시",
    description: "2,500만 인구가 만들어내는 데이터 패턴은 어떤 모습일까?",
  },
  {
    icon: "TrendingUp",
    title: "자치구",
    description: "강남과 강북, 25개 자치구의 숨겨진 차이는 무엇일까?",
  },
  {
    icon: "Infinity",
    title: "행정동",
    description: "426개 행정동이 그려내는 서울의 진짜 모습은?",
  },
]

const EDAPage = () => {
  const router = useRouter()

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const handleEnterVisualization = () => {
    // Visualization page has been removed
    // router.push('/eda-visualization')
  }

  return (
    <div>
      {/* Hero Section with Integrated Features */}
      <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-zinc-900">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="w-full h-full bg-gradient-to-t from-black/50 to-transparent">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="grid grid-cols-8 gap-4 opacity-20">
                {[...Array(64)].map((_, i) => (
                  <div 
                    key={i} 
                    className="w-6 h-6 bg-white rounded-lg animate-pulse"
                    style={{ 
                      animationDelay: `${i * 0.03}s`,
                      transform: `rotate(${Math.random() * 45}deg) scale(${0.6 + Math.random() * 0.4})`
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-20">
          <div className="text-center space-y-8 max-w-6xl mx-auto">
            <ResearchHeader
              title="행정구역 데이터"
              description="탐색적 데이터 분석을 통한 서울시 데이터 패턴 발굴 및 시각적 인사이트 도출 연구"
            />
            
            {/* Integrated Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 mb-12">
              {features.map((feature, index) => (
                <div 
                  key={feature.title}
                  className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 transform hover:scale-105 transition-all duration-300"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
            
            {/* Visualization button removed - page no longer available */}
          </div>
        </div>
      </div>

    </div>
  )
}

export default EDAPage