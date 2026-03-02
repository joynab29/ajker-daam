import { useEffect, useState } from 'react'
import { api } from '../api.js'

export default function Compare() {
  const [products, setProducts] = useState([])
  const [productId, setProductId] = useState('')
  const [rows, setRows] = useState([])

  useEffect(() => {
    api('/products').then((d) => {
      setProducts(d.products)
      if (d.products[0]) setProductId(d.products[0]._id)
    })
  }, [])

  useEffect(() => {
    if (!productId) return
    api(`/prices/by-area?productId=${productId}`).then((d) => setRows(d.rows))
  }, [productId])

  return (
    <div>
      <h1>Compare prices by area</h1>
      <select value={productId} onChange={(e) => setProductId(e.target.value)}>
        {products.map((p) => (
          <option key={p._id} value={p._id}>{p.name}</option>
        ))}
      </select>
      {rows.length === 0 ? (
        <p>No data for this product.</p>
      ) : (
        <table style={{ borderCollapse: 'collapse', width: '100%', marginTop: 12 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Area</th>
              <th style={{ textAlign: 'left' }}>District</th>
              <th style={{ textAlign: 'right' }}>Avg</th>
              <th style={{ textAlign: 'right' }}>Min</th>
              <th style={{ textAlign: 'right' }}>Max</th>
              <th style={{ textAlign: 'right' }}>Reports</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                <td>{r.area || '—'}</td>
                <td>{r.district || '—'}</td>
                <td style={{ textAlign: 'right' }}>{r.avg.toFixed(2)}</td>
                <td style={{ textAlign: 'right' }}>{r.min}</td>
                <td style={{ textAlign: 'right' }}>{r.max}</td>
                <td style={{ textAlign: 'right' }}>{r.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
