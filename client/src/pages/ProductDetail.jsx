import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Title, Text, Image, Table, Anchor, Alert, Loader, Badge, Paper, Group } from '@mantine/core'
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, ReferenceLine } from 'recharts'
import { api } from '../api.js'

const SERVER = 'http://localhost:4000'

export default function ProductDetail() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [prices, setPrices] = useState([])
  const [listings, setListings] = useState([])
  const [err, setErr] = useState('')

  useEffect(() => {
    api(`/products/${id}`).then((d) => setProduct(d.product)).catch((e) => setErr(e.message))
    api(`/prices?productId=${id}`).then((d) => setPrices(d.prices)).catch(() => {})
    api(`/listings?productId=${id}`).then((d) => setListings(d.listings)).catch(() => {})
  }, [id])

  const reportAvg = useMemo(() => {
    if (prices.length === 0) return null
    return prices.reduce((s, p) => s + p.price, 0) / prices.length
  }, [prices])

  const listingAvg = useMemo(() => {
    if (listings.length === 0) return null
    return listings.reduce((s, l) => s + l.price, 0) / listings.length
  }, [listings])

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

      {(reportAvg != null || listingAvg != null) && (
        <Paper withBorder p="sm" radius="md" mb="md">
          <Group gap="lg" wrap="wrap">
            <div>
              <Text size="xs" c="dimmed">Reports avg ({prices.length})</Text>
              <Text fw={600}>{reportAvg != null ? reportAvg.toFixed(2) : '—'}</Text>
            </div>
            <div>
              <Text size="xs" c="dimmed">Vendor asking avg ({listings.length})</Text>
              <Text fw={600}>{listingAvg != null ? listingAvg.toFixed(2) : '—'}</Text>
            </div>
            {reportAvg != null && listingAvg != null && reportAvg > 0 && (
              <div>
                <Text size="xs" c="dimmed">Vendor markup</Text>
                <Badge variant="light" color={listingAvg > reportAvg * 1.05 ? 'red' : listingAvg < reportAvg * 0.95 ? 'green' : 'gray'} size="lg">
                  {((listingAvg - reportAvg) / reportAvg * 100).toFixed(0)}%
                </Badge>
              </div>
            )}
          </Group>
        </Paper>
      )}

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
                <Line type="monotone" dataKey="price" stroke="#0b3d2e" strokeWidth={2.5} name="reports" />
                {listingAvg != null && (
                  <ReferenceLine
                    y={listingAvg}
                    stroke="#dc2626"
                    strokeDasharray="6 4"
                    label={{ value: `vendor avg ${listingAvg.toFixed(2)}`, position: 'right', fill: '#dc2626', fontSize: 12 }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      <Title order={2} mt="md" mb="xs">Vendor listings</Title>
      {listings.length === 0 ? (
        <Text mt="sm">No vendor listings yet.</Text>
      ) : (
        <Table mt="sm" striped withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Vendor</Table.Th>
              <Table.Th ta="right">Asking</Table.Th>
              <Table.Th>Where</Table.Th>
              <Table.Th>Contact</Table.Th>
              <Table.Th ta="right">vs reports</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {listings.map((l) => {
              const pct = reportAvg && reportAvg > 0 ? ((l.price - reportAvg) / reportAvg) * 100 : null
              return (
                <Table.Tr key={l._id}>
                  <Table.Td>{l.vendorId?.name || '—'}</Table.Td>
                  <Table.Td ta="right">{l.price} / {l.unit}</Table.Td>
                  <Table.Td>{[l.area, l.district].filter(Boolean).join(', ') || '—'}</Table.Td>
                  <Table.Td>{l.contact || '—'}</Table.Td>
                  <Table.Td ta="right">
                    {pct == null ? (
                      '—'
                    ) : (
                      <Badge variant="light" color={pct > 5 ? 'red' : pct < -5 ? 'green' : 'gray'}>
                        {pct > 0 ? '+' : ''}{pct.toFixed(0)}%
                      </Badge>
                    )}
                  </Table.Td>
                </Table.Tr>
              )
            })}
          </Table.Tbody>
        </Table>
      )}

      <Title order={2} mt="md" mb="xs">Reported prices</Title>
      <Anchor component={Link} to={`/submit?productId=${id}`}>+ Submit a price</Anchor>
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
