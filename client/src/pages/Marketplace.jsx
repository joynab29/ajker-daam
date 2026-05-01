import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  TextInput,
  Textarea,
  NumberInput,
  FileInput,
  Button,
  Stack,
  Group,
  SimpleGrid,
  Card,
  Image,
  Text,
  Alert,
  Paper,
  Modal,
  Badge,
  RangeSlider,
  Checkbox,
  SegmentedControl,
  Box,
  ActionIcon,
  Title,
  Center,
  Loader,
  Drawer,
  Divider,
  Anchor,
} from '@mantine/core'
import { api, apiUpload } from '../api.js'
import { useAuth } from '../AuthContext.jsx'

const SERVER = 'http://localhost:4000'

const cardStyle = {
  background: '#fff',
  border: '1px solid rgba(11,61,46,0.08)',
  borderRadius: 22,
  boxShadow: '0 12px 30px rgba(11,61,46,0.06)',
  padding: 0,
  overflow: 'hidden',
  transition: 'transform 160ms ease, box-shadow 160ms ease',
}

function categoryEmoji(cat) {
  const c = (cat || '').toLowerCase()
  if (/(veg|tomato|onion|potato|pepper|chil)/.test(c)) return '🥬'
  if (/(grain|rice)/.test(c)) return '🌾'
  if (/(poultry|egg|chicken)/.test(c)) return '🍗'
  if (/(fish|hilsa|rui)/.test(c)) return '🐟'
  if (/(oil)/.test(c)) return '🛢️'
  if (/(pulse|lentil|dal)/.test(c)) return '🫘'
  if (/(beef|meat)/.test(c)) return '🥩'
  return '🛒'
}

function HeroImage({ src, alt, fallbackEmoji = '🛒', height = 180 }) {
  const [errored, setErrored] = useState(false)
  if (!src || errored) {
    return (
      <Box
        style={{
          height,
          background: 'linear-gradient(135deg, #ecfccb 0%, #bef264 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64,
        }}
      >
        {fallbackEmoji}
      </Box>
    )
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setErrored(true)}
      style={{ width: '100%', height, objectFit: 'cover', display: 'block' }}
    />
  )
}

function listingHero(l) {
  if (!l) return null
  const candidate = l.imageUrl || l.productId?.imageUrl
  if (!candidate) return null
  if (candidate.startsWith('http')) return candidate
  if (candidate.startsWith('/uploads/')) return SERVER + candidate
  return candidate
}

function StarRow({ value, count, size = 14 }) {
  const full = Math.floor(value)
  const half = value - full >= 0.5
  const stars = []
  for (let i = 0; i < 5; i++) {
    stars.push(i < full ? '★' : i === full && half ? '⯨' : '☆')
  }
  return (
    <Group gap={4} wrap="nowrap">
      <Text style={{ color: '#facc15', fontSize: size, letterSpacing: 1 }} fw={700}>
        {stars.join('')}
      </Text>
      <Text size="xs" c="dimmed">
        {value > 0 ? value.toFixed(1) : '—'}{count ? ` (${count})` : ''}
      </Text>
    </Group>
  )
}

function TrustBadges({ listing }) {
  const v = listing.vendorId || {}
  const out = []
  if (v.verified) out.push({ key: 'v', label: 'Verified', icon: '✓', color: 'forest' })
  if (listing.topSeller) out.push({ key: 't', label: 'Top seller', icon: '🏆', color: 'lime' })
  if (listing.reliablePricing) out.push({ key: 'r', label: 'Reliable pricing', icon: '🎯', color: 'lime' })
  if (out.length === 0) return null
  return (
    <Group gap={4} wrap="wrap">
      {out.map((b) => (
        <Badge
          key={b.key}
          radius="xl"
          variant={b.color === 'lime' ? 'filled' : 'light'}
          color={b.color}
          size="xs"
          styles={b.color === 'lime' ? { root: { color: '#0b3d2e' } } : undefined}
        >
          {b.icon} {b.label}
        </Badge>
      ))}
    </Group>
  )
}

export default function Marketplace() {
  const { user } = useAuth()
  const [listings, setListings] = useState(null)
  const [err, setErr] = useState('')

  // form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [price, setPrice] = useState('')
  const [unit, setUnit] = useState('kg')
  const [quantityAvailable, setQty] = useState('')
  const [area, setArea] = useState('')
  const [district, setDistrict] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [contact, setContact] = useState('')
  const [photo, setPhoto] = useState(null)

  // order modal state
  const [orderTarget, setOrderTarget] = useState(null)
  const [orderQty, setOrderQty] = useState(1)
  const [orderContact, setOrderContact] = useState('')
  const [orderMessage, setOrderMessage] = useState('')
  const [orderDistrict, setOrderDistrict] = useState('')
  const [orderFulfillment, setOrderFulfillment] = useState('cod') // 'pickup' | 'cod'
  const [orderErr, setOrderErr] = useState('')
  const [orderOk, setOrderOk] = useState('')

  // filters
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterDistrict, setFilterDistrict] = useState('all')
  const [filterRating, setFilterRating] = useState(0)
  const [filterVerified, setFilterVerified] = useState(false)
  const [filterInStock, setFilterInStock] = useState(false)
  const [filterBestDeal, setFilterBestDeal] = useState(false)
  const [priceRange, setPriceRange] = useState([0, 0])
  const [priceBounds, setPriceBounds] = useState([0, 0])
  const [groupBy, setGroupBy] = useState('none')
  const [sort, setSort] = useState('best-deal')
  const [filtersOpen, setFiltersOpen] = useState(false)

  // vendor reputation peek
  const [vendorPeek, setVendorPeek] = useState(null)
  const [vendorPeekData, setVendorPeekData] = useState(null)

  // vendor delivery editor
  const [delSameFee, setDelSameFee] = useState('')
  const [delOtherFee, setDelOtherFee] = useState('')
  const [delSameEta, setDelSameEta] = useState('')
  const [delOtherEta, setDelOtherEta] = useState('')
  const [delSaving, setDelSaving] = useState(false)
  const [delMsg, setDelMsg] = useState('')

  function load() {
    api('/listings').then((d) => {
      setListings(d.listings)
      const prices = d.listings.map((l) => l.price).filter((n) => Number.isFinite(n))
      if (prices.length) {
        const lo = Math.floor(Math.min(...prices))
        const hi = Math.ceil(Math.max(...prices))
        setPriceBounds([lo, hi])
        setPriceRange([lo, hi])
      }
    })
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (user?.role !== 'vendor') return
    api('/users/me/delivery').then((d) => {
      const dv = d.delivery || {}
      setDelSameFee(dv.sameDistrictFee ?? '')
      setDelOtherFee(dv.otherDistrictFee ?? '')
      setDelSameEta(dv.sameDistrictEta || '')
      setDelOtherEta(dv.otherDistrictEta || '')
    }).catch(() => {})
  }, [user])

  async function saveDelivery(e) {
    e.preventDefault()
    setDelSaving(true)
    setDelMsg('')
    try {
      await api('/users/me/delivery', {
        method: 'PUT',
        body: JSON.stringify({
          sameDistrictFee: Number(delSameFee) || 0,
          otherDistrictFee: Number(delOtherFee) || 0,
          sameDistrictEta: delSameEta,
          otherDistrictEta: delOtherEta,
        }),
      })
      setDelMsg('Delivery charges saved.')
      load()
    } catch (e) {
      setDelMsg('Save failed: ' + e.message)
    } finally {
      setDelSaving(false)
    }
  }

  function getLocation() {
    if (!navigator.geolocation) return setErr('geolocation not supported')
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLat(String(pos.coords.latitude)); setLng(String(pos.coords.longitude)) },
      () => setErr('could not get location'),
    )
  }

  async function add(e) {
    e.preventDefault()
    setErr('')
    const fd = new FormData()
    fd.append('title', title)
    fd.append('description', description)
    fd.append('category', category)
    fd.append('price', price)
    fd.append('unit', unit)
    fd.append('quantityAvailable', quantityAvailable)
    fd.append('area', area)
    fd.append('district', district)
    if (lat) fd.append('lat', lat)
    if (lng) fd.append('lng', lng)
    fd.append('contact', contact)
    if (photo) fd.append('photo', photo)
    try {
      await apiUpload('/listings', fd)
      setTitle(''); setDescription(''); setCategory(''); setPrice(''); setQty(''); setLat(''); setLng(''); setContact(''); setPhoto(null)
      load()
    } catch (e) { setErr(e.message) }
  }

  async function remove(id) {
    if (!confirm('Delete this listing?')) return
    await api(`/listings/${id}`, { method: 'DELETE' })
    load()
  }

  function openOrder(listing) {
    setOrderTarget(listing)
    setOrderQty(1)
    setOrderContact('')
    setOrderMessage('')
    setOrderDistrict(listing.district || '')
    setOrderFulfillment('cod')
    setOrderErr('')
    setOrderOk('')
  }

  const orderDeliveryFee = useMemo(() => {
    if (!orderTarget) return 0
    if (orderFulfillment === 'pickup') return 0
    const v = orderTarget.vendorId
    if (!v?.delivery) return 0
    const same = orderDistrict && orderTarget.district && orderDistrict.toLowerCase() === orderTarget.district.toLowerCase()
    return same ? v.delivery.sameDistrictFee || 0 : v.delivery.otherDistrictFee || 0
  }, [orderTarget, orderDistrict, orderFulfillment])

  async function placeOrder(e) {
    e.preventDefault()
    setOrderErr('')
    setOrderOk('')
    try {
      await api('/marketplace/orders', {
        method: 'POST',
        body: JSON.stringify({
          listingId: orderTarget._id,
          quantity: Number(orderQty),
          contact: orderContact,
          message: orderMessage,
          fulfillment: orderFulfillment,
          deliveryDistrict: orderFulfillment === 'cod' ? orderDistrict : '',
        }),
      })
      setOrderOk('Order placed. The vendor will confirm shortly.')
      setTimeout(() => setOrderTarget(null), 1200)
    } catch (e) {
      setOrderErr(e.message)
    }
  }

  async function showVendor(vendorId) {
    setVendorPeek(vendorId)
    setVendorPeekData(null)
    try {
      const data = await api(`/users/vendors/${vendorId}/reputation`)
      setVendorPeekData(data)
    } catch (e) {
      setVendorPeekData({ error: e.message })
    }
  }

  // Derived: categories + districts + filtered + grouped
  const categories = useMemo(() => {
    if (!listings) return []
    const set = new Set(listings.map((l) => l.category).filter(Boolean))
    return [...set].sort()
  }, [listings])

  const districts = useMemo(() => {
    if (!listings) return []
    const set = new Set(listings.map((l) => l.district).filter(Boolean))
    return [...set].sort()
  }, [listings])

  const filtered = useMemo(() => {
    if (!listings) return []
    const q = search.trim().toLowerCase()
    return listings.filter((l) => {
      if (q) {
        const blob = `${l.title || ''} ${l.category || ''} ${l.area || ''} ${l.district || ''} ${l.vendorId?.name || ''}`.toLowerCase()
        if (!blob.includes(q)) return false
      }
      if (filterCategory !== 'all' && l.category !== filterCategory) return false
      if (filterDistrict !== 'all' && l.district !== filterDistrict) return false
      if (filterRating > 0 && (l.vendorId?.ratingAvg || 0) < filterRating) return false
      if (filterVerified && !l.vendorId?.verified) return false
      if (filterInStock && !l.quantityAvailable) return false
      if (filterBestDeal && !l.bestDeal) return false
      if (priceBounds[1] > 0) {
        if (l.price < priceRange[0] || l.price > priceRange[1]) return false
      }
      return true
    })
  }, [listings, search, filterCategory, filterDistrict, filterRating, filterVerified, filterInStock, filterBestDeal, priceRange, priceBounds])

  const sorted = useMemo(() => {
    const arr = [...filtered]
    arr.sort((a, b) => {
      switch (sort) {
        case 'price_asc':  return a.price - b.price
        case 'price_desc': return b.price - a.price
        case 'rating':     return (b.vendorId?.ratingAvg || 0) - (a.vendorId?.ratingAvg || 0)
        case 'newest':     return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'best-deal':
        default: {
          if (a.bestDeal !== b.bestDeal) return a.bestDeal ? -1 : 1
          const aD = a.diffPct ?? 0
          const bD = b.diffPct ?? 0
          return aD - bD
        }
      }
    })
    return arr
  }, [filtered, sort])

  const groups = useMemo(() => {
    if (groupBy === 'none') return [{ key: 'all', label: null, items: sorted }]
    const map = new Map()
    for (const l of sorted) {
      let key, label
      if (groupBy === 'vendor') { key = l.vendorId?._id || 'unknown'; label = l.vendorId?.name || 'Unknown vendor' }
      else if (groupBy === 'area') { key = `${l.area || ''}|${l.district || ''}`; label = [l.area, l.district].filter(Boolean).join(', ') || 'Unknown area' }
      else if (groupBy === 'category') { key = l.category || 'uncategorised'; label = l.category || 'Uncategorised' }
      if (!map.has(key)) map.set(key, { key, label, items: [] })
      map.get(key).items.push(l)
    }
    return [...map.values()]
  }, [sorted, groupBy])

  const activeFilterCount =
    (filterCategory !== 'all' ? 1 : 0) +
    (filterDistrict !== 'all' ? 1 : 0) +
    (filterRating > 0 ? 1 : 0) +
    (filterVerified ? 1 : 0) +
    (filterInStock ? 1 : 0) +
    (filterBestDeal ? 1 : 0) +
    (priceBounds[1] > 0 && (priceRange[0] !== priceBounds[0] || priceRange[1] !== priceBounds[1]) ? 1 : 0)

  function clearFilters() {
    setFilterCategory('all'); setFilterDistrict('all'); setFilterRating(0)
    setFilterVerified(false); setFilterInStock(false); setFilterBestDeal(false)
    setPriceRange(priceBounds); setSearch('')
  }

  if (listings === null) {
    return (
      <Center mih={300}>
        <Stack align="center" gap="sm"><Loader color="forest.7" /><Text c="dimmed">Loading marketplace…</Text></Stack>
      </Center>
    )
  }

  const FiltersPanel = (
    <Stack gap="md">
      <Stack gap={4}>
        <Text size="xs" fw={700} tt="uppercase" c="forest.7" style={{ letterSpacing: '0.1em' }}>Search</Text>
        <TextInput placeholder="Tomato, Mirpur, Samia…" value={search} onChange={(e) => setSearch(e.target.value)} radius="xl" />
      </Stack>

      <Stack gap={4}>
        <Text size="xs" fw={700} tt="uppercase" c="forest.7" style={{ letterSpacing: '0.1em' }}>Category</Text>
        <Group gap={6} wrap="wrap">
          <Badge
            radius="xl"
            variant={filterCategory === 'all' ? 'filled' : 'light'}
            color={filterCategory === 'all' ? 'lime' : 'forest'}
            styles={filterCategory === 'all' ? { root: { color: '#0b3d2e', cursor: 'pointer' } } : { root: { cursor: 'pointer' } }}
            onClick={() => setFilterCategory('all')}
          >
            All
          </Badge>
          {categories.map((c) => (
            <Badge
              key={c}
              radius="xl"
              variant={filterCategory === c ? 'filled' : 'light'}
              color={filterCategory === c ? 'lime' : 'forest'}
              styles={filterCategory === c ? { root: { color: '#0b3d2e', cursor: 'pointer' } } : { root: { cursor: 'pointer' } }}
              onClick={() => setFilterCategory(c)}
            >
              {categoryEmoji(c)} {c}
            </Badge>
          ))}
        </Group>
      </Stack>

      <Stack gap={4}>
        <Text size="xs" fw={700} tt="uppercase" c="forest.7" style={{ letterSpacing: '0.1em' }}>District</Text>
        <Group gap={6} wrap="wrap">
          <Badge
            radius="xl"
            variant={filterDistrict === 'all' ? 'filled' : 'light'}
            color={filterDistrict === 'all' ? 'lime' : 'forest'}
            styles={filterDistrict === 'all' ? { root: { color: '#0b3d2e', cursor: 'pointer' } } : { root: { cursor: 'pointer' } }}
            onClick={() => setFilterDistrict('all')}
          >
            Any
          </Badge>
          {districts.map((d) => (
            <Badge
              key={d}
              radius="xl"
              variant={filterDistrict === d ? 'filled' : 'light'}
              color={filterDistrict === d ? 'lime' : 'forest'}
              styles={filterDistrict === d ? { root: { color: '#0b3d2e', cursor: 'pointer' } } : { root: { cursor: 'pointer' } }}
              onClick={() => setFilterDistrict(d)}
            >
              📍 {d}
            </Badge>
          ))}
        </Group>
      </Stack>

      {priceBounds[1] > 0 && (
        <Stack gap={4}>
          <Group justify="space-between">
            <Text size="xs" fw={700} tt="uppercase" c="forest.7" style={{ letterSpacing: '0.1em' }}>Price ৳</Text>
            <Text size="xs" c="dimmed">৳{priceRange[0]} – ৳{priceRange[1]}</Text>
          </Group>
          <RangeSlider
            min={priceBounds[0]}
            max={priceBounds[1]}
            value={priceRange}
            onChange={setPriceRange}
            color="forest"
            thumbSize={16}
          />
        </Stack>
      )}

      <Stack gap={4}>
        <Text size="xs" fw={700} tt="uppercase" c="forest.7" style={{ letterSpacing: '0.1em' }}>Min rating</Text>
        <Group gap={6} wrap="wrap">
          {[0, 3, 4].map((r) => (
            <Badge
              key={r}
              radius="xl"
              variant={filterRating === r ? 'filled' : 'light'}
              color={filterRating === r ? 'lime' : 'forest'}
              styles={filterRating === r ? { root: { color: '#0b3d2e', cursor: 'pointer' } } : { root: { cursor: 'pointer' } }}
              onClick={() => setFilterRating(r)}
            >
              {r === 0 ? 'Any' : `${r}★+`}
            </Badge>
          ))}
        </Group>
      </Stack>

      <Stack gap="xs">
        <Checkbox
          label="✓ Verified vendors only"
          checked={filterVerified}
          onChange={(e) => setFilterVerified(e.currentTarget.checked)}
          color="forest"
        />
        <Checkbox
          label="In stock"
          checked={filterInStock}
          onChange={(e) => setFilterInStock(e.currentTarget.checked)}
          color="forest"
        />
        <Checkbox
          label="🏆 Best deal only"
          checked={filterBestDeal}
          onChange={(e) => setFilterBestDeal(e.currentTarget.checked)}
          color="forest"
        />
      </Stack>

      {activeFilterCount > 0 && (
        <Button variant="subtle" color="forest" radius="xl" onClick={clearFilters}>
          Clear all filters
        </Button>
      )}
    </Stack>
  )

  return (
    <div>
      <style>{`
        .mp-card:hover { transform: translateY(-2px); box-shadow: 0 18px 40px rgba(11,61,46,0.10); }
        .ribbon {
          position: absolute; top: 12px; left: -6px;
          background: linear-gradient(135deg, #bef264 0%, #a3e635 100%);
          color: #0b3d2e; font-weight: 800; font-size: 11px; letter-spacing: 0.1em;
          padding: 6px 10px; border-radius: 4px;
          box-shadow: 0 6px 14px rgba(11,61,46,0.18);
          text-transform: uppercase;
        }
        .ribbon::after {
          content: ''; position: absolute; left: 0; bottom: -6px; border: 3px solid #4d7c0f; border-color: #4d7c0f transparent transparent transparent;
        }
        .group-header {
          background: linear-gradient(135deg, #ecfccb 0%, #ffffff 70%);
          border: 1px solid #ecfccb;
          border-radius: 18px;
          padding: 10px 14px;
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 12px;
        }
      `}</style>

      <Stack gap={4} mb="md">
        <span className="section-eyebrow">Marketplace</span>
        <h1 className="display" style={{ margin: 0 }}>Buy fresh. <span style={{ color: '#65a30d' }}>Compare honestly.</span></h1>
        <Text c="dimmed" maw={680}>
          Vendors list products. Consumers buy and report real prices. Each card pairs the vendor's asking price with what the community is actually paying.
        </Text>
      </Stack>

      {user?.role === 'vendor' && (
        <Paper p="lg" radius="xl" mb="lg" style={{ background: 'linear-gradient(135deg, #ecfccb 0%, #ffffff 70%)', border: '1px solid #ecfccb', boxShadow: '0 12px 30px rgba(11,61,46,0.06)' }}>
          <Group justify="space-between" align="flex-start" wrap="wrap" mb="sm">
            <Stack gap={2}>
              <Group gap={8}><Box style={{ fontSize: 22 }}>🚚</Box><Title order={3} style={{ margin: 0 }}>Your delivery charges</Title></Group>
              <Text size="sm" c="dimmed">Set what consumers pay for delivery. Shown on every listing card and the order checkout breakdown.</Text>
            </Stack>
            <Group gap={6}>
              {(delSameFee !== '' || delOtherFee !== '') && (
                <Badge color="forest" variant="light" radius="xl">
                  Currently: ৳{delSameFee || 0} same · ৳{delOtherFee || 0} other
                </Badge>
              )}
            </Group>
          </Group>
          <form onSubmit={saveDelivery}>
            <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="sm">
              <NumberInput
                label="Same-district fee (৳)"
                placeholder="40"
                value={delSameFee}
                onChange={(v) => setDelSameFee(v ?? '')}
                min={0}
                radius="xl"
              />
              <TextInput
                label="Same-district ETA"
                placeholder="Same day"
                value={delSameEta}
                onChange={(e) => setDelSameEta(e.target.value)}
                radius="xl"
              />
              <NumberInput
                label="Other-district fee (৳)"
                placeholder="120"
                value={delOtherFee}
                onChange={(v) => setDelOtherFee(v ?? '')}
                min={0}
                radius="xl"
              />
              <TextInput
                label="Other-district ETA"
                placeholder="1–2 days"
                value={delOtherEta}
                onChange={(e) => setDelOtherEta(e.target.value)}
                radius="xl"
              />
            </SimpleGrid>
            <Group justify="space-between" mt="sm">
              <Text size="xs" c="dimmed">
                Tip: leave a fee at 0 if you offer free delivery in that range.
              </Text>
              <Group gap="xs">
                {delMsg && (
                  <Text size="xs" c={delMsg.startsWith('Save failed') ? 'red.7' : 'forest.7'} fw={600}>{delMsg}</Text>
                )}
                <Button
                  type="submit"
                  loading={delSaving}
                  radius="xl"
                  color="lime"
                  styles={{ root: { color: '#0b3d2e', fontWeight: 700 } }}
                >
                  Save delivery charges
                </Button>
              </Group>
            </Group>
          </form>
        </Paper>
      )}

      {user?.role === 'vendor' && (
        <Paper p="lg" radius="xl" mb="lg" className="card-soft">
          <Title order={3} mb="sm">List a product</Title>
          <form onSubmit={add}>
            <Stack gap="sm" maw={620}>
              <TextInput label="Product name" placeholder="e.g. Onion" value={title} onChange={(e) => setTitle(e.target.value)} required />
              <Textarea label="Description" placeholder="optional details" value={description} onChange={(e) => setDescription(e.target.value)} />
              <Group gap="xs" grow>
                <TextInput label="Category" placeholder="Vegetable, Fish…" value={category} onChange={(e) => setCategory(e.target.value)} />
                <NumberInput label="Price" placeholder="0.00" value={price} onChange={(v) => setPrice(v ?? '')} min={0} decimalScale={2} required />
              </Group>
              <Group gap="xs" grow>
                <TextInput label="Unit" placeholder="kg, L, dozen" value={unit} onChange={(e) => setUnit(e.target.value)} />
                <NumberInput label="Qty available" placeholder="0" value={quantityAvailable} onChange={(v) => setQty(v ?? '')} min={0} />
              </Group>
              <Group gap="xs" grow>
                <TextInput label="Area" placeholder="e.g. Mirpur" value={area} onChange={(e) => setArea(e.target.value)} />
                <TextInput label="District" placeholder="e.g. Dhaka" value={district} onChange={(e) => setDistrict(e.target.value)} />
              </Group>
              <Group align="end" gap="xs">
                <TextInput label="Latitude" placeholder="optional" value={lat} onChange={(e) => setLat(e.target.value)} flex={1} />
                <TextInput label="Longitude" placeholder="optional" value={lng} onChange={(e) => setLng(e.target.value)} flex={1} />
                <Button type="button" variant="default" onClick={getLocation}>Use my location</Button>
              </Group>
              <TextInput label="Contact" placeholder="phone or email" value={contact} onChange={(e) => setContact(e.target.value)} />
              <FileInput label="Photo" accept="image/*" placeholder="optional but recommended" value={photo} onChange={setPhoto} clearable />
              <Button type="submit" radius="xl" color="lime" styles={{ root: { color: '#0b3d2e', fontWeight: 700 } }}>
                Publish listing
              </Button>
            </Stack>
          </form>
          {err && <Alert color="red" mt="sm">{err}</Alert>}
        </Paper>
      )}

      {/* Toolbar */}
      <Paper p="md" radius="xl" mb="lg" style={{ background: '#fff', border: '1px solid rgba(11,61,46,0.08)', boxShadow: '0 12px 30px rgba(11,61,46,0.06)' }}>
        <Group gap="sm" wrap="wrap" align="center">
          <Button
            variant="light"
            color="forest"
            radius="xl"
            onClick={() => setFiltersOpen(true)}
            leftSection={<span>⚙</span>}
          >
            Filters {activeFilterCount > 0 && <Badge ml={6} color="lime" radius="xl" size="xs" styles={{ root: { color: '#0b3d2e' } }}>{activeFilterCount}</Badge>}
          </Button>
          <SegmentedControl
            value={groupBy}
            onChange={setGroupBy}
            data={[
              { value: 'none', label: 'Grid' },
              { value: 'vendor', label: 'By vendor' },
              { value: 'area', label: 'By area' },
              { value: 'category', label: 'By category' },
            ]}
            radius="xl"
            color="forest"
          />
          <Box style={{ flex: 1 }} />
          <SegmentedControl
            value={sort}
            onChange={setSort}
            data={[
              { value: 'best-deal', label: '🏆 Best deal' },
              { value: 'price_asc', label: 'Price ↑' },
              { value: 'price_desc', label: 'Price ↓' },
              { value: 'rating', label: '★ Rating' },
              { value: 'newest', label: 'Newest' },
            ]}
            radius="xl"
            color="forest"
          />
        </Group>
        {(search || activeFilterCount > 0) && (
          <Text size="xs" c="dimmed" mt="sm">
            Showing {sorted.length} of {listings.length} listings
          </Text>
        )}
      </Paper>

      {/* Empty state */}
      {sorted.length === 0 ? (
        <Paper p="xl" radius="xl" style={{ textAlign: 'center' }} className="card-soft">
          <Stack align="center" gap={8}>
            <Box style={{ fontSize: 48 }}>🛒</Box>
            <Text fw={700} c="forest.7">No listings match.</Text>
            <Text size="sm" c="dimmed">
              {listings.length === 0 ? 'No vendors have listed products yet.' : 'Try clearing filters.'}
            </Text>
            {activeFilterCount > 0 && (
              <Button variant="light" color="forest" radius="xl" onClick={clearFilters}>Clear filters</Button>
            )}
          </Stack>
        </Paper>
      ) : (
        <Stack gap="xl">
          {groups.map((g) => (
            <div key={g.key}>
              {g.label && (
                <div className="group-header">
                  <Group gap={8}>
                    <Text fw={800} c="forest.7">{g.label}</Text>
                    <Badge color="forest" variant="light" radius="xl">{g.items.length}</Badge>
                  </Group>
                  {groupBy === 'vendor' && g.items[0]?.vendorId?._id && (
                    <Anchor onClick={() => showVendor(g.items[0].vendorId._id)} c="forest.7" fw={600} size="sm" style={{ cursor: 'pointer' }}>
                      View vendor →
                    </Anchor>
                  )}
                </div>
              )}
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
                {g.items.map((l) => {
                  const cmp = l.comparison || { count: 0 }
                  const diff = l.diffPct
                  const v = l.vendorId || {}
                  const sameDistrictFee = v.delivery?.sameDistrictFee || 0
                  const otherDistrictFee = v.delivery?.otherDistrictFee || 0
                  const hero = listingHero(l)
                  return (
                    <Card key={l._id} className="mp-card" style={cardStyle}>
                      <Card.Section style={{ position: 'relative' }}>
                        <HeroImage src={hero} alt={l.title} fallbackEmoji={categoryEmoji(l.category)} height={180} />
                        {l.bestDeal && <span className="ribbon">🏆 Best deal</span>}
                        {!l.quantityAvailable && (
                          <Badge color="gray" radius="xl" style={{ position: 'absolute', top: 12, right: 12 }}>
                            Out of stock
                          </Badge>
                        )}
                      </Card.Section>

                      <Box p="md">
                        <Group justify="space-between" align="flex-start" wrap="nowrap">
                          <Stack gap={2}>
                            <Title order={4} style={{ margin: 0 }}>{l.title}</Title>
                            <Text size="xs" c="dimmed">📍 {[l.area, l.district].filter(Boolean).join(', ') || 'Location TBD'}</Text>
                          </Stack>
                          {l.category && <Badge variant="light" color="forest" radius="xl">{categoryEmoji(l.category)} {l.category}</Badge>}
                        </Group>

                        <Group justify="space-between" align="center" mt="xs">
                          <Text fw={800} fz={28} c="forest.7" style={{ lineHeight: 1 }}>
                            ৳{l.price}
                            <Text span size="sm" c="dimmed" fw={500}> /{l.unit}</Text>
                          </Text>
                          {l.quantityAvailable ? (
                            <Text size="xs" c="dimmed">{l.quantityAvailable} {l.unit} avail</Text>
                          ) : null}
                        </Group>

                        {/* Comparison panel */}
                        {cmp.count > 0 && diff != null ? (
                          <Box
                            mt="xs"
                            p="sm"
                            style={{
                              borderRadius: 14,
                              background: diff > 5 ? '#fff1f2' : diff < -5 ? '#ecfccb' : '#f7fde9',
                              border: `1px solid ${diff > 5 ? '#fecaca' : diff < -5 ? '#bef264' : '#ecfccb'}`,
                            }}
                          >
                            <Group justify="space-between">
                              <Text size="xs" fw={700} c={diff > 5 ? 'red.7' : 'forest.7'}>
                                {diff > 5 ? '▲ above market' : diff < -5 ? '▼ below market' : '• around market'}
                              </Text>
                              <Text size="xs" fw={700} c={diff > 5 ? 'red.7' : 'forest.7'}>
                                {diff > 0 ? '+' : ''}{diff.toFixed(0)}%
                              </Text>
                            </Group>
                            <Text size="xs" c="dimmed" mt={2}>
                              Community avg ৳{cmp.avg.toFixed(2)} · {cmp.count} reports
                            </Text>
                          </Box>
                        ) : (
                          <Text size="xs" c="dimmed" mt="xs">No community price baseline yet.</Text>
                        )}

                        {/* Public reviews of this vendor */}
                        {l.recentReviews && l.recentReviews.length > 0 && (
                          <Paper
                            p="sm"
                            radius="lg"
                            mt="md"
                            style={{ background: '#fefce8', border: '1px solid #fef08a' }}
                          >
                            <Group justify="space-between" align="center" mb={4}>
                              <Text size="xs" fw={700} tt="uppercase" c="forest.7" style={{ letterSpacing: '0.08em' }}>
                                Recent reviews
                              </Text>
                              {(v.ratingCount || 0) > 0 && (
                                <Text size="xs" c="dimmed">
                                  {v.ratingAvg?.toFixed(1)} avg · {v.ratingCount}
                                </Text>
                              )}
                            </Group>
                            <Stack gap={6}>
                              {l.recentReviews.slice(0, 2).map((r) => (
                                <Box key={r._id}>
                                  <Group gap={6} wrap="nowrap">
                                    <Text style={{ color: '#facc15', letterSpacing: 1 }} size="xs" fw={700}>
                                      {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                                    </Text>
                                    <Text size="xs" fw={700} c="forest.7">{r.consumerName}</Text>
                                    <Text size="xs" c="dimmed">· {new Date(r.createdAt).toLocaleDateString()}</Text>
                                  </Group>
                                  {r.text && (
                                    <Text size="xs" c="dimmed" lineClamp={2} mt={2}>"{r.text}"</Text>
                                  )}
                                </Box>
                              ))}
                            </Stack>
                            {l.recentReviews.length > 2 && v._id && (
                              <Anchor
                                onClick={() => showVendor(v._id)}
                                size="xs"
                                fw={600}
                                c="forest.7"
                                style={{ cursor: 'pointer' }}
                                mt={6}
                                display="block"
                              >
                                See all {v.ratingCount} reviews →
                              </Anchor>
                            )}
                          </Paper>
                        )}

                        {/* Vendor row */}
                        <Group justify="space-between" align="center" mt="md" wrap="nowrap">
                          <Anchor onClick={() => v._id && showVendor(v._id)} style={{ cursor: 'pointer', textDecoration: 'none' }}>
                            <Stack gap={2}>
                              <Text size="sm" fw={700} c="forest.7">{v.name || 'Unknown vendor'}</Text>
                              <StarRow value={v.ratingAvg || 0} count={v.ratingCount || 0} />
                            </Stack>
                          </Anchor>
                          <TrustBadges listing={l} />
                        </Group>

                        {(sameDistrictFee || otherDistrictFee) ? (
                          <Text size="xs" c="dimmed" mt={6}>
                            🚚 ৳{sameDistrictFee} same district{otherDistrictFee ? ` · ৳${otherDistrictFee} elsewhere` : ''}
                          </Text>
                        ) : (
                          <Text size="xs" c="dimmed" mt={6}>🚚 Delivery on request</Text>
                        )}

                        <Group gap="xs" mt="md">
                          {user && user.id !== v._id && user.role !== 'admin' && (
                            <Button
                              size="xs"
                              radius="xl"
                              color="lime"
                              styles={{ root: { color: '#0b3d2e', fontWeight: 700 } }}
                              onClick={() => openOrder(l)}
                              disabled={!l.quantityAvailable}
                            >
                              🛒 Order
                            </Button>
                          )}
                          {l.contact && (
                            <Button size="xs" radius="xl" variant="outline" color="forest" component="a" href={`tel:${l.contact}`}>Contact</Button>
                          )}
                          {user && v._id && user.id !== v._id && (
                            <Button size="xs" radius="xl" variant="outline" color="forest" component={Link} to={`/messages?to=${v._id}`}>Message</Button>
                          )}
                          {user && user.role !== 'admin' && l.productId?._id && (
                            <Button size="xs" radius="xl" variant="subtle" color="forest" component={Link} to={`/submit?productId=${l.productId._id}`}>Report price</Button>
                          )}
                          {(user?.id === v._id || user?.role === 'admin') && (
                            <Button size="xs" radius="xl" color="red" variant="light" onClick={() => remove(l._id)}>Delete</Button>
                          )}
                        </Group>
                      </Box>
                    </Card>
                  )
                })}
              </SimpleGrid>
            </div>
          ))}
        </Stack>
      )}

      {/* Filters drawer */}
      <Drawer
        opened={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title={<Text fw={800} c="forest.7">Filter & sort</Text>}
        position="left"
        size="md"
        radius="xl"
      >
        {FiltersPanel}
      </Drawer>

      {/* Vendor peek modal */}
      <Modal
        opened={!!vendorPeek}
        onClose={() => { setVendorPeek(null); setVendorPeekData(null) }}
        title={<Text fw={800} c="forest.7">Vendor profile</Text>}
        radius="xl"
      >
        {!vendorPeekData ? (
          <Center py="xl"><Loader color="forest.7" /></Center>
        ) : vendorPeekData.error ? (
          <Alert color="red" radius="lg">{vendorPeekData.error}</Alert>
        ) : (
          <Stack gap="sm">
            <Group gap="md" align="flex-start">
              <Box style={{ width: 56, height: 56, borderRadius: 999, background: '#bef264', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#0b3d2e', fontSize: 22 }}>
                {(vendorPeekData.vendor?.name || '?').slice(0, 1).toUpperCase()}
              </Box>
              <Stack gap={2}>
                <Group gap={6}>
                  <Text fw={800} fz="lg">{vendorPeekData.vendor?.name}</Text>
                  {vendorPeekData.vendor?.verified && <Badge color="forest" radius="xl" variant="light">✓ Verified</Badge>}
                </Group>
                <StarRow value={vendorPeekData.vendor?.ratingAvg || 0} count={vendorPeekData.vendor?.ratingCount || 0} size={16} />
                <Text size="xs" c="dimmed">
                  {vendorPeekData.totalSold || 0} completed · {vendorPeekData.listingsCount || 0} listings
                  {vendorPeekData.completionRate != null ? ` · ${(vendorPeekData.completionRate * 100).toFixed(0)}% completion` : ''}
                </Text>
              </Stack>
            </Group>
            {vendorPeekData.vendor?.delivery && (vendorPeekData.vendor.delivery.sameDistrictFee || vendorPeekData.vendor.delivery.otherDistrictFee) ? (
              <Paper p="sm" radius="lg" style={{ background: '#fbfdf6', border: '1px solid #ecfccb' }}>
                <Text size="xs" tt="uppercase" fw={700} c="forest.7">Delivery</Text>
                <Text size="sm">৳{vendorPeekData.vendor.delivery.sameDistrictFee || 0} same district · ৳{vendorPeekData.vendor.delivery.otherDistrictFee || 0} other districts</Text>
              </Paper>
            ) : null}
            <Divider label="Recent reviews" labelPosition="left" />
            {vendorPeekData.reviews?.length === 0 ? (
              <Text size="sm" c="dimmed">No reviews yet.</Text>
            ) : (
              <Stack gap="xs">
                {vendorPeekData.reviews.map((r) => (
                  <Paper key={r._id} p="sm" radius="lg" withBorder>
                    <Group gap={8}>
                      <StarRow value={r.rating} count={0} />
                      <Text size="xs" c="dimmed">{r.consumerId?.name || '—'} · {new Date(r.createdAt).toLocaleDateString()}</Text>
                    </Group>
                    {r.text && <Text size="sm" mt={4}>{r.text}</Text>}
                  </Paper>
                ))}
              </Stack>
            )}
          </Stack>
        )}
      </Modal>

      {/* Order modal */}
      <Modal
        opened={!!orderTarget}
        onClose={() => setOrderTarget(null)}
        title={<Text fw={800} c="forest.7">{orderTarget ? `Order: ${orderTarget.title}` : ''}</Text>}
        radius="xl"
      >
        {orderTarget && (
          <form onSubmit={placeOrder}>
            <Stack gap="sm">
              <Paper p="sm" radius="lg" style={{ background: '#fbfdf6', border: '1px solid #ecfccb' }}>
                <Group justify="space-between">
                  <Stack gap={2}>
                    <Text size="xs" c="dimmed">Unit price</Text>
                    <Text fw={700}>৳{orderTarget.price} /{orderTarget.unit}</Text>
                  </Stack>
                  <Stack gap={2} align="flex-end">
                    <Text size="xs" c="dimmed">Vendor</Text>
                    <Text fw={700}>{orderTarget.vendorId?.name}</Text>
                  </Stack>
                </Group>
              </Paper>
              <Stack gap={6}>
                <Text size="xs" tt="uppercase" fw={700} c="forest.7" style={{ letterSpacing: '0.1em' }}>How would you like it?</Text>
                <SimpleGrid cols={2} spacing="sm">
                  <Paper
                    p="md"
                    radius="lg"
                    onClick={() => setOrderFulfillment('pickup')}
                    style={{
                      cursor: 'pointer',
                      border: orderFulfillment === 'pickup' ? '2px solid #65a30d' : '1px solid rgba(11,61,46,0.08)',
                      background: orderFulfillment === 'pickup' ? 'linear-gradient(135deg, #ecfccb 0%, #ffffff 75%)' : '#fff',
                      transition: 'all 160ms ease',
                    }}
                  >
                    <Group justify="space-between" align="flex-start" wrap="nowrap">
                      <Stack gap={2}>
                        <Text fw={800} c="forest.7">🚶 Pickup</Text>
                        <Text size="xs" c="dimmed">Collect from {orderTarget.area || orderTarget.district || 'vendor'}</Text>
                        <Text size="xs" c="forest.7" fw={600} mt={4}>No delivery fee</Text>
                      </Stack>
                      {orderFulfillment === 'pickup' && (
                        <Box style={{ width: 22, height: 22, borderRadius: 999, background: '#bef264', color: '#0b3d2e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>✓</Box>
                      )}
                    </Group>
                  </Paper>
                  <Paper
                    p="md"
                    radius="lg"
                    onClick={() => setOrderFulfillment('cod')}
                    style={{
                      cursor: 'pointer',
                      border: orderFulfillment === 'cod' ? '2px solid #65a30d' : '1px solid rgba(11,61,46,0.08)',
                      background: orderFulfillment === 'cod' ? 'linear-gradient(135deg, #ecfccb 0%, #ffffff 75%)' : '#fff',
                      transition: 'all 160ms ease',
                    }}
                  >
                    <Group justify="space-between" align="flex-start" wrap="nowrap">
                      <Stack gap={2}>
                        <Text fw={800} c="forest.7">💵 Cash on delivery</Text>
                        <Text size="xs" c="dimmed">Pay when it arrives</Text>
                        <Text size="xs" c="forest.7" fw={600} mt={4}>
                          🚚 ৳{orderTarget.vendorId?.delivery?.sameDistrictFee || 0} same · ৳{orderTarget.vendorId?.delivery?.otherDistrictFee || 0} other
                        </Text>
                      </Stack>
                      {orderFulfillment === 'cod' && (
                        <Box style={{ width: 22, height: 22, borderRadius: 999, background: '#bef264', color: '#0b3d2e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>✓</Box>
                      )}
                    </Group>
                  </Paper>
                </SimpleGrid>
              </Stack>

              <NumberInput label="Quantity" value={orderQty} onChange={(v) => setOrderQty(v ?? 1)} min={1} required radius="xl" />
              <TextInput label="Your contact" placeholder="phone or email" value={orderContact} onChange={(e) => setOrderContact(e.target.value)} required radius="xl" />
              {orderFulfillment === 'cod' && (
                <TextInput
                  label="Delivery district"
                  placeholder="e.g. Dhaka"
                  value={orderDistrict}
                  onChange={(e) => setOrderDistrict(e.target.value)}
                  radius="xl"
                  required
                />
              )}
              <Textarea label="Message" placeholder="optional note for the vendor" value={orderMessage} onChange={(e) => setOrderMessage(e.target.value)} radius="xl" />
              <Paper p="sm" radius="lg" style={{ background: '#f7fde9', border: '1px solid #ecfccb' }}>
                <Group justify="space-between"><Text size="sm">Items</Text><Text size="sm">৳{(Number(orderTarget.price) * Number(orderQty || 0)).toFixed(2)}</Text></Group>
                <Group justify="space-between">
                  <Text size="sm">{orderFulfillment === 'pickup' ? '🚶 Pickup' : '🚚 Delivery'}</Text>
                  <Text size="sm">{orderFulfillment === 'pickup' ? 'Free' : `৳${orderDeliveryFee}`}</Text>
                </Group>
                <Divider my={6} />
                <Group justify="space-between">
                  <Text fw={800} c="forest.7">Total {orderFulfillment === 'cod' && <Text span size="xs" c="dimmed" fw={500}>(pay on delivery)</Text>}</Text>
                  <Text fw={800} c="forest.7">৳{(Number(orderTarget.price) * Number(orderQty || 0) + Number(orderDeliveryFee || 0)).toFixed(2)}</Text>
                </Group>
              </Paper>
              <Button type="submit" radius="xl" color="lime" styles={{ root: { color: '#0b3d2e', fontWeight: 700 } }}>
                Place order
              </Button>
              {orderErr && <Alert color="red" radius="lg">{orderErr}</Alert>}
              {orderOk && <Alert color="green" radius="lg">{orderOk}</Alert>}
            </Stack>
          </form>
        )}
      </Modal>
    </div>
  )
}
