import { Router } from 'express'
import { PushSubscription } from '../models/PushSubscription.js'
import { requireAuth } from '../middleware/auth.js'
import { VAPID_PUBLIC_KEY, pushToUser } from '../services/notify.js'

const router = Router()

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
