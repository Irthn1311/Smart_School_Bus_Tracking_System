"use client"

import React, { ReactNode, useEffect } from "react"
import { useAuth, type UserRole } from "@/lib/auth-context"

type Props = {
  children: ReactNode
  allowed: UserRole[]
}

export default function RequireRole({ children, allowed }: Props) {
  const { user, loading } = useAuth()

  useEffect(() => {
    if (loading) return

    // Not logged in -> go login
    if (!user) {
      if (typeof window !== "undefined") window.location.href = "/login"
      return
    }

    // Logged in but wrong role -> redirect to their own dashboard
    const userRole = user.role?.toString().toLowerCase() as UserRole | undefined
    if (userRole && !allowed.map((r) => r.toLowerCase()).includes(userRole)) {
      if (typeof window !== "undefined") window.location.href = `/${userRole}`
    }
  }, [loading, user, allowed])

  if (loading) return null
  if (!user) return null

  const userRole = user.role?.toString().toLowerCase() as UserRole | undefined
  if (!userRole || !allowed.map((r) => r.toLowerCase()).includes(userRole)) return null

  return <>{children}</>
}
