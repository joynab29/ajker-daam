import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Title, TextInput, Textarea, NumberInput, FileInput, Button, Stack, Group, SimpleGrid, Card, Image, Text, Alert, Paper, Modal, Badge } from '@mantine/core'
import { api, apiUpload } from '../api.js'
import { useAuth } from '../AuthContext.jsx'

const SERVER = 'http://localhost:4000'

export default function Marketplace() {
  const { user } = useAuth()
  const [listings, setListings] = useState([])
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
  const [err, setErr] = useState('')

  const [orderTarget, setOrderTarget] = useState(null)
  const [orderQty, setOrderQty] = useState(1)
  const [orderContact, setOrderContact] = useState('')
  const [orderMessage, setOrderMessage] = useState('')
  const [orderErr, setOrderErr] = useState('')
  const [orderOk, setOrderOk] = useState('')

  function load() {
    api('/listings').then((d) => setListings(d.listings))
  }

  useEffect(() => {
    load()
  }, [])

  function getLocation() {
    if (!navigator.geolocation) return setErr('geolocation not supported')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(pos.coords.latitude))
        setLng(String(pos.coords.longitude))
      },
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
      setTitle('')
      setDescription('')
      setCategory('')
      setPrice('')
      setQty('')
      setLat('')
      setLng('')
      setContact('')
      setPhoto(null)
      load()
    } catch (e) {
      setErr(e.message)
    }
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
    setOrderErr('')
    setOrderOk('')
  }

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
        }),
      })
      setOrderOk('Order placed. The vendor will contact you.')
      setTimeout(() => setOrderTarget(null), 1200)
    } catch (e) {
      setOrderErr(e.message)
    }
  }

  return (
    <div>
      <span className="section-eyebrow">Marketplace</span>
      <h1 className="display" style={{ margin: '8px 0 6px' }}>Buy fresh. <span style={{ color: '#65a30d' }}>Compare honestly.</span></h1>
      <Text c="dimmed" mb="lg" maw={680}>
        Vendors list products. Consumers buy and report real prices. Each card pairs the vendor's asking price with what the community is actually paying.
      </Text>

      {user?.role === 'vendor' && (
        <Paper p="lg" radius="xl" mb="lg" className="card-soft">
          <Title order={3} mb="sm">List a product</Title>
          <form onSubmit={add}>
            <Stack gap="sm" maw={620}>
              <TextInput label="Product name" placeholder="e.g. Onion" value={title} onChange={(e) => setTitle(e.target.value)} required />
              <Textarea label="Description" placeholder="optional details" value={description} onChange={(e) => setDescription(e.target.value)} />
              <Group gap="xs" grow>
                <TextInput label="Category" placeholder="e.g. Vegetable" value={category} onChange={(e) => setCategory(e.target.value)} />
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
              <FileInput label="Photo" accept="image/*" placeholder="optional" value={photo} onChange={setPhoto} clearable />
              <Button type="submit" radius="xl" color="lime" styles={{ root: { color: '#0b3d2e', fontWeight: 700 } }}>
                Publish listing
              </Button>
            </Stack>
          </form>
          {err && <Alert color="red" mt="sm">{err}</Alert>}
        </Paper>
      )}

      <Group justify="space-between" align="end" mt="xl" mb="sm" wrap="wrap">
        <Stack gap={4}>
          <span className="section-eyebrow">All listings</span>
          <h2 className="display" style={{ margin: 0 }}>What's in the basket today</h2>
        </Stack>
      </Group>
      {listings.length === 0 ? (
        <Text>No listings yet.</Text>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
          {listings.map((l) => {
            const cmp = l.comparison || { count: 0 }
            const diff = cmp.count > 0 ? l.price - cmp.avg : null
            const diffPct = diff != null && cmp.avg > 0 ? (diff / cmp.avg) * 100 : null
            return (
              <Card key={l._id} padding="lg" radius="xl" className="card-soft">
                {l.imageUrl ? (
                  <Card.Section>
                    <Image src={SERVER + l.imageUrl} alt={l.title} h={160} fit="cover" />
                  </Card.Section>
                ) : (
                  <Card.Section
                    style={{
                      height: 160,
                      background: 'linear-gradient(135deg, #ecfccb 0%, #bef264 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 64,
                    }}
                  >
                    🥗
                  </Card.Section>
                )}
                <Group justify="space-between" align="flex-start" mt="md" wrap="nowrap">
                  <Title order={4} style={{ margin: 0 }}>{l.title}</Title>
                  {l.category && <span className="chip-lime">{l.category}</span>}
                </Group>
                <Text fw={800} size="xl" c="forest.7" mt={4}>
                  ৳{l.price} <Text span size="sm" c="dimmed" fw={500}>/ {l.unit}</Text>
                </Text>
                {l.quantityAvailable ? (
                  <Text size="xs" c="dimmed">{l.quantityAvailable} {l.unit} available</Text>
                ) : null}
                {l.description && <Text size="sm" mt={6}>{l.description}</Text>}
                <Text size="xs" c="dimmed" mt={6}>📍 {[l.area, l.district].filter(Boolean).join(', ') || '—'}</Text>
                <Text size="xs" c="dimmed">By {l.vendorId?.name}{l.contact && ` · ${l.contact}`}</Text>

                <Paper bg="#f7fde9" p="sm" radius="lg" mt="md" style={{ border: '1px solid #ecfccb' }}>
                  {cmp.count > 0 ? (
                    <>
                      <Text size="xs" fw={700} c="forest.7" tt="uppercase" style={{ letterSpacing: '0.08em' }}>
                        Community ({cmp.count})
                      </Text>
                      <Text size="sm" mt={2}>avg <b>৳{cmp.avg.toFixed(2)}</b> · min ৳{cmp.min} · max ৳{cmp.max}</Text>
                      {diffPct != null && (
                        <Badge
                          mt={6}
                          radius="xl"
                          variant="filled"
                          color={diffPct > 5 ? 'red' : diffPct < -5 ? 'lime' : 'gray'}
                          styles={{ root: diffPct < -5 ? { color: '#0b3d2e' } : undefined }}
                        >
                          listed {diffPct > 0 ? '+' : ''}{diffPct.toFixed(0)}% vs avg
                        </Badge>
                      )}
                    </>
                  ) : (
                    <Text size="xs" c="dimmed">No community reports yet — be the first.</Text>
                  )}
                </Paper>

                <Group gap="xs" mt="md">
                  {user && user.id !== l.vendorId?._id && user.role !== 'admin' && (
                    <Button
                      size="xs"
                      radius="xl"
                      color="lime"
                      styles={{ root: { color: '#0b3d2e', fontWeight: 700 } }}
                      onClick={() => openOrder(l)}
                    >
                      🛒 Order
                    </Button>
                  )}
                  {l.contact && (
                    <Button size="xs" radius="xl" variant="outline" color="forest" component="a" href={`tel:${l.contact}`}>
                      Contact
                    </Button>
                  )}
                  {user && l.vendorId?._id && user.id !== l.vendorId._id && (
                    <Button size="xs" radius="xl" variant="outline" color="forest" component={Link} to={`/messages?to=${l.vendorId._id}`}>
                      Message
                    </Button>
                  )}
                  {user && user.role !== 'admin' && l.productId?._id && (
                    <Button size="xs" radius="xl" variant="subtle" color="forest" component={Link} to={`/submit?productId=${l.productId._id}`}>
                      Report price
                    </Button>
                  )}
                  {(user?.id === l.vendorId?._id || user?.role === 'admin') && (
                    <Button size="xs" radius="xl" color="red" variant="light" onClick={() => remove(l._id)}>Delete</Button>
                  )}
                </Group>
              </Card>
            )
          })}
        </SimpleGrid>
      )}

      <Modal opened={!!orderTarget} onClose={() => setOrderTarget(null)} title={orderTarget ? `Order: ${orderTarget.title}` : ''}>
        {orderTarget && (
          <form onSubmit={placeOrder}>
            <Stack gap="sm">
              <Text size="sm">
                {orderTarget.price} / {orderTarget.unit} from {orderTarget.vendorId?.name}
              </Text>
              <NumberInput label="Quantity" value={orderQty} onChange={(v) => setOrderQty(v ?? 1)} min={1} required />
              <TextInput label="Your contact" placeholder="phone or email" value={orderContact} onChange={(e) => setOrderContact(e.target.value)} required />
              <Textarea label="Message" placeholder="optional note for the vendor" value={orderMessage} onChange={(e) => setOrderMessage(e.target.value)} />
              <Button type="submit">Place order</Button>
              {orderErr && <Alert color="red">{orderErr}</Alert>}
              {orderOk && <Alert color="green">{orderOk}</Alert>}
            </Stack>
          </form>
        )}
      </Modal>
    </div>
  )
}
