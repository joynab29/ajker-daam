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
    <Stack maw={440} gap="md" mx="auto">
      <span className="section-eyebrow">Welcome back</span>
      <h1 className="display" style={{ margin: 0 }}>Sign in to <span style={{ color: '#65a30d' }}>Ajker Daam</span></h1>
      <Paper p="lg" radius="xl" className="card-soft">
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
            <Button
              type="submit"
              loading={busy}
              radius="xl"
              size="md"
              color="lime"
              styles={{ root: { color: '#0b3d2e', fontWeight: 700 } }}
            >
              Login
            </Button>
          </Stack>
        </form>
      </Paper>
      {err && <Alert color="red" radius="lg">{err}</Alert>}
      <Text size="sm">
        No account? <Anchor component={Link} to="/signup" c="forest.7" fw={600}>Sign up</Anchor>
      </Text>
    </Stack>
  )
}
