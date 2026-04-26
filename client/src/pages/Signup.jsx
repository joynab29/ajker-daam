import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Title,
  TextInput,
  PasswordInput,
  Select,
  Button,
  Stack,
  Alert,
  Anchor,
  Text,
  Paper,
} from '@mantine/core'
import { api } from '../api.js'
import { useAuth } from '../AuthContext.jsx'

export default function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('consumer')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const { login } = useAuth()
  const nav = useNavigate()

  async function submit(e) {
    e.preventDefault()
    setErr('')
    setBusy(true)
    try {
      const data = await api('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, role }),
      })
      login(data.token, data.user)
      nav('/')
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Stack maw={400} gap="md">
      <Title order={1}>Sign up</Title>
      <Paper withBorder p="md" radius="md">
        <form onSubmit={submit}>
          <Stack gap="sm">
            <TextInput
              label="Name"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <TextInput
              type="email"
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <PasswordInput
              label="Password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Select
              label="Role"
              value={role}
              onChange={(v) => setRole(v || 'consumer')}
              data={[
                { value: 'consumer', label: 'Consumer' },
                { value: 'vendor', label: 'Vendor' },
                { value: 'admin', label: 'Admin' },
              ]}
              allowDeselect={false}
            />
            <Button type="submit" loading={busy}>Sign up</Button>
          </Stack>
        </form>
      </Paper>
      {err && <Alert color="red">{err}</Alert>}
      <Text size="sm">
        Have an account? <Anchor component={Link} to="/login">Login</Anchor>
      </Text>
    </Stack>
  )
}
