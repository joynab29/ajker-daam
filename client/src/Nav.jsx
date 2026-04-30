import { Link, useLocation } from 'react-router-dom'
import { Group, Anchor, Button, Text, Badge } from '@mantine/core'
import { useAuth } from './AuthContext.jsx'
import Notifier from './Notifier.jsx'

const linkStyle = { color: 'rgba(255,255,255,0.86)', fontWeight: 500, fontSize: 14 }
const activeStyle = { color: '#bef264', fontWeight: 700, fontSize: 14 }

function NavLink({ to, label }) {
  const { pathname } = useLocation()
  const active = pathname === to || (to !== '/' && pathname.startsWith(to))
  return (
    <Anchor component={Link} to={to} style={active ? activeStyle : linkStyle} underline="never">
      {label}
    </Anchor>
  )
}

function BrandMark() {
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        borderRadius: 999,
        background: '#bef264',
        color: '#0b3d2e',
        fontWeight: 800,
      }}
    >
      ৳
    </span>
  )
}

export default function Nav() {
  const { user, logout } = useAuth()
  return (
    <Group
      gap="md"
      px="lg"
      py="md"
      style={{
        background: 'linear-gradient(90deg, #0b3d2e 0%, #134e3a 100%)',
        color: '#fff',
        boxShadow: '0 6px 20px rgba(11, 61, 46, 0.18)',
      }}
      wrap="wrap"
    >
      <Anchor
        component={Link}
        to="/"
        underline="never"
        style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#fff' }}
      >
        <BrandMark />
        <Text fw={800} size="lg" c="#fff">Ajker Daam</Text>
      </Anchor>
      <NavLink to="/dashboard" label="Live" />
      <NavLink to="/compare" label="Compare" />
      <NavLink to="/search" label="Search" />
      <NavLink to="/history" label="History" />
      <NavLink to="/anomalies" label="Anomalies" />
      <NavLink to="/leaderboard" label="Leaderboard" />
      <NavLink to="/marketplace" label="Marketplace" />
      <NavLink to="/chat" label="Chat" />
      {user && <NavLink to="/messages" label="Messages" />}
      <NavLink to="/heatmap" label="Heatmap" />
      {user && user.role !== 'admin' && <NavLink to="/submit" label="Submit" />}
      {user && user.role === 'admin' && <NavLink to="/admin" label="Admin" />}
      <div style={{ flex: 1 }} />
      <Notifier />
      {user ? (
        <>
          <Group gap={8} wrap="nowrap">
            <Text size="sm" c="rgba(255,255,255,0.92)" fw={500}>{user.name}</Text>
            <Badge size="sm" variant="filled" color={roleColor(user.role)} radius="xl">
              {user.role}
            </Badge>
          </Group>
          <Button
            size="xs"
            radius="xl"
            color="lime"
            variant="filled"
            styles={{ root: { color: '#0b3d2e', fontWeight: 700 } }}
            onClick={logout}
          >
            Logout
          </Button>
        </>
      ) : (
        <Group gap="xs" wrap="nowrap">
          <Anchor component={Link} to="/login" style={linkStyle} underline="never">Login</Anchor>
          <Button
            component={Link}
            to="/signup"
            size="xs"
            radius="xl"
            color="lime"
            styles={{ root: { color: '#0b3d2e', fontWeight: 700 } }}
          >
            Sign up
          </Button>
        </Group>
      )}
    </Group>
  )
}

function roleColor(role) {
  if (role === 'admin') return 'red'
  if (role === 'vendor') return 'lime'
  return 'gray'
}
