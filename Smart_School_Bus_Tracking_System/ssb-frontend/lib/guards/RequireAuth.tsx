"use client"

import React, { ReactNode, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"

type Props = {
  children: ReactNode
}

export default function RequireAuth({ children }: Props) {
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && !user && typeof window !== "undefined") {
      window.location.href = "/login"
    }
  }, [loading, user])

  if (loading) return null
  if (!user) return null

  return <>{children}</>
}
