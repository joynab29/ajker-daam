import { useEffect, useState } from 'react'
import {
  Title,
  Tabs,
  Stack,
  SimpleGrid,
  Paper,
  Text,
  Table,
  Alert,
  Button,
  Badge,
} from '@mantine/core'
import { api } from '../api.js'

export default function Admin() {
  const [tab, setTab] = useState('overview')
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [err, setErr] = useState('')

  function loadStats() {
    api('/admin/stats').then(setStats).catch((e) => setErr(e.message))
  }
  function loadUsers() {
    api('/admin/users').then((d) => setUsers(d.users)).catch((e) => setErr(e.message))
  }

  useEffect(() => {
    loadStats()
    loadUsers()
  }, [])

  async function removeUser(id) {
    if (!confirm('Delete this user?')) return
    try {
      await api(`/admin/users/${id}`, { method: 'DELETE' })
      loadUsers()
    } catch (e) {
      setErr(e.message)
    }
  }

  return (
    <Stack gap="md">
      <Title order={1}>Admin</Title>
      {err && <Alert color="red">{err}</Alert>}
      <Tabs value={tab} onChange={setTab}>
        <Tabs.List>
          <Tabs.Tab value="overview">Overview</Tabs.Tab>
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

        <Tabs.Panel value="users" pt="md">
          <Paper withBorder radius="md">
            <Table striped highlightOnHover>
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
                    <Table.Td>
                      <Badge variant="light" color={roleColor(u.role)}>
                        {u.role}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{new Date(u.createdAt).toLocaleDateString()}</Table.Td>
                    <Table.Td>
                      <Button size="xs" color="red" variant="light" onClick={() => removeUser(u._id)}>
                        Delete
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  )
}

function roleColor(role) {
  if (role === 'admin') return 'red'
  if (role === 'vendor') return 'green'
  return 'blue'
}

function StatCard({ label, value }) {
  return (
    <Paper withBorder p="md" radius="md">
      <Text size="xs" c="dimmed">{label}</Text>
      <Text size="xl" fw={700}>{value}</Text>
    </Paper>
  )
}
