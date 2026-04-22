import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'

export default function RequireRole({ roles, children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) {
    return (
      <div>
        <h1>Forbidden</h1>
        <p>This page requires role: {roles.join(', ')}</p>
      </div>
    )
  }
  return children
}
