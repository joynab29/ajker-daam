import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from 'recharts'
import { api } from '../api.js'

export default function History() {
  const [products, setProducts] = useState([])
  const [productId, setProductId] = useState('')
  const [history, setHistory] = useState([])
  const [days, setDays] = useState(30)

  useEffect(() => {
    api('/products').then((d) => {
      setProducts(d.products)
      if (d.products[0]) setProductId(d.products[0]._id)
    })
  }, [])

  useEffect(() => {
    if (!productId) return
    api(`/prices/history?productId=${productId}&days=${days}`).then((d) => setHistory(d.history))
  }, [productId, days])

  return (
    <div>
      <h1>Price history</h1>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <select value={productId} onChange={(e) => setProductId(e.target.value)}>
          {products.map((p) => (
            <option key={p._id} value={p._id}>{p.name}</option>
          ))}
        </select>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {history.length === 0 ? (
        <p>No history.</p>
      ) : (
        <>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="avg" stroke="#0e3d2f" name="avg" />
                <Line type="monotone" dataKey="min" stroke="#5c6b63" name="min" />
                <Line type="monotone" dataKey="max" stroke="#c3e821" name="max" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <table style={{ borderCollapse: 'collapse', width: '100%', marginTop: 12 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Date</th>
                <th style={{ textAlign: 'right' }}>Avg</th>
                <th style={{ textAlign: 'right' }}>Min</th>
                <th style={{ textAlign: 'right' }}>Max</th>
                <th style={{ textAlign: 'right' }}>Reports</th>
              </tr>
            </thead>
            <tbody>
              {history.map((r) => (
                <tr key={r.date} style={{ borderBottom: '1px solid #eee' }}>
                  <td>{r.date}</td>
                  <td style={{ textAlign: 'right' }}>{r.avg.toFixed(2)}</td>
                  <td style={{ textAlign: 'right' }}>{r.min}</td>
                  <td style={{ textAlign: 'right' }}>{r.max}</td>
                  <td style={{ textAlign: 'right' }}>{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}
