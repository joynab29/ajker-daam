import { Router } from 'express'
import { User } from '../models/User.js'
import { PriceReport } from '../models/PriceReport.js'

const router = Router()

router.get('/:id/reputation', async (req, res) => {
  const user = await User.findById(req.params.id).select('name role createdAt')
  if (!user) return res.status(404).json({ error: 'not found' })
  const [total, flagged, anomalies] = await Promise.all([
    PriceReport.countDocuments({ userId: user._id }),
    PriceReport.countDocuments({ userId: user._id, status: 'flagged' }),
    PriceReport.countDocuments({ userId: user._id, isAnomaly: true }),
  ])
  const score = Math.max(0, total - flagged * 5)
  res.json({ user, total, flagged, anomalies, score })
})

router.get('/leaderboard', async (_req, res) => {
  const rows = await PriceReport.aggregate([
    {
      $group: {
        _id: '$userId',
        total: { $sum: 1 },
        flagged: { $sum: { $cond: [{ $eq: ['$status', 'flagged'] }, 1, 0] } },
        anomalies: { $sum: { $cond: ['$isAnomaly', 1, 0] } },
      },
    },
    { $sort: { total: -1 } },
    { $limit: 20 },
  ])
  const ids = rows.map((r) => r._id)
  const users = await User.find({ _id: { $in: ids } }).select('name role')
  const byId = Object.fromEntries(users.map((u) => [u._id.toString(), u]))
  res.json({
    leaderboard: rows
      .filter((r) => byId[r._id?.toString()])
      .map((r) => ({
        user: byId[r._id.toString()],
        total: r.total,
        flagged: r.flagged,
        anomalies: r.anomalies,
        score: Math.max(0, r.total - r.flagged * 5),
      })),
  })
})

export default router
