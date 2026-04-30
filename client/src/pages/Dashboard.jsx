import { useEffect, useMemo, useState } from 'react'
import {
  Title,
  Text,
  Alert,
  Stack,
  Paper,
  Group,
  SimpleGrid,
  Select,
  TextInput,
  Table,
  Badge,
  ActionIcon,
  Center,
  Loader,
  Box,
} from '@mantine/core'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts'
import { api } from '../api.js'
import { socket } from '../socket.js'

const FRESH_HIGHLIGHT_MS = 6000

const cardStyle = {
  background: '#fff',
  border: '1px solid rgba(11,61,46,0.08)',
  borderRadius: 22,
  boxShadow: '0 12px 30px rgba(11,61,46,0.06)',
  padding: 22,
  transition: 'transform 200ms ease, box-shadow 200ms ease',
}

const cardAccent = (color) => ({
  ...cardStyle,
  background: `linear-gradient(135deg, ${color} 0%, #ffffff 70%)`,
})

function StatCard({ eyebrow, value, sub, accent, icon }) {
  return (
    <Paper style={cardAccent(accent)}>
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Stack gap={4}>
          <Text size="xs" fw={700} tt="uppercase" c="forest.7" style={{ letterSpacing: '0.1em' }}>
            {eyebrow}
          </Text>
          <Text fw={800} fz={32} c="forest.7" style={{ lineHeight: 1.05 }}>
            {value}
          </Text>
          {sub && <Text size="xs" c="dimmed">{sub}</Text>}
        </Stack>
        <Box
          style={{
            width: 44,
            height: 44,
            borderRadius: 999,
            background: '#bef264',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            flex: '0 0 auto',
          }}
        >
          {icon}
        </Box>
      </Group>
    </Paper>
  )
}

function fmt(n) {
  if (n == null || Number.isNaN(n)) return '—'
  return Number(n).toFixed(2)
}

function timeAgo(ts) {
  const sec = Math.max(1, Math.round((Date.now() - ts) / 1000))
  if (sec < 60) return `${sec}s ago`
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  return new Date(ts).toLocaleDateString()
}

export default function Dashboard() {
  const [prices, setPrices] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [freshIds, setFreshIds] = useState(() => new Set())
  const [productFilter, setProductFilter] = useState('all')
  const [locationFilter, setLocationFilter] = useState('')
  const [sortKey, setSortKey] = useState('createdAt')
  const [sortDir, setSortDir] = useState('desc')
  const [err, setErr] = useState('')

  useEffect(() => {
    api('/prices')
      .then((d) => setPrices(d.prices))
      .catch((e) => {
        setErr(e.message)
        setPrices([])
      })
    socket.connect()
    const onNew = (p) => {
      setPrices((prev) => [p, ...(prev || [])].slice(0, 200))
      setFreshIds((prev) => {
        const next = new Set(prev)
        next.add(p._id)
        return next
      })
      setTimeout(() => {
        setFreshIds((prev) => {
          if (!prev.has(p._id)) return prev
          const next = new Set(prev)
          next.delete(p._id)
          return next
        })
      }, FRESH_HIGHLIGHT_MS)
    }
    const onSpike = (a) => {
      setAlerts((prev) => [a, ...prev].slice(0, 5))
    }
    socket.on('price:new', onNew)
    socket.on('price:spike', onSpike)
    return () => {
      socket.off('price:new', onNew)
      socket.off('price:spike', onSpike)
    }
  }, [])

  const products = useMemo(() => {
    if (!prices) return []
    const seen = new Map()
    for (const p of prices) {
      const id = p.productId?._id
      const name = p.productId?.name
      if (id && name && !seen.has(id)) seen.set(id, name)
    }
    return [...seen.entries()].map(([value, label]) => ({ value, label }))
  }, [prices])

  const filtered = useMemo(() => {
    if (!prices) return []
    const q = locationFilter.trim().toLowerCase()
    return prices.filter((p) => {
      if (productFilter !== 'all' && p.productId?._id !== productFilter) return false
      if (q) {
        const loc = `${p.area || ''} ${p.district || ''}`.toLowerCase()
        if (!loc.includes(q)) return false
      }
      return true
    })
  }, [prices, productFilter, locationFilter])

  const sorted = useMemo(() => {
    const arr = [...filtered]
    arr.sort((a, b) => {
      let av, bv
      switch (sortKey) {
        case 'product':
          av = a.productId?.name || ''
          bv = b.productId?.name || ''
          break
        case 'price':
          av = a.price
          bv = b.price
          break
        case 'location':
          av = `${a.area || ''} ${a.district || ''}`
          bv = `${b.area || ''} ${b.district || ''}`
          break
        case 'reporter':
          av = a.userId?.name || ''
          bv = b.userId?.name || ''
          break
        case 'createdAt':
        default:
          av = new Date(a.createdAt).getTime()
          bv = new Date(b.createdAt).getTime()
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return arr
  }, [filtered, sortKey, sortDir])

  const summary = useMemo(() => {
    const arr = filtered
    if (arr.length === 0) {
      return { count: 0, avg: null, hi: null, lo: null, products: 0 }
    }
    let sum = 0
    let hi = -Infinity
    let lo = Infinity
    let hiRow = null
    let loRow = null
    const productSet = new Set()
    for (const p of arr) {
      sum += p.price
      if (p.price > hi) {
        hi = p.price
        hiRow = p
      }
      if (p.price < lo) {
        lo = p.price
        loRow = p
      }
      if (p.productId?._id) productSet.add(p.productId._id)
    }
    return {
      count: arr.length,
      avg: sum / arr.length,
      hi,
      lo,
      hiRow,
      loRow,
      products: productSet.size,
    }
  }, [filtered])

  const barData = useMemo(() => {
    if (!filtered) return []
    const map = new Map()
    for (const p of filtered) {
      const name = p.productId?.name
      if (!name) continue
      if (!map.has(name)) map.set(name, { name, total: 0, count: 0 })
      const e = map.get(name)
      e.total += p.price
      e.count += 1
    }
    return [...map.values()]
      .map((e) => ({ name: e.name, avg: +(e.total / e.count).toFixed(2), reports: e.count }))
      .sort((a, b) => b.reports - a.reports)
      .slice(0, 8)
  }, [filtered])

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir(key === 'createdAt' || key === 'price' ? 'desc' : 'asc')
    }
  }

  function sortIcon(key) {
    if (sortKey !== key) return '↕'
    return sortDir === 'asc' ? '↑' : '↓'
  }

  if (prices === null) {
    return (
      <Center mih={360}>
        <Stack align="center" gap="sm">
          <Loader color="forest.7" />
          <Text c="dimmed">Loading live price feed…</Text>
        </Stack>
      </Center>
    )
  }

  return (
    <Stack gap="xl">
      <style>{`
        @keyframes flashFresh {
          0%   { background: #ecfccb; box-shadow: inset 4px 0 0 #65a30d; }
          70%  { background: #f7fde9; box-shadow: inset 4px 0 0 #bef264; }
          100% { background: transparent; box-shadow: inset 4px 0 0 transparent; }
        }
        .row-fresh { animation: flashFresh 6s ease-out forwards; }
        @keyframes pulseDot {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%      { transform: scale(1.6); opacity: 0.4; }
        }
        .live-dot { animation: pulseDot 1.4s ease-in-out infinite; }
      `}</style>

      <Group justify="space-between" align="end" wrap="wrap">
        <Stack gap={4}>
          <span className="section-eyebrow">Dashboard</span>
          <h1 className="display" style={{ margin: 0 }}>
            Live price feed
          </h1>
          <Group gap={8} mt={4}>
            <Box className="live-dot" w={10} h={10} style={{ borderRadius: 999, background: '#65a30d' }} />
            <Text size="sm" c="dimmed">Streaming new submissions in real time</Text>
          </Group>
        </Stack>
      </Group>

      {err && <Alert color="red" radius="lg">{err}</Alert>}

      {alerts.length > 0 && (
        <Alert
          color="yellow"
          radius="lg"
          title={
            <Group gap={6}>
              <Text fw={700}>Price spike alerts</Text>
              <Badge color="yellow" variant="light" radius="xl">{alerts.length}</Badge>
            </Group>
          }
        >
          <Stack gap={2}>
            {alerts.map((a, i) => (
              <Text key={i} size="sm">
                <b>{a.priceReport.productId?.name}</b>: {a.priceReport.price} (
                {a.direction === 'up' ? '+' : ''}
                {(a.change * 100).toFixed(0)}% vs 7-day avg {a.avg.toFixed(2)})
              </Text>
            ))}
          </Stack>
        </Alert>
      )}

      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="lg">
        <StatCard
          eyebrow="Avg price"
          value={summary.avg != null ? `৳${fmt(summary.avg)}` : '—'}
          sub={`${summary.products} product${summary.products === 1 ? '' : 's'}`}
          accent="#ecfccb"
          icon="💰"
        />
        <StatCard
          eyebrow="Highest"
          value={summary.hi != null ? `৳${summary.hi}` : '—'}
          sub={summary.hiRow?.productId?.name}
          accent="#fee2e2"
          icon="📈"
        />
        <StatCard
          eyebrow="Lowest"
          value={summary.lo != null ? `৳${summary.lo}` : '—'}
          sub={summary.loRow?.productId?.name}
          accent="#dcfce7"
          icon="📉"
        />
        <StatCard
          eyebrow="Submissions"
          value={summary.count.toLocaleString()}
          sub="In current view"
          accent="#bef26433"
          icon="📊"
        />
      </SimpleGrid>

      <Paper style={cardStyle}>
        <Group justify="space-between" align="end" mb="sm" wrap="wrap">
          <Stack gap={2}>
            <Text size="xs" fw={700} tt="uppercase" c="forest.7" style={{ letterSpacing: '0.1em' }}>
              Avg by product
            </Text>
            <Text fw={700} size="lg">Top {Math.min(barData.length, 8)}</Text>
          </Stack>
          <Text size="xs" c="dimmed">For a single-product trend over time, see <b>History</b>.</Text>
        </Group>
        {barData.length === 0 ? (
          <Center mih={240}><Text c="dimmed" size="sm">No data for this filter.</Text></Center>
        ) : (
          <div style={{ height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={barData} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7eee9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip cursor={{ fill: 'rgba(190,242,100,0.18)' }} />
                <Bar dataKey="avg" name="avg price" fill="#0b3d2e" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Paper>

      <Paper style={cardStyle}>
        <Group justify="space-between" align="end" wrap="wrap" mb="md">
          <Stack gap={2}>
            <Text size="xs" fw={700} tt="uppercase" c="forest.7" style={{ letterSpacing: '0.1em' }}>
              Submissions
            </Text>
            <Text fw={700} size="lg">
              Live feed{' '}
              <Text span c="dimmed" fw={500}>· {sorted.length} of {prices.length}</Text>
            </Text>
          </Stack>
          <Group gap="sm" wrap="wrap">
            <Select
              placeholder="All products"
              data={[{ value: 'all', label: 'All products' }, ...products]}
              value={productFilter}
              onChange={(v) => setProductFilter(v || 'all')}
              radius="xl"
              w={200}
              allowDeselect={false}
            />
            <TextInput
              placeholder="Filter by location…"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              radius="xl"
              w={220}
              rightSection={
                locationFilter ? (
                  <ActionIcon variant="subtle" onClick={() => setLocationFilter('')} aria-label="clear">×</ActionIcon>
                ) : null
              }
            />
          </Group>
        </Group>

        {sorted.length === 0 ? (
          <Center mih={220}>
            <Stack align="center" gap={6}>
              <Box style={{ fontSize: 44 }}>🛒</Box>
              <Text fw={600}>No submissions match.</Text>
              <Text c="dimmed" size="sm">
                {prices.length === 0
                  ? 'No reports have been submitted yet — check back soon.'
                  : 'Try clearing the product or location filter.'}
              </Text>
            </Stack>
          </Center>
        ) : (
          <Box style={{ overflowX: 'auto' }}>
            <Table striped highlightOnHover verticalSpacing="sm" style={{ minWidth: 720 }}>
              <Table.Thead>
                <Table.Tr style={{ background: '#f7fde9' }}>
                  <Table.Th style={{ cursor: 'pointer' }} onClick={() => toggleSort('product')}>
                    Product <Text span c="dimmed">{sortIcon('product')}</Text>
                  </Table.Th>
                  <Table.Th ta="right" style={{ cursor: 'pointer' }} onClick={() => toggleSort('price')}>
                    Price <Text span c="dimmed">{sortIcon('price')}</Text>
                  </Table.Th>
                  <Table.Th style={{ cursor: 'pointer' }} onClick={() => toggleSort('location')}>
                    Location <Text span c="dimmed">{sortIcon('location')}</Text>
                  </Table.Th>
                  <Table.Th style={{ cursor: 'pointer' }} onClick={() => toggleSort('reporter')}>
                    Reporter <Text span c="dimmed">{sortIcon('reporter')}</Text>
                  </Table.Th>
                  <Table.Th ta="right" style={{ cursor: 'pointer' }} onClick={() => toggleSort('createdAt')}>
                    When <Text span c="dimmed">{sortIcon('createdAt')}</Text>
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {sorted.map((p) => (
                  <Table.Tr
                    key={p._id}
                    className={freshIds.has(p._id) ? 'row-fresh' : ''}
                    style={{ transition: 'background 200ms ease' }}
                  >
                    <Table.Td>
                      <Group gap={6} wrap="nowrap">
                        {freshIds.has(p._id) && (
                          <Badge size="xs" variant="filled" color="lime" radius="xl" styles={{ root: { color: '#0b3d2e' } }}>
                            new
                          </Badge>
                        )}
                        <Text fw={600}>{p.productId?.name || '—'}</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text fw={700} c="forest.7">৳{p.price}</Text>
                      <Text span size="xs" c="dimmed"> /{p.unit}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">📍 {[p.area, p.district].filter(Boolean).join(', ') || '—'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4} wrap="nowrap">
                        <Text size="sm">{p.userId?.name || '—'}</Text>
                        <Badge size="xs" variant="light" color={p.source === 'vendor' ? 'lime' : 'forest'} radius="xl">
                          {p.source}
                        </Badge>
                      </Group>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text size="xs" c="dimmed">{timeAgo(new Date(p.createdAt).getTime())}</Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Box>
        )}
      </Paper>
    </Stack>
  )
}
