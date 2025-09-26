'use client'

import React, { useCallback, useEffect } from 'react'
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
      inset: '0',
      background: 'black',
      zIndex: '9999',
      display: 'none', // hidden by default
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
    video.muted = true // autoplay policy
    video.preload = 'auto'
    root.appendChild(video)

    console.log('[OverlayDOM] created')
  }
  return root as HTMLDivElement
}

function getVideoEl(): HTMLVideoElement | null {
  return document.getElementById('global-video-overlay-video') as HTMLVideoElement | null
}

function showOverlay() {
  const el = document.getElementById('global-video-overlay')
  if (el) el.style.display = 'block'
}

function hideOverlay() {
  const el = document.getElementById('global-video-overlay')
  if (el) el.style.display = 'none'
}

export default function DisplayBridgeClient() {
  const router = useRouter()
  const pathname = usePathname()

  // Check if should be disabled, but don't return early (hooks must be called consistently)
  const isControllerPath = pathname.startsWith('/controller')

  // 1) DOM 오버레이를 항상 준비 + 이벤트 리스너 연결
  useEffect(() => {
    // Skip if on controller path
    if (isControllerPath) {
      console.log('[Bridge] disabled on /controller')
      return
    }
    // 오버레이 DOM 생성/보장
    const root = ensureOverlay()
    const video = getVideoEl()
    if (!video) return

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
        (e as CustomEvent<{ cmd: 'play' | 'pause'; src?: string }>).detail || {}
      if (!video) return

      if (cmd === 'play') {
        console.log('[OverlayDOM] << remote-video:play', src)
        if (src) {
          const abs = src.startsWith('/') ? src : `/${src}`
          if (video.getAttribute('data-src') !== abs) {
            video.setAttribute('data-src', abs)
            video.src = abs
            video.load()
            dump('src set + load()')
          }
        }
        try {
          video.muted = true
          ;(video as any).playsInline = true
          showOverlay()
          const p = video.play()
          if (p && typeof p.then === 'function') {
            p.then(() => { console.log('[OverlayDOM] play() resolved'); dump('after play resolve') })
             .catch(err => { console.warn('[OverlayDOM] play() rejected', err); video.setAttribute('controls', 'true'); dump('play rejected; controls shown') })
          } else {
            console.log('[OverlayDOM] play() called (no promise)')
          }
        } catch (err) {
          console.error('[OverlayDOM] play() threw', err)
        }
        return
      }

      if (cmd === 'pause') {
        console.log('[OverlayDOM] << remote-video:pause')
        video.pause()
        // Keep overlay visible to show paused frame
        // hideOverlay()
        dump('after pause')
        return
      }
    }

    window.addEventListener('remote-video', onCmd as EventListener)
    console.log('[OverlayDOM] listener attached for "remote-video"')

    // 비디오 이벤트 로깅(중요 이벤트만)
    const log = (ev: Event) => dump(ev.type)
    const onError = () => { console.error('[OverlayDOM] video error', (video as any).error); dump('error') }
    const onEnded = () => { console.log('[OverlayDOM] ended → hide'); hideOverlay() }

    video.addEventListener('loadstart', log)
    video.addEventListener('loadedmetadata', log)
    video.addEventListener('canplay', log)
    video.addEventListener('playing', log)
    video.addEventListener('pause', log)
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
      video.removeEventListener('pause', log)
      video.removeEventListener('ended', onEnded)
      video.removeEventListener('error', onError)
      // DOM은 유지(전역 오버레이), 원하면 아래 주석 해제로 제거 가능
      // root.remove()
      console.log('[OverlayDOM] listener removed')
    }
  }, [pathname, isControllerPath])

  // 2) WS → 어디서든 수신
  const onAction = useCallback((action: string) => {
    // Skip if on controller path
    if (isControllerPath) {
      return
    }
    
    console.log('[Bridge] onAction ->', action)

    if (action.startsWith('display:navigate:')) {
      const path = action.replace('display:navigate:', '')
      console.log('[Bridge] navigate ->', path)
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
      console.log('[Bridge] explore -> /display then hero:explore')
      router.replace('/display')
      setTimeout(() => window.dispatchEvent(new CustomEvent('hero:explore')), 150)
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
        // ⬇️ 오디오 언락 시도
        v.muted = false
        v.volume = 1
        try { v.play()?.catch(() => {}) } catch {}
        // 언락이 안된 경우를 대비해 안내 토스트 보여주기
        const tip = document.getElementById('global-video-audio-tip')
        if (tip) tip.style.display = 'block'
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

    }, [router])

  useWS({ role: 'display', room: 'main', onAction })

  // 이 컴포넌트 자체는 UI를 렌더할 필요 없음
  return null
}
