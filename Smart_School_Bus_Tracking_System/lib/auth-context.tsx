import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import * as authService from './services/auth.service'
import { api } from './api'
import { socketService } from '../ssb-frontend/lib/socket'

type User = {
  id: string
  name: string
  email: string
  role?: string
}

type AuthContextValue = {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<User>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    // If token exists, set it and fetch profile from API to ensure fresh data
    const token = typeof window !== 'undefined' ? localStorage.getItem('ssb_token') : null
    if (token) {
      api.setToken(token)
      // connect socket with JWT so server can push updates
      try {
        socketService.connect(token)
      } catch (err) {
        console.warn('socketService.connect failed', err)
      }

      authService
        .fetchProfile()
        .then((u) => setUser(u))
        .catch(() => {
          // if fetching profile fails, clear stored auth
          authService.logout()
          setUser(null)
        })
        .finally(() => setLoading(false))
    } else {
      // fallback: try to read user from storage
      const u = authService.getCurrentUserFromStorage()
      if (u) setUser(u)
      setLoading(false)
    }
  }, [])

  async function login(email: string, password: string) {
    setLoading(true)
    try {
      const u = await authService.login(email, password)
      // after successful login authService saved token -> connect socket
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('ssb_token') : null
        if (token) socketService.connect(token)
      } catch (err) {
        console.warn('socketService.connect failed after login', err)
      }
      setUser(u)
      return u
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    authService.logout()
    setUser(null)
    try {
      socketService.disconnect()
    } catch (err) {
      console.warn('socketService.disconnect failed', err)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}

export default AuthProvider
