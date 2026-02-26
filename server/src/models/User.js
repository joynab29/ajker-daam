import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: {
    type: String,
    enum: ['consumer', 'vendor', 'admin', 'farmer'],
    default: 'consumer',
  },
  createdAt: { type: Date, default: Date.now },
})

export const User = mongoose.model('User', userSchema)
