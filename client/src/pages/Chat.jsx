import { useEffect, useRef, useState } from 'react'
import { Title, Paper, TextInput, Button, Group, Text, Stack } from '@mantine/core'
import { socket } from '../socket.js'
import { useAuth } from '../AuthContext.jsx'

export default function Chat() {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const listRef = useRef(null)

  useEffect(() => {
    socket.connect()
    socket.on('chat:history', (history) => setMessages(history))
    socket.on('chat:msg', (m) => setMessages((prev) => [...prev, m]))
    return () => {
      socket.off('chat:history')
      socket.off('chat:msg')
      socket.disconnect()
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

  return (
    <div>
      <Title order={1} mb="md">Community chat</Title>
      <Paper withBorder p="sm" radius="md" h={360} style={{ overflowY: 'auto' }} ref={listRef}>
        <Stack gap={4}>
          {messages.map((m) => (
            <Text key={m.id} size="sm">
              <Text span fw={600} c="blue.9">{m.name}</Text>{' '}
              <Text span size="xs" c="dimmed">({m.role})</Text>: {m.text}
            </Text>
          ))}
        </Stack>
      </Paper>
      {user ? (
        <form onSubmit={send}>
          <Group gap="xs" mt="sm">
            <TextInput style={{ flex: 1 }} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message..." />
            <Button type="submit">Send</Button>
          </Group>
        </form>
      ) : (
        <Text mt="sm">Login to send messages.</Text>
      )}
    </div>
  )
}
