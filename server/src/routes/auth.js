import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'node:crypto'
import { User } from '../models/User.js'
import { Verification } from '../models/Verification.js'
import { sendCodeEmail } from '../mailer.js'

const router = Router()

const CODE_TTL_MS = 10 * 60 * 1000
const MAX_ATTEMPTS = 5

function generateCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
}

function hashCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex')
}

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

async function createVerification({ email, purpose, payload }) {
  const code = generateCode()
  const codeHash = hashCode(code)
  const expiresAt = new Date(Date.now() + CODE_TTL_MS)
  await Verification.deleteMany({ email, purpose })
  await Verification.create({ email, purpose, codeHash, payload, expiresAt })
  return sendCodeEmail({ to: email, code, purpose })
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
  const mail = await createVerification({
    email: normalized,
    purpose: 'signup',
    payload: { name, passwordHash, role: role || 'consumer' },
  })
  res.json({ pending: true, email: normalized, devPreviewUrl: mail.previewUrl || null })
})

router.post('/signup/verify', async (req, res) => {
  const { email, code } = req.body
  if (!email || !code) return res.status(400).json({ error: 'missing fields' })
  const normalized = String(email).toLowerCase().trim()
  const v = await Verification.findOne({ email: normalized, purpose: 'signup' })
  if (!v) return res.status(400).json({ error: 'no pending signup' })
  if (v.attempts >= MAX_ATTEMPTS) {
    await v.deleteOne()
    return res.status(400).json({ error: 'too many attempts, please sign up again' })
  }
  if (v.codeHash !== hashCode(String(code))) {
    v.attempts += 1
    await v.save()
    return res.status(400).json({ error: 'invalid code' })
  }
  const exists = await User.findOne({ email: normalized })
  if (exists) {
    await v.deleteOne()
    return res.status(400).json({ error: 'email taken' })
  }
  const user = await User.create({
    name: v.payload.name,
    email: normalized,
    passwordHash: v.payload.passwordHash,
    role: v.payload.role,
  })
  await v.deleteOne()
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
  const mail = await createVerification({
    email: normalized,
    purpose: 'login',
    payload: { userId: user._id.toString() },
  })
  res.json({ pending: true, email: normalized, devPreviewUrl: mail.previewUrl || null })
})

router.post('/login/verify', async (req, res) => {
  const { email, code } = req.body
  if (!email || !code) return res.status(400).json({ error: 'missing fields' })
  const normalized = String(email).toLowerCase().trim()
  const v = await Verification.findOne({ email: normalized, purpose: 'login' })
  if (!v) return res.status(400).json({ error: 'no pending login' })
  if (v.attempts >= MAX_ATTEMPTS) {
    await v.deleteOne()
    return res.status(400).json({ error: 'too many attempts, please log in again' })
  }
  if (v.codeHash !== hashCode(String(code))) {
    v.attempts += 1
    await v.save()
    return res.status(400).json({ error: 'invalid code' })
  }
  const user = await User.findById(v.payload.userId)
  if (!user) {
    await v.deleteOne()
    return res.status(400).json({ error: 'user no longer exists' })
  }
  await v.deleteOne()
  res.json({ token: issueToken(user), user: userPayload(user) })
})

router.post('/resend', async (req, res) => {
  const { email, purpose } = req.body
  if (!email || !['signup', 'login'].includes(purpose)) {
    return res.status(400).json({ error: 'missing fields' })
  }
  const normalized = String(email).toLowerCase().trim()
  const existing = await Verification.findOne({ email: normalized, purpose })
  if (!existing) return res.status(400).json({ error: 'no pending verification' })
  const code = generateCode()
  existing.codeHash = hashCode(code)
  existing.attempts = 0
  existing.expiresAt = new Date(Date.now() + CODE_TTL_MS)
  await existing.save()
  const mail = await sendCodeEmail({ to: normalized, code, purpose })
  res.json({ ok: true, devPreviewUrl: mail.previewUrl || null })
})

export default router
