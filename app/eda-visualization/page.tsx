'use client'

import dynamic from 'next/dynamic'

// Dynamically import the optimized EDA component to avoid SSR issues with Mapbox
const EdaCombined = dynamic(
  () => import('@/components/eda-combined-optimized'),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center text-white">
          <div className="w-16 h-16 border-4 border-white border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <div>Loading EDA Visualization...</div>
        </div>
      </div>
    )
  }
)

export default function EdaVisualizationPage() {
  return (
    <div className="w-full h-screen">
      <EdaCombined />
    </div>
  )
}