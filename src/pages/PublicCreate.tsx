import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function PublicCreate() {
  const navigate = useNavigate()
  const [roomId, setRoomId] = useState('')
  const [name, setName] = useState('')
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const generateRoomId = () => {
    setRoomId(Math.random().toString(36).slice(2, 12))
  }

  const onCreate = async () => {
    if (busy) return
    if (!roomId.trim()) {
      setError('请输入房间号')
      return
    }
    if (!name.trim()) {
      setError('请输入房间名称')
      return
    }
    if (!key.trim()) {
      setError('请输入创建密钥')
      return
    }
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/public/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: roomId.trim(), name: name.trim(), key: key.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.error === 'invalid key') {
          setError('密钥无效或已使用')
        } else if (data.error === 'room exists') {
          setError('房间已存在')
        } else {
          setError('创建失败')
        }
        return
      }
      navigate(`/public/${roomId.trim()}`)
    } catch {
      setError('创建失败')
    } finally {
      setBusy(false)
    }
  }

  const goBack = () => {
    navigate('/public')
  }

  return (
    <main className="min-h-full flex flex-col items-stretch justify-center px-6 py-12 safe-top safe-bottom">
      <div className="w-full max-w-[420px] mx-auto">
        <header className="flex items-center gap-3 mb-8">
          <button
            onClick={goBack}
            className="text-[10px] tracking-[0.2em] uppercase text-bone-400 hover:text-bone-200 px-2 py-1"
          >
            ← 返回
          </button>
          <div className="flex-1">
            <div className="text-[10px] tracking-[0.4em] text-bone-500 uppercase">创建公共聊天室</div>
            <h1 className="text-xl text-bone-100 tracking-tight">create room</h1>
          </div>
        </header>

        <label className="block text-[10px] tracking-[0.3em] uppercase text-bone-400 mb-2">
          房间号
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value.slice(0, 128))}
            placeholder="自定义房间号"
            className="field flex-1"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            onClick={generateRoomId}
            className="btn btn-outline px-3 text-[10px] tracking-[0.2em]"
          >
            随机
          </button>
        </div>

        <label className="block text-[10px] tracking-[0.3em] uppercase text-bone-400 mb-2 mt-4">
          房间名称
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 64))}
          placeholder="显示名称（如：技术交流群）"
          className="field"
          autoComplete="off"
          spellCheck={false}
        />

        <label className="block text-[10px] tracking-[0.3em] uppercase text-bone-400 mb-2 mt-4">
          创建密钥
        </label>
        <input
          type="text"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="在管理后台获取一次性密钥"
          className="field"
          autoComplete="off"
          spellCheck={false}
        />
        <p className="mt-1 text-[10px] text-bone-500">
          创建公共聊天室需要管理员生成的一次性密钥，每个密钥只能使用一次
        </p>

        {error && (
          <p className="mt-4 text-signal-red text-[11px]">{error}</p>
        )}

        <button
          onClick={onCreate}
          disabled={busy || !roomId.trim() || !name.trim() || !key.trim()}
          className="btn btn-primary w-full mt-6"
        >
          {busy ? '创建中…' : '创建 →'}
        </button>
      </div>
    </main>
  )
}
