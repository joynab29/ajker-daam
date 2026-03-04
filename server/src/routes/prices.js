import { Router } from 'express'
import { PriceReport } from '../models/PriceReport.js'
import { requireAuth } from '../middleware/auth.js'
import { upload } from '../middleware/upload.js'
import { emit } from '../realtime.js'

const router = Router()

router.get('/', async (req, res) => {
  const { productId, area, district } = req.query
  const filter = {}
  if (productId) filter.productId = productId
  if (area) filter.area = area
  if (district) filter.district = district
  const prices = await PriceReport.find(filter)
    .sort({ createdAt: -1 })
    .limit(200)
    .populate('userId', 'name role')
    .populate('productId', 'name unit')
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
