// app/controller/page.tsx
'use client'

import dynamic from 'next/dynamic'
import React, { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useWS } from '@shared/hooks/useWS'
import { DistrictGridSelector } from '@/src/features/eda/components/DistrictGridSelector'
import { getDistrictCode, getDongCode } from '@/src/features/card-sales/data/districtCodeMappings'
import CardsalesPanel from '@/src/features/controller/CardsalesPanel'
import AIPredictionPanel from '@/src/features/controller/AIPredictionPanel'
import Image from 'next/image'

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
  const [showContactModal, setShowContactModal] = useState(false)
  const [canExplore, setCanExplore] = useState(false) // Reset Demo를 눌렀을 때만 true

  // EDA selection state
  const [selectedGu, setSelectedGu] = useState<string | null>(null)
  const [selectedDong, setSelectedDong] = useState<string | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  const [displayState, setDisplayState] = useState({
    currentPage: '/display',
    hasExplored: false
  })

  const { sendAction, isConnected, status } = useWS({
    role: 'controller',
    room: 'main',
    onAction: (action) => {
      console.log('[Controller] received action:', action)
      
      // Handle display state updates
      if (action.startsWith('display:state:page:')) {
        const page = action.replace('display:state:page:', '')
        setDisplayState(prev => ({
          ...prev,
          currentPage: page,
          // Reset exploration state if user navigates back to home or root
          hasExplored: (page === '/display' || page === '/') ? false : prev.hasExplored
        }))

        // Also reset local state when navigating to home pages
        if (page === '/display' || page === '/') {
          setHasExplored(false)
        }

        // EDA page navigation is handled by panel useEffect

        console.log('[Controller] Display page synced:', page)
      }
      
      if (action === 'display:state:explored') {
        setDisplayState(prev => ({ ...prev, hasExplored: true }))
        setHasExplored(true) // Also update local state for backward compatibility
        console.log('[Controller] Display exploration state synced')
      }

      // Handle map loading status (optional - now using timer instead)
      if (action === 'display:map:loaded') {
        setMapLoaded(true)
        console.log('[Controller] Map loaded on display')
      }

      if (action === 'display:map:loading') {
        console.log('[Controller] Map loading on display (using timer instead)')
      }
    },
  })

  // Request state sync when connected (reduced frequency to fix connection issues)
  useEffect(() => {
    if (isConnected) {
      console.log('[Controller] Connected, will request display state sync after delay')
      // Longer delay and less frequent syncing to prevent connection drops
      const timeoutId = setTimeout(() => {
        sendAction('sync:request-state')
      }, 2000) // Increased to 2 seconds
      
      return () => clearTimeout(timeoutId)
    }
  }, [isConnected, sendAction])

  // EDA map loading timer - start 5 second timer when EDA panel opens
  useEffect(() => {
    if (panel === 'eda') {
      console.log('[Controller] EDA panel opened, starting 5 second map loading timer')
      setMapLoaded(false) // Reset to show loading state
      const timerId = setTimeout(() => {
        setMapLoaded(true)
        console.log('[Controller] Map loading timeout completed - buttons enabled')
      }, 5000)

      return () => clearTimeout(timerId)
    }
  }, [panel])

  const handleExplore = useCallback(() => {
    sendAction('explore')
    // Also broadcast to display to disable screen saver
    sendAction('display:disableScreenSaver')
    setHasExplored(true)
    setCanExplore(false) // Explore를 누르면 다시 reset demo를 눌러야 함
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

  const goBackToResearch = useCallback(() => {
    const next = new URLSearchParams(sp)
    next.set('modal', 'research')
    next.delete('panel') // Remove panel to go back to main research dashboard
    router.push(`/controller?${next.toString()}`)
  }, [router, sp])

  const handleReset = useCallback(() => {
    // Reset controller state
    setHasExplored(false)
    setCanExplore(true) // Reset Demo를 누르면 Explore Seoul 버튼 활성화
    setDisplayState({
      currentPage: '/',
      hasExplored: false
    })

    // Close any modals
    const next = new URLSearchParams()
    router.push('/controller')

    // Reset display to display page (localhost:3000/display)
    sendAction('display:navigate:/display')
  }, [router, sendAction])

  // EDA selection handlers
  const handleDistrictSelect = useCallback((guName: string, guCode: number) => {
    setSelectedGu(guName)
    setSelectedDong(null) // Reset dong selection when gu changes

    // Navigate display to EDA page
    sendAction('display:navigate:/research/eda?noIntro=1')

    // Send district selection to display
    const payload = `display:eda:select:district:${guCode}:${encodeURIComponent(guName)}`
    sendAction(payload)
  }, [sendAction])

  const handleNeighborhoodSelect = useCallback((guName: string, guCode: number, dongName: string, dongCode: number) => {
    setSelectedGu(guName)
    setSelectedDong(dongName)

    // Navigate display to EDA page (if not already there)
    sendAction('display:navigate:/research/eda?noIntro=1')

    // Send neighborhood selection to display
    const payload = `display:eda:select:neighborhood:${dongCode}:${encodeURIComponent(dongName)}`
    sendAction(payload)
  }, [sendAction])

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 text-white relative">
      {/* Top Left Corner - Screen Saver Button (Controller Only) */}
      {!isOpen && (
        <div className="fixed top-4 left-6 z-[150] pointer-events-auto">
          <button
            onClick={() => sendAction('display:navigate:/')}
            className="group px-3 py-1.5 rounded-lg bg-slate-700/80 hover:bg-slate-600/90 border border-white/20 backdrop-blur-sm transition-all duration-300 transform hover:scale-105"
          >
            <span className="flex items-center gap-2 text-white text-sm font-medium">
              <span>💤</span>
              <span>Screen Saver</span>
            </span>
          </button>
        </div>
      )}

      {/* Top Right Corner - Contact Button & Logo */}
      <div className="fixed top-4 right-6 z-[150] flex items-center gap-3 pointer-events-auto">
        {/* Contact Button */}
        <button
          onClick={() => setShowContactModal(true)}
          className="group px-3 py-1.5 rounded-lg bg-slate-700/80 hover:bg-slate-600/90 border border-white/20 backdrop-blur-sm transition-all duration-300 transform hover:scale-105"
        >
          <span className="flex items-center gap-2 text-white text-sm font-medium">
            <span>📧</span>
            <span>Contact</span>
          </span>
        </button>

        {/* KAIST AI Logo */}
        <div
          className="relative rounded-sm px-3 py-1.5 overflow-hidden backdrop-blur-sm"
          style={{
            background: 'linear-gradient(-45deg, #fce4ec, #e1f5fe, #f3e5f5, #e8f5e9)',
            backgroundSize: '400% 400%',
            animation: 'gradientShift 8s ease infinite',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <div className="absolute inset-0 bg-white/40"></div>
          <Image
            src="/images/kaist-ai-logo-text.png"
            alt="KAIST AI Logo"
            width={100}
            height={32}
            className="h-6 w-auto relative z-10 contrast-125 brightness-95"
            priority
          />
        </div>
      </div>

      {/* Gradient Animation Styles */}
      <style jsx>{`
        @keyframes gradientShift {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
      `}</style>

      {/* Main controller content - only show when modal is closed */}
      {!isOpen && (
        <div className="flex flex-col items-center justify-center gap-8 p-8 min-h-screen">
          <div className="text-center mb-4">
            <h1 className="text-8xl font-bold mb-4 text-white">
              Urban Heat, Urban Sales
            </h1>

          </div>

          <div className="flex flex-col gap-4 w-full max-w-md">
            {/* Main Action Button - Changes from Explore Seoul to View Analytics */}
            {!displayState.hasExplored ? (
              <button
                onClick={canExplore ? handleExplore : undefined}
                disabled={!canExplore}
                className={`text-4xl group py-4 px-8 rounded-2xl bg-gradient-to-r text-white font-semibold transition-all duration-300 border border-white/10 backdrop-blur-sm ${
                  canExplore
                    ? 'from-slate-700/80 to-slate-600/80 hover:from-cyan-600/80 hover:to-blue-600/80 transform hover:scale-105 shadow-lg hover:shadow-cyan-500/20 cursor-pointer'
                    : 'from-slate-800/50 to-slate-700/50 opacity-50 cursor-not-allowed'
                }`}
              >
                <span className="flex items-center justify-center gap-3">
                  <span>🚀</span>
                  <span>Explore Seoul</span>
                  {!canExplore && <span className="text-xs opacity-60">(Reset Demo first)</span>}
                </span>
              </button>
            ) : (
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

          <div className="text-xs opacity-60 mt-2 space-y-1">
            <div className="px-3 py-1.5 rounded-lg bg-slate-800/50 border border-white/10">
              WS: {isConnected ? '🟢 connected' : '🔴 disconnected'} ({status})
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-slate-800/50 border border-white/10">
              Display: {displayState.currentPage} {displayState.hasExplored ? '✅ explored' : '⭕ not explored'}
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-slate-800/50 border border-white/10">
              Explore: {canExplore ? '✅ available' : '⭕ reset demo first'}
            </div>
            <button
              onClick={handleReset}
              className="w-full px-3 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 border border-red-400/30 text-white text-xs font-medium transition-colors"
            >
              🔄 Reset Demo
            </button>
          </div>
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-[100]">
          <div className="absolute inset-0 flex flex-col">
            <div className="flex items-center gap-6 p-8 border-b border-white/10">
              <button
                onClick={panel ? goBackToResearch : closeOverlay}
                className="group px-4 py-2.5 rounded-xl bg-gradient-to-r from-slate-700/90 to-slate-600/90 hover:from-purple-600/90 hover:to-pink-600/90 transition-all duration-300 border border-white/20 backdrop-blur-sm transform hover:scale-105 shadow-lg hover:shadow-purple-500/20"
              >
                <span className="flex items-center gap-2 text-white font-medium">
                  <span>←</span>
                  <span>Back</span>
                </span>
              </button>
              <h2 className="text-3xl font-bold text-white">
                {panel === 'local-economy' ? '🖼️ & 🎧' :
                 panel === 'eda' ? '🗺️' :
                 panel === 'ai-prediction' ? '🤖' :
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
                  <div className="rounded-2xl overflow-hidden border border-white/10 shadow-lg">
                    <DistrictGridSelector
                      selectedGu={selectedGu}
                      selectedDong={selectedDong}
                      onDistrictSelect={handleDistrictSelect}
                      onNeighborhoodSelect={handleNeighborhoodSelect}
                      mapLoaded={mapLoaded}
                      className="rounded-none border-none shadow-none bg-white"
                    />
                  </div>
                  <div className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20">
                    <p className="text-sm text-slate-300 text-center">
                      💡 Click on any district in the 5×5 grid to see neighborhoods, then select a specific area for analysis
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

      {/* Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 rounded-3xl p-8 border border-slate-500/30 shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto backdrop-blur-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                <span>👥</span>
                <span>Research Team</span>
              </h2>
              <button
                onClick={() => setShowContactModal(false)}
                className="p-2 rounded-lg bg-slate-700/80 hover:bg-slate-600/90 border border-white/20 transition-all duration-300"
              >
                <span className="text-white text-xl">✕</span>
              </button>
            </div>

            <div className="space-y-6">
              {/* Team Members Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-slate-500/30">
                      <th className="text-left py-3 px-4 text-white font-semibold">Name</th>
                      <th className="text-left py-3 px-4 text-white font-semibold">Role / Contribution</th>
                      <th className="text-left py-3 px-4 text-white font-semibold">E-mail</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-200">
                    <tr className="border-b border-slate-600/20 hover:bg-slate-700/20 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-semibold text-blue-300">Yoonjin Yoon</span>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        PI, Supervision
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <a href="mailto:abc@kaist.ac.kr" className="text-blue-400 hover:text-blue-300 transition-colors">
                          yoonjin@spacetime.kaist.ac.kr
                        </a>
                      </td>
                    </tr>
                    <tr className="border-b border-slate-600/20 hover:bg-slate-700/20 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-semibold text-purple-300">Namwoo Kim</span>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        Predictive AI Modeling, Interactive Tool Implementation, Acoustic Work
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <a href="mailto:abc@kaist.ac.kr" className="text-purple-400 hover:text-purple-300 transition-colors">
                          namwoo@spacetime.kaist.ac.kr
                        </a>
                      </td>
                    </tr>
                    <tr className="border-b border-slate-600/20 hover:bg-slate-700/20 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-semibold text-green-300">Juneyoung Ro</span>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        Exploratory Data Analysis, Acoustic Work
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <a href="mailto:abc@kaist.ac.kr" className="text-green-400 hover:text-green-300 transition-colors">
                          juneyoung@spacetime.kaist.ac.kr
                        </a>
                      </td>
                    </tr>
                    <tr className="border-b border-slate-600/20 hover:bg-slate-700/20 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-semibold text-orange-300">Keonhee Jang</span>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        Data Collection, Exploratory Data Analysis
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <a href="mailto:abc@kaist.ac.kr" className="text-orange-400 hover:text-orange-300 transition-colors">
                          keonhee@spacetime.kaist.ac.kr
                        </a>
                      </td>
                    </tr>
                    <tr className="border-b border-slate-600/20 hover:bg-slate-700/20 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-semibold text-cyan-300">Seokwoo Yoon</span>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        Data Collection, Interactive Tool Implementation
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <a href="mailto:" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                          seokwoo@spacetime.kaist.ac.kr
                        </a>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-700/20 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-semibold text-yellow-300">Youngjun Park</span>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        Exploratory Data Analysis
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <a href="mailto:" className="text-yellow-400 hover:text-yellow-300 transition-colors">
                          youngjun@spacetime.kaist.ac.kr
                        </a>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Project Information */}
              <div className="mt-8 p-4 rounded-xl bg-gradient-to-r from-slate-700/30 to-slate-600/30 border border-slate-500/30">
                <h3 className="text-lg font-semibold text-white mb-2">🏛️ Institution</h3>
                <div className="text-slate-200 space-y-1">
                  <div>KAIST AI Institute</div>
                  <div className="text-sm opacity-80">Urban Heat, Urban Sales Research Project</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
