import { useEffect, useState } from 'react'
import { Title, Select, Text, Group } from '@mantine/core'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { api } from '../api.js'

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
  const center = points[0] ? [points[0].lat, points[0].lng] : [23.81, 90.41]

  return (
    <div>
      <Title order={1} mb="md">Map</Title>
      <Select
        value={productId}
        onChange={(v) => setProductId(v || '')}
        data={[{ value: '', label: '— all products —' }, ...products.map((p) => ({ value: p._id, label: p.name }))]}
        maw={300}
      />
      <Group gap="xs" mt="xs">
        <Text size="sm">Markers:</Text>
        <Text size="sm" c="#2e8b57">● cheap</Text>
        <Text size="sm" c="#f39c12">● mid</Text>
        <Text size="sm" c="#c0392b">● expensive</Text>
      </Group>
      <div style={{ height: 500, marginTop: 12 }}>
        <MapContainer center={center} zoom={11} style={{ height: '100%' }}>
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {points.map((p) => (
            <CircleMarker
              key={p._id}
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
    </div>
  )
}
