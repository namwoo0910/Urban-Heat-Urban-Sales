import dynamic from 'next/dynamic'

// Dynamic imports with loading states for better performance
const Hero = dynamic(() => import('@/components/hero').then(mod => mod.Hero), {
  loading: () => <div className="h-screen flex items-center justify-center">Loading...</div>,
  ssr: true
})

const Portfolio = dynamic(() => import('@/components/portfolio').then(mod => mod.Portfolio), {
  loading: () => <div className="min-h-screen flex items-center justify-center">Loading portfolio...</div>,
  ssr: true
})

const BlogPreview = dynamic(() => import('@/components/blog-preview').then(mod => mod.BlogPreview), {
  loading: () => <div className="min-h-[400px] flex items-center justify-center">Loading blog...</div>,
  ssr: true
})

export default function Home() {
  return (
    <>
      <Hero />
      <Portfolio />
      <BlogPreview />
    </>
  )
}
