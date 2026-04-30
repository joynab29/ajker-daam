import { useEffect, useMemo, useState } from 'react'
import {
  Title,
  Text,
  Stack,
  Group,
  Paper,
  Badge,
  SimpleGrid,
  Box,
  Center,
  Loader,
  Tooltip as MTooltip,
} from '@mantine/core'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
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

const AVATAR_PALETTE = [
  ['#bef264', '#0b3d2e'],
  ['#a3e635', '#0b3d2e'],
  ['#65a30d', '#fbfdf6'],
  ['#0b3d2e', '#bef264'],
  ['#16a34a', '#fbfdf6'],
  ['#22c55e', '#0b3d2e'],
  ['#84cc16', '#0b3d2e'],
  ['#15803d', '#bef264'],
]

function hashOf(s) {
  let h = 0
  for (let i = 0; i < (s || '').length; i++) h = ((h << 5) - h) + s.charCodeAt(i)
  return Math.abs(h)
}

function initials(name) {
  if (!name) return '?'
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('') || name[0].toUpperCase()
}

function Avatar({ name, size = 48, ring = null }) {
  const [bg, fg] = AVATAR_PALETTE[hashOf(name) % AVATAR_PALETTE.length]
  return (
    <Box
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: bg,
        color: fg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontSize: size * 0.42,
        flex: '0 0 auto',
        boxShadow: ring ? `0 0 0 4px ${ring}` : '0 6px 16px rgba(11,61,46,0.12)',
      }}
      aria-hidden
    >
      {initials(name)}
    </Box>
  )
}

function trustBadges(row, rank) {
  const out = []
  if (rank === 1) out.push({ key: 'champ', icon: '🏆', label: 'Champion', color: 'yellow' })
  else if (rank === 2) out.push({ key: 'silver', icon: '🥈', label: 'Runner-up', color: 'gray' })
  else if (rank === 3) out.push({ key: 'bronze', icon: '🥉', label: 'Bronze', color: 'orange' })

  if (row.total >= 50) out.push({ key: 'legend', icon: '⭐', label: 'Legend', color: 'forest' })
  else if (row.total >= 20) out.push({ key: 'vet', icon: '🎖', label: 'Veteran', color: 'forest' })
  else if (row.total >= 5) out.push({ key: 'reg', icon: '🌿', label: 'Regular', color: 'lime' })
  else out.push({ key: 'sprout', icon: '🌱', label: 'Sprout', color: 'lime' })

  if (row.flagged === 0 && row.total >= 5) out.push({ key: 'trust', icon: '🛡', label: 'Trusted', color: 'forest' })
  if (row.flagged >= 3) out.push({ key: 'risk', icon: '🚩', label: 'At risk', color: 'red' })
  else if (row.flagged >= 1) out.push({ key: 'warn', icon: '⚠', label: 'Watch', color: 'orange' })

  if (row.anomalies > 0 && row.total >= 10 && row.flagged === 0) {
    out.push({ key: 'hotstreak', icon: '🔥', label: 'Sharp eye', color: 'red' })
  }
  if (row.user?.role === 'vendor') out.push({ key: 'vendor', icon: '🏪', label: 'Vendor', color: 'lime' })
  return out
}

function trustPct(row) {
  if (row.total === 0) return 0
  const clean = row.total - row.flagged
  return Math.max(0, Math.min(100, (clean / row.total) * 100))
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

function PodiumStep({ row, rank, height, accent }) {
  const order = rank === 1 ? 2 : rank === 2 ? 1 : 3
  const trophy = rank === 1 ? '🏆' : rank === 2 ? '🥈' : '🥉'
  return (
    <Stack align="center" gap={6} style={{ order }}>
      <Box style={{ position: 'relative' }}>
        <Avatar name={row.user.name} size={rank === 1 ? 90 : 76} ring={accent} />
        <Box
          style={{
            position: 'absolute',
            top: -8,
            right: -10,
            width: 32,
            height: 32,
            borderRadius: 999,
            background: '#fff',
            border: `2px solid ${accent}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
          }}
        >
          {trophy}
        </Box>
      </Box>
      <Text fw={700} c="forest.7" ta="center">{row.user.name}</Text>
      <Group gap={6}>
        <Badge color="forest" variant="light" radius="xl" tt="capitalize">{row.user.role}</Badge>
      </Group>
      <Box
        style={{
          marginTop: 6,
          width: rank === 1 ? 160 : 130,
          height,
          background: `linear-gradient(180deg, ${accent} 0%, #ffffff 110%)`,
          borderRadius: '18px 18px 8px 8px',
          border: '1px solid rgba(11,61,46,0.1)',
          boxShadow: '0 12px 30px rgba(11,61,46,0.08)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '14px 10px',
        }}
      >
        <Text fw={800} fz={32} c="forest.7" style={{ lineHeight: 1 }}>#{rank}</Text>
        <Text fw={800} fz={22} c="forest.7" mt={4}>{row.score}</Text>
        <Text size="xs" c="dimmed">trust score</Text>
        <Group gap={6} mt={6}>
          <Text size="xs" c="dimmed">{row.total} reports</Text>
        </Group>
      </Box>
    </Stack>
  )
}

export default function Leaderboard() {
  const [rows, setRows] = useState(null)

  useEffect(() => {
    api('/users/leaderboard').then((d) => setRows(d.leaderboard || []))
  }, [])

  const stats = useMemo(() => {
    if (!rows) return { contributors: 0, reports: 0, flagged: 0, avgScore: 0 }
    const reports = rows.reduce((s, r) => s + r.total, 0)
    const flagged = rows.reduce((s, r) => s + r.flagged, 0)
    const avgScore = rows.length ? rows.reduce((s, r) => s + r.score, 0) / rows.length : 0
    return { contributors: rows.length, reports, flagged, avgScore }
  }, [rows])

  const chartData = useMemo(() => {
    if (!rows) return []
    return rows.slice(0, 10).map((r) => ({
      name: r.user.name,
      reports: r.total - r.flagged - r.anomalies,
      anomalies: Math.max(0, r.anomalies - r.flagged),
      flagged: r.flagged,
      score: r.score,
    }))
  }, [rows])

  if (rows === null) {
    return (
      <Center mih={360}>
        <Stack align="center" gap="sm">
          <Loader color="forest.7" />
          <Text c="dimmed">Tallying contributions…</Text>
        </Stack>
      </Center>
    )
  }

  const top3 = rows.slice(0, 3)
  const rest = rows.slice(3)

  return (
    <Stack gap="xl">
      <style>{`
        .lb-card { transition: transform 160ms ease, box-shadow 160ms ease; }
        .lb-card:hover { transform: translateY(-2px); box-shadow: 0 18px 40px rgba(11,61,46,0.10); }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .progress-track {
          position: relative;
          height: 8px;
          border-radius: 999px;
          background: #ecfccb;
          overflow: hidden;
        }
        .progress-fill {
          position: absolute;
          inset: 0;
          height: 100%;
          background: linear-gradient(90deg, #65a30d, #bef264);
          border-radius: 999px;
        }
      `}</style>

      <Stack gap={4}>
        <span className="section-eyebrow">Leaderboard</span>
        <h1 className="display" style={{ margin: 0 }}>
          Top <span style={{ color: '#65a30d' }}>contributors</span>
        </h1>
        <Text c="dimmed" maw={680}>
          Trust score = total reports − 5 × flagged. Earn badges by reporting consistently and accurately.
        </Text>
      </Stack>

      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="lg">
        <StatCard eyebrow="Contributors" value={stats.contributors} sub="On the board" accent="#bef26433" icon="👥" />
        <StatCard eyebrow="Total reports" value={stats.reports.toLocaleString()} sub="Across the community" accent="#dcfce7" icon="🧾" />
        <StatCard eyebrow="Avg trust score" value={stats.avgScore.toFixed(1)} sub="Mean across users" accent="#ecfccb" icon="📊" />
        <StatCard eyebrow="Flagged" value={stats.flagged} sub="As fraud" accent="#fee2e2" icon="🚩" />
      </SimpleGrid>

      {top3.length > 0 && (
        <Paper style={cardStyle}>
          <Group justify="space-between" align="end" mb="md" wrap="wrap">
            <Stack gap={2}>
              <Text size="xs" fw={700} tt="uppercase" c="forest.7" style={{ letterSpacing: '0.1em' }}>Hall of fame</Text>
              <Text fw={700} size="lg">Podium · top {top3.length}</Text>
            </Stack>
          </Group>
          <Group gap="xl" justify="center" align="end" wrap="wrap" mt="md">
            {top3[1] && <PodiumStep row={top3[1]} rank={2} height={130} accent="#a3e635" />}
            {top3[0] && <PodiumStep row={top3[0]} rank={1} height={170} accent="#facc15" />}
            {top3[2] && <PodiumStep row={top3[2]} rank={3} height={100} accent="#fb923c" />}
          </Group>
        </Paper>
      )}

      {chartData.length > 0 && (
        <Paper style={cardStyle}>
          <Group justify="space-between" align="end" mb="sm" wrap="wrap">
            <Stack gap={2}>
              <Text size="xs" fw={700} tt="uppercase" c="forest.7" style={{ letterSpacing: '0.1em' }}>Contribution graph</Text>
              <Text fw={700} size="lg">Top {chartData.length} · clean / anomaly / flagged</Text>
            </Stack>
            <Group gap="md" visibleFrom="sm">
              <Group gap={6}><Box w={10} h={10} style={{ background: '#0b3d2e', borderRadius: 3 }} /><Text size="xs" c="dimmed">clean</Text></Group>
              <Group gap={6}><Box w={10} h={10} style={{ background: '#facc15', borderRadius: 3 }} /><Text size="xs" c="dimmed">anomaly</Text></Group>
              <Group gap={6}><Box w={10} h={10} style={{ background: '#dc2626', borderRadius: 3 }} /><Text size="xs" c="dimmed">flagged</Text></Group>
            </Group>
          </Group>
          <div style={{ height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 10, right: 12, bottom: 0, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7eee9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={56} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip cursor={{ fill: 'rgba(190,242,100,0.18)' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="reports"   name="clean"     stackId="c" fill="#0b3d2e" radius={[10, 10, 0, 0]} />
                <Bar dataKey="anomalies" name="anomaly"   stackId="c" fill="#facc15" />
                <Bar dataKey="flagged"   name="flagged"   stackId="c" fill="#dc2626" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Paper>
      )}

      <Paper style={cardStyle}>
        <Group justify="space-between" align="end" mb="md" wrap="wrap">
          <Stack gap={2}>
            <Text size="xs" fw={700} tt="uppercase" c="forest.7" style={{ letterSpacing: '0.1em' }}>Standings</Text>
            <Text fw={700} size="lg">All contributors · {rows.length}</Text>
          </Stack>
        </Group>

        {rest.length === 0 ? (
          <Text c="dimmed" size="sm">Just the podium so far. More contributors will appear here as they submit prices.</Text>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
            {rest.map((r, i) => {
              const rank = i + 4
              const badges = trustBadges(r, rank)
              const tp = trustPct(r)
              return (
                <Paper key={r.user._id} className="lb-card" style={cardStyle}>
                  <Group justify="space-between" align="flex-start" wrap="nowrap">
                    <Group gap="md" wrap="nowrap">
                      <Box style={{ position: 'relative' }}>
                        <Avatar name={r.user.name} size={56} />
                        <Box
                          style={{
                            position: 'absolute',
                            bottom: -4,
                            right: -4,
                            background: '#fff',
                            color: '#0b3d2e',
                            borderRadius: 999,
                            width: 26,
                            height: 26,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: 12,
                            boxShadow: '0 4px 10px rgba(11,61,46,0.18)',
                            border: '2px solid #bef264',
                          }}
                        >
                          {rank}
                        </Box>
                      </Box>
                      <Stack gap={2}>
                        <Text fw={700} c="forest.7">{r.user.name}</Text>
                        <Group gap={4}>
                          <Badge size="xs" radius="xl" color="forest" variant="light" tt="capitalize">{r.user.role}</Badge>
                          <Text size="xs" c="dimmed">· {r.total} reports</Text>
                        </Group>
                      </Stack>
                    </Group>
                    <Stack gap={0} ta="right">
                      <Text size="xs" c="dimmed">Score</Text>
                      <Text fw={800} fz={24} c="forest.7" style={{ lineHeight: 1.05 }}>{r.score}</Text>
                    </Stack>
                  </Group>

                  <Group gap={4} mt="sm" wrap="wrap">
                    {badges.map((b) => (
                      <MTooltip key={b.key} label={b.label} withArrow>
                        <Badge
                          color={b.color}
                          variant={b.color === 'lime' ? 'filled' : 'light'}
                          radius="xl"
                          styles={b.color === 'lime' ? { root: { color: '#0b3d2e' } } : undefined}
                        >
                          {b.icon} {b.label}
                        </Badge>
                      </MTooltip>
                    ))}
                  </Group>

                  <Group justify="space-between" mt="md" mb={4}>
                    <Text size="xs" c="dimmed">Trust ratio</Text>
                    <Text size="xs" fw={700} c={tp >= 90 ? 'forest.7' : tp >= 70 ? 'lime.7' : 'red.7'}>{tp.toFixed(0)}%</Text>
                  </Group>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${tp}%` }} />
                  </div>

                  <Group gap="md" mt="sm">
                    <Stack gap={0}>
                      <Text size="xs" c="dimmed">Anomalies</Text>
                      <Text fw={700}>{r.anomalies}</Text>
                    </Stack>
                    <Stack gap={0}>
                      <Text size="xs" c="dimmed">Flagged</Text>
                      <Text fw={700} c={r.flagged > 0 ? 'red.7' : 'forest.7'}>{r.flagged}</Text>
                    </Stack>
                  </Group>
                </Paper>
              )
            })}
          </SimpleGrid>
        )}
      </Paper>

      {rows.length === 0 && (
        <Paper style={cardStyle}>
          <Center mih={220}>
            <Stack align="center" gap={6}>
              <Box style={{ fontSize: 44 }}>🏁</Box>
              <Text fw={600}>No contributors yet.</Text>
              <Text c="dimmed" size="sm">Be the first to submit a price.</Text>
            </Stack>
          </Center>
        </Paper>
      )}
    </Stack>
  )
}
