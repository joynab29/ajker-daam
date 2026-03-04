import { Link } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'

export default function Nav() {
  const { user, logout } = useAuth()
  return (
    <nav style={{ display: 'flex', gap: 12, padding: 12, background: 'var(--green)', color: '#fff' }}>
      <Link to="/" style={{ color: '#fff' }}>Home</Link>
      <Link to="/dashboard" style={{ color: '#fff' }}>Live</Link>
      {user && <Link to="/submit" style={{ color: '#fff' }}>Submit</Link>}
      {user && user.role === 'vendor' && <Link to="/vendor" style={{ color: '#fff' }}>Vendor</Link>}
      {user && user.role === 'admin' && <Link to="/admin" style={{ color: '#fff' }}>Admin</Link>}
      <span style={{ flex: 1 }} />
      {user ? (
        <>
          <span>{user.name} ({user.role})</span>
          <button onClick={logout}>Logout</button>
        </>
      ) : (
        <>
          <Link to="/login" style={{ color: '#fff' }}>Login</Link>
          <Link to="/signup" style={{ color: '#fff' }}>Sign up</Link>
        </>
      )}
    </nav>
  )
}
