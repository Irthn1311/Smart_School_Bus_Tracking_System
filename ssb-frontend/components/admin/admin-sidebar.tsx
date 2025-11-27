"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useLanguage } from "@/lib/language-context"
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

export function AdminSidebar() {
  const pathname = usePathname()
  const { t } = useLanguage()

  const managementNav = [
    { name: t("sidebar.overview"), href: "/admin", icon: LayoutDashboard },
    { name: t("sidebar.busManagement"), href: "/admin/buses", icon: Bus },
    { name: t("sidebar.driverManagement"), href: "/admin/drivers", icon: UserCircle },
    { name: t("sidebar.studentManagement"), href: "/admin/students", icon: Users },
    { name: t("sidebar.optimizeStops"), href: "/admin/bus-stop-optimization", icon: Zap },
    { name: t("sidebar.routeManagement"), href: "/admin/routes", icon: Route },
    { name: t("sidebar.scheduleAssignment"), href: "/admin/schedule", icon: Calendar },
  ]

  const monitoringNav = [
    { name: t("sidebar.realtimeTracking"), href: "/admin/tracking", icon: MapPin },
    { name: t("sidebar.notificationsAlerts"), href: "/admin/notifications", icon: Bell },
    { name: t("sidebar.reportsStatistics"), href: "/admin/reports", icon: BarChart3 },
  ]

  const personalNav = [
    { name: t("sidebar.personalProfile"), href: "/admin/profile", icon: ShieldCheck },
    { name: t("sidebar.systemSettings"), href: "/admin/settings", icon: Settings },
  ]

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
            <p className="text-xs text-muted-foreground">{t("sidebar.adminPanel")}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {/* Quản lý */}
        <div>
          <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t("sidebar.management")}
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
            {t("sidebar.monitoring")}
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
            {t("sidebar.personal")}
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
