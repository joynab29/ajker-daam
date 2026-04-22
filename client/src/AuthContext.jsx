import { createContext, useContext, useState } from 'react'
import { getUser, setUser as saveUser, setToken } from './api.js'

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

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
