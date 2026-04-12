import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Title, TextInput, PasswordInput, Select, Button, Stack, Alert, Anchor, Text } from '@mantine/core'
import { api } from '../api.js'
import { useAuth } from '../AuthContext.jsx'

export default function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('consumer')
  const [err, setErr] = useState('')
  const { login } = useAuth()
  const nav = useNavigate()

  async function submit(e) {
    e.preventDefault()
    setErr('')
    try {
      const data = await api('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, role }),
      })
      login(data.token, data.user)
      nav('/')
    } catch (e) {
      setErr(e.message)
    }
  }

  return (
    <div style={{ maxWidth: 360 }}>
      <Title order={1} mb="md">Sign up</Title>
      <form onSubmit={submit}>
        <Stack gap="sm">
          <TextInput
            placeholder="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
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
          <Select
            value={role}
            onChange={(v) => setRole(v || 'consumer')}
            data={[
              { value: 'consumer', label: 'Consumer' },
              { value: 'vendor', label: 'Vendor' },
              { value: 'admin', label: 'Admin' },
            ]}
            allowDeselect={false}
          />
          <Button type="submit">Sign up</Button>
        </Stack>
      </form>
      {err && <Alert color="red" mt="sm">{err}</Alert>}
      <Text mt="sm">
        Have an account? <Anchor component={Link} to="/login">Login</Anchor>
      </Text>
    </div>
  )
}
