import { useEffect, useState } from 'react'
import { Title, Select, Table, Text, Group } from '@mantine/core'
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from 'recharts'
import { api } from '../api.js'

export default function History() {
  const [products, setProducts] = useState([])
  const [productId, setProductId] = useState('')
  const [history, setHistory] = useState([])
  const [days, setDays] = useState('30')

  useEffect(() => {
    api('/products').then((d) => {
      setProducts(d.products)
      if (d.products[0]) setProductId(d.products[0]._id)
    })
  }, [])

  useEffect(() => {
    if (!productId) return
    api(`/prices/history?productId=${productId}&days=${days}`).then((d) => setHistory(d.history))
  }, [productId, days])

  return (
    <div>
      <Title order={1} mb="md">Price history</Title>
      <Group gap="sm" mb="md">
        <Select
          value={productId}
          onChange={(v) => setProductId(v || '')}
          data={products.map((p) => ({ value: p._id, label: p.name }))}
          allowDeselect={false}
          w={220}
        />
        <Select
          value={days}
          onChange={(v) => setDays(v || '30')}
          data={[
            { value: '7', label: 'Last 7 days' },
            { value: '30', label: 'Last 30 days' },
            { value: '90', label: 'Last 90 days' },
          ]}
          allowDeselect={false}
          w={180}
        />
      </Group>

      {history.length === 0 ? (
        <Text>No history.</Text>
      ) : (
        <>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="avg" stroke="#1c3a8a" name="avg" />
                <Line type="monotone" dataKey="min" stroke="#5c6b8a" name="min" />
                <Line type="monotone" dataKey="max" stroke="#38bdf8" name="max" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <Table mt="md" striped withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Date</Table.Th>
                <Table.Th ta="right">Avg</Table.Th>
                <Table.Th ta="right">Min</Table.Th>
                <Table.Th ta="right">Max</Table.Th>
                <Table.Th ta="right">Reports</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {history.map((r) => (
                <Table.Tr key={r.date}>
                  <Table.Td>{r.date}</Table.Td>
                  <Table.Td ta="right">{r.avg.toFixed(2)}</Table.Td>
                  <Table.Td ta="right">{r.min}</Table.Td>
                  <Table.Td ta="right">{r.max}</Table.Td>
                  <Table.Td ta="right">{r.count}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </>
      )}
    </div>
  )
}
