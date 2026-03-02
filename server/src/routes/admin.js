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

export default router
