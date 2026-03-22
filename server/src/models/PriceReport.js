import mongoose from 'mongoose'

const priceReportSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  price: { type: Number, required: true },
  unit: { type: String, default: 'kg' },
  lat: { type: Number },
  lng: { type: Number },
  area: { type: String, default: '' },
  district: { type: String, default: '' },
  photoUrl: { type: String, default: '' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  source: { type: String, enum: ['consumer', 'vendor'], default: 'consumer' },
  status: { type: String, enum: ['ok', 'flagged'], default: 'ok' },
  isAnomaly: { type: Boolean, default: false },
  anomalyReason: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
})

export const PriceReport = mongoose.model('PriceReport', priceReportSchema)
