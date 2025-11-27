"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Bus,
  LayoutDashboard,
  Users,
  Route,
  Calendar,
  MapPin,
  Bell,
  BarChart3,
  UserCircle,
  Settings,
  ShieldCheck,
  Zap,
} from "lucide-react"

const managementNav = [
  { name: "Tổng quan", href: "/admin", icon: LayoutDashboard },
  { name: "Quản lý Xe buýt", href: "/admin/buses", icon: Bus },
  { name: "Quản lý Tài xế", href: "/admin/drivers", icon: UserCircle },
  { name: "Quản lý Học sinh", href: "/admin/students", icon: Users },
  { name: "Tối ưu hóa Điểm dừng", href: "/admin/bus-stop-optimization", icon: Zap },
  { name: "Quản lý Tuyến đường", href: "/admin/routes", icon: Route },
  { name: "Lịch trình & Phân công", href: "/admin/schedule", icon: Calendar },
]

const monitoringNav = [
  { name: "Theo dõi Real-time", href: "/admin/tracking", icon: MapPin },
  { name: "Thông báo & Cảnh báo", href: "/admin/notifications", icon: Bell },
  { name: "Báo cáo & Thống kê", href: "/admin/reports", icon: BarChart3 },
]

const personalNav = [
  { name: "Hồ sơ cá nhân", href: "/admin/profile", icon: ShieldCheck },
  { name: "Cài đặt hệ thống", href: "/admin/settings", icon: Settings },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Bus className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-bold text-foreground">SSB 1.0</h2>
            <p className="text-xs text-muted-foreground">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {/* Quản lý */}
        <div>
          <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Quản lý
          </p>
          <div className="space-y-1">
            {managementNav.map((item) => {
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

        {/* Giám sát */}
        <div>
          <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Giám sát & Báo cáo
          </p>
          <div className="space-y-1">
            {monitoringNav.map((item) => {
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

        {/* Cá nhân */}
        <div>
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
