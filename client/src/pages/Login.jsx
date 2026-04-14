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
  PinInput,
  Group,
} from '@mantine/core'
import { api } from '../api.js'
import { useAuth } from '../AuthContext.jsx'

export default function Login() {
  const [stage, setStage] = useState('creds')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const { login } = useAuth()
  const nav = useNavigate()

  async function submitCreds(e) {
    e.preventDefault()
    setErr('')
    setBusy(true)
    try {
      await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      setStage('verify')
      setInfo(`We sent a 6-digit code to ${email}.`)
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function submitCode(e) {
    e.preventDefault()
    setErr('')
    setBusy(true)
    try {
      const data = await api('/auth/login/verify', {
        method: 'POST',
        body: JSON.stringify({ email, code }),
      })
      login(data.token, data.user)
      nav('/')
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function resend() {
    setErr('')
    setInfo('')
    try {
      await api('/auth/resend', {
        method: 'POST',
        body: JSON.stringify({ email, purpose: 'login' }),
      })
      setInfo('A new code was sent.')
    } catch (e) {
      setErr(e.message)
    }
  }

  return (
    <Stack maw={400} gap="md">
      <Title order={1}>Login</Title>
      {stage === 'creds' ? (
        <Paper withBorder p="md" radius="md">
          <form onSubmit={submitCreds}>
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
              <Button type="submit" loading={busy}>
                Send verification code
              </Button>
            </Stack>
          </form>
        </Paper>
      ) : (
        <Paper withBorder p="md" radius="md">
          <form onSubmit={submitCode}>
            <Stack gap="sm">
              <Text size="sm">
                Enter the 6-digit code sent to <b>{email}</b>.
              </Text>
              <PinInput
                length={6}
                type="number"
                value={code}
                onChange={setCode}
                aria-label="verification code"
                oneTimeCode
              />
              <Button type="submit" loading={busy} disabled={code.length !== 6}>
                Verify and login
              </Button>
              <Group justify="space-between">
                <Anchor component="button" type="button" onClick={resend}>
                  Resend code
                </Anchor>
                <Anchor component="button" type="button" onClick={() => setStage('creds')}>
                  Use different email
                </Anchor>
              </Group>
            </Stack>
          </form>
        </Paper>
      )}
      {info && <Alert color="blue">{info}</Alert>}
      {err && <Alert color="red">{err}</Alert>}
      <Text size="sm">
        No account? <Anchor component={Link} to="/signup">Sign up</Anchor>
      </Text>
    </Stack>
  )
}
