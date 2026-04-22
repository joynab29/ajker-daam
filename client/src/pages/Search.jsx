import { useEffect, useState } from 'react'
import { api } from '../api.js'

export default function Search() {
  const [products, setProducts] = useState([])
  const [productId, setProductId] = useState('')
  const [area, setArea] = useState('')
  const [district, setDistrict] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])

  useEffect(() => {
    api('/products').then((d) => setProducts(d.products))
  }, [])

  async function search(e) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (productId) params.set('productId', productId)
    if (area) params.set('area', area)
    if (district) params.set('district', district)
    if (minPrice) params.set('minPrice', minPrice)
    if (maxPrice) params.set('maxPrice', maxPrice)
    if (q) params.set('q', q)
    const data = await api('/prices?' + params.toString())
    setResults(data.prices)
  }

  return (
    <div>
      <h1>Search prices</h1>
      <form onSubmit={search} style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(2, 1fr)', maxWidth: 600 }}>
        <select value={productId} onChange={(e) => setProductId(e.target.value)}>
          <option value="">— any product —</option>
          {products.map((p) => (
            <option key={p._id} value={p._id}>{p.name}</option>
          ))}
        </select>
        <input placeholder="search product name" value={q} onChange={(e) => setQ(e.target.value)} />
        <input placeholder="area" value={area} onChange={(e) => setArea(e.target.value)} />
        <input placeholder="district" value={district} onChange={(e) => setDistrict(e.target.value)} />
        <input type="number" placeholder="min price" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
        <input type="number" placeholder="max price" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
        <button type="submit" style={{ gridColumn: '1 / -1' }}>Search</button>
      </form>

      <h2>Results ({results.length})</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {results.map((p) => (
          <li key={p._id} style={{ borderBottom: '1px solid #eee', padding: '6px 0' }}>
            <strong>{p.productId?.name}</strong> — {p.price} / {p.unit} — {[p.area, p.district].filter(Boolean).join(', ') || 'unknown'}
          </li>
        ))}
      </ul>
    </div>
  )
}
