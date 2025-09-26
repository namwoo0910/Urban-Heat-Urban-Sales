// app/display/page.tsx
'use client'

import React, { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useWS } from '@shared/hooks/useWS'
import { Hero } from '@/src/features/home/components/HeroSection'

declare global {
  interface Window {
    __lastVideoCmd?: { cmd: 'play' | 'pause'; src?: string; ts: number }
  }
}

export default function DisplayPage() {
  const router = useRouter()

  const onAction = useCallback(
    (action: string) => {
      console.log('[Display] onAction', action)

      // 1) 네비게이션
      if (action.startsWith('display:navigate:')) {
        const path = action.replace('display:navigate:', '')
        console.log('[Display] navigate ->', path)
        router.replace(path)
        return
      }

      // 2) 비디오 제어 (버퍼 + 브로드캐스트)
      if (action.startsWith('display:video:play:')) {
        const src = action.slice('display:video:play:'.length) // 예: /0923.mp4
        window.__lastVideoCmd = { cmd: 'play', src, ts: Date.now() } // ✅ 버퍼
        console.log('[Display] video play buffered ->', window.__lastVideoCmd)
        window.dispatchEvent(new CustomEvent('remote-video', { detail: window.__lastVideoCmd }))
        return
      }
      if (action === 'display:video:pause') {
        window.__lastVideoCmd = { cmd: 'pause', ts: Date.now() }
        console.log('[Display] video pause buffered')
        window.dispatchEvent(new CustomEvent('remote-video', { detail: window.__lastVideoCmd }))
        return
      }

      // 3) AI 예측
      if (action === 'display:ai:predict') {
        console.log('[Display] AI predict trigger')
        window.dispatchEvent(new CustomEvent('viz:local-economy:ai-predict'))
        return
      }

      // 4) Explore: 항상 /display로 돌아와서 영웅 화면이 이벤트를 받을 수 있게 함
      if (action === 'explore') {
        console.log('[Display] explore -> navigate /display, then fire hero:explore')
        router.replace('/display')
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('hero:explore'))
        }, 150)
        return
      }
    },
    [router]
  )

  useWS({ role: 'display', room: 'main', onAction })

  // ✅ 랜딩 항상 렌더 (실제 Hero 있으면 교체)
  return <Hero />
}
