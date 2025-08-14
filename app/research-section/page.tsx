'use client'

import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import TransitionLink from '@/components/transition-link'

// Dynamic import for Research component
const Research = dynamic(() => import('@/components/research').then(mod => mod.Research), {
  loading: () => <div className="min-h-screen flex items-center justify-center">Loading research...</div>,
  ssr: true
})

export default function ResearchSection() {
  return (
    <div className="relative">
      <Research />
      
      {/* Navigation Buttons */}
      <div className="fixed bottom-10 left-0 right-0 z-50 flex justify-center gap-4">
        <TransitionLink href="/">
          <motion.button
            className="flex items-center gap-2 px-6 py-3 bg-black/80 hover:bg-black text-white font-medium rounded-full transition-all duration-300 border border-white/20 backdrop-blur-sm"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft size={16} />
            <span>Back to Home</span>
          </motion.button>
        </TransitionLink>
        
        <TransitionLink href="/blog-section">
          <motion.button
            className="flex items-center gap-2 px-6 py-3 bg-black/80 hover:bg-black text-white font-medium rounded-full transition-all duration-300 border border-white/20 backdrop-blur-sm"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span>View Blog</span>
            <ArrowRight size={16} />
          </motion.button>
        </TransitionLink>
      </div>
    </div>
  )
}