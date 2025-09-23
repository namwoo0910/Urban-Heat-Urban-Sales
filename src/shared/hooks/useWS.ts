// src/shared/hooks/useWS.ts
'use client'
import { useEffect, useRef, useState, useCallback } from 'react'

export type Action = 'explore' | 'view-analytics'
type OnAction = (a: Action, raw?: unknown) => void

type WSStatus = 'idle' | 'connecting' | 'open' | 'closing' | 'closed'

type UseWSOpts = {
  room?: string
  role?: 'controller' | 'display'
  url?: string                 // ex) ws://192.168.0.6:3001/ws
  heartBeatMs?: number         // default 15s
  reconnect?: boolean
  onAction: OnAction
}

export function useWS({
  room = 'main',
  role = 'display',
  url,
  heartBeatMs = 15_000,
  reconnect = true,
  onAction,
}: UseWSOpts) {
  const wsRef = useRef<WebSocket | null>(null)
  const hbRef = useRef<number | null>(null)
  const retryRef = useRef(0)
  const queueRef = useRef<Array<{ type: 'action'; action: Action }>>([])
  const connectingRef = useRef(false)
  const onActionRef = useRef<OnAction>(onAction)   // 🔴 콜백을 ref에 저장
  onActionRef.current = onAction                   // 최신 콜백으로 갱신

  const [status, setStatus] = useState<WSStatus>('idle')

  const pickBase = useCallback((): string => {
    if (url) return url
    if (typeof window !== 'undefined') {
      const host = window.location.hostname // iPad에서도 PC IP 자동
      return `ws://${host}:3001/ws`
    }
    return `ws://localhost:3001/ws`
  }, [url])

  useEffect(() => {
    let closed = false
    if (connectingRef.current) return
    connectingRef.current = true

    const flushQueue = () => {
      const ws = wsRef.current
      if (!ws || ws.readyState !== WebSocket.OPEN) return
      while (queueRef.current.length) {
        const msg = queueRef.current.shift()!
        try { ws.send(JSON.stringify({ ...msg, room })) } catch {}
      }
    }

    const connect = () => {
      setStatus('connecting')
      const base = pickBase()
      const ws = new WebSocket(`${base}?room=${encodeURIComponent(room)}`)
      wsRef.current = ws

      ws.addEventListener('open', () => {
        setStatus('open')
        retryRef.current = 0
        try { ws.send(JSON.stringify({ type: 'hello', role, room })) } catch {}
        if (heartBeatMs > 0) {
          hbRef.current = window.setInterval(() => {
            try { ws.send(JSON.stringify({ type: 'ping' })) } catch {}
          }, heartBeatMs) as unknown as number
        }
        flushQueue()
      })

      ws.addEventListener('message', (e) => {
        try {
          const msg = JSON.parse(e.data as string)
          if (msg?.type === 'action' && (msg.action === 'explore' || msg.action === 'view-analytics')) {
            onActionRef.current?.(msg.action, msg)   // 🔴 ref에서 호출
          }
        } catch {}
      })

      ws.addEventListener('close', () => {
        setStatus('closed')
        if (hbRef.current) { clearInterval(hbRef.current); hbRef.current = null }
        wsRef.current = null
        if (reconnect && !closed) {
          const n = Math.min(retryRef.current + 1, 6)
          retryRef.current = n
          setTimeout(connect, Math.min(3000 * n, 15000))
        }
      })

      ws.addEventListener('error', (e) => {
        console.warn('[WS] client error', e) // 여기서 close() 호출 금지
      })
    }

    connect()

    return () => {
      closed = true
      setStatus('closing')
      if (hbRef.current) { clearInterval(hbRef.current); hbRef.current = null }
      wsRef.current?.close()
      wsRef.current = null
      setStatus('closed')
      connectingRef.current = false
    }
    // 🔵 의존성에서 onAction 제거 (ref로 처리)
  }, [room, role, pickBase, heartBeatMs, reconnect])

  const sendAction = (action: Action) => {
    const ws = wsRef.current
    const payload = { type: 'action' as const, action }
    if (ws && ws.readyState === WebSocket.OPEN) {
      try { ws.send(JSON.stringify({ ...payload, room })) } catch {}
      return true
    }
    queueRef.current.push(payload) // 연결 전 클릭 큐잉
    return false
  }

  return { sendAction, status, isConnected: status === 'open' }
}
