import { useEffect, useMemo, useState } from 'react'
import { Title, Select, Group, Text, Stack, Paper, Alert } from '@mantine/core'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { api } from '../api.js'

const BANGLADESH_CENTER = [23.8103, 90.4125]

function intensityColor(avg, lo, hi) {
  if (avg <= lo) return '#65a30d'
  if (avg >= hi) return '#b91c1c'
  return '#eab308'
}

export default function PriceHeatmap() {
  const [products, setProducts] = useState([])
  const [productName, setProductName] = useState('')
  const [points, setPoints] = useState([])
  const [err, setErr] = useState('')

  useEffect(() => {
    api('/products').then((d) => {
      setProducts(d.products)
      const onion = d.products.find((p) => /onion/i.test(p.name))
      setProductName((onion || d.products[0])?.name || '')
    }).catch((e) => setErr(e.message))
  }, [])

  useEffect(() => {
    if (!productName) {
      setPoints([])
      return
    }
    setErr('')
    api(`/prices/by-location?product=${encodeURIComponent(productName)}`)
      .then((d) => setPoints(d.points || []))
      .catch((e) => setErr(e.message))
  }, [productName])

  const { lo, hi } = useMemo(() => {
    if (points.length === 0) return { lo: 0, hi: 0 }
    const sorted = [...points].map((p) => p.avg).sort((a, b) => a - b)
    return {
      lo: sorted[Math.floor(sorted.length / 3)],
      hi: sorted[Math.floor((2 * sorted.length) / 3)],
    }
  }, [points])

  const center = points[0] ? [points[0].lat, points[0].lng] : BANGLADESH_CENTER

  return (
    <Stack gap="sm">
      <span className="section-eyebrow">Heatmap</span>
      <h1 className="display" style={{ margin: 0 }}>Price across <span style={{ color: '#65a30d' }}>Bangladesh</span></h1>
      <Text c="dimmed">Average price by district. Pick a product to update the map.</Text>
      <Group gap="md" align="end">
        <Select
          label="Product"
          value={productName}
          onChange={(v) => setProductName(v || '')}
          data={products.map((p) => ({ value: p.name, label: p.name }))}
          searchable
          maw={300}
        />
      </Group>
      <Group gap="xs">
        <Text size="sm">Intensity:</Text>
        <Text size="sm" c="#65a30d">● low</Text>
        <Text size="sm" c="#eab308">● medium</Text>
        <Text size="sm" c="#b91c1c">● high</Text>
      </Group>
      {err && <Alert color="red">{err}</Alert>}
      {points.length === 0 && !err && (
        <Paper withBorder p="sm" radius="md">
          <Text size="sm" c="dimmed">No location data yet for this product.</Text>
        </Paper>
      )}
      <div style={{ height: 540 }}>
        <MapContainer
          center={center}
          zoom={7}
          style={{ height: '100%' }}
          key={`${productName}-${center[0]}-${center[1]}`}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {points.map((p) => {
            const color = intensityColor(p.avg, lo, hi)
            const radius = Math.min(28, 8 + Math.sqrt(p.count) * 3)
            return (
              <CircleMarker
                key={`${p.district}-${p.area}`}
                center={[p.lat, p.lng]}
                radius={radius}
                pathOptions={{ color, fillColor: color, fillOpacity: 0.5, weight: 1 }}
              >
                <Popup>
                  <strong>{[p.area, p.district].filter(Boolean).join(', ') || 'Unknown'}</strong>
                  <br />
                  avg {p.avg.toFixed(2)} (min {p.min}, max {p.max})
                  <br />
                  <small>{p.count} report{p.count === 1 ? '' : 's'}</small>
                </Popup>
              </CircleMarker>
            )
          })}
        </MapContainer>
      </div>
    </Stack>
  )
}
