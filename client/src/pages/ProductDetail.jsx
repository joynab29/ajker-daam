import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Title, Text, Image, Table, Anchor, Alert, Loader } from '@mantine/core'
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

  if (err) return <Alert color="red">{err}</Alert>
  if (!product) return <Loader />

  const chartData = [...prices]
    .reverse()
    .map((p) => ({
      time: new Date(p.createdAt).toLocaleDateString(),
      price: p.price,
    }))

  return (
    <div>
      <Title order={1} mb="xs">{product.name}</Title>
      <Text mb="sm">Unit: {product.unit}</Text>
      {product.imageUrl && <Image src={product.imageUrl} alt={product.name} mah={300} w="auto" mb="md" />}

      {chartData.length > 1 && (
        <>
          <Title order={2} mt="md" mb="xs">Trend</Title>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="price" stroke="#1c3a8a" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      <Title order={2} mt="md" mb="xs">Reported prices</Title>
      <Anchor component={Link} to="/submit">+ Submit a price</Anchor>
      {prices.length === 0 ? (
        <Text mt="sm">No reports yet.</Text>
      ) : (
        <Table mt="sm" striped withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Price</Table.Th>
              <Table.Th>Where</Table.Th>
              <Table.Th>By</Table.Th>
              <Table.Th>When</Table.Th>
              <Table.Th>Photo</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {prices.map((p) => (
              <Table.Tr key={p._id}>
                <Table.Td>{p.price} / {p.unit}</Table.Td>
                <Table.Td>{[p.area, p.district].filter(Boolean).join(', ') || '—'}</Table.Td>
                <Table.Td>{p.userId?.name} ({p.source})</Table.Td>
                <Table.Td>{new Date(p.createdAt).toLocaleString()}</Table.Td>
                <Table.Td>{p.photoUrl && <Anchor href={SERVER + p.photoUrl} target="_blank">view</Anchor>}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </div>
  )
}
