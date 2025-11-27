"use client"

import { useEffect, useState, type ReactNode } from "react"
import { useAuth } from "@/lib/auth-context"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Bell, Search, LogOut, Settings, User, Menu, Users } from "lucide-react"
import { Input } from "@/components/ui/input"

interface DashboardLayoutProps {
  children: ReactNode
  sidebar: ReactNode
}

export function DashboardLayout({ children, sidebar }: DashboardLayoutProps) {
  const { user, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const toggleSidebar = () => setIsSidebarOpen((v) => !v)
  const closeSidebar = () => setIsSidebarOpen(false)

  useEffect(() => {
    // Auto-close drawer on route change
    setIsSidebarOpen(false)
  }, [pathname])

  return (
    <div className="flex h-screen bg-muted overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-shrink-0 lg:border-r lg:border-border lg:bg-sidebar">
        {sidebar}
      </aside>

      {/* Mobile Sidebar (Drawer) */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 transform border-r border-border bg-sidebar shadow-lg transition-transform duration-200 ease-in-out lg:hidden",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-hidden={!isSidebarOpen}
      >
        <div className="h-full overflow-y-auto">{sidebar}</div>
      </div>

      {/* Overlay for Mobile Drawer */}
      {isSidebarOpen && (
        <button
          type="button"
          onClick={closeSidebar}
          className="fixed inset-0 z-30 bg-background/60 backdrop-blur-sm lg:hidden"
          aria-label="Đóng menu"
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header / Top Bar */}
        <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between flex-shrink-0 shadow-sm">
          {/* Left: Menu + Search */}
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={toggleSidebar}
              aria-label="Mở menu"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Tìm kiếm..."
                className="pl-10 h-9 bg-background border-input"
              />
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative hover:bg-accent">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-warning rounded-full" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-3 h-10 px-3 hover:bg-accent"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={"/placeholder.svg"} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {user?.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left hidden md:block">
                    <p className="text-sm font-medium">{user?.name || "Người dùng"}</p>
                    <p className="text-xs text-muted-foreground">
                      {user?.email || "Chưa có email"}
                    </p>
                  </div>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Tài khoản của tôi</DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={() => router.push(`/${user?.role}/profile`)}>
                  <User className="w-4 h-4 mr-2" />
                  Hồ sơ cá nhân
                </DropdownMenuItem>

                {user?.role?.toLowerCase() === "parent" && (
                  <DropdownMenuItem onClick={() => router.push("/parent/select-student")}>
                    <Users className="w-4 h-4 mr-2" />
                    Chuyển học sinh
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem onClick={() => router.push(`/${user?.role}/settings`)}>
                  <Settings className="w-4 h-4 mr-2" />
                  Cài đặt
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={logout} className="text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Đăng xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Page Content */}
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  )
}