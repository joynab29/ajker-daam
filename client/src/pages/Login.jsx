import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Title, TextInput, PasswordInput, Button, Stack, Alert, Anchor, Text } from '@mantine/core'
import { api } from '../api.js'
import { useAuth } from '../AuthContext.jsx'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const { login } = useAuth()
  const nav = useNavigate()

  async function submit(e) {
    e.preventDefault()
    setErr('')
    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      login(data.token, data.user)
      nav('/')
    } catch (e) {
      setErr(e.message)
    }
  }

  return (
    <div style={{ maxWidth: 360 }}>
      <Title order={1} mb="md">Login</Title>
      <form onSubmit={submit}>
        <Stack gap="sm">
          <TextInput
            type="email"
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <PasswordInput
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit">Login</Button>
        </Stack>
      </form>
      {err && <Alert color="red" mt="sm">{err}</Alert>}
      <Text mt="sm">
        No account? <Anchor component={Link} to="/signup">Sign up</Anchor>
      </Text>
    </div>
  )
}
