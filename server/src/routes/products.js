import { Router } from 'express'
import { Product } from '../models/Product.js'
import { requireAuth } from '../middleware/auth.js'
import { requireRole } from '../middleware/role.js'
import { upload } from '../middleware/upload.js'

const router = Router()

function parseNum(v) {
  if (v === undefined || v === null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

router.get('/', async (_req, res) => {
  const products = await Product.find().sort({ name: 1 })
  res.json({ products })
})

router.get('/:id', async (req, res) => {
  const product = await Product.findById(req.params.id)
  if (!product) return res.status(404).json({ error: 'not found' })
  res.json({ product })
})

router.post('/', requireAuth, requireRole('vendor'), upload.single('image'), async (req, res) => {
  const { name, unit, category, area, district, lat, lng } = req.body
  if (!name) return res.status(400).json({ error: 'name required' })
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : ''
  const product = await Product.create({
    name,
    unit: unit || 'kg',
    category: category || '',
    imageUrl,
    area: area || '',
    district: district || '',
    lat: parseNum(lat),
    lng: parseNum(lng),
  })
  res.json({ product })
})

router.put('/:id', requireAuth, requireRole('vendor'), upload.single('image'), async (req, res) => {
  const { name, unit, category, area, district, lat, lng } = req.body
  const update = {
    ...(name !== undefined && { name }),
    ...(unit !== undefined && { unit }),
    ...(category !== undefined && { category }),
    ...(area !== undefined && { area }),
    ...(district !== undefined && { district }),
    ...(lat !== undefined && { lat: parseNum(lat) }),
    ...(lng !== undefined && { lng: parseNum(lng) }),
  }
  if (req.file) update.imageUrl = `/uploads/${req.file.filename}`
  const product = await Product.findByIdAndUpdate(req.params.id, update, { new: true })
  if (!product) return res.status(404).json({ error: 'not found' })
  res.json({ product })
})

router.delete('/:id', requireAuth, requireRole('vendor'), async (req, res) => {
  await Product.findByIdAndDelete(req.params.id)
  res.json({ ok: true })
})

export default router
