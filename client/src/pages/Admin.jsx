import { useEffect, useState } from 'react'
import { api } from '../api.js'

export default function Admin() {
  const [tab, setTab] = useState('overview')
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [products, setProducts] = useState([])
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('kg')
  const [category, setCategory] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [err, setErr] = useState('')

  function loadProducts() {
    api('/products').then((d) => setProducts(d.products)).catch((e) => setErr(e.message))
  }
  function loadStats() {
    api('/admin/stats').then(setStats).catch((e) => setErr(e.message))
  }
  function loadUsers() {
    api('/admin/users').then((d) => setUsers(d.users)).catch((e) => setErr(e.message))
  }

  useEffect(() => {
    loadProducts()
    loadStats()
    loadUsers()
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
      setCategory('')
      setImageUrl('')
      loadProducts()
    } catch (e) {
      setErr(e.message)
    }
  }

  async function removeProduct(id) {
    if (!confirm('Delete this product?')) return
    await api(`/products/${id}`, { method: 'DELETE' })
    loadProducts()
  }

  async function removeUser(id) {
    if (!confirm('Delete this user?')) return
    await api(`/admin/users/${id}`, { method: 'DELETE' })
    loadUsers()
  }

  return (
    <div>
      <h1>Admin</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={() => setTab('overview')} disabled={tab === 'overview'}>Overview</button>
        <button onClick={() => setTab('products')} disabled={tab === 'products'}>Products</button>
        <button onClick={() => setTab('users')} disabled={tab === 'users'}>Users</button>
      </div>
      {err && <p style={{ color: 'red' }}>{err}</p>}

      {tab === 'overview' && stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          <Card label="Users" value={stats.users} />
          <Card label="Products" value={stats.products} />
          <Card label="Reports" value={stats.prices} />
          <Card label="Anomalies" value={stats.anomalies} />
          <Card label="Flagged" value={stats.flagged} />
        </div>
      )}

      {tab === 'products' && (
        <>
          <form onSubmit={add} style={{ display: 'grid', gap: 8, maxWidth: 400 }}>
            <input placeholder="name" value={name} onChange={(e) => setName(e.target.value)} required />
            <input placeholder="unit (e.g. kg, L, dozen)" value={unit} onChange={(e) => setUnit(e.target.value)} />
            <input placeholder="category" value={category} onChange={(e) => setCategory(e.target.value)} />
            <input placeholder="image URL" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
            <button type="submit">Add product</button>
          </form>
          <h2>Existing</h2>
          <ul>
            {products.map((p) => (
              <li key={p._id}>
                {p.name} (per {p.unit}) {p.category && `— ${p.category}`}{' '}
                <button onClick={() => removeProduct(p._id)}>Delete</button>
              </li>
            ))}
          </ul>
        </>
      )}

      {tab === 'users' && (
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Name</th>
              <th style={{ textAlign: 'left' }}>Email</th>
              <th style={{ textAlign: 'left' }}>Role</th>
              <th style={{ textAlign: 'left' }}>Joined</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id} style={{ borderBottom: '1px solid #eee' }}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                <td><button onClick={() => removeUser(u._id)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function Card({ label, value }) {
  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 12, color: '#666' }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 'bold', color: 'var(--green)' }}>{value}</div>
    </div>
  )
}
