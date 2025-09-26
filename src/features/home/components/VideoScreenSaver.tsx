"use client"

import { useRef, useEffect } from 'react'

interface VideoScreenSaverProps {
  isVisible: boolean
  onVideoClick?: () => void
}

export function VideoScreenSaver({ isVisible, onVideoClick }: VideoScreenSaverProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (isVisible) {
      video.currentTime = 0
      video.play()
    } else {
      video.pause()
    }
  }, [isVisible])

  if (!isVisible) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black cursor-pointer"
      onClick={onVideoClick}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
      >
        <source src="/SLW_Final3.0.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Subtle overlay with instructions */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white text-center px-4">
        <div className="bg-black/40 backdrop-blur-sm rounded-2xl px-6 py-3 border border-white/10">
          <p className="text-sm font-['Montserrat'] font-light opacity-80 animate-pulse">
            Click anywhere or press &quot;Explore Seoul&quot; on controller to continue
          </p>
        </div>
      </div>

      {/* Optional: Add a subtle gradient overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
    </div>
  )
}