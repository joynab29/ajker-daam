import { useEffect, useMemo, useState } from 'react'
import {
  Title,
  TextInput,
  NumberInput,
  Button,
  Group,
  Table,
  Text,
  Tabs,
  Stack,
  Paper,
  Alert,
  FileInput,
  Image,
  Modal,
  Badge,
} from '@mantine/core'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { api, apiUpload } from '../api.js'

const SERVER = 'http://localhost:4000'
const DEFAULT_CENTER = [23.81, 90.41]

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

function ClickToSet({ onSet }) {
  useMapEvents({
    click(e) {
      onSet(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

export default function Vendor() {
  const [tab, setTab] = useState('publish')
  const [products, setProducts] = useState([])
  const [drafts, setDrafts] = useState({})
  const [shopArea, setShopArea] = useState('')
  const [shopDistrict, setShopDistrict] = useState('')
  const [pubMsg, setPubMsg] = useState('')
  const [pubErr, setPubErr] = useState('')

  // Add product form state
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('kg')
  const [category, setCategory] = useState('')
  const [image, setImage] = useState(null)
  const [area, setArea] = useState('')
  const [district, setDistrict] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [addErr, setAddErr] = useState('')
  const [addOk, setAddOk] = useState('')
  const [busy, setBusy] = useState(false)

  // Map modal
  const [mapProduct, setMapProduct] = useState(null)

  function loadProducts() {
    api('/products').then((d) => setProducts(d.products))
  }

  useEffect(() => {
    loadProducts()
  }, [])

  function setDraft(id, val) {
    setDrafts((prev) => ({ ...prev, [id]: val }))
  }

  async function publish(p) {
    setPubMsg('')
    setPubErr('')
    const draftPrice = drafts[p._id]
    const priceNum = Number(draftPrice)
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      setPubErr(`Enter a price for ${p.name} first.`)
      return
    }
    const fd = new FormData()
    fd.append('productId', p._id)
    fd.append('price', String(priceNum))
    fd.append('unit', p.unit || 'kg')
    fd.append('area', shopArea)
    fd.append('district', shopDistrict)
    try {
      await apiUpload('/prices', fd)
      setPubMsg(`Published ${priceNum} for ${p.name}.`)
      setDraft(p._id, '')
      setTimeout(() => setPubMsg(''), 2000)
    } catch (e) {
      setPubErr(e.message)
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) return setAddErr('geolocation not supported')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(pos.coords.latitude))
        setLng(String(pos.coords.longitude))
      },
      () => setAddErr('could not get location')
    )
  }

  function resetAddForm() {
    setName('')
    setCategory('')
    setImage(null)
    setArea('')
    setDistrict('')
    setLat('')
    setLng('')
  }

  async function addProduct(e) {
    e.preventDefault()
    setAddErr('')
    setAddOk('')
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('name', name)
      fd.append('unit', unit)
      fd.append('category', category)
      fd.append('area', area)
      fd.append('district', district)
      if (lat) fd.append('lat', lat)
      if (lng) fd.append('lng', lng)
      if (image) fd.append('image', image)
      await apiUpload('/products', fd)
      setAddOk(`Added ${name}.`)
      resetAddForm()
      loadProducts()
      setTimeout(() => setAddOk(''), 1500)
    } catch (e) {
      setAddErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function removeProduct(id) {
    if (!confirm('Delete this product?')) return
    try {
      await api(`/products/${id}`, { method: 'DELETE' })
      loadProducts()
    } catch (e) {
      setAddErr(e.message)
    }
  }

  const pickerCenter = useMemo(() => {
    const la = Number(lat)
    const ln = Number(lng)
    return Number.isFinite(la) && Number.isFinite(ln) && (la || ln) ? [la, ln] : DEFAULT_CENTER
  }, [lat, lng])

  return (
    <Stack gap="md">
      <Title order={1}>Vendor</Title>
      <Tabs value={tab} onChange={setTab}>
        <Tabs.List>
          <Tabs.Tab value="publish">Publish prices</Tabs.Tab>
          <Tabs.Tab value="products">Manage products</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="publish" pt="md">
          <Paper withBorder p="md" radius="md" mb="md">
            <Group grow gap="xs">
              <TextInput
                label="Shop area"
                placeholder="e.g. Mirpur"
                value={shopArea}
                onChange={(e) => setShopArea(e.target.value)}
              />
              <TextInput
                label="Shop district"
                placeholder="e.g. Dhaka"
                value={shopDistrict}
                onChange={(e) => setShopDistrict(e.target.value)}
              />
            </Group>
          </Paper>
          {pubMsg && <Alert color="teal" mb="sm">{pubMsg}</Alert>}
          {pubErr && <Alert color="red" mb="sm">{pubErr}</Alert>}
          {products.length === 0 ? (
            <Text c="dimmed">No products yet. Add some on the Manage products tab.</Text>
          ) : (
            <Paper withBorder radius="md">
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Product</Table.Th>
                    <Table.Th>Unit</Table.Th>
                    <Table.Th>Your price</Table.Th>
                    <Table.Th></Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {products.map((p) => (
                    <Table.Tr key={p._id}>
                      <Table.Td>{p.name}</Table.Td>
                      <Table.Td>{p.unit}</Table.Td>
                      <Table.Td>
                        <NumberInput
                          size="xs"
                          value={drafts[p._id] ?? ''}
                          onChange={(v) => setDraft(p._id, v ?? '')}
                          min={0}
                          decimalScale={2}
                          w={120}
                          placeholder="0.00"
                        />
                      </Table.Td>
                      <Table.Td>
                        <Button size="xs" onClick={() => publish(p)}>Publish</Button>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Paper>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="products" pt="md">
          <Paper withBorder p="md" radius="md" mb="md">
            <form onSubmit={addProduct}>
              <Stack gap="sm" maw={520}>
                <Title order={3}>Add a product</Title>
                <TextInput
                  label="Name"
                  placeholder="e.g. Onion"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <Group grow gap="xs">
                  <TextInput
                    label="Unit"
                    placeholder="kg, L, dozen"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                  />
                  <TextInput
                    label="Category"
                    placeholder="e.g. vegetables"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  />
                </Group>
                <FileInput
                  label="Image"
                  accept="image/*"
                  placeholder="Choose from device"
                  value={image}
                  onChange={setImage}
                  clearable
                />
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
                <Text size="sm" fw={500}>Location</Text>
                <Text size="xs" c="dimmed">Click on the map to set, or use your device location.</Text>
                <div style={{ height: 260, borderRadius: 8, overflow: 'hidden' }}>
                  <MapContainer center={pickerCenter} zoom={11} style={{ height: '100%' }} key={`${pickerCenter[0]}-${pickerCenter[1]}`}>
                    <TileLayer
                      attribution='&copy; OpenStreetMap'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <ClickToSet onSet={(la, ln) => { setLat(String(la)); setLng(String(ln)) }} />
                    {lat && lng && (
                      <Marker position={[Number(lat), Number(lng)]} icon={markerIcon} />
                    )}
                  </MapContainer>
                </div>
                <Group gap="xs" align="end">
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
                  <Button type="button" variant="default" onClick={useMyLocation}>
                    Use my location
                  </Button>
                </Group>
                <Button type="submit" loading={busy}>Add product</Button>
              </Stack>
            </form>
          </Paper>
          {addErr && <Alert color="red" mb="sm">{addErr}</Alert>}
          {addOk && <Alert color="teal" mb="sm">{addOk}</Alert>}
          <Title order={3} mb="sm">Existing products</Title>
          {products.length === 0 ? (
            <Text c="dimmed">No products yet.</Text>
          ) : (
            <Paper withBorder radius="md">
              <Table striped highlightOnHover verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Image</Table.Th>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Unit</Table.Th>
                    <Table.Th>Category</Table.Th>
                    <Table.Th>Location</Table.Th>
                    <Table.Th></Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {products.map((p) => (
                    <Table.Tr key={p._id}>
                      <Table.Td>
                        {p.imageUrl ? (
                          <Image src={SERVER + p.imageUrl} alt={p.name} w={48} h={48} fit="cover" radius="sm" />
                        ) : (
                          <Text size="xs" c="dimmed">—</Text>
                        )}
                      </Table.Td>
                      <Table.Td>{p.name}</Table.Td>
                      <Table.Td>{p.unit}</Table.Td>
                      <Table.Td>{p.category || '—'}</Table.Td>
                      <Table.Td>
                        {p.lat != null && p.lng != null ? (
                          <Group gap={4}>
                            <Badge variant="light" color="blue">
                              {[p.area, p.district].filter(Boolean).join(', ') || `${p.lat.toFixed(3)}, ${p.lng.toFixed(3)}`}
                            </Badge>
                            <Button size="xs" variant="subtle" onClick={() => setMapProduct(p)}>
                              View on map
                            </Button>
                          </Group>
                        ) : (
                          <Text size="xs" c="dimmed">no location</Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Button size="xs" color="red" variant="light" onClick={() => removeProduct(p._id)}>
                          Delete
                        </Button>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Paper>
          )}
        </Tabs.Panel>
      </Tabs>

      <Modal
        opened={!!mapProduct}
        onClose={() => setMapProduct(null)}
        title={mapProduct?.name}
        size="lg"
      >
        {mapProduct && (
          <Stack gap="sm">
            {mapProduct.imageUrl && (
              <Image src={SERVER + mapProduct.imageUrl} alt={mapProduct.name} h={200} fit="cover" radius="sm" />
            )}
            <Group gap="md">
              <Text size="sm"><b>Unit:</b> {mapProduct.unit}</Text>
              {mapProduct.category && <Text size="sm"><b>Category:</b> {mapProduct.category}</Text>}
              {(mapProduct.area || mapProduct.district) && (
                <Text size="sm"><b>Area:</b> {[mapProduct.area, mapProduct.district].filter(Boolean).join(', ')}</Text>
              )}
            </Group>
            <div style={{ height: 360, borderRadius: 8, overflow: 'hidden' }}>
              <MapContainer center={[mapProduct.lat, mapProduct.lng]} zoom={13} style={{ height: '100%' }}>
                <TileLayer
                  attribution='&copy; OpenStreetMap'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[mapProduct.lat, mapProduct.lng]} icon={markerIcon}>
                  <Popup>{mapProduct.name}</Popup>
                </Marker>
              </MapContainer>
            </div>
          </Stack>
        )}
      </Modal>
    </Stack>
  )
}
