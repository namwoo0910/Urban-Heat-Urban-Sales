"use client"

import { lazy, Suspense } from "react"
import { useEffect } from "react"

// Dynamic imports for better performance - using PredictionPageWrapper for split-screen mode
const PredictionPageWrapper = lazy(() => import("@/src/features/card-sales/components/PredictionPageWrapper"))

const PredictionPage = () => {
  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="relative h-screen">
      {/* Visualization Layer with Suspense - starts in AI prediction split-screen mode */}
      <Suspense fallback={
        <div className="absolute inset-0 bg-black flex items-center justify-center">
          <div className="text-white">AI 예측 시뮬레이션 로딩 중...</div>
        </div>
      }>
        <PredictionPageWrapper />
      </Suspense>
    </div>
  )
}

export default PredictionPage