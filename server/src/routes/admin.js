import { Router } from 'express'
import { User } from '../models/User.js'
import { Product } from '../models/Product.js'
import { PriceReport } from '../models/PriceReport.js'
import { requireAuth } from '../middleware/auth.js'
import { requireRole } from '../middleware/role.js'

const router = Router()

router.use(requireAuth, requireRole('admin'))

router.get('/users', async (_req, res) => {
  const users = await User.find().select('-passwordHash').sort({ createdAt: -1 })
  res.json({ users })
})

router.get('/stats', async (_req, res) => {
  const [users, products, prices, anomalies, flagged] = await Promise.all([
    User.countDocuments(),
    Product.countDocuments(),
    PriceReport.countDocuments(),
    PriceReport.countDocuments({ isAnomaly: true }),
    PriceReport.countDocuments({ status: 'flagged' }),
  ])
  res.json({ users, products, prices, anomalies, flagged })
})

router.delete('/users/:id', async (req, res) => {
  await User.findByIdAndDelete(req.params.id)
  res.json({ ok: true })
})

const BAN_THRESHOLD = 3

router.get('/fraud-counts', async (_req, res) => {
  const rows = await PriceReport.aggregate([
    { $match: { status: 'flagged' } },
    { $group: { _id: '$userId', count: { $sum: 1 } } },
  ])
  const counts = Object.fromEntries(rows.map((r) => [r._id?.toString(), r.count]))
  res.json({ counts, threshold: BAN_THRESHOLD })
})

router.post('/users/:id/ban', async (req, res) => {
  const userId = req.params.id
  const flagged = await PriceReport.countDocuments({ userId, status: 'flagged' })
  if (flagged < BAN_THRESHOLD) {
    return res.status(400).json({
      error: `user has only ${flagged} flagged report(s); needs ≥${BAN_THRESHOLD} to ban`,
      flagged,
      threshold: BAN_THRESHOLD,
    })
  }
  const user = await User.findByIdAndUpdate(
    userId,
    { status: 'banned', bannedAt: new Date(), banReason: req.body?.reason || `${flagged} flagged reports` },
    { new: true },
  ).select('-passwordHash')
  if (!user) return res.status(404).json({ error: 'user not found' })
  res.json({ user, flagged, threshold: BAN_THRESHOLD })
})

router.post('/users/:id/unban', async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { status: 'active', bannedAt: null, banReason: '' },
    { new: true },
  ).select('-passwordHash')
  if (!user) return res.status(404).json({ error: 'user not found' })
  res.json({ user })
})

export default router
