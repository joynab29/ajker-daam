import mongoose from 'mongoose'

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  unit: { type: String, default: 'kg' },
  category: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
})

export const Product = mongoose.model('Product', productSchema)
