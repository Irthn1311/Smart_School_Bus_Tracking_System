"use client"

import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter, useSearchParams } from "next/navigation"
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
import { useTripBusPosition } from "@/hooks/use-socket"

export default function AdminDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  // Buses state for MapView (khởi tạo rỗng, chỉ hiển thị marker realtime giống Parent/Driver)
  const [buses, setBuses] = useState<any[]>([])

  // Allow socket test override (?testTrip=42) or env
  const testTripFromQuery = searchParams?.get('testTrip') || searchParams?.get('testTripId') || undefined
  const testTripIdEnv = process.env.NEXT_PUBLIC_TEST_TRIP_ID
  const testTripId = useMemo(() => {
    const v = testTripFromQuery ? Number(testTripFromQuery) : (testTripIdEnv ? Number(testTripIdEnv) : undefined)
    return (typeof v === 'number' && Number.isFinite(v)) ? v : undefined
  }, [testTripFromQuery, testTripIdEnv])
  const { busPosition } = useTripBusPosition(testTripId)

  // Seed an initial marker like Parent/Driver when testTrip is present
  useEffect(() => {
    if (!testTripId) return
    setBuses((prev) => {
      const exists = prev.some((b) => b.id === 'test')
      if (exists) return prev
      return [
        ...prev,
        {
          id: 'test',
          plateNumber: '29B-TEST',
          route: `Trip ${testTripId}`,
          lat: 21.0285,
          lng: 105.8542,
          speed: 0,
          students: 0,
          status: 'running',
        },
      ]
    })
  }, [testTripId])

  // When receiving test bus position, add/update a demo bus marker
  useEffect(() => {
    if (!busPosition || typeof busPosition.lat !== 'number' || typeof busPosition.lng !== 'number') return
    setBuses((prev) => {
      const idx = prev.findIndex((b) => b.id === 'test')
      const updated = {
        id: 'test',
        plateNumber: '29B-TEST',
        route: testTripId ? `Trip ${testTripId}` : 'Demo Trip',
        lat: busPosition.lat,
        lng: busPosition.lng,
        speed: busPosition.speed ?? 0,
        students: 0,
        status: 'running',
      }
      if (idx >= 0) {
        const copy = prev.slice()
        copy[idx] = { ...copy[idx], ...updated }
        return copy
      }
      return [...prev, updated]
    })
  }, [busPosition, testTripId])

  useEffect(() => {
    if (user && user.role?.toLowerCase() !== "admin") {
      const userRole = user.role?.toLowerCase()
      if (userRole === "driver" || userRole === "parent") {
        router.push(`/${userRole}`)
      }
    }
  }, [user, router])

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
            value="12"
            change="+2 so với hôm qua"
            trend="up"
            icon={Bus}
            iconColor="text-primary"
          />
          <StatsCard
            title="Xe đang trễ"
            value="3"
            change="Trung bình 5 phút"
            trend="neutral"
            icon={Clock}
            iconColor="text-warning"
          />
          <StatsCard
            title="Sự cố trong ngày"
            value="1"
            change="Xe R05 - Kẹt xe"
            trend="down"
            icon={AlertTriangle}
            iconColor="text-destructive"
          />
          <StatsCard
            title="Tỷ lệ đúng giờ"
            value="94.5%"
            change="+2.3% so với tuần trước"
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
                  {/* Leaflet MapView with live-updated buses; add ?testTrip=42 to see marker move via script */}
                  <MapView
                    buses={buses as any}
                    height="480px"
                    followFirstMarker
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
                      <p className="text-xs text-muted-foreground">Đang hoạt động</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold">24</p>
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
                  <p className="text-2xl font-bold">342</p>
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
                  <p className="text-2xl font-bold">8</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
