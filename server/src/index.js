import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { connectDb } from './db.js'
import authRoutes from './routes/auth.js'
import productRoutes from './routes/products.js'
import { requireAuth } from './middleware/auth.js'
import { requireRole } from './middleware/role.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()

app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*' }))
app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')))

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)

app.get('/api/me', requireAuth, (req, res) => {
  res.json({ user: req.user })
})

app.get('/api/admin/ping', requireAuth, requireRole('admin'), (_req, res) => {
  res.json({ ok: true })
})

const port = process.env.PORT || 4000

connectDb(process.env.MONGO_URI).catch((err) => {
  console.error('mongo connect failed:', err.message)
})

app.listen(port, () => {
  console.log(`server on http://localhost:${port}`)
})
