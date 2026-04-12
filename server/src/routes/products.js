import { Router } from 'express'
import { Product } from '../models/Product.js'
import { requireAuth } from '../middleware/auth.js'
import { requireRole } from '../middleware/role.js'

const router = Router()

router.get('/', async (_req, res) => {
  const products = await Product.find().sort({ name: 1 })
  res.json({ products })
})

router.get('/:id', async (req, res) => {
  const product = await Product.findById(req.params.id)
  if (!product) return res.status(404).json({ error: 'not found' })
  res.json({ product })
})

router.post('/', requireAuth, requireRole('vendor'), async (req, res) => {
  const { name, unit, category, imageUrl } = req.body
  if (!name) return res.status(400).json({ error: 'name required' })
  const product = await Product.create({ name, unit, category, imageUrl })
  res.json({ product })
})

router.put('/:id', requireAuth, requireRole('vendor'), async (req, res) => {
  const { name, unit, category, imageUrl } = req.body
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { name, unit, category, imageUrl },
    { new: true }
  )
  if (!product) return res.status(404).json({ error: 'not found' })
  res.json({ product })
})

router.delete('/:id', requireAuth, requireRole('vendor'), async (req, res) => {
  await Product.findByIdAndDelete(req.params.id)
  res.json({ ok: true })
})

export default router
