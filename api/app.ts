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

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '64kb' }))

/** 健康检查 */
app.get('/api/health', (_req: Request, res: Response): void => {
  res.status(200).json({ ok: true })
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
