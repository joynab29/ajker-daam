import { Router } from 'express'
import { Order } from '../models/Order.js'
import { Listing } from '../models/Listing.js'
import { User } from '../models/User.js'
import { requireAuth } from '../middleware/auth.js'
import { notifyOrderPlaced, notifyOrderStatus } from '../services/notify.js'

const router = Router()

router.post('/', requireAuth, async (req, res) => {
  const { listingId, quantity, contact, message } = req.body
  if (!listingId || !quantity) {
    return res.status(400).json({ error: 'listingId and quantity required' })
  }
  const listing = await Listing.findById(listingId)
  if (!listing) return res.status(404).json({ error: 'listing not found' })
  if (listing.vendorId.toString() === req.user.id) {
    return res.status(400).json({ error: 'cannot order your own listing' })
  }
  const consumer = await User.findById(req.user.id).select('name')
  const order = await Order.create({
    listingId,
    vendorId: listing.vendorId,
    consumerId: req.user.id,
    consumerName: consumer?.name || '',
    quantity: Number(quantity),
    contact: contact || '',
    message: message || '',
  })
  const populated = await Order.findById(order._id).populate('listingId', 'title price unit')
  notifyOrderPlaced(populated).catch((e) => console.error('notify order placed:', e.message))
  res.json({ order })
})

router.get('/mine', requireAuth, async (req, res) => {
  const orders = await Order.find({ consumerId: req.user.id })
    .sort({ createdAt: -1 })
    .populate('listingId', 'title price unit')
    .populate('vendorId', 'name')
  res.json({ orders })
})

router.get('/incoming', requireAuth, async (req, res) => {
  if (req.user.role !== 'vendor' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'forbidden' })
  }
  const orders = await Order.find({ vendorId: req.user.id })
    .sort({ createdAt: -1 })
    .populate('listingId', 'title price unit')
  res.json({ orders })
})

router.patch('/:id', requireAuth, async (req, res) => {
  const { status } = req.body
  if (!['pending', 'accepted', 'rejected', 'fulfilled'].includes(status)) {
    return res.status(400).json({ error: 'invalid status' })
  }
  const order = await Order.findById(req.params.id)
  if (!order) return res.status(404).json({ error: 'not found' })
  if (order.vendorId.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'forbidden' })
  }
  order.status = status
  await order.save()
  const populated = await Order.findById(order._id).populate('listingId', 'title price unit')
  notifyOrderStatus(populated).catch((e) => console.error('notify order status:', e.message))
  res.json({ order })
})

export default router
