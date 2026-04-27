import { useEffect, useState } from 'react'
import { Title, Text, Table, Button, Tabs, Badge } from '@mantine/core'
import { api } from '../api.js'
import { useAuth } from '../AuthContext.jsx'

export default function Anomalies() {
  const [items, setItems] = useState([])
  const [markups, setMarkups] = useState([])
  const { user } = useAuth()

  function load() {
    api('/prices/anomalies').then((d) => setItems(d.items))
    api('/prices/markups').then((d) => setMarkups(d.items))
  }

  useEffect(() => {
    load()
  }, [])

  async function setStatus(id, status) {
    await api(`/prices/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    })
    load()
  }

  return (
    <div>
      <Title order={1} mb="xs">Anomalies</Title>
      <Tabs defaultValue="reports">
        <Tabs.List>
          <Tabs.Tab value="reports">Report anomalies ({items.length})</Tabs.Tab>
          <Tabs.Tab value="markups">Vendor markups ({markups.length})</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="reports" pt="md">
          <Text mb="md">Reports that deviate &gt;20% from the 7-day average.</Text>
          {items.length === 0 ? (
            <Text>No report anomalies yet.</Text>
          ) : (
            <Table striped withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>When</Table.Th>
                  <Table.Th>Product</Table.Th>
                  <Table.Th ta="right">Price</Table.Th>
                  <Table.Th>Reason</Table.Th>
                  <Table.Th>By</Table.Th>
                  <Table.Th>Status</Table.Th>
                  {user?.role === 'admin' && <Table.Th></Table.Th>}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {items.map((p) => (
                  <Table.Tr key={p._id} style={{ background: p.status === 'flagged' ? '#ffe8e8' : 'transparent' }}>
                    <Table.Td>{new Date(p.createdAt).toLocaleString()}</Table.Td>
                    <Table.Td>{p.productId?.name}</Table.Td>
                    <Table.Td ta="right">{p.price} / {p.unit}</Table.Td>
                    <Table.Td>{p.anomalyReason}</Table.Td>
                    <Table.Td>{p.userId?.name} ({p.source})</Table.Td>
                    <Table.Td>{p.status}</Table.Td>
                    {user?.role === 'admin' && (
                      <Table.Td>
                        {p.status === 'flagged' ? (
                          <Button size="xs" variant="default" onClick={() => setStatus(p._id, 'ok')}>Unflag</Button>
                        ) : (
                          <Button size="xs" color="red" onClick={() => setStatus(p._id, 'flagged')}>Flag as fraud</Button>
                        )}
                      </Table.Td>
                    )}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="markups" pt="md">
          <Text mb="md">Marketplace listings whose asking price diverges &gt;20% from community-reported prices.</Text>
          {markups.length === 0 ? (
            <Text>No vendor markups detected.</Text>
          ) : (
            <Table striped withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Product</Table.Th>
                  <Table.Th>Vendor</Table.Th>
                  <Table.Th>Where</Table.Th>
                  <Table.Th ta="right">Listed</Table.Th>
                  <Table.Th ta="right">Reports avg</Table.Th>
                  <Table.Th ta="right">Reports</Table.Th>
                  <Table.Th ta="right">Diff</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {markups.map((m) => {
                  const pct = m.diff * 100
                  return (
                    <Table.Tr key={m.listing._id} style={{ background: pct > 0 ? '#fff1f2' : '#f0fdf4' }}>
                      <Table.Td>{m.listing.product?.name || m.listing.title}</Table.Td>
                      <Table.Td>{m.listing.vendor?.name || '—'}</Table.Td>
                      <Table.Td>{[m.listing.area, m.listing.district].filter(Boolean).join(', ') || '—'}</Table.Td>
                      <Table.Td ta="right">{m.listing.price} / {m.listing.unit}</Table.Td>
                      <Table.Td ta="right">{m.report_avg.toFixed(2)}</Table.Td>
                      <Table.Td ta="right">{m.report_count}</Table.Td>
                      <Table.Td ta="right">
                        <Badge variant="filled" color={pct > 0 ? 'red' : 'green'}>
                          {pct > 0 ? '+' : ''}{pct.toFixed(0)}%
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  )
                })}
              </Table.Tbody>
            </Table>
          )}
        </Tabs.Panel>
      </Tabs>
    </div>
  )
}
