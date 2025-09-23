// server/ws-server.ts
// Simple room-based WebSocket relay for Controller ↔ Display
// Run with: `tsx server/ws-server.ts` (or node --loader ts-node/esm ...)

import { WebSocketServer, WebSocket } from 'ws'
import http from 'http'
import { parse } from 'url'

type Msg =
  | { type: 'hello'; role: 'controller' | 'display'; room: string }
  | { type: 'action'; action: 'explore' | 'view-analytics'; room: string }
  | { type: 'ping' }

const server = http.createServer()
const wss = new WebSocketServer({ noServer: true })

// room → sockets
const ROOMS = new Map<string, Set<WebSocket>>()
function getRoom(name: string) {
  if (!ROOMS.has(name)) ROOMS.set(name, new Set())
  return ROOMS.get(name)!
}

wss.on('connection', (ws, request) => {
  const u = parse(request.url || '', true)
  const room = (u.query.room as string) || 'main'
  const bucket = getRoom(room)
  bucket.add(ws)

  console.log(`[WS] connected room=${room} from=${(request.socket as any)?.remoteAddress}`)

  // heartbeat
  ;(ws as any).isAlive = true
  ws.on('pong', () => ((ws as any).isAlive = true))

  ws.on('message', (buf) => {
    let msg: Msg | undefined
    try { msg = JSON.parse(String(buf)) as Msg } catch {}
    if (!msg) return

    if (msg.type === 'action') {
      console.log(`[WS] action=${msg.action} room=${room}`) // ← 추가

      for (const peer of bucket) {
        try { peer.send(JSON.stringify(msg)) } catch {}
      }
    }
    // ignore ping/hello on server
  })

  ws.on('close', () => {
    bucket.delete(ws)
    console.log(`[WS] closed room=${room}`)
  })

  ws.on('error', (err) => {
    console.error('[WS] socket error:', err)
  })
})

server.on('upgrade', (req, socket, head) => {
  const pathname = req.url || ''
  console.log('[UPGRADE]', req.headers.host, pathname)
  if (pathname.startsWith('/ws')) {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req)
    })
  } else {
    socket.destroy()
  }
})

// heartbeat sweep
const interval = setInterval(() => {
  for (const bucket of ROOMS.values()) {
    for (const ws of bucket) {
      if (!(ws as any).isAlive) { try { ws.terminate() } catch {} ; continue }
      ;(ws as any).isAlive = false
      try { ws.ping() } catch {}
    }
  }
}, 30_000)

const PORT = Number(process.env.WS_PORT || 3001)
const HOST = process.env.WS_HOST || '0.0.0.0' // bind all interfaces for iPad access
server.listen(PORT, HOST, () => {
  console.log(`WS server listening on ws://${HOST}:${PORT}/ws`)
})

process.on('SIGINT', () => { clearInterval(interval); process.exit(0) })
