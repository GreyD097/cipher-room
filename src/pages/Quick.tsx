import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const ROOM_ID = 'admin-quick'

export default function Quick() {
  const navigate = useNavigate()
  const [pass, setPass] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')

  const onEnter = () => {
    if (!pass.trim()) {
      setError('请输入密码')
      return
    }
    sessionStorage.setItem('cipher:pass', pass)
    sessionStorage.setItem('cipher:room', ROOM_ID)
    sessionStorage.setItem('cipher:ttl', '120')
    navigate(`/r/${ROOM_ID}`)
  }

  return (
    <main className="min-h-full flex flex-col items-stretch justify-center px-6 py-12 safe-top safe-bottom">
      <div className="w-full max-w-[420px] mx-auto">
        <button
          onClick={() => navigate('/')}
          className="text-[10px] tracking-[0.3em] uppercase text-bone-400 hover:text-bone-200 mb-6 flex items-center gap-1"
        >
          <span>←</span> 主页
        </button>

        <div className="text-[10px] tracking-[0.4em] text-bone-400 uppercase mb-2">
          quick entry
        </div>
        <h1 className="text-2xl text-bone-100 tracking-tightest mb-4">
          快速进入
        </h1>
        <p className="text-xs text-bone-400 mb-8 leading-relaxed">
          管理员快捷通道，无需创建房间号
        </p>

        {error && (
          <p className="text-[11px] text-signal-red mb-4">{error}</p>
        )}

        <div className="relative">
          <input
            type={show ? 'text' : 'password'}
            value={pass}
            onChange={(e) => {
              setPass(e.target.value)
              setError('')
            }}
            placeholder="输入密码"
            className="field pr-12"
            autoComplete="off"
            spellCheck={false}
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] tracking-[0.2em] text-bone-400 px-2 py-1"
          >
            {show ? '隐藏' : '显示'}
          </button>
        </div>

        <button onClick={onEnter} className="btn btn-primary w-full mt-4">
          进入
        </button>

        <div className="mt-8 text-[10px] text-bone-500 leading-relaxed text-center">
          <p>· 仅支持 2 人同时在线 ·</p>
          <p>· 消息 120 秒后自动消失 ·</p>
        </div>
      </div>
    </main>
  )
}
