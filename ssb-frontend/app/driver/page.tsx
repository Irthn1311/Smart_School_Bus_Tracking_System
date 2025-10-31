"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { DriverSidebar } from "@/components/driver/driver-sidebar"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, MapPin, Users, Play } from "lucide-react"
import { apiClient } from "@/lib/api"
import MapView from '@/components/tracking/MapView'
import { startTripStrict as startTrip } from '@/lib/services/trip.service'
import { useToast } from '@/hooks/use-toast'


// Remove hardcoded todayTrips; we'll use real API

export default function DriverDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [trips, setTrips] = useState<any[]>([])
  const [stops, setStops] = useState<{ id: string; lat: number; lng: number; label?: string }[]>([])
  const { toast } = useToast()

  useEffect(() => {
    if (user && user.role?.toLowerCase() !== "driver") {
      const userRole = user.role?.toLowerCase()
      if (userRole === "admin" || userRole === "parent") {
        router.push(`/${userRole}`)
      }
    }
  }, [user, router])

  // Load TRIPS (hôm nay) cho tài xế đăng nhập và dựng stops cho trip đang chạy (nếu có)
  useEffect(() => {
    if (!user) return

    async function load() {
      try {
        const driverIdNum = Number(user!.id)
        // Chỉ lấy TRIPS hôm nay của tài xế, lọc trạng thái 'chua_khoi_hanh' | 'dang_chay'
        // Dùng múi giờ VN để tránh lệch ngày
        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
        let normalized: any[] = []
        try {
          // Gọi BE với ngayChay + maTaiXe để backend lọc đúng
          const rTrips = await apiClient.getTrips({ ngayChay: todayStr, maTaiXe: driverIdNum })
          const tripsRaw: any[] = Array.isArray(rTrips?.data) ? rTrips.data : []
          // Fallback filter phía FE (phòng trường hợp BE chưa trả maTaiXe)
          const tripsMine = tripsRaw.length ? tripsRaw.filter((t: any) => (
            typeof t?.maTaiXe !== 'undefined' ? Number(t.maTaiXe) === driverIdNum : true
          )) : []
          const tripsActive = tripsMine.filter((t: any) => t?.trangThai === 'chua_khoi_hanh' || t?.trangThai === 'dang_chay')
          normalized = tripsActive
        } catch {
          normalized = []
        }

        setTrips(normalized)

        // Dựng stops từ trip đang chạy (nếu có)
        const active = normalized.find((t: any) => t.trangThai === 'dang_chay')
        if (active && active.maChuyen) {
          try {
            const detailRes = await apiClient.getTripById(active.maChuyen)
            const detail = detailRes && detailRes.data ? detailRes.data : detailRes
            const detailAny: any = detail
            const routeStops = detailAny?.routeInfo?.diemDung || []
            const mappedStops = (routeStops || []).map((s: any) => ({ id: s.maDiem || s.id || s.maDiemDung || `${s.lat}_${s.lng}`, lat: Number(s.viDo || s.lat || s.latitude), lng: Number(s.kinhDo || s.lng || s.longitude), label: s.tenDiem || s.ten || s.label }))
            setStops(mappedStops.filter((s: any) => Number.isFinite(s.lat) && Number.isFinite(s.lng)))
          } catch {
            setStops([])
          }
        } else {
          setStops([])
        }
      } catch (err) {
        console.error('Failed to load trips for driver', err)
        setStops([])
      }
    }

    load()
  }, [user])

  if (!user || user.role?.toLowerCase() !== "driver") {
    return null
  }

  return (
    <DashboardLayout sidebar={<DriverSidebar />}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Lịch trình hôm nay</h1>
          <p className="text-muted-foreground mt-1">Quản lý chuyến đi và điểm dừng của bạn</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-foreground">2</div>
              <p className="text-sm text-muted-foreground">Chuyến hôm nay</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-primary">28</div>
              <p className="text-sm text-muted-foreground">Học sinh</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-success">156</div>
              <p className="text-sm text-muted-foreground">Chuyến hoàn thành</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-foreground">94.5%</div>
              <p className="text-sm text-muted-foreground">Đúng giờ</p>
            </CardContent>
          </Card>
        </div>

        {/* Today's Trips + Map */}
        <div className={stops.length > 0 ? "grid grid-cols-1 lg:grid-cols-3 gap-6" : "space-y-5"}>
          <div className={stops.length > 0 ? "lg:col-span-1 space-y-5" : "space-y-5"}>
            <h2 className="text-xl font-semibold text-foreground">Chuyến đi hôm nay</h2>
            {trips.map((trip: any, idx: number) => {
              const tripId = trip.maChuyen || trip.maChuyenDi || trip.id || idx
              const title = trip.tenTuyen || trip.route || trip.moTa || trip.loai || `Chuyến ${tripId}`
              const isNotStarted = trip.trangThai === 'chua_khoi_hanh'
              const isRunning = trip.trangThai === 'dang_chay'
              return (
                <Card key={tripId} className="border-border/50">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-medium text-foreground">{title}</h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {/* Ưu tiên giờ khởi hành từ lịch trình nếu không có giờ thực tế */}
                            {trip.gioBatDauThucTe || trip.gioKhoiHanh || trip.startTime || '-'}
                            {" "}-{" "}
                            {trip.gioKetThucThucTe || trip.endTime || '-'}
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {Array.isArray(trip.diemDung) ? trip.diemDung.length : (trip.stops || '-')} điểm dừng
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {trip.soHocSinh || trip.students || '-'} học sinh
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="border-primary text-primary">
                        {trip.trangThai || trip.status || (trip.dangApDung ? 'Đang áp dụng' : 'Đã lên lịch')}
                      </Badge>
                    </div>

                    {isNotStarted ? (
                      <Button
                        className="w-full bg-primary hover:bg-primary/90 cursor-pointer"
                        onClick={async () => {
                          try {
                            const res = await startTrip(tripId)
                            const newId = (res as any)?.data?.maChuyen || (res as any)?.trip?.maChuyen || tripId
                            toast({ title: 'Đã bắt đầu chuyến đi', description: `Trip ${newId} đang chạy` })
                            router.push(`/driver/trip/${newId}`)
                          } catch (e) {
                            toast({ title: 'Không thể bắt đầu qua API', description: 'Đi tiếp vào trang chuyến đi', variant: 'destructive' })
                            router.push(`/driver/trip/${tripId}`)
                          }
                        }}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Bắt đầu chuyến đi
                      </Button>
                    ) : (
                      <Button
                        className="w-full bg-primary hover:bg-primary/90 cursor-pointer"
                        onClick={() => router.push(`/driver/trip/${tripId}`)}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Vào chi tiết chuyến đi
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {stops.length > 0 && (
            <div className="lg:col-span-2">
              <MapView buses={[]} stops={stops} height="640px" />
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
