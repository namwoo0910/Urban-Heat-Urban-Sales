// app/research-section/page.tsx
'use client'

import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import { useWS } from '@shared/hooks/useWS'

// ✅ named export인 Research를 가져옴 (중요!)
const Research = dynamic(
  () => import('@/src/features/data-portal/components/ResearchSection').then(m => m.Research),
  {
    ssr: true,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center">
        Loading research...
      </div>
    ),
  }
)

export default function ResearchSectionOverlay() {
  const router = useRouter()
  const sp = useSearchParams()
  const { sendAction } = useWS({ role: 'controller', room: 'main', onAction: () => {} })

  const close = () => {
    const next = new URLSearchParams(sp)
    next.delete('modal')
    router.push(`/controller?${next.toString()}`)
  }

  const onClickCapture: React.MouseEventHandler<HTMLDivElement> = (e) => {
    const a = (e.target as HTMLElement).closest('a[href^="/research/"]') as HTMLAnchorElement | null
    if (!a) return
    e.preventDefault()
    const path = a.getAttribute('href') || ''
    if (!path) return

    const msg = `display:navigate:${path}`
    console.log('[Controller] sending', msg)
    const ok = sendAction(msg)
    console.log('[Controller] sendAction result', ok)

    close()
  }

  return (
    <div onClickCapture={onClickCapture}>
      <Research />
    </div>
  )
}
