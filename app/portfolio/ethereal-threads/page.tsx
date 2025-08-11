"use client"
import { useRouter } from "next/navigation"
import FeatureCard from "@/components/project/feature-card"
import ProjectHeader from "@/components/project/project-header"
import ProjectNavigation from "@/components/project/project-navigation"

const features = [
  {
    icon: "Map",
    title: "Urban Pulse",
    description: "Real-time visualization of Seoul's population density flowing across 3,380 city grids throughout 24 hours.",
  },
  {
    icon: "RotateCw",
    title: "Temporal Flow",
    description:
      "Watch the city breathe as population patterns shift from dawn to dusk, revealing the hidden rhythms of urban life.",
  },
  {
    icon: "Layers",
    title: "3D Landscape",
    description: "Population density rises like ethereal mountains, with smooth interpolation creating wave-like transitions between time periods.",
  },
]

const EtherealThreadsPage = () => {
  const router = useRouter()

  const handleEnterVisualization = () => {
    router.push('/urbanmountain')
  }

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
                      height: `${Math.random() * 40 + 10}px`
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-8">
            <ProjectHeader
              title="Ethereal Threads"
              description="A living visualization of Seoul's urban pulse - watch as population flows through the city like ethereal threads, creating mesmerizing patterns that reveal the hidden rhythms of metropolitan life."
            />
            <button
              onClick={handleEnterVisualization}
              className="group relative px-8 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl"
            >
              <span className="flex items-center gap-3">
                <span>Enter 3D Visualization</span>
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

      <ProjectNavigation href="/portfolio/quantum-leap" projectName="Quantum Leap" />
    </div>
  )
}

export default EtherealThreadsPage
