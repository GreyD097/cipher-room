/**
 * 密室 WebSocket Hub
 * 仅转发密文、维护在线状态，不解析任何业务负载
 */
import type { WebSocket, WebSocketServer } from 'ws'

interface RoomEntry {
  sockets: Set<WebSocket>
}

/** 每房间最大连接数（仅 2 人） */
const MAX_PEERS = 2
/** 每连接每秒最大消息数（超出即丢弃并警告，不断开连接） */
const RATE_LIMIT = 30
/** 单条消息体积上限（base64 编码后） */
const MAX_PAYLOAD = 64 * 1024

export interface HubOptions {
  wss: WebSocketServer
  log?: (msg: string) => void
}

export class CipherHub {
  private wss: WebSocketServer
  private rooms = new Map<string, RoomEntry>()
  private log: (msg: string) => void

  constructor(opts: HubOptions) {
    this.wss = opts.wss
    this.log = opts.log ?? (() => {})
    this.wss.on('connection', (ws, req) => this.handleConnection(ws, req.url ?? '/'))
  }

  private handleConnection(ws: WebSocket, url: string) {
    this.log(`connect ${url}`)
    // 解析房间号：/ws/r/:roomId
    const m = url.match(/^\/ws\/r\/([A-Za-z0-9_-]{1,64})/)
    if (!m) {
      this.log(`bad room url=${url}`)
      this.send(ws, { t: 'error', reason: 'banned' })
      ws.close(4000, 'bad room')
      return
    }
    const roomId = m[1]
    this.log(`join room=${roomId}`)
    const entry = this.rooms.get(roomId) ?? { sockets: new Set<WebSocket>() }
    if (entry.sockets.size >= MAX_PEERS) {
      this.send(ws, { t: 'error', reason: 'full' })
      ws.close(4001, 'room full')
      return
    }
    entry.sockets.add(ws)
    this.rooms.set(roomId, entry)
    this.log(`room=${roomId} peers=${entry.sockets.size}`)

    // 限流：滑动窗口
    let tokens = RATE_LIMIT
    setInterval(() => {
      tokens = RATE_LIMIT
    }, 1000).unref?.()

    this.send(ws, { t: 'welcome', peers: entry.sockets.size - 1, ttl: 60 })
    this.broadcast(entry, ws, { t: 'peer', online: true })

    ws.on('message', (raw) => {
      if (Buffer.isBuffer(raw) && raw.length > MAX_PAYLOAD) {
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
      // 仅对 pub（聊天消息）限流，typing/read 等控制消息不计入
      const m = msg as { t?: string }
      if (m.t === 'pub') {
        if (tokens <= 0) {
          this.send(ws, { t: 'error', reason: 'rate' })
          return
        }
        tokens--
      }
      this.handleMessage(ws, entry, msg)
    })

    const cleanup = () => {
      if (!entry.sockets.has(ws)) return
      entry.sockets.delete(ws)
      this.log(`leave room=${roomId} peers=${entry.sockets.size}`)
      this.broadcast(entry, ws, { t: 'peer', online: false })
      if (entry.sockets.size === 0) this.rooms.delete(roomId)
    }
    ws.on('close', cleanup)
    ws.on('error', cleanup)
  }

  private handleMessage(ws: WebSocket, entry: RoomEntry, msg: unknown) {
    if (!msg || typeof msg !== 'object') return
    const m = msg as { t?: string; payloadB64?: string }
    if (m.t === 'pub' && typeof m.payloadB64 === 'string') {
      // 直接转发密文，不解析
      this.broadcast(entry, ws, { t: 'data', from: 'peer', payloadB64: m.payloadB64 })
      return
    }
    if (m.t === 'bye') {
      ws.close(1000, 'bye')
    }
  }

  private broadcast(entry: RoomEntry, except: WebSocket | null, payload: object) {
    const data = JSON.stringify(payload)
    for (const sock of entry.sockets) {
      if (sock === except) continue
      if (sock.readyState === sock.OPEN) {
        try {
          sock.send(data)
        } catch {
          /* 忽略 */
        }
      }
    }
  }

  private send(ws: WebSocket, payload: object) {
    if (ws.readyState === ws.OPEN) {
      try {
        ws.send(JSON.stringify(payload))
      } catch {
        /* 忽略 */
      }
    }
  }
}
