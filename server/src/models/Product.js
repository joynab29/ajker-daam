import mongoose from 'mongoose'

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  unit: { type: String, default: 'kg' },
  category: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  area: { type: String, default: '' },
  district: { type: String, default: '' },
  lat: { type: Number, default: null },
  lng: { type: Number, default: null },
  createdAt: { type: Date, default: Date.now },
})

export const Product = mongoose.model('Product', productSchema)
