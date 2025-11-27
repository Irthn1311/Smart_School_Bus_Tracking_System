"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ParentSidebar } from "@/components/parent/parent-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calendar, Clock, CheckCircle2, XCircle, Search, Loader2, Filter, MapPin, Bus, User } from "lucide-react"
import { apiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

export default function ParentHistory() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTrip, setSelectedTrip] = useState<any>(null)
  const [showTripDetail, setShowTripDetail] = useState(false)
  
  // Filter states
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [tripTypeFilter, setTripTypeFilter] = useState<string>("all")

  useEffect(() => {
    if (user && user.role !== "parent") {
      router.push(`/${user.role}`)
    }
  }, [user, router])

  if (!user || user.role !== "parent") {
    return null
  }

  useEffect(() => {
    loadHistory()
  }, [dateFrom, dateTo])

  const loadHistory = async () => {
    try {
      setLoading(true)
      const params: any = { limit: 100 }
      if (dateFrom) params.from = dateFrom
      if (dateTo) params.to = dateTo
      
      const res = await apiClient.getTripHistory(params)
      const arr = Array.isArray(res?.data) ? res.data : []
      setItems(arr)
    } catch (e: any) {
      console.error("Error loading history:", e)
      toast({
        title: "Lỗi",
        description: e?.message || "Không thể tải lịch sử chuyến đi",
        variant: "destructive",
      })
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  // Calculate statistics
  const calculateStats = () => {
    const totalTrips = items.length
    const completedTrips = items.filter((t) => t.trangThai === "hoan_thanh").length
    const absentTrips = items.filter((t) => t.trangThai === "vang" || t.trangThaiHocSinh === "vang").length
    
    // Calculate on-time rate (trips without delay)
    const onTimeTrips = items.filter((t) => {
      if (t.trangThai !== "hoan_thanh") return false
      // Check if there's delay information
      const delayMinutes = t.doTr || t.delayMinutes || 0
      return delayMinutes <= 5 // Consider on-time if delay <= 5 minutes
    }).length
    
    const onTimeRate = completedTrips > 0 ? Math.round((onTimeTrips / completedTrips) * 100) : 0
    
    // Calculate average delay
    const delays = items
      .filter((t) => t.trangThai === "hoan_thanh")
      .map((t) => t.doTr || t.delayMinutes || 0)
      .filter((d) => d > 0)
    const avgDelay = delays.length > 0 
      ? Math.round(delays.reduce((a, b) => a + b, 0) / delays.length)
      : 0

    return {
      totalTrips,
      completedTrips,
      onTimeRate,
      avgDelay,
      absences: absentTrips,
    }
  }

  const stats = calculateStats()

  // Filter items
  const filteredItems = items.filter((trip) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesSearch =
        trip.ngayChay?.toLowerCase().includes(query) ||
        trip.bienSoXe?.toLowerCase().includes(query) ||
        trip.tenTuyen?.toLowerCase().includes(query) ||
        trip.maChuyen?.toString().includes(query)
      if (!matchesSearch) return false
    }

    // Status filter
    if (statusFilter !== "all") {
      if (statusFilter === "completed" && trip.trangThai !== "hoan_thanh") return false
      if (statusFilter === "absent" && trip.trangThai !== "vang" && trip.trangThaiHocSinh !== "vang") return false
      if (statusFilter === "in-progress" && trip.trangThai !== "dang_chay") return false
    }

    // Trip type filter
    if (tripTypeFilter !== "all") {
      if (trip.loaiChuyen !== tripTypeFilter) return false
    }

    return true
  })

  const handleViewDetails = async (trip: any) => {
    try {
      // Try to get detailed trip information
      if (trip.maChuyen) {
        const detailRes = await apiClient.getTripById(trip.maChuyen)
        const detail = (detailRes as any)?.data || detailRes || trip
        setSelectedTrip(detail)
      } else {
        setSelectedTrip(trip)
      }
      setShowTripDetail(true)
    } catch (e: any) {
      console.error("Error loading trip details:", e)
      setSelectedTrip(trip)
      setShowTripDetail(true)
    }
  }

  return (
    <DashboardLayout sidebar={<ParentSidebar />}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Lịch sử chuyến đi</h1>
          <p className="text-muted-foreground mt-1">Xem lại các chuyến đi của con bạn</p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tổng chuyến đi</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{stats.totalTrips}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tỷ lệ đúng giờ</p>
                  <p className="text-2xl font-bold text-green-500 mt-1">{stats.onTimeRate}%</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Trễ trung bình</p>
                  <p className="text-2xl font-bold text-orange-500 mt-1">{stats.avgDelay} phút</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-orange-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Vắng mặt</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{stats.absences}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Bộ lọc
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateFrom">Từ ngày</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateTo">Đến ngày</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="statusFilter">Trạng thái</Label>
                <select
                  id="statusFilter"
                  className="w-full border border-border rounded-md p-2 text-sm bg-background"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">Tất cả</option>
                  <option value="completed">Hoàn thành</option>
                  <option value="in-progress">Đang chạy</option>
                  <option value="absent">Vắng mặt</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tripTypeFilter">Loại chuyến</Label>
                <select
                  id="tripTypeFilter"
                  className="w-full border border-border rounded-md p-2 text-sm bg-background"
                  value={tripTypeFilter}
                  onChange={(e) => setTripTypeFilter(e.target.value)}
                >
                  <option value="all">Tất cả</option>
                  <option value="don_sang">Đón sáng</option>
                  <option value="tra_chieu">Trả chiều</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trip History Table */}
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <CardTitle>Danh sách chuyến đi ({filteredItems.length})</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Không có chuyến đi nào
              </div>
            ) : (
              <div className="space-y-3">
                {filteredItems.map((trip: any, idx: number) => (
                <div
                  key={idx}
                  className="p-4 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-mono">
                          {trip.ngayChay}
                        </Badge>
                        <Badge variant={trip.loaiChuyen === "don_sang" ? "default" : "secondary"}>
                          {trip.loaiChuyen === "don_sang" ? "Buổi sáng" : "Buổi chiều"}
                        </Badge>
                        {trip.trangThai === "hoan_thanh" && (
                          <Badge variant="default" className="bg-green-500/20 text-green-700 hover:bg-green-500/30">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Hoàn thành
                          </Badge>
                        )}
                        {trip.trangThai === "vang" && (
                          <Badge variant="default" className="bg-red-500/20 text-red-700 hover:bg-red-500/30">
                            <XCircle className="w-3 h-3 mr-1" />
                            Vắng mặt
                          </Badge>
                        )}
                        {false && (
                          <Badge variant="default" className="bg-orange-500/20 text-orange-700 hover:bg-orange-500/30">
                            Trễ 0 phút
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="space-y-1">
                          <p className="text-muted-foreground">Xe buýt</p>
                          <p className="font-medium text-foreground">{trip.bienSoXe || ""}</p>
                          <p className="text-xs text-muted-foreground">{trip.tenTuyen || ""}</p>
                        </div>

                        <div className="space-y-1">
                          <p className="text-muted-foreground">Thời gian đón</p>
                          <p className="font-medium text-foreground">
                            {trip.thoiGianDon || trip.gioKhoiHanh || "—"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Dự kiến: {trip.gioKhoiHanh || "—"}
                          </p>
                          {trip.doTr > 0 && (
                            <Badge variant="destructive" className="mt-1 text-xs">
                              Trễ {trip.doTr} phút
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-1">
                          <p className="text-muted-foreground">Thời gian trả</p>
                          <p className="font-medium text-foreground">
                            {trip.thoiGianTra || "—"}
                          </p>
                          {trip.gioKetThuc && (
                            <p className="text-xs text-muted-foreground">
                              Dự kiến: {trip.gioKetThuc}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <Button variant="ghost" size="sm" onClick={() => handleViewDetails(trip)}>
                      Chi tiết
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            )}
          </CardContent>
        </Card>

        {/* Trip Detail Dialog */}
        <Dialog open={showTripDetail} onOpenChange={setShowTripDetail}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Chi tiết chuyến đi</DialogTitle>
            </DialogHeader>
            {selectedTrip && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Ngày chạy</Label>
                    <p className="font-medium">{selectedTrip.ngayChay || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Loại chuyến</Label>
                    <p className="font-medium">
                      {selectedTrip.loaiChuyen === "don_sang" ? "Đón sáng" : "Trả chiều"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Xe buýt</Label>
                    <p className="font-medium">{selectedTrip.bienSoXe || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Tuyến đường</Label>
                    <p className="font-medium">{selectedTrip.tenTuyen || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Tài xế</Label>
                    <p className="font-medium">{selectedTrip.tenTaiXe || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Trạng thái</Label>
                    <div className="mt-1">
                      {selectedTrip.trangThai === "hoan_thanh" ? (
                        <Badge className="bg-green-500/20 text-green-700">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Hoàn thành
                        </Badge>
                      ) : selectedTrip.trangThai === "vang" || selectedTrip.trangThaiHocSinh === "vang" ? (
                        <Badge className="bg-red-500/20 text-red-700">
                          <XCircle className="w-3 h-3 mr-1" />
                          Vắng mặt
                        </Badge>
                      ) : (
                        <Badge variant="outline">Đang chạy</Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2">Thời gian</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-muted-foreground">Giờ khởi hành dự kiến</Label>
                      <p className="font-medium">{selectedTrip.gioKhoiHanh || "—"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Thời gian đón thực tế</Label>
                      <p className="font-medium">{selectedTrip.thoiGianDon || "—"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Giờ kết thúc dự kiến</Label>
                      <p className="font-medium">{selectedTrip.gioKetThuc || "—"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Thời gian trả thực tế</Label>
                      <p className="font-medium">{selectedTrip.thoiGianTra || "—"}</p>
                    </div>
                  </div>
                  {selectedTrip.doTr > 0 && (
                    <div className="mt-2">
                      <Badge variant="destructive">
                        Trễ {selectedTrip.doTr} phút
                      </Badge>
                    </div>
                  )}
                </div>

                {selectedTrip.ghiChu && (
                  <div className="border-t pt-4">
                    <Label className="text-muted-foreground">Ghi chú</Label>
                    <p className="text-sm mt-1">{selectedTrip.ghiChu}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
