import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { PushSubscription } from '../models/PushSubscription.js'
import { Notification } from '../models/Notification.js'
import { requireAuth } from '../middleware/auth.js'
import { VAPID_PUBLIC_KEY, pushToUser } from '../services/notify.js'

const router = Router()

function softAuth(req) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return null
  try {
    return jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    return null
  }
}

router.get('/feed', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500)
  const me = softAuth(req)
  const filter = me?.id
    ? { $or: [{ userId: null }, { userId: me.id }] }
    : { userId: null }
  const items = await Notification.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
  res.json({
    items: items.map((n) => ({
      id: n._id.toString(),
      kind: n.kind,
      refId: n.refId,
      title: n.title,
      body: n.body,
      link: n.link,
      icon: n.icon,
      accent: n.accent,
      at: new Date(n.createdAt).getTime(),
    })),
  })
})

router.get('/public-key', (_req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY })
})

router.post('/subscribe', requireAuth, async (req, res) => {
  const { endpoint, keys, userAgent } = req.body || {}
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: 'invalid subscription' })
  }
  const sub = await PushSubscription.findOneAndUpdate(
    { endpoint },
    {
      userId: req.user.id,
      endpoint,
      keys: { p256dh: keys.p256dh, auth: keys.auth },
      userAgent: userAgent || '',
    },
    { upsert: true, new: true },
  )
  res.json({ ok: true, id: sub._id })
})

router.post('/unsubscribe', requireAuth, async (req, res) => {
  const { endpoint } = req.body || {}
  if (!endpoint) return res.status(400).json({ error: 'endpoint required' })
  await PushSubscription.deleteOne({ endpoint, userId: req.user.id })
  res.json({ ok: true })
})

router.post('/test', requireAuth, async (req, res) => {
  await pushToUser(req.user.id, {
    title: 'Test notification',
    body: 'Push is working.',
    url: '/',
  })
  res.json({ ok: true })
})

export default router
