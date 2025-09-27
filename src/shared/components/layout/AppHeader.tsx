"use client"

import { TransitionLink } from "@/src/shared/components/navigation/TransitionLink"
import { motion } from "framer-motion"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import Image from "next/image"

export function Header() {
  const headerRef = useRef(null)
  const router = useRouter()
  const pathname = usePathname()

  // Hide header on controller page
  if (pathname === '/controller') {
    return null
  }

  useGSAP(() => {
    gsap.from(headerRef.current, {
      y: -100,
      opacity: 0,
      duration: 1,
      ease: "power3.out",
      delay: 2,
    })
  }, [])

  // Smart prefetching for main page when user shows intent to navigate home
  const handleHomeHover = () => {
    router.prefetch('/')
  }

  return (
    <motion.header ref={headerRef} className="fixed left-0 right-0 z-50 py-2 px-6" style={{ top: '10px' }}>
      <div className="w-full flex justify-between items-center relative">
        {/* Left: KAIST AI Logo */}
        <TransitionLink href="/" className="flex items-center" onMouseEnter={handleHomeHover}>
          <div 
            className="relative rounded-sm px-3 py-1.5 overflow-hidden backdrop-blur-sm"
            style={{
              background: 'linear-gradient(-45deg, #fce4ec, #e1f5fe, #f3e5f5, #e8f5e9)',
              backgroundSize: '400% 400%',
              animation: 'gradientShift 8s ease infinite',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            {/* White overlay for better text visibility */}
            <div className="absolute inset-0 bg-white/40"></div>
            <Image
              src="/images/kaist-ai-logo-text.png"
              alt="KAIST AI Logo"
              width={100}
              height={32}
              className="h-6 w-auto relative z-10 contrast-125 brightness-95"
              priority
            />
          </div>
        </TransitionLink>
        
        {/* Right: 데이터로 보는 서울 Button */}
        {pathname !== '/' && pathname !== '/research-section' && (
          <div className="ml-auto">
            <TransitionLink href="/research-section">
              <motion.button
                className={`font-['Montserrat'] font-semibold text-sm py-1.5 px-4 transition-all duration-300 uppercase tracking-wider ${
                  pathname?.includes('/eda')
                    ? 'text-gray-900 hover:text-gray-700'
                    : 'text-white hover:text-gray-300'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {/* 데이터로 보는 서울 */}
              </motion.button>
            </TransitionLink>
          </div>
        )}
      </div>
      
      {/* Gradient Animation Styles */}
      <style jsx>{`
        @keyframes gradientShift {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
      `}</style>
    </motion.header>
  )
}
