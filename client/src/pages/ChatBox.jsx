import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Title, Paper, TextInput, Button, Group, Text, Stack, Select, Badge, Box, Alert } from '@mantine/core'
import { api } from '../api.js'
import { socket } from '../socket.js'
import { useAuth } from '../AuthContext.jsx'

export default function ChatBox() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const peerId = params.get('to') || ''

  const [users, setUsers] = useState([])
  const [threads, setThreads] = useState([])
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [err, setErr] = useState('')
  const listRef = useRef(null)

  useEffect(() => {
    if (!user) return
    socket.connect()
    return () => {
      socket.disconnect()
    }
  }, [user])

  useEffect(() => {
    if (!user) return
    api('/chat/users').then((d) => setUsers(d.users)).catch(() => {})
    refreshThreads()
  }, [user])

  function refreshThreads() {
    api('/chat/threads').then((d) => setThreads(d.threads)).catch(() => {})
  }

  useEffect(() => {
    if (!user) return
    function onDm(m) {
      const involvesPeer =
        peerId && (m.senderId === peerId || m.receiverId === peerId)
      if (involvesPeer) {
        setMessages((prev) => [...prev, m])
        if (m.senderId === peerId) {
          socket.emit('chat:dm:read', { from: peerId })
        }
      }
      refreshThreads()
    }
    function onRead({ by }) {
      if (by === peerId) {
        setMessages((prev) => prev.map((m) => (m.senderId === user.id ? { ...m, isRead: true } : m)))
      }
    }
    socket.on('chat:dm:msg', onDm)
    socket.on('chat:dm:read', onRead)
    return () => {
      socket.off('chat:dm:msg', onDm)
      socket.off('chat:dm:read', onRead)
    }
  }, [user, peerId])

  useEffect(() => {
    if (!peerId || !user) {
      setMessages([])
      return
    }
    api(`/chat/history/${peerId}`).then((d) => {
      setMessages(d.messages)
      socket.emit('chat:dm:read', { from: peerId })
      refreshThreads()
    }).catch((e) => setErr(e.message))
  }, [peerId, user])

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages])

  const peer = useMemo(() => users.find((u) => u._id === peerId), [users, peerId])

  function pickPeer(id) {
    setErr('')
    setParams(id ? { to: id } : {})
  }

  function send(e) {
    e.preventDefault()
    if (!text.trim() || !peerId) return
    socket.emit('chat:dm:send', { to: peerId, text: text.trim() }, (resp) => {
      if (resp?.error) setErr(resp.error)
    })
    setText('')
  }

  if (!user) {
    return <Alert color="green">Login to start a chat.</Alert>
  }

  const userOptions = users.map((u) => ({ value: u._id, label: `${u.name} (${u.role})` }))

  return (
    <div>
      <Title order={1} mb="md">Direct messages</Title>
      <Group align="flex-start" gap="md" wrap="wrap">
        <Paper withBorder p="sm" radius="md" w={260}>
          <Title order={4} mb="xs">Conversations</Title>
          <Select
            placeholder="Start chat with…"
            data={userOptions}
            value={peerId || null}
            onChange={pickPeer}
            searchable
            clearable
            mb="sm"
          />
          <Stack gap={4}>
            {threads.length === 0 && <Text size="sm" c="dimmed">No conversations yet.</Text>}
            {threads.map((t) => t.user && (
              <Box
                key={t.user._id}
                onClick={() => pickPeer(t.user._id)}
                style={{
                  cursor: 'pointer',
                  padding: 6,
                  borderRadius: 6,
                  background: t.user._id === peerId ? '#dcfce7' : 'transparent',
                }}
              >
                <Group justify="space-between" gap={4} wrap="nowrap">
                  <Text size="sm" fw={600} truncate>{t.user.name}</Text>
                  {t.unread > 0 && <Badge size="xs" color="green">{t.unread}</Badge>}
                </Group>
                <Text size="xs" c="dimmed" truncate>{t.lastMessage}</Text>
              </Box>
            ))}
          </Stack>
        </Paper>

        <Paper withBorder p="sm" radius="md" style={{ flex: 1, minWidth: 280 }}>
          {!peerId ? (
            <Text c="dimmed">Pick a user to start chatting.</Text>
          ) : (
            <>
              <Title order={4} mb="xs">
                {peer ? `${peer.name} (${peer.role})` : 'Conversation'}
              </Title>
              <Box ref={listRef} h={360} style={{ overflowY: 'auto', padding: 4 }}>
                <Stack gap={6}>
                  {messages.map((m) => {
                    const mine = m.senderId === user.id
                    return (
                      <Box
                        key={m._id}
                        style={{
                          alignSelf: mine ? 'flex-end' : 'flex-start',
                          background: mine ? '#bbf7d0' : '#f1f5f9',
                          borderRadius: 8,
                          padding: '6px 10px',
                          maxWidth: '75%',
                        }}
                      >
                        <Text size="sm">{m.message}</Text>
                        <Text size="xs" c="dimmed" ta="right">
                          {new Date(m.createdAt).toLocaleTimeString()}
                          {mine && (m.isRead ? ' · read' : ' · sent')}
                        </Text>
                      </Box>
                    )
                  })}
                </Stack>
              </Box>
              <form onSubmit={send}>
                <Group gap="xs" mt="sm">
                  <TextInput
                    style={{ flex: 1 }}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type a message…"
                  />
                  <Button type="submit">Send</Button>
                </Group>
              </form>
              {err && <Alert color="red" mt="sm">{err}</Alert>}
            </>
          )}
        </Paper>
      </Group>
    </div>
  )
}
