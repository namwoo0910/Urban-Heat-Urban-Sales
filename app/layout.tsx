import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import DisplayBridgeClient from './DisplayBridgeClient' 

import { Header } from "@/src/shared/components/layout/AppHeader"
import { GsapProvider } from "@/src/shared/providers/GSAPProvider"
import { TransitionProvider } from "@/src/shared/providers/TransitionProvider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Innovate. Create. Inspire.",
  description: "Awwwards-inspired site using Next.js, GSAP, and Three.js",
    generator: 'v0.dev'
}


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={inter.className}>
      <head>
        {/* Connection hints for Mapbox tiles */}
        <link rel="preconnect" href="https://api.mapbox.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://tiles.mapbox.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-[#0a0a0a] text-white">
        <GsapProvider>
          <TransitionProvider>
            <Header />
            <main>{children}</main>
          </TransitionProvider>
        </GsapProvider>
        
        {/* ✅ 전역 WS 브릿지 + 비디오 오버레이 (항상 마운트 / 어떤 라우트에서도 동작) */}
        <DisplayBridgeClient />
      </body>
    </html>
  )
}
