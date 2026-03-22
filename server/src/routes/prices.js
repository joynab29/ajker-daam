import { Router } from 'express'
import mongoose from 'mongoose'
import { PriceReport } from '../models/PriceReport.js'
import { requireAuth } from '../middleware/auth.js'
import { upload } from '../middleware/upload.js'
import { emit } from '../realtime.js'

const router = Router()

router.get('/anomalies', async (_req, res) => {
  const items = await PriceReport.find({ isAnomaly: true })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('userId', 'name role')
    .populate('productId', 'name unit')
  res.json({ items })
})

router.get('/history', async (req, res) => {
  const { productId, days } = req.query
  if (!productId) return res.status(400).json({ error: 'productId required' })
  const cutoff = new Date(Date.now() - (Number(days) || 30) * 24 * 60 * 60 * 1000)
  const rows = await PriceReport.aggregate([
    {
      $match: {
        productId: new mongoose.Types.ObjectId(productId),
        createdAt: { $gte: cutoff },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        avg: { $avg: '$price' },
        min: { $min: '$price' },
        max: { $max: '$price' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ])
  res.json({
    history: rows.map((r) => ({
      date: r._id,
      avg: r.avg,
      min: r.min,
      max: r.max,
      count: r.count,
    })),
  })
})

router.get('/by-area', async (req, res) => {
  const { productId } = req.query
  if (!productId) return res.status(400).json({ error: 'productId required' })
  const rows = await PriceReport.aggregate([
    { $match: { productId: new mongoose.Types.ObjectId(productId) } },
    {
      $group: {
        _id: { area: '$area', district: '$district' },
        avg: { $avg: '$price' },
        min: { $min: '$price' },
        max: { $max: '$price' },
        count: { $sum: 1 },
      },
    },
    { $sort: { avg: 1 } },
  ])
  res.json({
    rows: rows.map((r) => ({
      area: r._id.area,
      district: r._id.district,
      avg: r.avg,
      min: r.min,
      max: r.max,
      count: r.count,
    })),
  })
})

router.get('/', async (req, res) => {
  const { productId, area, district, minPrice, maxPrice, q } = req.query
  const filter = {}
  if (productId) filter.productId = productId
  if (area) filter.area = new RegExp(area, 'i')
  if (district) filter.district = new RegExp(district, 'i')
  if (minPrice || maxPrice) {
    filter.price = {}
    if (minPrice) filter.price.$gte = Number(minPrice)
    if (maxPrice) filter.price.$lte = Number(maxPrice)
  }
  let cursor = PriceReport.find(filter)
    .sort({ createdAt: -1 })
    .limit(200)
    .populate('userId', 'name role')
    .populate('productId', 'name unit')
  let prices = await cursor
  if (q) {
    const re = new RegExp(q, 'i')
    prices = prices.filter((p) => re.test(p.productId?.name || ''))
  }
  res.json({ prices })
})

const SPIKE_THRESHOLD = 0.2 // 20%

router.post('/', requireAuth, upload.single('photo'), async (req, res) => {
  const { productId, price, unit, lat, lng, area, district } = req.body
  if (!productId || !price) {
    return res.status(400).json({ error: 'productId and price required' })
  }
  const photoUrl = req.file ? `/uploads/${req.file.filename}` : ''
  const source = req.user.role === 'vendor' ? 'vendor' : 'consumer'
  const priceReport = await PriceReport.create({
    productId,
    price: Number(price),
    unit: unit || 'kg',
    lat: lat ? Number(lat) : undefined,
    lng: lng ? Number(lng) : undefined,
    area: area || '',
    district: district || '',
    photoUrl,
    userId: req.user.id,
    source,
  })

  // naive spike check vs last 7 days
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const recent = await PriceReport.find({
    productId,
    _id: { $ne: priceReport._id },
    createdAt: { $gte: since },
  })
  let spike = null
  if (recent.length > 0) {
    const avg = recent.reduce((s, r) => s + r.price, 0) / recent.length
    const change = (Number(price) - avg) / avg
    if (Math.abs(change) >= SPIKE_THRESHOLD) {
      spike = { avg, change, direction: change > 0 ? 'up' : 'down' }
      const reason = `${(change * 100).toFixed(0)}% vs 7-day avg ${avg.toFixed(2)}`
      await PriceReport.findByIdAndUpdate(priceReport._id, {
        isAnomaly: true,
        anomalyReason: reason,
      })
    }
  }

  const populated = await PriceReport.findById(priceReport._id)
    .populate('userId', 'name role')
    .populate('productId', 'name unit')

  emit('price:new', populated)
  if (spike) {
    emit('price:spike', { priceReport: populated, ...spike })
  }
  res.json({ priceReport: populated, spike })
})

export default router
