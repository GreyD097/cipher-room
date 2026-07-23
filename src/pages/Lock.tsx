import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { checkLockPassword, hasLock } from '@/lib/lock'

export default function Lock() {
  const [pass, setPass] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const [fails, setFails] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    document.title = '验证'
    if (!hasLock()) {
      navigate('/')
      return
    }
  }, [navigate])

  const onUnlock = async () => {
    if (busy || fails >= 5) return
    setBusy(true)
    setError(false)
    const ok = await checkLockPassword(pass)
    if (ok) {
      sessionStorage.setItem('cipher:unlocked', '1')
      navigate('/')
    } else {
      setError(true)
      setFails((n) => n + 1)
    }
    setBusy(false)
  }

  const locked = fails >= 5

  return (
    <main className="min-h-full flex flex-col items-center justify-center px-6 safe-top safe-bottom">
      <div className="w-full max-w-[320px]">
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-bone-300 flex items-center justify-center">
            <span className="text-bone-300 text-xl">🔒</span>
          </div>
          <h1 className="text-lg text-bone-100 tracking-tightest">安全验证</h1>
          <p className="text-xs text-bone-400 mt-1">请输入安全锁密码</p>
        </div>

        <div className="relative">
          <input
            type={show ? 'text' : 'password'}
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onUnlock()}
            disabled={locked}
            autoComplete="off"
            spellCheck={false}
            placeholder="安全锁密码"
            className="field pr-12"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] tracking-[0.2em] text-bone-400 px-2 py-1"
          >
            {show ? '隐藏' : '显示'}
          </button>
        </div>

        <button
          onClick={onUnlock}
          disabled={busy || locked || !pass.trim()}
          className="btn btn-primary w-full mt-4"
        >
          {busy ? '验证中…' : '验证'}
        </button>

        {error && (
          <p className="mt-3 text-center text-signal-red text-xs">密码错误</p>
        )}
        {locked && (
          <p className="mt-3 text-center text-signal-red text-xs">尝试次数过多，请稍候</p>
        )}
        {fails > 0 && !locked && (
          <p className="mt-3 text-center text-signal-amber text-[11px]">错误 {fails}/5</p>
        )}
      </div>
    </main>
  )
}
