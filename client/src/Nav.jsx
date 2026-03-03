import { Link } from 'react-router-dom'
import { Group, Anchor, Button, Text } from '@mantine/core'
import { useAuth } from './AuthContext.jsx'
import Notifier from './Notifier.jsx'

const linkStyle = { color: '#fff' }

export default function Nav() {
  const { user, logout } = useAuth()
  return (
    <Group
      gap="md"
      px="md"
      py="sm"
      style={{ background: 'var(--green)', color: '#fff' }}
      wrap="wrap"
    >
      <Anchor component={Link} to="/" style={linkStyle}>Home</Anchor>
      <Anchor component={Link} to="/dashboard" style={linkStyle}>Live</Anchor>
      <Anchor component={Link} to="/compare" style={linkStyle}>Compare</Anchor>
      <Anchor component={Link} to="/search" style={linkStyle}>Search</Anchor>
      <Anchor component={Link} to="/history" style={linkStyle}>History</Anchor>
      <Anchor component={Link} to="/anomalies" style={linkStyle}>Anomalies</Anchor>
      <Anchor component={Link} to="/leaderboard" style={linkStyle}>Leaderboard</Anchor>
      <Anchor component={Link} to="/marketplace" style={linkStyle}>Marketplace</Anchor>
      <Anchor component={Link} to="/chat" style={linkStyle}>Chat</Anchor>
      <Anchor component={Link} to="/map" style={linkStyle}>Map</Anchor>
      {user && <Anchor component={Link} to="/submit" style={linkStyle}>Submit</Anchor>}
      {user && user.role === 'vendor' && <Anchor component={Link} to="/vendor" style={linkStyle}>Vendor</Anchor>}
      {user && user.role === 'admin' && <Anchor component={Link} to="/admin" style={linkStyle}>Admin</Anchor>}
      <div style={{ flex: 1 }} />
      <Notifier />
      {user ? (
        <>
          <Text size="sm" c="white">{user.name} ({user.role})</Text>
          <Button size="xs" color="lime" onClick={logout}>Logout</Button>
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
