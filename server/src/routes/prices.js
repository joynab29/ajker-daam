import { Router } from 'express'
import mongoose from 'mongoose'
import { PriceReport } from '../models/PriceReport.js'
import { requireAuth } from '../middleware/auth.js'
import { upload } from '../middleware/upload.js'
import { emit } from '../realtime.js'

const router = Router()

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
  const populated = await PriceReport.findById(priceReport._id)
    .populate('userId', 'name role')
    .populate('productId', 'name unit')
  emit('price:new', populated)
  res.json({ priceReport: populated })
})

export default router
