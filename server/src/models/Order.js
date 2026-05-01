import mongoose from 'mongoose'

const orderSchema = new mongoose.Schema({
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  consumerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  consumerName: { type: String, default: '' },
  quantity: { type: Number, required: true, min: 1 },
  contact: { type: String, default: '' },
  message: { type: String, default: '' },
  fulfillment: { type: String, enum: ['pickup', 'cod'], default: 'cod' },
  deliveryDistrict: { type: String, default: '' },
  deliveryFee: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['placed', 'confirmed', 'packing', 'dispatched', 'in_transit', 'delivered', 'completed', 'rejected'],
    default: 'placed',
  },
  // Vendor-set timeline: estimated delivery time at order placement
  promisedAt: { type: Date, default: null },
  // Per-stage timestamps for the live tracker
  timestamps: {
    placedAt: { type: Date, default: Date.now },
    confirmedAt: { type: Date, default: null },
    packingAt: { type: Date, default: null },
    dispatchedAt: { type: Date, default: null },
    inTransitAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
  },
  rejectReason: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
})

export const Order = mongoose.model('Order', orderSchema)
