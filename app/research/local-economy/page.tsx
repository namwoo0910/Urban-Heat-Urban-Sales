// app/research/local-economy/page.tsx
'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    __lastVideoCmd?: { cmd: 'play' | 'pause'; src?: string; ts: number }
  }
}

const CardSalesDistrictMap = dynamic(
  () => import('@/src/features/card-sales/components/CardSalesDistrictMap'),
  { ssr: false }
)


export default function LocalEconomyPage() {
  useEffect(() => { window.scrollTo(0, 0) }, [])
  return (
    <div className="relative min-h-screen bg-black">
      <CardSalesDistrictMap remote />
    </div>
  )
}
