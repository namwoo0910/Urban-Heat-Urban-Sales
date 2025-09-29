"use client"

import { lazy, Suspense } from "react"
import { useEffect } from "react"
import { useTranslation } from "@/src/shared/hooks/useTranslation"

// Dynamic import for better performance
const EDADistrictMap = lazy(() => import("@/src/features/eda/components/EDADistrictMap"))

const EDAPage = () => {
  const { t } = useTranslation()

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="relative h-screen">
      {/* Visualization Layer with Suspense */}
      <Suspense fallback={
        <div className="absolute inset-0 bg-gray-50 flex items-center justify-center">
          <div className="text-gray-700">{t('loading.loadingMapVisualization')}</div>
        </div>
      }>
        <EDADistrictMap />
      </Suspense>
    </div>
  )
}

export default EDAPage
