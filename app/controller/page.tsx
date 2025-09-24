// app/controller/page.tsx
'use client'

import dynamic from 'next/dynamic'
import React, { useEffect, useCallback, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useWS } from '@shared/hooks/useWS'

// Research 섹션 (named export)
const Research = dynamic(
  () =>
    import('@/src/features/data-portal/components/ResearchSection').then(
      (m) => m.Research
    ),
  { ssr: true, loading: () => <div className="p-6">Loading…</div> }
)

// 로컬 이코노미 컨트롤 패널 UI (기존 컨트롤 컴포넌트 재사용)
const UnifiedControls = dynamic(
  () => import('@/src/features/card-sales/components/SalesDataControls'),
  { ssr: false, loading: () => <div className="p-4">Controls loading…</div> }
)

export default function ControllerPage() {
  const router = useRouter()
  const sp = useSearchParams()
  const isOpen = sp.get('modal') === 'research'
  const panel = (sp.get('panel') as null | 'local-economy' | 'eda') ?? null

  const { sendAction, isConnected, status } = useWS({
    role: 'controller',
    room: 'main',
    onAction: (action) => {
      // (선택) 디스플레이가 보낸 상태 동기화 ACK 수신
      if (action.startsWith('controller:state:local-economy:')) {
        try {
          const json = action.split(':').slice(3).join(':')
          const s = JSON.parse(json)
          if (typeof s.totalDays === 'number') setTotalDays(s.totalDays)
          if (typeof s.dayIndex === 'number') setDayIndex(s.dayIndex)
        } catch {}
      }
    },
    // url: 'ws://localhost:3001/ws', // 필요 시 명시
  })

  // === 상단 버튼 ===
  const handleExplore = useCallback(() => {
    const ok = sendAction('explore')
    console.log('[Controller] explore send', ok)
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
    next.set('panel', 'local-economy') // ✅ 패널 모드 진입
    router.push(`/controller?${next.toString()}`)
  }, [router, sp])

  const closeOverlay = useCallback(() => {
    const next = new URLSearchParams(sp)
    next.delete('modal')
    next.delete('panel')
    router.push(`/controller?${next.toString()}`)
  }, [router, sp])

  // ESC 닫기 + 배경 스크롤 잠금
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

  // (공통) 디스플레이로 패치 보냄
  const sendPatch = (patch: Record<string, any>) => {
    const msg = `viz:local-economy:update:${JSON.stringify(patch)}`
    const ok = sendAction(msg)
    console.log('[Controller] patch', patch, ok)
  }

  // ===== 원격 컨트롤용 로컬 상태 (컨트롤러에만 보임) =====
  const [timelineMode, setTimelineMode] = useState<'monthly' | 'daily'>('daily')
  const [playing, setPlaying] = useState(false)
  const [dayIndex, setDayIndex] = useState(0)
  const [totalDays, setTotalDays] = useState(31)
  const [selectedMeshMonth, setSelectedMeshMonth] = useState(1)
  const [useTempColor, setUseTempColor] = useState(true)

  // Research 내부 <a href="/research/..."> 클릭을 컨트롤러에서 차단하고
  // 디스플레이로만 네비게이션 → local-economy면 패널로 전환
  const onOverlayClickCapture: React.MouseEventHandler<HTMLDivElement> = (e) => {
    const a = (e.target as HTMLElement).closest('a[href^="/research/"]') as HTMLAnchorElement | null
    if (!a) return

    e.preventDefault()
    e.stopPropagation()
    ;(e as any).nativeEvent?.stopImmediatePropagation?.()

    const path = a.getAttribute('href') || ''
    if (!path) return
    if (!isConnected) {
      console.warn('[Controller] WS not open')
      return
    }

    const ok = sendAction(`display:navigate:${path}`)
    console.log('[Controller] navigate send', path, ok)
    if (!ok) return

    if (path === '/research/local-economy') {
      // ✅ 닫지 말고 패널로 전환
      openLocalEconomyPanel()
    } else {
      // EDA 등은 패널 없으면 그냥 닫기
      closeOverlay()
    }
  }

  const onOverlayKeyDownCapture: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    const key = e.key.toLowerCase()
    if (key !== 'enter' && key !== ' ') return
    const a = (e.target as HTMLElement).closest('a[href^="/research/"]')
    if (!a) return
    e.preventDefault()
    e.stopPropagation()
    ;(e as any).nativeEvent?.stopImmediatePropagation?.()
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-6 p-8">
      <div className="flex flex-col gap-4 w-full max-w-md">
        <button
          onClick={handleExplore}
          className="py-4 px-6 rounded-2xl bg-white text-black font-semibold"
        >
          Explore Seoul
        </button>

        <button
          onClick={openOverlay}
          className="py-4 px-6 rounded-2xl bg-white/10 border border-white/20 font-semibold"
        >
          View Analytics
        </button>
      </div>

      <div className="text-xs opacity-60 mt-2">
        WS: {isConnected ? 'connected' : 'disconnected'} ({status})
      </div>

      {/* === 풀스크린 오버레이 === */}
      {isOpen && (
        <div className="fixed inset-0 z-[100]">
          <div className="absolute inset-0 bg-black" />
          <div className="absolute inset-0 flex flex-col">
            <div className="flex items-center gap-3 p-4 border-b border-white/10 bg-[#0f0f10]">
              <button
                onClick={closeOverlay}
                className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20"
              >
                ← 돌아가기
              </button>
              <h2 className="text-lg font-semibold">
                {panel === 'local-economy' ? 'Local Economy – Remote Controls' : 'Research'}
              </h2>
            </div>

            {/* 패널이 없으면: 카드 목록(Research) */}
            {!panel && (
              <div
                className="flex-1 overflow-y-auto bg-[#0f0f10]"
                onClickCapture={onOverlayClickCapture}
                onKeyDownCapture={onOverlayKeyDownCapture}
              >
                <Research />
              </div>
            )}

            {/* 패널이 local-economy면: 컨트롤러 전용 컨트롤 UI */}
            {panel === 'local-economy' && (
              <div className="flex-1 overflow-y-auto bg-[#0f0f10] relative">
                <div className="p-4 border-b border-white/10 sticky top-0 bg-[#0f0f10] z-10">
                  <p className="text-sm opacity-70">
                    디스플레이에 표시 중인 Local Economy 시각화를 원격으로 제어합니다.
                  </p>
                </div>

                <UnifiedControls
                  timelineMode={timelineMode}
                  onTimelineModeChange={(m) => { setTimelineMode(m); sendPatch({ timelineMode: m }) }}

                  isDailyPlaybackActive={playing}
                  currentDayIndex={dayIndex}
                  totalDays={totalDays}
                  currentDate={''}
                  onPlayPause={() => { setPlaying(p => { const np = !p; sendPatch({ playing: np }); return np }) }}
                  onDayChange={(idx) => { setDayIndex(idx); sendPatch({ dayIndex: idx }) }}
                  onSkipToStart={() => { setDayIndex(0); sendPatch({ dayIndex: 0 }) }}
                  onSkipToEnd={() => {
                    const last = Math.max(0, totalDays - 1)
                    setDayIndex(last); sendPatch({ dayIndex: last })
                  }}

                  selectedMeshMonth={selectedMeshMonth}
                  onMeshMonthChange={(m) => { setSelectedMeshMonth(m); sendPatch({ selectedMeshMonth: m }) }}

                  useTemperatureColor={useTempColor}
                  onUseTemperatureColorChange={(b) => { setUseTempColor(b); sendPatch({ useTemperatureColor: b }) }}

                  isAIPredictionMode={false}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
