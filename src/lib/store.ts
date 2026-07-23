/**
 * 全局状态：密室、密钥、消息、连接
 * 内存中维护，离开页面即销毁
 */
import { create } from 'zustand'
import {
  type CipherRoom,
  createCipher,
  decryptText,
  encryptText,
  envFromB64,
  envToB64,
  type Envelope,
  type EnvMsg,
} from '@/lib/cipher'

export type ConnState =
  | 'idle'
  | 'connecting'
  | 'waiting'
  | 'paired'
  | 'closed'
  | 'error'

export interface ChatItem {
  id: string
  text: string
  /** 发送者身份标识 */
  sid: string
  ts: number
  /** 阅后即焚倒计时秒数；0 表示已过期 */
  left: number
  /** 送达/已读状态（仅自己发出时有） */
  acked?: 'sent' | 'read'
  nickname?: string
  avatar?: string
}

interface ChatState {
  roomId: string | null
  cipher: CipherRoom | null
  socket: WebSocket | null
  conn: ConnState
  peerOnline: boolean
  items: ChatItem[]
  peerTyping: boolean
  error: string | null
  /** rate 限流倒计时秒数；null 表示未限流 */
  rateLeft: number | null
  /** 本地昵称 */
  nickname: string
  /** 本地头像（预设索引或颜色） */
  avatar: string
  connect: (roomId: string, passphrase: string) => Promise<void>
  send: (text: string, sid: string) => Promise<void>
  wipe: () => void
  destroy: () => void
  tick: () => void
  typing: (on: boolean) => void
  updateProfile: (nickname: string, avatar: string) => void
  // 内部
  _openSocket: (roomId: string, cipher: CipherRoom) => void
  _onEnvelope: (env: Envelope) => Promise<void>
}

let typingTimer: number | null = null

/** 预设头像（颜色标识，零存储） */
export const AVATAR_PRESETS = [
  '#f87171',
  '#fb923c',
  '#fbbf24',
  '#a3e635',
  '#34d399',
  '#22d3ee',
  '#60a5fa',
  '#a78bfa',
  '#f472b6',
]

function loadProfile(): { nickname: string; avatar: string } {
  try {
    const nickname = localStorage.getItem('cipher:nick') || ''
    const avatar = localStorage.getItem('cipher:avatar') || AVATAR_PRESETS[0]
    return { nickname, avatar }
  } catch {
    return { nickname: '', avatar: AVATAR_PRESETS[0] }
  }
}

const initProfile = loadProfile()

export const useChat = create<ChatState>((set, get) => ({
  roomId: null,
  cipher: null,
  socket: null,
  conn: 'idle',
  peerOnline: false,
  items: [],
  peerTyping: false,
  error: null,
  rateLeft: null,
  nickname: initProfile.nickname,
  avatar: initProfile.avatar,

  connect: async (roomId, passphrase) => {
    set({ conn: 'connecting', error: null, items: [], peerOnline: false })
    try {
      // 密钥由房间号 + 口令共同派生，确保同房间同口令的双方得到相同密钥
      const cipher = await createCipher(passphrase, roomId)
      get()._openSocket(roomId, cipher)
    } catch (e) {
      set({ conn: 'error', error: msgOf(e) })
    }
  },

  _openSocket: (roomId: string, cipher: CipherRoom) => {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const url = `${proto}//${host}/ws/r/${encodeURIComponent(roomId)}`
    const socket = new WebSocket(url)
    set({ socket, cipher, roomId })

    socket.onopen = () => {
      set({ conn: 'waiting' })
    }
    socket.onmessage = async (ev) => {
      try {
        const msg = JSON.parse(ev.data) as
          | { t: 'welcome'; peers: number; ttl: number }
          | { t: 'peer'; online: boolean }
          | { t: 'data'; payloadB64: string }
          | { t: 'error'; reason: string }
        if (msg.t === 'welcome') {
          if (msg.peers >= 1) set({ conn: 'paired', peerOnline: true })
          else set({ conn: 'waiting' })
        } else if (msg.t === 'peer') {
          set({ peerOnline: msg.online })
          if (msg.online) set({ conn: 'paired' })
          else if (!msg.online) set({ conn: 'waiting' })
        } else if (msg.t === 'data') {
          const env = envFromB64(msg.payloadB64) as Envelope
          await get()._onEnvelope(env)
        } else if (msg.t === 'error') {
          // rate 限流只提示，不断开连接
          if (msg.reason === 'rate') {
            // 后端令牌桶每秒刷新一次，倒计时 2 秒留出缓冲
            set({ error: 'rate', rateLeft: 2 })
          } else {
            set({ error: msg.reason, conn: 'error' })
          }
        }
      } catch {
        /* 忽略 */
      }
    }
    socket.onclose = () => {
      set({ conn: 'closed', peerOnline: false })
    }
    socket.onerror = () => {
      set({ conn: 'error', error: 'socket' })
    }
  },

  _onEnvelope: async (env: Envelope) => {
    if (env.k === 'msg') {
      const cipher = get().cipher
      if (!cipher) return
      // 去重：同 id 消息可能是共享 store 导致的重复
      if (get().items.some((it) => it.id === env.id)) return
      try {
        const text = await decryptText(cipher.key, env)
        set((s) => ({
          items: [
            ...s.items,
            {
              id: env.id,
              text,
              sid: env.sid,
              ts: env.ts,
              left: env.ttl,
              nickname: env.nickname,
              avatar: env.avatar,
            },
          ],
        }))
        // 回复已读
        const socket = get().socket
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(
            JSON.stringify({ t: 'pub', payloadB64: envToB64({ k: 'read', id: env.id }) }),
          )
        }
      } catch {
        // 解密失败：口令不一致
        set({ error: 'passphrase-mismatch' })
      }
    } else if (env.k === 'typing') {
      set({ peerTyping: env.on })
    } else if (env.k === 'read') {
      set((s) => ({
        items: s.items.map((it) =>
          it.sid && it.id === env.id ? { ...it, acked: 'read' } : it,
        ),
      }))
    }
  },

  send: async (text: string, sid: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    const cipher = get().cipher
    const socket = get().socket
    const nickname = get().nickname
    const avatar = get().avatar
    if (!cipher || !socket || socket.readyState !== WebSocket.OPEN) return
    const env: EnvMsg = await encryptText(cipher.key, trimmed, sid, 60, nickname, avatar)
    socket.send(JSON.stringify({ t: 'pub', payloadB64: envToB64(env) }))
    set((s) => ({
      items: [
        ...s.items,
        { id: env.id, text: trimmed, sid, ts: env.ts, left: 60, acked: 'sent', nickname, avatar },
      ],
    }))
  },

  typing: (on: boolean) => {
    const socket = get().socket
    if (!socket || socket.readyState !== WebSocket.OPEN) return
    socket.send(
      JSON.stringify({ t: 'pub', payloadB64: envToB64({ k: 'typing', on }) }),
    )
  },

  updateProfile: (nickname: string, avatar: string) => {
    set({ nickname, avatar })
    try {
      localStorage.setItem('cipher:nick', nickname)
      localStorage.setItem('cipher:avatar', avatar)
    } catch {
      /* 忽略 */
    }
  },

  tick: () => {
    set((s) => {
      let changed = false
      const items = s.items.map((it) => {
        if (it.left <= 0) return it
        const left = Math.max(0, it.left - 1)
        if (left !== it.left) changed = true
        return { ...it, left }
      })
      // rate 限流倒计时：每秒递减，归零后清除提示
      let rateLeft = s.rateLeft
      let error = s.error
      if (rateLeft !== null) {
        if (rateLeft <= 1) {
          rateLeft = null
          if (error === 'rate') error = null
        } else {
          rateLeft = rateLeft - 1
        }
        changed = true
      }
      return changed ? { items, rateLeft, error } : {}
    })
  },

  wipe: () => {
    set({ items: [] })
  },

  destroy: () => {
    const socket = get().socket
    if (socket && socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify({ t: 'bye' }))
      } catch {
        /* 忽略 */
      }
      socket.close()
    }
    if (typingTimer) {
      window.clearTimeout(typingTimer)
      typingTimer = null
    }
    set({
      roomId: null,
      cipher: null,
      socket: null,
      conn: 'idle',
      peerOnline: false,
      items: [],
      peerTyping: false,
      error: null,
      rateLeft: null,
    })
  },
}))

function msgOf(e: unknown): string {
  if (e instanceof Error) return e.message
  return String(e)
}
