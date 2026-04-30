import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import path from 'node:path'
import http from 'node:http'
import { fileURLToPath } from 'node:url'
import { Server as SocketServer } from 'socket.io'
import { connectDb } from './db.js'
import { User } from './models/User.js'
import { Message } from './models/Message.js'
import { CommunityMessage } from './models/CommunityMessage.js'
import authRoutes from './routes/auth.js'
import productRoutes from './routes/products.js'
import priceRoutes from './routes/prices.js'
import adminRoutes from './routes/admin.js'
import userRoutes from './routes/users.js'
import listingRoutes from './routes/listings.js'
import orderRoutes from './routes/orders.js'
import chatRoutes from './routes/chat.js'
import notificationRoutes from './routes/notifications.js'
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

io.use((socket, next) => {
  const token = socket.handshake.auth?.token
  if (!token) return next()
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    socket.data.userId = payload.id
    socket.data.role = payload.role
  } catch {}
  next()
})

const presence = new Map() // userId -> connection count
function onlineUserIds() { return [...presence.keys()] }

io.on('connection', async (socket) => {
  console.log('socket connected', socket.id)
  if (socket.data.userId) {
    socket.join(`user:${socket.data.userId}`)
    const prev = presence.get(socket.data.userId) || 0
    presence.set(socket.data.userId, prev + 1)
    if (prev === 0) {
      io.emit('presence:update', { userId: socket.data.userId, online: true })
    }
  }
  socket.emit('presence:list', { online: onlineUserIds(), totalOnline: presence.size })

  socket.on('disconnect', () => {
    if (!socket.data.userId) return
    const prev = presence.get(socket.data.userId) || 0
    if (prev <= 1) {
      presence.delete(socket.data.userId)
      io.emit('presence:update', { userId: socket.data.userId, online: false })
    } else {
      presence.set(socket.data.userId, prev - 1)
    }
  })

  try {
    const recent = await CommunityMessage.find()
      .sort({ createdAt: -1 })
      .limit(200)
      .lean()
    const history = recent.reverse().map((m) => ({
      id: m._id.toString(),
      name: m.name,
      role: m.role,
      text: m.text,
      at: new Date(m.createdAt).getTime(),
    }))
    socket.emit('chat:history', history)
  } catch (e) {
    console.error('community chat history failed:', e.message)
    socket.emit('chat:history', [])
  }

  socket.on('chat:send', async (msg) => {
    try {
      if (!msg || !msg.text || !String(msg.text).trim()) return
      if (!socket.data.userId) return
      const user = await User.findById(socket.data.userId).select('name role')
      if (!user) return
      const saved = await CommunityMessage.create({
        userId: user._id,
        name: user.name,
        role: user.role,
        text: String(msg.text).slice(0, 500),
      })
      io.emit('chat:msg', {
        id: saved._id.toString(),
        name: saved.name,
        role: saved.role,
        text: saved.text,
        at: new Date(saved.createdAt).getTime(),
      })
    } catch (e) {
      console.error('community chat send failed:', e.message)
    }
  })

  socket.on('chat:dm:send', async (payload, ack) => {
    try {
      const senderId = socket.data.userId
      if (!senderId) return ack?.({ error: 'unauthenticated' })
      const { to, text } = payload || {}
      if (!to || !text || !String(text).trim()) {
        return ack?.({ error: 'invalid' })
      }
      const saved = await Message.create({
        senderId,
        receiverId: to,
        message: String(text).slice(0, 1000),
        isRead: false,
      })
      const out = {
        _id: saved._id,
        senderId: saved.senderId,
        receiverId: saved.receiverId,
        message: saved.message,
        isRead: saved.isRead,
        createdAt: saved.createdAt,
      }
      io.to(`user:${to}`).emit('chat:dm:msg', out)
      io.to(`user:${senderId}`).emit('chat:dm:msg', out)
      ack?.({ ok: true, message: out })
    } catch (e) {
      ack?.({ error: e.message })
    }
  })

  socket.on('chat:dm:read', async ({ from } = {}) => {
    const me = socket.data.userId
    if (!me || !from) return
    await Message.updateMany(
      { senderId: from, receiverId: me, isRead: false },
      { $set: { isRead: true } },
    )
    io.to(`user:${from}`).emit('chat:dm:read', { by: me })
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
app.use('/api/marketplace/products', listingRoutes)
app.use('/api/marketplace/orders', orderRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/notifications', notificationRoutes)

app.get('/api/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id).select('name email role')
  if (!user || user.role !== req.user.role) {
    return res.status(401).json({ error: 'session invalid' })
  }
  res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role } })
})


const port = process.env.PORT || 4000

connectDb(process.env.MONGO_URI).catch((err) => {
  console.error('mongo connect failed:', err.message)
})

server.listen(port, () => {
  console.log(`server on http://localhost:${port}`)
})
