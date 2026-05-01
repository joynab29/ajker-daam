import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema({
  kind: { type: String, enum: ['spike', 'drop', 'listing', 'order', 'order_status', 'markup', 'review'], required: true },
  refId: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  title: { type: String, required: true },
  body: { type: String, default: '' },
  link: { type: String, default: '/' },
  icon: { type: String, default: '🔔' },
  accent: { type: String, default: '#ecfccb' },
  createdAt: { type: Date, default: Date.now },
})

// TTL: 30 days. MongoDB deletes expired docs roughly every 60s.
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 })
notificationSchema.index({ kind: 1, refId: 1 }, { unique: true })

export const Notification = mongoose.model('Notification', notificationSchema)
