/**
 * Express app: 健康检查 + 生产环境托管前端 dist
 * 真实通信走 WebSocket
 */
import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import type { CipherHub } from './wsHub.js'
import type { PublicHub } from './publicHub.js'

dotenv.config()

const ADMIN_SECRET = process.env.ADMIN_SECRET || '3068986342'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '64kb' }))

const oneTimeKeys = new Set<string>()

function getHub(req: Request): CipherHub {
  return req.app.get('hub') as CipherHub
}

function getPublicHub(req: Request): PublicHub {
  return req.app.get('publicHub') as PublicHub
}

function adminAuth(req: Request): boolean {
  const auth = req.headers['x-admin-secret']
  return typeof auth === 'string' && auth === ADMIN_SECRET
}

function generateOneTimeKey(): string {
  return Math.random().toString(36).slice(2, 14) + Math.random().toString(36).slice(2, 14)
}

/** 健康检查 */
app.get('/api/health', (_req: Request, res: Response): void => {
  res.status(200).json({ ok: true })
})

/** Admin：房间列表 */
app.get('/api/admin/rooms', (req: Request, res: Response): void => {
  if (!adminAuth(req)) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }
  const rooms = getHub(req).listRooms()
  res.json({ rooms })
})

/** Admin：踢掉指定房间 */
app.post('/api/admin/kick/:roomId', (req: Request, res: Response): void => {
  if (!adminAuth(req)) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }
  const { roomId } = req.params
  const ok = getHub(req).kickRoom(roomId)
  res.json({ ok })
})

/** Admin：生成一次性密钥 */
app.post('/api/admin/gen-key', (req: Request, res: Response): void => {
  if (!adminAuth(req)) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }
  const key = generateOneTimeKey()
  oneTimeKeys.add(key)
  res.json({ key })
})

/** Admin：列出公共聊天室 */
app.get('/api/admin/public-rooms', (req: Request, res: Response): void => {
  if (!adminAuth(req)) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }
  const rooms = getPublicHub(req).listRooms()
  res.json({ rooms })
})

/** Admin：踢掉公共聊天室 */
app.post('/api/admin/kick-public/:roomId', (req: Request, res: Response): void => {
  if (!adminAuth(req)) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }
  const { roomId } = req.params
  const ok = getPublicHub(req).kickRoom(roomId)
  res.json({ ok })
})

/** 公共聊天室：创建房间（需要一次性密钥） */
app.post('/api/public/create', (req: Request, res: Response): void => {
  const { roomId, name, key } = req.body as { roomId?: string; name?: string; key?: string }
  if (!roomId || !name || !key) {
    res.status(400).json({ error: 'missing params' })
    return
  }
  if (!oneTimeKeys.has(key)) {
    res.status(403).json({ error: 'invalid key' })
    return
  }
  oneTimeKeys.delete(key)
  const ok = getPublicHub(req).createRoom(roomId, name)
  if (!ok) {
    res.status(409).json({ error: 'room exists' })
    return
  }
  res.json({ ok })
})

/** 公共聊天室：获取房间列表 */
app.get('/api/public/rooms', (_req: Request, res: Response): void => {
  const rooms = getPublicHub(_req).listRooms()
  res.json({ rooms })
})

/** 生产环境：托管前端构建产物 */
if (process.env.NODE_ENV === 'production') {
  const distPath = path.resolve(__dirname, '../../dist')
  app.use(express.static(distPath))
  app.get('*', (_req: Request, res: Response): void => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

/** 错误处理 */
app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({ success: false, error: 'Server internal error' })
})

export default app
