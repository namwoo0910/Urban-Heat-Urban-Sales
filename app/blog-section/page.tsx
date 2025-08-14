'use client'

import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import { ArrowLeft, Home } from 'lucide-react'
import TransitionLink from '@/components/transition-link'

// Dynamic import for BlogPreview component
const BlogPreview = dynamic(() => import('@/components/blog-preview').then(mod => mod.BlogPreview), {
  loading: () => <div className="min-h-[400px] flex items-center justify-center">Loading blog...</div>,
  ssr: true
})

export default function BlogSection() {
  return (
    <div className="relative min-h-screen">
      <BlogPreview />
      
      {/* Navigation Buttons */}
      <div className="fixed bottom-10 left-0 right-0 z-50 flex justify-center gap-4">
        <TransitionLink href="/research-section">
          <motion.button
            className="flex items-center gap-2 px-6 py-3 bg-black/80 hover:bg-black text-white font-medium rounded-full transition-all duration-300 border border-white/20 backdrop-blur-sm"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft size={16} />
            <span>Back to Research</span>
          </motion.button>
        </TransitionLink>
        
        <TransitionLink href="/">
          <motion.button
            className="flex items-center gap-2 px-6 py-3 bg-black/80 hover:bg-black text-white font-medium rounded-full transition-all duration-300 border border-white/20 backdrop-blur-sm"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Home size={16} />
            <span>Home</span>
          </motion.button>
        </TransitionLink>
      </div>
    </div>
  )
}