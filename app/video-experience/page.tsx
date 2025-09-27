'use client'

import React, { useEffect, useState } from 'react'

export default function VideoExperiencePage() {
  const [isVideoReady, setIsVideoReady] = useState(false)
  const [videoStatus, setVideoStatus] = useState<'loading' | 'playing' | 'stopped'>('loading')
  const [showUnmutePrompt, setShowUnmutePrompt] = useState(false)

  useEffect(() => {
    console.log('[VideoPage] Video experience page mounted')

    // Signal that the video page is ready
    setIsVideoReady(true)

    // Force video overlay initialization with multiple attempts
    const initializeVideo = () => {
      console.log('[VideoPage] Initializing video overlay...')

      // Try to get video element
      const videoEl = document.getElementById('global-video-overlay-video')
      if (videoEl) {
        console.log('[VideoPage] Video overlay found, ready for playback')
        setVideoStatus('stopped') // Ready for playback
      } else {
        console.log('[VideoPage] Video overlay not found, will retry...')
        // Retry after a short delay
        setTimeout(initializeVideo, 200)
      }
    }

    // Start initialization after page is mounted
    setTimeout(initializeVideo, 100)

    // Listen for video status events
    const handleVideoPlaying = () => {
      console.log('[VideoPage] Video playing event received')
      setVideoStatus('playing')

      // Check if video is muted and show unmute prompt
      setTimeout(() => {
        const video = document.getElementById('global-video-overlay-video') as HTMLVideoElement | null
        if (video && video.muted && !video.paused) {
          setShowUnmutePrompt(true)
        }
      }, 1000) // Give video time to start
    }
    const handleVideoStopped = () => {
      console.log('[VideoPage] Video stopped event received')
      setVideoStatus('stopped')
    }
    const handleVideoEnded = () => {
      console.log('[VideoPage] Video ended event received')
      setVideoStatus('stopped')
    }

    window.addEventListener('video:status:playing', handleVideoPlaying)
    window.addEventListener('video:status:stopped', handleVideoStopped)
    window.addEventListener('video:status:ended', handleVideoEnded)

    // Clean up video when component unmounts
    return () => {
      window.removeEventListener('video:status:playing', handleVideoPlaying)
      window.removeEventListener('video:status:stopped', handleVideoStopped)
      window.removeEventListener('video:status:ended', handleVideoEnded)

      // Stop video when leaving page
      window.dispatchEvent(new CustomEvent('remote-video', {
        detail: { cmd: 'stop' }
      }))
    }
  }, [])

  const handleUnmute = () => {
    console.log('[VideoPage] User clicked to unmute video')
    const video = document.getElementById('global-video-overlay-video') as HTMLVideoElement | null
    if (video && video.muted) {
      video.muted = false
      video.volume = 1
      console.log('[VideoPage] Video unmuted successfully')
      setShowUnmutePrompt(false)
    }
  }

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* Full screen black background for clean video viewing */}
      <div className="absolute inset-0 bg-black z-0" />

      {/* Video overlay will be rendered by DisplayBridgeClient */}
      {/* The global video overlay handles all video display */}

      {/* Loading/Status indicator */}
      {videoStatus === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-white text-2xl font-light animate-pulse">
            Preparing video experience...
          </div>
        </div>
      )}

      {/* Video controls hint - only show when video is ready */}
      {videoStatus !== 'loading' && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
          <div className="text-white/60 text-sm text-center bg-black/30 px-4 py-2 rounded-lg backdrop-blur-sm">
            {videoStatus === 'playing'
              ? "🎬 Video playing - Use controller to stop"
              : "⏹️ Video ready - Use controller to play"}
          </div>
        </div>
      )}

      {/* Unmute prompt overlay */}
      {showUnmutePrompt && (
        <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/30 backdrop-blur-sm">
          <button
            onClick={handleUnmute}
            className="bg-gradient-to-r from-cyan-600 to-purple-600 text-white px-8 py-4 rounded-2xl font-bold text-xl shadow-2xl hover:from-cyan-500 hover:to-purple-500 transition-all duration-300 transform hover:scale-105 border border-white/20"
          >
            <div className="flex items-center gap-3">
              <span>🔊</span>
              <span>Click to Enable Audio</span>
            </div>
          </button>
        </div>
      )}

      {/* Seoul SAIF branding */}
      <div className="absolute top-8 left-8 z-20">
        <div className="text-white/80 text-lg font-light">
          Seoul SAIF Visualization
        </div>
        <div className="text-white/60 text-sm">
          Card Sales Data Experience
        </div>
      </div>
    </div>
  )
}