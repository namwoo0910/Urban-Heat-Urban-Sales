/**
 * @feature 홈페이지 - 메인 페이지
 * @description 파티클 애니메이션이 있는 홈페이지 메인 컴포넌트 with video screen saver
 *
 * @dependencies
 * - [로컬] ./HeroSection
 * - [로컬] ./VideoScreenSaver
 */

"use client"

import dynamic from 'next/dynamic'
import { useEffect } from 'react'
import { VideoScreenSaver } from './VideoScreenSaver'
import { useScreenSaver } from '@/src/shared/hooks/useScreenSaver'
import { useWS } from '@shared/hooks/useWS'

// Hero 섹션 동적 로드
const HeroSection = dynamic(
  () => import('./HeroSection').then(mod => mod.Hero),
  {
    loading: () => <div className="h-screen flex items-center justify-center">Loading...</div>,
    ssr: true
  }
)

export default function HomePage() {
  const { isScreenSaverActive, disableScreenSaver } = useScreenSaver()

  // WebSocket connection to listen for controller actions
  const { sendAction, isConnected } = useWS({
    role: 'display',
    room: 'main',
    onAction: (action) => {
      if (action === 'explore' || action === 'display:disableScreenSaver') {
        disableScreenSaver()
        // Also trigger hero explore animation
        window.dispatchEvent(new CustomEvent('hero:explore'))
      }
    },
  })

  return (
    <div className="relative min-h-screen">
      {/* Video Screen Saver */}
      <VideoScreenSaver
        isVisible={isScreenSaverActive}
        onVideoClick={disableScreenSaver}
      />

      {/* Main Hero Section - only render when screen saver is not active */}
      {!isScreenSaverActive && <HeroSection />}
    </div>
  )
}