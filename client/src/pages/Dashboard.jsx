import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { socket } from '../socket.js'

export default function Dashboard() {
  const [prices, setPrices] = useState([])
  const [alerts, setAlerts] = useState([])

  useEffect(() => {
    api('/prices').then((d) => setPrices(d.prices))
    socket.connect()
    socket.on('price:new', (p) => {
      setPrices((prev) => [p, ...prev].slice(0, 100))
    })
    socket.on('price:spike', (a) => {
      setAlerts((prev) => [a, ...prev].slice(0, 10))
    })
    return () => {
      socket.off('price:new')
      socket.off('price:spike')
      socket.disconnect()
    }
  }, [])

  return (
    <div>
      <h1>Live price feed</h1>
      <p>New submissions appear here in real time.</p>

      {alerts.length > 0 && (
        <div style={{ background: '#fff4d6', border: '1px solid #e6c200', padding: 12, borderRadius: 8, marginBottom: 12 }}>
          <strong>Price spike alerts</strong>
          <ul style={{ margin: '4px 0 0 0', padding: 0, listStyle: 'none' }}>
            {alerts.map((a, i) => (
              <li key={i}>
                {a.priceReport.productId?.name}: {a.priceReport.price} (
                {a.direction === 'up' ? '+' : ''}
                {(a.change * 100).toFixed(0)}% vs 7-day avg {a.avg.toFixed(2)})
              </li>
            ))}
          </ul>
        </div>
      )}

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
