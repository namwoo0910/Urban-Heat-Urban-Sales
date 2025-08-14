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
const LocalEconomyScene = lazy(() => import("@/components/research/local-economy-scene"))
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

type VisualizationMode = 'analysis' | 'hexagon'

const LocalEconomyPage = () => {
  const [visualizationMode, setVisualizationMode] = useState<VisualizationMode>('analysis')
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [showVisualization, setShowVisualization] = useState(false)

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // Handle smooth transitions between modes with proper cleanup
  const handleModeSwitch = (newMode: VisualizationMode) => {
    if (newMode === visualizationMode) return
    
    setIsTransitioning(true)
    
    // Longer delay to allow proper component cleanup and memory release
    setTimeout(() => {
      setVisualizationMode(newMode)
      
      // Force garbage collection (if available) after component switch
      if (window.gc) {
        setTimeout(() => window.gc(), 100)
      }
      
      setIsTransitioning(false)
    }, 150)
  }

  const handleEnterVisualization = () => {
    setVisualizationMode('hexagon')  // Set to hexagon mode directly
    setShowVisualization(true)
  }


  return (
    <div>
      {!showVisualization ? (
        // Landing page with gradient background
        <div className="relative h-screen bg-gradient-to-br from-green-900 via-teal-900 to-cyan-900">
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
                className="group relative px-8 py-4 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl"
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
          {!isTransitioning && (
            <Suspense fallback={
              <div className="absolute inset-0 bg-black flex items-center justify-center">
                <div className="text-white">시각화 로딩 중...</div>
              </div>
            }>
              {visualizationMode === 'analysis' ? <LocalEconomyScene /> : <HexagonScene />}
            </Suspense>
          )}
          
          {/* Loading overlay during transition */}
          {isTransitioning && (
            <div className="absolute inset-0 bg-black flex items-center justify-center">
              <div className="text-white">시각화 모드 전환 중...</div>
            </div>
          )}
          
          {/* Mode Switch Controls */}
          <div className="absolute top-4 right-4 z-50">
            <div className="flex items-center space-x-2 bg-black/80 backdrop-blur-md rounded-lg border border-white/20 p-2">
              <Button
                variant={visualizationMode === 'analysis' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleModeSwitch('analysis')}
                disabled={isTransitioning}
                className="flex items-center space-x-1 text-white"
              >
                <Zap className="w-4 h-4" />
                <span>분석</span>
              </Button>
              <Button
                variant={visualizationMode === 'hexagon' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleModeSwitch('hexagon')}
                disabled={isTransitioning}
                className="flex items-center space-x-1 text-white"
              >
                <Map className="w-4 h-4" />
                <span>헥사곤</span>
              </Button>
            </div>
          </div>
          
          {/* Research Header (only for analysis mode) */}
          {visualizationMode === 'analysis' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <ResearchHeader
                title="카드매출"
                description="서울시 카드매출 데이터 분석을 통한 지역경제 현황 파악 및 트렌드 분석 연구"
              />
            </div>
          )}
          
          {/* Mode indicator */}
          <div className="absolute bottom-4 right-4 z-40">
            <Badge variant="outline" className="bg-black/50 text-white border-white/20">
              {visualizationMode === 'analysis' ? '분석 모드' : '헥사곤 레이어 모드'}
            </Badge>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto py-20 px-4">
        {/* Mode Description */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">
            {visualizationMode === 'analysis' ? '지역경제 분석 시각화' : '3D 데이터 시각화'}
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            {visualizationMode === 'analysis' 
              ? '서울시 카드매출 데이터를 활용한 실시간 지역경제 분석 및 트렌드 시각화를 제공합니다.'
              : '서울시 지리 데이터와 결합된 고급 3D 헥사곤 레이어로 동적 애니메이션과 제어 기능을 탐색하세요.'}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {visualizationMode === 'analysis' 
            ? features.slice(0, 3).map((feature, index) => (
                <FeatureCard key={feature.title} {...feature} index={index} />
              ))
            : [features[3]].concat([
                {
                  icon: "Layers",
                  title: "웨이브 애니메이션",
                  description: "지도 전체에 걸쳐 매혹적인 데이터 시각화 패턴을 만드는 동적 웨이브 효과입니다.",
                },
                {
                  icon: "Palette",
                  title: "프리미엄 색상 테마",
                  description: "홀로그램, 오로라, 사이버펑크 테마를 포함한 정교한 색상 팔레트를 제공합니다.",
                },
                {
                  icon: "RotateCw",
                  title: "360° 카메라 회전",
                  description: "3D 데이터 경관의 포괄적인 시야를 위한 자동 카메라 회전 기능입니다.",
                }
              ]).map((feature, index) => (
                <FeatureCard key={feature.title} {...feature} index={index} />
              ))
          }
        </div>
      </div>

      <ResearchNavigation href="/research/floating-population" projectName="유동인구" />
    </div>
  )
}

export default LocalEconomyPage