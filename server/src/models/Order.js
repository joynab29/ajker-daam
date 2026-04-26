import mongoose from 'mongoose'

const orderSchema = new mongoose.Schema({
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  consumerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  consumerName: { type: String, default: '' },
  quantity: { type: Number, required: true, min: 1 },
  contact: { type: String, default: '' },
  message: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'accepted', 'rejected', 'fulfilled'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
})

export const Order = mongoose.model('Order', orderSchema)
