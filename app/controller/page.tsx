// app/controller/page.tsx
'use client'

import dynamic from 'next/dynamic'
import React, { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useWS } from '@shared/hooks/useWS'

// Research 섹션 (named export: Research)
const Research = dynamic(
  () =>
    import('@/src/features/data-portal/components/ResearchSection').then(
      (m) => m.Research
    ),
  { ssr: true, loading: () => <div className="p-6">Loading…</div> }
)

type Panel = null | 'local-economy' | 'eda'

export default function ControllerPage() {
  const router = useRouter()
  const sp = useSearchParams()
  const isOpen = sp.get('modal') === 'research'
  const panel = (sp.get('panel') as Panel) ?? null

  const { sendAction, isConnected, status } = useWS({
    role: 'controller',
    room: 'main',
    onAction: () => {},
  })

  const handleExplore = useCallback(() => {
    sendAction('explore')
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
    sendAction(`display:navigate:${path}`)
    if (path === '/research/local-economy') openLocalEconomyPanel()
    else closeOverlay()
  }

  // ===== Local Economy 패널용 컨트롤 =====
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const videoSrc = '/0923.mp4' // public/0923.mp4

  // ✅ 새로 추가: "카드 데이터 매출 살펴보기" (디스플레이를 바로 /research/local-economy 로)
  const viewLocalEconomy = () => {
    sendAction('display:navigate:/research/local-economy?intro=1')
    setTimeout(() => {
    sendAction('display:research:landing') // ← 랜딩 화면 강제 복귀
    }, 150)
    // 컨트롤러는 계속 패널에 남겨둠(필요 시 유지)
  }

  // ✅ 재생: 오버레이를 즉시 띄우고(재생), 동시에 라우트 이동
  //    - 전역 오버레이이므로 페이지와 무관하게 재생 가능
  //    - 이동 직후 일부 환경에서 유실 방지용 재시도 한 번 더
  const playVideo = () => {
    console.log('[Controller] play (overlay immediately) + navigate /research/local-economy')
    let ok = sendAction(`display:video:play:${videoSrc}`)         // 1) 즉시 재생
    sendAction('display:navigate:/research/local-economy')        // 2) 동시에 목적 페이지로 이동
    // 3) 레이스 방지 재시도 (짧게 한 번 더)
    setTimeout(() => {
      if (!ok) ok = sendAction(`display:video:play:${videoSrc}`)
      console.log('[Controller] play retry sent, ok=', ok)
    }, 200)
    if (ok) setIsVideoPlaying(true)
  }

  const pauseVideo = () => {
    const ok = sendAction('display:video:pause')
    console.log('[Controller] pause sent, ok=', ok)
    if (ok) setIsVideoPlaying(false)
  }

  const unmuteVideo = () => {
    const ok = sendAction('display:video:mute:off')
    console.log('[Controller] unmute sent, ok=', ok)
  }
  const muteVideo = () => {
    const ok = sendAction('display:video:mute:on')
    console.log('[Controller] mute sent, ok=', ok)
  }
  const closeVideo = () => {
    const ok = sendAction('display:video:close')
    console.log('[Controller] close sent, ok=', ok)
  }

  const triggerAIPredict = () => {
    // 1) 먼저 해당 화면으로 이동
    sendAction('display:navigate:/research/local-economy?noIntro=1')

    // 2) 레이스 방지를 위해 살짝 딜레이 후 트리거
    setTimeout(() => {
      const ok = sendAction('display:ai:predict')
      console.log('[Controller] AI predict sent, ok=', ok)
    }, 300) // 200~400ms 환경에 맞게 조절 가능
  }

  const setTempAndAutoplay = (delta: 5 | 10 | 15 | 20) => {
    // 항상 대상 화면 보장
    sendAction('display:navigate:/research/local-economy?noIntro=1')

    // AI 패널 보장 후, 온도 세팅 → 31일 자동 재생
    setTimeout(() => {
      sendAction('display:ai:predict')                 // 혹시 꺼져 있으면 켬
      setTimeout(() => {
        console.log('[Controller] ai set-temp', delta)
        sendAction(`display:ai:set-temp:${delta}`)
        setTimeout(() => {
          console.log('[Controller] ai auto-play 31d')
          sendAction('display:ai:play:31')
        }, 120)
      }, 150)
    }, 150)
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

      {isOpen && (
        <div className="fixed inset-0 z-[100]">
          <div className="absolute inset-0 bg-black" />
          <div className="absolute inset-0 flex flex-col">
            <div className="flex items-center gap-4 p-6 border-b border-white/10 bg-[#0f0f10]">
              <button
                onClick={closeOverlay}
                className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20"
              >
                ← 돌아가기
              </button>
              <h2 className="text-2xl font-semibold">
                {panel === 'local-economy' ? 'Local Economy – Controls' : 'Research'}
              </h2>
            </div>

            {!panel && (
              <div
                className="flex-1 overflow-y-auto bg-[#0f0f10]"
                onClickCapture={onOverlayClickCapture}
              >
                <Research />
              </div>
            )}

            {panel === 'local-economy' && (
              <div className="flex-1 bg-[#0f0f10] p-6">
                <div className="max-w-xl mx-auto grid gap-6">

                  {/* ✅ 최상단: 카드 데이터 매출 살펴보기
                  <div className="rounded-2xl border border-white/10 p-5 bg-black/40">
                    <h3 className="text-lg font-semibold mb-3">카드 데이터 매출 살펴보기</h3>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={viewLocalEconomy}
                        className="px-5 py-3 rounded-xl bg-white text-black font-semibold"
                      >
                        들어가기
                      </button>
                      <span className="text-sm opacity-70">
                        (Display에서 Local Economy 화면으로 즉시 이동)
                      </span>
                    </div>
                  </div> */}

                  {/* 기존: 카드 매출데이터 감상하기 (재생/중지) */}
                  <div className="rounded-2xl border border-white/10 p-5 bg-black/40">
                    <h3 className="text-lg font-semibold mb-3">카드 매출데이터 감상하기</h3>
                    <div className="flex items-center gap-3 flex-wrap">
                      {!isVideoPlaying ? (
                        <button
                          onClick={playVideo}
                          className="px-5 py-3 rounded-xl bg-white text-black font-semibold"
                        >
                          재생
                        </button>
                      ) : (
                        <button
                          onClick={pauseVideo}
                          className="px-5 py-3 rounded-xl bg-white/10 border border-white/20"
                        >
                          일시정지
                        </button>
                      )}
                      <button
                        onClick={unmuteVideo}
                        className="px-4 py-3 rounded-xl bg-white/10 border border-white/20"
                      >
                        🔊 소리 켜기
                      </button>
                      <button
                        onClick={muteVideo}
                        className="px-4 py-3 rounded-xl bg-white/10 border border-white/20"
                      >
                        🔇 소리 끄기
                      </button>
                      <button
                        onClick={closeVideo}
                        className="px-4 py-3 rounded-xl bg-white/10 border border-white/20"
                      >
                        ✕ 닫기
                      </button>
                      <span className="text-sm opacity-70">
                        (소리: 최초 1회 디스플레이 화면을 탭해 허용 필요)
                      </span>
                    </div>
                  </div>

                  {/* 기존: AI 예측 */}
                  <div className="rounded-2xl border border-white/10 p-5 bg-black/40">
                    <h3 className="text-lg font-semibold mb-3">온도 변화에 따른 카드 매출 데이터 예측하기</h3>

                    {/* 프리셋 버튼들 */}
                    <div className="flex items-center gap-2 mb-4">
                      {[5,10,15,20].map(v => (
                        <button
                          key={v}
                          onClick={() => setTempAndAutoplay(v as 5|10|15|20)}
                          className="px-3 py-2 rounded-lg bg-purple-900/40 border border-purple-500/30 hover:bg-purple-900/60 text-purple-100 text-sm"
                        >
                          +{v}℃ &nbsp;•&nbsp; 31일 자동재생
                        </button>
                      ))}
                    </div>

                    {/* 기존 “AI 예측 실행” 버튼 유지(원하면 삭제 가능) */}
                    <button
                      onClick={triggerAIPredict}
                      className="px-5 py-3 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20"
                    >
                      AI 예측 실행
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
