import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'node:path'
import http from 'node:http'
import { fileURLToPath } from 'node:url'
import { Server as SocketServer } from 'socket.io'
import { connectDb } from './db.js'
import authRoutes from './routes/auth.js'
import productRoutes from './routes/products.js'
import priceRoutes from './routes/prices.js'
import adminRoutes from './routes/admin.js'
import userRoutes from './routes/users.js'
import listingRoutes from './routes/listings.js'
import { requireAuth } from './middleware/auth.js'
import { requireRole } from './middleware/role.js'
import { setIo } from './realtime.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
const server = http.createServer(app)
const io = new SocketServer(server, {
  cors: { origin: process.env.CLIENT_ORIGIN || '*' },
})
setIo(io)

const chatHistory = []

io.on('connection', (socket) => {
  console.log('socket connected', socket.id)
  socket.emit('chat:history', chatHistory)
  socket.on('chat:send', (msg) => {
    if (!msg || !msg.text || !msg.name) return
    const entry = {
      id: Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      name: String(msg.name).slice(0, 40),
      role: msg.role || 'guest',
      text: String(msg.text).slice(0, 500),
      at: Date.now(),
    }
    chatHistory.push(entry)
    while (chatHistory.length > 50) chatHistory.shift()
    io.emit('chat:msg', entry)
  })
})

app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*' }))
app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')))

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/prices', priceRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/users', userRoutes)
app.use('/api/listings', listingRoutes)

app.get('/api/me', requireAuth, (req, res) => {
  res.json({ user: req.user })
})


const port = process.env.PORT || 4000

connectDb(process.env.MONGO_URI).catch((err) => {
  console.error('mongo connect failed:', err.message)
})

server.listen(port, () => {
  console.log(`server on http://localhost:${port}`)
})
