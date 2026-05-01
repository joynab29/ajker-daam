import { Router } from 'express'
import mongoose from 'mongoose'
import { User } from '../models/User.js'
import { PriceReport } from '../models/PriceReport.js'
import { Review } from '../models/Review.js'
import { Order } from '../models/Order.js'
import { Listing } from '../models/Listing.js'
import { requireAuth } from '../middleware/auth.js'
import { requireRole } from '../middleware/role.js'
import { emit } from '../realtime.js'

const router = Router()

router.get('/me/delivery', requireAuth, requireRole('vendor'), async (req, res) => {
  const user = await User.findById(req.user.id).select('delivery')
  res.json({ delivery: user?.delivery || {} })
})

router.put('/me/delivery', requireAuth, requireRole('vendor'), async (req, res) => {
  const { sameDistrictFee, otherDistrictFee, sameDistrictEta, otherDistrictEta } = req.body || {}
  const update = {
    'delivery.sameDistrictFee': Math.max(0, Number(sameDistrictFee) || 0),
    'delivery.otherDistrictFee': Math.max(0, Number(otherDistrictFee) || 0),
    'delivery.sameDistrictEta': String(sameDistrictEta || ''),
    'delivery.otherDistrictEta': String(otherDistrictEta || ''),
  }
  const user = await User.findByIdAndUpdate(req.user.id, { $set: update }, { new: true }).select('delivery')
  res.json({ delivery: user.delivery })
})

router.get('/vendors/:id/reputation', async (req, res) => {
  const id = req.params.id
  const vendor = await User.findById(id).select('name role verified ratingAvg ratingCount delivery vendorBio createdAt')
  if (!vendor) return res.status(404).json({ error: 'not found' })
  const [reviews, orderStats, listingsCount] = await Promise.all([
    Review.find({ vendorId: id }).sort({ createdAt: -1 }).limit(20).populate('consumerId', 'name'),
    Order.aggregate([
      { $match: { vendorId: vendor._id } },
      { $group: { _id: '$status', n: { $sum: 1 } } },
    ]),
    Listing.countDocuments({ vendorId: vendor._id }),
  ])
  const byStatus = Object.fromEntries(orderStats.map((r) => [r._id, r.n]))
  const totalSold = (byStatus.completed || 0) + (byStatus.delivered || 0)
  const totalOrders = orderStats.reduce((s, r) => s + r.n, 0)
  const completionRate = totalOrders ? totalSold / totalOrders : null
  res.json({ vendor, reviews, totalSold, totalOrders, completionRate, listingsCount })
})

router.get('/vendors/:id/reviews', async (req, res) => {
  const reviews = await Review.find({ vendorId: req.params.id })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('consumerId', 'name')
  res.json({ reviews })
})

// Consumer leaves a review for a vendor — gated by a completed order with that vendor.
router.post('/vendors/:id/reviews', requireAuth, async (req, res) => {
  const vendorId = req.params.id
  if (!mongoose.isValidObjectId(vendorId)) return res.status(400).json({ error: 'invalid vendor id' })
  const { orderId, rating, text } = req.body || {}
  const numRating = Math.round(Number(rating))
  if (!numRating || numRating < 1 || numRating > 5) {
    return res.status(400).json({ error: 'rating must be 1–5' })
  }
  // Must have a completed order with this vendor (optionally pinned to a specific orderId).
  const orderQuery = { consumerId: req.user.id, vendorId, status: 'completed' }
  if (orderId) orderQuery._id = orderId
  const order = await Order.findOne(orderQuery)
  if (!order) return res.status(403).json({ error: 'you can only review a vendor after a completed order' })

  // One review per (consumer, order) — upsert allows editing.
  const review = await Review.findOneAndUpdate(
    { vendorId, consumerId: req.user.id, orderId: order._id },
    {
      vendorId,
      consumerId: req.user.id,
      orderId: order._id,
      rating: numRating,
      text: String(text || '').slice(0, 500),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )

  const agg = await Review.aggregate([
    { $match: { vendorId: new mongoose.Types.ObjectId(vendorId) } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ])
  if (agg[0]) {
    await User.findByIdAndUpdate(vendorId, {
      ratingAvg: +agg[0].avg.toFixed(2),
      ratingCount: agg[0].count,
    })
  }

  const consumer = await User.findById(req.user.id).select('name')
  emit('review:new', {
    _id: review._id,
    vendorId,
    rating: review.rating,
    text: review.text,
    consumerName: consumer?.name || '',
    orderId: order._id,
  })

  res.json({ review })
})

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
    { $limit: 500 },
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
