import { useEffect, useState } from 'react'
import { Title, Text, Table } from '@mantine/core'
import { api } from '../api.js'

export default function Leaderboard() {
  const [rows, setRows] = useState([])

  useEffect(() => {
    api('/users/leaderboard').then((d) => setRows(d.leaderboard))
  }, [])

  return (
    <div>
      <Title order={1} mb="xs">Top contributors</Title>
      <Text mb="md">Score = total reports − 5 × flagged.</Text>
      <Table striped withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>#</Table.Th>
            <Table.Th>User</Table.Th>
            <Table.Th ta="right">Total</Table.Th>
            <Table.Th ta="right">Anomalies</Table.Th>
            <Table.Th ta="right">Flagged</Table.Th>
            <Table.Th ta="right">Score</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((r, i) => (
            <Table.Tr key={r.user._id}>
              <Table.Td>{i + 1}</Table.Td>
              <Table.Td>{r.user.name} ({r.user.role})</Table.Td>
              <Table.Td ta="right">{r.total}</Table.Td>
              <Table.Td ta="right">{r.anomalies}</Table.Td>
              <Table.Td ta="right">{r.flagged}</Table.Td>
              <Table.Td ta="right" fw={700}>{r.score}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </div>
  )
}
