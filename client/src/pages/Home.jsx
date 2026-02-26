import { useAuth } from '../AuthContext.jsx'

export default function Home() {
  const { user } = useAuth()
  return (
    <div>
      <h1>Ajker Daam</h1>
      <p>Crowd-sourced market price tracker.</p>
      {user ? <p>Signed in as {user.name} ({user.role}).</p> : <p>Sign up or log in to get started.</p>}
    </div>
  )
}
