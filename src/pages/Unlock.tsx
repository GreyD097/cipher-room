import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { randomRoomId } from '@/lib/cipher'

export default function Unlock() {
  const [pass, setPass] = useState('')
  const [roomId, setRoomId] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [search] = useSearchParams()
  const navigate = useNavigate()

  const paramsRoom = search.get('room') || ''
  const strength = useMemo(() => scorePass(pass), [pass])

  // 失败次数限制（仅前端防御）
  const [fails, setFails] = useState(0)
  const inputLocked = fails >= 5

  useEffect(() => {
    document.title = '密室 · cipher.room'
    const fav = document.querySelector("link[rel='icon']") as HTMLLinkElement | null
    if (fav)
      fav.href =
        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="%230A0A0B"/><text x="50%" y="55%" text-anchor="middle" font-family="monospace" font-size="32" fill="%23EDEDED" dominant-baseline="middle">±</text></svg>'
    if (paramsRoom) setRoomId(paramsRoom)
  }, [paramsRoom])

  const onEnter = async () => {
    if (busy || inputLocked) return
    if (pass.length < 6) {
      setFails((n) => n + 1)
      return
    }
    setBusy(true)
    const targetRoom = roomId.trim() || randomRoomId()
    sessionStorage.setItem('cipher:pass', pass)
    sessionStorage.setItem('cipher:room', targetRoom)
    navigate(`/r/${targetRoom}`)
  }

  const invited = !!paramsRoom

  return (
    <main className="min-h-full flex flex-col items-stretch justify-center px-6 py-12 safe-top safe-bottom">
      <div className="w-full max-w-[420px] mx-auto">
        <button
          onClick={() => navigate('/')}
          className="text-[10px] tracking-[0.2em] uppercase text-bone-400 hover:text-bone-200 px-2 py-1 mb-4"
        >
          ← 主页
        </button>
        <div className="text-[10px] tracking-[0.4em] text-bone-400 uppercase mb-2">
          密室 / cipher room
        </div>
        <h1 className="text-2xl text-bone-100 tracking-tightest mb-1">
          cipher<em className="not-italic text-signal-green">.</em>room
        </h1>
        {invited ? (
          <p className="text-xs text-bone-400 mb-8 leading-relaxed">
            邀请你加入房间 <span className="text-bone-100 font-mono">{roomId}</span>，输入口令进入。
          </p>
        ) : (
          <>
            <p className="text-xs text-bone-400 mb-4 leading-relaxed">
              一个仅供两人使用的加密密室。你和对方输入相同口令即可进入同一个房间，消息发出前已加密，服务器看不到内容。
            </p>
            <ul className="text-[11px] text-bone-400 mb-8 leading-relaxed space-y-0.5">
              <li>· 每个房间上限 2 人，口令相同才能对话</li>
              <li>· 消息 60 秒后自动消失，离开页面即销毁</li>
              <li>· 不留记录，服务器不存储任何内容</li>
            </ul>
          </>
        )}

        {!invited && (
          <>
            <label className="block text-[10px] tracking-[0.3em] uppercase text-bone-400 mb-2">
              房间号
            </label>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.slice(0, 128))}
              onKeyDown={(e) => e.key === 'Enter' && onEnter()}
              placeholder="留空则随机生成"
              className="field"
              autoComplete="off"
              spellCheck={false}
            />
          </>
        )}

        <label className="block text-[10px] tracking-[0.3em] uppercase text-bone-400 mb-2 mt-4">
          双方口令
        </label>
        <div className="relative">
          <input
            type={show ? 'text' : 'password'}
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onEnter()
            }}
            disabled={inputLocked}
            autoComplete="off"
            spellCheck={false}
            inputMode="text"
            placeholder="至少 6 位 · 双方相同"
            className="field pr-16"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] tracking-[0.2em] text-bone-400 px-2 py-1"
            aria-label="切换明文"
          >
            {show ? '隐藏' : '显示'}
          </button>
        </div>

        <div className="mt-2 h-1 w-full bg-ink-700 overflow-hidden">
          <div
            className={[
              'h-full transition-all duration-300',
              strength.cls,
              strength.width,
            ].join(' ')}
          />
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-bone-400">
          <span>强度 · {strength.label}</span>
          <span className="tabular">{pass.length}/64</span>
        </div>

        <button
          onClick={onEnter}
          disabled={busy || inputLocked || pass.length < 6}
          className="btn btn-primary w-full mt-6"
        >
          {busy ? '加载中…' : '进入  →'}
        </button>

        {inputLocked && (
          <p className="mt-4 text-signal-red text-xs">尝试次数过多，请稍候。</p>
        )}
        {fails > 0 && !inputLocked && (
          <p className="mt-4 text-signal-amber text-[11px]">错误 {fails}/5</p>
        )}
      </div>
    </main>
  )
}

function scorePass(p: string): { label: string; width: string; cls: string } {
  if (!p) return { label: '—', width: 'w-0', cls: 'bg-ink-600' }
  let s = 0
  if (p.length >= 8) s++
  if (p.length >= 12) s++
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++
  if (/\d/.test(p)) s++
  if (/[^A-Za-z0-9]/.test(p)) s++
  if (s <= 1) return { label: '弱', width: 'w-1/4', cls: 'bg-signal-red' }
  if (s === 2) return { label: '一般', width: 'w-2/4', cls: 'bg-signal-amber' }
  if (s === 3) return { label: '良', width: 'w-3/4', cls: 'bg-signal-green/70' }
  return { label: '强', width: 'w-full', cls: 'bg-signal-green' }
}
