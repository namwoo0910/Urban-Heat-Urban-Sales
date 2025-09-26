import dynamic from 'next/dynamic'

// Dynamic import for Research component
const Research = dynamic(() => import('@/src/features/data-portal/components/ResearchSection').then(mod => mod.Research), {
  loading: () => <div className="min-h-screen flex items-center justify-center">Loading research...</div>,
  ssr: true
})

export default function ResearchSection() {
  return <Research />
}