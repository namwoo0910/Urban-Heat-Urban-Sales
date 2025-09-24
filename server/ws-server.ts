// server/ws-server.ts
import { WebSocketServer, WebSocket } from 'ws'
import http from 'http'
import { parse } from 'url'

type Msg =
  | { type: 'hello'; role: 'controller' | 'display'; room?: string }
  | { type: 'action'; action: string; room?: string } // 문자열 전부 허용
  | { type: 'ping' }

const server = http.createServer()
const wss = new WebSocketServer({ noServer: true })

// room → Set<ws>
const rooms = new Map<string, Set<WebSocket>>()

function joinRoom(ws: WebSocket, room: string) {
  const r = room || 'main'
  ;(ws as any).__room = r
  if (!rooms.has(r)) rooms.set(r, new Set())
  rooms.get(r)!.add(ws)
}

function leaveRoom(ws: WebSocket) {
  const r = (ws as any).__room as string | undefined
  if (r && rooms.has(r)) rooms.get(r)!.delete(ws)
}

wss.on('connection', (ws, req) => {
  ;(ws as any).isAlive = true
  ws.on('pong', () => ((ws as any).isAlive = true))

  // 1) 쿼리로 room 지정 (ws://host:3001/ws?room=main)
  const { query } = parse(req.url || '', true)
  if (query?.room) joinRoom(ws, String(query.room))
  else joinRoom(ws, 'main')

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(String(data)) as Msg
      if (msg.type === 'hello') {
        // 2) hello 메시지로도 room 갱신 가능
        if (msg.room) {
          leaveRoom(ws)
          joinRoom(ws, msg.room)
        }
        return
      }
      if (msg.type === 'action' && typeof msg.action === 'string') {
        const room = (ws as any).__room || 'main'
        const peers = rooms.get(room)
        if (!peers) return
        for (const peer of peers) {
          if (peer !== ws && peer.readyState === WebSocket.OPEN) {
            peer.send(JSON.stringify({ type: 'action', action: msg.action, room }))
          }
        }
      }
    } catch (e) {
      console.warn('[WS] bad message', e)
    }
  })

  ws.on('close', () => leaveRoom(ws))
})

// 업그레이드 핸들러
server.on('upgrade', (req, socket, head) => {
  const { pathname } = parse(req.url || '', true)
  if (pathname !== '/ws') return socket.destroy()
  wss.handleUpgrade(req, socket as any, head, (ws) => {
    wss.emit('connection', ws, req)
  })
})

// 하트비트
setInterval(() => {
  for (const set of rooms.values()) {
    for (const ws of set) {
      if (!(ws as any).isAlive) { try { ws.terminate() } catch {} ; continue }
      ;(ws as any).isAlive = false
      try { ws.ping() } catch {}
    }
  }
}, 30_000)

const PORT = Number(process.env.WS_PORT || 3001)
const HOST = process.env.WS_HOST || '0.0.0.0'
server.listen(PORT, HOST, () => {
  console.log(`WS server listening on ws://${HOST}:${PORT}/ws`)
})
