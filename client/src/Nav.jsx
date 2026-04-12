import { Link, useLocation } from 'react-router-dom'
import { Group, Anchor, Button, Text, Badge } from '@mantine/core'
import { useAuth } from './AuthContext.jsx'
import Notifier from './Notifier.jsx'

const linkStyle = { color: '#fff', fontWeight: 500 }
const activeStyle = { color: 'var(--lime)', fontWeight: 600 }

function NavLink({ to, label }) {
  const { pathname } = useLocation()
  const active = pathname === to || (to !== '/' && pathname.startsWith(to))
  return (
    <Anchor component={Link} to={to} style={active ? activeStyle : linkStyle}>
      {label}
    </Anchor>
  )
}

export default function Nav() {
  const { user, logout } = useAuth()
  return (
    <Group
      gap="md"
      px="md"
      py="sm"
      style={{
        background: 'var(--green)',
        color: '#fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}
      wrap="wrap"
    >
      <Anchor component={Link} to="/" style={{ ...linkStyle, fontSize: 18, fontWeight: 700 }}>
        Ajker Daam
      </Anchor>
      <NavLink to="/dashboard" label="Live" />
      <NavLink to="/compare" label="Compare" />
      <NavLink to="/search" label="Search" />
      <NavLink to="/history" label="History" />
      <NavLink to="/anomalies" label="Anomalies" />
      <NavLink to="/leaderboard" label="Leaderboard" />
      <NavLink to="/marketplace" label="Marketplace" />
      <NavLink to="/chat" label="Chat" />
      <NavLink to="/map" label="Map" />
      {user && user.role !== 'admin' && <NavLink to="/submit" label="Submit" />}
      {user && user.role === 'vendor' && <NavLink to="/vendor" label="Vendor" />}
      {user && user.role === 'admin' && <NavLink to="/admin" label="Admin" />}
      <div style={{ flex: 1 }} />
      <Notifier />
      {user ? (
        <>
          <Group gap={6} wrap="nowrap">
            <Text size="sm" c="white">{user.name}</Text>
            <Badge size="xs" variant="filled" color={roleColor(user.role)}>
              {user.role}
            </Badge>
          </Group>
          <Button size="xs" color="lime" variant="filled" onClick={logout}>
            Logout
          </Button>
        </>
      ) : (
        <>
          <Anchor component={Link} to="/login" style={linkStyle}>Login</Anchor>
          <Anchor component={Link} to="/signup" style={linkStyle}>Sign up</Anchor>
        </>
      )}
    </Group>
  )
}

function roleColor(role) {
  if (role === 'admin') return 'red'
  if (role === 'vendor') return 'lime'
  return 'gray'
}
