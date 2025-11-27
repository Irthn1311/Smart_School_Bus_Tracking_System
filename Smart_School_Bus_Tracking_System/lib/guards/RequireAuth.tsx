"use client"

import React, { ReactNode, useEffect } from 'react'
import { useAuth } from '../auth-context'

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && !user) {
      // redirect to login if not authenticated
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    }
  }, [loading, user])

  if (loading) return null

  // when user exists, render children
  if (!user) return null

  return <>{children}</>
}
