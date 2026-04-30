import { useEffect, useMemo, useState } from 'react'
import {
  Title,
  Text,
  Stack,
  Group,
  Paper,
  Badge,
  Button,
  Tabs,
  SimpleGrid,
  Box,
  Center,
  Loader,
  TextInput,
  Select,
  ActionIcon,
} from '@mantine/core'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts'
import { api } from '../api.js'
import { useAuth } from '../AuthContext.jsx'

const cardStyle = {
  background: '#fff',
  border: '1px solid rgba(11,61,46,0.08)',
  borderRadius: 22,
  boxShadow: '0 12px 30px rgba(11,61,46,0.06)',
  padding: 22,
}
const cardAccent = (c) => ({ ...cardStyle, background: `linear-gradient(135deg, ${c} 0%, #ffffff 70%)` })

const SEVERITY = {
  high:   { label: 'High',   color: 'red',    accent: '#fee2e2', threshold: 50 },
  medium: { label: 'Medium', color: 'orange', accent: '#ffedd5', threshold: 25 },
  low:    { label: 'Low',    color: 'yellow', accent: '#fef9c3', threshold: 0 },
}

function severityFor(absPct) {
  if (absPct >= SEVERITY.high.threshold) return 'high'
  if (absPct >= SEVERITY.medium.threshold) return 'medium'
  return 'low'
}

function parseDeviation(reason) {
  if (!reason) return null
  const m = reason.match(/[-+]?\d+(\.\d+)?%/)
  if (!m) return null
  const n = parseFloat(m[0])
  if (Number.isNaN(n)) return null
  return n
}

function fmt(n) {
  if (n == null || Number.isNaN(n)) return '—'
  return Number(n).toFixed(2)
}

function StatCard({ eyebrow, value, sub, accent, icon }) {
  return (
    <Paper style={cardAccent(accent)}>
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Stack gap={4}>
          <Text size="xs" fw={700} tt="uppercase" c="forest.7" style={{ letterSpacing: '0.1em' }}>{eyebrow}</Text>
          <Text fw={800} fz={26} c="forest.7" style={{ lineHeight: 1.1 }}>{value}</Text>
          {sub && <Text size="xs" c="dimmed">{sub}</Text>}
        </Stack>
        <Box style={{ width: 42, height: 42, borderRadius: 999, background: '#bef264', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flex: '0 0 auto' }}>
          {icon}
        </Box>
      </Group>
    </Paper>
  )
}

export default function Anomalies() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [reports, setReports] = useState(null)
  const [markups, setMarkups] = useState([])
  const [fraudCounts, setFraudCounts] = useState({})
  const [banThreshold, setBanThreshold] = useState(3)
  const [busyUserId, setBusyUserId] = useState(null)
  const [feedback, setFeedback] = useState('')

  const [filterSeverity, setFilterSeverity] = useState('all')
  const [filterSource, setFilterSource] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [query, setQuery] = useState('')

  function load() {
    api('/prices/anomalies').then((d) => setReports(d.items))
    api('/prices/markups').then((d) => setMarkups(d.items))
    if (isAdmin) {
      api('/admin/fraud-counts').then((d) => {
        setFraudCounts(d.counts || {})
        if (d.threshold) setBanThreshold(d.threshold)
      }).catch(() => {})
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin])

  async function setStatus(id, status) {
    await api(`/prices/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    })
    load()
  }

  async function banUser(userId, name) {
    if (!confirm(`Ban ${name}? They have ${fraudCounts[userId] || 0} flagged reports.`)) return
    setBusyUserId(userId)
    setFeedback('')
    try {
      await api(`/admin/users/${userId}/ban`, { method: 'POST', body: JSON.stringify({}) })
      setFeedback(`${name} has been banned.`)
      load()
    } catch (e) {
      setFeedback(`Ban failed: ${e.message}`)
    } finally {
      setBusyUserId(null)
    }
  }

  const enriched = useMemo(() => {
    if (!reports) return []
    return reports.map((p) => {
      const dev = parseDeviation(p.anomalyReason)
      const sev = dev != null ? severityFor(Math.abs(dev)) : 'low'
      return { ...p, deviation: dev, severity: sev }
    })
  }, [reports])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return enriched.filter((p) => {
      if (filterSeverity !== 'all' && p.severity !== filterSeverity) return false
      if (filterSource !== 'all' && p.source !== filterSource) return false
      if (filterStatus !== 'all' && p.status !== filterStatus) return false
      if (q) {
        const blob = `${p.productId?.name || ''} ${p.userId?.name || ''} ${p.area || ''} ${p.district || ''}`.toLowerCase()
        if (!blob.includes(q)) return false
      }
      return true
    })
  }, [enriched, filterSeverity, filterSource, filterStatus, query])

  const stats = useMemo(() => {
    const high = enriched.filter((p) => p.severity === 'high').length
    const flagged = enriched.filter((p) => p.status === 'flagged').length
    const suspectUsers = new Set(enriched.map((p) => p.userId?._id).filter(Boolean)).size
    return { total: enriched.length, high, flagged, suspectUsers }
  }, [enriched])

  const chartData = useMemo(() => {
    return [...filtered]
      .filter((p) => p.deviation != null)
      .sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation))
      .slice(0, 20)
      .map((p, i) => ({
        id: p._id,
        label: `${p.productId?.name || '?'} #${i + 1}`,
        product: p.productId?.name || '?',
        deviation: +p.deviation,
        absDeviation: +Math.abs(p.deviation).toFixed(1),
        severity: p.severity,
        price: p.price,
        reporter: p.userId?.name || 'Anonymous',
        date: new Date(p.createdAt).toLocaleDateString(),
      }))
  }, [filtered])

  const activeFilters = [
    filterSeverity !== 'all' && { key: 'sev', label: `Severity: ${SEVERITY[filterSeverity].label}`, clear: () => setFilterSeverity('all') },
    filterSource !== 'all' && { key: 'src', label: `Source: ${filterSource}`, clear: () => setFilterSource('all') },
    filterStatus !== 'all' && { key: 'st', label: `Status: ${filterStatus}`, clear: () => setFilterStatus('all') },
    query && { key: 'q', label: `“${query}”`, clear: () => setQuery('') },
  ].filter(Boolean)

  return (
    <Stack gap="xl">
      <style>{`
        .anom-card { transition: transform 160ms ease, box-shadow 160ms ease; }
        .anom-card:hover { transform: translateY(-2px); box-shadow: 0 18px 40px rgba(11,61,46,0.10); }
        .sev-high { border-left: 5px solid #dc2626 !important; }
        .sev-medium { border-left: 5px solid #f97316 !important; }
        .sev-low { border-left: 5px solid #facc15 !important; }
        .flagged-bg { background: linear-gradient(135deg, #fff1f2 0%, #ffffff 50%) !important; }
      `}</style>

      <Stack gap={4}>
        <span className="section-eyebrow">Anomalies</span>
        <h1 className="display" style={{ margin: 0 }}>
          Suspicious <span style={{ color: '#65a30d' }}>price activity</span>
        </h1>
        <Text c="dimmed" maw={680}>
          Reports that deviate &gt;20% from the 7-day average, plus vendor listings priced well off the community baseline.
          {isAdmin && ` Admins can flag fraud and ban users with ≥${banThreshold} flagged reports.`}
        </Text>
      </Stack>

      {feedback && (
        <Paper style={cardStyle}>
          <Group justify="space-between">
            <Text size="sm" c="forest.7" fw={600}>{feedback}</Text>
            <ActionIcon variant="subtle" onClick={() => setFeedback('')}>×</ActionIcon>
          </Group>
        </Paper>
      )}

      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="lg">
        <StatCard eyebrow="Total anomalies" value={stats.total} sub="Report-level deviations" accent="#ecfccb" icon="🚨" />
        <StatCard eyebrow="High severity" value={stats.high} sub="≥ 50% off avg" accent="#fee2e2" icon="🔥" />
        <StatCard eyebrow="Flagged" value={stats.flagged} sub="Reviewed as fraud" accent="#fef3c7" icon="🚩" />
        <StatCard eyebrow="Suspect users" value={stats.suspectUsers} sub="Distinct reporters" accent="#bef26433" icon="👥" />
      </SimpleGrid>

      <Tabs defaultValue="reports" color="forest" radius="xl">
        <Tabs.List>
          <Tabs.Tab value="reports">Report anomalies <Badge ml={6} color="forest" variant="light" radius="xl">{enriched.length}</Badge></Tabs.Tab>
          <Tabs.Tab value="markups">Vendor markups <Badge ml={6} color="forest" variant="light" radius="xl">{markups.length}</Badge></Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="reports" pt="md">
          <Paper style={cardStyle} mb="lg">
            <Group gap="sm" wrap="wrap" align="end">
              <Select
                label="Severity"
                value={filterSeverity}
                onChange={(v) => setFilterSeverity(v || 'all')}
                data={[
                  { value: 'all', label: 'All severities' },
                  { value: 'high', label: 'High (≥ 50%)' },
                  { value: 'medium', label: 'Medium (25–50%)' },
                  { value: 'low', label: 'Low (< 25%)' },
                ]}
                radius="xl"
                w={180}
                allowDeselect={false}
              />
              <Select
                label="Source"
                value={filterSource}
                onChange={(v) => setFilterSource(v || 'all')}
                data={[
                  { value: 'all', label: 'All sources' },
                  { value: 'consumer', label: 'Consumer' },
                  { value: 'vendor', label: 'Vendor' },
                ]}
                radius="xl"
                w={150}
                allowDeselect={false}
              />
              <Select
                label="Status"
                value={filterStatus}
                onChange={(v) => setFilterStatus(v || 'all')}
                data={[
                  { value: 'all', label: 'All' },
                  { value: 'ok', label: 'Open' },
                  { value: 'flagged', label: 'Flagged' },
                ]}
                radius="xl"
                w={140}
                allowDeselect={false}
              />
              <TextInput
                label="Search"
                placeholder="product, reporter, area…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                radius="xl"
                w={220}
              />
              <Box style={{ flex: 1 }} />
              <Stack gap={2} ta="right">
                <Text size="xs" c="dimmed">Showing</Text>
                <Text fw={700} c="forest.7">{filtered.length} / {enriched.length}</Text>
              </Stack>
            </Group>
            {activeFilters.length > 0 && (
              <Group gap={6} wrap="wrap" mt="sm">
                {activeFilters.map((f) => (
                  <Badge
                    key={f.key}
                    variant="filled"
                    color="lime"
                    radius="xl"
                    size="lg"
                    styles={{ root: { color: '#0b3d2e', textTransform: 'none', fontWeight: 600, paddingRight: 8 } }}
                    rightSection={
                      <ActionIcon size="xs" radius="xl" variant="transparent" onClick={f.clear} style={{ color: '#0b3d2e' }}>×</ActionIcon>
                    }
                  >
                    {f.label}
                  </Badge>
                ))}
              </Group>
            )}
          </Paper>

          {chartData.length > 0 && (
            <Paper style={cardStyle} mb="lg">
              <Group justify="space-between" align="end" mb="sm" wrap="wrap">
                <Stack gap={2}>
                  <Text size="xs" fw={700} tt="uppercase" c="forest.7" style={{ letterSpacing: '0.1em' }}>Spikes & drops</Text>
                  <Text fw={700} size="lg">Top {chartData.length} deviations</Text>
                </Stack>
                <Group gap="md" visibleFrom="sm">
                  <Group gap={6}><Box w={10} h={10} style={{ background: '#dc2626', borderRadius: 999 }} /><Text size="xs" c="dimmed">High</Text></Group>
                  <Group gap={6}><Box w={10} h={10} style={{ background: '#f97316', borderRadius: 999 }} /><Text size="xs" c="dimmed">Medium</Text></Group>
                  <Group gap={6}><Box w={10} h={10} style={{ background: '#facc15', borderRadius: 999 }} /><Text size="xs" c="dimmed">Low</Text></Group>
                </Group>
              </Group>
              <div style={{ height: 280 }}>
                <ResponsiveContainer>
                  <BarChart data={chartData} margin={{ top: 10, right: 12, bottom: 10, left: -8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e7eee9" />
                    <XAxis dataKey="label" hide />
                    <YAxis tick={{ fontSize: 11 }} unit="%" />
                    <Tooltip
                      formatter={(v, _name, item) => [`${v}%`, `Deviation`]}
                      labelFormatter={(_l, payload) => {
                        const d = payload?.[0]?.payload
                        if (!d) return ''
                        return `${d.product} · ৳${d.price} · ${d.reporter} · ${d.date}`
                      }}
                      cursor={{ fill: 'rgba(190,242,100,0.18)' }}
                    />
                    <ReferenceLine y={25} stroke="#f97316" strokeDasharray="4 4" label={{ value: 'med 25%', fill: '#f97316', fontSize: 10, position: 'right' }} />
                    <ReferenceLine y={50} stroke="#dc2626" strokeDasharray="4 4" label={{ value: 'high 50%', fill: '#dc2626', fontSize: 10, position: 'right' }} />
                    <Bar dataKey="absDeviation" radius={[10, 10, 0, 0]}>
                      {chartData.map((d, i) => (
                        <Cell key={i} fill={d.severity === 'high' ? '#dc2626' : d.severity === 'medium' ? '#f97316' : '#facc15'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Paper>
          )}

          {reports === null ? (
            <Center mih={220}><Loader color="forest.7" /></Center>
          ) : filtered.length === 0 ? (
            <Paper style={cardStyle}>
              <Center mih={200}>
                <Stack align="center" gap={6}>
                  <Box style={{ fontSize: 44 }}>🛡️</Box>
                  <Text fw={600}>No anomalies match.</Text>
                  <Text c="dimmed" size="sm">{enriched.length === 0 ? 'No anomalies have been detected yet.' : 'Try clearing filters above.'}</Text>
                </Stack>
              </Center>
            </Paper>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
              {filtered.map((p) => {
                const sev = SEVERITY[p.severity]
                const flaggedCount = p.userId?._id ? fraudCounts[p.userId._id] || 0 : 0
                const eligibleToBan = isAdmin && flaggedCount >= banThreshold
                return (
                  <Paper
                    key={p._id}
                    className={`anom-card sev-${p.severity} ${p.status === 'flagged' ? 'flagged-bg' : ''}`}
                    style={cardStyle}
                  >
                    <Group justify="space-between" align="flex-start" wrap="nowrap">
                      <Stack gap={2}>
                        <Text fw={700} size="lg" c="forest.7">{p.productId?.name || '—'}</Text>
                        <Text size="xs" c="dimmed">📍 {[p.area, p.district].filter(Boolean).join(', ') || 'unknown'}</Text>
                      </Stack>
                      <Stack gap={4} align="end">
                        <Badge color={sev.color} radius="xl" variant="filled">{sev.label}</Badge>
                        {p.status === 'flagged' && (
                          <Badge color="red" radius="xl" variant="light">🚩 flagged</Badge>
                        )}
                      </Stack>
                    </Group>

                    <Group gap="xl" mt="md" align="flex-end">
                      <Stack gap={0}>
                        <Text size="xs" c="dimmed">Reported</Text>
                        <Text fw={800} fz={28} c="forest.7" style={{ lineHeight: 1 }}>৳{p.price}</Text>
                        <Text size="xs" c="dimmed">/{p.unit}</Text>
                      </Stack>
                      <Stack gap={0}>
                        <Text size="xs" c="dimmed">Deviation</Text>
                        <Text fw={800} fz={24} c={p.deviation > 0 ? 'red.7' : 'forest.7'} style={{ lineHeight: 1.05 }}>
                          {p.deviation != null ? `${p.deviation > 0 ? '▲ +' : '▼ '}${p.deviation.toFixed(0)}%` : '—'}
                        </Text>
                        <Text size="xs" c="dimmed">vs 7-day avg</Text>
                      </Stack>
                    </Group>

                    <Text size="xs" c="dimmed" mt="sm">{p.anomalyReason}</Text>

                    <Group gap={6} mt="sm" wrap="nowrap">
                      <Text size="sm">
                        <b>{p.userId?.name || '—'}</b>
                      </Text>
                      <Badge size="xs" variant="light" color={p.source === 'vendor' ? 'lime' : 'forest'} radius="xl">{p.source}</Badge>
                      {isAdmin && flaggedCount > 0 && (
                        <Badge
                          size="xs"
                          radius="xl"
                          variant="filled"
                          color={flaggedCount >= banThreshold ? 'red' : 'orange'}
                        >
                          {flaggedCount} flagged
                        </Badge>
                      )}
                    </Group>
                    <Text size="xs" c="dimmed" mt={2}>{new Date(p.createdAt).toLocaleString()}</Text>

                    {isAdmin && (
                      <Group gap="xs" mt="md" wrap="wrap">
                        {p.status === 'flagged' ? (
                          <Button size="xs" radius="xl" variant="default" onClick={() => setStatus(p._id, 'ok')}>
                            Unflag
                          </Button>
                        ) : (
                          <Button size="xs" radius="xl" color="red" variant="filled" onClick={() => setStatus(p._id, 'flagged')}>
                            🚩 Flag fraud
                          </Button>
                        )}
                        {p.userId?._id && (
                          <Button
                            size="xs"
                            radius="xl"
                            variant={eligibleToBan ? 'filled' : 'light'}
                            color="red"
                            disabled={!eligibleToBan || busyUserId === p.userId._id}
                            loading={busyUserId === p.userId._id}
                            onClick={() => banUser(p.userId._id, p.userId.name)}
                            title={
                              eligibleToBan
                                ? `Ban ${p.userId.name} (${flaggedCount} frauds)`
                                : `Ban requires ≥${banThreshold} flags (currently ${flaggedCount})`
                            }
                          >
                            🚫 Ban user {flaggedCount ? `(${flaggedCount}/${banThreshold})` : ''}
                          </Button>
                        )}
                      </Group>
                    )}
                  </Paper>
                )
              })}
            </SimpleGrid>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="markups" pt="md">
          <Text c="dimmed" mb="md">Marketplace listings whose asking price diverges &gt;20% from community-reported prices.</Text>
          {markups.length === 0 ? (
            <Paper style={cardStyle}>
              <Center mih={200}>
                <Stack align="center" gap={6}>
                  <Box style={{ fontSize: 44 }}>✅</Box>
                  <Text fw={600}>No vendor markups detected.</Text>
                </Stack>
              </Center>
            </Paper>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
              {markups.map((m) => {
                const pct = m.diff * 100
                const sev = severityFor(Math.abs(pct))
                return (
                  <Paper key={m.listing._id} className={`anom-card sev-${sev}`} style={cardStyle}>
                    <Group justify="space-between" align="flex-start" wrap="nowrap">
                      <Stack gap={2}>
                        <Text fw={700} size="lg" c="forest.7">{m.listing.product?.name || m.listing.title}</Text>
                        <Text size="xs" c="dimmed">📍 {[m.listing.area, m.listing.district].filter(Boolean).join(', ') || '—'}</Text>
                      </Stack>
                      <Badge color={SEVERITY[sev].color} radius="xl" variant="filled">{SEVERITY[sev].label}</Badge>
                    </Group>
                    <Group gap="xl" mt="md" align="flex-end">
                      <Stack gap={0}>
                        <Text size="xs" c="dimmed">Listed</Text>
                        <Text fw={800} fz={26} c="forest.7" style={{ lineHeight: 1 }}>৳{m.listing.price}</Text>
                        <Text size="xs" c="dimmed">/{m.listing.unit}</Text>
                      </Stack>
                      <Stack gap={0}>
                        <Text size="xs" c="dimmed">Reports avg</Text>
                        <Text fw={700} fz={22} style={{ lineHeight: 1 }}>৳{fmt(m.report_avg)}</Text>
                        <Text size="xs" c="dimmed">{m.report_count} reports</Text>
                      </Stack>
                      <Stack gap={0}>
                        <Text size="xs" c="dimmed">Markup</Text>
                        <Text fw={800} fz={22} c={pct > 0 ? 'red.7' : 'forest.7'} style={{ lineHeight: 1 }}>
                          {pct > 0 ? '▲ +' : '▼ '}{pct.toFixed(0)}%
                        </Text>
                      </Stack>
                    </Group>
                    <Group gap={6} mt="sm">
                      <Text size="sm"><b>{m.listing.vendor?.name || '—'}</b></Text>
                      <Badge size="xs" variant="light" color="lime" radius="xl">vendor</Badge>
                    </Group>
                    <Text size="xs" c="dimmed" mt={2}>{new Date(m.listing.createdAt).toLocaleString()}</Text>
                  </Paper>
                )
              })}
            </SimpleGrid>
          )}
        </Tabs.Panel>
      </Tabs>
    </Stack>
  )
}
