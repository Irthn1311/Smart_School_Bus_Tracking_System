"use client"

import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bus, AlertTriangle, Clock, TrendingUp, MapPin, Users, ArrowRight, Activity } from "lucide-react"
import { StatsCard } from "@/components/admin/stats-card"
import { ActivityFeed } from "@/components/admin/activity-feed"
import { PerformanceChart } from "@/components/admin/performance-chart"
import { BusStatusChart } from "@/components/admin/bus-status-chart"
import { MapView } from "@/components/tracking/MapView"
import { apiClient } from "@/lib/api"

export default function AdminDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [busStats, setBusStats] = useState<any | null>(null)
  const [tripStats, setTripStats] = useState<any | null>(null)
  const todayRange = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear()
    const mm = `${d.getMonth() + 1}`.padStart(2, '0')
    const dd = `${d.getDate()}`.padStart(2, '0')
    const iso = `${yyyy}-${mm}-${dd}`
    return { from: iso, to: iso }
  }, [])

  useEffect(() => {
    if (user && user.role?.toLowerCase() !== "admin") {
      const userRole = user.role?.toLowerCase()
      if (userRole === "driver" || userRole === "parent") {
        router.push(`/${userRole}`)
      }
    }
  }, [user, router])

  useEffect(() => {
    let mounted = true
    async function loadStats() {
      try {
        const bs = await apiClient.getBusStats().catch(() => null as any)
        const ts = await apiClient.getTripStats(todayRange).catch(() => null as any)
        if (!mounted) return
        setBusStats((bs as any)?.data || (bs as any))
        setTripStats((ts as any)?.data || (ts as any))
      } catch {}
    }
    loadStats()
    return () => { mounted = false }
  }, [todayRange])

  if (!user || user.role?.toLowerCase() !== "admin") {
    return null
  }

  return (
    <DashboardLayout sidebar={<AdminSidebar />}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Tổng quan</h1>
            <p className="text-muted-foreground mt-1">Theo dõi hoạt động xe buýt trong thời gian thực</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
              <Activity className="w-4 h-4 mr-2" />
              Xuất báo cáo
            </Button>
            <Button size="sm" className="bg-primary hover:bg-primary/90">
              <MapPin className="w-4 h-4 mr-2" />
              Xem bản đồ đầy đủ
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Chuyến đang hoạt động"
            value={String(tripStats?.totalTrips ?? 0)}
            change={`Hoàn thành: ${tripStats?.completedTrips ?? 0}`}
            trend="up"
            icon={Bus}
            iconColor="text-primary"
          />
          <StatsCard
            title="Xe đang trễ"
            value={String(tripStats?.delayedTrips ?? 0)}
            change="Theo ngày hiện tại"
            trend="neutral"
            icon={Clock}
            iconColor="text-warning"
          />
          <StatsCard
            title="Sự cố trong ngày"
            value={String(0)}
            change="—"
            trend="down"
            icon={AlertTriangle}
            iconColor="text-destructive"
          />
          <StatsCard
            title="Tỷ lệ đúng giờ"
            value={`${tripStats?.onTimePercentage ?? 0}%`}
            change={`Trung bình: ${Math.round((tripStats?.averageDuration ?? 0))} phút/chuyến`}
            trend="up"
            icon={TrendingUp}
            iconColor="text-success"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Charts */}
          <div className="lg:col-span-2 space-y-6">
            {/* Performance Chart */}
            <Card className="border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Hiệu suất tuần này</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      7 ngày qua
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <PerformanceChart />
              </CardContent>
            </Card>

            {/* Bus Status Distribution */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Trạng thái xe buýt</CardTitle>
              </CardHeader>
              <CardContent>
                <BusStatusChart />
              </CardContent>
            </Card>

            {/* Real-time Map Preview */}
            <Card className="border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Bản đồ theo dõi Real-time</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => router.push("/admin/tracking")}>
                    Xem đầy đủ
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardHeader>
                <CardContent>
                  {/* Real-time tracking map with active trips */}
                  <MapView
                    buses={[]}
                    height="480px"
                    autoFitOnUpdate
                  />
                </CardContent>
            </Card>
          </div>

          {/* Right Column - Activity Feed */}
          <div className="space-y-6">
            <ActivityFeed />

            {/* Quick Stats */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Thống kê nhanh</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Bus className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Tổng số xe</p>
                      <p className="text-xs text-muted-foreground">Toàn bộ xe trong hệ thống</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{busStats?.totalBuses ?? '-'}</p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                      <Bus className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Xe hoạt động</p>
                      <p className="text-xs text-muted-foreground">
                        {busStats?.activeBuses ?? 0} xe đang chạy
                      </p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{busStats?.activeBuses ?? '-'}</p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Học sinh</p>
                      <p className="text-xs text-muted-foreground">Đang trên xe</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold">—</p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-warning" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Tuyến đường</p>
                      <p className="text-xs text-muted-foreground">Đang hoạt động</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold">—</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
