import { Router } from 'express'
import { Order } from '../models/Order.js'
import { Listing } from '../models/Listing.js'
import { User } from '../models/User.js'
import { Review } from '../models/Review.js'
import { requireAuth } from '../middleware/auth.js'
import { notifyOrderPlaced, notifyOrderStatus } from '../services/notify.js'
import { emit } from '../realtime.js'

const router = Router()

router.post('/', requireAuth, async (req, res) => {
  const { listingId, quantity, contact, message, fulfillment, deliveryDistrict } = req.body
  if (!listingId || !quantity) {
    return res.status(400).json({ error: 'listingId and quantity required' })
  }
  const method = fulfillment === 'pickup' ? 'pickup' : 'cod'
  const listing = await Listing.findById(listingId)
  if (!listing) return res.status(404).json({ error: 'listing not found' })
  if (listing.vendorId.toString() === req.user.id) {
    return res.status(400).json({ error: 'cannot order your own listing' })
  }
  const consumer = await User.findById(req.user.id).select('name')
  const vendor = await User.findById(listing.vendorId).select('delivery')

  let deliveryFee = 0
  let resolvedDistrict = ''
  if (method === 'cod') {
    resolvedDistrict = String(deliveryDistrict || listing.district || '').trim()
    const sameDistrict =
      resolvedDistrict && listing.district &&
      resolvedDistrict.toLowerCase() === listing.district.toLowerCase()
    deliveryFee = sameDistrict
      ? Number(vendor?.delivery?.sameDistrictFee) || 0
      : Number(vendor?.delivery?.otherDistrictFee) || 0
  }

  const order = await Order.create({
    listingId,
    vendorId: listing.vendorId,
    consumerId: req.user.id,
    consumerName: consumer?.name || '',
    quantity: Number(quantity),
    contact: contact || '',
    message: message || '',
    fulfillment: method,
    deliveryDistrict: resolvedDistrict,
    deliveryFee,
    status: 'placed',
    timestamps: { placedAt: new Date() },
  })
  const populated = await Order.findById(order._id).populate('listingId', 'title price unit')
  emit('order:new', populated)
  notifyOrderPlaced(populated).catch((e) => console.error('notify order placed:', e.message))
  res.json({ order })
})

router.get('/mine', requireAuth, async (req, res) => {
  const orders = await Order.find({ consumerId: req.user.id })
    .sort({ createdAt: -1 })
    .populate('listingId', 'title price unit imageUrl')
    .populate('vendorId', 'name ratingAvg ratingCount')
  const orderIds = orders.map((o) => o._id)
  const reviews = await Review.find({ consumerId: req.user.id, orderId: { $in: orderIds } })
  const byOrder = Object.fromEntries(reviews.map((r) => [r.orderId.toString(), r]))
  const enriched = orders.map((o) => {
    const obj = o.toObject()
    obj.myReview = byOrder[o._id.toString()] || null
    return obj
  })
  res.json({ orders: enriched })
})

router.get('/incoming', requireAuth, async (req, res) => {
  if (req.user.role !== 'vendor' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'forbidden' })
  }
  const orders = await Order.find({ vendorId: req.user.id })
    .sort({ createdAt: -1 })
    .populate('listingId', 'title price unit imageUrl')
  res.json({ orders })
})

// Per-step transitions. Each enforces role + previous-state, stamps a timestamp,
// and emits a real-time order:status event. Vendor drives confirm → packing → dispatched →
// in_transit → delivered. Consumer flips delivered → completed via "Received".
const VENDOR_TRANSITIONS = {
  confirm:   { from: ['placed'],     to: 'confirmed',   stampKey: 'confirmedAt' },
  pack:      { from: ['confirmed'],  to: 'packing',     stampKey: 'packingAt' },
  dispatch:  { from: ['packing'],    to: 'dispatched',  stampKey: 'dispatchedAt' },
  transit:   { from: ['dispatched'], to: 'in_transit',  stampKey: 'inTransitAt' },
  deliver:   { from: ['in_transit', 'dispatched'], to: 'delivered', stampKey: 'deliveredAt' },
  reject:    { from: ['placed', 'confirmed'], to: 'rejected', stampKey: 'rejectedAt' },
}

async function applyTransition(req, res, action) {
  const order = await Order.findById(req.params.id)
  if (!order) return res.status(404).json({ error: 'not found' })

  const t = VENDOR_TRANSITIONS[action]
  if (!t) return res.status(400).json({ error: 'invalid action' })

  if (order.vendorId.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'forbidden' })
  }
  if (!t.from.includes(order.status)) {
    return res.status(400).json({ error: `cannot ${action} an order in status ${order.status}` })
  }

  order.status = t.to
  order.timestamps = { ...(order.timestamps || {}), [t.stampKey]: new Date() }

  // Vendor sets a delivery timeline at confirmation. Accept etaMinutes (preferred) or promisedAt ISO.
  if (action === 'confirm') {
    const { etaMinutes, promisedAt } = req.body || {}
    if (etaMinutes && Number(etaMinutes) > 0) {
      order.promisedAt = new Date(Date.now() + Number(etaMinutes) * 60 * 1000)
    } else if (promisedAt) {
      const d = new Date(promisedAt)
      if (!Number.isNaN(d.getTime())) order.promisedAt = d
    } else if (!order.promisedAt) {
      // Sensible default: 24h from confirmation
      order.promisedAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
  }
  if (action === 'reject') {
    order.rejectReason = String(req.body?.reason || '').slice(0, 240)
  }

  await order.save()
  const populated = await Order.findById(order._id)
    .populate('listingId', 'title price unit')
    .populate('vendorId', 'name')
  emit('order:status', populated)
  notifyOrderStatus(populated).catch((e) => console.error('notify order status:', e.message))
  res.json({ order: populated })
}

router.post('/:id/confirm',    requireAuth, (req, res) => applyTransition(req, res, 'confirm'))
router.post('/:id/pack',       requireAuth, (req, res) => applyTransition(req, res, 'pack'))
router.post('/:id/dispatch',   requireAuth, (req, res) => applyTransition(req, res, 'dispatch'))
router.post('/:id/transit',    requireAuth, (req, res) => applyTransition(req, res, 'transit'))
router.post('/:id/deliver',    requireAuth, (req, res) => applyTransition(req, res, 'deliver'))
router.post('/:id/reject',     requireAuth, (req, res) => applyTransition(req, res, 'reject'))

// Consumer-only: confirm receipt → completed
router.post('/:id/receive', requireAuth, async (req, res) => {
  const order = await Order.findById(req.params.id)
  if (!order) return res.status(404).json({ error: 'not found' })
  if (order.consumerId.toString() !== req.user.id) {
    return res.status(403).json({ error: 'only the consumer can confirm receipt' })
  }
  if (order.status !== 'delivered') {
    return res.status(400).json({ error: `cannot confirm receipt while order is ${order.status}` })
  }
  order.status = 'completed'
  order.timestamps = { ...(order.timestamps || {}), completedAt: new Date() }
  await order.save()
  const populated = await Order.findById(order._id)
    .populate('listingId', 'title price unit')
    .populate('vendorId', 'name')
  emit('order:status', populated)
  notifyOrderStatus(populated).catch((e) => console.error('notify order status:', e.message))
  res.json({ order: populated })
})

// Backwards-compat: legacy PATCH path keeps working for clients that send the old strings.
router.patch('/:id', requireAuth, async (req, res) => {
  const map = { accepted: 'confirm', rejected: 'reject', fulfilled: 'deliver' }
  const action = map[req.body?.status]
  if (!action) return res.status(400).json({ error: 'invalid status' })
  return applyTransition(req, res, action)
})

export default router
