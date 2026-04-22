import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
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
    <div>
      <h1>Login</h1>
      <form onSubmit={submit}>
        <div>
          <input
            type="email"
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <input
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">Login</button>
      </form>
      {err && <p style={{ color: 'red' }}>{err}</p>}
      <p>
        No account? <Link to="/signup">Sign up</Link>
      </p>
    </div>
  )
}
