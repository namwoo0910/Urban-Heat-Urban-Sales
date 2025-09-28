'use client'

import React, { useCallback, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useWS } from '@shared/hooks/useWS'

// DOM Overlay helpers
function ensureOverlay() {
  let root = document.getElementById('global-video-overlay')
  if (!root) {
    root = document.createElement('div')
    root.id = 'global-video-overlay'
    Object.assign(root.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      background: 'black',
      zIndex: '99999', // Increased z-index
      display: 'none', // hidden by default
      opacity: '0',
    } as CSSStyleDeclaration)
    document.body.appendChild(root)

    const video = document.createElement('video')
    video.id = 'global-video-overlay-video'
    Object.assign(video.style, {
      width: '100%',
      height: '100%',
      objectFit: 'contain',
    } as CSSStyleDeclaration)
    video.setAttribute('playsinline', '')
    video.setAttribute('webkit-playsinline', '')
    video.muted = true // Start muted to comply with autoplay policy
    video.volume = 1
    video.preload = 'auto'
    root.appendChild(video)

    console.log('[OverlayDOM] created with higher z-index')
  } else {
    // Ensure existing overlay has correct styles
    Object.assign(root.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      zIndex: '99999',
    } as CSSStyleDeclaration)
  }
  return root as HTMLDivElement
}

function getVideoEl(): HTMLVideoElement | null {
  return document.getElementById('global-video-overlay-video') as HTMLVideoElement | null
}

function showOverlay() {
  const el = document.getElementById('global-video-overlay')
  if (el) {
    el.style.display = 'block'
    el.style.opacity = '1'
    el.style.transition = 'opacity 0.3s ease'
  }
}

function hideOverlay() {
  const el = document.getElementById('global-video-overlay')
  if (el) {
    el.style.opacity = '0'
    el.style.transition = 'opacity 0.3s ease'
    setTimeout(() => {
      if (el.style.opacity === '0') {
        el.style.display = 'none'
      }
    }, 300)
  }
}

export default function DisplayBridgeClient() {
  const router = useRouter()
  const pathname = usePathname()

  // Check if should be disabled, but don't return early (hooks must be called consistently)
  const isControllerPath = pathname.startsWith('/controller')
  
  // Track display state for synchronization
  const lastPathRef = useRef<string>('')
  const hasExploredRef = useRef<boolean>(false)
  const lastSyncTimeRef = useRef<number>(0)

  // 1) DOM 오버레이를 항상 준비 + 이벤트 리스너 연결
  useEffect(() => {
    // Skip if on controller path
    if (isControllerPath) {
      console.log('[Bridge] disabled on /controller')
      return
    }

    console.log('[Bridge] Initializing video overlay on path:', pathname)

    // 오버레이 DOM 생성/보장 - especially important for video page
    const root = ensureOverlay()
    const video = getVideoEl()
    if (!video) {
      console.error('[Bridge] Failed to create video element')
      return
    }

    console.log('[Bridge] Video overlay initialized successfully')

    // If this is the video experience page, ensure overlay is visible and ready
    if (pathname === '/video-experience') {
      console.log('[Bridge] Video experience page detected, preparing overlay')
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        const videoCheck = getVideoEl()
        if (videoCheck) {
          console.log('[Bridge] Video element confirmed ready for video experience page')
        } else {
          console.warn('[Bridge] Video element missing on video experience page, recreating...')
          ensureOverlay()
        }
      }, 50)
    }

    // 상태 덤프 유틸
    const RS = ['HAVE_NOTHING','HAVE_METADATA','HAVE_CURRENT_DATA','HAVE_FUTURE_DATA','HAVE_ENOUGH_DATA'] as const
    const dump = (label: string) => {
      console.log('[VideoDOM]', label, {
        readyState: video.readyState, RS: RS[video.readyState] ?? video.readyState,
        networkState: video.networkState,
        currentTime: Number.isFinite(video.currentTime) ? video.currentTime.toFixed(2) : video.currentTime,
        paused: video.paused, ended: video.ended, src: video.currentSrc
      })
    }

    // remote-video 수신 → 재생/정지
    const onCmd = (e: Event) => {
      const { cmd, src } =
        (e as CustomEvent<{ cmd: 'play' | 'pause' | 'stop'; src?: string }>).detail || {}
      console.log('[OverlayDOM] Received command:', cmd, 'with src:', src)

      if (cmd === 'play') {
        console.log('[OverlayDOM] << remote-video:play', src)

        // Ensure overlay and video element exist, recreate if needed
        ensureOverlay()
        const currentVideo = getVideoEl()
        if (!currentVideo) {
          console.error('[OverlayDOM] Video element not found even after ensuring overlay')
          window.dispatchEvent(new CustomEvent('video:status:error'))
          return
        }

        // If video is paused and no new src, just resume
        if (!src && currentVideo.src && currentVideo.paused && currentVideo.currentTime > 0) {
          console.log('[OverlayDOM] Resuming paused video')
          try {
            const p = currentVideo.play()
            if (p && typeof p.then === 'function') {
              p.then(() => {
                console.log('[OverlayDOM] Resume play() resolved')
                window.dispatchEvent(new CustomEvent('video:status:playing'))
              })
              .catch(err => {
                console.warn('[OverlayDOM] Resume play() rejected', err)
                window.dispatchEvent(new CustomEvent('video:status:error'))
              })
            } else {
              window.dispatchEvent(new CustomEvent('video:status:playing'))
            }
          } catch (err) {
            console.error('[OverlayDOM] Resume play() threw', err)
            window.dispatchEvent(new CustomEvent('video:status:error'))
          }
          return
        }

        // Starting fresh or new video
        if (src) {
          const abs = src.startsWith('/') ? src : `/${src}`
          console.log('[OverlayDOM] Setting video src:', abs)
          console.log('[OverlayDOM] Video element state before:', {
            src: currentVideo.src,
            readyState: currentVideo.readyState,
            paused: currentVideo.paused,
            currentTime: currentVideo.currentTime
          })

          // Always reload when new src is provided to ensure proper playback
          currentVideo.pause()
          currentVideo.currentTime = 0
          currentVideo.src = abs
          currentVideo.load()
          console.log('[OverlayDOM] src set + load() completed')

          console.log('[OverlayDOM] Video element state after load:', {
            src: currentVideo.src,
            readyState: currentVideo.readyState,
            paused: currentVideo.paused,
            currentTime: currentVideo.currentTime
          })
        } else {
          console.warn('[OverlayDOM] No video src provided')
        }

        try {
          ;(currentVideo as any).playsInline = true
          currentVideo.setAttribute('webkit-playsinline', '')

          // Ensure overlay is properly created and shown
          ensureOverlay()
          showOverlay()
          console.log('[OverlayDOM] Overlay should now be visible')

          // Wait for video to be ready before attempting play
          const startPlayback = () => {
            console.log('[OverlayDOM] startPlayback called, readyState:', currentVideo.readyState)
            // Check if video is ready for playback
            if (currentVideo.readyState < 2) { // HAVE_CURRENT_DATA
              console.log('[OverlayDOM] Video not ready (readyState:', currentVideo.readyState, '), waiting...')
              setTimeout(startPlayback, 100)
              return
            }

            // Always start muted for reliable autoplay
            currentVideo.muted = true
            console.log('[OverlayDOM] Attempting to play video...')
            const p = currentVideo.play()
            if (p && typeof p.then === 'function') {
              p.then(() => {
                console.log('[OverlayDOM] Muted video playback started successfully')
                window.dispatchEvent(new CustomEvent('video:status:playing'))
              })
               .catch(err => {
                 console.error('[OverlayDOM] Even muted playback failed:', err)
                 currentVideo.setAttribute('controls', 'true')
                 console.log('[OverlayDOM] Playback failed; controls shown for manual interaction')
                 window.dispatchEvent(new CustomEvent('video:status:error'))
               })
            } else {
              console.log('[OverlayDOM] play() called (no promise), keeping video muted for autoplay compliance')
              // Keep video muted - user will need to click the unmute button on the display
              window.dispatchEvent(new CustomEvent('video:status:playing'))
            }
          }

          // Start playback with sufficient delay for video to initialize
          console.log('[OverlayDOM] Starting playback timer...')
          setTimeout(startPlayback, 200)
        } catch (err) {
          console.error('[OverlayDOM] play() threw', err)
          window.dispatchEvent(new CustomEvent('video:status:error'))
        }
        return
      }

      if (cmd === 'pause') {
        console.log('[OverlayDOM] << remote-video:pause')
        const currentVideo = getVideoEl()
        if (currentVideo && !currentVideo.paused) {
          currentVideo.pause()
          dump('after pause')
          // Broadcast video paused status
          window.dispatchEvent(new CustomEvent('video:status:paused'))
        }
        return
      }

      if (cmd === 'stop') {
        console.log('[OverlayDOM] << remote-video:stop')
        const currentVideo = getVideoEl()
        if (currentVideo) {
          currentVideo.pause()
          currentVideo.currentTime = 0
          dump('after stop')
        }
        hideOverlay()
        // Broadcast video stopped status
        window.dispatchEvent(new CustomEvent('video:status:stopped'))
        return
      }
    }

    window.addEventListener('remote-video', onCmd as EventListener)
    console.log('[OverlayDOM] listener attached for "remote-video"')

    // 비디오 이벤트 로깅(중요 이벤트만)
    const log = (ev: Event) => {
      const video = ev.target as HTMLVideoElement
      console.log(`[VideoDOM] ${ev.type}`, {
        currentTime: video.currentTime.toFixed(2),
        duration: video.duration.toFixed(2),
        buffered: video.buffered.length > 0 ? `${video.buffered.start(0).toFixed(2)}-${video.buffered.end(0).toFixed(2)}` : 'none',
        networkState: video.networkState,
        readyState: video.readyState,
        paused: video.paused,
        ended: video.ended
      })
      dump(ev.type)
    }
    const onError = () => {
      console.error('[OverlayDOM] video error', (video as any).error);
      dump('error')
      // Broadcast video error status
      window.dispatchEvent(new CustomEvent('video:status:error'))
    }
    const onEnded = () => {
      console.log('[OverlayDOM] VIDEO ENDED - currentTime:', video.currentTime, 'duration:', video.duration);
      hideOverlay();
      // Broadcast video stopped status
      window.dispatchEvent(new CustomEvent('video:status:stopped'))
    }

    // Add specific pause handler to catch unexpected pauses
    const onPause = (ev: Event) => {
      const video = ev.target as HTMLVideoElement
      console.log('[VideoDOM] VIDEO PAUSED - investigating cause', {
        currentTime: video.currentTime.toFixed(2),
        duration: video.duration.toFixed(2),
        ended: video.ended,
        error: video.error,
        networkState: video.networkState,
        readyState: video.readyState,
        muted: video.muted,
        volume: video.volume,
        autoplay: video.autoplay
      })

      // If video paused unexpectedly and we're not at the end, log more details
      if (!video.ended && video.currentTime > 0 && video.currentTime < video.duration - 1) {
        console.warn('[VideoDOM] UNEXPECTED PAUSE detected - this may be due to autoplay policy violation')

        // Check if it's a buffering issue
        if (video.readyState < 3) {
          console.warn('[VideoDOM] Video paused due to buffering (readyState:', video.readyState, ')')
        }

        // Check if it's an audio policy issue
        if (!video.muted) {
          console.warn('[VideoDOM] Video paused while unmuted - may be autoplay policy restriction')
        }
      }

      dump(ev.type)
    }

    video.addEventListener('loadstart', log)
    video.addEventListener('loadedmetadata', log)
    video.addEventListener('canplay', log)
    video.addEventListener('playing', log)
    video.addEventListener('pause', onPause)
    video.addEventListener('ended', onEnded)
    video.addEventListener('error', onError)

    // 수동 테스트 유틸 제공
    ;(window as any).__playTest = () => {
      window.dispatchEvent(new CustomEvent('remote-video', { detail: { cmd: 'play', src: '/0923.mp4' } }))
    }
    ;(window as any).__pauseTest = () => {
      window.dispatchEvent(new CustomEvent('remote-video', { detail: { cmd: 'pause' } }))
    }

    return () => {
      window.removeEventListener('remote-video', onCmd as EventListener)
      video.removeEventListener('loadstart', log)
      video.removeEventListener('loadedmetadata', log)
      video.removeEventListener('canplay', log)
      video.removeEventListener('playing', log)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('ended', onEnded)
      video.removeEventListener('error', onError)
      // DOM은 유지(전역 오버레이), 원하면 아래 주석 해제로 제거 가능
      // root.remove()
      console.log('[OverlayDOM] listener removed')
    }
  }, [pathname, isControllerPath]) // Re-run when pathname changes to ensure overlay exists

  // 2) WS → 어디서든 수신  
  const onAction = useCallback((action: string) => {
    // Skip if on controller path
    if (isControllerPath) {
      return
    }
    
    console.log('[Bridge] onAction ->', action)

    // Handle state synchronization requests
    if (action === 'sync:request-state') {
      // Broadcast current display state to controller
      if (sendActionRef.current) {
        sendActionRef.current(`display:state:page:${pathname}`)
        if (hasExploredRef.current) {
          sendActionRef.current('display:state:explored')
        }
      }
      return
    }

    if (action.startsWith('display:navigate:')) {
      const path = action.replace('display:navigate:', '')
      console.log('[Bridge] navigate ->', path)

      // If navigating away from video page while video is playing, hide overlay
      if (pathname === '/video-experience' && path !== '/video-experience') {
        console.log('[Bridge] Navigating away from video page, hiding overlay')
        hideOverlay()
        const video = getVideoEl()
        if (video && !video.paused) {
          console.log('[Bridge] Pausing video during navigation')
          video.pause()
          // Broadcast that video was paused due to navigation
          window.dispatchEvent(new CustomEvent('video:status:paused'))
        }
      }

      router.replace(path)
      return
    }

    if (action.startsWith('display:video:play')) {
      let src = ''
      if (action.includes(';src=')) {
        // Handle format: display:video:play;src=/path/to/video.mp4
        const srcPart = action.split(';src=')[1]
        src = srcPart ? decodeURIComponent(srcPart) : ''
      } else if (action.startsWith('display:video:play:')) {
        // Handle format: display:video:play:/path/to/video.mp4
        src = action.slice('display:video:play:'.length)
      }
      const cmd = { cmd: 'play' as const, src, ts: Date.now() }
      console.log('[Bridge] dispatch remote-video', cmd)
      window.dispatchEvent(new CustomEvent('remote-video', { detail: cmd }))
      return
    }
    if (action === 'display:video:pause') {
      const cmd = { cmd: 'pause' as const, ts: Date.now() }
      console.log('[Bridge] dispatch remote-video', cmd)
      window.dispatchEvent(new CustomEvent('remote-video', { detail: cmd }))
      return
    }
    if (action === 'display:video:stop') {
      const cmd = { cmd: 'stop' as const, ts: Date.now() }
      console.log('[Bridge] dispatch remote-video', cmd)
      window.dispatchEvent(new CustomEvent('remote-video', { detail: cmd }))
      return
    }

    if (action === 'display:ai:predict') {
    const want = '/research/local-economy?noIntro=1'
    const here = typeof window !== 'undefined' ? window.location.pathname + window.location.search : ''
    if (!here.startsWith('/research/local-economy')) {
        console.log('[Bridge] ai:predict -> navigate with noIntro')
        router.replace(want)
        setTimeout(() => window.dispatchEvent(new CustomEvent('viz:local-economy:ai-predict')), 250)
    } else {
        window.dispatchEvent(new CustomEvent('viz:local-economy:ai-predict'))
    }
    return
    }


    if (action.startsWith('display:ai:set-temp:')) {
    const raw = action.slice('display:ai:set-temp:'.length)
    const delta = parseInt(raw, 10)
    console.log('[Bridge] ai:set-temp', delta)
    window.dispatchEvent(new CustomEvent('viz:local-economy:ai-set-temp', { detail: { delta } }))
    return
    }

    if (action.startsWith('display:ai:play:')) {
    const raw = action.slice('display:ai:play:'.length)
    const days = parseInt(raw, 10)
    console.log('[Bridge] ai:play', days)
    window.dispatchEvent(new CustomEvent('viz:local-economy:ai-play', { detail: { days } }))
    return
    }

    if (action === 'explore') {
      console.log('[Bridge] explore action received, current path:', window.location.pathname)

      // Always redirect to /display and trigger animation
      console.log('[Bridge] Redirecting to /display then triggering hero:explore')
      router.replace('/display')
      setTimeout(() => {
        console.log('[Bridge] dispatching hero:explore event')
        console.log('[Bridge] current pathname:', window.location.pathname)
        window.dispatchEvent(new CustomEvent('hero:explore'))
      }, 500)
      return
    }
  

    if (action === 'display:video:close') {
    const v = document.getElementById('global-video-overlay-video') as HTMLVideoElement | null
    const root = document.getElementById('global-video-overlay') as HTMLDivElement | null
    if (v) v.pause()
    if (root) {
      root.style.opacity = '0'
      root.addEventListener('transitionend', function onEnd() {
        root.removeEventListener('transitionend', onEnd)
        root.style.display = 'none'
      })
    }
    return
    }

    if (action === 'display:video:mute:on') {
        const v = document.getElementById('global-video-overlay-video') as HTMLVideoElement | null
        if (v) v.muted = true
        return
    }

    if (action === 'display:video:mute:off') {
        const v = document.getElementById('global-video-overlay-video') as HTMLVideoElement | null
        if (!v) return

        console.log('[Bridge] Attempting to unmute video with user gesture')
        // ⬇️ 오디오 언락 시도 (should work since this is triggered by user gesture)
        v.muted = false
        v.volume = 1

        // Only try to play if video is paused (don't interrupt if already playing)
        if (v.paused) {
          try {
            v.play()?.catch((err) => {
              console.warn('[Bridge] Play after unmute failed:', err)
            })
          } catch (err) {
            console.warn('[Bridge] Play after unmute threw:', err)
          }
        }

        console.log('[Bridge] Video unmuted, muted:', v.muted, 'volume:', v.volume)
        return
    }

    if (action === 'display:reset:all') {
      console.log('[Bridge] Resetting display to initial state')

      // Stop any playing video
      const video = document.getElementById('global-video-overlay-video') as HTMLVideoElement | null
      if (video && !video.paused) {
        video.pause()
        video.currentTime = 0
      }

      // Hide video overlay
      const overlay = document.getElementById('global-video-overlay')
      if (overlay) {
        overlay.style.opacity = '0'
        overlay.style.display = 'none'
      }

      // Navigate back to home page
      router.replace('/display')

      // Re-enable screen saver by dispatching enable event
      window.dispatchEvent(new CustomEvent('display:enableScreenSaver'))

      console.log('[Bridge] Display reset completed')
      return
    }

    if (action === 'display:research:landing') {
    const want = '/research/local-economy?intro=1'
    const here = window.location.pathname + window.location.search
    if (!here.startsWith('/research/local-economy')) {
        router.replace(want)
        setTimeout(() => window.dispatchEvent(new CustomEvent('viz:local-economy:landing')), 200)
    } else {
        window.dispatchEvent(new CustomEvent('viz:local-economy:landing'))
    }
    return
    }

    if (action.startsWith('display:navigate:/research/eda')) {
    const want = '/research/eda?noIntro=1'
    if (window.location.pathname + window.location.search !== want) {
        router.replace(want)
    }
    return
    }    

    if (action.startsWith('display:eda:select:')) {
    const parts = action.split(':') // display:eda:select:<level>:<code>[:<name>]
    const level = parts[3] as 'district' | 'neighborhood'
    const code = parts[4] || ''
    const name = decodeURIComponent(parts[5] || '')
    window.dispatchEvent(new CustomEvent('viz:eda:select', { detail: { level, code, name } }))
    return
    }

    if (action.startsWith('display:ai:set-temp-scenario:')) {
    const scenario = action.slice('display:ai:set-temp-scenario:'.length)
    console.log('[Bridge] ai:set-temp-scenario', scenario)
    window.dispatchEvent(new CustomEvent('viz:prediction:temp-scenario', { detail: { scenario } }))
    return
    }

    if (action.startsWith('display:ai:start-animation:')) {
    const type = action.slice('display:ai:start-animation:'.length) as '7days' | '31days'
    console.log('[Bridge] ai:start-animation', type)
    window.dispatchEvent(new CustomEvent('viz:prediction:start-animation', { detail: { type } }))
    return
    }

    if (action === 'display:ai:stop-animation') {
    console.log('[Bridge] ai:stop-animation')
    window.dispatchEvent(new CustomEvent('viz:prediction:stop-animation'))
    return
    }

    if (action === 'display:animation:toggle-daily') {
    console.log('[Bridge] animation:toggle-daily')
    window.dispatchEvent(new CustomEvent('viz:local-economy:toggle-daily-animation'))
    return
    }

    }, [router, pathname, isControllerPath])

  // Store sendAction ref for state sync
  const sendActionRef = useRef<((action: string) => void) | null>(null)
  const { sendAction } = useWS({ role: 'display', room: 'main', onAction })
  sendActionRef.current = sendAction

  // Track page changes for sync requests only (disabled automatic syncing to fix connection issues)
  useEffect(() => {
    if (isControllerPath) return
    lastPathRef.current = pathname
    console.log('[Bridge] Page tracked but not auto-synced:', pathname)
  }, [pathname, isControllerPath])

  // Listen for hero explore events to track exploration state (only sync on request)
  useEffect(() => {
    if (isControllerPath) return

    const onHeroExplore = () => {
      hasExploredRef.current = true
      console.log('[Bridge] Hero explored, state tracked but not auto-synced')
    }

    window.addEventListener('hero:explore', onHeroExplore)
    return () => window.removeEventListener('hero:explore', onHeroExplore)
  }, [isControllerPath])

  // 이 컴포넌트 자체는 UI를 렌더할 필요 없음
  return null
}
