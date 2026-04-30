import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Title,
  Select,
  NumberInput,
  TextInput,
  FileInput,
  Button,
  Stack,
  Group,
  Alert,
  Text,
  Paper,
  Loader,
  Center,
  Box,
  Image,
  ActionIcon,
  Badge,
} from '@mantine/core'
import { api, apiUpload } from '../api.js'
import { useAuth } from '../AuthContext.jsx'

const MAX_PHOTO_BYTES = 5 * 1024 * 1024 // 5 MB
const DUP_WINDOW_MS = 24 * 60 * 60 * 1000

const cardStyle = {
  background: '#fff',
  border: '1px solid rgba(11,61,46,0.08)',
  borderRadius: 22,
  boxShadow: '0 12px 30px rgba(11,61,46,0.06)',
  padding: 22,
}

function fmt(n) {
  if (n == null || Number.isNaN(n)) return '—'
  return Number(n).toFixed(2)
}

export default function Submit() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const initialProductId = params.get('productId') || ''

  const [products, setProducts] = useState(null)
  const [productId, setProductId] = useState('')
  const [price, setPrice] = useState('')
  const [unit, setUnit] = useState('kg')
  const [area, setArea] = useState('')
  const [district, setDistrict] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [photo, setPhoto] = useState(null)
  const [photoUrl, setPhotoUrl] = useState('')

  const [errors, setErrors] = useState({})
  const [globalErr, setGlobalErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [locating, setLocating] = useState(false)
  const [locatedAt, setLocatedAt] = useState(0)
  const [duplicate, setDuplicate] = useState(null) // { existing, force }
  const [success, setSuccess] = useState(null)

  const lastObjectUrl = useRef('')

  useEffect(() => {
    api('/products')
      .then((d) => {
        setProducts(d.products)
        const preselect = initialProductId && d.products.find((p) => p._id === initialProductId)
        const fallback = d.products[0]
        const chosen = preselect || fallback
        if (chosen) {
          setProductId(chosen._id)
          setUnit(chosen.unit || 'kg')
        }
      })
      .catch((e) => setGlobalErr(e.message))
  }, [initialProductId])

  useEffect(() => {
    return () => {
      if (lastObjectUrl.current) URL.revokeObjectURL(lastObjectUrl.current)
    }
  }, [])

  const product = useMemo(
    () => (products ? products.find((p) => p._id === productId) : null),
    [products, productId],
  )

  function onPhotoChange(file) {
    setErrors((prev) => ({ ...prev, photo: undefined }))
    if (lastObjectUrl.current) URL.revokeObjectURL(lastObjectUrl.current)
    if (!file) {
      setPhoto(null)
      setPhotoUrl('')
      lastObjectUrl.current = ''
      return
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setErrors((prev) => ({ ...prev, photo: `Photo too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 5 MB.` }))
      return
    }
    const url = URL.createObjectURL(file)
    lastObjectUrl.current = url
    setPhoto(file)
    setPhotoUrl(url)
  }

  function getLocation() {
    if (!navigator.geolocation) {
      setErrors((prev) => ({ ...prev, location: 'Geolocation not supported by this browser.' }))
      return
    }
    setLocating(true)
    setErrors((prev) => ({ ...prev, location: undefined }))
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(5))
        setLng(pos.coords.longitude.toFixed(5))
        setLocatedAt(Date.now())
        setLocating(false)
      },
      (e) => {
        setLocating(false)
        setErrors((prev) => ({
          ...prev,
          location: e?.code === 1 ? 'Location permission denied.' : 'Could not get location.',
        }))
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  function validate() {
    const e = {}
    if (!productId) e.productId = 'Pick a product.'
    if (price === '' || price == null) e.price = 'Enter a price.'
    else if (Number(price) <= 0) e.price = 'Price must be greater than zero.'
    else if (Number(price) > 100000) e.price = 'That looks too high — double-check.'
    if (!unit.trim()) e.unit = 'Required.'
    const hasCoords = lat !== '' && lng !== ''
    if (!area.trim() && !hasCoords) {
      e.area = 'Enter an area or capture your location.'
    }
    setErrors((prev) => ({ ...prev, ...e, photo: prev.photo, location: prev.location }))
    return Object.keys(e).length === 0
  }

  async function checkDuplicates() {
    if (!area.trim() || !productId) return null
    try {
      const params = new URLSearchParams({ productId, area })
      const data = await api('/prices?' + params.toString())
      const cutoff = Date.now() - DUP_WINDOW_MS
      const mine = (data.prices || []).find((p) => {
        const sameUser = p.userId?._id === user.id || p.userId === user.id
        const recent = new Date(p.createdAt).getTime() >= cutoff
        return sameUser && recent
      })
      return mine || null
    } catch {
      return null
    }
  }

  async function submit(e) {
    e.preventDefault()
    setGlobalErr('')
    setSuccess(null)
    if (!validate()) return

    if (!duplicate?.force) {
      const existing = await checkDuplicates()
      if (existing) {
        setDuplicate({ existing, force: false })
        return
      }
    }

    setBusy(true)
    const fd = new FormData()
    fd.append('productId', productId)
    fd.append('price', price)
    fd.append('unit', unit)
    fd.append('area', area)
    fd.append('district', district)
    if (lat) fd.append('lat', lat)
    if (lng) fd.append('lng', lng)
    if (photo) fd.append('photo', photo)
    try {
      const res = await apiUpload('/prices', fd)
      const submitted = {
        product: product?.name,
        price: Number(price),
        unit,
        area,
        district,
        spike: res?.spike || null,
        productId,
      }
      setSuccess(submitted)
      setDuplicate(null)
    } catch (e) {
      setGlobalErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  function resetForm({ keepProduct = true } = {}) {
    setPrice('')
    setArea('')
    setDistrict('')
    setLat('')
    setLng('')
    onPhotoChange(null)
    if (!keepProduct) setProductId('')
    setErrors({})
    setGlobalErr('')
    setDuplicate(null)
    setSuccess(null)
  }

  if (!user) {
    return (
      <Alert color="green" radius="lg">
        Please <a href="/login">login</a> to submit a price.
      </Alert>
    )
  }
  if (user.role === 'admin') {
    return (
      <Alert color="yellow" radius="lg">
        Admins cannot submit prices. Use a vendor or consumer account.
      </Alert>
    )
  }
  if (products === null) {
    return (
      <Center mih={240}>
        <Stack align="center" gap="sm"><Loader color="forest.7" /><Text c="dimmed">Loading products…</Text></Stack>
      </Center>
    )
  }

  if (success) {
    return (
      <Stack maw={560} gap="md" mx="auto">
        <Paper style={{ ...cardStyle, background: 'linear-gradient(135deg, #ecfccb 0%, #ffffff 80%)' }}>
          <Stack gap="sm">
            <Group gap={10}>
              <Box style={{ width: 44, height: 44, borderRadius: 999, background: '#bef264', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>✓</Box>
              <Stack gap={2}>
                <Text fw={800} size="lg" c="forest.7">Price submitted!</Text>
                <Text size="sm" c="dimmed">Thanks — your report is now visible to the community.</Text>
              </Stack>
            </Group>
            <Paper p="md" radius="lg" style={{ background: '#fbfdf6', border: '1px solid #ecfccb' }}>
              <Group gap="xl" wrap="wrap">
                <Stack gap={2}>
                  <Text size="xs" c="dimmed">Product</Text>
                  <Text fw={700}>{success.product}</Text>
                </Stack>
                <Stack gap={2}>
                  <Text size="xs" c="dimmed">Price</Text>
                  <Text fw={800} c="forest.7">৳{success.price} <Text span size="xs" c="dimmed">/{success.unit}</Text></Text>
                </Stack>
                <Stack gap={2}>
                  <Text size="xs" c="dimmed">Where</Text>
                  <Text fw={600}>📍 {[success.area, success.district].filter(Boolean).join(', ') || '—'}</Text>
                </Stack>
              </Group>
              {success.spike && (
                <Alert mt="sm" color={success.spike.direction === 'up' ? 'red' : 'lime'} radius="lg">
                  Flagged as a {success.spike.direction === 'up' ? 'price spike' : 'price drop'} — {(success.spike.change * 100).toFixed(0)}% vs 7-day avg ৳{success.spike.avg.toFixed(2)}.
                </Alert>
              )}
            </Paper>
            <Group gap="sm" wrap="wrap">
              <Button radius="xl" color="lime" styles={{ root: { color: '#0b3d2e', fontWeight: 700 } }} component={Link} to={`/products/${success.productId}`}>
                View product
              </Button>
              <Button variant="default" radius="xl" onClick={() => resetForm()}>
                Submit another
              </Button>
              <Button variant="subtle" radius="xl" onClick={() => nav('/dashboard')}>
                Back to dashboard
              </Button>
            </Group>
          </Stack>
        </Paper>
      </Stack>
    )
  }

  return (
    <Stack maw={560} gap="md" mx="auto">
      <Stack gap={4}>
        <span className="section-eyebrow">Submit</span>
        <h1 className="display" style={{ margin: 0 }}>Report a <span style={{ color: '#65a30d' }}>price</span></h1>
        <Text c="dimmed" size="sm">Help others see what things actually cost in your area.</Text>
      </Stack>

      {products.length === 0 ? (
        <Alert color="yellow" radius="lg">No products yet. Ask a vendor to list one before submitting prices.</Alert>
      ) : (
        <Paper style={cardStyle}>
          <form onSubmit={submit}>
            <Stack gap="sm">
              <Select
                label="Product"
                placeholder="Pick a product"
                value={productId}
                onChange={(v) => {
                  setProductId(v || '')
                  const p = products.find((x) => x._id === v)
                  if (p?.unit) setUnit(p.unit)
                  setErrors((prev) => ({ ...prev, productId: undefined }))
                }}
                data={products.map((p) => ({ value: p._id, label: `${p.name} (per ${p.unit})` }))}
                error={errors.productId}
                allowDeselect={false}
                searchable
                radius="xl"
                nothingFoundMessage="No matches"
              />
              <Group grow gap="xs">
                <NumberInput
                  label="Price (৳)"
                  placeholder="0.00"
                  value={price}
                  onChange={(v) => { setPrice(v ?? ''); setErrors((prev) => ({ ...prev, price: undefined })) }}
                  min={0}
                  decimalScale={2}
                  error={errors.price}
                  radius="xl"
                  required
                />
                <TextInput
                  label="Unit"
                  placeholder="kg, L, dozen"
                  value={unit}
                  onChange={(e) => { setUnit(e.target.value); setErrors((prev) => ({ ...prev, unit: undefined })) }}
                  error={errors.unit}
                  radius="xl"
                />
              </Group>
              <Group grow gap="xs">
                <TextInput
                  label="Area"
                  placeholder="e.g. Mirpur"
                  value={area}
                  onChange={(e) => { setArea(e.target.value); setErrors((prev) => ({ ...prev, area: undefined })) }}
                  error={errors.area}
                  radius="xl"
                />
                <TextInput
                  label="District"
                  placeholder="e.g. Dhaka"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  radius="xl"
                />
              </Group>
              <Group align="end" gap="xs">
                <TextInput label="Latitude" placeholder="optional" value={lat} onChange={(e) => setLat(e.target.value)} radius="xl" flex={1} />
                <TextInput label="Longitude" placeholder="optional" value={lng} onChange={(e) => setLng(e.target.value)} radius="xl" flex={1} />
                <Button type="button" variant="default" radius="xl" onClick={getLocation} loading={locating}>
                  📍 Use location
                </Button>
              </Group>
              {locatedAt > 0 && lat && lng && (
                <Group gap={6}>
                  <Badge color="lime" variant="light" radius="xl" styles={{ root: { color: '#0b3d2e' } }}>
                    📍 Captured · {Number(lat).toFixed(3)}, {Number(lng).toFixed(3)}
                  </Badge>
                </Group>
              )}
              {errors.location && <Text size="xs" c="red.7">{errors.location}</Text>}

              <Stack gap={6}>
                <FileInput
                  label="Photo (optional)"
                  accept="image/*"
                  placeholder="Attach a receipt or shelf photo (max 5 MB)"
                  value={photo}
                  onChange={onPhotoChange}
                  error={errors.photo}
                  radius="xl"
                  clearable
                />
                {photoUrl && (
                  <Paper p="xs" radius="lg" withBorder style={{ position: 'relative', maxWidth: 240 }}>
                    <Image src={photoUrl} alt="preview" h={140} fit="cover" radius="md" />
                    <ActionIcon
                      onClick={() => onPhotoChange(null)}
                      variant="filled"
                      color="red"
                      radius="xl"
                      size="sm"
                      style={{ position: 'absolute', top: 6, right: 6 }}
                      aria-label="remove photo"
                    >
                      ×
                    </ActionIcon>
                    <Group justify="space-between" mt={6}>
                      <Text size="xs" c="dimmed" truncate maw={170}>{photo?.name}</Text>
                      <Text size="xs" c="dimmed">{((photo?.size || 0) / 1024).toFixed(0)} KB</Text>
                    </Group>
                  </Paper>
                )}
              </Stack>

              {duplicate?.existing && !duplicate.force && (
                <Alert color="yellow" radius="lg">
                  <Text fw={700} mb={4}>Possible duplicate</Text>
                  <Text size="sm">
                    You already submitted <b>{duplicate.existing.productId?.name || 'this product'}</b> in <b>{duplicate.existing.area || area}</b> at <b>৳{duplicate.existing.price}</b> on{' '}
                    {new Date(duplicate.existing.createdAt).toLocaleString()}.
                  </Text>
                  <Group gap="xs" mt="sm">
                    <Button
                      size="xs"
                      radius="xl"
                      color="yellow"
                      onClick={() => {
                        setDuplicate({ ...duplicate, force: true })
                        setTimeout(() => document.getElementById('submit-btn')?.click(), 0)
                      }}
                    >
                      Submit anyway
                    </Button>
                    <Button size="xs" radius="xl" variant="default" onClick={() => setDuplicate(null)}>Cancel</Button>
                  </Group>
                </Alert>
              )}

              {globalErr && <Alert color="red" radius="lg">{globalErr}</Alert>}

              <Button
                id="submit-btn"
                type="submit"
                loading={busy}
                mt="xs"
                radius="xl"
                size="md"
                color="lime"
                styles={{ root: { color: '#0b3d2e', fontWeight: 700 } }}
              >
                Submit price
              </Button>
            </Stack>
          </form>
        </Paper>
      )}
    </Stack>
  )
}
