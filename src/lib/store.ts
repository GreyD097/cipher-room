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
  connect: (roomId: string, passphrase: string) => Promise<void>
  send: (text: string, sid: string) => Promise<void>
  destroy: () => void
  tick: () => void
  typing: (on: boolean) => void
  // 内部
  _openSocket: (roomId: string, cipher: CipherRoom) => void
  _onEnvelope: (env: Envelope) => Promise<void>
}

let typingTimer: number | null = null

export const useChat = create<ChatState>((set, get) => ({
  roomId: null,
  cipher: null,
  socket: null,
  conn: 'idle',
  peerOnline: false,
  items: [],
  peerTyping: false,
  error: null,

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
    const url = `${proto}//${host}/ws/r/${roomId}`
    const socket = new WebSocket(url)
    set({ socket, cipher, roomId })

    socket.onopen = () => {
      set({ conn: 'waiting' })
    }
    socket.onmessage = async (ev) => {
      try {
        const msg = JSON.parse(ev.data) as
          | { t: 'welcome'; peers: number }
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
          set({ error: msg.reason, conn: 'error' })
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
    if (!cipher || !socket || socket.readyState !== WebSocket.OPEN) return
    const env: EnvMsg = await encryptText(cipher.key, trimmed, sid, 60)
    socket.send(JSON.stringify({ t: 'pub', payloadB64: envToB64(env) }))
    set((s) => ({
      items: [
        ...s.items,
        { id: env.id, text: trimmed, sid, ts: env.ts, left: 60, acked: 'sent' },
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

  tick: () => {
    set((s) => {
      let changed = false
      const items = s.items.map((it) => {
        if (it.left <= 0) return it
        const left = Math.max(0, it.left - 1)
        if (left !== it.left) changed = true
        return { ...it, left }
      })
      return changed ? { items } : {}
    })
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
    })
  },
}))

function msgOf(e: unknown): string {
  if (e instanceof Error) return e.message
  return String(e)
}
