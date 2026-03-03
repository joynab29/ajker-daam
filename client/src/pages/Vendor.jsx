import { useEffect, useState } from 'react'
import { Title, TextInput, NumberInput, Button, Group, Table, Text } from '@mantine/core'
import { api, apiUpload } from '../api.js'

export default function Vendor() {
  const [products, setProducts] = useState([])
  const [drafts, setDrafts] = useState({})
  const [area, setArea] = useState('')
  const [district, setDistrict] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    api('/products').then((d) => setProducts(d.products))
  }, [])

  function setDraft(id, field, val) {
    setDrafts((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), [field]: val } }))
  }

  async function publish(p) {
    const draft = drafts[p._id] || {}
    if (!draft.price) return
    const fd = new FormData()
    fd.append('productId', p._id)
    fd.append('price', draft.price)
    fd.append('unit', p.unit || 'kg')
    fd.append('area', area)
    fd.append('district', district)
    try {
      await apiUpload('/prices', fd)
      setMsg(`Published price for ${p.name}`)
      setDraft(p._id, 'price', '')
      setTimeout(() => setMsg(''), 1500)
    } catch (e) {
      setMsg(e.message)
    }
  }

  return (
    <div>
      <Title order={1} mb="md">Vendor — Publish Prices</Title>
      <Group gap="xs" mb="md">
        <TextInput placeholder="shop area" value={area} onChange={(e) => setArea(e.target.value)} />
        <TextInput placeholder="shop district" value={district} onChange={(e) => setDistrict(e.target.value)} />
      </Group>
      {msg && <Text mb="sm">{msg}</Text>}
      <Table striped withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Product</Table.Th>
            <Table.Th>Unit</Table.Th>
            <Table.Th>Your price</Table.Th>
            <Table.Th></Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {products.map((p) => (
            <Table.Tr key={p._id}>
              <Table.Td>{p.name}</Table.Td>
              <Table.Td>{p.unit}</Table.Td>
              <Table.Td>
                <NumberInput
                  size="xs"
                  value={(drafts[p._id] || {}).price || ''}
                  onChange={(v) => setDraft(p._id, 'price', v ?? '')}
                  min={0}
                  decimalScale={2}
                  w={120}
                />
              </Table.Td>
              <Table.Td>
                <Button size="xs" onClick={() => publish(p)}>Publish</Button>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </div>
  )
}
