import mongoose from 'mongoose'

const reviewSchema = new mongoose.Schema({
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  consumerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  rating: { type: Number, required: true, min: 1, max: 5 },
  text: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
})

reviewSchema.index({ vendorId: 1, createdAt: -1 })

export const Review = mongoose.model('Review', reviewSchema)
