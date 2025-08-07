"use client"

import dynamic from "next/dynamic"

// SSR 비활성화 - Mapbox와 deck.gl은 브라우저에서만 작동
const SeoulMapDeckGL = dynamic(
  () => import("@/components/seoul-map-deckgl").then((mod) => mod.SeoulMapDeckGL),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>deck.gl 레이어 로딩 중...</p>
        </div>
      </div>
    )
  }
)

export default function TestDeckGLPage() {
  return (
    <div className="w-full h-screen">
      <SeoulMapDeckGL />
    </div>
  )
}