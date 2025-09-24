'use client'
import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useWS } from '@shared/hooks/useWS'
import { Hero } from '@/src/features/home/components/HeroSection'

export default function DisplayPage() {
  const router = useRouter()

  // const onAction = useCallback((action: string) => {
  //   console.log('[Display] onAction', action)
  //   if (action.startsWith('display:navigate:')) {
  //     const path = action.replace('display:navigate:', '')
  //     console.log('[Display] navigating to', path)
  //     router.push(path)
  //   }
  //   if (action === 'explore') {
  //     requestAnimationFrame(() => window.dispatchEvent(new CustomEvent('hero:explore')))
  //   }
  // }, [router])
  const onAction = useCallback((action: string) => {
    console.log('[Display] onAction', action)
    if (action.startsWith('display:navigate:')) {
      const path = action.replace('display:navigate:', '')
      router.replace(path)
      return
    }

    // ✅ 컨트롤 업데이트(로컬 이코노미)
    if (action.startsWith('viz:local-economy:update:')) {
      const json = action.slice('viz:local-economy:update:'.length)
      try {
        const patch = JSON.parse(json)
        window.dispatchEvent(new CustomEvent('viz:local-economy:update', { detail: patch }))
      } catch {}
      return
    }

    if (action === 'explore') {
      requestAnimationFrame(() => window.dispatchEvent(new CustomEvent('hero:explore')))
    }
  }, [router])



  useWS({ role: 'display', room: 'main', onAction /*, url:'ws://localhost:3001/ws'*/ })
  return <Hero />
}
