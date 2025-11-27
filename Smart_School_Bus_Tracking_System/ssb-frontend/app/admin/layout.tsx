"use client"

import React, { ReactNode } from "react"
import RequireRole from "@/lib/guards/RequireRole"

export default function AdminSectionLayout({ children }: { children: ReactNode }) {
  return (
    <RequireRole allowed={["admin"]}>
      {children}
    </RequireRole>
  )
}
