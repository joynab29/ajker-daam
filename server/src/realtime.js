import { Notification } from './models/Notification.js'

let io = null

export function setIo(instance) {
  io = instance
}

function buildNotification(event, payload) {
  if (event === 'price:spike') {
    const name = payload?.priceReport?.productId?.name || 'a product'
    const dir = payload?.direction === 'up' ? 'up' : 'down'
    const change = payload?.change ? (payload.change * 100).toFixed(0) : '0'
    const sign = dir === 'up' ? '+' : ''
    const productId = payload?.priceReport?.productId?._id
    return {
      kind: dir === 'up' ? 'spike' : 'drop',
      refId: payload?.priceReport?._id?.toString() || `${Date.now()}`,
      title: dir === 'up' ? `Price spike: ${name}` : `Price drop: ${name}`,
      body: `${payload.priceReport.price}/${payload.priceReport.unit} (${sign}${change}% vs avg ${payload.avg.toFixed(2)})`,
      link: productId ? `/products/${productId}` : '/dashboard',
      icon: dir === 'up' ? '📈' : '📉',
      accent: dir === 'up' ? '#fee2e2' : '#dcfce7',
    }
  }
  if (event === 'listing:new') {
    const vendor = payload?.vendorId?.name || 'A vendor'
    const where = [payload?.area, payload?.district].filter(Boolean).join(', ')
    return {
      kind: 'listing',
      refId: payload?._id?.toString() || `${Date.now()}`,
      title: `New listing: ${payload?.title || 'product'}`,
      body: `${vendor} listed ${payload?.price}/${payload?.unit}${where ? ` in ${where}` : ''}`,
      link: '/marketplace',
      icon: '🛒',
      accent: '#ecfccb',
    }
  }
  if (event === 'order:new') {
    const title = payload?.listingId?.title || 'your listing'
    const fulfillment = payload?.fulfillment === 'pickup' ? 'Pickup' : 'Cash on delivery'
    return {
      kind: 'order',
      refId: `${payload._id?.toString()}:placed`,
      userId: payload?.vendorId?.toString?.() || payload?.vendorId,
      title: `New order: ${title}`,
      body: `${payload?.consumerName || 'A consumer'} ordered ${payload.quantity} × ${title} · ${fulfillment}`,
      link: '/orders',
      icon: '🛒',
      accent: '#ecfccb',
    }
  }
  if (event === 'review:new') {
    const rating = Number(payload?.rating || 0)
    const stars = '★'.repeat(Math.max(1, Math.min(5, rating)))
    return {
      kind: 'review',
      refId: payload?._id?.toString() || `${Date.now()}`,
      userId: (payload?.vendorId?._id || payload?.vendorId)?.toString?.(),
      title: `New review · ${stars}`,
      body: payload?.text
        ? `"${String(payload.text).slice(0, 90)}"`
        : `${payload?.consumerName || 'A buyer'} rated you ${rating}/5`,
      link: '/marketplace',
      icon: '⭐',
      accent: '#fef9c3',
    }
  }
  if (event === 'order:status') {
    const title = payload?.listingId?.title || 'your order'
    const status = payload?.status || 'updated'
    const STATUS_COPY = {
      confirmed:   { title: `Order confirmed: ${title}`, icon: '✅' },
      packing:     { title: `Order packing: ${title}`,    icon: '📦' },
      dispatched:  { title: `Order dispatched: ${title}`, icon: '🚚' },
      in_transit:  { title: `In transit: ${title}`,       icon: '🚚' },
      delivered:   { title: `Delivered: ${title}`,        icon: '🎁' },
      completed:   { title: `Completed: ${title}`,        icon: '🎉' },
      rejected:    { title: `Order rejected: ${title}`,   icon: '⚠️' },
    }
    const copy = STATUS_COPY[status] || { title: `Order ${status}: ${title}`, icon: '📦' }
    // Audience: consumer for vendor-driven steps, vendor for the consumer's "received" step.
    const audience = status === 'completed'
      ? (payload?.vendorId?._id || payload?.vendorId)?.toString?.()
      : (payload?.consumerId?._id || payload?.consumerId)?.toString?.()
    return {
      kind: 'order_status',
      refId: `${payload._id?.toString()}:${status}`,
      userId: audience,
      title: copy.title,
      body: `Quantity ${payload.quantity} × ${title} is now ${status.replace('_', ' ')}.`,
      link: '/orders',
      icon: copy.icon,
      accent: status === 'rejected' ? '#fee2e2' : '#ecfccb',
    }
  }
  return null
}

export function emit(event, payload) {
  const note = buildNotification(event, payload)
  // Targeted vs broadcast socket emit
  if (io) {
    if (note?.userId) {
      io.to(`user:${note.userId}`).emit(event, payload)
    } else {
      io.emit(event, payload)
    }
  }
  if (!note) return
  Notification.findOneAndUpdate(
    { kind: note.kind, refId: note.refId },
    { $setOnInsert: note },
    { upsert: true, new: true },
  ).catch((e) => console.error('[notify-feed] persist failed:', e.message))
}
