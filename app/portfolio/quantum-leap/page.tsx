'use client'

import { useRouter } from "next/navigation"
import QuantumScene from "@/components/project/quantum-scene"
import FeatureCard from "@/components/project/feature-card"
import ProjectHeader from "@/components/project/project-header"
import ProjectNavigation from "@/components/project/project-navigation"

const features = [
  {
    icon: "Atom",
    title: "Particle Physics",
    description:
      "A GPU-accelerated particle system simulating quantum foam, with millions of points rendered in real-time.",
  },
  {
    icon: "Zap",
    title: "Interactive Field",
    description:
      "Your cursor acts as a gravitational force, warping the particle field and creating dynamic visual effects.",
  },
  {
    icon: "Infinity",
    title: "Endless Possibilities",
    description:
      "The simulation is non-deterministic, ensuring that every interaction creates a unique and unrepeatable pattern.",
  },
]

const QuantumLeapPage = () => {
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
            <ProjectHeader
              title="EDA"
              description="EDA 관련 상세 설명을 삽입할 예정입니다. (활용 데이터, 방법론 등)"
            />
            <button
              onClick={handleEnterVisualization}
              className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl"
            >
              <span className="flex items-center gap-3">
                <span>Enter EDA Visualization</span>
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

      <ProjectNavigation href="/portfolio/project-cyberscape" projectName="카드매출" />
    </div>
  )
}

export default QuantumLeapPage
