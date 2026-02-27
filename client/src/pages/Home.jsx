import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'

export default function Home() {
  const [products, setProducts] = useState([])
  const [err, setErr] = useState('')

  useEffect(() => {
    api('/products')
      .then((d) => setProducts(d.products))
      .catch((e) => setErr(e.message))
  }, [])

  return (
    <div>
      <h1>Products</h1>
      {err && <p style={{ color: 'red' }}>{err}</p>}
      {products.length === 0 ? (
        <p>No products yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {products.map((p) => (
            <li key={p._id} style={{ border: '1px solid #ddd', padding: 12, borderRadius: 8 }}>
              {p.imageUrl && <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: 100, objectFit: 'cover' }} />}
              <h3>{p.name}</h3>
              <p>per {p.unit}</p>
              <Link to={`/products/${p._id}`}>View prices →</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
