import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Title,
  TextInput,
  PasswordInput,
  Button,
  Stack,
  Alert,
  Anchor,
  Text,
  Paper,
} from '@mantine/core'
import { api } from '../api.js'
import { useAuth } from '../AuthContext.jsx'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const { login } = useAuth()
  const nav = useNavigate()

  async function submit(e) {
    e.preventDefault()
    setErr('')
    setBusy(true)
    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
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
      <Title order={1}>Login</Title>
      <Paper withBorder p="md" radius="md">
        <form onSubmit={submit}>
          <Stack gap="sm">
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
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" loading={busy}>Login</Button>
          </Stack>
        </form>
      </Paper>
      {err && <Alert color="red">{err}</Alert>}
      <Text size="sm">
        No account? <Anchor component={Link} to="/signup">Sign up</Anchor>
      </Text>
    </Stack>
  )
}
