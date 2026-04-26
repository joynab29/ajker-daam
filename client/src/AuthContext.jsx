import { createContext, useContext, useEffect, useState } from 'react'
import { api, getUser, setUser as saveUser, setToken, getToken } from './api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(getUser())

  function login(token, u) {
    setToken(token)
    saveUser(u)
    setUserState(u)
  }

  function logout() {
    setToken(null)
    saveUser(null)
    setUserState(null)
  }

  useEffect(() => {
    if (!getToken()) return
    api('/me')
      .then((d) => {
        if (d.user) {
          saveUser(d.user)
          setUserState(d.user)
        }
      })
      .catch(() => {
        setToken(null)
        saveUser(null)
        setUserState(null)
      })
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
