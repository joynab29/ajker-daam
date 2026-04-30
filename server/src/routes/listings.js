import { Router } from 'express'
import mongoose from 'mongoose'
import { Listing } from '../models/Listing.js'
import { Product } from '../models/Product.js'
import { PriceReport } from '../models/PriceReport.js'
import { Order } from '../models/Order.js'
import { requireAuth } from '../middleware/auth.js'
import { requireRole } from '../middleware/role.js'
import { upload } from '../middleware/upload.js'
import { emit } from '../realtime.js'

const router = Router()

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function parseNum(v) {
  if (v === undefined || v === null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

router.get('/', async (req, res) => {
  const { area, district, productId } = req.query
  const filter = {}
  if (area) filter.area = new RegExp(area, 'i')
  if (district) filter.district = new RegExp(district, 'i')
  if (productId) filter.productId = productId
  const listings = await Listing.find(filter)
    .sort({ createdAt: -1 })
    .limit(200)
    .populate('vendorId', 'name verified ratingAvg ratingCount delivery createdAt')
    .populate('productId', 'name unit category imageUrl')

  const productIds = listings
    .map((l) => l.productId?._id)
    .filter(Boolean)
    .map((id) => new mongoose.Types.ObjectId(id))

  let statsByProduct = {}
  if (productIds.length > 0) {
    const rows = await PriceReport.aggregate([
      { $match: { productId: { $in: productIds } } },
      {
        $group: {
          _id: '$productId',
          avg: { $avg: '$price' },
          min: { $min: '$price' },
          max: { $max: '$price' },
          count: { $sum: 1 },
        },
      },
    ])
    statsByProduct = Object.fromEntries(
      rows.map((r) => [
        r._id.toString(),
        { avg: r.avg, min: r.min, max: r.max, count: r.count },
      ]),
    )
  }

  // Top-seller derivation: vendors in top decile of completed orders in last 30 days
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const vendorOrderRows = await Order.aggregate([
    { $match: { status: { $in: ['completed', 'delivered'] }, createdAt: { $gte: since } } },
    { $group: { _id: '$vendorId', completed: { $sum: 1 } } },
  ])
  const sortedCompleted = vendorOrderRows.map((r) => r.completed).sort((a, b) => b - a)
  const topThreshold = sortedCompleted.length
    ? sortedCompleted[Math.max(0, Math.floor(sortedCompleted.length / 10) - 1)] || sortedCompleted[0]
    : Infinity
  const topSellerIds = new Set(
    vendorOrderRows.filter((r) => r.completed >= Math.max(3, topThreshold)).map((r) => r._id.toString()),
  )

  // Cheapest listing per product (Best Deal)
  const cheapestByProduct = new Map()
  for (const l of listings) {
    const pid = l.productId?._id?.toString()
    if (!pid) continue
    const cur = cheapestByProduct.get(pid)
    if (!cur || l.price < cur.price) cheapestByProduct.set(pid, l)
  }

  function reliablePricing(listingPrice, productAvg) {
    if (productAvg == null || productAvg <= 0) return false
    return Math.abs(listingPrice - productAvg) / productAvg <= 0.15
  }

  const enriched = listings.map((l) => {
    const obj = l.toObject()
    const pid = l.productId?._id?.toString()
    const cmp = (pid && statsByProduct[pid]) || { count: 0 }
    obj.comparison = cmp
    obj.bestDeal = pid && cheapestByProduct.get(pid)?._id?.toString() === l._id.toString()
    obj.reliablePricing = reliablePricing(l.price, cmp.avg)
    obj.topSeller = !!(l.vendorId && topSellerIds.has(l.vendorId._id.toString()))
    obj.diffPct =
      cmp.count > 0 && cmp.avg > 0 ? ((l.price - cmp.avg) / cmp.avg) * 100 : null
    return obj
  })

  res.json({ listings: enriched })
})

router.post('/', requireAuth, requireRole('vendor'), upload.single('photo'), async (req, res) => {
  const { title, description, category, price, unit, quantityAvailable, area, district, lat, lng, contact } = req.body
  if (!title || !price) return res.status(400).json({ error: 'title and price required' })
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : ''

  const trimmedTitle = String(title).trim()
  let product = await Product.findOne({
    name: new RegExp(`^${escapeRegex(trimmedTitle)}$`, 'i'),
  })
  if (!product) {
    product = await Product.create({
      name: trimmedTitle,
      unit: unit || 'kg',
      category: category || '',
      imageUrl,
      area: area || '',
      district: district || '',
      lat: parseNum(lat),
      lng: parseNum(lng),
    })
  }

  const listing = await Listing.create({
    vendorId: req.user.id,
    productId: product._id,
    title: trimmedTitle,
    description: description || '',
    category: category || product.category || '',
    price: Number(price),
    unit: unit || product.unit || 'kg',
    quantityAvailable: Number(quantityAvailable) || 0,
    area: area || '',
    district: district || '',
    lat: parseNum(lat),
    lng: parseNum(lng),
    contact: contact || '',
    imageUrl,
  })

  const populated = await Listing.findById(listing._id)
    .populate('vendorId', 'name')
    .populate('productId', 'name unit category')
  emit('listing:new', populated)
  res.json({ listing: populated })
})

router.delete('/:id', requireAuth, async (req, res) => {
  const listing = await Listing.findById(req.params.id)
  if (!listing) return res.status(404).json({ error: 'not found' })
  if (
    listing.vendorId.toString() !== req.user.id &&
    req.user.role !== 'admin'
  ) {
    return res.status(403).json({ error: 'forbidden' })
  }
  await listing.deleteOne()
  res.json({ ok: true })
})

export default router
