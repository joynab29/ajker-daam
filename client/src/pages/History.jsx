import { useEffect, useMemo, useState } from 'react'
import {
  Title,
  Select,
  Table,
  Text,
  Group,
  Paper,
  Badge,
  Stack,
  SegmentedControl,
  SimpleGrid,
  Box,
  Center,
  Loader,
} from '@mantine/core'
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts'
import { api } from '../api.js'

const cardStyle = {
  background: '#fff',
  border: '1px solid rgba(11,61,46,0.08)',
  borderRadius: 22,
  boxShadow: '0 12px 30px rgba(11,61,46,0.06)',
  padding: 22,
}
const cardAccent = (c) => ({ ...cardStyle, background: `linear-gradient(135deg, ${c} 0%, #ffffff 70%)` })

function StatCard({ eyebrow, value, sub, accent, icon, badge }) {
  return (
    <Paper style={cardAccent(accent)}>
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Stack gap={4}>
          <Text size="xs" fw={700} tt="uppercase" c="forest.7" style={{ letterSpacing: '0.1em' }}>
            {eyebrow}
          </Text>
          <Group gap={6} align="center">
            <Text fw={800} fz={26} c="forest.7" style={{ lineHeight: 1.1 }}>
              {value}
            </Text>
            {badge}
          </Group>
          {sub && <Text size="xs" c="dimmed">{sub}</Text>}
        </Stack>
        <Box
          style={{
            width: 42, height: 42, borderRadius: 999, background: '#bef264',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
            flex: '0 0 auto',
          }}
        >
          {icon}
        </Box>
      </Group>
    </Paper>
  )
}

const GRANULARITY = {
  daily:   { label: 'Daily',   maWindow: 7, maLabel: '7-day MA' },
  weekly:  { label: 'Weekly',  maWindow: 4, maLabel: '4-week MA' },
  monthly: { label: 'Monthly', maWindow: 3, maLabel: '3-month MA' },
}

const RANGE_OPTIONS = {
  daily:   [{ value: '7', label: '7 days' }, { value: '30', label: '30 days' }, { value: '90', label: '90 days' }],
  weekly:  [{ value: '30', label: '4 weeks' }, { value: '90', label: '12 weeks' }, { value: '180', label: '26 weeks' }],
  monthly: [{ value: '90', label: '3 months' }, { value: '180', label: '6 months' }, { value: '365', label: '12 months' }],
}

const DEFAULT_RANGE = { daily: '30', weekly: '90', monthly: '365' }

function isoWeekKey(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z')
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const dayNum = (target.getUTCDay() + 6) % 7
  target.setUTCDate(target.getUTCDate() - dayNum + 3)
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4))
  const week = 1 + Math.round((target - firstThursday) / 86400000 / 7)
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

function monthKey(dateStr) {
  return dateStr.slice(0, 7)
}

function rebucket(daily, granularity) {
  if (granularity === 'daily') return daily
  const buckets = new Map()
  for (const r of daily) {
    const key = granularity === 'weekly' ? isoWeekKey(r.date) : monthKey(r.date)
    if (!buckets.has(key)) buckets.set(key, { key, weighted: 0, total: 0, count: 0, min: Infinity, max: -Infinity })
    const b = buckets.get(key)
    b.weighted += r.avg * r.count
    b.total   += r.count
    b.count   += r.count
    if (r.min < b.min) b.min = r.min
    if (r.max > b.max) b.max = r.max
  }
  return [...buckets.values()]
    .map((b) => ({
      date: b.key,
      avg: b.total > 0 ? +(b.weighted / b.total).toFixed(2) : 0,
      min: b.min === Infinity ? null : b.min,
      max: b.max === -Infinity ? null : b.max,
      count: b.count,
    }))
    .sort((a, b) => (a.date < b.date ? -1 : 1))
}

function withMovingAverage(rows, window) {
  return rows.map((r, i) => {
    const start = Math.max(0, i - window + 1)
    const slice = rows.slice(start, i + 1)
    const ma = slice.reduce((s, x) => s + x.avg, 0) / slice.length
    return { ...r, ma: +ma.toFixed(2) }
  })
}

function pct(a, b) {
  if (!a || a <= 0) return null
  return ((b - a) / a) * 100
}

export default function History() {
  const [products, setProducts] = useState([])
  const [productId, setProductId] = useState('')
  const [history, setHistory] = useState(null)
  const [listingSummary, setListingSummary] = useState({ count: 0 })
  const [granularity, setGranularity] = useState('daily')
  const [days, setDays] = useState('30')

  useEffect(() => {
    api('/products').then((d) => {
      setProducts(d.products)
      if (d.products[0]) setProductId(d.products[0]._id)
    })
  }, [])

  useEffect(() => {
    setDays((prev) => {
      const valid = RANGE_OPTIONS[granularity].some((o) => o.value === prev)
      return valid ? prev : DEFAULT_RANGE[granularity]
    })
  }, [granularity])

  useEffect(() => {
    if (!productId) return
    setHistory(null)
    api(`/prices/history?productId=${productId}&days=${days}`).then((d) => {
      setHistory(d.history)
      setListingSummary(d.listing_summary || { count: 0 })
    })
  }, [productId, days])

  const productName = useMemo(
    () => products.find((p) => p._id === productId)?.name || '',
    [products, productId],
  )

  const bucketed = useMemo(() => {
    if (!history) return []
    return rebucket(history, granularity)
  }, [history, granularity])

  const series = useMemo(() => withMovingAverage(bucketed, GRANULARITY[granularity].maWindow), [bucketed, granularity])

  const reportsAvg = useMemo(() => {
    if (series.length === 0) return null
    const total = series.reduce((s, r) => s + r.avg * r.count, 0)
    const n = series.reduce((s, r) => s + r.count, 0)
    return n > 0 ? total / n : null
  }, [series])

  const markupPct = listingSummary.count > 0 && reportsAvg ? pct(reportsAvg, listingSummary.avg) : null

  const overallChange = series.length >= 2 ? pct(series[0].avg, series[series.length - 1].avg) : null
  const trendDir = overallChange == null ? 'flat' : overallChange > 1 ? 'up' : overallChange < -1 ? 'down' : 'flat'

  const biggestSwing = useMemo(() => {
    if (series.length < 2) return null
    let best = null
    for (let i = 1; i < series.length; i++) {
      const change = pct(series[i - 1].avg, series[i].avg)
      if (change == null) continue
      if (!best || Math.abs(change) > Math.abs(best.change)) {
        best = { from: series[i - 1].date, to: series[i].date, change, fromPrice: series[i - 1].avg, toPrice: series[i].avg }
      }
    }
    return best
  }, [series])

  const peak = useMemo(() => series.reduce((acc, r) => (!acc || r.avg > acc.avg ? r : acc), null), [series])
  const trough = useMemo(() => series.reduce((acc, r) => (!acc || r.avg < acc.avg ? r : acc), null), [series])

  const trendBadge = trendDir === 'up'
    ? { color: 'red', icon: '▲', text: `+${overallChange?.toFixed(1)}%` }
    : trendDir === 'down'
      ? { color: 'lime', icon: '▼', text: `${overallChange?.toFixed(1)}%`, swatch: '#0b3d2e' }
      : { color: 'gray', icon: '—', text: 'flat' }

  return (
    <Stack gap="xl">
      <Stack gap={4}>
        <span className="section-eyebrow">History</span>
        <h1 className="display" style={{ margin: 0 }}>
          Price trend for <span style={{ color: '#65a30d' }}>{productName || 'this product'}</span>
        </h1>
        <Text c="dimmed" maw={680}>
          Daily, weekly, or monthly view with a trailing moving average and rising/falling indicators.
        </Text>
      </Stack>

      <Paper style={cardStyle}>
        <Group gap="sm" wrap="wrap" align="end">
          <Select
            label="Product"
            value={productId}
            onChange={(v) => setProductId(v || '')}
            data={products.map((p) => ({ value: p._id, label: p.name }))}
            allowDeselect={false}
            radius="xl"
            searchable
            w={240}
          />
          <Stack gap={6}>
            <Text size="xs" fw={600} c="dimmed">View</Text>
            <SegmentedControl
              value={granularity}
              onChange={setGranularity}
              data={Object.entries(GRANULARITY).map(([v, g]) => ({ value: v, label: g.label }))}
              radius="xl"
              color="forest"
            />
          </Stack>
          <Select
            label="Range"
            value={days}
            onChange={(v) => setDays(v || DEFAULT_RANGE[granularity])}
            data={RANGE_OPTIONS[granularity]}
            allowDeselect={false}
            radius="xl"
            w={170}
          />
        </Group>
      </Paper>

      {history === null ? (
        <Center mih={260}>
          <Stack align="center" gap="sm">
            <Loader color="forest.7" />
            <Text c="dimmed">Loading price trend…</Text>
          </Stack>
        </Center>
      ) : series.length === 0 ? (
        <Paper style={cardStyle}>
          <Center mih={220}>
            <Stack align="center" gap={6}>
              <Box style={{ fontSize: 44 }}>📉</Box>
              <Text fw={600}>No history yet.</Text>
              <Text c="dimmed" size="sm">Submit a few prices for this product to see the trend.</Text>
            </Stack>
          </Center>
        </Paper>
      ) : (
        <>
          <SimpleGrid cols={{ base: 2, md: 4 }} spacing="lg">
            <StatCard
              eyebrow="Trend"
              value={overallChange != null ? (overallChange > 0 ? `+${overallChange.toFixed(1)}%` : `${overallChange.toFixed(1)}%`) : '—'}
              sub={
                series.length >= 2
                  ? `${series[0].date} → ${series[series.length - 1].date}`
                  : 'Not enough data'
              }
              accent={trendDir === 'up' ? '#fee2e2' : trendDir === 'down' ? '#dcfce7' : '#f3f4f6'}
              icon={trendDir === 'up' ? '📈' : trendDir === 'down' ? '📉' : '➖'}
              badge={
                <Badge
                  color={trendBadge.color}
                  variant="filled"
                  radius="xl"
                  styles={trendDir === 'down' ? { root: { color: '#0b3d2e' } } : undefined}
                >
                  {trendBadge.icon} {trendDir === 'up' ? 'rising' : trendDir === 'down' ? 'falling' : 'flat'}
                </Badge>
              }
            />
            <StatCard
              eyebrow={`Avg (${GRANULARITY[granularity].label.toLowerCase()})`}
              value={reportsAvg != null ? `৳${reportsAvg.toFixed(2)}` : '—'}
              sub={`${series.length} ${granularity === 'daily' ? 'days' : granularity === 'weekly' ? 'weeks' : 'months'} · ${series.reduce((s, r) => s + r.count, 0)} reports`}
              accent="#ecfccb"
              icon="📊"
            />
            <StatCard
              eyebrow="Peak"
              value={peak ? `৳${peak.avg.toFixed(2)}` : '—'}
              sub={peak ? peak.date : ''}
              accent="#fee2e2"
              icon="⬆"
            />
            <StatCard
              eyebrow="Trough"
              value={trough ? `৳${trough.avg.toFixed(2)}` : '—'}
              sub={trough ? trough.date : ''}
              accent="#dcfce7"
              icon="⬇"
            />
          </SimpleGrid>

          {(biggestSwing || markupPct != null) && (
            <Paper style={cardStyle}>
              <Group gap="lg" wrap="wrap">
                {biggestSwing && (
                  <Stack gap={4}>
                    <Text size="xs" fw={700} tt="uppercase" c="forest.7" style={{ letterSpacing: '0.1em' }}>
                      Biggest swing
                    </Text>
                    <Group gap={6} align="center">
                      <Text fw={700}>
                        ৳{biggestSwing.fromPrice.toFixed(2)} → ৳{biggestSwing.toPrice.toFixed(2)}
                      </Text>
                      <Badge
                        color={biggestSwing.change > 0 ? 'red' : 'lime'}
                        variant="filled"
                        radius="xl"
                        styles={biggestSwing.change < 0 ? { root: { color: '#0b3d2e' } } : undefined}
                      >
                        {biggestSwing.change > 0 ? '▲ +' : '▼ '}{biggestSwing.change.toFixed(1)}%
                      </Badge>
                    </Group>
                    <Text size="xs" c="dimmed">{biggestSwing.from} → {biggestSwing.to}</Text>
                  </Stack>
                )}
                {listingSummary.count > 0 && (
                  <Stack gap={4}>
                    <Text size="xs" fw={700} tt="uppercase" c="forest.7" style={{ letterSpacing: '0.1em' }}>
                      Vendor asking avg ({listingSummary.count})
                    </Text>
                    <Text fw={700}>৳{listingSummary.avg.toFixed(2)}</Text>
                    {markupPct != null && (
                      <Badge
                        variant="filled"
                        color={markupPct > 5 ? 'red' : markupPct < -5 ? 'lime' : 'gray'}
                        radius="xl"
                        styles={markupPct < -5 ? { root: { color: '#0b3d2e' } } : undefined}
                      >
                        markup {markupPct > 0 ? '+' : ''}{markupPct.toFixed(0)}%
                      </Badge>
                    )}
                  </Stack>
                )}
              </Group>
            </Paper>
          )}

          <Paper style={cardStyle}>
            <Group justify="space-between" align="end" mb="sm" wrap="wrap">
              <Stack gap={2}>
                <Text size="xs" fw={700} tt="uppercase" c="forest.7" style={{ letterSpacing: '0.1em' }}>
                  Trend chart
                </Text>
                <Text fw={700} size="lg">
                  {GRANULARITY[granularity].label} avg with {GRANULARITY[granularity].maLabel}
                </Text>
              </Stack>
              <Group gap="md" visibleFrom="sm">
                <Group gap={6}><Box w={14} h={3} style={{ background: '#0b3d2e', borderRadius: 2 }} /><Text size="xs" c="dimmed">avg</Text></Group>
                <Group gap={6}><Box w={14} h={3} style={{ background: '#a3e635', borderRadius: 2 }} /><Text size="xs" c="dimmed">{GRANULARITY[granularity].maLabel}</Text></Group>
                <Group gap={6}><Box w={14} h={3} style={{ background: 'rgba(190,242,100,0.55)', borderRadius: 2 }} /><Text size="xs" c="dimmed">min/max band</Text></Group>
              </Group>
            </Group>
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer>
                <ComposedChart data={series} margin={{ top: 10, right: 24, bottom: 0, left: -8 }}>
                  <defs>
                    <linearGradient id="bandFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#bef264" stopOpacity={0.55} />
                      <stop offset="100%" stopColor="#bef264" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7eee9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(v, name) => [`৳${Number(v).toFixed(2)}`, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area
                    type="monotone"
                    dataKey="max"
                    stroke="none"
                    fill="url(#bandFill)"
                    name="max"
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="min"
                    stroke="none"
                    fill="#fbfdf6"
                    name="min"
                    isAnimationActive={false}
                  />
                  <Line type="monotone" dataKey="avg" stroke="#0b3d2e" strokeWidth={2.5} dot={{ r: 3, fill: '#65a30d' }} name="avg" />
                  <Line type="monotone" dataKey="ma"  stroke="#a3e635" strokeWidth={2} strokeDasharray="6 4" dot={false} name={GRANULARITY[granularity].maLabel} />
                  {listingSummary.count > 0 && (
                    <ReferenceLine
                      y={listingSummary.avg}
                      stroke="#dc2626"
                      strokeDasharray="4 4"
                      label={{ value: `vendor avg ৳${listingSummary.avg.toFixed(2)}`, fill: '#dc2626', fontSize: 11, position: 'right' }}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Paper>

          <Paper style={cardStyle}>
            <Text size="xs" fw={700} tt="uppercase" c="forest.7" style={{ letterSpacing: '0.1em' }} mb="sm">
              Period detail
            </Text>
            <Box style={{ overflowX: 'auto' }}>
              <Table striped highlightOnHover verticalSpacing="sm" style={{ minWidth: 640 }}>
                <Table.Thead>
                  <Table.Tr style={{ background: '#f7fde9' }}>
                    <Table.Th>Period</Table.Th>
                    <Table.Th ta="right">Avg</Table.Th>
                    <Table.Th ta="right">Min / Max</Table.Th>
                    <Table.Th ta="right">{GRANULARITY[granularity].maLabel}</Table.Th>
                    <Table.Th ta="right">Reports</Table.Th>
                    <Table.Th ta="right">Δ vs prev</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {series.map((r, i) => {
                    const prev = i > 0 ? series[i - 1] : null
                    const change = prev ? pct(prev.avg, r.avg) : null
                    return (
                      <Table.Tr key={r.date}>
                        <Table.Td>{r.date}</Table.Td>
                        <Table.Td ta="right"><Text fw={700} c="forest.7">৳{r.avg.toFixed(2)}</Text></Table.Td>
                        <Table.Td ta="right">
                          {r.min != null ? `৳${r.min} / ৳${r.max}` : '—'}
                        </Table.Td>
                        <Table.Td ta="right">৳{r.ma.toFixed(2)}</Table.Td>
                        <Table.Td ta="right">{r.count}</Table.Td>
                        <Table.Td ta="right">
                          {change == null ? (
                            <Text c="dimmed" size="sm">—</Text>
                          ) : (
                            <Badge
                              radius="xl"
                              variant="filled"
                              color={change > 1 ? 'red' : change < -1 ? 'lime' : 'gray'}
                              styles={change < -1 ? { root: { color: '#0b3d2e' } } : undefined}
                            >
                              {change > 0 ? '▲ +' : change < 0 ? '▼ ' : '• '}{change.toFixed(1)}%
                            </Badge>
                          )}
                        </Table.Td>
                      </Table.Tr>
                    )
                  })}
                </Table.Tbody>
              </Table>
            </Box>
          </Paper>
        </>
      )}
    </Stack>
  )
}
