import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, apiUpload } from '../api.js'
import { useAuth } from '../AuthContext.jsx'

export default function Submit() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [products, setProducts] = useState([])
  const [productId, setProductId] = useState('')
  const [price, setPrice] = useState('')
  const [unit, setUnit] = useState('kg')
  const [area, setArea] = useState('')
  const [district, setDistrict] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [photo, setPhoto] = useState(null)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')

  useEffect(() => {
    api('/products').then((d) => {
      setProducts(d.products)
      if (d.products[0]) setProductId(d.products[0]._id)
    })
  }, [])

  function getLocation() {
    if (!navigator.geolocation) return setErr('geolocation not supported')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(pos.coords.latitude))
        setLng(String(pos.coords.longitude))
      },
      () => setErr('could not get location')
    )
  }

  async function submit(e) {
    e.preventDefault()
    setErr('')
    setOk('')
    if (!user) return setErr('login first')
    const fd = new FormData()
    fd.append('productId', productId)
    fd.append('price', price)
    fd.append('unit', unit)
    fd.append('area', area)
    fd.append('district', district)
    if (lat) fd.append('lat', lat)
    if (lng) fd.append('lng', lng)
    if (photo) fd.append('photo', photo)
    try {
      await apiUpload('/prices', fd)
      setOk('Submitted!')
      setPrice('')
      setPhoto(null)
      setTimeout(() => nav(`/products/${productId}`), 800)
    } catch (e) {
      setErr(e.message)
    }
  }

  if (!user) return <p>Please <a href="/login">login</a> first.</p>

  return (
    <div>
      <h1>Submit a price</h1>
      <form onSubmit={submit} style={{ display: 'grid', gap: 8, maxWidth: 400 }}>
        <select value={productId} onChange={(e) => setProductId(e.target.value)} required>
          {products.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name} (per {p.unit})
            </option>
          ))}
        </select>
        <input type="number" step="0.01" placeholder="price" value={price} onChange={(e) => setPrice(e.target.value)} required />
        <input placeholder="unit (kg, L, dozen)" value={unit} onChange={(e) => setUnit(e.target.value)} />
        <input placeholder="area (e.g. Mirpur)" value={area} onChange={(e) => setArea(e.target.value)} />
        <input placeholder="district (e.g. Dhaka)" value={district} onChange={(e) => setDistrict(e.target.value)} />
        <div style={{ display: 'flex', gap: 8 }}>
          <input placeholder="lat" value={lat} onChange={(e) => setLat(e.target.value)} style={{ flex: 1 }} />
          <input placeholder="lng" value={lng} onChange={(e) => setLng(e.target.value)} style={{ flex: 1 }} />
          <button type="button" onClick={getLocation}>Use my location</button>
        </div>
        <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files[0])} />
        <button type="submit">Submit price</button>
      </form>
      {err && <p style={{ color: 'red' }}>{err}</p>}
      {ok && <p style={{ color: 'green' }}>{ok}</p>}
    </div>
  )
}
