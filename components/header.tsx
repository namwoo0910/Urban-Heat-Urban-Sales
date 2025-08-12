"use client"

import { TransitionLink } from "./transition-link"
import { motion } from "framer-motion"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { useRef } from "react"
import Image from "next/image"

export function Header() {
  const headerRef = useRef(null)

  useGSAP(() => {
    gsap.from(headerRef.current, {
      y: -100,
      opacity: 0,
      duration: 1,
      ease: "power3.out",
      delay: 2,
    })
  }, [])

  return (
    <motion.header ref={headerRef} className="fixed top-0 left-0 right-0 z-50 py-2 px-6">
      <div className="w-full flex justify-between items-center bg-black/80 backdrop-blur-md py-2 px-6 rounded-full">
        <TransitionLink href="/" className="flex items-center">
          <div className="bg-white rounded-full px-3 py-1.5 hover:bg-gray-100 transition-colors">
            <Image
              src="/images/kaist-ai-logo-text.png"
              alt="KAIST AI Logo"
              width={100}
              height={32}
              className="h-6 w-auto"
              priority
            />
          </div>
        </TransitionLink>
        <nav className="hidden md:flex items-center gap-6 text-white">
          <TransitionLink href="/#portfolio" className="hover:text-neutral-300 transition-colors">
            Research
          </TransitionLink>
          <TransitionLink href="/blog" className="hover:text-neutral-300 transition-colors">
            Site
          </TransitionLink>
          <TransitionLink href="/contact" className="hover:text-neutral-300 transition-colors">
            Contact
          </TransitionLink>
        </nav>
        <TransitionLink href="/contact">
          <motion.button
            className="bg-white text-black font-semibold py-1.5 px-4 rounded-full text-sm"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Let's Talk
          </motion.button>
        </TransitionLink>
      </div>
    </motion.header>
  )
}
