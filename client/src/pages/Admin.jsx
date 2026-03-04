import { useEffect, useState } from 'react'
import { api } from '../api.js'

export default function Admin() {
  const [products, setProducts] = useState([])
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('kg')
  const [category, setCategory] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [err, setErr] = useState('')

  function load() {
    api('/products').then((d) => setProducts(d.products)).catch((e) => setErr(e.message))
  }

  useEffect(() => {
    load()
  }, [])

  async function add(e) {
    e.preventDefault()
    setErr('')
    try {
      await api('/products', {
        method: 'POST',
        body: JSON.stringify({ name, unit, category, imageUrl }),
      })
      setName('')
      setUnit('kg')
      setCategory('')
      setImageUrl('')
      load()
    } catch (e) {
      setErr(e.message)
    }
  }

  async function remove(id) {
    if (!confirm('Delete this product?')) return
    await api(`/products/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div>
      <h1>Admin — Products</h1>
      <form onSubmit={add} style={{ display: 'grid', gap: 8, maxWidth: 400 }}>
        <input placeholder="name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input placeholder="unit (e.g. kg, L, dozen)" value={unit} onChange={(e) => setUnit(e.target.value)} />
        <input placeholder="category" value={category} onChange={(e) => setCategory(e.target.value)} />
        <input placeholder="image URL" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
        <button type="submit">Add product</button>
      </form>
      {err && <p style={{ color: 'red' }}>{err}</p>}

      <h2>Existing</h2>
      <ul>
        {products.map((p) => (
          <li key={p._id}>
            {p.name} (per {p.unit}) {p.category && `— ${p.category}`}{' '}
            <button onClick={() => remove(p._id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
