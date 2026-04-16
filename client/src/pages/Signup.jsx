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
  PinInput,
  Group,
} from '@mantine/core'
import { api } from '../api.js'
import { useAuth } from '../AuthContext.jsx'

export default function Signup() {
  const [stage, setStage] = useState('details')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('consumer')
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const { login } = useAuth()
  const nav = useNavigate()

  async function submitDetails(e) {
    e.preventDefault()
    setErr('')
    setBusy(true)
    try {
      const data = await api('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, role }),
      })
      setStage('verify')
      setInfo(`We sent a 6-digit code to ${email}.`)
      setPreviewUrl(data.devPreviewUrl || '')
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
      const data = await api('/auth/signup/verify', {
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
      const data = await api('/auth/resend', {
        method: 'POST',
        body: JSON.stringify({ email, purpose: 'signup' }),
      })
      setInfo('A new code was sent.')
      setPreviewUrl(data.devPreviewUrl || '')
    } catch (e) {
      setErr(e.message)
    }
  }

  return (
    <Stack maw={400} gap="md">
      <Title order={1}>Sign up</Title>
      {stage === 'details' ? (
        <Paper withBorder p="md" radius="md">
          <form onSubmit={submitDetails}>
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
                Verify and create account
              </Button>
              <Group justify="space-between">
                <Anchor component="button" type="button" onClick={resend}>
                  Resend code
                </Anchor>
                <Anchor component="button" type="button" onClick={() => setStage('details')}>
                  Edit details
                </Anchor>
              </Group>
            </Stack>
          </form>
        </Paper>
      )}
      {info && <Alert color="blue">{info}</Alert>}
      {previewUrl && (
        <Alert color="gray" title="Dev mode">
          No SMTP configured — view the email at{' '}
          <Anchor href={previewUrl} target="_blank" rel="noreferrer">
            {previewUrl}
          </Anchor>
        </Alert>
      )}
      {err && <Alert color="red">{err}</Alert>}
      <Text size="sm">
        Have an account? <Anchor component={Link} to="/login">Login</Anchor>
      </Text>
    </Stack>
  )
}
