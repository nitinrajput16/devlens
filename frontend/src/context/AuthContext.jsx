import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('devlens_token'))
  const [loading, setLoading] = useState(!!localStorage.getItem('devlens_token'))

  // On mount, verify stored token
  useEffect(() => {
    if (!token) { setLoading(false); return }
    api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setUser(res.data))
      .catch(() => { localStorage.removeItem('devlens_token'); setToken(null) })
      .finally(() => setLoading(false))
  }, [])

  const login = (authToken, userData) => {
    localStorage.setItem('devlens_token', authToken)
    setToken(authToken)
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('devlens_token')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
