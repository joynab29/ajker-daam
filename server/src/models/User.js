import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: {
    type: String,
    enum: ['consumer', 'vendor', 'admin'],
    default: 'consumer',
  },
  status: {
    type: String,
    enum: ['active', 'banned'],
    default: 'active',
  },
  bannedAt: { type: Date },
  banReason: { type: String, default: '' },
  verified: { type: Boolean, default: false },
  vendorBio: { type: String, default: '' },
  delivery: {
    sameDistrictFee: { type: Number, default: 0 },
    otherDistrictFee: { type: Number, default: 0 },
    sameDistrictEta: { type: String, default: '' },
    otherDistrictEta: { type: String, default: '' },
  },
  ratingAvg: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
})

export const User = mongoose.model('User', userSchema)
