import type { WebSocket, WebSocketServer } from 'ws'

interface PublicMessage {
  id: string
  nickname: string
  text: string
  ts: number
}

interface PublicRoomEntry {
  sockets: Map<WebSocket, { nickname: string; sid: string }>
  messages: PublicMessage[]
  name: string
  maxMessages: number
}

const RATE_LIMIT = 30
const MAX_PEERS = 50
const DEFAULT_MAX_MESSAGES = 1000

export interface PublicHubOptions {
  wss: WebSocketServer
  log?: (msg: string) => void
}

export class PublicHub {
  private wss: WebSocketServer
  private rooms = new Map<string, PublicRoomEntry>()
  private log: (msg: string) => void

  constructor(opts: PublicHubOptions) {
    this.wss = opts.wss
    this.log = opts.log ?? (() => {})
    this.wss.on('connection', (ws, req) => this.handleConnection(ws, req.url ?? '/'))
  }

  private handleConnection(ws: WebSocket, url: string) {
    this.log(`public connect ${url}`)
    const m = url.match(/^\/ws\/p\/([^?]+)\?(.+)$/)
    if (!m) {
      this.send(ws, { t: 'error', reason: 'bad room' })
      ws.close(4000, 'bad room')
      return
    }
    const roomId = decodeURIComponent(m[1]).slice(0, 128)
    const params = new URLSearchParams(m[2])
    const nickname = (params.get('nick') || '').slice(0, 32) || 'anonymous'
    const sid = params.get('sid') || ''

    if (!roomId || !sid) {
      this.send(ws, { t: 'error', reason: 'bad room' })
      ws.close(4000, 'bad room')
      return
    }

    this.log(`public join room=${roomId} nick=${nickname}`)
    let entry = this.rooms.get(roomId)
    if (!entry) {
      this.send(ws, { t: 'error', reason: 'not found' })
      ws.close(4000, 'room not found')
      return
    }

    if (entry.sockets.size >= MAX_PEERS) {
      this.send(ws, { t: 'error', reason: 'full' })
      ws.close(4001, 'room full')
      return
    }

    entry.sockets.set(ws, { nickname, sid })

    let tokens = RATE_LIMIT
    setInterval(() => {
      tokens = RATE_LIMIT
    }, 1000).unref?.()

    this.send(ws, {
      t: 'welcome',
      peers: entry.sockets.size,
      name: entry.name,
      history: entry.messages,
    })
    this.broadcast(entry, ws, { t: 'join', nickname, peers: entry.sockets.size })

    ws.on('message', (raw) => {
      if (Buffer.isBuffer(raw) && raw.length > 64 * 1024) {
        ws.close(4002, 'too big')
        return
      }
      let msg: unknown
      try {
        msg = JSON.parse(raw.toString())
      } catch {
        ws.close(4003, 'bad json')
        return
      }
      const m = msg as { t?: string; text?: string }
      if (m.t === 'msg') {
        if (tokens <= 0) {
          this.send(ws, { t: 'error', reason: 'rate' })
          return
        }
        tokens--
        const text = (m.text || '').trim()
        if (!text) return
        const message: PublicMessage = {
          id: Math.random().toString(36).slice(2, 12),
          nickname,
          text,
          ts: Date.now(),
        }
        entry.messages.push(message)
        if (entry.messages.length > entry.maxMessages) {
          entry.messages = entry.messages.slice(-entry.maxMessages)
        }
        this.broadcast(entry, null, { t: 'msg', ...message })
      }
    })

    const cleanup = () => {
      if (!entry.sockets.has(ws)) return
      entry.sockets.delete(ws)
      this.log(`public leave room=${roomId} peers=${entry.sockets.size}`)
      this.broadcast(entry, null, { t: 'leave', nickname, peers: entry.sockets.size })
      if (entry.sockets.size === 0) {
        setTimeout(() => {
          if (entry.sockets.size === 0) {
            this.rooms.delete(roomId)
            this.log(`public room=${roomId} cleaned up`)
          }
        }, 30 * 60 * 1000)
      }
    }
    ws.on('close', cleanup)
    ws.on('error', cleanup)
  }

  createRoom(roomId: string, name: string): boolean {
    if (this.rooms.has(roomId)) return false
    this.rooms.set(roomId, {
      sockets: new Map(),
      messages: [],
      name,
      maxMessages: DEFAULT_MAX_MESSAGES,
    })
    this.log(`public room created: ${roomId} "${name}"`)
    return true
  }

  listRooms(): { roomId: string; name: string; peers: number; messages: number }[] {
    const result: { roomId: string; name: string; peers: number; messages: number }[] = []
    for (const [roomId, entry] of this.rooms) {
      result.push({
        roomId,
        name: entry.name,
        peers: entry.sockets.size,
        messages: entry.messages.length,
      })
    }
    return result.sort((a, b) => b.peers - a.peers)
  }

  kickRoom(roomId: string): boolean {
    const entry = this.rooms.get(roomId)
    if (!entry) return false
    for (const sock of entry.sockets.keys()) {
      try {
        sock.close(4030, 'kicked')
      } catch {
        /* ignore */
      }
    }
    this.rooms.delete(roomId)
    return true
  }

  private broadcast(entry: PublicRoomEntry, except: WebSocket | null, payload: object) {
    const data = JSON.stringify(payload)
    for (const [sock] of entry.sockets) {
      if (sock === except) continue
      if (sock.readyState === sock.OPEN) {
        try {
          sock.send(data)
        } catch {
          /* ignore */
        }
      }
    }
  }

  private send(ws: WebSocket, payload: object) {
    if (ws.readyState === ws.OPEN) {
      try {
        ws.send(JSON.stringify(payload))
      } catch {
        /* ignore */
      }
    }
  }
}
