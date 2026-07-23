import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface RoomItem {
  roomId: string
  name: string
  peers: number
  messages: number
}

export default function PublicList() {
  const navigate = useNavigate()
  const [rooms, setRooms] = useState<RoomItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    document.title = '公共聊天室 · cipher.room'
    loadRooms()
    const timer = setInterval(loadRooms, 10000)
    return () => clearInterval(timer)
  }, [])

  const loadRooms = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/public/rooms')
      const data = await res.json()
      setRooms(data.rooms || [])
    } catch {
      setError('加载失败')
    } finally {
      setLoading(false)
    }
  }

  const goBack = () => {
    navigate('/')
  }

  const joinRoom = (roomId: string) => {
    navigate(`/public/${roomId}`)
  }

  return (
    <main className="min-h-full flex flex-col safe-top safe-bottom">
      <header className="border-b hairline px-4 py-3 mx-auto w-full max-w-[640px]">
        <div className="flex items-center gap-3">
          <button
            onClick={goBack}
            className="text-[10px] tracking-[0.2em] uppercase text-bone-400 hover:text-bone-200 px-2 py-1"
          >
            ← 主页
          </button>
          <div className="flex-1">
            <div className="text-[10px] tracking-[0.4em] text-bone-500 uppercase">公共聊天室</div>
            <h1 className="text-xl text-bone-100 tracking-tight">public rooms</h1>
          </div>
          <button
            onClick={() => navigate('/public/create')}
            className="btn btn-primary text-[10px] tracking-[0.2em] px-3 py-1"
          >
            创建
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 mx-auto w-full max-w-[640px]">
        {loading && (
          <div className="text-center text-[11px] text-bone-400 mt-8">
            加载中...
          </div>
        )}
        {error && (
          <div className="text-center text-signal-red text-[11px] mt-8">
            {error}
          </div>
        )}
        {!loading && !error && rooms.length === 0 && (
          <div className="text-center text-[11px] text-bone-400 mt-8">
            <p className="mb-1 tracking-[0.3em] uppercase">— 暂无公共聊天室 —</p>
            <p>成为第一个创建者！</p>
          </div>
        )}
        {!loading && !error && rooms.length > 0 && (
          <div className="space-y-2">
            {rooms.map((room) => (
              <button
                key={room.roomId}
                onClick={() => joinRoom(room.roomId)}
                className="w-full text-left border hairline px-4 py-3 hover:bg-ink-800/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-bone-100 text-[13px]">{room.name}</div>
                    <div className="text-[10px] text-bone-500 mt-0.5 font-mono">
                      {room.roomId}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-bone-300">{room.peers} 人在线</div>
                    <div className="text-[10px] text-bone-500 mt-0.5">{room.messages} 条消息</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
