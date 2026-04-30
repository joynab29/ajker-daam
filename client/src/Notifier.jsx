import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ActionIcon, Indicator, Popover, Stack, Group, Text, Box, Button, Badge } from '@mantine/core'
import { socket } from './socket.js'

const MAX = 30

function uid() {
  return Date.now() + '-' + Math.random().toString(36).slice(2, 8)
}

function timeAgo(ts) {
  const sec = Math.max(1, Math.round((Date.now() - ts) / 1000))
  if (sec < 60) return `${sec}s ago`
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  return `${Math.round(hr / 24)}d ago`
}

export default function Notifier() {
  const [opened, setOpened] = useState(false)
  const [items, setItems] = useState([])
  const [unread, setUnread] = useState(0)
  const seen = useRef(new Set())

  useEffect(() => {
    socket.connect()

    function pushItem(item) {
      const key = `${item.kind}:${item.refId}`
      if (seen.current.has(key)) return
      seen.current.add(key)
      setItems((prev) => [item, ...prev].slice(0, MAX))
      setUnread((n) => n + 1)
    }

    function onSpike(a) {
      const name = a.priceReport?.productId?.name || 'a product'
      const dir = a.direction === 'up' ? 'up' : 'down'
      const change = a.change ? (a.change * 100).toFixed(0) : '0'
      const sign = a.direction === 'up' ? '+' : ''
      pushItem({
        id: uid(),
        kind: 'spike',
        refId: a.priceReport?._id || uid(),
        title: dir === 'up' ? `Price spike: ${name}` : `Price drop: ${name}`,
        body: `${a.priceReport.price}/${a.priceReport.unit} (${sign}${change}% vs avg ${a.avg.toFixed(2)})`,
        link: a.priceReport?.productId?._id ? `/products/${a.priceReport.productId._id}` : '/dashboard',
        icon: dir === 'up' ? '📈' : '📉',
        accent: dir === 'up' ? '#fee2e2' : '#dcfce7',
        at: Date.now(),
      })
    }

    function onListing(l) {
      const vendor = l.vendorId?.name || 'A vendor'
      const where = [l.area, l.district].filter(Boolean).join(', ')
      pushItem({
        id: uid(),
        kind: 'listing',
        refId: l._id,
        title: `New listing: ${l.title}`,
        body: `${vendor} listed ${l.price}/${l.unit}${where ? ` in ${where}` : ''}`,
        link: '/marketplace',
        icon: '🛒',
        accent: '#ecfccb',
        at: Date.now(),
      })
    }

    socket.on('price:spike', onSpike)
    socket.on('listing:new', onListing)

    return () => {
      socket.off('price:spike', onSpike)
      socket.off('listing:new', onListing)
    }
  }, [])

  function handleOpen(o) {
    setOpened(o)
    if (o) setUnread(0)
  }

  function clearAll() {
    setItems([])
    seen.current = new Set()
    setUnread(0)
  }

  const grouped = useMemo(() => items, [items])

  return (
    <Popover
      opened={opened}
      onChange={handleOpen}
      position="bottom-end"
      width={340}
      shadow="xl"
      radius="lg"
      withArrow
    >
      <Popover.Target>
        <Indicator
          inline
          label={unread > 9 ? '9+' : unread}
          size={16}
          color="lime"
          disabled={unread === 0}
          offset={4}
          styles={{ indicator: { color: '#0b3d2e', fontWeight: 700 } }}
        >
          <ActionIcon
            variant="subtle"
            size="lg"
            radius="xl"
            onClick={() => handleOpen(!opened)}
            aria-label="Notifications"
            style={{ color: '#fff' }}
          >
            <span style={{ fontSize: 18 }}>🔔</span>
          </ActionIcon>
        </Indicator>
      </Popover.Target>
      <Popover.Dropdown p={0} style={{ overflow: 'hidden' }}>
        <Group justify="space-between" align="center" p="sm" style={{ background: '#fbfdf6', borderBottom: '1px solid #ecfccb' }}>
          <Group gap={6}>
            <Text fw={700} c="forest.7">Alerts</Text>
            {items.length > 0 && (
              <Badge color="forest" variant="light" radius="xl" size="sm">{items.length}</Badge>
            )}
          </Group>
          {items.length > 0 && (
            <Button variant="subtle" color="forest" size="xs" radius="xl" onClick={clearAll}>
              Clear
            </Button>
          )}
        </Group>
        <Box style={{ maxHeight: 380, overflowY: 'auto' }}>
          {items.length === 0 ? (
            <Stack align="center" gap={6} py="lg">
              <Box style={{ fontSize: 32 }}>🟢</Box>
              <Text size="sm" fw={600} c="forest.7">All quiet.</Text>
              <Text size="xs" c="dimmed" ta="center" maw={240}>
                You'll see alerts here when vendors list products or prices spike or drop.
              </Text>
            </Stack>
          ) : (
            <Stack gap={0}>
              {grouped.map((n) => (
                <Box
                  key={n.id}
                  component={Link}
                  to={n.link}
                  onClick={() => setOpened(false)}
                  style={{
                    display: 'block',
                    textDecoration: 'none',
                    color: 'inherit',
                    padding: '10px 12px',
                    borderBottom: '1px solid #f1f5f0',
                    background: `linear-gradient(90deg, ${n.accent} 0%, #ffffff 35%)`,
                    transition: 'background 120ms ease',
                  }}
                >
                  <Group gap={10} align="flex-start" wrap="nowrap">
                    <Box style={{ fontSize: 22, lineHeight: 1.1 }}>{n.icon}</Box>
                    <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                      <Text size="sm" fw={700} c="forest.7" lineClamp={1}>{n.title}</Text>
                      <Text size="xs" c="dimmed" lineClamp={2}>{n.body}</Text>
                      <Text size="xs" c="forest.6">{timeAgo(n.at)}</Text>
                    </Stack>
                  </Group>
                </Box>
              ))}
            </Stack>
          )}
        </Box>
      </Popover.Dropdown>
    </Popover>
  )
}
