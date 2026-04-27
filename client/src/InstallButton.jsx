import { useEffect, useState } from 'react'
import { Button } from '@mantine/core'

export default function InstallButton() {
  const [event, setEvent] = useState(null)
  const [installed, setInstalled] = useState(
    typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches,
  )

  useEffect(() => {
    function onPrompt(e) {
      e.preventDefault()
      setEvent(e)
    }
    function onInstalled() {
      setEvent(null)
      setInstalled(true)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed || !event) return null

  async function install() {
    event.prompt()
    const { outcome } = await event.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setEvent(null)
  }

  return (
    <Button size="xs" variant="white" color="green" onClick={install}>
      Install
    </Button>
  )
}
