import { useEffect, useState } from 'react'
import { Title, Tabs, TextInput, Button, Stack, SimpleGrid, Paper, Text, Table, Alert, List, Group } from '@mantine/core'
import { api } from '../api.js'

export default function Admin() {
  const [tab, setTab] = useState('overview')
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [products, setProducts] = useState([])
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('kg')
  const [category, setCategory] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [err, setErr] = useState('')

  function loadProducts() {
    api('/products').then((d) => setProducts(d.products)).catch((e) => setErr(e.message))
  }
  function loadStats() {
    api('/admin/stats').then(setStats).catch((e) => setErr(e.message))
  }
  function loadUsers() {
    api('/admin/users').then((d) => setUsers(d.users)).catch((e) => setErr(e.message))
  }

  useEffect(() => {
    loadProducts()
    loadStats()
    loadUsers()
  }, [])

  async function add(e) {
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
    await api(`/products/${id}`, { method: 'DELETE' })
    loadProducts()
  }

  async function removeUser(id) {
    if (!confirm('Delete this user?')) return
    await api(`/admin/users/${id}`, { method: 'DELETE' })
    loadUsers()
  }

  return (
    <div>
      <Title order={1} mb="md">Admin</Title>
      {err && <Alert color="red" mb="sm">{err}</Alert>}
      <Tabs value={tab} onChange={setTab}>
        <Tabs.List>
          <Tabs.Tab value="overview">Overview</Tabs.Tab>
          <Tabs.Tab value="products">Products</Tabs.Tab>
          <Tabs.Tab value="users">Users</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" pt="md">
          {stats && (
            <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} spacing="md">
              <StatCard label="Users" value={stats.users} />
              <StatCard label="Products" value={stats.products} />
              <StatCard label="Reports" value={stats.prices} />
              <StatCard label="Anomalies" value={stats.anomalies} />
              <StatCard label="Flagged" value={stats.flagged} />
            </SimpleGrid>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="products" pt="md">
          <form onSubmit={add}>
            <Stack gap="sm" maw={400}>
              <TextInput placeholder="name" value={name} onChange={(e) => setName(e.target.value)} required />
              <TextInput placeholder="unit (e.g. kg, L, dozen)" value={unit} onChange={(e) => setUnit(e.target.value)} />
              <TextInput placeholder="category" value={category} onChange={(e) => setCategory(e.target.value)} />
              <TextInput placeholder="image URL" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
              <Button type="submit">Add product</Button>
            </Stack>
          </form>
          <Title order={2} mt="md" mb="sm">Existing</Title>
          <List spacing="xs">
            {products.map((p) => (
              <List.Item key={p._id}>
                <Group gap="xs">
                  <Text>{p.name} (per {p.unit}) {p.category && `— ${p.category}`}</Text>
                  <Button size="xs" color="red" variant="light" onClick={() => removeProduct(p._id)}>Delete</Button>
                </Group>
              </List.Item>
            ))}
          </List>
        </Tabs.Panel>

        <Tabs.Panel value="users" pt="md">
          <Table striped withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Email</Table.Th>
                <Table.Th>Role</Table.Th>
                <Table.Th>Joined</Table.Th>
                <Table.Th></Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {users.map((u) => (
                <Table.Tr key={u._id}>
                  <Table.Td>{u.name}</Table.Td>
                  <Table.Td>{u.email}</Table.Td>
                  <Table.Td>{u.role}</Table.Td>
                  <Table.Td>{new Date(u.createdAt).toLocaleDateString()}</Table.Td>
                  <Table.Td><Button size="xs" color="red" onClick={() => removeUser(u._id)}>Delete</Button></Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Tabs.Panel>
      </Tabs>
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <Paper withBorder p="md" radius="md">
      <Text size="xs" c="dimmed">{label}</Text>
      <Text size="xl" fw={700}>{value}</Text>
    </Paper>
  )
}
