'use client'

import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import TransitionLink from '@/src/shared/components/navigation/TransitionLink'

// Dynamic import for Research component
const Research = dynamic(() => import('@/src/features/data-portal/components/ResearchSection').then(mod => mod.Research), {
  loading: () => <div className="min-h-screen flex items-center justify-center">Loading research...</div>,
  ssr: true
})

export default function ResearchSection() {
  return (
    <div className="relative">
      <Research />
      
      {/* Navigation Button */}
      <div className="fixed left-0 right-0 z-50 flex justify-center" style={{ bottom: 'calc(2.5rem + 60px)' }}>
        <TransitionLink href="/">
          <motion.button
            className="flex items-center gap-2 px-4 py-2 bg-black/80 hover:bg-black text-white font-['Montserrat'] font-medium rounded-full transition-all duration-300 border border-white/20 backdrop-blur-sm text-sm uppercase tracking-wide"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft size={16} />
            <span>Back to Home</span>
          </motion.button>
        </TransitionLink>
      </div>
    </div>
  )
}