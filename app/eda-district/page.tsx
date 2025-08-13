'use client'

import dynamic from 'next/dynamic'

// Dynamically import the EDA District Select component to avoid SSR issues with Mapbox
const EdaDistrictSelect = dynamic(
  () => import('@/components/eda-district-select'),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center text-white">
          <div className="w-16 h-16 border-4 border-white border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <div>Loading District Selection...</div>
        </div>
      </div>
    )
  }
)

export default function EdaDistrictPage() {
  return (
    <div className="w-full h-screen">
      <EdaDistrictSelect />
    </div>
  )
}