import { useEffect, useState } from 'react'
import { Title, Text, Alert, Stack, Paper, Group } from '@mantine/core'
import { api } from '../api.js'
import { socket } from '../socket.js'

export default function Dashboard() {
  const [prices, setPrices] = useState([])
  const [alerts, setAlerts] = useState([])

  useEffect(() => {
    api('/prices').then((d) => setPrices(d.prices))
    socket.connect()
    socket.on('price:new', (p) => {
      setPrices((prev) => [p, ...prev].slice(0, 100))
    })
    socket.on('price:spike', (a) => {
      setAlerts((prev) => [a, ...prev].slice(0, 10))
    })
    return () => {
      socket.off('price:new')
      socket.off('price:spike')
      socket.disconnect()
    }
  }, [])

  return (
    <div>
      <Title order={1} mb="xs">Live price feed</Title>
      <Text mb="md">New submissions appear here in real time.</Text>

      {alerts.length > 0 && (
        <Alert color="yellow" title="Price spike alerts" mb="md">
          <Stack gap={2}>
            {alerts.map((a, i) => (
              <Text key={i} size="sm">
                {a.priceReport.productId?.name}: {a.priceReport.price} (
                {a.direction === 'up' ? '+' : ''}
                {(a.change * 100).toFixed(0)}% vs 7-day avg {a.avg.toFixed(2)})
              </Text>
            ))}
          </Stack>
        </Alert>
      )}

      {prices.length === 0 ? (
        <Text>No reports yet.</Text>
      ) : (
        <Stack gap={0}>
          {prices.map((p) => (
            <Paper key={p._id} py="xs" withBorder={false} style={{ borderBottom: '1px solid #eee' }}>
              <Group gap="xs" wrap="wrap">
                <Text fw={600}>{p.productId?.name}</Text>
                <Text>— {p.price} / {p.unit} —</Text>
                <Text>{[p.area, p.district].filter(Boolean).join(', ') || 'unknown'}</Text>
                <Text>— {p.userId?.name} ({p.source}) —</Text>
                <Text size="xs" c="dimmed">{new Date(p.createdAt).toLocaleTimeString()}</Text>
              </Group>
            </Paper>
          ))}
        </Stack>
      )}
    </div>
  )
}
