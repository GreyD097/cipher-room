import { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

interface PublicMessage {
  id: string
  nickname: string
  text: string
  ts: number
  type?: 'text' | 'image'
}

export default function PublicChat() {
  const { roomId = '' } = useParams()
  const navigate = useNavigate()
  const [draft, setDraft] = useState('')
  const [nickname, setNickname] = useState('')
  const [messages, setMessages] = useState<PublicMessage[]>([])
  const [peers, setPeers] = useState(0)
  const [roomName, setRoomName] = useState('')
  const [conn, setConn] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle')
  const [error, setError] = useState('')
  const [showNickEdit, setShowNickEdit] = useState(false)
  const [newNickname, setNewNickname] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const socketRef = useRef<WebSocket | null>(null)
  const sidRef = useRef<string>(Math.random().toString(36).slice(2, 12))

  useEffect(() => {
    document.title = `公共聊天室 · ${roomId}`
    const savedNick = localStorage.getItem(`cipher:pub-nick:${roomId}`) || ''
    const nick = savedNick || 'anonymous'
    setNickname(nick)
    setNewNickname(nick)
    connect(nick)
    return () => {
      if (socketRef.current) {
        socketRef.current.close()
        socketRef.current = null
      }
    }
  }, [roomId])

  const connect = (nick: string) => {
    if (!nick) return
    setConn('connecting')
    setError('')
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const url = `${proto}//${host}/ws/p/${encodeURIComponent(roomId)}?nick=${encodeURIComponent(nick)}&sid=${sidRef.current}`
    const socket = new WebSocket(url)

    socket.onopen = () => {
      setConn('connected')
    }

    socket.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as
          | { t: 'welcome'; peers: number; name: string; history: PublicMessage[] }
          | { t: 'msg'; id: string; nickname: string; text: string; ts: number; type?: 'text' | 'image' }
          | { t: 'join'; nickname: string; peers: number }
          | { t: 'leave'; nickname: string; peers: number }
          | { t: 'error'; reason: string }

        if (msg.t === 'welcome') {
          setPeers(msg.peers)
          setRoomName(msg.name)
          setMessages(msg.history)
        } else if (msg.t === 'msg') {
          setMessages((prev) => [...prev, { id: msg.id, nickname: msg.nickname, text: msg.text, ts: msg.ts, type: msg.type }])
        } else if (msg.t === 'join') {
          setPeers(msg.peers)
        } else if (msg.t === 'leave') {
          setPeers(msg.peers)
        } else if (msg.t === 'error') {
          if (msg.reason === 'not found') {
            setError('房间不存在')
          } else if (msg.reason === 'full') {
            setError('房间已满')
          } else if (msg.reason === 'rate') {
            setError('发送太快，请稍候')
            setTimeout(() => setError(''), 2000)
          } else if (msg.reason === 'too big') {
            setError('图片太大（上限 5MB）')
            setTimeout(() => setError(''), 3000)
          } else {
            setError('连接错误')
          }
          setConn('error')
        }
      } catch {
        /* ignore */
      }
    }

    socket.onclose = () => {
      setConn('idle')
    }

    socket.onerror = () => {
      setConn('error')
      setError('连接失败')
    }

    socketRef.current = socket
  }

  useLayoutEffect(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages.length])

  const onSend = () => {
    if (!draft.trim() || conn !== 'connected') return
    const text = draft
    setDraft('')
    socketRef.current?.send(JSON.stringify({ t: 'msg', text }))
    inputRef.current?.focus()
  }

  const onPickImage = () => {
    fileRef.current?.click()
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件')
      setTimeout(() => setError(''), 2000)
      return
    }
    if (file.size > 3.5 * 1024 * 1024) {
      setError('图片不能超过 3.5MB')
      setTimeout(() => setError(''), 3000)
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataURL = reader.result as string
      if (conn !== 'connected') return
      socketRef.current?.send(JSON.stringify({ t: 'msg', text: dataURL, type: 'image' }))
    }
    reader.readAsDataURL(file)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  const onSaveNick = () => {
    if (!newNickname.trim()) return
    const nick = newNickname.trim()
    localStorage.setItem(`cipher:pub-nick:${roomId}`, nick)
    setNickname(nick)
    setShowNickEdit(false)
    if (socketRef.current) {
      socketRef.current.close()
      socketRef.current = null
    }
    connect(nick)
  }

  const goBack = () => {
    navigate('/')
  }

  return (
    <main className="h-full flex flex-col bg-ink-950 safe-top safe-bottom">
      <header className="border-b hairline px-4 py-3 flex items-center gap-3 mx-auto w-full max-w-[640px]">
        <button
          onClick={goBack}
          className="text-[10px] tracking-[0.2em] uppercase text-bone-400 hover:text-bone-200 px-2 py-1"
        >
          ← 主页
        </button>
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.4em] text-bone-500 uppercase">公共聊天室</div>
          <h1 className="text-lg text-bone-100 tracking-tight">{roomName || roomId}</h1>
        </div>
        <div className="text-[10px] text-bone-400 tabular">{peers} 人在线</div>
      </header>

      <div className="border-b hairline px-4 py-2 mx-auto w-full max-w-[640px] flex items-center justify-between">
        <span className="text-[10px] text-bone-500">我的昵称</span>
        {showNickEdit ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={newNickname}
              onChange={(e) => setNewNickname(e.target.value.slice(0, 32))}
              className="field text-[12px] w-28"
              autoComplete="off"
              spellCheck={false}
              autoFocus
            />
            <button onClick={onSaveNick} className="btn btn-primary text-[10px] px-2">
              保存
            </button>
            <button onClick={() => setShowNickEdit(false)} className="text-[10px] text-bone-400">
              取消
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowNickEdit(true)}
            className="text-[12px] text-signal-green hover:text-signal-green/80"
          >
            {nickname} → 编辑
          </button>
        )}
      </div>

      {error && (
        <div className="mx-4 mt-2 text-[11px] tracking-[0.2em] uppercase text-signal-red text-center">
          · {error} ·
        </div>
      )}

      <div
        ref={listRef}
        className="flex-1 overflow-y-auto px-4 py-3 mx-auto w-full max-w-[640px]"
      >
        {messages.length === 0 && (
          <div className="text-center text-[11px] text-bone-400 mt-8">
            <p className="mb-1 tracking-[0.3em] uppercase">— 暂无消息 —</p>
            <p>成为第一个发言的人！</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="my-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] text-signal-amber">{msg.nickname}</span>
              <span className="text-[9px] text-bone-500 tabular">{formatTime(msg.ts)}</span>
            </div>
            {msg.type === 'image' ? (
              <img
                src={msg.text}
                alt="图片"
                className="border border-ink-700 bg-ink-900 max-w-[85%] max-h-80 object-contain cursor-pointer"
                onClick={() => window.open(msg.text, '_blank')}
              />
            ) : (
              <div className="border border-ink-700 bg-ink-900 px-3 py-2 text-[14px] text-bone-100 break-words whitespace-pre-wrap max-w-[85%]">
                {msg.text}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="border-t hairline mx-auto w-full max-w-[640px] bg-ink-950">
        <div className="flex items-end gap-2 px-3 py-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={onFileChange}
            className="hidden"
          />
          <button
            onClick={onPickImage}
            disabled={conn !== 'connected'}
            className="btn btn-outline px-3 shrink-0"
            title="发送图片"
          >
            📷
          </button>
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder={conn !== 'connected' ? '连接中…' : '说点什么 · ↵ 发送 · ⇧↵ 换行'}
            className="flex-1 bg-transparent resize-none px-2 py-2 text-[14px] text-bone-100 placeholder:text-bone-400 focus:outline-none max-h-32 leading-relaxed"
            style={{ height: 'auto', maxHeight: '128px' }}
            onInput={(e) => {
              const el = e.target as HTMLTextAreaElement
              el.style.height = 'auto'
              el.style.height = Math.min(128, el.scrollHeight) + 'px'
            }}
          />
          <button
            onClick={onSend}
            disabled={conn !== 'connected' || !draft.trim()}
            className="btn btn-primary px-4"
          >
            发送 ↵
          </button>
        </div>
      </div>
    </main>
  )
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}
