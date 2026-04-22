import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { User } from '../models/User.js'

const router = Router()

router.post('/signup', async (req, res) => {
  const { name, email, password, role } = req.body
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'missing fields' })
  }
  const exists = await User.findOne({ email })
  if (exists) return res.status(400).json({ error: 'email taken' })
  const passwordHash = await bcrypt.hash(password, 10)
  const user = await User.create({
    name,
    email,
    passwordHash,
    role: role || 'consumer',
  })
  const token = jwt.sign(
    { id: user._id, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )
  res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } })
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body
  const user = await User.findOne({ email })
  if (!user) return res.status(400).json({ error: 'bad credentials' })
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return res.status(400).json({ error: 'bad credentials' })
  const token = jwt.sign(
    { id: user._id, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )
  res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } })
})

export default router
