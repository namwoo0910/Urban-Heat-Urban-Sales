'use client'
import { useCallback } from 'react'
import { useWS } from '@shared/hooks/useWS'
import { Hero } from '@/src/features/home/components/HeroSection'

export default function DisplayPage() {
  const onAction = useCallback((action: 'explore' | 'view-analytics') => {
    if (action === 'explore') {
      // Hero 안의 handleExploreClick()을 직접 호출하는 효과
      requestAnimationFrame(() => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('hero:explore'))
        }
      })
    }
    // view-analytics는 디스플레이에서 무시 (요구사항)
  }, [])

  useWS({ role: 'display', room: 'main', onAction })

  // 디스플레이는 Hero만 렌더 → 내부 상태가 원본 흐름대로 전환됨
  return <Hero />
}
