// app/controller/page.tsx
'use client'

import dynamic from 'next/dynamic'
import React, { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useWS } from '@shared/hooks/useWS'
import EDADistrictMap from '@/src/features/eda/components/EDADistrictMap'
import CardsalesPanel from '@/src/features/controller/CardsalesPanel'
import AIPredictionPanel from '@/src/features/controller/AIPredictionPanel'

// Research 섹션 (named export: Research)
const Research = dynamic(
  () =>
    import('@/src/features/data-portal/components/ResearchSection').then(
      (m) => m.Research
    ),
  { ssr: true, loading: () => <div className="p-6">Loading…</div> }
)

type Panel = null | 'local-economy' | 'eda' | 'ai-prediction'

export default function ControllerPage() {
  const router = useRouter()
  const sp = useSearchParams()
  const isOpen = sp.get('modal') === 'research'
  const panel = (sp.get('panel') as Panel) ?? null

  // State to track if exploration has been triggered
  const [hasExplored, setHasExplored] = useState(false)

  const { sendAction, isConnected, status } = useWS({
    role: 'controller',
    room: 'main',
    onAction: () => {},
  })

  const handleExplore = useCallback(() => {
    sendAction('explore')
    setHasExplored(true)
  }, [sendAction])

  const openOverlay = useCallback(() => {
    const next = new URLSearchParams(sp)
    next.set('modal', 'research')
    next.delete('panel')
    router.push(`/controller?${next.toString()}`)
  }, [router, sp])

  const openLocalEconomyPanel = useCallback(() => {
    const next = new URLSearchParams(sp)
    next.set('modal', 'research')
    next.set('panel', 'local-economy')
    router.push(`/controller?${next.toString()}`)
  }, [router, sp])

  const openAIPredictionPanel = useCallback(() => {
    const next = new URLSearchParams(sp)
    next.set('modal', 'research')
    next.set('panel', 'ai-prediction')
    router.push(`/controller?${next.toString()}`)
  }, [router, sp])

  const closeOverlay = useCallback(() => {
    const next = new URLSearchParams(sp)
    next.delete('modal')
    next.delete('panel')
    router.push(`/controller?${next.toString()}`)
  }, [router, sp])

  // Research 카드 클릭을 가로채 Display만 네비게이션
  const onOverlayClickCapture: React.MouseEventHandler<HTMLDivElement> = (e) => {
    const a = (e.target as HTMLElement).closest('a[href^="/research/"]') as
      | HTMLAnchorElement
      | null
    if (!a) return
    e.preventDefault()
    e.stopPropagation()
    const path = a.getAttribute('href') || ''
    if (!path) return
    if (path === '/research/local-economy') {
      // Only open controller panel, don't navigate display until "Card Sales Visualization" is clicked
      openLocalEconomyPanel()
    } else if (path === '/research/prediction') {
      // Open AI prediction controller panel
      openAIPredictionPanel()
    } else {
      // For other paths (like EDA), navigate display immediately
      sendAction(`display:navigate:${path}`)
      closeOverlay()
    }
    if (path === '/research/eda') {
      const next = new URLSearchParams(sp)
      next.set('modal', 'research')
      next.set('panel', 'eda')       // 👈 컨트롤러에 EDA 패널 오픈
      router.push(`/controller?${next.toString()}`)
    }
  }


  // ESC로 오버레이 닫기 + 스크롤 잠금
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => (e.key === 'Escape' ? closeOverlay() : undefined)
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [isOpen, closeOverlay])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 text-white">
      {/* Main controller content - only show when modal is closed */}
      {!isOpen && (
        <div className="flex flex-col items-center justify-center gap-8 p-8 min-h-screen">
          <div className="text-center mb-4">
            <h1 className="text-8xl font-bold mb-4 text-white">
              Control and navigate data visualizations
            </h1>

          </div>

          <div className="flex flex-col gap-4 w-full max-w-md">
            {!hasExplored && (
              <button
                onClick={handleExplore}
                className="text-4xl group py-4 px-8 rounded-2xl bg-gradient-to-r from-slate-700/80 to-slate-600/80 hover:from-cyan-600/80 hover:to-blue-600/80 text-white font-semibold transition-all duration-300 border border-white/10 backdrop-blur-sm transform hover:scale-105 shadow-lg hover:shadow-cyan-500/20"
              >
                <span className="flex items-center justify-center gap-3">
                  <span>🚀</span>
                  <span>Explore Seoul</span>
                </span>
              </button>
            )}
            {hasExplored && (
              <button
                onClick={openOverlay}
                className="text-4xl group py-4 px-8 rounded-2xl bg-gradient-to-r from-slate-700/80 to-slate-600/80 hover:from-purple-600/80 hover:to-pink-600/80 text-white font-semibold transition-all duration-300 border border-white/10 backdrop-blur-sm transform hover:scale-105 shadow-lg hover:shadow-purple-500/20"
              >
                <span className="flex items-center justify-center gap-3">
                  <span>📊</span>
                  <span>View Analytics</span>
                </span>
              </button>
            )}
          </div>

          <div className="text-xs opacity-60 mt-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-white/10">
            WS: {isConnected ? '🟢 connected' : '🔴 disconnected'} ({status})
          </div>
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-[100]">
          <div className="absolute inset-0 flex flex-col">
            <div className="flex items-center gap-6 p-8 border-b border-white/10">
              <button
                onClick={closeOverlay}
                className="group px-5 py-3 rounded-2xl bg-gradient-to-r from-slate-700/80 to-slate-600/80 hover:from-purple-600/80 hover:to-pink-600/80 transition-all duration-300 border border-white/10 backdrop-blur-sm transform hover:scale-105"
              >
                <span className="flex items-center gap-2 text-white font-medium">
                  <span>←</span>
                  <span>돌아가기</span>
                </span>
              </button>
              <h2 className="text-3xl font-bold text-white">
                {panel === 'local-economy' ? '🎯 Local Economy Controls' :
                 panel === 'eda' ? '🗺️ EDA Controls' :
                 panel === 'ai-prediction' ? '🤖 AI Prediction Controls' :
                 '🔬 Research Dashboard'}
              </h2>
            </div>

            {!panel && (
              <div
                className="flex-1 overflow-y-auto"
                onClickCapture={onOverlayClickCapture}
              >
                <Research />
              </div>
            )}
            {panel === 'eda' && (
              <div className="flex-1 p-8">
                <div className="bg-gradient-to-br from-slate-800/60 to-purple-900/40 rounded-3xl p-8 border border-purple-500/20 backdrop-blur-xl shadow-2xl">
                  <h3 className="text-2xl font-bold mb-6 text-white flex items-center gap-3">
                    <span>🗺️</span>
                    <span>EDA – District Selection</span>
                  </h3>
                  <div className="rounded-2xl overflow-hidden border border-white/10 shadow-lg bg-white">
                    <div className="w-full h-96 relative">
                      <EDADistrictMap
                        role="controller"
                        interactive
                        showChartPanel={false}
                        onRegionClick={(sel) => {
                          // 1) 디스플레이로 EDA 페이지 보장
                          sendAction('display:navigate:/research/eda?noIntro=1')
                          // 2) 선택 브로드캐스트(이름도 함께 보내주면 디스플레이가 매핑 없이 바로 반영)
                          const payload = `display:eda:select:${sel.level}:${sel.code}:${encodeURIComponent(sel.name ?? '')}`
                          sendAction(payload)
                        }}
                      />
                    </div>
                  </div>
                  <div className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20">
                    <p className="text-sm text-slate-300 text-center">
                      💡 Click on any district to analyze specific regional data
                    </p>
                  </div>
                </div>
              </div>
            )}
            {panel === 'local-economy' && (
              <div className="flex-1 p-8">
                <div className="max-w-4xl mx-auto">
                  <CardsalesPanel
                    wsStatus={status}
                    sendAction={sendAction}
                  />
                </div>
              </div>
            )}
            {panel === 'ai-prediction' && (
              <div className="flex-1 p-8">
                <div className="max-w-4xl mx-auto">
                  <AIPredictionPanel
                    wsStatus={status}
                    sendAction={sendAction}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
