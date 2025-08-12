'use client'

import dynamic from 'next/dynamic'

// Dynamically import the complete UrbanMountain component to avoid SSR issues with Mapbox
const UrbanMountainComplete = dynamic(
  () => import('@/components/urbanmountain-complete').then(mod => mod.UrbanMountainComplete),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-screen flex items-center justify-center bg-black">
        <div className="text-center text-white">
          <div className="w-16 h-16 border-4 border-white border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <div>Loading Urban Mountain Visualization...</div>
        </div>
      </div>
    )
  }
)

export default function UrbanMountainPage() {
  return (
    <div className="w-full h-screen">
      <UrbanMountainComplete className="w-full h-full" />
    </div>
  )
}