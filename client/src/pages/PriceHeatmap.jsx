import { useEffect, useMemo, useRef, useState } from 'react'
import { Title, Select, Group, Text, Stack, Paper, Alert, Box, Button, Badge } from '@mantine/core'
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { api } from '../api.js'
import { socket } from '../socket.js'

const BANGLADESH_CENTER = [23.8103, 90.4125]

function intensityColor(avg, lo, hi) {
  if (avg <= lo) return '#65a30d'
  if (avg >= hi) return '#b91c1c'
  return '#eab308'
}

function pointKey(p) {
  return `${p.district || ''}|${p.area || ''}`
}

export default function PriceHeatmap() {
  const [products, setProducts] = useState([])
  const [productName, setProductName] = useState('')
  const [productId, setProductId] = useState('')
  const [points, setPoints] = useState([])
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [pulseKey, setPulseKey] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const productNameRef = useRef('')

  useEffect(() => {
    api('/products').then((d) => {
      setProducts(d.products)
      const onion = d.products.find((p) => /onion/i.test(p.name))
      const chosen = onion || d.products[0]
      if (chosen) {
        setProductName(chosen.name)
        setProductId(chosen._id)
      }
    }).catch((e) => setErr(e.message))
  }, [])

  useEffect(() => { productNameRef.current = productName }, [productName])

  function load() {
    if (!productName) {
      setPoints([])
      return
    }
    setLoading(true)
    api(`/prices/by-location?product=${encodeURIComponent(productName)}`)
      .then((d) => {
        setPoints(d.points || [])
        setLastUpdate(Date.now())
        setErr('')
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const p = products.find((p) => p.name === productName)
    setProductId(p?._id || '')
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productName])

  // Live updates: refetch when a price report comes in for the active product
  useEffect(() => {
    socket.connect()
    function onNew(p) {
      const incomingProductId = p.productId?._id
      const incomingName = p.productId?.name
      if (!productNameRef.current) return
      if (
        (productId && incomingProductId === productId) ||
        (incomingName && incomingName.toLowerCase() === productNameRef.current.toLowerCase())
      ) {
        load()
        const key = `${p.district || ''}|${p.area || ''}`
        setPulseKey(key)
        setTimeout(() => setPulseKey((k) => (k === key ? null : k)), 2200)
      }
    }
    socket.on('price:new', onNew)
    return () => { socket.off('price:new', onNew) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId])

  const { lo, hi, globalAvg, globalMin, globalMax } = useMemo(() => {
    if (points.length === 0) return { lo: 0, hi: 0, globalAvg: null, globalMin: null, globalMax: null }
    const sorted = [...points].map((p) => p.avg).sort((a, b) => a - b)
    const sum = points.reduce((s, p) => s + p.avg * p.count, 0)
    const cnt = points.reduce((s, p) => s + p.count, 0)
    return {
      lo: sorted[Math.floor(sorted.length / 3)],
      hi: sorted[Math.floor((2 * sorted.length) / 3)],
      globalAvg: cnt ? sum / cnt : null,
      globalMin: Math.min(...points.map((p) => p.min)),
      globalMax: Math.max(...points.map((p) => p.max)),
    }
  }, [points])

  const center = points[0] ? [points[0].lat, points[0].lng] : BANGLADESH_CENTER

  return (
    <Stack gap="md">
      <style>{`
        @keyframes pulseDot {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%      { transform: scale(1.6); opacity: 0.4; }
        }
        .live-dot { animation: pulseDot 1.4s ease-in-out infinite; }
      `}</style>

      <Stack gap={4}>
        <span className="section-eyebrow">Heatmap</span>
        <h1 className="display" style={{ margin: 0 }}>Price across <span style={{ color: '#65a30d' }}>Bangladesh</span></h1>
        <Text c="dimmed">Average price by district with color intensity. Updates live as new reports arrive.</Text>
      </Stack>

      <Paper p="md" radius="xl" style={{ background: '#fff', border: '1px solid rgba(11,61,46,0.08)', boxShadow: '0 12px 30px rgba(11,61,46,0.06)' }}>
        <Group gap="md" wrap="wrap" align="end">
          <Select
            label="Product"
            value={productName}
            onChange={(v) => setProductName(v || '')}
            data={products.map((p) => ({ value: p.name, label: p.name }))}
            searchable
            radius="xl"
            w={240}
            allowDeselect={false}
          />
          <Stack gap={6}>
            <Text size="xs" fw={600} c="dimmed">Live</Text>
            <Group gap={6} align="center">
              <Box className="live-dot" w={10} h={10} style={{ borderRadius: 999, background: '#65a30d' }} />
              <Text size="sm" c="forest.7" fw={600}>
                {lastUpdate ? `updated ${Math.max(0, Math.round((Date.now() - lastUpdate) / 1000))}s ago` : 'connecting…'}
              </Text>
            </Group>
          </Stack>
          <Box style={{ flex: 1 }} />
          <Button variant="light" radius="xl" color="forest" onClick={load} loading={loading}>
            Refresh
          </Button>
        </Group>
      </Paper>

      {points.length > 0 && (
        <Paper p="md" radius="xl" style={{ background: '#fbfdf6', border: '1px solid #ecfccb' }}>
          <Group justify="space-between" wrap="wrap" gap="md">
            <Group gap="md" wrap="wrap">
              <Stack gap={2}>
                <Text size="xs" tt="uppercase" fw={700} c="forest.7" style={{ letterSpacing: '0.1em' }}>Districts</Text>
                <Text fw={700}>{points.length}</Text>
              </Stack>
              <Stack gap={2}>
                <Text size="xs" tt="uppercase" fw={700} c="forest.7" style={{ letterSpacing: '0.1em' }}>National avg</Text>
                <Text fw={700}>{globalAvg != null ? `৳${globalAvg.toFixed(2)}` : '—'}</Text>
              </Stack>
              <Stack gap={2}>
                <Text size="xs" tt="uppercase" fw={700} c="forest.7" style={{ letterSpacing: '0.1em' }}>Range</Text>
                <Text fw={700}>৳{globalMin} – ৳{globalMax}</Text>
              </Stack>
            </Group>
            <Group gap="md" wrap="wrap">
              <Group gap={6}>
                <Box w={12} h={12} style={{ background: '#65a30d', borderRadius: 999 }} />
                <Text size="sm">Low <Text span c="dimmed">≤ ৳{lo.toFixed(2)}</Text></Text>
              </Group>
              <Group gap={6}>
                <Box w={12} h={12} style={{ background: '#eab308', borderRadius: 999 }} />
                <Text size="sm">Medium <Text span c="dimmed">৳{lo.toFixed(2)} – ৳{hi.toFixed(2)}</Text></Text>
              </Group>
              <Group gap={6}>
                <Box w={12} h={12} style={{ background: '#b91c1c', borderRadius: 999 }} />
                <Text size="sm">High <Text span c="dimmed">≥ ৳{hi.toFixed(2)}</Text></Text>
              </Group>
              <Badge variant="light" color="forest" radius="xl">Bubble size = sample count</Badge>
            </Group>
          </Group>
        </Paper>
      )}

      {err && <Alert color="red" radius="lg">{err}</Alert>}
      {points.length === 0 && !err && (
        <Paper withBorder p="md" radius="lg">
          <Text size="sm" c="dimmed">No location data yet for this product.</Text>
        </Paper>
      )}

      <div style={{ height: 560, borderRadius: 22, overflow: 'hidden', boxShadow: '0 12px 30px rgba(11,61,46,0.06)' }}>
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
            const key = pointKey(p)
            const isPulse = pulseKey === key
            const color = intensityColor(p.avg, lo, hi)
            const radius = Math.min(36, 8 + Math.sqrt(p.count) * 3) + (isPulse ? 8 : 0)
            const fillOpacity = isPulse ? 0.85 : 0.55
            const weight = isPulse ? 3 : 1
            return (
              <CircleMarker
                key={key}
                center={[p.lat, p.lng]}
                radius={radius}
                pathOptions={{ color, fillColor: color, fillOpacity, weight }}
              >
                <Tooltip direction="top" offset={[0, -6]} opacity={0.95} sticky>
                  <strong>{[p.area, p.district].filter(Boolean).join(', ') || 'Unknown'}</strong>
                  <br />
                  avg <b>৳{p.avg.toFixed(2)}</b>
                  <br />
                  {p.count} report{p.count === 1 ? '' : 's'}
                </Tooltip>
                <Popup>
                  <strong>{[p.area, p.district].filter(Boolean).join(', ') || 'Unknown'}</strong>
                  <br />
                  avg <b>৳{p.avg.toFixed(2)}</b> (min ৳{p.min}, max ৳{p.max})
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
