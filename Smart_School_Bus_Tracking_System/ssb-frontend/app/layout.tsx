import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { AuthProvider } from "@/lib/auth-context"
import { QueryProvider } from "@/lib/providers/QueryProvider"
import { Toaster } from "@/components/ui/toaster"
import { Suspense } from "react"
import "./globals.css"
import FloatingChat from "@/components/ui/floating-chat"

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
})

export const metadata: Metadata = {
  title: "SSB 1.0 - Smart School Bus Tracking",
  description: "Hệ thống theo dõi xe buýt trường học thông minh",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="vi">
      <body className={`font-sans ${inter.variable} antialiased`} suppressHydrationWarning>
        <Suspense fallback={null}>
          <QueryProvider>
            <AuthProvider>
              {children}
              <Toaster />
              <FloatingChat />
            </AuthProvider>
          </QueryProvider>
        </Suspense>
        <Analytics />
      </body>
    </html>
  )
}
