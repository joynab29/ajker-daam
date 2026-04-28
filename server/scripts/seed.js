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
  ])

  async function mkUser(name, email, password, role) {
    const passwordHash = await bcrypt.hash(password, 10)
    return User.create({ name, email: email.toLowerCase(), passwordHash, role })
  }

  const admin   = await mkUser('Admin Anam', 'admin@example.com',  'admin123',  'admin')
  const samia   = await mkUser('Samia',      'samia@example.com',  'samia123',  'vendor')
  const rafiq   = await mkUser('Rafiq',      'rafiq@example.com',  'rafiq123',  'vendor')
  const nilufar = await mkUser('Nilufar',    'nilufar@example.com','nilufar123','vendor')
  const itmam   = await mkUser('Itmam',      'itmam@example.com',  'itmam123',  'consumer')
  const rina    = await mkUser('Rina',       'rina@example.com',   'rina123',   'consumer')
  const sajib   = await mkUser('Sajib',      'sajib@example.com',  'sajib123',  'consumer')

  const productSeed = [
    { name: 'Fresh Tomatoes', unit: 'kg',    category: 'Vegetable', area: 'Segunbagicha', district: 'Dhaka',     lat: 23.731, lng: 90.408 },
    { name: 'Onion',          unit: 'kg',    category: 'Vegetable', area: 'Karwan Bazar', district: 'Dhaka',     lat: 23.751, lng: 90.393 },
    { name: 'Potato',         unit: 'kg',    category: 'Vegetable', area: 'Mirpur',       district: 'Dhaka',     lat: 23.806, lng: 90.368 },
    { name: 'Rice (Miniket)', unit: 'kg',    category: 'Grain',     area: 'Karwan Bazar', district: 'Dhaka',     lat: 23.751, lng: 90.393 },
    { name: 'Egg',            unit: 'dozen', category: 'Poultry',   area: 'New Market',   district: 'Dhaka',     lat: 23.733, lng: 90.385 },
    { name: 'Lentil (Mosur)', unit: 'kg',    category: 'Pulse',     area: 'Mirpur',       district: 'Dhaka',     lat: 23.806, lng: 90.368 },
    { name: 'Chicken',        unit: 'kg',    category: 'Poultry',   area: 'Bashundhara',  district: 'Dhaka',     lat: 23.815, lng: 90.428 },
    { name: 'Hilsa',          unit: 'kg',    category: 'Fish',      area: 'Khulna',       district: 'Khulna',    lat: 22.846, lng: 89.540 },
    { name: 'Mustard Oil',    unit: 'L',     category: 'Oil',       area: 'Chittagong',   district: 'Chittagong',lat: 22.357, lng: 91.783 },
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
  await Order.insertMany([
    { listingId: tomatoListing._id, vendorId: samia._id,   consumerId: itmam._id, consumerName: 'Itmam', quantity: 3, contact: '01700-001001', message: 'Need by tomorrow morning',  status: 'pending'  },
    { listingId: onionListing._id,  vendorId: nilufar._id, consumerId: rina._id,  consumerName: 'Rina',  quantity: 5, contact: '01700-001002', message: 'Please confirm freshness', status: 'accepted' },
  ])

  await CommunityMessage.insertMany([
    { userId: samia._id, name: 'Samia',      role: 'vendor',   text: 'Welcome! Fresh tomatoes available at Segunbagicha today.',     createdAt: ago(2) },
    { userId: itmam._id, name: 'Itmam',      role: 'consumer', text: 'Tomatoes seem expensive at 80 — got mine for 50 yesterday.',  createdAt: ago(1) },
    { userId: rafiq._id, name: 'Rafiq',      role: 'vendor',   text: 'Onion supply is steady, prices should drop next week.',       createdAt: ago(0.5) },
    { userId: admin._id, name: 'Admin Anam', role: 'admin',    text: 'Reminder: please attach photos with your price reports.',     createdAt: ago(0.1) },
  ])

  console.log('seed complete')
  console.log('counts:', {
    users: await User.countDocuments(),
    products: await Product.countDocuments(),
    listings: await Listing.countDocuments(),
    priceReports: await PriceReport.countDocuments(),
    orders: await Order.countDocuments(),
    communityMessages: await CommunityMessage.countDocuments(),
  })
  await mongoose.disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
