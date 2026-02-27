import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api.js'

export default function ProductDetail() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    api(`/products/${id}`)
      .then((d) => setProduct(d.product))
      .catch((e) => setErr(e.message))
  }, [id])

  if (err) return <p style={{ color: 'red' }}>{err}</p>
  if (!product) return <p>Loading...</p>

  return (
    <div>
      <h1>{product.name}</h1>
      <p>Unit: {product.unit}</p>
      {product.category && <p>Category: {product.category}</p>}
      {product.imageUrl && <img src={product.imageUrl} alt={product.name} style={{ maxWidth: 400 }} />}
    </div>
  )
}
