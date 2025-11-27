"use client"

import { useEffect, useMemo, useState } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
  FileText,
  Users,
  Bus,
  Clock,
  AlertTriangle,
} from "lucide-react"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import apiClient from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState("7days")
  // Đồng bộ loại báo cáo với tab đang chọn
  const [activeTab, setActiveTab] = useState<string>("trips")
  const reportType = activeTab // map trực tiếp: trips|buses|drivers|students|incidents
  const [loading, setLoading] = useState(true)
  const [tableLoading, setTableLoading] = useState(false)
  const [reportData, setReportData] = useState<any>(null)
  const { toast } = useToast()

  // Backend stats
  const [stats, setStats] = useState<{
    totalTrips: number
    onTimeRate: number
    totalStudents: number
    avgDelay: number
    incidents: number
    activeBuses: number
  } | null>(null)

  // Map dateRange to from/to (YYYY-MM-DD)
  const { from, to } = useMemo(() => {
    const now = new Date()
    const end = new Date(now)
    let start = new Date(now)
    if (dateRange === "7days") start.setDate(start.getDate() - 6)
    else if (dateRange === "30days") start.setDate(start.getDate() - 29)
    else if (dateRange === "90days") start.setDate(start.getDate() - 89)
    else start.setDate(start.getDate() - 6) // default 7 days
    
    const formatDate = (d: Date) => {
      const yyyy = d.getFullYear()
      const mm = `${d.getMonth() + 1}`.padStart(2, '0')
      const dd = `${d.getDate()}`.padStart(2, '0')
      return `${yyyy}-${mm}-${dd}`
    }
    
    return { from: formatDate(start), to: formatDate(end) }
  }, [dateRange])

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        const res = await apiClient.getReportsOverview({ from, to })
        const data: any = (res as any)?.data || {}
        const buses = data.buses || {}
        const trips = data.trips || {}
        // Derive UI stats with safe fallbacks
        const totalTrips = Number(trips.total || 0)
        const completed = Number(trips.completed || 0)
        const delayed = Number(trips.delayed || 0)
        const onTime = Math.max(completed - delayed, 0)
        const onTimeRate = totalTrips > 0 ? Math.round((onTime / totalTrips) * 100) : 0
        const avgDelay = Number(trips.averageDurationMinutes || 0) > 0 ? Math.max(Math.round((delayed / (totalTrips || 1)) * 10) / 10, 0) : 0
        const activeBuses = Number(buses.active || 0)
        // Note: totalStudents/incidents are not provided by BE yet → keep placeholders  from UI context
        const derived = {
          totalTrips,
          onTimeRate,
          totalStudents: Number(data.students?.total || 0),
          avgDelay: Number(trips.avgDelayMinutes || data.trips?.avgDelayMinutes || 0),
          incidents: Number(data.incidents?.total || 0),
          activeBuses,
        }
        if (mounted) setStats(derived)
      } catch (e: any) {
        console.warn("Failed to load reports overview", e)
        toast({ title: "Không tải được báo cáo", description: e?.message || "Vui lòng thử lại", variant: "destructive" })
        if (mounted) setStats(null)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [from, to, toast])

  // Load table data for current tab/type
  useEffect(() => {
    let mounted = true
    async function loadReport() {
      try {
        setTableLoading(true)
        const res = await apiClient.getReportView({ type: reportType, from, to })
        if (mounted) setReportData((res as any)?.data || null)
      } catch (e: any) {
        if (mounted) setReportData(null)
        toast({ title: "Không tải được dữ liệu báo cáo", description: e?.message || "Vui lòng thử lại", variant: "destructive" })
      } finally {
        if (mounted) setTableLoading(false)
      }
    }
    loadReport()
    return () => { mounted = false }
  }, [reportType, from, to, toast])

  const renderReportTable = () => {
    const type = reportType
    const d = reportData || {}
    let rows: any[] = []
    let columns: { key: string; label: string }[] = []

    if (type === "trips") {
      rows = Array.isArray(d.trips) ? d.trips : []
      columns = [
        { key: "maChuyen", label: "Mã chuyến" },
        { key: "ngayChay", label: "Ngày chạy" },
        { key: "tenTuyen", label: "Tuyến" },
        { key: "bienSoXe", label: "Biển số" },
        { key: "tenTaiXe", label: "Tài xế" },
        { key: "trangThai", label: "Trạng thái" },
      ]
    } else if (type === "buses") {
      rows = Array.isArray(d.buses) ? d.buses : []
      columns = [
        { key: "maXe", label: "Mã xe" },
        { key: "bienSoXe", label: "Biển số" },
        { key: "dongXe", label: "Dòng xe" },
        { key: "sucChua", label: "Sức chứa" },
        { key: "trangThai", label: "Trạng thái" },
      ]
    } else if (type === "drivers") {
      rows = Array.isArray(d.drivers) ? d.drivers : []
      columns = [
        { key: "maTaiXe", label: "Mã tài xế" },
        { key: "hoTen", label: "Họ tên" },
        { key: "soBangLai", label: "Bằng lái" },
        { key: "soDienThoai", label: "SĐT" },
        { key: "trangThai", label: "Trạng thái" },
      ]
    } else if (type === "students") {
      rows = Array.isArray(d.students) ? d.students : []
      columns = [
        { key: "maHocSinh", label: "Mã học sinh" },
        { key: "hoTen", label: "Họ tên" },
        { key: "lop", label: "Lớp" },
        { key: "tenPhuHuynh", label: "Phụ huynh" },
        { key: "sdtPhuHuynh", label: "SĐT PH" },
      ]
    } else if (type === "incidents") {
      rows = Array.isArray(d.incidents) ? d.incidents : []
      columns = [
        { key: "maSuCo", label: "Mã sự cố" },
        { key: "loaiSuCo", label: "Loại" },
        { key: "mucDo", label: "Mức độ" },
        { key: "moTa", label: "Mô tả" },
        { key: "ngayTao", label: "Ngày" },
      ]
    }

    const sliced = rows.slice(0, 10)
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>
            Dữ liệu (top {sliced.length}{rows.length > 10 ? ` / ${rows.length}` : ""})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tableLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : sliced.length === 0 ? (
            <p className="text-sm text-muted-foreground">Không có dữ liệu trong khoảng thời gian đã chọn.</p>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground">
                    {columns.map((c) => (
                      <th key={c.key} className="text-left py-2 pr-4 whitespace-nowrap">{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sliced.map((r, idx) => (
                    <tr key={idx} className="border-t border-border/50">
                      {columns.map((c) => (
                        <td key={c.key} className="py-2 pr-4 whitespace-nowrap max-w-[260px] truncate" title={String((r as any)[c.key] ?? "")}> {String((r as any)[c.key] ?? "")} </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // Mock data for charts
  const [tripTrendData, setTripTrendData] = useState<any[]>([])

  const [busUtilizationData, setBusUtilizationData] = useState<any[]>([])

  const [attendanceData, setAttendanceData] = useState<any[]>([])

  const [incidentData, setIncidentData] = useState<any[]>([])

  const [driverPerformanceData, setDriverPerformanceData] = useState<any[]>([])

  // Load charts real data
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await apiClient.getReportView({ type: 'trips', from, to })
        const d: any = (res as any)?.data || {}
        const trend = Array.isArray(d.trend) ? d.trend : []
        if (mounted) setTripTrendData(trend.map((it: any) => {
          const rawDate = it.date || it.day || ''
          let label = rawDate
          try {
            if (rawDate) {
              const dObj = new Date(rawDate + 'T00:00:00')
              if (!isNaN(dObj.getTime())) {
                label = dObj.toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit' })
              }
            }
          } catch {}
          return {
            date: rawDate, // full date for tooltip
            dayLabel: label, // compact label for axis
            trips: Number(it.total || 0),
            onTime: Number(it.onTime || 0),
            late: Number(it.late || 0),
          }
        }))

        const buses = Array.isArray(d.busUtilization) ? d.busUtilization : []
        if (mounted) setBusUtilizationData(buses.map((b: any) => ({
          name: b.plateNumber || b.bienSoXe || '',
          trips: Number(b.trips || 0),
          utilization: Number(b.utilization || 0), // %
          scheduledTrips: Number(b.scheduledTrips || 0),
          activeDays: Number(b.activeDays || 0),
          onTimeRate: Number(b.onTimeRate || 0),
        })))

        const drivers = Array.isArray(d.driverPerformance) ? d.driverPerformance : []
        if (mounted) setDriverPerformanceData(drivers.map((dr: any) => ({
          name: dr.name || dr.hoTen || '',
          trips: Number(dr.trips || 0),
          onTimeRate: Number(dr.onTimeRate || 0),
          rating: Number(dr.rating || 0),
        })))

        const attendance = d.attendance || {}
        const total = Number(attendance.total || 0)
        if (mounted) setAttendanceData([
          { name: 'Có mặt', value: Number(attendance.present || 0), color: '#10b981' },
          { name: 'Vắng mặt', value: Number(attendance.absent || 0), color: '#ef4444' },
          { name: 'Đi muộn', value: Number(attendance.late || 0), color: '#f59e0b' },
        ])

        const incidents = Array.isArray(d.incidents) ? d.incidents : []
        if (mounted) setIncidentData(incidents.map((it: any) => ({
          type: it.type || it.loaiSuCo || '',
          count: Number(it.count || 0),
          severity: it.severity || it.mucDo || 'low',
        })))
      } catch (e) {
        console.warn('Failed to load report charts', e)
      }
    })()
    return () => { mounted = false }
  }, [from, to])

  const uiStats = stats || {
    totalTrips: 0,
    onTimeRate: 0,
    totalStudents: 0,
    avgDelay: 0,
    incidents: 0,
    activeBuses: 0,
  }

  return (
    <DashboardLayout sidebar={<AdminSidebar />}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Báo cáo & Thống kê</h1>
            <p className="text-muted-foreground mt-1">Phân tích dữ liệu và tạo báo cáo chi tiết</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">7 ngày qua</SelectItem>
                <SelectItem value="30days">30 ngày qua</SelectItem>
                <SelectItem value="90days">90 ngày qua</SelectItem>
                <SelectItem value="custom">Tùy chỉnh</SelectItem>
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button className="gap-2">
                  <Download className="w-4 h-4" />
                  Xuất báo cáo
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[240px] p-3" align="end">
                <div className="grid gap-2">
                  <Button 
                    variant="outline" 
                    className="gap-2 justify-start"
                    onClick={async () => {
                      try {
                        const blob = await apiClient.exportReport({ format: "pdf", type: activeTab, from, to })
                        const url = window.URL.createObjectURL(blob)
                        const a = document.createElement("a")
                        a.href = url
                        a.download = `report_${activeTab}_${from}_${to}.pdf`
                        document.body.appendChild(a)
                        a.click()
                        window.URL.revokeObjectURL(url)
                        document.body.removeChild(a)
                        toast({ title: "Thành công", description: "Đã xuất báo cáo PDF" })
                      } catch (e) {
                        toast({ title: "Lỗi", description: "Không thể xuất PDF", variant: "destructive" })
                      }
                    }}
                  >
                    <Download className="w-4 h-4 text-primary" />
                    Xuất PDF
                  </Button>

                  <Button 
                    variant="outline" 
                    className="gap-2 justify-start"
                    onClick={async () => {
                      try {
                        const blob = await apiClient.exportReport({ format: "xlsx", type: activeTab, from, to })
                        const url = window.URL.createObjectURL(blob)
                        const a = document.createElement("a")
                        a.href = url
                        a.download = `report_${activeTab}_${from}_${to}.xlsx`
                        document.body.appendChild(a)
                        a.click()
                        window.URL.revokeObjectURL(url)
                        document.body.removeChild(a)
                        toast({ title: "Thành công", description: "Đã xuất báo cáo Excel" })
                      } catch (e) {
                        toast({ title: "Lỗi", description: "Không thể xuất Excel", variant: "destructive" })
                      }
                    }}
                  >
                    <Download className="w-4 h-4 text-green-500" />
                    Xuất Excel
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          {/* Removed quick report-type chooser per request */}
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tổng chuyến đi</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{uiStats.totalTrips}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <TrendingUp className="w-3 h-3 text-green-500" />
                    <span className="text-xs text-green-500">+12%</span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Bus className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tỷ lệ đúng giờ</p>
                  <p className="text-2xl font-bold text-green-500 mt-1">{uiStats.onTimeRate}%</p>
                  <div className="flex items-center gap-1 mt-2">
                    <TrendingUp className="w-3 h-3 text-green-500" />
                    <span className="text-xs text-green-500">+3%</span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Học sinh</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{uiStats.totalStudents}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <TrendingUp className="w-3 h-3 text-green-500" />
                    <span className="text-xs text-green-500">+5</span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Trễ TB</p>
                  <p className="text-2xl font-bold text-orange-500 mt-1">{uiStats.avgDelay}m</p>
                  <div className="flex items-center gap-1 mt-2">
                    <TrendingDown className="w-3 h-3 text-green-500" />
                    <span className="text-xs text-green-500">-0.5m</span>
                  </div>
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
                  <p className="text-sm text-muted-foreground">Sự cố</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{uiStats.incidents}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <TrendingDown className="w-3 h-3 text-green-500" />
                    <span className="text-xs text-green-500">-8</span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Xe hoạt động</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{uiStats.activeBuses}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <span className="text-xs text-muted-foreground">Tổng: 5</span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Bus className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Reports */}
        <Tabs value={activeTab} className="space-y-6" onValueChange={(v) => setActiveTab(v)}>
          <TabsList className="grid w-full max-w-3xl grid-cols-5">
            <TabsTrigger value="trips">Chuyến đi</TabsTrigger>
            <TabsTrigger value="buses">Xe buýt</TabsTrigger>
            <TabsTrigger value="drivers">Tài xế</TabsTrigger>
            <TabsTrigger value="students">Học sinh</TabsTrigger>
            <TabsTrigger value="incidents">Sự cố</TabsTrigger>
          </TabsList>

          {/* Trips Report */}
          <TabsContent value="trips" className="space-y-6">
            {renderReportTable()}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    Xu hướng chuyến đi
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={tripTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="dayLabel" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        formatter={(value: any, name: string, props: any) => {
                          return [value, name]
                        }}
                        labelFormatter={(label: string) => {
                          // Tìm đối tượng theo dayLabel để lấy full date
                          const found = tripTrendData.find(d => d.dayLabel === label)
                          return found ? `Ngày: ${found.date}` : label
                        }}
                        contentStyle={{
                          backgroundColor: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="trips" stroke="#3b82f6" name="Tổng chuyến" strokeWidth={2} />
                      <Line type="monotone" dataKey="onTime" stroke="#10b981" name="Đúng giờ" strokeWidth={2} />
                      <Line type="monotone" dataKey="late" stroke="#f59e0b" name="Trễ" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Chi tiết chuyến đi</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-muted/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Tổng chuyến đi</span>
                        <span className="text-lg font-bold text-foreground">{uiStats.totalTrips}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full" style={{ width: "100%" }} />
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-muted/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Chuyến đúng giờ</span>
                        <span className="text-lg font-bold text-green-500">{Math.max(Number((reportData?.trips?.completed ?? 0)) - Number((reportData?.trips?.delayed ?? 0)), 0)}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: `${uiStats.onTimeRate}%` }} />
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-muted/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Chuyến trễ</span>
                        <span className="text-lg font-bold text-orange-500">{Number(reportData?.trips?.delayed ?? 0)}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${Math.min(100, Math.max(0, uiStats.totalTrips ? ((Number(reportData?.trips?.delayed ?? 0) / uiStats.totalTrips) * 100) : 0))}%` }} />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Thời gian TB</p>
                          <p className="font-semibold text-foreground mt-1">{Number(reportData?.trips?.averageDurationMinutes ?? 0)} phút</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Khoảng cách TB</p>
                          <p className="font-semibold text-foreground mt-1">{Number(reportData?.trips?.averageDistanceKm ?? 0)} km</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Buses Report */}
          <TabsContent value="buses" className="space-y-6">
            {renderReportTable()}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Tỷ lệ sử dụng xe buýt</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={busUtilizationData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(v)=> v + '%'} />
                      <Tooltip
                        formatter={(value: any, name: string, props: any) => {
                          if (name === 'utilization') return [value + '%', 'Sử dụng'];
                          return [value, name];
                        }}
                        labelFormatter={(label: string) => {
                          const found = busUtilizationData.find(b => b.name === label)
                          if (!found) return label
                          return `${label} | ${found.trips}/${found.scheduledTrips} chuyến thực tế / tối đa | On-time: ${found.onTimeRate}%`
                        }}
                        contentStyle={{
                          backgroundColor: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="utilization" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Hiệu suất xe buýt</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {busUtilizationData.map((bus, index) => (
                      <div
                        key={index}
                        className="p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Bus className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">{bus.name}</p>
                              <p className="text-xs text-muted-foreground">{bus.trips} chuyến</p>
                            </div>
                          </div>
                          <Badge variant={bus.utilization >= 90 ? "default" : "secondary"}>{bus.utilization}%</Badge>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${bus.utilization >= 90 ? "bg-green-500" : "bg-orange-500"}`}
                            style={{ width: `${bus.utilization}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Drivers Report */}
          <TabsContent value="drivers" className="space-y-6">
            {renderReportTable()}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Hiệu suất tài xế</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {driverPerformanceData.map((driver, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="font-bold text-primary">{index + 1}</span>
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-foreground">{driver.name}</p>
                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                              <span>{driver.trips} chuyến</span>
                              <span>•</span>
                              <span>Đúng giờ: {driver.onTimeRate}%</span>
                              <span>•</span>
                              <span>Đánh giá: {driver.rating}/5.0</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {driver.onTimeRate >= 90 ? (
                            <Badge variant="default" className="bg-green-500/20 text-green-700 hover:bg-green-500/30">
                              Xuất sắc
                            </Badge>
                          ) : driver.onTimeRate >= 85 ? (
                            <Badge variant="default" className="bg-blue-500/20 text-blue-700 hover:bg-blue-500/30">
                              Tốt
                            </Badge>
                          ) : (
                            <Badge
                              variant="default"
                              className="bg-orange-500/20 text-orange-700 hover:bg-orange-500/30"
                            >
                              Trung bình
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Students Report */}
          <TabsContent value="students" className="space-y-6">
            {renderReportTable()}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Tỷ lệ điểm danh</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={attendanceData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${Number(value ?? 0)}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {attendanceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Thống kê học sinh</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {attendanceData.map((item, index) => (
                      <div key={index} className="p-4 rounded-lg bg-muted/30">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-sm font-medium text-foreground">{item.name}</span>
                          </div>
                          <span className="text-lg font-bold text-foreground">{Number(item.value ?? 0)}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              backgroundColor: item.color,
                              width: `${(Number(item.value ?? 0) / Math.max(1, Number(uiStats.totalStudents ?? 0))) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}

                    <div className="pt-4 border-t border-border">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Tổng học sinh</p>
                          <p className="font-semibold text-foreground mt-1">{uiStats.totalStudents}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Tỷ lệ có mặt</p>
                          <p className="font-semibold text-green-500 mt-1">{
                            (() => {
                              const present = Number(attendanceData.find(a => a.name === 'Có mặt')?.value ?? 0)
                              const total = Math.max(1, Number(uiStats.totalStudents ?? 0))
                              return `${((present / total) * 100).toFixed(1)}%`
                            })()
                          }</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Incidents Report */}
          <TabsContent value="incidents" className="space-y-6">
            {renderReportTable()}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Phân loại sự cố</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {incidentData.map((incident, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div
                            className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                              incident.severity === "high"
                                ? "bg-red-500/10"
                                : incident.severity === "medium"
                                  ? "bg-orange-500/10"
                                  : "bg-blue-500/10"
                            }`}
                          >
                            <AlertTriangle
                              className={`w-6 h-6 ${
                                incident.severity === "high"
                                  ? "text-red-500"
                                  : incident.severity === "medium"
                                    ? "text-orange-500"
                                    : "text-blue-500"
                              }`}
                            />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-foreground">{incident.type}</p>
                            <p className="text-sm text-muted-foreground mt-1">{incident.count} sự cố</p>
                          </div>
                        </div>
                        <Badge
                          variant={
                            incident.severity === "high"
                              ? "destructive"
                              : incident.severity === "medium"
                                ? "default"
                                : "secondary"
                          }
                        >
                          {incident.severity === "high"
                            ? "Nghiêm trọng"
                            : incident.severity === "medium"
                              ? "Trung bình"
                              : "Nhẹ"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Export Options removed per request */}
      </div>
    </DashboardLayout>
  )
}
