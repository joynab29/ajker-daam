import { useEffect, useState } from 'react'
import { api, apiUpload } from '../api.js'
import { useAuth } from '../AuthContext.jsx'

const SERVER = 'http://localhost:4000'

export default function Marketplace() {
  const { user } = useAuth()
  const [listings, setListings] = useState([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [unit, setUnit] = useState('kg')
  const [quantityAvailable, setQty] = useState('')
  const [area, setArea] = useState('')
  const [district, setDistrict] = useState('')
  const [contact, setContact] = useState('')
  const [photo, setPhoto] = useState(null)
  const [err, setErr] = useState('')

  function load() {
    api('/listings').then((d) => setListings(d.listings))
  }

  useEffect(() => {
    load()
  }, [])

  async function add(e) {
    e.preventDefault()
    setErr('')
    const fd = new FormData()
    fd.append('title', title)
    fd.append('description', description)
    fd.append('price', price)
    fd.append('unit', unit)
    fd.append('quantityAvailable', quantityAvailable)
    fd.append('area', area)
    fd.append('district', district)
    fd.append('contact', contact)
    if (photo) fd.append('photo', photo)
    try {
      await apiUpload('/listings', fd)
      setTitle('')
      setDescription('')
      setPrice('')
      setQty('')
      setContact('')
      setPhoto(null)
      load()
    } catch (e) {
      setErr(e.message)
    }
  }

  async function remove(id) {
    if (!confirm('Delete this listing?')) return
    await api(`/listings/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div>
      <h1>Farmer Marketplace</h1>

      {user?.role === 'farmer' && (
        <>
          <h2>Post a listing</h2>
          <form onSubmit={add} style={{ display: 'grid', gap: 8, maxWidth: 500 }}>
            <input placeholder="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <textarea placeholder="description" value={description} onChange={(e) => setDescription(e.target.value)} />
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="number" step="0.01" placeholder="price" value={price} onChange={(e) => setPrice(e.target.value)} required style={{ flex: 1 }} />
              <input placeholder="unit" value={unit} onChange={(e) => setUnit(e.target.value)} style={{ width: 100 }} />
              <input type="number" placeholder="qty available" value={quantityAvailable} onChange={(e) => setQty(e.target.value)} style={{ flex: 1 }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input placeholder="area" value={area} onChange={(e) => setArea(e.target.value)} style={{ flex: 1 }} />
              <input placeholder="district" value={district} onChange={(e) => setDistrict(e.target.value)} style={{ flex: 1 }} />
            </div>
            <input placeholder="contact (phone/email)" value={contact} onChange={(e) => setContact(e.target.value)} />
            <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files[0])} />
            <button type="submit">Post listing</button>
          </form>
          {err && <p style={{ color: 'red' }}>{err}</p>}
        </>
      )}

      <h2>All listings</h2>
      {listings.length === 0 ? (
        <p>No listings yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {listings.map((l) => (
            <li key={l._id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
              {l.imageUrl && <img src={SERVER + l.imageUrl} alt={l.title} style={{ width: '100%', height: 140, objectFit: 'cover' }} />}
              <h3>{l.title}</h3>
              <p>{l.price} / {l.unit} {l.quantityAvailable ? `(${l.quantityAvailable} avail)` : ''}</p>
              {l.description && <p>{l.description}</p>}
              <p><small>{[l.area, l.district].filter(Boolean).join(', ')}</small></p>
              <p><small>By {l.farmerId?.name}{l.contact && ` — ${l.contact}`}</small></p>
              {(user?.id === l.farmerId?._id || user?.role === 'admin') && (
                <button onClick={() => remove(l._id)}>Delete</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
