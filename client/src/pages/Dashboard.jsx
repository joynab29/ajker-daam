import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { socket } from '../socket.js'

export default function Dashboard() {
  const [prices, setPrices] = useState([])

  useEffect(() => {
    api('/prices').then((d) => setPrices(d.prices))
    socket.connect()
    socket.on('price:new', (p) => {
      setPrices((prev) => [p, ...prev].slice(0, 100))
    })
    return () => {
      socket.off('price:new')
      socket.disconnect()
    }
  }, [])

  return (
    <div>
      <h1>Live price feed</h1>
      <p>New submissions appear here in real time.</p>
      {prices.length === 0 ? (
        <p>No reports yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {prices.map((p) => (
            <li key={p._id} style={{ borderBottom: '1px solid #eee', padding: '6px 0' }}>
              <strong>{p.productId?.name}</strong> — {p.price} / {p.unit} —{' '}
              {[p.area, p.district].filter(Boolean).join(', ') || 'unknown'} —{' '}
              {p.userId?.name} ({p.source}) —{' '}
              <small>{new Date(p.createdAt).toLocaleTimeString()}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
