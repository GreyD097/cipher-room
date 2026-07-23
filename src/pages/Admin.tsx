import { useEffect, useState } from 'react'

interface RoomInfo {
  roomId: string
  peers: number
}

export default function Admin() {
  const [secret, setSecret] = useState('')
  const [authed, setAuthed] = useState(false)
  const [rooms, setRooms] = useState<RoomInfo[]>([])
  const [tokenResult, setTokenResult] = useState('')
  const [vipDays, setVipDays] = useState(30)
  const [vipTtl, setVipTtl] = useState(300)
  const [vipCustomRoom, setVipCustomRoom] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('cipher:admin-secret')
    if (saved) {
      setSecret(saved)
      setAuthed(true)
    }
  }, [])

  const onLogin = () => {
    if (!secret) return
    fetch('/api/admin/rooms', { headers: { 'x-admin-secret': secret } })
      .then((r) => {
        if (!r.ok) throw new Error('口令错误')
        localStorage.setItem('cipher:admin-secret', secret)
        setAuthed(true)
        setErr('')
        return r.json()
      })
      .then((d) => setRooms(d.rooms))
      .catch((e) => setErr(e.message))
  }

  const refreshRooms = () => {
    fetch('/api/admin/rooms', { headers: { 'x-admin-secret': secret } })
      .then((r) => r.json())
      .then((d) => setRooms(d.rooms))
      .catch(() => {})
  }

  const onKick = (roomId: string) => {
    if (!confirm(`确定踢掉房间 ${roomId}？`)) return
    fetch(`/api/admin/kick/${encodeURIComponent(roomId)}`, {
      method: 'POST',
      headers: { 'x-admin-secret': secret },
    })
      .then(() => refreshRooms())
      .catch(() => {})
  }

  const onIssue = () => {
    fetch('/api/admin/issue-vip', {
      method: 'POST',
      headers: {
        'x-admin-secret': secret,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ days: vipDays, ttl: vipTtl, customRoom: vipCustomRoom }),
    })
      .then((r) => r.json())
      .then((d) => {
        setTokenResult(d.token)
      })
      .catch(() => {})
  }

  const onLogout = () => {
    localStorage.removeItem('cipher:admin-secret')
    setAuthed(false)
    setSecret('')
    setRooms([])
    setTokenResult('')
  }

  if (!authed) {
    return (
      <main className="min-h-full flex flex-col items-stretch justify-center px-6 py-12 safe-top safe-bottom">
        <div className="w-full max-w-[420px] mx-auto">
          <div className="text-[10px] tracking-[0.4em] text-bone-400 uppercase mb-2">
            管理后台
          </div>
          <h1 className="text-2xl text-bone-100 tracking-tightest mb-8">admin</h1>
          <label className="block text-[10px] tracking-[0.3em] uppercase text-bone-400 mb-2">
            管理员口令
          </label>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onLogin()}
            className="field"
            autoComplete="off"
            spellCheck={false}
          />
          {err && <p className="mt-3 text-signal-red text-xs">{err}</p>}
          <button onClick={onLogin} className="btn btn-primary w-full mt-6">
            进入
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-full px-6 py-6 safe-top safe-bottom">
      <div className="w-full max-w-[640px] mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div>
            <div className="text-[10px] tracking-[0.4em] text-bone-400 uppercase">
              管理后台
            </div>
            <h1 className="text-xl text-bone-100 tracking-tight">admin</h1>
          </div>
          <button
            onClick={onLogout}
            className="text-[10px] tracking-[0.3em] uppercase text-signal-red/80 hover:text-signal-red px-2 py-1"
          >
            退出
          </button>
        </header>

        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[12px] tracking-[0.3em] uppercase text-bone-300">
              活跃房间
            </h2>
            <button
              onClick={refreshRooms}
              className="text-[10px] tracking-[0.2em] uppercase text-bone-400 hover:text-bone-200"
            >
              刷新
            </button>
          </div>
          <div className="border hairline divide-y divide-ink-700">
            {rooms.length === 0 && (
              <div className="px-4 py-6 text-center text-[12px] text-bone-500">
                暂无活跃房间
              </div>
            )}
            {rooms.map((r) => (
              <div
                key={r.roomId}
                className="px-4 py-3 flex items-center justify-between"
              >
                <div>
                  <div className="text-bone-100 text-[13px] font-mono">{r.roomId}</div>
                  <div className="text-[10px] text-bone-500 tracking-wider uppercase">
                    {r.peers} 人在线
                  </div>
                </div>
                <button
                  onClick={() => onKick(r.roomId)}
                  className="text-[10px] tracking-[0.2em] uppercase text-signal-red/80 hover:text-signal-red px-2 py-1"
                >
                  踢掉
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-[12px] tracking-[0.3em] uppercase text-bone-300 mb-3">
            签发 VIP 令牌
          </h2>
          <div className="space-y-3 border hairline p-4">
            <div>
              <label className="block text-[10px] tracking-[0.2em] uppercase text-bone-400 mb-1">
                有效期（天）
              </label>
              <input
                type="number"
                value={vipDays}
                onChange={(e) => setVipDays(Number(e.target.value))}
                className="field"
                min={1}
              />
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.2em] uppercase text-bone-400 mb-1">
                消息保存时长（秒）
              </label>
              <input
                type="number"
                value={vipTtl}
                onChange={(e) => setVipTtl(Number(e.target.value))}
                className="field"
                min={60}
              />
            </div>
            <label className="flex items-center gap-2 text-[12px] text-bone-300">
              <input
                type="checkbox"
                checked={vipCustomRoom}
                onChange={(e) => setVipCustomRoom(e.target.checked)}
              />
              允许自定义房间号
            </label>
            <button onClick={onIssue} className="btn btn-primary w-full">
              生成令牌
            </button>
          </div>
          {tokenResult && (
            <div className="mt-3">
              <div className="text-[10px] tracking-[0.2em] uppercase text-bone-400 mb-1">
                令牌
              </div>
              <div className="border hairline p-3 text-[11px] text-bone-200 break-all font-mono bg-ink-900">
                {tokenResult}
              </div>
              <button
                onClick={() => navigator.clipboard?.writeText(tokenResult)}
                className="mt-2 text-[10px] tracking-[0.2em] uppercase text-bone-400 hover:text-bone-200"
              >
                复制
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
