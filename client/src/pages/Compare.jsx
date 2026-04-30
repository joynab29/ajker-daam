import { useEffect, useMemo, useState } from 'react'
import {
  Title,
  Text,
  Stack,
  Group,
  SimpleGrid,
  Paper,
  Select,
  TextInput,
  Table,
  Badge,
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
  ReferenceLine,
  Cell,
} from 'recharts'
import { api } from '../api.js'

const cardStyle = {
  background: '#fff',
  border: '1px solid rgba(11,61,46,0.08)',
  borderRadius: 22,
  boxShadow: '0 12px 30px rgba(11,61,46,0.06)',
  padding: 22,
}

const cardAccent = (color) => ({ ...cardStyle, background: `linear-gradient(135deg, ${color} 0%, #ffffff 70%)` })

function StatCard({ eyebrow, value, sub, accent, icon }) {
  return (
    <Paper style={cardAccent(accent)}>
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Stack gap={4}>
          <Text size="xs" fw={700} tt="uppercase" c="forest.7" style={{ letterSpacing: '0.1em' }}>
            {eyebrow}
          </Text>
          <Text fw={800} fz={26} c="forest.7" style={{ lineHeight: 1.1 }}>
            {value}
          </Text>
          {sub && <Text size="xs" c="dimmed">{sub}</Text>}
        </Stack>
        <Box
          style={{
            width: 42,
            height: 42,
            borderRadius: 999,
            background: '#bef264',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            flex: '0 0 auto',
          }}
        >
          {icon}
        </Box>
      </Group>
    </Paper>
  )
}

function confidence(count) {
  if (!count) return { label: 'No data', color: 'gray' }
  if (count >= 10) return { label: 'High', color: 'forest' }
  if (count >= 3)  return { label: 'Medium', color: 'lime' }
  return { label: 'Low', color: 'yellow' }
}

function fmt(n) {
  if (n == null || Number.isNaN(n)) return '—'
  return Number(n).toFixed(2)
}

function priceColor(avg, lo, hi) {
  if (avg == null) return '#9ca3af'
  if (avg <= lo) return '#65a30d'
  if (avg >= hi) return '#b91c1c'
  return '#eab308'
}

function effectivePrice(r) {
  const rA = r.report_avg, rN = r.report_count || 0
  const lA = r.listing_avg, lN = r.listing_count || 0
  if (rN > 0 && lN > 0 && rA != null && lA != null) {
    return (rA * rN + lA * lN) / (rN + lN)
  }
  if (rN > 0 && rA != null) return rA
  if (lN > 0 && lA != null) return lA
  return null
}

function sourceLabel(r) {
  const rN = r.report_count || 0
  const lN = r.listing_count || 0
  if (rN > 0 && lN > 0) return { label: 'reports + listings', icon: '📊🏪' }
  if (rN > 0) return { label: 'reports only', icon: '📊' }
  if (lN > 0) return { label: 'listings only', icon: '🏪' }
  return { label: 'no data', icon: '—' }
}

export default function Compare() {
  const [products, setProducts] = useState([])
  const [productId, setProductId] = useState('')
  const [rows, setRows] = useState(null)
  const [district, setDistrict] = useState('all')
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState('report_avg')
  const [sortDir, setSortDir] = useState('asc')

  useEffect(() => {
    api('/products').then((d) => {
      setProducts(d.products)
      if (d.products[0]) setProductId(d.products[0]._id)
    })
  }, [])

  useEffect(() => {
    if (!productId) return
    setRows(null)
    api(`/prices/by-area?productId=${productId}`).then((d) => setRows(d.rows))
  }, [productId])

  const productName = useMemo(
    () => products.find((p) => p._id === productId)?.name || '',
    [products, productId],
  )
  const productUnit = useMemo(
    () => products.find((p) => p._id === productId)?.unit || '',
    [products, productId],
  )

  const districts = useMemo(() => {
    if (!rows) return []
    const seen = new Set()
    for (const r of rows) {
      if (r.district) seen.add(r.district)
    }
    return [...seen].sort()
  }, [rows])

  const filtered = useMemo(() => {
    if (!rows) return []
    const q = query.trim().toLowerCase()
    return rows.filter((r) => {
      if (district !== 'all' && r.district !== district) return false
      if (q) {
        const blob = `${r.area || ''} ${r.district || ''}`.toLowerCase()
        if (!blob.includes(q)) return false
      }
      return true
    })
  }, [rows, district, query])

  // Effective price per row blends community reports and vendor listings (count-weighted).
  // Falls back to whichever side has data — so listing-only rows still rank.
  const enriched = useMemo(
    () => filtered.map((r) => ({ ...r, _effective: effectivePrice(r) })),
    [filtered],
  )

  const effectiveAvgs = enriched.map((r) => r._effective).filter((x) => x != null && !Number.isNaN(x))
  const globalAvg = effectiveAvgs.length ? effectiveAvgs.reduce((s, x) => s + x, 0) / effectiveAvgs.length : null
  const sortedAvgs = [...effectiveAvgs].sort((a, b) => a - b)
  const lo = sortedAvgs.length ? sortedAvgs[Math.floor(sortedAvgs.length / 3)] : null
  const hi = sortedAvgs.length ? sortedAvgs[Math.floor((2 * sortedAvgs.length) / 3)] : null

  const minRow = enriched.reduce((acc, r) => {
    if (r._effective == null) return acc
    if (!acc || r._effective < acc._effective) return r
    return acc
  }, null)
  const maxRow = enriched.reduce((acc, r) => {
    if (r._effective == null) return acc
    if (!acc || r._effective > acc._effective) return r
    return acc
  }, null)

  const sorted = useMemo(() => {
    const arr = [...enriched]
    arr.sort((a, b) => {
      let av = a[sortKey]
      let bv = b[sortKey]
      if (sortKey === '_effective') {
        av = a._effective; bv = b._effective
      }
      if (sortKey === 'area' || sortKey === 'district') {
        av = av || ''
        bv = bv || ''
      } else {
        av = av == null ? -Infinity : av
        bv = bv == null ? -Infinity : bv
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return arr
  }, [enriched, sortKey, sortDir])

  const barData = useMemo(() => {
    return enriched
      .filter((r) => r._effective != null)
      .map((r) => {
        const src = sourceLabel(r)
        return {
          label: r.area || r.district || '—',
          full: [r.area, r.district].filter(Boolean).join(', ') || '—',
          avg: +r._effective.toFixed(2),
          report_avg: r.report_avg,
          listing_avg: r.listing_avg,
          report_count: r.report_count || 0,
          listing_count: r.listing_count || 0,
          source: src.label,
        }
      })
      .sort((a, b) => a.avg - b.avg)
  }, [enriched])

  function toggleSort(key) {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir(key === 'area' || key === 'district' ? 'asc' : 'desc') }
  }
  function sortIcon(key) {
    if (sortKey !== key) return '↕'
    return sortDir === 'asc' ? '↑' : '↓'
  }

  return (
    <Stack gap="xl">
      <style>{`
        .row-min { background: #ecfccb !important; box-shadow: inset 4px 0 0 #65a30d; }
        .row-max { background: #fee2e2 !important; box-shadow: inset 4px 0 0 #b91c1c; }
        .compare-row { transition: background 160ms ease, transform 160ms ease; }
        .compare-row:hover { background: #f7fde9 !important; }
      `}</style>

      <Stack gap={4}>
        <span className="section-eyebrow">Compare</span>
        <h1 className="display" style={{ margin: 0 }}>
          Where is <span style={{ color: '#65a30d' }}>{productName || 'this product'}</span> cheapest?
        </h1>
        <Text c="dimmed" maw={680}>
          Side-by-side averages across areas. Community-reported prices are ground truth; vendor listings are the asking side. Markup % shows how listings compare to reports.
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
          <Select
            label="District"
            value={district}
            onChange={(v) => setDistrict(v || 'all')}
            data={[{ value: 'all', label: 'All districts' }, ...districts.map((d) => ({ value: d, label: d }))]}
            allowDeselect={false}
            radius="xl"
            w={200}
            disabled={!rows || districts.length === 0}
          />
          <TextInput
            label="Search area"
            placeholder="e.g. Mirpur"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            radius="xl"
            w={220}
          />
          <Box style={{ flex: 1 }} />
          <Stack gap={2} ta="right">
            <Text size="xs" c="dimmed">Areas in view</Text>
            <Text fw={700} c="forest.7">{filtered.length}</Text>
          </Stack>
        </Group>
      </Paper>

      {rows === null ? (
        <Center mih={260}>
          <Stack align="center" gap="sm">
            <Loader color="forest.7" />
            <Text c="dimmed">Crunching area-by-area comparisons…</Text>
          </Stack>
        </Center>
      ) : filtered.length === 0 ? (
        <Paper style={cardStyle}>
          <Center mih={220}>
            <Stack align="center" gap={6}>
              <Box style={{ fontSize: 44 }}>🌾</Box>
              <Text fw={600}>No matching areas.</Text>
              <Text c="dimmed" size="sm">
                {rows.length === 0
                  ? 'No price reports or listings exist for this product yet.'
                  : 'Try clearing the district filter or search.'}
              </Text>
            </Stack>
          </Center>
        </Paper>
      ) : (
        <>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="lg">
            <StatCard
              eyebrow="Cheapest area"
              value={minRow ? `৳${fmt(minRow._effective)}` : '—'}
              sub={minRow ? `${[minRow.area, minRow.district].filter(Boolean).join(', ')} · ${sourceLabel(minRow).label}` : 'No data'}
              accent="#dcfce7"
              icon="🟢"
            />
            <StatCard
              eyebrow="Most expensive"
              value={maxRow ? `৳${fmt(maxRow._effective)}` : '—'}
              sub={maxRow ? `${[maxRow.area, maxRow.district].filter(Boolean).join(', ')} · ${sourceLabel(maxRow).label}` : 'No data'}
              accent="#fee2e2"
              icon="🔴"
            />
            <StatCard
              eyebrow="Avg across areas"
              value={globalAvg != null ? `৳${fmt(globalAvg)}` : '—'}
              sub={`${effectiveAvgs.length} area${effectiveAvgs.length === 1 ? '' : 's'} with data`}
              accent="#ecfccb"
              icon="📊"
            />
            <StatCard
              eyebrow="Spread"
              value={
                minRow && maxRow && minRow !== maxRow
                  ? `৳${fmt(maxRow._effective - minRow._effective)}`
                  : '—'
              }
              sub={
                minRow && maxRow && minRow._effective > 0
                  ? `${(((maxRow._effective - minRow._effective) / minRow._effective) * 100).toFixed(0)}% gap`
                  : ''
              }
              accent="#bef26433"
              icon="↔"
            />
          </SimpleGrid>

          {minRow && maxRow && minRow !== maxRow && (
            <Paper style={{ ...cardStyle, background: 'linear-gradient(135deg, #ecfccb 0%, #ffffff 70%)' }}>
              <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
                <Group gap="md" wrap="nowrap" align="flex-start">
                  <Box style={{ width: 48, height: 48, borderRadius: 999, background: '#bef264', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flex: '0 0 auto' }}>💡</Box>
                  <Stack gap={4}>
                    <Text size="xs" tt="uppercase" fw={700} c="forest.7" style={{ letterSpacing: '0.1em' }}>Recommendation</Text>
                    <Text fw={800} fz={20} c="forest.7" style={{ lineHeight: 1.2 }}>
                      Buy {productName || 'this product'} at <span style={{ color: '#65a30d' }}>{[minRow.area, minRow.district].filter(Boolean).join(', ')}</span> · ৳{fmt(minRow._effective)}{productUnit && ` /${productUnit}`}
                    </Text>
                    <Text size="sm" c="dimmed">
                      Save ৳{fmt(maxRow._effective - minRow._effective)} per {productUnit || 'unit'} ({(((maxRow._effective - minRow._effective) / minRow._effective) * 100).toFixed(0)}%) versus the most expensive area {[maxRow.area, maxRow.district].filter(Boolean).join(', ')} (৳{fmt(maxRow._effective)}).
                    </Text>
                    <Group gap={6} mt={4} wrap="wrap">
                      <Badge color="forest" radius="xl" variant="light">{sourceLabel(minRow).icon} {sourceLabel(minRow).label}</Badge>
                      {minRow.report_count > 0 && <Badge color="forest" radius="xl" variant="light">{minRow.report_count} community report{minRow.report_count === 1 ? '' : 's'}</Badge>}
                      {minRow.listing_count > 0 && <Badge color="lime" radius="xl" variant="filled" styles={{ root: { color: '#0b3d2e' } }}>{minRow.listing_count} vendor listing{minRow.listing_count === 1 ? '' : 's'}</Badge>}
                    </Group>
                  </Stack>
                </Group>
              </Group>
            </Paper>
          )}

          <Paper style={cardStyle}>
            <Group justify="space-between" align="end" mb="sm" wrap="wrap">
              <Stack gap={2}>
                <Text size="xs" fw={700} tt="uppercase" c="forest.7" style={{ letterSpacing: '0.1em' }}>
                  By area
                </Text>
                <Text fw={700} size="lg">Effective price · reports + listings · low → high</Text>
              </Stack>
              <Group gap="md" visibleFrom="sm">
                <Group gap={6}><Box w={10} h={10} style={{ background: '#65a30d', borderRadius: 999 }} /><Text size="xs" c="dimmed">Cheapest tertile</Text></Group>
                <Group gap={6}><Box w={10} h={10} style={{ background: '#eab308', borderRadius: 999 }} /><Text size="xs" c="dimmed">Mid</Text></Group>
                <Group gap={6}><Box w={10} h={10} style={{ background: '#b91c1c', borderRadius: 999 }} /><Text size="xs" c="dimmed">Expensive tertile</Text></Group>
              </Group>
            </Group>
            {barData.length === 0 ? (
              <Center mih={220}><Text c="dimmed" size="sm">No reports to chart in current filter.</Text></Center>
            ) : (
              <div style={{ height: Math.max(220, Math.min(barData.length * 40 + 60, 520)) }}>
                <ResponsiveContainer>
                  <BarChart data={barData} layout="vertical" margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e7eee9" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip
                      cursor={{ fill: 'rgba(190,242,100,0.18)' }}
                      formatter={(v, _n, item) => {
                        const d = item.payload
                        const parts = [`avg ৳${v}`]
                        if (d.report_count) parts.push(`${d.report_count} reports`)
                        if (d.listing_count) parts.push(`${d.listing_count} listings`)
                        return [parts.join(' · '), d.full]
                      }}
                    />
                    {globalAvg != null && (
                      <ReferenceLine
                        x={globalAvg}
                        stroke="#0b3d2e"
                        strokeDasharray="4 4"
                        label={{ value: `avg ৳${globalAvg.toFixed(2)}`, fill: '#0b3d2e', fontSize: 11, position: 'top' }}
                      />
                    )}
                    <Bar dataKey="avg" radius={[0, 10, 10, 0]}>
                      {barData.map((d, i) => (
                        <Cell key={i} fill={priceColor(d.avg, lo, hi)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Paper>

          <Paper style={cardStyle}>
            <Group justify="space-between" align="end" mb="md" wrap="wrap">
              <Stack gap={2}>
                <Text size="xs" fw={700} tt="uppercase" c="forest.7" style={{ letterSpacing: '0.1em' }}>
                  Detail
                </Text>
                <Text fw={700} size="lg">All areas</Text>
              </Stack>
              <Text size="xs" c="dimmed">Click a column header to sort</Text>
            </Group>

            <Box style={{ overflowX: 'auto' }}>
              <Table verticalSpacing="sm" highlightOnHover style={{ minWidth: 820 }}>
                <Table.Thead>
                  <Table.Tr style={{ background: '#f7fde9' }}>
                    <Table.Th style={{ cursor: 'pointer' }} onClick={() => toggleSort('area')}>
                      Area <Text span c="dimmed">{sortIcon('area')}</Text>
                    </Table.Th>
                    <Table.Th style={{ cursor: 'pointer' }} onClick={() => toggleSort('district')}>
                      District <Text span c="dimmed">{sortIcon('district')}</Text>
                    </Table.Th>
                    <Table.Th ta="right" style={{ cursor: 'pointer' }} onClick={() => toggleSort('_effective')}>
                      Effective <Text span c="dimmed">{sortIcon('_effective')}</Text>
                    </Table.Th>
                    <Table.Th ta="right" style={{ cursor: 'pointer' }} onClick={() => toggleSort('report_avg')}>
                      Reports avg <Text span c="dimmed">{sortIcon('report_avg')}</Text>
                    </Table.Th>
                    <Table.Th ta="right" style={{ cursor: 'pointer' }} onClick={() => toggleSort('listing_avg')}>
                      Vendor avg <Text span c="dimmed">{sortIcon('listing_avg')}</Text>
                    </Table.Th>
                    <Table.Th ta="center">Source</Table.Th>
                    <Table.Th ta="center" style={{ cursor: 'pointer' }} onClick={() => toggleSort('report_count')}>
                      Confidence <Text span c="dimmed">{sortIcon('report_count')}</Text>
                    </Table.Th>
                    <Table.Th ta="right" style={{ cursor: 'pointer' }} onClick={() => toggleSort('markup_pct')}>
                      Markup <Text span c="dimmed">{sortIcon('markup_pct')}</Text>
                    </Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {sorted.map((r, i) => {
                    const conf = confidence(r.report_count)
                    const isMin = minRow && r === minRow
                    const isMax = maxRow && r === maxRow
                    const m = r.markup_pct
                    const src = sourceLabel(r)
                    return (
                      <Table.Tr
                        key={i}
                        className={`compare-row ${isMin ? 'row-min' : ''} ${isMax ? 'row-max' : ''}`}
                      >
                        <Table.Td>
                          <Group gap={6} wrap="nowrap">
                            {isMin && <Badge color="lime" radius="xl" size="xs" styles={{ root: { color: '#0b3d2e' } }}>cheapest</Badge>}
                            {isMax && <Badge color="red" radius="xl" size="xs">priciest</Badge>}
                            <Text fw={600}>{r.area || '—'}</Text>
                          </Group>
                        </Table.Td>
                        <Table.Td>{r.district || '—'}</Table.Td>
                        <Table.Td ta="right">
                          {r._effective != null ? (
                            <>
                              <Text fw={800} c="forest.7">৳{fmt(r._effective)}</Text>
                              {productUnit && <Text span size="xs" c="dimmed"> /{productUnit}</Text>}
                            </>
                          ) : (
                            <Text size="sm" c="dimmed">—</Text>
                          )}
                        </Table.Td>
                        <Table.Td ta="right">
                          {r.report_avg != null ? (
                            <Text size="sm">৳{fmt(r.report_avg)} · {r.report_count}</Text>
                          ) : (
                            <Text size="sm" c="dimmed">—</Text>
                          )}
                        </Table.Td>
                        <Table.Td ta="right">
                          {r.listing_avg != null ? (
                            <Text size="sm">৳{fmt(r.listing_avg)} · {r.listing_count}</Text>
                          ) : (
                            <Text size="sm" c="dimmed">—</Text>
                          )}
                        </Table.Td>
                        <Table.Td ta="center">
                          <Badge variant="light" color="forest" radius="xl">
                            {src.icon} {src.label}
                          </Badge>
                        </Table.Td>
                        <Table.Td ta="center">
                          <Badge
                            color={conf.color}
                            variant={conf.color === 'lime' ? 'filled' : 'light'}
                            radius="xl"
                            styles={conf.color === 'lime' ? { root: { color: '#0b3d2e' } } : undefined}
                          >
                            {conf.label}{r.report_count ? ` · ${r.report_count}` : ''}
                          </Badge>
                        </Table.Td>
                        <Table.Td ta="right">
                          {m == null ? (
                            <Text size="sm" c="dimmed">—</Text>
                          ) : (
                            <Badge
                              radius="xl"
                              variant="filled"
                              color={m > 5 ? 'red' : m < -5 ? 'lime' : 'gray'}
                              styles={m < -5 ? { root: { color: '#0b3d2e' } } : undefined}
                            >
                              {m > 0 ? '▲' : m < 0 ? '▼' : '•'} {m > 0 ? '+' : ''}{m.toFixed(0)}%
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
