"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { MapPin, History, Bell, User } from "lucide-react"
import { Bus, ShieldCheck, Settings } from "lucide-react"

const navigation = [
  { name: "Trang chủ", href: "/parent", icon: MapPin },
  { name: "Lịch sử chuyến đi", href: "/parent/history", icon: History },
  { name: "Thông báo", href: "/parent/notifications", icon: Bell },
]

const personalNav = [
  { name: "Hồ sơ cá nhân", href: "/parent/profile", icon: ShieldCheck },
  { name: "Cài đặt", href: "/parent/settings", icon: Settings },
]

export function ParentSidebar() {
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-full">
      <div className="h-16 flex items-center px-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Bus className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-bold text-foreground">SSB 1.0</h2>
            <p className="text-xs text-muted-foreground">Phụ huynh</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <div className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">{item.name}</span>
              </Link>
            )
          })}
        </div>

        {/* --- Cá nhân --- */}
        <div className="mt-6">
          <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Cá nhân
          </p>
          <div className="space-y-1">
            {personalNav.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="truncate">{item.name}</span>
                </Link>
              )
            })}
          </div>
        </div>

        
      </nav>
    </div>
  )
}
