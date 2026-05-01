import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Title,
  Text,
  Stack,
  Group,
  SimpleGrid,
  Paper,
  Badge,
  Button,
  Tabs,
  Box,
  Center,
  Loader,
  Alert,
  Modal,
  NumberInput,
  Textarea,
  Select,
  Progress,
} from '@mantine/core'
import { api } from '../api.js'
import { useAuth } from '../AuthContext.jsx'
import { socket } from '../socket.js'

const cardStyle = {
  background: '#fff',
  border: '1px solid rgba(11,61,46,0.08)',
  borderRadius: 22,
  boxShadow: '0 12px 30px rgba(11,61,46,0.06)',
  padding: 22,
}

// Lifecycle definition — single source of truth used by progress bar, KPIs, and tabs.
const STAGES = [
  { key: 'placed',     label: 'Placed',      icon: '📝', stamp: 'placedAt' },
  { key: 'confirmed',  label: 'Confirmed',   icon: '✅', stamp: 'confirmedAt' },
  { key: 'packing',    label: 'Packing',     icon: '📦', stamp: 'packingAt' },
  { key: 'dispatched', label: 'Dispatched',  icon: '🚚', stamp: 'dispatchedAt' },
  { key: 'in_transit', label: 'In transit',  icon: '🛣️', stamp: 'inTransitAt' },
  { key: 'delivered',  label: 'Delivered',   icon: '🎁', stamp: 'deliveredAt' },
  { key: 'completed',  label: 'Completed',   icon: '🎉', stamp: 'completedAt' },
]
const STAGE_INDEX = Object.fromEntries(STAGES.map((s, i) => [s.key, i]))

function fmtTime(ts) {
  if (!ts) return null
  const d = new Date(ts)
  return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function fmtDuration(ms) {
  if (ms == null || Number.isNaN(ms)) return '—'
  const sign = ms < 0 ? '-' : ''
  const a = Math.abs(ms)
  const h = Math.floor(a / 3600000)
  const m = Math.floor((a % 3600000) / 60000)
  const s = Math.floor((a % 60000) / 1000)
  if (h >= 24) {
    const d = Math.floor(h / 24)
    return `${sign}${d}d ${h % 24}h`
  }
  if (h > 0) return `${sign}${h}h ${m}m`
  if (m > 0) return `${sign}${m}m ${s}s`
  return `${sign}${s}s`
}

function StarPicker({ value, onChange, size = 28 }) {
  const [hover, setHover] = useState(0)
  const display = hover || value || 0
  return (
    <Group gap={4} role="radiogroup" aria-label="rating">
      {[1, 2, 3, 4, 5].map((n) => {
        const active = n <= display
        return (
          <Box
            key={n}
            onClick={() => onChange(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            role="radio"
            aria-checked={value === n}
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChange(n) } }}
            style={{
              cursor: 'pointer',
              fontSize: size,
              lineHeight: 1,
              color: active ? '#facc15' : '#e5e7eb',
              userSelect: 'none',
              transition: 'color 120ms ease',
            }}
          >
            ★
          </Box>
        )
      })}
    </Group>
  )
}

function ReadStars({ value, count, size = 14 }) {
  return (
    <Group gap={4} wrap="nowrap">
      <Text style={{ color: '#facc15', fontSize: size, letterSpacing: 1 }} fw={700}>
        {[1, 2, 3, 4, 5].map((n) => (n <= value ? '★' : '☆')).join('')}
      </Text>
      <Text size="xs" c="dimmed">{value.toFixed(1)}{count != null ? ` (${count})` : ''}</Text>
    </Group>
  )
}

function statusPill(status) {
  if (status === 'rejected') return <Badge color="red" radius="xl" variant="filled">Rejected</Badge>
  if (status === 'completed') return <Badge color="lime" radius="xl" variant="filled" styles={{ root: { color: '#0b3d2e' } }}>Completed</Badge>
  if (status === 'delivered') return <Badge color="forest" radius="xl" variant="light">Delivered · awaiting receipt</Badge>
  const stage = STAGES.find((s) => s.key === status)
  return (
    <Badge color="forest" radius="xl" variant="light">
      {stage ? `${stage.icon} ${stage.label}` : status}
    </Badge>
  )
}

function CountdownPill({ promisedAt, status, now }) {
  if (!promisedAt || status === 'completed' || status === 'delivered' || status === 'rejected') return null
  const ms = new Date(promisedAt).getTime() - now
  const overdue = ms < 0
  return (
    <Badge
      color={overdue ? 'red' : 'forest'}
      variant={overdue ? 'filled' : 'light'}
      radius="xl"
    >
      {overdue ? '⏰ Delayed by ' : '⏳ ETA in '}
      {fmtDuration(Math.abs(ms))}
    </Badge>
  )
}

function ProgressTracker({ order, now }) {
  const isRejected = order.status === 'rejected'
  const currentIdx = STAGE_INDEX[order.status] ?? 0
  const visibleStages = isRejected
    ? STAGES.slice(0, Math.max(currentIdx + 1, 1))
    : STAGES
  const progressPct = isRejected
    ? 100
    : ((currentIdx) / (STAGES.length - 1)) * 100

  return (
    <Stack gap="sm">
      <Progress
        value={progressPct}
        color={isRejected ? 'red' : 'lime'}
        radius="xl"
        size="lg"
        animated={!isRejected && currentIdx < STAGES.length - 1}
      />
      <Group justify="space-between" wrap="nowrap" gap={6} style={{ overflowX: 'auto' }}>
        {visibleStages.map((s, i) => {
          const stamp = order.timestamps?.[s.stamp]
          const reached = isRejected
            ? i <= currentIdx
            : i <= currentIdx
          const isCurrent = i === currentIdx
          return (
            <Stack key={s.key} gap={2} align="center" style={{ flex: 1, minWidth: 80 }}>
              <Box
                style={{
                  width: 30, height: 30, borderRadius: 999,
                  background: reached ? (isRejected ? '#dc2626' : '#bef264') : '#e5e7eb',
                  color: reached ? '#0b3d2e' : '#6b7280',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 14,
                  boxShadow: isCurrent ? '0 0 0 4px rgba(190,242,100,0.5)' : 'none',
                  transition: 'all 200ms ease',
                }}
              >
                {reached ? s.icon : '•'}
              </Box>
              <Text size="xs" fw={isCurrent ? 700 : 500} c={reached ? 'forest.7' : 'dimmed'}>
                {s.label}
              </Text>
              {stamp && (
                <Text size="xs" c="dimmed" style={{ fontFeatureSettings: 'tnum' }}>{fmtTime(stamp)}</Text>
              )}
            </Stack>
          )
        })}
      </Group>

      {order.promisedAt && order.status !== 'completed' && order.status !== 'rejected' && (
        <Group gap={6}>
          <Text size="xs" c="dimmed">Promised by:</Text>
          <Text size="xs" fw={600}>{fmtTime(order.promisedAt)}</Text>
          <CountdownPill promisedAt={order.promisedAt} status={order.status} now={now} />
        </Group>
      )}
      {isRejected && order.rejectReason && (
        <Alert color="red" radius="lg">Rejected: {order.rejectReason}</Alert>
      )}
    </Stack>
  )
}

export default function Orders() {
  const { user } = useAuth()
  const [incoming, setIncoming] = useState(null)
  const [mine, setMine] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [err, setErr] = useState('')
  const [now, setNow] = useState(Date.now())

  // Confirm modal (vendor sets ETA)
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [etaPreset, setEtaPreset] = useState('60')
  const [etaCustom, setEtaCustom] = useState('')

  // Reject modal
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  // Review modal (consumer rating the vendor)
  const [reviewTarget, setReviewTarget] = useState(null)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewText, setReviewText] = useState('')
  const [reviewBusy, setReviewBusy] = useState(false)

  const reloadingRef = useRef(false)

  function load() {
    if (!user || reloadingRef.current) return
    reloadingRef.current = true
    const tasks = []
    if (user.role === 'vendor' || user.role === 'admin') {
      tasks.push(api('/marketplace/orders/incoming').then((d) => setIncoming(d.orders)))
    }
    if (user.role !== 'admin') {
      tasks.push(api('/marketplace/orders/mine').then((d) => setMine(d.orders)))
    }
    Promise.all(tasks).catch((e) => setErr(e.message)).finally(() => { reloadingRef.current = false })
  }

  useEffect(() => {
    load()
    socket.connect()
    function onOrderEvent() { load() }
    socket.on('order:new', onOrderEvent)
    socket.on('order:status', onOrderEvent)
    return () => {
      socket.off('order:new', onOrderEvent)
      socket.off('order:status', onOrderEvent)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Tick every second so countdowns update live
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  async function transition(id, action, body) {
    setBusyId(id)
    try {
      await api(`/marketplace/orders/${id}/${action}`, {
        method: 'POST',
        body: JSON.stringify(body || {}),
      })
      load()
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusyId(null)
    }
  }

  function openConfirm(o) {
    setConfirmTarget(o)
    setEtaPreset('60')
    setEtaCustom('')
  }
  async function doConfirm() {
    if (!confirmTarget) return
    const minutes = etaPreset === 'custom' ? Number(etaCustom) : Number(etaPreset)
    await transition(confirmTarget._id, 'confirm', { etaMinutes: minutes })
    setConfirmTarget(null)
  }

  function openReject(o) {
    setRejectTarget(o)
    setRejectReason('')
  }
  async function doReject() {
    if (!rejectTarget) return
    await transition(rejectTarget._id, 'reject', { reason: rejectReason })
    setRejectTarget(null)
  }

  function openReview(o) {
    setReviewTarget(o)
    setReviewRating(o.myReview?.rating || 5)
    setReviewText(o.myReview?.text || '')
  }
  async function doReview() {
    if (!reviewTarget) return
    setReviewBusy(true)
    try {
      const vendorId = reviewTarget.vendorId?._id || reviewTarget.vendorId
      await api(`/users/vendors/${vendorId}/reviews`, {
        method: 'POST',
        body: JSON.stringify({
          orderId: reviewTarget._id,
          rating: reviewRating,
          text: reviewText,
        }),
      })
      setReviewTarget(null)
      load()
    } catch (e) {
      setErr(e.message)
    } finally {
      setReviewBusy(false)
    }
  }

  async function confirmReceived(o) {
    setBusyId(o._id)
    try {
      await api(`/marketplace/orders/${o._id}/receive`, { method: 'POST', body: JSON.stringify({}) })
      load()
      // Open the review modal right after the consumer confirms receipt.
      openReview(o)
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusyId(null)
    }
  }

  if (!user) {
    return <Alert color="green" radius="lg">Please <a href="/login">login</a> to view your orders.</Alert>
  }

  const isVendor = user.role === 'vendor' || user.role === 'admin'
  const isConsumer = user.role !== 'admin'

  // KPI stats
  function stats(list) {
    if (!list) return { active: 0, delayed: 0, completed: 0, total: 0 }
    let active = 0, delayed = 0, completed = 0
    for (const o of list) {
      if (['completed'].includes(o.status)) completed++
      else if (o.status === 'rejected') {}
      else {
        active++
        if (o.promisedAt && new Date(o.promisedAt).getTime() < now) delayed++
      }
    }
    return { active, delayed, completed, total: list.length }
  }

  function nextVendorAction(o) {
    switch (o.status) {
      case 'placed':     return { label: '✅ Confirm', action: () => openConfirm(o), color: 'lime', filled: true }
      case 'confirmed':  return { label: '📦 Start packing', action: () => transition(o._id, 'pack'),     color: 'forest' }
      case 'packing':    return { label: '🚚 Dispatch',      action: () => transition(o._id, 'dispatch'), color: 'forest', filled: true }
      case 'dispatched': return { label: '🛣️ Mark in transit', action: () => transition(o._id, 'transit'), color: 'forest' }
      case 'in_transit': return { label: '🎁 Mark delivered', action: () => transition(o._id, 'deliver'),  color: 'lime', filled: true }
      default: return null
    }
  }

  function OrderCard({ o, side }) {
    const total = (Number(o.listingId?.price) || 0) * Number(o.quantity || 0) + Number(o.deliveryFee || 0)
    const next = side === 'vendor' ? nextVendorAction(o) : null
    const overdue = o.promisedAt && new Date(o.promisedAt).getTime() < now &&
      !['completed', 'delivered', 'rejected'].includes(o.status)

    return (
      <Paper
        style={{
          ...cardStyle,
          border: overdue ? '2px solid #dc2626' : cardStyle.border,
          background: overdue ? 'linear-gradient(135deg, #fff1f2 0%, #ffffff 70%)' : cardStyle.background,
        }}
      >
        <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
          <Stack gap={2}>
            <Text fw={800} c="forest.7" fz="lg">{o.listingId?.title || 'Listing'}</Text>
            <Text size="xs" c="dimmed">Placed {fmtTime(o.createdAt)}</Text>
          </Stack>
          <Group gap={6} wrap="wrap">
            {statusPill(o.status)}
            <CountdownPill promisedAt={o.promisedAt} status={o.status} now={now} />
          </Group>
        </Group>

        {overdue && (
          <Alert color="red" radius="lg" mt="sm" py={6}>
            ⏰ <b>Delay alert:</b> this order is past the promised time. {side === 'vendor' ? 'Advance the next step.' : 'Reach out to the vendor.'}
          </Alert>
        )}

        <Box mt="md">
          <ProgressTracker order={o} now={now} />
        </Box>

        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm" mt="md">
          <Stack gap={0}>
            <Text size="xs" c="dimmed">Qty</Text>
            <Text fw={700}>{o.quantity} × {o.listingId?.unit || ''}</Text>
          </Stack>
          <Stack gap={0}>
            <Text size="xs" c="dimmed">Method</Text>
            <Text fw={700}>{o.fulfillment === 'pickup' ? '🚶 Pickup' : '💵 COD'}</Text>
          </Stack>
          <Stack gap={0}>
            <Text size="xs" c="dimmed">Delivery</Text>
            <Text fw={700}>{o.fulfillment === 'pickup' ? 'Free' : `৳${o.deliveryFee || 0}`}</Text>
          </Stack>
          <Stack gap={0}>
            <Text size="xs" c="dimmed">Total</Text>
            <Text fw={800} c="forest.7">৳{total.toFixed(2)}</Text>
          </Stack>
        </SimpleGrid>

        <Paper p="sm" radius="lg" mt="md" style={{ background: '#fbfdf6', border: '1px solid #ecfccb' }}>
          {side === 'vendor' ? (
            <>
              <Text size="xs" c="dimmed">Buyer</Text>
              <Text fw={600}>{o.consumerName || '—'}{o.contact ? ` · ${o.contact}` : ''}</Text>
              {o.deliveryDistrict && <Text size="xs" c="dimmed" mt={2}>📍 deliver to {o.deliveryDistrict}</Text>}
              {o.message && <Text size="sm" mt={4}>"{o.message}"</Text>}
            </>
          ) : (
            <>
              <Text size="xs" c="dimmed">Vendor</Text>
              <Text fw={600}>{o.vendorId?.name || '—'}</Text>
              {o.deliveryDistrict && <Text size="xs" c="dimmed" mt={2}>📍 {o.deliveryDistrict}</Text>}
            </>
          )}
        </Paper>

        {/* Vendor actions */}
        {side === 'vendor' && o.status === 'placed' && (
          <Group gap="xs" mt="md">
            <Button
              size="sm" radius="xl" color="lime"
              styles={{ root: { color: '#0b3d2e', fontWeight: 700 } }}
              loading={busyId === o._id}
              onClick={() => openConfirm(o)}
            >
              ✅ Confirm & set ETA
            </Button>
            <Button
              size="sm" radius="xl" color="red" variant="light"
              loading={busyId === o._id}
              onClick={() => openReject(o)}
            >
              ❌ Reject
            </Button>
          </Group>
        )}
        {side === 'vendor' && next && o.status !== 'placed' && (
          <Group gap="xs" mt="md">
            <Button
              size="sm" radius="xl"
              color={next.color}
              variant={next.filled ? 'filled' : 'light'}
              styles={next.color === 'lime' ? { root: { color: '#0b3d2e', fontWeight: 700 } } : undefined}
              loading={busyId === o._id}
              onClick={next.action}
            >
              {next.label}
            </Button>
          </Group>
        )}

        {/* Consumer "Received" action */}
        {side === 'consumer' && o.status === 'delivered' && (
          <Group gap="xs" mt="md">
            <Button
              size="sm" radius="xl" color="lime"
              styles={{ root: { color: '#0b3d2e', fontWeight: 700 } }}
              loading={busyId === o._id}
              onClick={() => confirmReceived(o)}
            >
              ✓ Received — confirm
            </Button>
            <Text size="xs" c="dimmed">Confirms completion and opens the rating step.</Text>
          </Group>
        )}

        {/* Consumer rating the vendor — only after the order is completed */}
        {side === 'consumer' && o.status === 'completed' && (
          <Paper
            p="sm"
            radius="lg"
            mt="md"
            style={{
              background: o.myReview ? '#fbfdf6' : 'linear-gradient(135deg, #ecfccb 0%, #ffffff 70%)',
              border: '1px solid #ecfccb',
            }}
          >
            {o.myReview ? (
              <Group justify="space-between" wrap="wrap" gap="sm">
                <Stack gap={2}>
                  <Group gap={6}>
                    <Text size="xs" tt="uppercase" fw={700} c="forest.7" style={{ letterSpacing: '0.1em' }}>Your review</Text>
                    <ReadStars value={o.myReview.rating} />
                  </Group>
                  {o.myReview.text && <Text size="sm" mt={2}>"{o.myReview.text}"</Text>}
                </Stack>
                <Button size="xs" variant="default" radius="xl" onClick={() => openReview(o)}>
                  Edit review
                </Button>
              </Group>
            ) : (
              <Group justify="space-between" wrap="wrap" gap="sm">
                <Stack gap={2}>
                  <Text fw={700} c="forest.7">⭐ Rate {o.vendorId?.name || 'this vendor'}</Text>
                  <Text size="xs" c="dimmed">A 1–5★ rating helps the next buyer choose with confidence.</Text>
                </Stack>
                <Button
                  size="xs"
                  radius="xl"
                  color="lime"
                  styles={{ root: { color: '#0b3d2e', fontWeight: 700 } }}
                  onClick={() => openReview(o)}
                >
                  Leave a review
                </Button>
              </Group>
            )}
          </Paper>
        )}
      </Paper>
    )
  }

  const incomingStats = stats(incoming)
  const mineStats = stats(mine)

  return (
    <Stack gap="xl">
      <Stack gap={4}>
        <span className="section-eyebrow">Order tracking</span>
        <h1 className="display" style={{ margin: 0 }}>
          {isVendor && !isConsumer ? 'Incoming orders' : 'Your orders'}
        </h1>
        <Text c="dimmed">
          Live status, vendor-set delivery timeline, and a real-time progress tracker. Updates push instantly via Socket.io.
        </Text>
      </Stack>

      {err && <Alert color="red" radius="lg" withCloseButton onClose={() => setErr('')}>{err}</Alert>}

      {(isVendor || isConsumer) && (
        <SimpleGrid cols={{ base: 2, md: 4 }} spacing="lg">
          {isVendor && (
            <>
              <Paper style={cardStyle}>
                <Text size="xs" tt="uppercase" fw={700} c="forest.7" style={{ letterSpacing: '0.1em' }}>Incoming · active</Text>
                <Text fw={800} fz={28} c="forest.7">{incomingStats.active}</Text>
              </Paper>
              <Paper style={{ ...cardStyle, background: incomingStats.delayed > 0 ? 'linear-gradient(135deg, #fee2e2 0%, #ffffff 70%)' : cardStyle.background }}>
                <Text size="xs" tt="uppercase" fw={700} c="red.7" style={{ letterSpacing: '0.1em' }}>Delayed</Text>
                <Text fw={800} fz={28} c={incomingStats.delayed > 0 ? 'red.7' : 'forest.7'}>{incomingStats.delayed}</Text>
              </Paper>
              <Paper style={cardStyle}>
                <Text size="xs" tt="uppercase" fw={700} c="forest.7" style={{ letterSpacing: '0.1em' }}>Completed</Text>
                <Text fw={800} fz={28} c="forest.7">{incomingStats.completed}</Text>
              </Paper>
              <Paper style={cardStyle}>
                <Text size="xs" tt="uppercase" fw={700} c="forest.7" style={{ letterSpacing: '0.1em' }}>Total</Text>
                <Text fw={800} fz={28} c="forest.7">{incomingStats.total}</Text>
              </Paper>
            </>
          )}
          {!isVendor && isConsumer && (
            <>
              <Paper style={cardStyle}>
                <Text size="xs" tt="uppercase" fw={700} c="forest.7" style={{ letterSpacing: '0.1em' }}>Active</Text>
                <Text fw={800} fz={28} c="forest.7">{mineStats.active}</Text>
              </Paper>
              <Paper style={{ ...cardStyle, background: mineStats.delayed > 0 ? 'linear-gradient(135deg, #fee2e2 0%, #ffffff 70%)' : cardStyle.background }}>
                <Text size="xs" tt="uppercase" fw={700} c="red.7" style={{ letterSpacing: '0.1em' }}>Delayed</Text>
                <Text fw={800} fz={28} c={mineStats.delayed > 0 ? 'red.7' : 'forest.7'}>{mineStats.delayed}</Text>
              </Paper>
              <Paper style={cardStyle}>
                <Text size="xs" tt="uppercase" fw={700} c="forest.7" style={{ letterSpacing: '0.1em' }}>Completed</Text>
                <Text fw={800} fz={28} c="forest.7">{mineStats.completed}</Text>
              </Paper>
              <Paper style={cardStyle}>
                <Text size="xs" tt="uppercase" fw={700} c="forest.7" style={{ letterSpacing: '0.1em' }}>Total</Text>
                <Text fw={800} fz={28} c="forest.7">{mineStats.total}</Text>
              </Paper>
            </>
          )}
        </SimpleGrid>
      )}

      <Tabs defaultValue={isVendor ? 'incoming' : 'mine'} color="forest" radius="xl" keepMounted={false}>
        <Tabs.List>
          {isVendor && (
            <Tabs.Tab value="incoming">
              Incoming
              {incoming != null && <Badge ml={6} color="forest" variant="light" radius="xl">{incoming.length}</Badge>}
            </Tabs.Tab>
          )}
          {isConsumer && (
            <Tabs.Tab value="mine">
              Placed
              {mine != null && <Badge ml={6} color="forest" variant="light" radius="xl">{mine.length}</Badge>}
            </Tabs.Tab>
          )}
        </Tabs.List>

        {isVendor && (
          <Tabs.Panel value="incoming" pt="md">
            {incoming === null ? (
              <Center mih={200}><Loader color="forest.7" /></Center>
            ) : incoming.length === 0 ? (
              <Paper style={cardStyle}>
                <Center mih={180}>
                  <Stack align="center" gap={6}>
                    <Box style={{ fontSize: 44 }}>📭</Box>
                    <Text fw={600}>No incoming orders yet.</Text>
                    <Text size="sm" c="dimmed">New orders appear here in real time.</Text>
                  </Stack>
                </Center>
              </Paper>
            ) : (
              <Stack gap="lg">
                {incoming.map((o) => <OrderCard key={o._id} o={o} side="vendor" />)}
              </Stack>
            )}
          </Tabs.Panel>
        )}

        {isConsumer && (
          <Tabs.Panel value="mine" pt="md">
            {mine === null ? (
              <Center mih={200}><Loader color="forest.7" /></Center>
            ) : mine.length === 0 ? (
              <Paper style={cardStyle}>
                <Center mih={180}>
                  <Stack align="center" gap={6}>
                    <Box style={{ fontSize: 44 }}>🛒</Box>
                    <Text fw={600}>No orders yet.</Text>
                    <Text size="sm" c="dimmed">Browse the marketplace to place one.</Text>
                  </Stack>
                </Center>
              </Paper>
            ) : (
              <Stack gap="lg">
                {mine.map((o) => <OrderCard key={o._id} o={o} side="consumer" />)}
              </Stack>
            )}
          </Tabs.Panel>
        )}
      </Tabs>

      {/* Confirm + ETA modal */}
      <Modal
        opened={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        title={<Text fw={800} c="forest.7">Confirm order & set delivery timeline</Text>}
        radius="xl"
      >
        {confirmTarget && (
          <Stack gap="sm">
            <Paper p="sm" radius="lg" style={{ background: '#fbfdf6', border: '1px solid #ecfccb' }}>
              <Text size="sm">
                {confirmTarget.consumerName} ordered <b>{confirmTarget.quantity} × {confirmTarget.listingId?.title}</b>
                {confirmTarget.fulfillment === 'pickup' ? ' (pickup)' : ` (delivery to ${confirmTarget.deliveryDistrict || '—'})`}
              </Text>
            </Paper>
            <Select
              label="Delivery timeline"
              value={etaPreset}
              onChange={(v) => setEtaPreset(v || '60')}
              data={[
                { value: '30',   label: '30 minutes' },
                { value: '60',   label: '1 hour' },
                { value: '120',  label: '2 hours' },
                { value: '240',  label: '4 hours' },
                { value: '720',  label: '12 hours' },
                { value: '1440', label: '1 day' },
                { value: '2880', label: '2 days' },
                { value: 'custom', label: 'Custom (minutes)…' },
              ]}
              radius="xl"
              allowDeselect={false}
            />
            {etaPreset === 'custom' && (
              <NumberInput
                label="Custom ETA (minutes)"
                value={etaCustom}
                onChange={(v) => setEtaCustom(v ?? '')}
                min={5}
                radius="xl"
              />
            )}
            <Text size="xs" c="dimmed">Consumers see a live countdown. If exceeded, both sides see a delay alert.</Text>
            <Group justify="flex-end" gap="xs" mt="xs">
              <Button variant="default" radius="xl" onClick={() => setConfirmTarget(null)}>Cancel</Button>
              <Button
                radius="xl" color="lime"
                styles={{ root: { color: '#0b3d2e', fontWeight: 700 } }}
                loading={busyId === confirmTarget._id}
                onClick={doConfirm}
              >
                Confirm order
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Review modal — consumer rates the vendor after receipt */}
      <Modal
        opened={!!reviewTarget}
        onClose={() => setReviewTarget(null)}
        title={<Text fw={800} c="forest.7">Rate the vendor</Text>}
        radius="xl"
      >
        {reviewTarget && (
          <Stack gap="sm">
            <Paper p="sm" radius="lg" style={{ background: '#fbfdf6', border: '1px solid #ecfccb' }}>
              <Text size="sm">
                <b>{reviewTarget.vendorId?.name || 'Vendor'}</b> · {reviewTarget.listingId?.title} · {reviewTarget.quantity} × {reviewTarget.listingId?.unit}
              </Text>
              {(reviewTarget.vendorId?.ratingAvg ?? 0) > 0 && (
                <Group gap={6} mt={4}>
                  <Text size="xs" c="dimmed">Current vendor rating:</Text>
                  <ReadStars value={reviewTarget.vendorId.ratingAvg} count={reviewTarget.vendorId.ratingCount} />
                </Group>
              )}
            </Paper>
            <Stack gap={4} align="center" my="xs">
              <Text size="xs" c="dimmed" fw={600} tt="uppercase" style={{ letterSpacing: '0.08em' }}>
                Your rating
              </Text>
              <StarPicker value={reviewRating} onChange={setReviewRating} size={36} />
              <Text fw={700} c="forest.7">{reviewRating}/5</Text>
            </Stack>
            <Textarea
              label="What was your experience like? (optional)"
              placeholder="Freshness, packaging, delivery time, communication…"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              radius="xl"
              minRows={3}
              maxLength={500}
            />
            <Group justify="space-between" align="center">
              <Text size="xs" c="dimmed">{reviewText.length}/500</Text>
              <Group gap="xs">
                <Button variant="default" radius="xl" onClick={() => setReviewTarget(null)}>
                  Maybe later
                </Button>
                <Button
                  radius="xl" color="lime"
                  styles={{ root: { color: '#0b3d2e', fontWeight: 700 } }}
                  loading={reviewBusy}
                  onClick={doReview}
                >
                  {reviewTarget.myReview ? 'Update review' : 'Submit review'}
                </Button>
              </Group>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Reject modal */}
      <Modal
        opened={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title={<Text fw={800} c="red.7">Reject order</Text>}
        radius="xl"
      >
        {rejectTarget && (
          <Stack gap="sm">
            <Textarea
              label="Reason (shared with the buyer)"
              placeholder="e.g. out of stock, can't deliver to that district…"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              radius="xl"
              minRows={3}
            />
            <Group justify="flex-end" gap="xs">
              <Button variant="default" radius="xl" onClick={() => setRejectTarget(null)}>Cancel</Button>
              <Button radius="xl" color="red" loading={busyId === rejectTarget._id} onClick={doReject}>Reject order</Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  )
}
