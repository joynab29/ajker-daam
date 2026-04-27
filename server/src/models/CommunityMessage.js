import mongoose from 'mongoose'

const communityMessageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  role: { type: String, default: 'guest' },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
})

communityMessageSchema.index({ createdAt: 1 })

export const CommunityMessage = mongoose.model('CommunityMessage', communityMessageSchema)
