import dynamic from 'next/dynamic'

// Dynamic imports with loading states for better performance
const Hero = dynamic(() => import('@/components/hero').then(mod => mod.Hero), {
  loading: () => <div className="h-screen flex items-center justify-center">Loading...</div>,
  ssr: true
})

export default function Home() {
  return (
    <div className="relative min-h-screen">
      <Hero />
    </div>
  )
}
