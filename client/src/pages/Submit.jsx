import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Title, Select, NumberInput, TextInput, FileInput, Button, Stack, Group, Alert, Text } from '@mantine/core'
import { api, apiUpload } from '../api.js'
import { useAuth } from '../AuthContext.jsx'

export default function Submit() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [products, setProducts] = useState([])
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

  useEffect(() => {
    api('/products').then((d) => {
      setProducts(d.products)
      if (d.products[0]) setProductId(d.products[0]._id)
    })
  }, [])

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
    if (!user) return setErr('login first')
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
    }
  }

  if (!user) return <Text>Please <a href="/login">login</a> first.</Text>

  return (
    <div style={{ maxWidth: 480 }}>
      <Title order={1} mb="md">Submit a price</Title>
      <form onSubmit={submit}>
        <Stack gap="sm">
          <Select
            value={productId}
            onChange={(v) => setProductId(v || '')}
            data={products.map((p) => ({ value: p._id, label: `${p.name} (per ${p.unit})` }))}
            required
            allowDeselect={false}
          />
          <NumberInput
            placeholder="price"
            value={price}
            onChange={(v) => setPrice(v ?? '')}
            min={0}
            decimalScale={2}
            required
          />
          <TextInput placeholder="unit (kg, L, dozen)" value={unit} onChange={(e) => setUnit(e.target.value)} />
          <TextInput placeholder="area (e.g. Mirpur)" value={area} onChange={(e) => setArea(e.target.value)} />
          <TextInput placeholder="district (e.g. Dhaka)" value={district} onChange={(e) => setDistrict(e.target.value)} />
          <Group gap="xs" grow>
            <TextInput placeholder="lat" value={lat} onChange={(e) => setLat(e.target.value)} />
            <TextInput placeholder="lng" value={lng} onChange={(e) => setLng(e.target.value)} />
            <Button type="button" variant="default" onClick={getLocation}>Use my location</Button>
          </Group>
          <FileInput accept="image/*" placeholder="photo" value={photo} onChange={setPhoto} />
          <Button type="submit">Submit price</Button>
        </Stack>
      </form>
      {err && <Alert color="red" mt="sm">{err}</Alert>}
      {ok && <Alert color="green" mt="sm">{ok}</Alert>}
    </div>
  )
}
