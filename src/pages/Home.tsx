import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { setLockPassword, removeLock, hasLock, checkLockPassword } from '@/lib/lock'
import { useTheme } from '@/lib/theme'

export default function Home() {
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()
  const [showSettings, setShowSettings] = useState(false)
  const [lockPass, setLockPass] = useState('')
  const [lockConfirm, setLockConfirm] = useState('')
  const [lockShow, setLockShow] = useState(false)
  const [lockMsg, setLockMsg] = useState('')
  const locked = hasLock()

  useEffect(() => {
    document.title = 'cipher.room'
    const fav = document.querySelector("link[rel='icon']") as HTMLLinkElement | null
    if (fav)
      fav.href =
        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="%230A0A0B"/><text x="50%" y="55%" text-anchor="middle" font-family="monospace" font-size="32" fill="%23EDEDED" dominant-baseline="middle">±</text></svg>'
  }, [])

  const onSetLock = async () => {
    if (!lockPass.trim()) {
      setLockMsg('请输入密码')
      return
    }
    if (lockPass !== lockConfirm) {
      setLockMsg('两次输入不一致')
      return
    }
    if (lockPass.length < 4) {
      setLockMsg('至少 4 位')
      return
    }
    await setLockPassword(lockPass)
    setLockMsg('安全锁已开启')
    setLockPass('')
    setLockConfirm('')
    setTimeout(() => setLockMsg(''), 2000)
  }

  const onRemoveLock = async () => {
    if (!lockPass.trim()) {
      setLockMsg('请输入当前密码')
      return
    }
    const ok = await checkLockPassword(lockPass)
    if (!ok) {
      setLockMsg('密码错误')
      return
    }
    removeLock()
    sessionStorage.removeItem('cipher:unlocked')
    setLockMsg('安全锁已关闭')
    setLockPass('')
    setLockConfirm('')
    setTimeout(() => setLockMsg(''), 2000)
  }

  return (
    <main className="min-h-full flex flex-col items-stretch justify-center px-6 py-12 safe-top safe-bottom relative">
      <button
        onClick={toggle}
        className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center border border-ink-600 hover:border-bone-300 rounded transition-colors text-bone-300"
        title={theme === 'dark' ? '切换到浅色' : '切换到深色'}
      >
        {theme === 'dark' ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </button>
      <div className="w-full max-w-[420px] mx-auto">
        <div className="text-[10px] tracking-[0.4em] text-bone-400 uppercase mb-2">
          cipher room
        </div>
        <h1 className="text-2xl text-bone-100 tracking-tightest mb-1">
          cipher<em className="not-italic text-signal-green">.</em>room
        </h1>
        <p className="text-xs text-bone-400 mb-8 leading-relaxed">
          私密聊天工具，保护你的对话安全
        </p>

        <div className="space-y-3">
            <div className="flex gap-3 items-stretch">
              <button
                onClick={() => navigate('/unlock')}
                className="btn btn-primary flex-1 text-left px-4 py-4 flex items-center gap-3 h-16"
              >
                <div className="w-8 h-8 rounded-full bg-signal-green/10 flex items-center justify-center shrink-0">
                  <span className="text-signal-green text-sm">◎</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-bone-100">密室</div>
                  <div className="text-[10px] text-bone-400 mt-0.5 truncate">端对端加密 · 2人上限 · 消息自动消失</div>
                </div>
              </button>
              <button
                onClick={() => navigate('/quick')}
                className="btn btn-primary w-16 h-16 flex items-center justify-center shrink-0"
                title="快速进入"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 1024 1024" fill="currentColor">
                  <path d="M743.6 877.8c-5.2 0-10.3-1.5-14.7-4.4L531 743.6l-85 100.2c-5.1 6-12.6 9.5-20.6 9.5-2.5 0-5-0.4-7.4-1-10.2-2.9-17.7-11.5-19.2-22l-28.3-192.1-212.2-139.3c-8.3-5.4-12.9-14.9-12.1-24.7 0.8-9.8 6.8-18.4 15.9-22.4L838.9 149c0.4-0.2 0.8-0.4 1.3-0.6h0.1c0.7-0.3 1.5-0.6 2.2-0.8h0.1c1-0.3 1.9-0.5 2.6-0.7 1.1-0.3 2.1-0.4 2.9-0.5 0.9-0.1 1.9-0.2 2.8-0.2 0.6 0 1.4 0 2.4 0.1h0.1c0.6 0 1.3 0.1 2.1 0.3 0.7 0.1 1.2 0.2 1.7 0.3 0.9 0.2 1.8 0.5 2.6 0.8h0.1c0.6 0.2 1.2 0.4 1.7 0.7h0.1c2 0.8 3.9 2 5.7 3.4h0.1c0.4 0.3 0.9 0.7 1.4 1.2l0.2 0.2c0.4 0.3 0.7 0.6 0.9 0.8 2.9 2.9 5.1 6.4 6.4 10.3v0.1c0.2 0.5 0.4 1.1 0.6 1.8v0.1c0.1 0.3 0.2 0.7 0.3 1.1 0.1 0.6 0.2 1.1 0.3 1.7v0.1c0.3 1.9 0.4 3.8 0.2 5.6v0.1c0 0.7-0.1 1.4-0.2 2l-0.1 0.5-0.1 0.4-107.1 677.3c-1.5 9.1-7.3 16.8-15.7 20.4-3.4 1.5-7.2 2.3-11 2.3z m-203.9-193c0.4 0.2 0.8 0.5 1.2 0.8l182.6 119.9 87.9-555.6-373.3 368.2 101.6 66.7z m-96.3 78.7l42.2-49.7-54.8-36 12.6 85.7z m-51.5-175.7L712 272.2l-3.9-5.7-479 214.4 162.8 106.9z" />
                </svg>
              </button>
            </div>

            <div className="flex gap-3 items-stretch">
              <button
                onClick={() => navigate('/public/lobby')}
                className="btn btn-primary flex-1 text-left px-4 py-4 flex items-center gap-3 h-16"
              >
                <div className="w-8 h-8 rounded-full bg-signal-amber/10 flex items-center justify-center shrink-0">
                  <span className="text-signal-amber text-sm">●</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-[13px] text-bone-100">系统大厅</div>
                    <span className="text-[9px] tracking-[0.15em] uppercase px-1.5 py-0.5 border border-signal-green/50 text-signal-green">
                      官方
                    </span>
                  </div>
                  <div className="text-[10px] text-bone-400 mt-0.5 truncate">默认公共聊天室 · 设置昵称 · 多人聊天</div>
                </div>
              </button>
              <button
                onClick={() => navigate('/public')}
                className="btn btn-primary w-16 h-16 flex items-center justify-center shrink-0"
                title="更多聊天室"
              >
                <span className="text-xl">···</span>
              </button>
            </div>
          </div>

        <button
          onClick={() => setShowSettings((s) => !s)}
          className="mt-6 w-full text-[10px] tracking-[0.3em] uppercase text-bone-500 hover:text-bone-300 py-2"
        >
          {showSettings ? '收起设置' : '更多设置'}
        </button>

        {showSettings && (
          <div className="mt-4 space-y-4 border-t hairline pt-4">
            <div>
              <label className="block text-[10px] tracking-[0.3em] uppercase text-bone-400 mb-2">
                安全锁 {locked ? '（已开启）' : ''}
              </label>
              {!locked ? (
                <>
                  <div className="relative">
                    <input
                      type={lockShow ? 'text' : 'password'}
                      value={lockPass}
                      onChange={(e) => setLockPass(e.target.value)}
                      placeholder="设置安全锁密码"
                      className="field pr-12"
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <button
                      type="button"
                      onClick={() => setLockShow((s) => !s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] tracking-[0.2em] text-bone-400 px-2 py-1"
                    >
                      {lockShow ? '隐藏' : '显示'}
                    </button>
                  </div>
                  <input
                    type={lockShow ? 'text' : 'password'}
                    value={lockConfirm}
                    onChange={(e) => setLockConfirm(e.target.value)}
                    placeholder="确认密码"
                    className="field mt-2"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <button onClick={onSetLock} className="btn btn-primary w-full mt-3">
                    开启安全锁
                  </button>
                  <p className="mt-1 text-[10px] text-bone-500">
                    开启后每次进入网站需验证此密码，保护你的密室不被他人访问
                  </p>
                </>
              ) : (
                <>
                  <div className="relative">
                    <input
                      type={lockShow ? 'text' : 'password'}
                      value={lockPass}
                      onChange={(e) => setLockPass(e.target.value)}
                      placeholder="输入当前密码以关闭"
                      className="field pr-12"
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <button
                      type="button"
                      onClick={() => setLockShow((s) => !s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] tracking-[0.2em] text-bone-400 px-2 py-1"
                    >
                      {lockShow ? '隐藏' : '显示'}
                    </button>
                  </div>
                  <button onClick={onRemoveLock} className="btn btn-danger w-full mt-3">
                    关闭安全锁
                  </button>
                </>
              )}
              {lockMsg && (
                <p className={`mt-2 text-[11px] ${locked ? 'text-signal-red' : 'text-signal-green'}`}>
                  {lockMsg}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="mt-8 text-[10px] text-bone-500 leading-relaxed text-center">
          <p>提示 · 选择强口令；不在公共设备使用；不要通过明文信道分享。</p>
        </div>
      </div>
    </main>
  )
}
