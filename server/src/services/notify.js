import webpush from 'web-push'
import nodemailer from 'nodemailer'
import { PushSubscription } from '../models/PushSubscription.js'
import { User } from '../models/User.js'

export const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || ''

let pushReady = false
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@ajkerdaam.local',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  )
  pushReady = true
} else {
  console.warn('[notify] VAPID keys not set — Web Push disabled')
}

let transporter = null
if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  })
} else {
  console.warn('[notify] SMTP_HOST not set — email disabled')
}

async function sendOne(sub, payload) {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: sub.keys },
      JSON.stringify(payload),
    )
  } catch (e) {
    if (e.statusCode === 404 || e.statusCode === 410) {
      await PushSubscription.deleteOne({ _id: sub._id })
    } else {
      console.error('[notify] push failed:', e.message)
    }
  }
}

export async function pushToUser(userId, payload) {
  if (!pushReady || !userId) return
  const subs = await PushSubscription.find({ userId })
  await Promise.all(subs.map((s) => sendOne(s, payload)))
}

export async function pushToAll(payload) {
  if (!pushReady) return
  const subs = await PushSubscription.find()
  await Promise.all(subs.map((s) => sendOne(s, payload)))
}

export async function emailToUser(userId, subject, html) {
  if (!transporter || !userId) return
  const user = await User.findById(userId).select('email name')
  if (!user?.email) return
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'Ajker Daam <noreply@ajkerdaam.local>',
      to: user.email,
      subject,
      html,
    })
  } catch (e) {
    console.error('[notify] email failed:', e.message)
  }
}

export async function notifyPriceSpike(populated, spike) {
  const name = populated.productId?.name || 'a product'
  const sign = spike.direction === 'up' ? '+' : ''
  const pct = (spike.change * 100).toFixed(0)
  const payload = {
    title: 'Price spike',
    body: `${name}: ${populated.price} (${sign}${pct}% vs avg ${spike.avg.toFixed(2)})`,
    url: populated.productId?._id ? `/products/${populated.productId._id}` : '/dashboard',
  }
  await pushToAll(payload)
  if (populated.userId?._id) {
    await emailToUser(
      populated.userId._id,
      `Price spike: ${name}`,
      `<p>Your report for <strong>${name}</strong> at <strong>${populated.price}</strong> was flagged as a ${sign}${pct}% ${spike.direction === 'up' ? 'spike' : 'drop'} vs the 7-day average of ${spike.avg.toFixed(2)}.</p>`,
    )
  }
}

export async function notifyOrderPlaced(order) {
  const title = order.listingId?.title || 'your listing'
  await pushToUser(order.vendorId, {
    title: 'New order',
    body: `${order.consumerName || 'A consumer'} ordered ${order.quantity}× ${title}`,
    url: '/marketplace',
  })
  await emailToUser(
    order.vendorId,
    `New order for ${title}`,
    `<p><strong>${order.consumerName || 'A consumer'}</strong> placed an order for <strong>${order.quantity}</strong> of <strong>${title}</strong>.</p>${order.contact ? `<p>Contact: ${order.contact}</p>` : ''}${order.message ? `<p>Message: ${order.message}</p>` : ''}`,
  )
}

export async function notifyOrderStatus(order) {
  const title = order.listingId?.title || 'your order'
  await pushToUser(order.consumerId, {
    title: 'Order update',
    body: `${title}: ${order.status}`,
    url: '/marketplace',
  })
  await emailToUser(
    order.consumerId,
    `Order ${order.status}: ${title}`,
    `<p>Your order for <strong>${title}</strong> is now <strong>${order.status}</strong>.</p>`,
  )
}
