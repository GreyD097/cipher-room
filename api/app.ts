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

dotenv.config()

const ADMIN_SECRET = process.env.ADMIN_SECRET || '3068986342'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '64kb' }))

function getHub(req: Request): CipherHub {
  return req.app.get('hub') as CipherHub
}

function adminAuth(req: Request): boolean {
  const auth = req.headers['x-admin-secret']
  return typeof auth === 'string' && auth === ADMIN_SECRET
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
