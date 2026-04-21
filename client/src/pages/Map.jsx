import { useEffect, useState } from 'react'
import { Title, Select, Text, Group, Switch, Image, Stack } from '@mantine/core'
import { MapContainer, TileLayer, CircleMarker, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { api } from '../api.js'

const SERVER = 'http://localhost:4000'

const productIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

function bucket(price, prices) {
  if (prices.length === 0) return 'gray'
  const sorted = [...prices].sort((a, b) => a - b)
  const lo = sorted[Math.floor(sorted.length / 3)]
  const hi = sorted[Math.floor((2 * sorted.length) / 3)]
  if (price < lo) return '#2e8b57'
  if (price > hi) return '#c0392b'
  return '#f39c12'
}

export default function MapPage() {
  const [products, setProducts] = useState([])
  const [productId, setProductId] = useState('')
  const [points, setPoints] = useState([])
  const [showProducts, setShowProducts] = useState(true)
  const [showPrices, setShowPrices] = useState(true)

  useEffect(() => {
    api('/products').then((d) => {
      setProducts(d.products)
      if (d.products[0]) setProductId(d.products[0]._id)
    })
  }, [])

  useEffect(() => {
    const path = productId ? `/prices?productId=${productId}` : '/prices'
    api(path).then((d) => {
      const withCoords = d.prices.filter((p) => p.lat && p.lng)
      setPoints(withCoords)
    })
  }, [productId])

  const priceValues = points.map((p) => p.price)
  const productLocations = products.filter(
    (p) => p.lat != null && p.lng != null && (!productId || p._id === productId)
  )
  const center =
    productLocations[0]
      ? [productLocations[0].lat, productLocations[0].lng]
      : points[0]
        ? [points[0].lat, points[0].lng]
        : [23.81, 90.41]

  return (
    <Stack gap="sm">
      <Title order={1}>Map</Title>
      <Group gap="md" align="end">
        <Select
          label="Product"
          value={productId}
          onChange={(v) => setProductId(v || '')}
          data={[{ value: '', label: '— all products —' }, ...products.map((p) => ({ value: p._id, label: p.name }))]}
          maw={300}
        />
        <Switch
          label="Show products"
          checked={showProducts}
          onChange={(e) => setShowProducts(e.currentTarget.checked)}
        />
        <Switch
          label="Show price reports"
          checked={showPrices}
          onChange={(e) => setShowPrices(e.currentTarget.checked)}
        />
      </Group>
      <Group gap="xs">
        <Text size="sm">Price markers:</Text>
        <Text size="sm" c="#2e8b57">● cheap</Text>
        <Text size="sm" c="#f39c12">● mid</Text>
        <Text size="sm" c="#c0392b">● expensive</Text>
      </Group>
      <div style={{ height: 540 }}>
        <MapContainer center={center} zoom={11} style={{ height: '100%' }} key={`${center[0]}-${center[1]}`}>
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {showProducts &&
            productLocations.map((p) => (
              <Marker key={`prod-${p._id}`} position={[p.lat, p.lng]} icon={productIcon}>
                <Popup>
                  <div style={{ minWidth: 200 }}>
                    {p.imageUrl && (
                      <Image src={SERVER + p.imageUrl} alt={p.name} h={120} fit="cover" radius="sm" mb={6} />
                    )}
                    <strong>{p.name}</strong>
                    <br />
                    <small>per {p.unit}{p.category && ` — ${p.category}`}</small>
                    <br />
                    <small>{[p.area, p.district].filter(Boolean).join(', ')}</small>
                  </div>
                </Popup>
              </Marker>
            ))}
          {showPrices &&
            points.map((p) => (
              <CircleMarker
                key={`price-${p._id}`}
                center={[p.lat, p.lng]}
                radius={8}
                pathOptions={{ color: bucket(p.price, priceValues), fillOpacity: 0.7 }}
              >
                <Popup>
                  <strong>{p.productId?.name}</strong>
                  <br />
                  {p.price} / {p.unit}
                  <br />
                  {[p.area, p.district].filter(Boolean).join(', ')}
                  <br />
                  <small>by {p.userId?.name} ({p.source})</small>
                </Popup>
              </CircleMarker>
            ))}
        </MapContainer>
      </div>
    </Stack>
  )
}
