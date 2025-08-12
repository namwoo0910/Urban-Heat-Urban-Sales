"use client"

import CyberscapeScene from "@/components/project/cyberscape-scene"
import HexagonScene from "@/components/project/hexagon-scene"
import FeatureCard from "@/components/project/feature-card"
import ProjectHeader from "@/components/project/project-header"
import ProjectNavigation from "@/components/project/project-navigation"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Map, Layers, Zap } from "lucide-react"

const features = [
  {
    icon: "Cpu",
    title: "Procedural Generation",
    description: "A dynamic, ever-changing digital landscape generated in real-time using custom GLSL shaders.",
  },
  {
    icon: "Code",
    title: "Interactive Glitch Effects",
    description: "Mouse movements trigger visual distortions, simulating a fluctuating data stream.",
  },
  {
    icon: "Share2",
    title: "Optimized Performance",
    description: "High-performance rendering achieved by offloading complex calculations to the GPU.",
  },
  {
    icon: "Map",
    title: "3D Data Visualization",
    description: "Advanced hexagon layer visualization with Seoul geographic data and interactive controls.",
  },
]

type VisualizationMode = 'shader' | 'hexagon'

const ProjectCyberscapePage = () => {
  const [visualizationMode, setVisualizationMode] = useState<VisualizationMode>('shader')
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Handle smooth transitions between modes
  const handleModeSwitch = (newMode: VisualizationMode) => {
    if (newMode === visualizationMode) return
    
    console.log('[ProjectCyberscape] Switching visualization mode:', {
      from: visualizationMode,
      to: newMode
    })
    
    setIsTransitioning(true)
    
    // Small delay to allow current mode to cleanup
    setTimeout(() => {
      setVisualizationMode(newMode)
      setIsTransitioning(false)
      console.log('[ProjectCyberscape] Mode switch completed to:', newMode)
    }, 100)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup will be handled by individual scene components
    }
  }, [])

  return (
    <div>
      <div className="relative h-screen">
        {/* Visualization Layer */}
        {!isTransitioning && (
          visualizationMode === 'shader' ? <CyberscapeScene /> : <HexagonScene />
        )}
        
        {/* Loading overlay during transition */}
        {isTransitioning && (
          <div className="absolute inset-0 bg-black flex items-center justify-center">
            <div className="text-white">Switching visualization mode...</div>
          </div>
        )}
        
        {/* Mode Switch Controls */}
        <div className="absolute top-4 right-4 z-50">
          <div className="flex items-center space-x-2 bg-black/80 backdrop-blur-md rounded-lg border border-white/20 p-2">
            <Button
              variant={visualizationMode === 'shader' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleModeSwitch('shader')}
              disabled={isTransitioning}
              className="flex items-center space-x-1 text-white"
            >
              <Zap className="w-4 h-4" />
              <span>Shader</span>
            </Button>
            <Button
              variant={visualizationMode === 'hexagon' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleModeSwitch('hexagon')}
              disabled={isTransitioning}
              className="flex items-center space-x-1 text-white"
            >
              <Map className="w-4 h-4" />
              <span>Hexagon</span>
            </Button>
          </div>
        </div>
        
        {/* Project Header (only for shader mode) */}
        {visualizationMode === 'shader' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <ProjectHeader
              title="카드매출"
              description="카드매출 관련 상세 설명을 삽입할 예정입니다. (활용 데이터, 방법론 등)"
            />
          </div>
        )}
        
        {/* Mode indicator */}
        <div className="absolute bottom-4 right-4 z-40">
          <Badge variant="outline" className="bg-black/50 text-white border-white/20">
            {visualizationMode === 'shader' ? 'Shader Mode' : 'Hexagon Layer Mode'}
          </Badge>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-20 px-4">
        {/* Mode Description */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">
            {visualizationMode === 'shader' ? 'Shader-Based Visualization' : '3D Data Visualization'}
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            {visualizationMode === 'shader' 
              ? 'Experience real-time procedural generation with custom GLSL shaders and interactive visual effects.'
              : 'Explore Seoul geographic data through advanced 3D hexagon layers with dynamic animations and controls.'}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {visualizationMode === 'shader' 
            ? features.slice(0, 3).map((feature, index) => (
                <FeatureCard key={feature.title} {...feature} index={index} />
              ))
            : [features[3]].concat([
                {
                  icon: "Layers",
                  title: "Wave Animations",
                  description: "Dynamic wave effects that create mesmerizing data visualization patterns across the map.",
                },
                {
                  icon: "Palette",
                  title: "Premium Color Schemes",
                  description: "Sophisticated color palettes including hologram, aurora, and cyberpunk themes.",
                },
                {
                  icon: "RotateCw",
                  title: "360° Camera Rotation",
                  description: "Automated camera rotation for comprehensive viewing of the 3D data landscape.",
                }
              ]).map((feature, index) => (
                <FeatureCard key={feature.title} {...feature} index={index} />
              ))
          }
        </div>
      </div>

      <ProjectNavigation href="/portfolio/ethereal-threads" projectName="유동인구" />
    </div>
  )
}

export default ProjectCyberscapePage
