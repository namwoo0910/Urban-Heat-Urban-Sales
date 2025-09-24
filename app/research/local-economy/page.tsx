'use client'
import dynamic from 'next/dynamic'
import { useEffect } from 'react'

const CardSalesDistrictMap = dynamic(
  () => import('@/src/features/card-sales/components/CardSalesDistrictMap'),
  {
    ssr: false, // ✅ 클라이언트 전용
    loading: () => (
      <div className="absolute inset-0 bg-black flex items-center justify-center">
        <div className="text-white">시각화 로딩 중...</div>
      </div>
    ),
  }
)

export default function LocalEconomyPage() {
  useEffect(() => { window.scrollTo(0, 0) }, [])
  return (
    <div className="relative h-screen">
      <CardSalesDistrictMap />
    </div>
  )
}