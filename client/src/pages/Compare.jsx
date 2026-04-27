import { useEffect, useState } from 'react'
import { Title, Select, Table, Text, Group, Badge } from '@mantine/core'
import { api } from '../api.js'

function fmt(n) {
  if (n == null) return '—'
  return Number(n).toFixed(2)
}

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
      <Group gap="xs" mb="sm">
        <Select
          value={productId}
          onChange={(v) => setProductId(v || '')}
          data={products.map((p) => ({ value: p._id, label: p.name }))}
          allowDeselect={false}
          maw={300}
        />
      </Group>
      <Text size="sm" c="dimmed" mb="sm">
        Vendor avg = average asking price across marketplace listings. Reports = community-submitted prices. Markup = listed vs reported.
      </Text>
      {rows.length === 0 ? (
        <Text mt="sm">No data for this product.</Text>
      ) : (
        <Table mt="md" striped withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Area</Table.Th>
              <Table.Th>District</Table.Th>
              <Table.Th ta="right">Reports avg</Table.Th>
              <Table.Th ta="right">Reports min/max</Table.Th>
              <Table.Th ta="right">Reports</Table.Th>
              <Table.Th ta="right">Vendor avg</Table.Th>
              <Table.Th ta="right">Vendor listings</Table.Th>
              <Table.Th ta="right">Markup</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((r, i) => (
              <Table.Tr key={i}>
                <Table.Td>{r.area || '—'}</Table.Td>
                <Table.Td>{r.district || '—'}</Table.Td>
                <Table.Td ta="right">{fmt(r.report_avg)}</Table.Td>
                <Table.Td ta="right">
                  {r.report_count ? `${r.report_min} / ${r.report_max}` : '—'}
                </Table.Td>
                <Table.Td ta="right">{r.report_count}</Table.Td>
                <Table.Td ta="right">{fmt(r.listing_avg)}</Table.Td>
                <Table.Td ta="right">{r.listing_count}</Table.Td>
                <Table.Td ta="right">
                  {r.markup_pct == null ? (
                    '—'
                  ) : (
                    <Badge variant="light" color={r.markup_pct > 5 ? 'red' : r.markup_pct < -5 ? 'green' : 'gray'}>
                      {r.markup_pct > 0 ? '+' : ''}{r.markup_pct.toFixed(0)}%
                    </Badge>
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </div>
  )
}
