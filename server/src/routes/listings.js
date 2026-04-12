import { Router } from 'express'
import { Listing } from '../models/Listing.js'
import { requireAuth } from '../middleware/auth.js'
import { requireRole } from '../middleware/role.js'
import { upload } from '../middleware/upload.js'

const router = Router()

router.get('/', async (req, res) => {
  const { area, district } = req.query
  const filter = {}
  if (area) filter.area = new RegExp(area, 'i')
  if (district) filter.district = new RegExp(district, 'i')
  const listings = await Listing.find(filter)
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('vendorId', 'name')
  res.json({ listings })
})

router.post('/', requireAuth, requireRole('vendor'), upload.single('photo'), async (req, res) => {
  const { title, description, price, unit, quantityAvailable, area, district, contact } = req.body
  if (!title || !price) return res.status(400).json({ error: 'title and price required' })
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : ''
  const listing = await Listing.create({
    vendorId: req.user.id,
    title,
    description: description || '',
    price: Number(price),
    unit: unit || 'kg',
    quantityAvailable: Number(quantityAvailable) || 0,
    area: area || '',
    district: district || '',
    contact: contact || '',
    imageUrl,
  })
  res.json({ listing })
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
