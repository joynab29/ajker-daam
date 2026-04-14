import mongoose from 'mongoose'

const verificationSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, index: true },
  purpose: { type: String, enum: ['signup', 'login'], required: true },
  codeHash: { type: String, required: true },
  payload: { type: mongoose.Schema.Types.Mixed, default: null },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  createdAt: { type: Date, default: Date.now },
})

export const Verification = mongoose.model('Verification', verificationSchema)
