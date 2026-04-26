import { useEffect, useState } from 'react'
import { Button, Text } from '@mantine/core'
import { socket } from './socket.js'
import { useAuth } from './AuthContext.jsx'
import { ensurePushSubscription, requestAndSubscribe, pushSupported } from './push.js'

export default function Notifier() {
  const { user } = useAuth()
  const [perm, setPerm] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported',
  )

  useEffect(() => {
    if (perm !== 'granted') return
    socket.connect()
    const onSpike = (a) => {
      const name = a.priceReport?.productId?.name || 'a product'
      const dir = a.direction === 'up' ? '+' : ''
      try {
        new Notification('Price spike', {
          body: `${name}: ${a.priceReport.price} (${dir}${(a.change * 100).toFixed(0)}% vs avg ${a.avg.toFixed(2)})`,
        })
      } catch {}
    }
    socket.on('price:spike', onSpike)
    return () => {
      socket.off('price:spike', onSpike)
    }
  }, [perm])

  useEffect(() => {
    if (!user || !pushSupported()) return
    if (Notification.permission === 'default') {
      Notification.requestPermission().then((p) => {
        setPerm(p)
        if (p === 'granted') ensurePushSubscription().catch(() => {})
      })
    } else if (Notification.permission === 'granted') {
      ensurePushSubscription().catch(() => {})
    }
  }, [user])

  if (perm === 'unsupported') return null

  if (perm === 'granted') {
    return <Text size="xs" c="white">🔔 alerts on</Text>
  }

  async function ask() {
    const res = await requestAndSubscribe()
    setPerm(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported')
    if (res && !res.ok && res.reason === 'no-vapid-key') {
      console.warn('Push subscription skipped: VAPID public key not configured on server')
    }
  }

  return (
    <Button size="xs" variant="outline" color="green" onClick={ask}>
      Enable alerts
    </Button>
  )
}
