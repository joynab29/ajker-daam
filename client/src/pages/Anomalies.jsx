import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { useAuth } from '../AuthContext.jsx'

export default function Anomalies() {
  const [items, setItems] = useState([])
  const { user } = useAuth()

  function load() {
    api('/prices/anomalies').then((d) => setItems(d.items))
  }

  useEffect(() => {
    load()
  }, [])

  async function setStatus(id, status) {
    await api(`/prices/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    })
    load()
  }

  return (
    <div>
      <h1>Anomalies</h1>
      <p>Reports that deviate &gt;20% from the 7-day average.</p>
      {items.length === 0 ? (
        <p>No anomalies yet.</p>
      ) : (
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>When</th>
              <th style={{ textAlign: 'left' }}>Product</th>
              <th style={{ textAlign: 'right' }}>Price</th>
              <th style={{ textAlign: 'left' }}>Reason</th>
              <th style={{ textAlign: 'left' }}>By</th>
              <th style={{ textAlign: 'left' }}>Status</th>
              {user?.role === 'admin' && <th></th>}
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p._id} style={{ borderBottom: '1px solid #eee', background: p.status === 'flagged' ? '#ffe8e8' : 'transparent' }}>
                <td>{new Date(p.createdAt).toLocaleString()}</td>
                <td>{p.productId?.name}</td>
                <td style={{ textAlign: 'right' }}>{p.price} / {p.unit}</td>
                <td>{p.anomalyReason}</td>
                <td>{p.userId?.name} ({p.source})</td>
                <td>{p.status}</td>
                {user?.role === 'admin' && (
                  <td>
                    {p.status === 'flagged' ? (
                      <button onClick={() => setStatus(p._id, 'ok')}>Unflag</button>
                    ) : (
                      <button onClick={() => setStatus(p._id, 'flagged')}>Flag as fraud</button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
