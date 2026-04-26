import { Router } from 'express'
import mongoose from 'mongoose'
import { Message } from '../models/Message.js'
import { User } from '../models/User.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.use(requireAuth)

router.get('/users', async (req, res) => {
  const users = await User.find({ _id: { $ne: req.user.id } })
    .select('name role')
    .sort({ name: 1 })
    .limit(200)
  res.json({ users })
})

router.get('/threads', async (req, res) => {
  const me = new mongoose.Types.ObjectId(req.user.id)
  const rows = await Message.aggregate([
    { $match: { $or: [{ senderId: me }, { receiverId: me }] } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: {
          $cond: [{ $eq: ['$senderId', me] }, '$receiverId', '$senderId'],
        },
        lastMessage: { $first: '$message' },
        lastAt: { $first: '$createdAt' },
        unread: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ['$receiverId', me] }, { $eq: ['$isRead', false] }] },
              1,
              0,
            ],
          },
        },
      },
    },
    { $sort: { lastAt: -1 } },
  ])
  const ids = rows.map((r) => r._id)
  const users = await User.find({ _id: { $in: ids } }).select('name role')
  const byId = Object.fromEntries(users.map((u) => [u._id.toString(), u]))
  res.json({
    threads: rows.map((r) => ({
      user: byId[r._id.toString()] || null,
      lastMessage: r.lastMessage,
      lastAt: r.lastAt,
      unread: r.unread,
    })),
  })
})

router.get('/history/:userId', async (req, res) => {
  const otherId = req.params.userId
  if (!mongoose.isValidObjectId(otherId)) {
    return res.status(400).json({ error: 'invalid userId' })
  }
  const messages = await Message.find({
    $or: [
      { senderId: req.user.id, receiverId: otherId },
      { senderId: otherId, receiverId: req.user.id },
    ],
  }).sort({ createdAt: 1 })

  await Message.updateMany(
    { senderId: otherId, receiverId: req.user.id, isRead: false },
    { $set: { isRead: true } },
  )

  res.json({ messages })
})

export default router
