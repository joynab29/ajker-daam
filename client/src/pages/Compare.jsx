import { useEffect, useState } from 'react'
import { Title, Select, Table, Text } from '@mantine/core'
import { api } from '../api.js'

export default function Compare() {
  const [products, setProducts] = useState([])
  const [productId, setProductId] = useState('')
  const [rows, setRows] = useState([])

  useEffect(() => {
    api('/products').then((d) => {
      setProducts(d.products)
      if (d.products[0]) setProductId(d.products[0]._id)
    })
  }, [])

  useEffect(() => {
    if (!productId) return
    api(`/prices/by-area?productId=${productId}`).then((d) => setRows(d.rows))
  }, [productId])

  return (
    <div>
      <Title order={1} mb="md">Compare prices by area</Title>
      <Select
        value={productId}
        onChange={(v) => setProductId(v || '')}
        data={products.map((p) => ({ value: p._id, label: p.name }))}
        allowDeselect={false}
        maw={300}
      />
      {rows.length === 0 ? (
        <Text mt="sm">No data for this product.</Text>
      ) : (
        <Table mt="md" striped withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Area</Table.Th>
              <Table.Th>District</Table.Th>
              <Table.Th ta="right">Avg</Table.Th>
              <Table.Th ta="right">Min</Table.Th>
              <Table.Th ta="right">Max</Table.Th>
              <Table.Th ta="right">Reports</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((r, i) => (
              <Table.Tr key={i}>
                <Table.Td>{r.area || '—'}</Table.Td>
                <Table.Td>{r.district || '—'}</Table.Td>
                <Table.Td ta="right">{r.avg.toFixed(2)}</Table.Td>
                <Table.Td ta="right">{r.min}</Table.Td>
                <Table.Td ta="right">{r.max}</Table.Td>
                <Table.Td ta="right">{r.count}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </div>
  )
}
