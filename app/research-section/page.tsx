// app/research-section/page.tsx
'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useWS } from '@shared/hooks/useWS'
import { useTranslation } from '@/src/shared/hooks/useTranslation'

// ✅ named export인 Research를 가져옴 (중요!)
// Create a separate loading component to avoid hooks in dynamic loading
const ResearchLoading = () => {
  const { t } = useTranslation()
  return (
    <div className="min-h-screen flex items-center justify-center">
      {t('loading.loadingResearch')}
    </div>
  )
}

const Research = dynamic(
  () => import('@/src/features/data-portal/components/ResearchSection').then(m => m.Research),
  {
    ssr: true,
    loading: () => <ResearchLoading />,
  }
)

const CardsalesPanel = dynamic(
  () => import('@/src/features/controller/CardsalesPanel'),
  { ssr: false }
)

export default function ResearchSectionOverlay() {
  const router = useRouter()
  const sp = useSearchParams()
  const { t } = useTranslation()
  const { sendAction, status } = useWS({ role: 'controller', room: 'main', onAction: () => {} })
  const [selectedOption, setSelectedOption] = useState<string | null>(null)

  const close = () => {
    const next = new URLSearchParams(sp)
    next.delete('modal')
    router.push(`/controller?${next.toString()}`)
  }

  const handleOptionSelect = (option: string) => {
    if (option === 'cardsales') {
      setSelectedOption('cardsales')
    } else if (option === 'eda') {
      // Send display to EDA page
      sendAction(`display:navigate:/research/eda`)
      setSelectedOption('eda')
    }
  }

  const onClickCapture: React.MouseEventHandler<HTMLDivElement> = (e) => {
    const a = (e.target as HTMLElement).closest('a[href^="/research/"]') as HTMLAnchorElement | null
    if (!a) return
    e.preventDefault()
    const path = a.getAttribute('href') || ''
    if (!path) return

    if (path === '/research/local-economy') {
      handleOptionSelect('cardsales')
    } else if (path === '/research/eda') {
      handleOptionSelect('eda')
    }
  }

  // Show CardSales controls if cardsales is selected
  if (selectedOption === 'cardsales') {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => setSelectedOption(null)}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              ← {t('navigation.back')}
            </button>
            <h1 className="text-2xl font-semibold">{t('navigation.cardSalesControls')}</h1>
          </div>

          <CardsalesPanel
            wsStatus={status}
            sendAction={sendAction}
          />
        </div>
      </div>
    )
  }

  // Show EDA message if eda is selected
  if (selectedOption === 'eda') {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4">{t('navigation.edaControls')}</h1>
          <p className="text-neutral-400 mb-8">{t('navigation.displayNavigated')}</p>
          <button
            onClick={() => setSelectedOption(null)}
            className="px-6 py-3 rounded-lg bg-white text-black font-semibold"
          >
            {t('navigation.backToSelection')}
          </button>
        </div>
      </div>
    )
  }

  // Show selection interface
  return (
    <div onClickCapture={onClickCapture}>
      <Research />
    </div>
  )
}
