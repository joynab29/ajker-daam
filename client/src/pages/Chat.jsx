import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Title,
  Paper,
  TextInput,
  Button,
  Group,
  Text,
  Stack,
  Box,
  Badge,
  ActionIcon,
} from '@mantine/core'
import { socket } from '../socket.js'
import { useAuth } from '../AuthContext.jsx'

const cardStyle = {
  background: '#fff',
  border: '1px solid rgba(11,61,46,0.08)',
  borderRadius: 22,
  boxShadow: '0 12px 30px rgba(11,61,46,0.06)',
  padding: 0,
  overflow: 'hidden',
}

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
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('') || name[0].toUpperCase()
}

function Avatar({ name, size = 32 }) {
  const [bg, fg] = AVATAR_PALETTE[hashOf(name) % AVATAR_PALETTE.length]
  return (
    <Box
      style={{
        width: size, height: size, borderRadius: 999,
        background: bg, color: fg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: size * 0.42, flex: '0 0 auto',
      }}
    >
      {initials(name)}
    </Box>
  )
}

function timeOf(at) {
  const d = new Date(at)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function dateOf(at) {
  const d = new Date(at)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return 'Today'
  const y = new Date(today); y.setDate(today.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return 'Yesterday'
  return d.toLocaleDateString()
}

export default function Chat() {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [connected, setConnected] = useState(false)
  const [totalOnline, setTotalOnline] = useState(0)
  const listRef = useRef(null)

  useEffect(() => {
    socket.connect()
    function onConnect() { setConnected(true) }
    function onDisconnect() { setConnected(false) }
    function onHistory(history) { setMessages(history) }
    function onMsg(m) { setMessages((prev) => [...prev, m]) }
    function onPresenceList({ totalOnline }) { setTotalOnline(totalOnline || 0) }
    function onPresenceUpdate() {} // handled via list refresh on next connect; community count updates not pushed per-event for simplicity

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('chat:history', onHistory)
    socket.on('chat:msg', onMsg)
    socket.on('presence:list', onPresenceList)
    socket.on('presence:update', onPresenceUpdate)

    if (socket.connected) setConnected(true)

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('chat:history', onHistory)
      socket.off('chat:msg', onMsg)
      socket.off('presence:list', onPresenceList)
      socket.off('presence:update', onPresenceUpdate)
    }
  }, [])

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages])

  function send(e) {
    e.preventDefault()
    if (!text.trim() || !user) return
    socket.emit('chat:send', { name: user.name, role: user.role, text: text.trim() })
    setText('')
  }

  const grouped = useMemo(() => {
    const groups = []
    let lastKey = null
    for (const m of messages) {
      const key = dateOf(m.at)
      if (key !== lastKey) {
        groups.push({ date: key, items: [] })
        lastKey = key
      }
      groups[groups.length - 1].items.push(m)
    }
    return groups
  }, [messages])

  return (
    <Stack gap="xl">
      <style>{`
        @keyframes pulseDot {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%      { transform: scale(1.6); opacity: 0.4; }
        }
        .live-dot { animation: pulseDot 1.4s ease-in-out infinite; }
        .bubble-mine {
          background: linear-gradient(135deg, #bef264 0%, #a3e635 100%);
          color: #0b3d2e;
          border-radius: 18px 18px 4px 18px;
        }
        .bubble-theirs {
          background: #f7fde9;
          color: #0b3d2e;
          border: 1px solid #ecfccb;
          border-radius: 18px 18px 18px 4px;
        }
      `}</style>

      <Stack gap={4}>
        <span className="section-eyebrow">Community chat</span>
        <h1 className="display" style={{ margin: 0 }}>
          The <span style={{ color: '#65a30d' }}>marketplace lobby</span>
        </h1>
        <Group gap={10} mt={4}>
          <Box className={connected ? 'live-dot' : ''} w={10} h={10} style={{ borderRadius: 999, background: connected ? '#65a30d' : '#9ca3af' }} />
          <Text size="sm" c="dimmed">
            {connected ? 'Connected' : 'Reconnecting…'}{totalOnline ? ` · ${totalOnline} online` : ''}
          </Text>
        </Group>
      </Stack>

      <Paper style={cardStyle}>
        <Box
          ref={listRef}
          style={{
            height: 480,
            overflowY: 'auto',
            padding: '20px 18px',
            background:
              'linear-gradient(180deg, #fbfdf6 0%, #ffffff 100%)',
          }}
        >
          {messages.length === 0 ? (
            <Stack align="center" justify="center" style={{ height: '100%' }} gap={6}>
              <Box style={{ fontSize: 44 }}>💬</Box>
              <Text fw={600} c="forest.7">No messages yet.</Text>
              <Text size="sm" c="dimmed">Be the first to say hello.</Text>
            </Stack>
          ) : (
            <Stack gap="md">
              {grouped.map((g) => (
                <Stack key={g.date} gap="sm">
                  <Group justify="center">
                    <Badge variant="light" color="forest" radius="xl" size="sm">
                      {g.date}
                    </Badge>
                  </Group>
                  {g.items.map((m, idx) => {
                    const mine = user && m.name === user.name
                    const prev = idx > 0 ? g.items[idx - 1] : null
                    const sameAuthor = prev && prev.name === m.name && (m.at - prev.at) < 5 * 60 * 1000
                    return (
                      <Group
                        key={m.id}
                        align="flex-end"
                        gap="xs"
                        justify={mine ? 'flex-end' : 'flex-start'}
                        wrap="nowrap"
                      >
                        {!mine && (
                          <Box style={{ width: 32, visibility: sameAuthor ? 'hidden' : 'visible' }}>
                            <Avatar name={m.name} size={32} />
                          </Box>
                        )}
                        <Stack gap={2} style={{ maxWidth: '70%' }}>
                          {!sameAuthor && (
                            <Group gap={6} justify={mine ? 'flex-end' : 'flex-start'}>
                              {!mine && <Text size="xs" fw={700} c="forest.7">{m.name}</Text>}
                              <Badge size="xs" variant="light" color={m.role === 'vendor' ? 'lime' : m.role === 'admin' ? 'red' : 'forest'} radius="xl">
                                {m.role}
                              </Badge>
                            </Group>
                          )}
                          <Box className={mine ? 'bubble-mine' : 'bubble-theirs'} style={{ padding: '8px 12px' }}>
                            <Text size="sm" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.text}</Text>
                          </Box>
                          <Text size="xs" c="dimmed" ta={mine ? 'right' : 'left'}>{timeOf(m.at)}</Text>
                        </Stack>
                        {mine && (
                          <Box style={{ width: 32, visibility: sameAuthor ? 'hidden' : 'visible' }}>
                            <Avatar name={m.name} size={32} />
                          </Box>
                        )}
                      </Group>
                    )
                  })}
                </Stack>
              ))}
            </Stack>
          )}
        </Box>

        <Box style={{ padding: 14, borderTop: '1px solid #ecfccb', background: '#fbfdf6' }}>
          {user ? (
            <form onSubmit={send}>
              <Group gap="xs" wrap="nowrap">
                <Avatar name={user.name} size={36} />
                <TextInput
                  style={{ flex: 1 }}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type a message…"
                  radius="xl"
                  size="md"
                  rightSection={
                    text ? (
                      <ActionIcon variant="subtle" onClick={() => setText('')} aria-label="clear">×</ActionIcon>
                    ) : null
                  }
                />
                <Button
                  type="submit"
                  radius="xl"
                  color="lime"
                  styles={{ root: { color: '#0b3d2e', fontWeight: 700 } }}
                  disabled={!text.trim() || !connected}
                >
                  Send
                </Button>
              </Group>
            </form>
          ) : (
            <Text size="sm" c="dimmed" ta="center">Login to send messages.</Text>
          )}
        </Box>
      </Paper>
    </Stack>
  )
}
