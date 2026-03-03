import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts'
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

  const chartData = [...prices]
    .reverse()
    .map((p) => ({
      time: new Date(p.createdAt).toLocaleDateString(),
      price: p.price,
    }))

  return (
    <div>
      <h1>{product.name}</h1>
      <p>Unit: {product.unit}</p>
      {product.imageUrl && <img src={product.imageUrl} alt={product.name} style={{ maxWidth: 400 }} />}

      {chartData.length > 1 && (
        <>
          <h2>Trend</h2>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="price" stroke="#0e3d2f" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

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
