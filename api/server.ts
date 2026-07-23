/**
 * local server entry file, for local development
 */
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import app from './app.js'
import { CipherHub } from './wsHub.js'

const PORT = process.env.PORT || 3001

const server = createServer(app)
const wss = new WebSocketServer({ noServer: true })
const hub = new CipherHub({ wss, log: (m) => console.log('[hub]', m) })

// 将 hub 挂载到 app 供路由使用
app.set('hub', hub)

server.on('upgrade', (req, socket, head) => {
  if (!req.url) {
    socket.destroy()
    return
  }
  if (req.url.startsWith('/ws/')) {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req)
    })
  } else {
    socket.destroy()
  }
})

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server ready on port ${PORT}`)
})

/**
 * close server
 */
const shutdown = (signal: string) => {
  // eslint-disable-next-line no-console
  console.log(`${signal} signal received`)
  wss.close()
  server.close(() => {
    // eslint-disable-next-line no-console
    console.log('Server closed')
    process.exit(0)
  })
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

export default server
