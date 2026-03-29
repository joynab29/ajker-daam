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

io.on('connection', (socket) => {
  console.log('socket connected', socket.id)
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
