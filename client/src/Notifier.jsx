import { useEffect, useState } from 'react'
import { socket } from './socket.js'

export default function Notifier() {
  const [perm, setPerm] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported')

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

  if (perm === 'unsupported') return null

  if (perm === 'granted') {
    return (
      <span style={{ fontSize: 12, color: '#ddd' }}>🔔 alerts on</span>
    )
  }

  function ask() {
    Notification.requestPermission().then(setPerm)
  }

  return (
    <button onClick={ask} style={{ background: 'transparent', border: '1px solid #fff', color: '#fff' }}>
      Enable alerts
    </button>
  )
}
