import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api.js'

const SERVER = 'http://localhost:4000'

export default function ProductDetail() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [prices, setPrices] = useState([])
  const [err, setErr] = useState('')

  useEffect(() => {
    api(`/products/${id}`).then((d) => setProduct(d.product)).catch((e) => setErr(e.message))
    api(`/prices?productId=${id}`).then((d) => setPrices(d.prices)).catch(() => {})
  }, [id])

  if (err) return <p style={{ color: 'red' }}>{err}</p>
  if (!product) return <p>Loading...</p>

  return (
    <div>
      <h1>{product.name}</h1>
      <p>Unit: {product.unit}</p>
      {product.imageUrl && <img src={product.imageUrl} alt={product.name} style={{ maxWidth: 400 }} />}

      <h2>Reported prices</h2>
      <p><Link to="/submit">+ Submit a price</Link></p>
      {prices.length === 0 ? (
        <p>No reports yet.</p>
      ) : (
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Price</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Where</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>By</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>When</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Photo</th>
            </tr>
          </thead>
          <tbody>
            {prices.map((p) => (
              <tr key={p._id}>
                <td>{p.price} / {p.unit}</td>
                <td>{[p.area, p.district].filter(Boolean).join(', ') || '—'}</td>
                <td>{p.userId?.name} ({p.source})</td>
                <td>{new Date(p.createdAt).toLocaleString()}</td>
                <td>{p.photoUrl && <a href={SERVER + p.photoUrl} target="_blank">view</a>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
