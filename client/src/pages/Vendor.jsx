import { useEffect, useState } from 'react'
import {
  Title,
  TextInput,
  NumberInput,
  Button,
  Group,
  Table,
  Text,
  Tabs,
  Stack,
  Paper,
  Alert,
  ActionIcon,
} from '@mantine/core'
import { api, apiUpload } from '../api.js'

export default function Vendor() {
  const [tab, setTab] = useState('publish')
  const [products, setProducts] = useState([])
  const [drafts, setDrafts] = useState({})
  const [area, setArea] = useState('')
  const [district, setDistrict] = useState('')
  const [msg, setMsg] = useState('')
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('kg')
  const [category, setCategory] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [err, setErr] = useState('')

  function loadProducts() {
    api('/products').then((d) => setProducts(d.products))
  }

  useEffect(() => {
    loadProducts()
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

  async function addProduct(e) {
    e.preventDefault()
    setErr('')
    try {
      await api('/products', {
        method: 'POST',
        body: JSON.stringify({ name, unit, category, imageUrl }),
      })
      setName('')
      setCategory('')
      setImageUrl('')
      loadProducts()
    } catch (e) {
      setErr(e.message)
    }
  }

  async function removeProduct(id) {
    if (!confirm('Delete this product?')) return
    try {
      await api(`/products/${id}`, { method: 'DELETE' })
      loadProducts()
    } catch (e) {
      setErr(e.message)
    }
  }

  return (
    <Stack gap="md">
      <Title order={1}>Vendor</Title>
      <Tabs value={tab} onChange={setTab}>
        <Tabs.List>
          <Tabs.Tab value="publish">Publish prices</Tabs.Tab>
          <Tabs.Tab value="products">Manage products</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="publish" pt="md">
          <Paper withBorder p="md" radius="md" mb="md">
            <Group grow gap="xs">
              <TextInput
                label="Shop area"
                placeholder="e.g. Mirpur"
                value={area}
                onChange={(e) => setArea(e.target.value)}
              />
              <TextInput
                label="Shop district"
                placeholder="e.g. Dhaka"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
              />
            </Group>
          </Paper>
          {msg && <Alert color="blue" mb="sm">{msg}</Alert>}
          {products.length === 0 ? (
            <Text c="dimmed">No products yet. Add some on the Manage products tab.</Text>
          ) : (
            <Paper withBorder radius="md">
              <Table striped highlightOnHover>
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
                          placeholder="0.00"
                        />
                      </Table.Td>
                      <Table.Td>
                        <Button size="xs" onClick={() => publish(p)}>
                          Publish
                        </Button>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Paper>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="products" pt="md">
          <Paper withBorder p="md" radius="md" mb="md">
            <form onSubmit={addProduct}>
              <Stack gap="sm" maw={420}>
                <Title order={3}>Add a product</Title>
                <TextInput
                  label="Name"
                  placeholder="e.g. Onion"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <Group grow gap="xs">
                  <TextInput
                    label="Unit"
                    placeholder="kg, L, dozen"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                  />
                  <TextInput
                    label="Category"
                    placeholder="e.g. vegetables"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  />
                </Group>
                <TextInput
                  label="Image URL"
                  placeholder="https://..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
                <Button type="submit">Add product</Button>
              </Stack>
            </form>
          </Paper>
          {err && <Alert color="red" mb="sm">{err}</Alert>}
          <Title order={3} mb="sm">Existing products</Title>
          {products.length === 0 ? (
            <Text c="dimmed">No products yet.</Text>
          ) : (
            <Paper withBorder radius="md">
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Unit</Table.Th>
                    <Table.Th>Category</Table.Th>
                    <Table.Th></Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {products.map((p) => (
                    <Table.Tr key={p._id}>
                      <Table.Td>{p.name}</Table.Td>
                      <Table.Td>{p.unit}</Table.Td>
                      <Table.Td>{p.category || '—'}</Table.Td>
                      <Table.Td>
                        <Button
                          size="xs"
                          color="red"
                          variant="light"
                          onClick={() => removeProduct(p._id)}
                        >
                          Delete
                        </Button>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Paper>
          )}
        </Tabs.Panel>
      </Tabs>
    </Stack>
  )
}
