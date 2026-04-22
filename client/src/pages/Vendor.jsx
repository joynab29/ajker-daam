import { useEffect, useState } from 'react'
import { api, apiUpload } from '../api.js'

export default function Vendor() {
  const [products, setProducts] = useState([])
  const [drafts, setDrafts] = useState({})
  const [area, setArea] = useState('')
  const [district, setDistrict] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    api('/products').then((d) => setProducts(d.products))
  }, [])

  function setDraft(id, field, val) {
    setDrafts((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), [field]: val } }))
  }

  async function publish(p) {
    const draft = drafts[p._id] || {}
    if (!draft.price) return
    const fd = new FormData()
    fd.append('productId', p._id)
    fd.append('price', draft.price)
    fd.append('unit', p.unit || 'kg')
    fd.append('area', area)
    fd.append('district', district)
    try {
      await apiUpload('/prices', fd)
      setMsg(`Published price for ${p.name}`)
      setDraft(p._id, 'price', '')
      setTimeout(() => setMsg(''), 1500)
    } catch (e) {
      setMsg(e.message)
    }
  }

  return (
    <div>
      <h1>Vendor — Publish Prices</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input placeholder="shop area" value={area} onChange={(e) => setArea(e.target.value)} />
        <input placeholder="shop district" value={district} onChange={(e) => setDistrict(e.target.value)} />
      </div>
      {msg && <p>{msg}</p>}
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>Product</th>
            <th style={{ textAlign: 'left' }}>Unit</th>
            <th style={{ textAlign: 'left' }}>Your price</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p._id} style={{ borderBottom: '1px solid #eee' }}>
              <td>{p.name}</td>
              <td>{p.unit}</td>
              <td>
                <input
                  type="number"
                  step="0.01"
                  value={(drafts[p._id] || {}).price || ''}
                  onChange={(e) => setDraft(p._id, 'price', e.target.value)}
                />
              </td>
              <td>
                <button onClick={() => publish(p)}>Publish</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
