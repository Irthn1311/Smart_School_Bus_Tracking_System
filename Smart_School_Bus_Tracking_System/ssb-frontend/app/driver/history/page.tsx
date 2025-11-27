"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { DriverSidebar } from "@/components/driver/driver-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Eye, CheckCircle, Clock, AlertTriangle, CalendarDays, Clock3, User2, Phone, BusFront, BadgeCheck } from "lucide-react"
import { apiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"

export default function DriverHistoryPage() {
  const { user } = useAuth()
  const [trips, setTrips] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const [openDetail, setOpenDetail] = useState(false)
  const [detailTrip, setDetailTrip] = useState<any | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => {
    async function load() {
      if (!user?.id) return
      try {
        setLoading(true)
        const res = await apiClient.getDriverHistory(user.id, { limit: 100 })
        const data = (res as any)?.data || []
        const statsData = (res as any)?.stats || {}
        setTrips(Array.isArray(data) ? data : [])
        setStats(statsData)
      } catch (e) {
        console.error("Failed to load driver history", e)
        toast({ title: "Lỗi", description: "Không thể tải lịch sử chuyến đi", variant: "destructive" })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user, toast])

  async function openTripDetail(trip: any) {
    const id = trip?.maChuyen || trip?.id
    if (!id) return
    setOpenDetail(true)
    setLoadingDetail(true)
    setDetailTrip(null)
    try {
      const res = await apiClient.getTripById(id)
      const data = (res as any)?.data || res
      setDetailTrip(data)
    } catch (e) {
      toast({ title: "Lỗi", description: "Không thể tải chi tiết chuyến đi", variant: "destructive" })
      setOpenDetail(false)
    } finally {
      setLoadingDetail(false)
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ""
    const d = new Date(dateStr)
    return d.toLocaleDateString("vi-VN")
  }

  const formatTime = (timeStr: string) => {
    if (!timeStr) return ""
    return timeStr.slice(0, 5) // HH:mm
  }

  return (
    <DashboardLayout sidebar={<DriverSidebar />}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Lịch sử chuyến đi</h1>
          <p className="text-muted-foreground mt-1">Xem lại các chuyến đi đã hoàn thành</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-foreground">{stats?.totalTrips || trips.length}</div>
              <p className="text-sm text-muted-foreground">Tổng chuyến</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-success">{stats?.onTimeTrips || 0}</div>
              <p className="text-sm text-muted-foreground">Đúng giờ</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-warning">{stats?.delayedTrips || 0}</div>
              <p className="text-sm text-muted-foreground">Trễ</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-destructive">{stats?.incidents || 0}</div>
              <p className="text-sm text-muted-foreground">Sự cố</p>
            </CardContent>
          </Card>
        </div>

        {/* History Table */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Lịch sử chuyến đi</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ngày</TableHead>
                      <TableHead>Tuyến</TableHead>
                      <TableHead>Thời gian</TableHead>
                      <TableHead>Học sinh</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24 rounded-full" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-20 inline-block" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : trips.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">Chưa có chuyến đi nào</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ngày</TableHead>
                    <TableHead>Tuyến</TableHead>
                    <TableHead>Thời gian</TableHead>
                    <TableHead>Học sinh</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trips.map((trip: any) => {
                    const isOnTime = trip.gioBatDauThucTe && trip.gioKhoiHanh
                      ? new Date(`${trip.ngayChay} ${trip.gioKhoiHanh}`) >= new Date(trip.gioBatDauThucTe)
                      : false
                    const status = trip.trangThai
                    return (
                      <TableRow key={trip.maChuyen || trip.id}>
                        <TableCell className="font-medium">{formatDate(trip.ngayChay)}</TableCell>
                        <TableCell>{trip.tenTuyen || trip.route || "-"}</TableCell>
                        <TableCell>
                          {formatTime(trip.gioKhoiHanh || trip.startTime)}
                          {trip.gioBatDauThucTe ? ` - ${formatTime(new Date(trip.gioBatDauThucTe).toTimeString().slice(0, 5))}` : ""}
                        </TableCell>
                        <TableCell>{trip.soHocSinh || trip.students || 0}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {status === "hoan_thanh" && isOnTime && (
                              <>
                                <CheckCircle className="w-4 h-4 text-success" />
                                <Badge variant="outline" className="border-success text-success">
                                  Hoàn thành
                                </Badge>
                              </>
                            )}
                            {status === "hoan_thanh" && !isOnTime && (
                              <>
                                <Clock className="w-4 h-4 text-warning" />
                                <Badge variant="outline" className="border-warning text-warning">
                                  Trễ
                                </Badge>
                              </>
                            )}
                            {status === "huy" && (
                              <>
                                <AlertTriangle className="w-4 h-4 text-destructive" />
                                <Badge variant="outline" className="border-destructive text-destructive">
                                  Hủy
                                </Badge>
                              </>
                            )}
                            {status === "dang_chay" && (
                              <Badge variant="outline" className="border-primary text-primary">
                                Đang chạy
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => openTripDetail(trip)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Chi tiết
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        {/* Detail dialog */}
        <DriverTripDetailDialog open={openDetail} onOpenChange={setOpenDetail} data={detailTrip} loading={loadingDetail} />
      </div>
    </DashboardLayout>
  )
}

// Detail dialog UI appended below main component
function DriverTripDetailDialog({ open, onOpenChange, data, loading }: { open: boolean, onOpenChange: (v: boolean) => void, data: any, loading: boolean }) {
  const d = data || {}
  const title = d.tenTuyen ? `${d.tenTuyen}` : (d.maChuyen ? `Chuyến #${d.maChuyen}` : 'Chi tiết chuyến đi')
  const dateStr = d.ngayChay ? new Date(d.ngayChay).toLocaleDateString('vi-VN') : '-'
  const planned = d.gioKhoiHanh || '-'
  const actual = d.gioBatDauThucTe ? new Date(d.gioBatDauThucTe).toTimeString().slice(0,5) : '-'
  const finished = d.gioKetThucThucTe ? new Date(d.gioKetThucThucTe).toTimeString().slice(0,5) : '-'
  const status = d.trangThai || '-'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BusFront className="w-5 h-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            Ngày chạy: {dateStr}
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-48" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between border rounded-md p-3">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-2">
              <BadgeCheck className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Trạng thái:</span>
              <Badge variant="outline" className="ml-1 uppercase">
                {status}
              </Badge>
            </div>
            <Separator />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoRow icon={<BusFront className="w-4 h-4" />} label="Biển số" value={d.bienSoXe || '-'} />
              <InfoRow icon={<BadgeCheck className="w-4 h-4" />} label="Loại chuyến" value={d.loaiChuyen || '-'} />
              <InfoRow icon={<Clock3 className="w-4 h-4" />} label="Giờ KH (kế hoạch)" value={planned} />
              <InfoRow icon={<Clock className="w-4 h-4" />} label="Bắt đầu (thực tế)" value={actual} />
              <InfoRow icon={<Clock className="w-4 h-4" />} label="Kết thúc (thực tế)" value={finished} />
              <InfoRow icon={<User2 className="w-4 h-4" />} label="Tài xế" value={d.tenTaiXe || '-'} />
              <InfoRow icon={<Phone className="w-4 h-4" />} label="SĐT tài xế" value={d.sdtTaiXe || '-'} />
            </div>
            {d.ghiChu ? (
              <>
                <Separator />
                <div className="text-xs text-muted-foreground">{d.ghiChu}</div>
              </>
            ) : null}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Đóng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Small info row with icon on the left and value on the right
function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border rounded-md p-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  )
}
