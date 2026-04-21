import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { User } from '../models/User.js'

const router = Router()

function issueToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )
}

function userPayload(user) {
  return { id: user._id, name: user.name, email: user.email, role: user.role }
}

router.post('/signup', async (req, res) => {
  const { name, email, password, role } = req.body
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'missing fields' })
  }
  const normalized = String(email).toLowerCase().trim()
  const exists = await User.findOne({ email: normalized })
  if (exists) return res.status(400).json({ error: 'email taken' })
  const passwordHash = await bcrypt.hash(password, 10)
  const user = await User.create({
    name,
    email: normalized,
    passwordHash,
    role: role || 'consumer',
  })
  res.json({ token: issueToken(user), user: userPayload(user) })
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'missing fields' })
  const normalized = String(email).toLowerCase().trim()
  const user = await User.findOne({ email: normalized })
  if (!user) return res.status(400).json({ error: 'bad credentials' })
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return res.status(400).json({ error: 'bad credentials' })
  res.json({ token: issueToken(user), user: userPayload(user) })
})

export default router
