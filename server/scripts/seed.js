import 'dotenv/config'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { connectDb } from '../src/db.js'
import { User } from '../src/models/User.js'
import { Product } from '../src/models/Product.js'
import { Listing } from '../src/models/Listing.js'
import { PriceReport } from '../src/models/PriceReport.js'
import { Order } from '../src/models/Order.js'
import { Message } from '../src/models/Message.js'
import { CommunityMessage } from '../src/models/CommunityMessage.js'
import { PushSubscription } from '../src/models/PushSubscription.js'
import { Review } from '../src/models/Review.js'
import { Notification } from '../src/models/Notification.js'

const day = 24 * 60 * 60 * 1000
const now = Date.now()
const ago = (d) => new Date(now - d * day)

async function main() {
  await connectDb(process.env.MONGO_URI)

  await Promise.all([
    User.deleteMany({}),
    Product.deleteMany({}),
    Listing.deleteMany({}),
    PriceReport.deleteMany({}),
    Order.deleteMany({}),
    Message.deleteMany({}),
    CommunityMessage.deleteMany({}),
    PushSubscription.deleteMany({}),
    Review.deleteMany({}),
    Notification.deleteMany({}),
  ])

  async function mkUser(name, email, password, role, extra = {}) {
    const passwordHash = await bcrypt.hash(password, 10)
    return User.create({ name, email: email.toLowerCase(), passwordHash, role, ...extra })
  }

  const admin   = await mkUser('Admin Anam', 'admin@example.com',  'admin123',  'admin')
  const samia   = await mkUser('Samia',      'samia@example.com',  'samia123',  'vendor', {
    verified: true,
    vendorBio: 'Direct from Munshiganj farms. Tomatoes, onions, leafy greens.',
    delivery: { sameDistrictFee: 40, otherDistrictFee: 120, sameDistrictEta: 'Same day', otherDistrictEta: '1–2 days' },
  })
  const rafiq   = await mkUser('Rafiq',      'rafiq@example.com',  'rafiq123',  'vendor', {
    verified: true,
    vendorBio: 'Karwan Bazar wholesaler — bulk discounts on rice and onions.',
    delivery: { sameDistrictFee: 30, otherDistrictFee: 100, sameDistrictEta: 'Same day', otherDistrictEta: '1–2 days' },
  })
  const nilufar = await mkUser('Nilufar',    'nilufar@example.com','nilufar123','vendor', {
    verified: false,
    vendorBio: 'Mirpur grocer. Lentils, mustard oil, rice, onions.',
    delivery: { sameDistrictFee: 50, otherDistrictFee: 150, sameDistrictEta: '1 day', otherDistrictEta: '2–3 days' },
  })
  const itmam   = await mkUser('Itmam',      'itmam@example.com',  'itmam123',  'consumer')
  const rina    = await mkUser('Rina',       'rina@example.com',   'rina123',   'consumer')
  const sajib   = await mkUser('Sajib',      'sajib@example.com',  'sajib123',  'consumer')

  const IMG = (id) => `https://images.unsplash.com/${id}?w=900&auto=format&fit=crop&q=70`
  const productSeed = [
    { name: 'Fresh Tomatoes', unit: 'kg',    category: 'Vegetable', area: 'Segunbagicha', district: 'Dhaka',     lat: 23.731, lng: 90.408,
      imageUrl: '/images/tomato.jpg' },
    { name: 'Onion',          unit: 'kg',    category: 'Vegetable', area: 'Karwan Bazar', district: 'Dhaka',     lat: 23.751, lng: 90.393,
      imageUrl: IMG('photo-1620574387735-3624d75b2dbc') },
    { name: 'Potato',         unit: 'kg',    category: 'Vegetable', area: 'Mirpur',       district: 'Dhaka',     lat: 23.806, lng: 90.368,
      imageUrl: IMG('photo-1518977676601-b53f82aba655') },
    { name: 'Rice (Miniket)', unit: 'kg',    category: 'Grain',     area: 'Karwan Bazar', district: 'Dhaka',     lat: 23.751, lng: 90.393,
      imageUrl: IMG('photo-1586201375761-83865001e31c') },
    { name: 'Egg',            unit: 'dozen', category: 'Poultry',   area: 'New Market',   district: 'Dhaka',     lat: 23.733, lng: 90.385,
      imageUrl: IMG('photo-1582722872445-44dc5f7e3c8f') },
    { name: 'Lentil (Mosur)', unit: 'kg',    category: 'Pulse',     area: 'Mirpur',       district: 'Dhaka',     lat: 23.806, lng: 90.368,
      imageUrl: '/images/lentil.jpg' },
    { name: 'Chicken',        unit: 'kg',    category: 'Poultry',   area: 'Bashundhara',  district: 'Dhaka',     lat: 23.815, lng: 90.428,
      imageUrl: IMG('photo-1587593810167-a84920ea0781') },
    { name: 'Hilsa',          unit: 'kg',    category: 'Fish',      area: 'Khulna',       district: 'Khulna',    lat: 22.846, lng: 89.540,
      imageUrl: '/images/hilsa.jpg' },
    { name: 'Rui Fish',       unit: 'kg',    category: 'Fish',      area: 'Sowari Ghat',  district: 'Dhaka',     lat: 23.708, lng: 90.413,
      imageUrl: '/images/rui.jpg' },
    { name: 'Mustard Oil',    unit: 'L',     category: 'Oil',       area: 'Chittagong',   district: 'Chittagong',lat: 22.357, lng: 91.783,
      imageUrl: IMG('photo-1474979266404-7eaacbcd87c5') },
  ]
  const products = await Product.insertMany(productSeed)
  const byName = Object.fromEntries(products.map((p) => [p.name, p]))

  const listings = await Listing.insertMany([
    { vendorId: samia._id,   productId: byName['Fresh Tomatoes']._id, title: 'Fresh Tomatoes', category: 'Vegetable', price: 80,   unit: 'kg',    quantityAvailable: 25,  area: 'Segunbagicha', district: 'Dhaka', lat: 23.731, lng: 90.408, contact: '01711-000001', description: 'Fresh harvest from Munshiganj' },
    { vendorId: rafiq._id,   productId: byName['Fresh Tomatoes']._id, title: 'Fresh Tomatoes', category: 'Vegetable', price: 60,   unit: 'kg',    quantityAvailable: 40,  area: 'Karwan Bazar', district: 'Dhaka', lat: 23.751, lng: 90.393, contact: '01711-000002' },
    { vendorId: nilufar._id, productId: byName['Onion']._id,          title: 'Onion',          category: 'Vegetable', price: 70,   unit: 'kg',    quantityAvailable: 100, area: 'Mirpur',       district: 'Dhaka', lat: 23.806, lng: 90.368, contact: '01711-000003' },
    { vendorId: rafiq._id,   productId: byName['Onion']._id,          title: 'Onion',          category: 'Vegetable', price: 65,   unit: 'kg',    quantityAvailable: 60,  area: 'Karwan Bazar', district: 'Dhaka', lat: 23.751, lng: 90.393, contact: '01711-000002' },
    { vendorId: samia._id,   productId: byName['Potato']._id,         title: 'Potato',         category: 'Vegetable', price: 30,   unit: 'kg',    quantityAvailable: 80,  area: 'Segunbagicha', district: 'Dhaka', lat: 23.731, lng: 90.408, contact: '01711-000001' },
    { vendorId: nilufar._id, productId: byName['Rice (Miniket)']._id, title: 'Rice (Miniket)', category: 'Grain',     price: 78,   unit: 'kg',    quantityAvailable: 200, area: 'Mirpur',       district: 'Dhaka', lat: 23.806, lng: 90.368, contact: '01711-000003' },
    { vendorId: rafiq._id,   productId: byName['Egg']._id,            title: 'Egg',            category: 'Poultry',   price: 145,  unit: 'dozen', quantityAvailable: 50,  area: 'New Market',   district: 'Dhaka', lat: 23.733, lng: 90.385, contact: '01711-000002' },
    { vendorId: nilufar._id, productId: byName['Lentil (Mosur)']._id, title: 'Lentil (Mosur)', category: 'Pulse',     price: 130,  unit: 'kg',    quantityAvailable: 40,  area: 'Mirpur',       district: 'Dhaka', lat: 23.806, lng: 90.368, contact: '01711-000003' },
    { vendorId: samia._id,   productId: byName['Chicken']._id,        title: 'Chicken',        category: 'Poultry',   price: 220,  unit: 'kg',    quantityAvailable: 30,  area: 'Bashundhara',  district: 'Dhaka', lat: 23.815, lng: 90.428, contact: '01711-000001' },
    { vendorId: rafiq._id,   productId: byName['Hilsa']._id,          title: 'Hilsa',          category: 'Fish',      price: 1500, unit: 'kg',    quantityAvailable: 15,  area: 'Khulna',       district: 'Khulna',lat: 22.846, lng: 89.540, contact: '01711-000002' },
    { vendorId: rafiq._id,   productId: byName['Rui Fish']._id,       title: 'Rui Fish',       category: 'Fish',      price: 400,  unit: 'kg',    quantityAvailable: 20,  area: 'Sowari Ghat',  district: 'Dhaka', lat: 23.708, lng: 90.413, contact: '01711-000002', description: 'Fresh river-caught rohu, cleaned on request.' },
    { vendorId: nilufar._id, productId: byName['Mustard Oil']._id,    title: 'Mustard Oil',    category: 'Oil',       price: 250,  unit: 'L',     quantityAvailable: 25,  area: 'Chittagong',   district: 'Chittagong', lat: 22.357, lng: 91.783, contact: '01711-000003' },
  ])

  await PriceReport.insertMany([
    { productId: byName['Fresh Tomatoes']._id, userId: itmam._id, source: 'consumer', price: 50, unit: 'kg', area: 'Segunbagicha', district: 'Dhaka', lat: 23.731, lng: 90.408, createdAt: ago(2) },
    { productId: byName['Fresh Tomatoes']._id, userId: rina._id,  source: 'consumer', price: 55, unit: 'kg', area: 'Karwan Bazar', district: 'Dhaka', lat: 23.751, lng: 90.393, createdAt: ago(4) },
    { productId: byName['Fresh Tomatoes']._id, userId: rafiq._id, source: 'vendor',   price: 60, unit: 'kg', area: 'Karwan Bazar', district: 'Dhaka', lat: 23.751, lng: 90.393, createdAt: ago(7) },
    { productId: byName['Fresh Tomatoes']._id, userId: sajib._id, source: 'consumer', price: 90, unit: 'kg', area: 'Segunbagicha', district: 'Dhaka', lat: 23.731, lng: 90.408, createdAt: ago(1), isAnomaly: true, anomalyReason: '+58% vs 7-day avg ~57' },

    { productId: byName['Onion']._id,          userId: itmam._id,   source: 'consumer', price: 60, unit: 'kg', area: 'Mirpur',       district: 'Dhaka', lat: 23.806, lng: 90.368, createdAt: ago(1) },
    { productId: byName['Onion']._id,          userId: rina._id,    source: 'consumer', price: 62, unit: 'kg', area: 'Karwan Bazar', district: 'Dhaka', lat: 23.751, lng: 90.393, createdAt: ago(3) },
    { productId: byName['Onion']._id,          userId: nilufar._id, source: 'vendor',   price: 65, unit: 'kg', area: 'Mirpur',       district: 'Dhaka', lat: 23.806, lng: 90.368, createdAt: ago(5) },

    { productId: byName['Potato']._id,         userId: rina._id,  source: 'consumer', price: 28, unit: 'kg', area: 'Mirpur',       district: 'Dhaka', lat: 23.806, lng: 90.368, createdAt: ago(2) },
    { productId: byName['Potato']._id,         userId: itmam._id, source: 'consumer', price: 32, unit: 'kg', area: 'Segunbagicha', district: 'Dhaka', lat: 23.731, lng: 90.408, createdAt: ago(6) },

    { productId: byName['Rice (Miniket)']._id, userId: sajib._id, source: 'consumer', price: 75, unit: 'kg', area: 'Mirpur',       district: 'Dhaka', lat: 23.806, lng: 90.368, createdAt: ago(1) },
    { productId: byName['Rice (Miniket)']._id, userId: rina._id,  source: 'consumer', price: 80, unit: 'kg', area: 'New Market',   district: 'Dhaka', lat: 23.733, lng: 90.385, createdAt: ago(3) },
    { productId: byName['Rice (Miniket)']._id, userId: rafiq._id, source: 'vendor',   price: 78, unit: 'kg', area: 'Karwan Bazar', district: 'Dhaka', lat: 23.751, lng: 90.393, createdAt: ago(8) },

    { productId: byName['Egg']._id, userId: itmam._id, source: 'consumer', price: 140, unit: 'dozen', area: 'New Market', district: 'Dhaka', lat: 23.733, lng: 90.385, createdAt: ago(1) },
    { productId: byName['Egg']._id, userId: sajib._id, source: 'consumer', price: 150, unit: 'dozen', area: 'Mirpur',     district: 'Dhaka', lat: 23.806, lng: 90.368, createdAt: ago(4) },

    { productId: byName['Lentil (Mosur)']._id, userId: rina._id,  source: 'consumer', price: 125, unit: 'kg', area: 'Mirpur',       district: 'Dhaka', lat: 23.806, lng: 90.368, createdAt: ago(2) },
    { productId: byName['Lentil (Mosur)']._id, userId: itmam._id, source: 'consumer', price: 128, unit: 'kg', area: 'Segunbagicha', district: 'Dhaka', lat: 23.731, lng: 90.408, createdAt: ago(7) },

    { productId: byName['Chicken']._id, userId: sajib._id, source: 'consumer', price: 210, unit: 'kg', area: 'Bashundhara', district: 'Dhaka', lat: 23.815, lng: 90.428, createdAt: ago(1) },
    { productId: byName['Chicken']._id, userId: rina._id,  source: 'consumer', price: 215, unit: 'kg', area: 'Mirpur',      district: 'Dhaka', lat: 23.806, lng: 90.368, createdAt: ago(5) },

    { productId: byName['Hilsa']._id, userId: itmam._id, source: 'consumer', price: 1480, unit: 'kg', area: 'Khulna', district: 'Khulna', lat: 22.846, lng: 89.540, createdAt: ago(2) },
    { productId: byName['Hilsa']._id, userId: rina._id,  source: 'consumer', price: 2200, unit: 'kg', area: 'Dhaka',  district: 'Dhaka',  lat: 23.751, lng: 90.393, createdAt: ago(1), isAnomaly: true, anomalyReason: '+47% vs 7-day avg ~1490' },

    { productId: byName['Mustard Oil']._id, userId: sajib._id, source: 'consumer', price: 245, unit: 'L', area: 'Chittagong', district: 'Chittagong', lat: 22.357, lng: 91.783, createdAt: ago(3) },
    { productId: byName['Mustard Oil']._id, userId: rina._id,  source: 'consumer', price: 255, unit: 'L', area: 'Mirpur',     district: 'Dhaka',       lat: 23.806, lng: 90.368, createdAt: ago(6) },

    // Rui Fish — vendor (Rafiq) lists at 400 in Sowari Ghat; consumers report higher prices in Segunbagicha
    { productId: byName['Rui Fish']._id, userId: itmam._id, source: 'consumer', price: 500, unit: 'kg', area: 'Segunbagicha', district: 'Dhaka', lat: 23.731, lng: 90.408, createdAt: ago(2) },
    { productId: byName['Rui Fish']._id, userId: rina._id,  source: 'consumer', price: 480, unit: 'kg', area: 'Mirpur',       district: 'Dhaka', lat: 23.806, lng: 90.368, createdAt: ago(5) },
    { productId: byName['Rui Fish']._id, userId: sajib._id, source: 'consumer', price: 420, unit: 'kg', area: 'Sowari Ghat',  district: 'Dhaka', lat: 23.708, lng: 90.413, createdAt: ago(7) },
  ])

  // ---- Backfill: 60-day daily history for Fresh Tomatoes and Onion with intentional spikes/drops ----
  const tomatoId = byName['Fresh Tomatoes']._id
  const onionId  = byName['Onion']._id
  const reporters = [itmam, rina, sajib, rafiq, nilufar]

  // Piecewise-linear curves with anchor points expressed as [daysAgo, price],
  // descending in daysAgo. lerp returns the anchor's price at the boundary so
  // curves are continuous through every change-point.
  function lerp(anchors, d) {
    if (d >= anchors[0][0]) return anchors[0][1]
    if (d <= anchors[anchors.length - 1][0]) return anchors[anchors.length - 1][1]
    for (let i = 0; i < anchors.length - 1; i++) {
      const [d1, p1] = anchors[i]
      const [d2, p2] = anchors[i + 1]
      if (d <= d1 && d >= d2) {
        const t = (d1 - d) / (d1 - d2)
        return p1 + (p2 - p1) * t
      }
    }
    return anchors[anchors.length - 1][1]
  }

  // Tomato: stable → spike up at d≈45 → ease back → sharp drop at d≈14 → rebound.
  const tomatoAnchors = [
    [60, 55], [50, 55], [45, 95], [38, 70], [28, 55], [18, 50], [14, 32], [8, 38], [0, 55],
  ]
  // Onion: stable → big drop at d≈40 (supply glut) → recovery → recent surge.
  const onionAnchors = [
    [60, 62], [45, 62], [40, 38], [30, 48], [18, 60], [8, 62], [3, 88], [0, 80],
  ]
  const tomatoPriceForDay = (d) => Math.round(lerp(tomatoAnchors, d) + (Math.random() * 4 - 2))
  const onionPriceForDay  = (d) => Math.round(lerp(onionAnchors,  d) + (Math.random() * 4 - 2))

  const histDocs = []
  const areas = [
    { area: 'Segunbagicha', district: 'Dhaka',     lat: 23.731, lng: 90.408 },
    { area: 'Karwan Bazar', district: 'Dhaka',     lat: 23.751, lng: 90.393 },
    { area: 'Mirpur',       district: 'Dhaka',     lat: 23.806, lng: 90.368 },
    { area: 'New Market',   district: 'Dhaka',     lat: 23.733, lng: 90.385 },
    { area: 'Chittagong',   district: 'Chittagong',lat: 22.357, lng: 91.783 },
  ]
  const SPIKE_THRESHOLD = 0.2
  const tomatoSeries = []
  const onionSeries  = []
  for (let d = 60; d >= 0; d--) {
    for (let i = 0; i < 2; i++) {
      const loc = areas[(d + i) % areas.length]
      const reporter = reporters[(d + i) % reporters.length]
      const tPrice = tomatoPriceForDay(d) + (i === 1 ? Math.round(Math.random() * 4 - 2) : 0)
      tomatoSeries.push(tPrice)
      const recentT = tomatoSeries.slice(-8, -1)
      const tAvg = recentT.length ? recentT.reduce((a, b) => a + b, 0) / recentT.length : tPrice
      const tDiff = tAvg ? (tPrice - tAvg) / tAvg : 0
      histDocs.push({
        productId: tomatoId, userId: reporter._id, source: reporter.role,
        price: tPrice, unit: 'kg',
        area: loc.area, district: loc.district, lat: loc.lat, lng: loc.lng,
        createdAt: ago(d + i * 0.3),
        ...(Math.abs(tDiff) >= SPIKE_THRESHOLD
          ? { isAnomaly: true, anomalyReason: `${tDiff > 0 ? '+' : ''}${(tDiff * 100).toFixed(0)}% vs 7-day avg ${tAvg.toFixed(2)}` }
          : {}),
      })

      const oPrice = onionPriceForDay(d) + (i === 1 ? Math.round(Math.random() * 3 - 1) : 0)
      onionSeries.push(oPrice)
      const recentO = onionSeries.slice(-8, -1)
      const oAvg = recentO.length ? recentO.reduce((a, b) => a + b, 0) / recentO.length : oPrice
      const oDiff = oAvg ? (oPrice - oAvg) / oAvg : 0
      histDocs.push({
        productId: onionId, userId: reporter._id, source: reporter.role,
        price: oPrice, unit: 'kg',
        area: loc.area, district: loc.district, lat: loc.lat, lng: loc.lng,
        createdAt: ago(d + i * 0.3 + 0.1),
        ...(Math.abs(oDiff) >= SPIKE_THRESHOLD
          ? { isAnomaly: true, anomalyReason: `${oDiff > 0 ? '+' : ''}${(oDiff * 100).toFixed(0)}% vs 7-day avg ${oAvg.toFixed(2)}` }
          : {}),
      })
    }
  }
  await PriceReport.insertMany(histDocs)

  const tomatoListing = listings.find((l) => l.title === 'Fresh Tomatoes' && String(l.vendorId) === String(samia._id))
  const onionListing  = listings.find((l) => l.title === 'Onion' && String(l.vendorId) === String(nilufar._id))
  const placedAt = ago(0.05)            // ~1 hour ago
  const tomatoConfirmedAt = ago(0.04)
  const tomatoPackingAt   = ago(0.025)
  const tomatoDispatchedAt = ago(0.012)
  await Order.insertMany([
    {
      listingId: tomatoListing._id, vendorId: samia._id, consumerId: itmam._id,
      consumerName: 'Itmam', quantity: 3, contact: '01700-001001', message: 'Need by tomorrow morning',
      fulfillment: 'cod', deliveryDistrict: 'Dhaka', deliveryFee: 40,
      status: 'dispatched',
      promisedAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      timestamps: {
        placedAt,
        confirmedAt: tomatoConfirmedAt,
        packingAt: tomatoPackingAt,
        dispatchedAt: tomatoDispatchedAt,
      },
      createdAt: placedAt,
    },
    {
      listingId: onionListing._id, vendorId: nilufar._id, consumerId: rina._id,
      consumerName: 'Rina', quantity: 5, contact: '01700-001002', message: 'Please confirm freshness',
      fulfillment: 'pickup', deliveryFee: 0,
      status: 'placed',
      timestamps: { placedAt: ago(0.02) },
      createdAt: ago(0.02),
    },
  ])

  // Reviews → drives ratingAvg/ratingCount on the vendor profile
  const reviewSeed = [
    { vendorId: samia._id,   consumerId: itmam._id, rating: 5, text: 'Tomatoes were super fresh, exactly as described. Will buy again.', createdAt: ago(8) },
    { vendorId: samia._id,   consumerId: rina._id,  rating: 4, text: 'Good quality, slightly overpriced but reliable.', createdAt: ago(5) },
    { vendorId: samia._id,   consumerId: sajib._id, rating: 5, text: 'Same-day delivery in Dhaka, packaging was great.', createdAt: ago(2) },
    { vendorId: rafiq._id,   consumerId: rina._id,  rating: 5, text: 'Best onion prices in Karwan Bazar. Honest weight.', createdAt: ago(6) },
    { vendorId: rafiq._id,   consumerId: itmam._id, rating: 4, text: 'Bulk pricing is real. Pickup was smooth.', createdAt: ago(3) },
    { vendorId: nilufar._id, consumerId: sajib._id, rating: 4, text: 'Lentils were good. Delivery a bit slow.', createdAt: ago(4) },
    { vendorId: nilufar._id, consumerId: rina._id,  rating: 3, text: 'Average — rice was okay, oil pricier than expected.', createdAt: ago(1.2) },
  ]
  await Review.insertMany(reviewSeed)

  // Recompute vendor ratingAvg/ratingCount from reviews
  for (const v of [samia, rafiq, nilufar]) {
    const rs = reviewSeed.filter((r) => String(r.vendorId) === String(v._id))
    if (rs.length === 0) continue
    const avg = rs.reduce((s, r) => s + r.rating, 0) / rs.length
    await User.findByIdAndUpdate(v._id, { ratingAvg: +avg.toFixed(2), ratingCount: rs.length })
  }

  await CommunityMessage.insertMany([
    // Three days ago
    { userId: admin._id,   name: 'Admin Anam', role: 'admin',    text: 'Welcome to Ajker Daam community chat — please be civil and post real prices.', createdAt: ago(3.1) },
    { userId: samia._id,   name: 'Samia',      role: 'vendor',   text: 'Salaam everyone! New shipment of tomatoes coming in tomorrow morning.', createdAt: ago(3.05) },
    { userId: itmam._id,   name: 'Itmam',      role: 'consumer', text: 'Anyone know where onions are cheapest in Mirpur this week?', createdAt: ago(3.0) },
    { userId: nilufar._id, name: 'Nilufar',    role: 'vendor',   text: 'Itmam — 70/kg at my stall in Mirpur 10. Quality is good.', createdAt: ago(2.95) },
    { userId: rina._id,    name: 'Rina',       role: 'consumer', text: 'Saw 65 in Karwan Bazar yesterday. Worth the trip if you buy in bulk.', createdAt: ago(2.9) },

    // Two days ago
    { userId: samia._id,   name: 'Samia',      role: 'vendor',   text: 'Welcome! Fresh tomatoes available at Segunbagicha today, 80/kg.', createdAt: ago(2.0) },
    { userId: itmam._id,   name: 'Itmam',      role: 'consumer', text: 'Tomatoes seem expensive at 80 — got mine for 50 yesterday.', createdAt: ago(1.95) },
    { userId: samia._id,   name: 'Samia',      role: 'vendor',   text: 'Mine are direct from Munshiganj farms, larger size. Comes with a price 🍅', createdAt: ago(1.9) },
    { userId: rafiq._id,   name: 'Rafiq',      role: 'vendor',   text: 'Quality varies a lot right now, buyers should compare before deciding.', createdAt: ago(1.85) },
    { userId: sajib._id,   name: 'Sajib',      role: 'consumer', text: 'Just submitted prices for Bashundhara — chicken is up again.', createdAt: ago(1.8) },

    // Yesterday
    { userId: rafiq._id,   name: 'Rafiq',      role: 'vendor',   text: 'Onion supply is steady, prices should drop next week inshallah.', createdAt: ago(1.0) },
    { userId: rina._id,    name: 'Rina',       role: 'consumer', text: 'That would be great. Lentils have been creeping up too.', createdAt: ago(0.95) },
    { userId: nilufar._id, name: 'Nilufar',    role: 'vendor',   text: 'Lentils I am holding at 130 for now. New stock comes Friday.', createdAt: ago(0.9) },
    { userId: admin._id,   name: 'Admin Anam', role: 'admin',    text: 'Reminder: please attach photos with your price reports — helps verification.', createdAt: ago(0.85) },

    // Today
    { userId: itmam._id,   name: 'Itmam',      role: 'consumer', text: 'Good morning everyone! Eggs at 140/dozen in New Market today.', createdAt: ago(0.25) },
    { userId: rina._id,    name: 'Rina',       role: 'consumer', text: 'Same here in Mirpur, 150 though. The 10tk gap is annoying.', createdAt: ago(0.2) },
    { userId: rafiq._id,   name: 'Rafiq',      role: 'vendor',   text: 'Eggs are tight all over Dhaka — supply chain issue from Gazipur.', createdAt: ago(0.15) },
    { userId: samia._id,   name: 'Samia',      role: 'vendor',   text: 'For anyone buying tomatoes today — I will hold 80 until evening, after that 75.', createdAt: ago(0.1) },
    { userId: sajib._id,   name: 'Sajib',      role: 'consumer', text: 'Thanks Samia. Will swing by around 4pm.', createdAt: ago(0.05) },
    { userId: admin._id,   name: 'Admin Anam', role: 'admin',    text: 'Heads up: vendor markup alerts have been added on the Anomalies page if anyone wants to review.', createdAt: ago(0.02) },
  ])

  // Direct messages — a few threads, mix of read and unread
  await Message.insertMany([
    // Itmam ↔ Samia about the tomato listing (Itmam ordered Samia's tomatoes)
    { senderId: itmam._id, receiverId: samia._id, message: 'Hi Samia, I want to order 3kg of tomatoes for tomorrow morning. Are they still available?', isRead: true,  createdAt: ago(2.1) },
    { senderId: samia._id, receiverId: itmam._id, message: 'Yes Itmam, 3kg is fine. Pickup or delivery?', isRead: true,  createdAt: ago(2.05) },
    { senderId: itmam._id, receiverId: samia._id, message: 'Pickup from Segunbagicha. What time works for you?', isRead: true,  createdAt: ago(2.0) },
    { senderId: samia._id, receiverId: itmam._id, message: 'After 8am any time. I will pack 3kg fresh. Total 240tk.', isRead: true,  createdAt: ago(1.98) },
    { senderId: itmam._id, receiverId: samia._id, message: 'Perfect. See you at 9. Btw — could you also save me 1kg of onion if you have any?', isRead: false, createdAt: ago(0.3) },
    { senderId: itmam._id, receiverId: samia._id, message: 'Also do you take bKash?', isRead: false, createdAt: ago(0.28) },

    // Rina ↔ Nilufar about onions
    { senderId: rina._id,    receiverId: nilufar._id, message: 'Hello, do you still have onions at 70/kg?', isRead: true, createdAt: ago(1.2) },
    { senderId: nilufar._id, receiverId: rina._id,    message: 'Yes Rina, until Thursday. How many kg do you need?', isRead: true, createdAt: ago(1.18) },
    { senderId: rina._id,    receiverId: nilufar._id, message: '5kg. Can you confirm freshness please.', isRead: true, createdAt: ago(1.15) },
    { senderId: nilufar._id, receiverId: rina._id,    message: 'Just arrived from the depot this morning. Photo attached on the listing.', isRead: true, createdAt: ago(1.1) },
    { senderId: nilufar._id, receiverId: rina._id,    message: 'Order accepted. Pickup any time after 10am.', isRead: false, createdAt: ago(0.4) },

    // Sajib ↔ Rafiq about tomatoes (price negotiation)
    { senderId: sajib._id, receiverId: rafiq._id, message: 'Bhai, your tomato price 60 — bulk discount available?', isRead: true, createdAt: ago(0.6) },
    { senderId: rafiq._id, receiverId: sajib._id, message: 'For 10kg+ I can do 55. Below that, 60 is fixed.', isRead: true, createdAt: ago(0.55) },
    { senderId: sajib._id, receiverId: rafiq._id, message: 'Make it 8kg at 55, deal?', isRead: true, createdAt: ago(0.5) },
    { senderId: rafiq._id, receiverId: sajib._id, message: 'Done. Drop by Karwan Bazar before 6pm.', isRead: false, createdAt: ago(0.12) },

    // Admin ↔ Sajib (admin checking on a flagged report)
    { senderId: admin._id, receiverId: sajib._id, message: 'Hi Sajib, your tomato report at 90 in Segunbagicha was flagged as an anomaly. Could you confirm where you saw it?', isRead: false, createdAt: ago(0.8) },
  ])

  // ----- Alert notifications: spread across the last 30 days -----
  await Notification.insertMany([
    // 28 days ago — first onion spike of the month
    { kind: 'spike', refId: 'demo-onion-spike-28d', title: 'Price spike: Onion', body: '92/kg (+48% vs avg 62.00)', link: `/products/${byName['Onion']._id}`, icon: '📈', accent: '#fee2e2', createdAt: ago(28) },
    // 24 days ago — listing
    { kind: 'listing', refId: 'demo-listing-rice-24d', title: 'New listing: Rice (Miniket)', body: 'Nilufar listed 78/kg in Mirpur, Dhaka', link: '/marketplace', icon: '🛒', accent: '#ecfccb', createdAt: ago(24) },
    // 21 days ago — tomato peak (matches the historical curve)
    { kind: 'spike', refId: 'demo-tomato-spike-21d', title: 'Price spike: Fresh Tomatoes', body: '95/kg (+72% vs avg 55.00)', link: `/products/${byName['Fresh Tomatoes']._id}`, icon: '📈', accent: '#fee2e2', createdAt: ago(21) },
    // 18 days ago
    { kind: 'listing', refId: 'demo-listing-egg-18d', title: 'New listing: Egg', body: 'Rafiq listed 145/dozen in New Market, Dhaka', link: '/marketplace', icon: '🛒', accent: '#ecfccb', createdAt: ago(18) },
    // 15 days ago — onion drop
    { kind: 'drop', refId: 'demo-onion-drop-15d', title: 'Price drop: Onion', body: '38/kg (-39% vs avg 62.00)', link: `/products/${byName['Onion']._id}`, icon: '📉', accent: '#dcfce7', createdAt: ago(15) },
    // 13 days ago
    { kind: 'spike', refId: 'demo-hilsa-spike-13d', title: 'Price spike: Hilsa', body: '2200/kg (+47% vs avg 1490.00)', link: `/products/${byName['Hilsa']._id}`, icon: '📈', accent: '#fee2e2', createdAt: ago(13) },
    // 12 days ago
    { kind: 'listing', refId: 'demo-listing-tomato-12d', title: 'New listing: Fresh Tomatoes', body: 'Rafiq listed 60/kg in Karwan Bazar, Dhaka', link: '/marketplace', icon: '🛒', accent: '#ecfccb', createdAt: ago(12) },
    // 10 days ago
    { kind: 'drop', refId: 'demo-tomato-drop-10d', title: 'Price drop: Fresh Tomatoes', body: '40/kg (-30% vs avg 57.00)', link: `/products/${byName['Fresh Tomatoes']._id}`, icon: '📉', accent: '#dcfce7', createdAt: ago(10) },
    // 7 days ago
    { kind: 'spike', refId: 'demo-onion-spike-7d', title: 'Price spike: Onion', body: '85/kg (+37% vs avg 62.00)', link: `/products/${byName['Onion']._id}`, icon: '📈', accent: '#fee2e2', createdAt: ago(7) },
    // 5 days ago
    { kind: 'drop', refId: 'demo-tomato-drop-5d', title: 'Price drop: Fresh Tomatoes', body: '32/kg (-44% vs avg 57.00)', link: `/products/${byName['Fresh Tomatoes']._id}`, icon: '📉', accent: '#dcfce7', createdAt: ago(5) },
    // 4 days ago
    { kind: 'listing', refId: 'demo-listing-mustard-4d', title: 'New listing: Mustard Oil', body: 'Nilufar listed 250/L in Chittagong, Chittagong', link: '/marketplace', icon: '🛒', accent: '#ecfccb', createdAt: ago(4) },
    // 2 days ago — Itmam reports tomato anomaly
    { kind: 'spike', refId: 'demo-tomato-spike-2d', title: 'Price spike: Fresh Tomatoes', body: '90/kg (+58% vs avg 57.00)', link: `/products/${byName['Fresh Tomatoes']._id}`, icon: '📈', accent: '#fee2e2', createdAt: ago(2) },
    // 1 day ago — onion recent surge
    { kind: 'spike', refId: 'demo-onion-spike-1d', title: 'Price spike: Onion', body: '85/kg (+37% vs avg 62.00)', link: `/products/${byName['Onion']._id}`, icon: '📈', accent: '#fee2e2', createdAt: ago(1) },
    // 1 day ago — Rui Fish listing (the new product)
    { kind: 'listing', refId: 'demo-listing-rui-1d', title: 'New listing: Rui Fish', body: 'Rafiq listed 400/kg in Sowari Ghat, Dhaka', link: '/marketplace', icon: '🛒', accent: '#ecfccb', createdAt: ago(1) },
    // today
    { kind: 'listing', refId: 'demo-listing-tomato-today', title: 'New listing: Fresh Tomatoes', body: 'Samia listed 80/kg in Segunbagicha, Dhaka', link: '/marketplace', icon: '🛒', accent: '#ecfccb', createdAt: ago(0.1) },
  ])

  console.log('seed complete')
  console.log('counts:', {
    users: await User.countDocuments(),
    products: await Product.countDocuments(),
    listings: await Listing.countDocuments(),
    priceReports: await PriceReport.countDocuments(),
    orders: await Order.countDocuments(),
    communityMessages: await CommunityMessage.countDocuments(),
    directMessages: await Message.countDocuments(),
    reviews: await Review.countDocuments(),
    notifications: await Notification.countDocuments(),
  })
  await mongoose.disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
