import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '서울 인구 3D 시각화 | Urban Mountain',
  description: 'Seoul population density 3D visualization with temporal flow analysis',
}

export default function UrbanMountainPage() {
  return (
    <div className="w-full h-screen">
      <iframe 
        src="/urbanmountain/urbanmountain.html"
        className="w-full h-full border-none"
        title="Urban Mountain - Seoul Population 3D Visualization"
        allow="geolocation"
      />
    </div>
  )
}