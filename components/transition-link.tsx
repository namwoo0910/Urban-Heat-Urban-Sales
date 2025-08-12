"use client"

import React, { useEffect } from "react"
import { useTransitionContext } from "@/context/transition-context"
import type { LinkProps } from "next/link"
import type { AnchorHTMLAttributes, ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import { gsap } from "gsap"

type TransitionLinkProps = LinkProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    children: ReactNode
  }

export default function TransitionLink({ href, children, ...props }: TransitionLinkProps) {
  const { playTransition } = useTransitionContext()
  const pathname = usePathname()
  const router = useRouter()

  // Prefetch on hover and mount
  useEffect(() => {
    const hrefStr = href.toString()
    if (hrefStr && !hrefStr.startsWith('#') && !hrefStr.startsWith('http')) {
      router.prefetch(hrefStr)
    }
  }, [href, router])

  const handleMouseEnter = () => {
    const hrefStr = href.toString()
    if (hrefStr && !hrefStr.startsWith('#') && !hrefStr.startsWith('http')) {
      // Prefetch again on hover for maximum performance
      router.prefetch(hrefStr)
    }
  }

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const hrefStr = href.toString()
    const targetPath = hrefStr.split("#")[0]
    const targetHash = hrefStr.split("#")[1]

    if ((targetPath === "" || targetPath === pathname) && targetHash) {
      e.preventDefault()
      const targetElement = document.getElementById(targetHash)
      if (targetElement) {
        gsap.to(window, {
          duration: 1.2,
          scrollTo: { y: targetElement, offsetY: 0 },
          ease: "power3.inOut",
        })
      }
      return
    }

    if (hrefStr !== pathname) {
      e.preventDefault()
      playTransition(hrefStr)
    }
  }

  return (
    <a 
      href={href.toString()} 
      onClick={handleClick} 
      onMouseEnter={handleMouseEnter}
      {...props}
    >
      {children}
    </a>
  )
}

export { TransitionLink };
