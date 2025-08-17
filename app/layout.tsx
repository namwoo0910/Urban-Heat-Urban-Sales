import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Header } from "@/src/shared/components/layout/AppHeader"
import { Footer } from "@/src/shared/components/layout/AppFooter"
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
        {/* Preload critical resources for faster particle layer loading */}
        <link 
          rel="preload" 
          href="/seoul_boundary.geojson" 
          as="fetch" 
          crossOrigin="anonymous"
          type="application/json"
        />
        {/* Preload Mapbox CSS */}
        <link 
          rel="preload" 
          href="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css" 
          as="style"
        />
        {/* DNS prefetch for external resources */}
        <link rel="dns-prefetch" href="//api.mapbox.com" />
        <link rel="dns-prefetch" href="//tiles.mapbox.com" />
      </head>
      <body className="bg-[#0a0a0a] text-white">
        <GsapProvider>
          <TransitionProvider>
            <Header />
            <main>{children}</main>
            <Footer />
          </TransitionProvider>
        </GsapProvider>
      </body>
    </html>
  )
}
