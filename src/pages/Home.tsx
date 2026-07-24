import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { setLockPassword, removeLock, hasLock, checkLockPassword } from '@/lib/lock'

export default function Home() {
  const navigate = useNavigate()
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
    <main className="min-h-full flex flex-col items-stretch justify-center px-6 py-12 safe-top safe-bottom">
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
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/unlock')}
              className="btn btn-primary flex-1 text-left px-4 py-4 flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-signal-green/10 flex items-center justify-center">
                <span className="text-signal-green text-sm">◎</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-bone-100">密室</div>
                <div className="text-[10px] text-bone-400 mt-0.5 truncate">端对端加密 · 2人上限 · 消息自动消失</div>
              </div>
            </button>
            <button
              onClick={() => navigate('/quick')}
              className="btn btn-primary w-16 h-16 flex items-center justify-center text-signal-amber border-signal-amber/50 hover:border-signal-amber"
              title="快速进入"
            >
              <span className="text-xl">⚡</span>
            </button>
          </div>

          <button
            onClick={() => navigate('/public')}
            className="btn btn-outline w-full text-left px-4 py-4 flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-signal-amber/10 flex items-center justify-center">
              <span className="text-signal-amber text-sm">●</span>
            </div>
            <div className="flex-1">
              <div className="text-[13px] text-bone-100">公共聊天室</div>
              <div className="text-[10px] text-bone-400 mt-0.5">消息持久 · 设置昵称 · 多人聊天</div>
            </div>
            <span className="text-bone-500 text-sm">→</span>
          </button>
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
