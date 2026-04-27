import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
} from '@mantine/core'
import { api, apiUpload } from '../api.js'
import { useAuth } from '../AuthContext.jsx'

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
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(false)

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
      .catch((e) => setErr(e.message))
  }, [initialProductId])

  function getLocation() {
    if (!navigator.geolocation) return setErr('geolocation not supported')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(pos.coords.latitude))
        setLng(String(pos.coords.longitude))
      },
      () => setErr('could not get location')
    )
  }

  async function submit(e) {
    e.preventDefault()
    setErr('')
    setOk('')
    if (!productId) return setErr('please pick a product')
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
      await apiUpload('/prices', fd)
      setOk('Submitted!')
      setPrice('')
      setPhoto(null)
      setTimeout(() => nav(`/products/${productId}`), 800)
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  if (!user) {
    return (
      <Alert color="green">
        Please <a href="/login">login</a> to submit a price.
      </Alert>
    )
  }
  if (user.role === 'admin') {
    return (
      <Alert color="yellow">
        Admins cannot submit prices. Use a vendor or consumer account.
      </Alert>
    )
  }

  if (products === null) {
    return (
      <Center mih={200}>
        <Loader />
      </Center>
    )
  }

  return (
    <Stack maw={520} gap="md">
      <Title order={1}>Submit a price</Title>
      <Text c="dimmed" size="sm">
        Help others see what things actually cost in your area.
      </Text>

      {products.length === 0 ? (
        <Alert color="yellow">
          No products yet. Ask a vendor to add some before submitting prices.
        </Alert>
      ) : (
        <Paper withBorder p="md" radius="md">
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
                }}
                data={products.map((p) => ({
                  value: p._id,
                  label: `${p.name} (per ${p.unit})`,
                }))}
                required
                allowDeselect={false}
                searchable
                nothingFoundMessage="No matches"
              />
              <Group grow gap="xs">
                <NumberInput
                  label="Price"
                  placeholder="0.00"
                  value={price}
                  onChange={(v) => setPrice(v ?? '')}
                  min={0}
                  decimalScale={2}
                  required
                />
                <TextInput
                  label="Unit"
                  placeholder="kg, L, dozen"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                />
              </Group>
              <Group grow gap="xs">
                <TextInput
                  label="Area"
                  placeholder="e.g. Mirpur"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                />
                <TextInput
                  label="District"
                  placeholder="e.g. Dhaka"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                />
              </Group>
              <Group align="end" gap="xs">
                <TextInput
                  label="Latitude"
                  placeholder="optional"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  flex={1}
                />
                <TextInput
                  label="Longitude"
                  placeholder="optional"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  flex={1}
                />
                <Button type="button" variant="default" onClick={getLocation}>
                  Use my location
                </Button>
              </Group>
              <FileInput
                label="Photo (optional)"
                accept="image/*"
                placeholder="Attach a receipt or shelf photo"
                value={photo}
                onChange={setPhoto}
                clearable
              />
              <Button type="submit" loading={busy} mt="xs">
                Submit price
              </Button>
            </Stack>
          </form>
        </Paper>
      )}

      {err && <Alert color="red">{err}</Alert>}
      {ok && <Alert color="teal">{ok}</Alert>}
    </Stack>
  )
}
