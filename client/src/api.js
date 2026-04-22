const BASE = 'http://localhost:4000/api'

export function getToken() {
  return localStorage.getItem('token')
}

export function setToken(t) {
  if (t) localStorage.setItem('token', t)
  else localStorage.removeItem('token')
}

export function getUser() {
  const raw = localStorage.getItem('user')
  return raw ? JSON.parse(raw) : null
}

export function setUser(u) {
  if (u) localStorage.setItem('user', JSON.stringify(u))
  else localStorage.removeItem('user')
}

export async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(BASE + path, { ...options, headers })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'request failed')
  return data
}

export async function apiUpload(path, formData) {
  const headers = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(BASE + path, { method: 'POST', headers, body: formData })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'request failed')
  return data
}
