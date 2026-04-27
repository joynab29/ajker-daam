import { useEffect, useState } from 'react'
import { Title, Select, Table, Text, Group, Paper, Badge } from '@mantine/core'
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend, ReferenceLine } from 'recharts'
import { api } from '../api.js'

export default function History() {
  const [products, setProducts] = useState([])
  const [productId, setProductId] = useState('')
  const [history, setHistory] = useState([])
  const [listingSummary, setListingSummary] = useState({ count: 0 })
  const [days, setDays] = useState('30')

  useEffect(() => {
    api('/products').then((d) => {
      setProducts(d.products)
      if (d.products[0]) setProductId(d.products[0]._id)
    })
  }, [])

  useEffect(() => {
    if (!productId) return
    api(`/prices/history?productId=${productId}&days=${days}`).then((d) => {
      setHistory(d.history)
      setListingSummary(d.listing_summary || { count: 0 })
    })
  }, [productId, days])

  const reportsAvg =
    history.length > 0
      ? history.reduce((s, r) => s + r.avg, 0) / history.length
      : null
  const markupPct =
    listingSummary.count > 0 && reportsAvg
      ? ((listingSummary.avg - reportsAvg) / reportsAvg) * 100
      : null

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

      {(listingSummary.count > 0 || reportsAvg != null) && (
        <Paper withBorder p="sm" radius="md" mb="md">
          <Group gap="lg" wrap="wrap">
            <div>
              <Text size="xs" c="dimmed">Reports avg ({days}d)</Text>
              <Text fw={600}>{reportsAvg != null ? reportsAvg.toFixed(2) : '—'}</Text>
            </div>
            <div>
              <Text size="xs" c="dimmed">Vendor asking avg ({listingSummary.count} listings)</Text>
              <Text fw={600}>{listingSummary.count > 0 ? listingSummary.avg.toFixed(2) : '—'}</Text>
            </div>
            {markupPct != null && (
              <div>
                <Text size="xs" c="dimmed">Vendor markup vs reports</Text>
                <Badge variant="light" color={markupPct > 5 ? 'red' : markupPct < -5 ? 'green' : 'gray'} size="lg">
                  {markupPct > 0 ? '+' : ''}{markupPct.toFixed(0)}%
                </Badge>
              </div>
            )}
          </Group>
        </Paper>
      )}

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
                <Line type="monotone" dataKey="avg" stroke="#166534" name="reports avg" />
                <Line type="monotone" dataKey="min" stroke="#15803d" name="reports min" />
                <Line type="monotone" dataKey="max" stroke="#4ade80" name="reports max" />
                {listingSummary.count > 0 && (
                  <ReferenceLine
                    y={listingSummary.avg}
                    stroke="#dc2626"
                    strokeDasharray="6 4"
                    label={{ value: `vendor avg ${listingSummary.avg.toFixed(2)}`, position: 'right', fill: '#dc2626', fontSize: 12 }}
                  />
                )}
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
