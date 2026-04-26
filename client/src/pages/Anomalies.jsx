import { useEffect, useState } from 'react'
import { Title, Text, Table, Button } from '@mantine/core'
import { api } from '../api.js'
import { useAuth } from '../AuthContext.jsx'

export default function Anomalies() {
  const [items, setItems] = useState([])
  const { user } = useAuth()

  function load() {
    api('/prices/anomalies').then((d) => setItems(d.items))
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
      <Text mb="md">Reports that deviate &gt;20% from the 7-day average.</Text>
      {items.length === 0 ? (
        <Text>No anomalies yet.</Text>
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
    </div>
  )
}
