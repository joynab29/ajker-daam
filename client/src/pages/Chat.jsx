import { useEffect, useRef, useState } from 'react'
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
      <h1>Community chat</h1>
      <div ref={listRef} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, height: 360, overflowY: 'auto' }}>
        {messages.map((m) => (
          <div key={m.id} style={{ marginBottom: 6 }}>
            <strong style={{ color: 'var(--green)' }}>{m.name}</strong>{' '}
            <small>({m.role})</small>: {m.text}
          </div>
        ))}
      </div>
      {user ? (
        <form onSubmit={send} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input style={{ flex: 1 }} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message..." />
          <button type="submit">Send</button>
        </form>
      ) : (
        <p>Login to send messages.</p>
      )}
    </div>
  )
}
