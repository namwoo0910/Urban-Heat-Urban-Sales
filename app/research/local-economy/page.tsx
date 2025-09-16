"use client"

import { lazy, Suspense } from "react"
import { useEffect } from "react"

// Dynamic imports for better performance
const CardSalesDistrictMap = lazy(() => import("@/src/features/card-sales/components/CardSalesDistrictMap"))

const LocalEconomyPage = () => {
  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="relative h-screen">
      {/* Visualization Layer with Suspense */}
      <Suspense fallback={
        <div className="absolute inset-0 bg-black flex items-center justify-center">
          <div className="text-white">시각화 로딩 중...</div>
        </div>
      }>
        <CardSalesDistrictMap />
      </Suspense>
    </div>
  )
}

export default LocalEconomyPage
