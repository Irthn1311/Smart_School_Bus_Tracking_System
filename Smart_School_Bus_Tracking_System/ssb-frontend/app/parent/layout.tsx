"use client"

import React, { ReactNode } from "react"
import RequireRole from "@/lib/guards/RequireRole"

export default function ParentSectionLayout({ children }: { children: ReactNode }) {
  return (
    <RequireRole allowed={["parent"]}>
      {children}
    </RequireRole>
  )
}
