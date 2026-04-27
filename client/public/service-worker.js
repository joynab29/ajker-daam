const VERSION = 'v1'
const STATIC_CACHE = `static-${VERSION}`
const RUNTIME_CACHE = `runtime-${VERSION}`

const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
]

const API_HOST = 'localhost:4000'
const CACHEABLE_API_PREFIXES = ['/api/products', '/api/prices']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((c) => c.addAll(APP_SHELL).catch(() => {})),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(
      keys
        .filter((k) => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
        .map((k) => caches.delete(k)),
    )
    await self.clients.claim()
  })())
})

function isCacheableApi(url) {
  if (url.host !== API_HOST) return false
  return CACHEABLE_API_PREFIXES.some((p) => url.pathname.startsWith(p))
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  if (url.pathname.startsWith('/socket.io')) return

  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req)
        const cache = await caches.open(STATIC_CACHE)
        cache.put('/index.html', fresh.clone()).catch(() => {})
        return fresh
      } catch {
        const cache = await caches.open(STATIC_CACHE)
        return (await cache.match('/index.html')) || (await cache.match('/')) || Response.error()
      }
    })())
    return
  }

  if (isCacheableApi(url)) {
    event.respondWith((async () => {
      const cache = await caches.open(RUNTIME_CACHE)
      const cached = await cache.match(req)
      const network = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(req, res.clone()).catch(() => {})
          return res
        })
        .catch(() => null)
      if (cached) {
        network.catch(() => {})
        return cached
      }
      const fresh = await network
      if (fresh) return fresh
      return new Response(
        JSON.stringify({ offline: true, products: [], prices: [] }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      )
    })())
    return
  }

  if (url.origin === self.location.origin) {
    event.respondWith((async () => {
      const cache = await caches.open(STATIC_CACHE)
      const cached = await cache.match(req)
      if (cached) {
        fetch(req).then((res) => {
          if (res.ok) cache.put(req, res.clone()).catch(() => {})
        }).catch(() => {})
        return cached
      }
      try {
        const res = await fetch(req)
        if (res.ok) cache.put(req, res.clone()).catch(() => {})
        return res
      } catch {
        return Response.error()
      }
    })())
  }
})

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'Ajker Daam', body: event.data ? event.data.text() : '' }
  }
  const title = data.title || 'Ajker Daam'
  const options = {
    body: data.body || '',
    icon: '/icon.svg',
    badge: '/icon.svg',
    data: { url: data.url || '/' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        try {
          const u = new URL(w.url)
          if (u.pathname === url && 'focus' in w) return w.focus()
        } catch {}
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    }),
  )
})
