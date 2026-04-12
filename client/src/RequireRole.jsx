import { Navigate } from 'react-router-dom'
import { Title, Text } from '@mantine/core'
import { useAuth } from './AuthContext.jsx'

export default function RequireRole({ roles, children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) {
    return (
      <div>
        <Title order={1}>Forbidden</Title>
        <Text>This page requires role: {roles.join(', ')}</Text>
      </div>
    )
  }
  return children
}
