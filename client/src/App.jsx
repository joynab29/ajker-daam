import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [health, setHealth] = useState('...')

  useEffect(() => {
    fetch('http://localhost:4000/api/health')
      .then((r) => r.json())
      .then((d) => setHealth(d.status))
      .catch(() => setHealth('server unreachable'))
  }, [])

  return (
    <main>
      <h1>Ajker Daam</h1>
      <p>API: {health}</p>
    </main>
  )
}

export default App
