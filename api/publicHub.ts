import type { WebSocket, WebSocketServer } from 'ws'
import fs from 'fs'
import path from 'path'

interface PublicMessage {
  id: string
  nickname: string
  text: string
  ts: number
  type?: 'text' | 'image'
}

interface PersistedRoom {
  name: string
  messages: PublicMessage[]
  maxMessages: number
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
const MAX_IMAGE_MESSAGES = 100
const MAX_MSG_SIZE = 5 * 1024 * 1024
const DATA_DIR = path.resolve(process.cwd(), 'data')
const ROOMS_FILE = path.join(DATA_DIR, 'rooms.json')
// 系统默认聊天室：启动时自动创建，持久化到磁盘；即使磁盘清空也会重建
const SYSTEM_ROOM_ID = 'lobby'
const SYSTEM_ROOM_NAME = '系统大厅'

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
    this.loadRooms()
    this.ensureSystemRoom()
    this.wss.on('connection', (ws, req) => this.handleConnection(ws, req.url ?? '/'))
  }

  /** 确保系统默认房间存在；即使磁盘被清空也会重建 */
  private ensureSystemRoom() {
    if (!this.rooms.has(SYSTEM_ROOM_ID)) {
      this.rooms.set(SYSTEM_ROOM_ID, {
        sockets: new Map(),
        messages: [],
        name: SYSTEM_ROOM_NAME,
        maxMessages: DEFAULT_MAX_MESSAGES,
      })
      this.log(`system room ensured: ${SYSTEM_ROOM_ID} "${SYSTEM_ROOM_NAME}"`)
      this.saveRooms()
    }
  }

  /** 从文件加载房间数据 */
  private loadRooms() {
    try {
      if (!fs.existsSync(ROOMS_FILE)) return
      const raw = fs.readFileSync(ROOMS_FILE, 'utf-8')
      const data = JSON.parse(raw) as Record<string, PersistedRoom>
      for (const [roomId, room] of Object.entries(data)) {
        this.rooms.set(roomId, {
          sockets: new Map(),
          messages: room.messages || [],
          name: room.name,
          maxMessages: room.maxMessages || DEFAULT_MAX_MESSAGES,
        })
      }
      this.log(`loaded ${this.rooms.size} rooms from disk`)
    } catch (e) {
      this.log(`failed to load rooms: ${e}`)
    }
  }

  /** 保存房间数据到文件 */
  private saveRooms() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true })
      }
      const data: Record<string, PersistedRoom> = {}
      for (const [roomId, entry] of this.rooms) {
        data[roomId] = {
          name: entry.name,
          messages: entry.messages,
          maxMessages: entry.maxMessages,
        }
      }
      fs.writeFileSync(ROOMS_FILE, JSON.stringify(data, null, 2))
    } catch (e) {
      this.log(`failed to save rooms: ${e}`)
    }
  }

  private handleConnection(ws: WebSocket, url: string) {
    this.log(`public connect ${url}`)
    const m = url.match(/^\/ws\/p\/([^?]+)(?:\?(.+))?$/)
    if (!m) {
      this.send(ws, { t: 'error', reason: 'bad room' })
      ws.close(4000, 'bad room')
      return
    }
    const roomId = decodeURIComponent(m[1]).slice(0, 128)
    const params = new URLSearchParams(m[2] || '')
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
      if (Buffer.isBuffer(raw) && raw.length > MAX_MSG_SIZE) {
        this.send(ws, { t: 'error', reason: 'too big' })
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
      const m = msg as { t?: string; text?: string; type?: 'text' | 'image' }
      if (m.t === 'msg') {
        if (tokens <= 0) {
          this.send(ws, { t: 'error', reason: 'rate' })
          return
        }
        tokens--
        const text = (m.text || '').trim()
        if (!text) return
        const isImage = m.type === 'image'
        const message: PublicMessage = {
          id: Math.random().toString(36).slice(2, 12),
          nickname,
          text,
          ts: Date.now(),
          type: isImage ? 'image' : 'text',
        }
        entry.messages.push(message)
        // 文本消息：保留最近 maxMessages 条
        if (entry.messages.length > entry.maxMessages) {
          entry.messages = entry.messages.slice(-entry.maxMessages)
        }
        // 图片消息：单独限制数量，防止持久化文件膨胀
        if (isImage) {
          const imgs = entry.messages.filter((x) => x.type === 'image')
          if (imgs.length > MAX_IMAGE_MESSAGES) {
            const toRemove = imgs.length - MAX_IMAGE_MESSAGES
            let removed = 0
            entry.messages = entry.messages.filter((x) => {
              if (x.type === 'image' && removed < toRemove) {
                removed++
                return false
              }
              return true
            })
          }
        }
        this.broadcast(entry, null, { t: 'msg', ...message })
        this.saveRooms()
      }
    })

    const cleanup = () => {
      if (!entry.sockets.has(ws)) return
      entry.sockets.delete(ws)
      this.log(`public leave room=${roomId} peers=${entry.sockets.size}`)
      this.broadcast(entry, null, { t: 'leave', nickname, peers: entry.sockets.size })
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
    this.saveRooms()
    this.log(`public room created: ${roomId} "${name}"`)
    return true
  }

  listRooms(): { roomId: string; name: string; peers: number; messages: number; isSystem?: boolean }[] {
    const result: { roomId: string; name: string; peers: number; messages: number; isSystem?: boolean }[] = []
    for (const [roomId, entry] of this.rooms) {
      result.push({
        roomId,
        name: entry.name,
        peers: entry.sockets.size,
        messages: entry.messages.length,
        isSystem: roomId === SYSTEM_ROOM_ID,
      })
    }
    // 系统房间排第一，其余按在线人数降序
    return result.sort((a, b) => {
      if (a.isSystem && !b.isSystem) return -1
      if (!a.isSystem && b.isSystem) return 1
      return b.peers - a.peers
    })
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
    this.saveRooms()
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
