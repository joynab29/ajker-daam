import { useEffect, useState } from 'react'
import { api } from '../api.js'

export default function Leaderboard() {
  const [rows, setRows] = useState([])

  useEffect(() => {
    api('/users/leaderboard').then((d) => setRows(d.leaderboard))
  }, [])

  return (
    <div>
      <h1>Top contributors</h1>
      <p>Score = total reports − 5 × flagged.</p>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>#</th>
            <th style={{ textAlign: 'left' }}>User</th>
            <th style={{ textAlign: 'right' }}>Total</th>
            <th style={{ textAlign: 'right' }}>Anomalies</th>
            <th style={{ textAlign: 'right' }}>Flagged</th>
            <th style={{ textAlign: 'right' }}>Score</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.user._id} style={{ borderBottom: '1px solid #eee' }}>
              <td>{i + 1}</td>
              <td>{r.user.name} ({r.user.role})</td>
              <td style={{ textAlign: 'right' }}>{r.total}</td>
              <td style={{ textAlign: 'right' }}>{r.anomalies}</td>
              <td style={{ textAlign: 'right' }}>{r.flagged}</td>
              <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{r.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
