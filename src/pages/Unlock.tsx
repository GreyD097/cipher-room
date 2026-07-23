import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { randomRoomId } from '@/lib/cipher'

export default function Unlock() {
  const [pass, setPass] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [search] = useSearchParams()
  const navigate = useNavigate()

  const paramsRoom = search.get('room') || ''
  const strength = useMemo(() => scorePass(pass), [pass])

  // 失败次数限制（仅前端防御）
  const [fails, setFails] = useState(0)
  const locked = fails >= 5

  useEffect(() => {
    // 进入页即伪装标题
    document.title = '计算器'
    const fav = document.querySelector("link[rel='icon']") as HTMLLinkElement | null
    if (fav)
      fav.href =
        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="%230A0A0B"/><text x="50%" y="55%" text-anchor="middle" font-family="monospace" font-size="32" fill="%23EDEDED" dominant-baseline="middle">±</text></svg>'
  }, [])

  const onEnter = async () => {
    if (busy || locked) return
    if (pass.length < 6) {
      setFails((n) => n + 1)
      return
    }
    setBusy(true)
    const roomId = paramsRoom || randomRoomId()
    sessionStorage.setItem('cipher:pass', pass)
    sessionStorage.setItem('cipher:room', roomId)
    navigate(`/r/${roomId}`)
  }

  return (
    <main className="min-h-full flex flex-col items-stretch justify-center px-6 py-12 safe-top safe-bottom">
      <div className="w-full max-w-[420px] mx-auto">
        <div className="text-[10px] tracking-[0.4em] text-bone-400 uppercase mb-2">
          密室 / cipher room
        </div>
        <h1 className="text-2xl text-bone-100 tracking-tightest mb-1">
          cipher<em className="not-italic text-signal-green">.</em>room
        </h1>
        <p className="text-xs text-bone-400 mb-8 leading-relaxed">
          输入双方约定的口令进入密室。消息在你的设备上加密，到期自动消失，服务器只转发密文。
        </p>

        <label className="block text-[10px] tracking-[0.3em] uppercase text-bone-400 mb-2">
          shared passphrase
        </label>
        <div className="relative">
          <input
            type={show ? 'text' : 'password'}
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onEnter()
            }}
            disabled={locked}
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
            {show ? 'hide' : 'show'}
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
          disabled={busy || locked || pass.length < 6}
          className="btn btn-primary w-full mt-6"
        >
          {busy ? 'loading…' : 'enter  →'}
        </button>

        <div className="mt-6 text-[10px] text-bone-400 leading-relaxed">
          <p className="mb-1">
            <span className="text-bone-300">提示</span> · 选择强口令；不在公共设备使用；不要通过明文信道分享。
          </p>
          <p className="opacity-60">
            {paramsRoom
              ? `将进入房间 ${paramsRoom}`
              : '未指定房间：进入后将获得一个新房间代号'}
          </p>
        </div>

        {locked && (
          <p className="mt-4 text-signal-red text-xs">尝试次数过多，请稍候。</p>
        )}
        {fails > 0 && !locked && (
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
