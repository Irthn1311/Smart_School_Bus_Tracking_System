"use client"

import React, { ReactNode } from "react"
import RequireRole from "@/lib/guards/RequireRole"

export default function DriverSectionLayout({ children }: { children: ReactNode }) {
  return (
    <RequireRole allowed={["driver"]}>
      {children}
    </RequireRole>
  )
}
