import { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useChat, type ChatItem } from '@/lib/store'
import { makeId } from '@/lib/cipher'

export default function Room() {
  const { roomId = '' } = useParams()
  const navigate = useNavigate()
  const { conn, peerOnline, items, peerTyping, error, rateLeft, connect, send, destroy, wipe, typing, tick } =
    useChat()

  const [draft, setDraft] = useState('')
  const [blurred, setBlurred] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const typingTimer = useRef<number | null>(null)
  // 每个标签页独立的身份标识，避免同一浏览器多标签共享 store 导致方向混乱
  const myId = useRef<string>(makeId())
  // typing 节流：1 秒内最多发一次，避免快速打字耗尽限流令牌
  const lastTypingSent = useRef(0)
  const onType = (v: string) => {
    setDraft(v)
    const now = Date.now()
    if (now - lastTypingSent.current > 1000) {
      lastTypingSent.current = now
      typing(true)
    }
    if (typingTimer.current) window.clearTimeout(typingTimer.current)
    typingTimer.current = window.setTimeout(() => typing(false), 1200)
  }

  // 读取口令、连接密室
  useEffect(() => {
    document.title = `密室 · ${roomId}`
    const pass = sessionStorage.getItem('cipher:pass')
    const storedRoom = sessionStorage.getItem('cipher:room')
    if (!pass) {
      navigate('/')
      return
    }
    if (storedRoom !== roomId) {
      sessionStorage.setItem('cipher:room', roomId)
    }
    connect(roomId, pass)
    return () => {
      destroy()
      if (typingTimer.current) window.clearTimeout(typingTimer.current)
    }
  }, [roomId, connect, destroy, navigate])

  // 阅后即焚倒计时
  useEffect(() => {
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [tick])

  // 截屏软防护：PrintScreen 清空 / 失焦模糊 / 禁用右键与开发者工具快捷键 / 禁止拖选
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // 拦截 F12 与常见开发者工具快捷键
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key))
      ) {
        e.preventDefault()
      }
      // PrintScreen：立即清空本地消息
      if (e.key === 'PrintScreen') {
        wipe()
      }
    }
    const onContextMenu = (e: MouseEvent) => e.preventDefault()
    const onDragStart = (e: DragEvent) => e.preventDefault()
    const onBlur = () => setBlurred(true)
    const onFocus = () => setBlurred(false)
    const onVisibility = () => setBlurred(document.hidden)

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('contextmenu', onContextMenu)
    document.addEventListener('dragstart', onDragStart)
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('contextmenu', onContextMenu)
      document.removeEventListener('dragstart', onDragStart)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [wipe])

  // 过滤已过期的消息
  const visible = items.filter((i) => i.left > 0)

  // 自动滚动
  useLayoutEffect(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [visible.length, peerTyping])

  const onSend = async () => {
    if (!draft.trim()) return
    const text = draft
    setDraft('')
    typing(false)
    await send(text, myId.current)
    inputRef.current?.focus()
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  const onBurn = () => {
    if (window.confirm('销毁当前密室？所有本地消息将被清除，连接将关闭。')) {
      destroy()
      sessionStorage.removeItem('cipher:pass')
      sessionStorage.removeItem('cipher:room')
      navigate('/')
    }
  }

  const onLeave = () => {
    destroy()
    sessionStorage.removeItem('cipher:pass')
    sessionStorage.removeItem('cipher:room')
    navigate('/')
  }

  return (
    <main className="h-full flex flex-col bg-ink-950 safe-top safe-bottom">
      <TopBar roomId={roomId} conn={conn} peerOnline={peerOnline} onBurn={onBurn} onLeave={onLeave} />

      {error === 'passphrase-mismatch' && (
        <Banner type="warn">对方口令与你不同，无法解密消息</Banner>
      )}
      {error === 'full' && <Banner type="warn">房间已满（2 人上限）</Banner>}
      {error === 'rate' && (
        <Banner type="warn">
          消息发送太快，请稍候{rateLeft !== null ? ` (${rateLeft}s)` : ''}
        </Banner>
      )}

      <div
        ref={listRef}
        className={[
          'flex-1 overflow-y-auto px-4 py-3 mx-auto w-full max-w-[640px] transition-[filter] duration-150',
          blurred ? 'blur-xl select-none' : '',
        ].join(' ')}
      >
        {visible.length === 0 && (
          <div className="text-center text-[11px] text-bone-400 mt-12 leading-relaxed">
            <p className="mb-1 tracking-[0.3em] uppercase">— 暂无消息 —</p>
          <p>60 秒后消息会自动消失</p>
          </div>
        )}
        {visible.map((it) => (
          <Bubble key={it.id} item={it} myId={myId.current} />
        ))}
        {peerTyping && <TypingDot />}
      </div>

      <Composer
        ref={inputRef}
        value={draft}
        onChange={onType}
        onKeyDown={onKeyDown}
        onSend={onSend}
        disabled={!peerOnline}
      />
    </main>
  )
}

function TopBar({
  roomId,
  conn,
  peerOnline,
  onBurn,
  onLeave,
}: {
  roomId: string
  conn: string
  peerOnline: boolean
  onBurn: () => void
  onLeave: () => void
}) {
  const status = useStatusLabel(conn, peerOnline)
  const [copied, setCopied] = useState(false)

  const onCopyLink = async () => {
    const url = `${window.location.origin}/?room=${roomId}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // 降级：选中文本
      const ta = document.createElement('textarea')
      ta.value = url
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <header className="border-b hairline px-4 py-3 flex items-center gap-3 mx-auto w-full max-w-[640px]">
      <div className="flex items-center gap-2 min-w-0">
        <span className={['inline-block w-1.5 h-1.5 rounded-full', status.dot].join(' ')} />
        <span className="text-[10px] tracking-[0.3em] uppercase text-bone-300 truncate">
          房间 · {roomId}
        </span>
      </div>
      <div className="flex-1 text-center text-[10px] tracking-[0.2em] uppercase text-bone-400">
        {status.text}
      </div>
      <button
        onClick={onCopyLink}
        className="text-[10px] tracking-[0.3em] uppercase text-bone-300 hover:text-bone-100 px-2 py-1"
        aria-label="复制邀请链接"
      >
        {copied ? '已复制' : '邀请'}
      </button>
      <button
        onClick={onLeave}
        className="text-[10px] tracking-[0.3em] uppercase text-bone-300 hover:text-bone-100 px-2 py-1"
        aria-label="返回主页"
      >
        主页
      </button>
      <button
        onClick={onBurn}
        className="text-[10px] tracking-[0.3em] uppercase text-signal-red/80 hover:text-signal-red px-2 py-1"
        aria-label="销毁密室"
      >
        销毁
      </button>
    </header>
  )
}

function useStatusLabel(conn: string, peerOnline: boolean): { text: string; dot: string } {
  if (conn === 'connecting') return { text: '连接中', dot: 'bg-signal-amber animate-pulse' }
  if (conn === 'error') return { text: '错误', dot: 'bg-signal-red' }
  if (conn === 'closed') return { text: '已断开', dot: 'bg-ink-500' }
  if (!peerOnline) return { text: '等待对方', dot: 'bg-signal-amber animate-pulse' }
  return { text: '已配对', dot: 'bg-signal-green' }
}

function Banner({ type, children }: { type: 'warn' | 'info'; children: React.ReactNode }) {
  const color = type === 'warn' ? 'text-signal-amber' : 'text-bone-300'
  return (
    <div className={`mx-4 mt-2 text-[11px] tracking-[0.2em] uppercase ${color} text-center`}>
      · {children} ·
    </div>
  )
}

function Bubble({ item, myId }: { item: ChatItem; myId: string }) {
  const isMine = item.sid === myId
  return (
    <div className={`my-1.5 flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={[
          'max-w-[78%] break-words whitespace-pre-wrap px-3 py-2 text-[14px] leading-relaxed select-none',
          'border',
          isMine
            ? 'border-bone-300 text-bone-100 bg-ink-900'
            : 'border-ink-600 text-bone-200 bg-ink-900',
        ].join(' ')}
      >
        <div>{item.text}</div>
        <div
          className={[
            'mt-1 text-[9px] tracking-[0.2em] uppercase text-bone-400 flex gap-2 tabular',
            isMine ? 'justify-end' : 'justify-start',
          ].join(' ')}
        >
          <span>{formatTime(item.ts)}</span>
          {isMine && <span>· {item.acked === 'read' ? '已读' : '已送达'}</span>}
          <span>· -{item.left}s</span>
        </div>
      </div>
    </div>
  )
}

function TypingDot() {
  return (
    <div className="flex justify-start my-1.5">
      <div className="border border-ink-600 px-3 py-2 text-bone-400">
        <span className="inline-block w-1 h-1 bg-bone-300 rounded-full mx-0.5 animate-pulse" />
        <span
          className="inline-block w-1 h-1 bg-bone-300 rounded-full mx-0.5 animate-pulse"
          style={{ animationDelay: '120ms' }}
        />
        <span
          className="inline-block w-1 h-1 bg-bone-300 rounded-full mx-0.5 animate-pulse"
          style={{ animationDelay: '240ms' }}
        />
      </div>
    </div>
  )
}

interface ComposerProps {
  value: string
  onChange: (v: string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onSend: () => void
  disabled?: boolean
}

const Composer = forwardRef<HTMLTextAreaElement, ComposerProps>(function Composer(
  { value, onChange, onKeyDown, onSend, disabled },
  ref,
) {
  // 输入框自适应高度
  const taRef = useRef<HTMLTextAreaElement | null>(null)
  useLayoutEffect(() => {
    const el = taRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(128, el.scrollHeight) + 'px'
  }, [value])

  return (
    <div className="border-t hairline mx-auto w-full max-w-[640px] bg-ink-950">
      <div className="flex items-end gap-2 px-3 py-2">
        <textarea
          ref={(node) => {
            taRef.current = node
            if (typeof ref === 'function') ref(node)
            else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node
          }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder={disabled ? '等待对方上线…' : '说点什么 · ↵ 发送 · ⇧↵ 换行'}
          className="flex-1 bg-transparent resize-none px-2 py-2 text-[14px] text-bone-100 placeholder:text-bone-400 focus:outline-none max-h-32 leading-relaxed"
        />
        <button
          onClick={onSend}
          disabled={disabled || !value.trim()}
          className="btn btn-primary px-4"
        >
          发送 ↵
        </button>
      </div>
    </div>
  )
})

function formatTime(ts: number): string {
  const d = new Date(ts)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}
