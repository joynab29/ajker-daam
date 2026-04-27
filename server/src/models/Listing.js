import mongoose from 'mongoose'

const listingSchema = new mongoose.Schema({
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  category: { type: String, default: '' },
  price: { type: Number, required: true },
  unit: { type: String, default: 'kg' },
  quantityAvailable: { type: Number, default: 0 },
  area: { type: String, default: '' },
  district: { type: String, default: '' },
  lat: { type: Number, default: null },
  lng: { type: Number, default: null },
  contact: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
})

export const Listing = mongoose.model('Listing', listingSchema)
