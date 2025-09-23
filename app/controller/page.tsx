// app/controller/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWS } from '@shared/hooks/useWS'

export default function ControllerPage() {
  const [last, setLast] = useState('idle')
  const router = useRouter()
  const { sendAction, isConnected, status } = useWS({
    role: 'controller',
    room: 'main',
    onAction: () => {},
  })

  const handleExplore = () => {
    const ok = sendAction('explore')
    setLast(ok ? 'explore' : 'explore (queued)')
  }

  const handleViewAnalytics = () => {
    const ok = sendAction('view-analytics')
    setLast(ok ? 'view-analytics' : 'view-analytics (queued)')
    router.push('/research-section')               // ← iPad도 이동
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-6 p-8">
      {/* 상태표시 생략 가능 */}
      <div className="flex flex-col gap-4 w-full max-w-md">
        <button onClick={handleExplore} className="py-4 px-6 rounded-2xl bg-white text-black font-semibold">
          Explore Seoul
        </button>
        <button onClick={handleViewAnalytics} className="py-4 px-6 rounded-2xl bg-white/10 border border-white/20 font-semibold">
          View Analytics
        </button>
      </div>
      <p className="text-sm opacity-60">Last: {last}</p>
    </div>
  )
}
