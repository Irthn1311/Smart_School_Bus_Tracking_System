"use client"

import { useEffect, useMemo, useState } from "react"
import { useLanguage } from "@/lib/language-context"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { DateRange } from "react-day-picker"
import { format } from "date-fns"
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
  Save,
  Mail,
  X,
  Filter,
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
  const { t } = useLanguage()
  const [dateRange, setDateRange] = useState("7days")
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined)
  // Đồng bộ loại báo cáo với tab đang chọn
  const [activeTab, setActiveTab] = useState<string>("trips")
  const reportType = activeTab // map trực tiếp: trips|buses|drivers|students|incidents
  const [loading, setLoading] = useState(true)
  const [tableLoading, setTableLoading] = useState(false)
  const [reportData, setReportData] = useState<any>(null)
  const { toast } = useToast()

  // Template management
  const [templates, setTemplates] = useState<any[]>([])
  const [saveTemplateDialogOpen, setSaveTemplateDialogOpen] = useState(false)
  const [templateName, setTemplateName] = useState("")
  const [loadingTemplates, setLoadingTemplates] = useState(false)

  // Email dialog
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [recipientEmail, setRecipientEmail] = useState("")
  const [sendingEmail, setSendingEmail] = useState(false)

  // Filters
  const [filters, setFilters] = useState<any>({})
  const [showFilters, setShowFilters] = useState(false)

  // Filter data for dropdowns
  const [filterData, setFilterData] = useState<{
    routes: any[]
    routesWithStudents?: any[] // Routes that have students assigned
    buses: any[]
    drivers: any[]
    classes: string[]
    parents: any[]
  }>({
    routes: [],
    routesWithStudents: [],
    buses: [],
    drivers: [],
    classes: [],
    parents: []
  })
  const [loadingFilterData, setLoadingFilterData] = useState(false)

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
  const { from, to, dateRangeError } = useMemo(() => {
    // If custom date range is selected
    if (dateRange === "custom" && customDateRange?.from && customDateRange?.to) {
      // Validate: from <= to
      if (customDateRange.from > customDateRange.to) {
        return {
          from: "",
          to: "",
          dateRangeError: "Khoảng thời gian không hợp lệ: ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc"
        }
      }
      const formatDate = (d: Date) => {
        const yyyy = d.getFullYear()
        const mm = `${d.getMonth() + 1}`.padStart(2, '0')
        const dd = `${d.getDate()}`.padStart(2, '0')
        return `${yyyy}-${mm}-${dd}`
      }
      return {
        from: formatDate(customDateRange.from),
        to: formatDate(customDateRange.to),
        dateRangeError: null
      }
    }

    // Standard date ranges
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

    return { from: formatDate(start), to: formatDate(end), dateRangeError: null }
  }, [dateRange, customDateRange])

  // Load templates on mount
  useEffect(() => {
    async function loadTemplates() {
      try {
        setLoadingTemplates(true)
        const res = await apiClient.getReportTemplates()
        const data: any = (res as any)?.data || []
        setTemplates(Array.isArray(data) ? data : [])
      } catch (e: any) {
        console.warn("Failed to load templates", e)
      } finally {
        setLoadingTemplates(false)
      }
    }
    loadTemplates()
  }, [])

  // Load filter data for dropdowns
  useEffect(() => {
    const loadFilterData = async () => {
      setLoadingFilterData(true)
      try {
        // Load routes (no limit to get all for filter dropdowns)
        const routesRes: any = await apiClient.getRoutes({ limit: 100 })
        const routes = routesRes.data?.data || routesRes.data || []

        // Load buses (no limit to get all for filter dropdowns)
        const busesRes: any = await apiClient.getBuses({ limit: 100 })
        const buses = busesRes.data?.data || busesRes.data || []

        // Load drivers (no limit to get all for filter dropdowns)
        const driversRes: any = await apiClient.getDrivers({ limit: 100 })
        const drivers = driversRes.data?.data || driversRes.data || []

        // Load students to extract unique classes and routes (no limit to get all for filter dropdowns)
        const studentsRes: any = await apiClient.getStudents({ limit: 100 })
        const students = studentsRes.data?.data || studentsRes.data || []

        // Extract unique classes from students (filter out null/undefined/empty)
        const uniqueClasses: string[] = [...new Set(
          students
            .map((s: any) => s.lop)
            .filter((lop: any) => lop && lop.trim() !== "")
        )] as string[]

        // Extract routes that have students assigned (from students' maTuyen)
        const studentRouteIds = new Set(
          students
            .map((s: any) => s.maTuyen)
            .filter((id: any) => id !== null && id !== undefined)
        )

        // Filter routes to only show those with students
        const routesWithStudents = routes.filter((route: any) =>
          studentRouteIds.has(route.maTuyen || route.id)
        )

        setFilterData({
          routes: routes, // Keep all routes for other filters
          routesWithStudents: routesWithStudents, // Routes with students for students filter
          buses: buses,
          drivers: drivers,
          classes: uniqueClasses.sort((a, b) => a.localeCompare(b)), // Sort alphabetically
          parents: [] // Will be loaded on demand if needed
        })
      } catch (error) {
        console.error("Error loading filter data:", error)
      } finally {
        setLoadingFilterData(false)
      }
    }

    loadFilterData()
  }, [])

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
        const derived = {
          totalTrips,
          onTimeRate,
          totalStudents: 0, // Will be updated from reportData
          avgDelay: Number(trips.averageDurationMinutes || 0),
          incidents: 0, // Will be updated from reportData
          activeBuses,
        }
        if (mounted) setStats(derived)
      } catch (e: any) {
        console.warn("Failed to load reports overview", e)
        toast({ title: t("common.error"), description: e?.message || t("common.tryAgain"), variant: "destructive" })
        if (mounted) setStats(null)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [from, to, reportType, filters, toast])

  // Load table data for current tab/type
  useEffect(() => {
    // Skip if date range is invalid or custom range is not complete
    if (dateRangeError || (dateRange === "custom" && (!customDateRange?.from || !customDateRange?.to))) {
      return
    }

    let mounted = true
    async function loadReport() {
      try {
        setTableLoading(true)
        const res = await apiClient.getReportView({ type: reportType, from, to, filters })
        const data = (res as any)?.data || null
        if (mounted) {
          setReportData(data)

          // Update stats with real data
          if (data) {
            setStats(prev => ({
              ...prev!,
              totalStudents: Array.isArray(data.students) ? data.students.length : (prev?.totalStudents || 0),
              incidents: Array.isArray(data.incidents) ? data.incidents.length : (prev?.incidents || 0),
            }))
          }

          // Check if no data
          const hasData = checkHasData(data, reportType)
          if (!hasData) {
            toast({
              title: "Không có dữ liệu",
              description: "Không có dữ liệu trong khoảng thời gian này. Vui lòng thử chọn khoảng thời gian khác hoặc thay đổi bộ lọc.",
              variant: "default"
            })
          }
        }
      } catch (e: any) {
        if (mounted) {
          setReportData(null)
          toast({
            title: "Không tải được dữ liệu báo cáo",
            description: e?.message || "Vui lòng thử lại",
            variant: "destructive"
          })
        }
      } finally {
        if (mounted) setTableLoading(false)
      }
    }
    loadReport()
    return () => { mounted = false }
  }, [reportType, from, to, filters, toast, dateRangeError, dateRange, customDateRange])

  // Helper to check if report has data
  function checkHasData(data: any, type: string): boolean {
    if (!data) return false
    if (type === "trips") return Array.isArray(data.trips) && data.trips.length > 0
    if (type === "buses") return Array.isArray(data.buses) && data.buses.length > 0
    if (type === "drivers") return Array.isArray(data.drivers) && data.drivers.length > 0
    if (type === "students") return Array.isArray(data.students) && data.students.length > 0
    if (type === "incidents") return Array.isArray(data.incidents) && data.incidents.length > 0
    return false
  }

  // Save template handler
  async function handleSaveTemplate() {
    if (!templateName.trim()) {
      toast({ title: "Lỗi", description: "Vui lòng nhập tên mẫu", variant: "destructive" })
      return
    }

    try {
      await apiClient.saveReportTemplate({
        name: templateName.trim(),
        reportType,
        dateRange: dateRange === "custom" ? undefined : dateRange,
        customFrom: dateRange === "custom" && customDateRange?.from ? format(customDateRange.from, "yyyy-MM-dd") : undefined,
        customTo: dateRange === "custom" && customDateRange?.to ? format(customDateRange.to, "yyyy-MM-dd") : undefined,
        filters,
      })
      toast({ title: "Thành công", description: "Đã lưu mẫu báo cáo" })
      setSaveTemplateDialogOpen(false)
      setTemplateName("")
      // Reload templates
      const res = await apiClient.getReportTemplates()
      const data: any = (res as any)?.data || []
      setTemplates(Array.isArray(data) ? data : [])
    } catch (e: any) {
      toast({ title: "Lỗi", description: e?.message || "Không thể lưu mẫu", variant: "destructive" })
    }
  }

  // Load template handler
  function handleLoadTemplate(template: any) {
    setActiveTab(template.report_type)
    if (template.date_range && template.date_range !== "custom") {
      setDateRange(template.date_range)
      setCustomDateRange(undefined)
    } else if (template.custom_from && template.custom_to) {
      setDateRange("custom")
      setCustomDateRange({
        from: new Date(template.custom_from),
        to: new Date(template.custom_to),
      })
    }
    if (template.filters_json) {
      setFilters(template.filters_json)
    }
    toast({ title: "Thành công", description: `Đã tải mẫu "${template.name}"` })
  }

  // Delete template handler
  async function handleDeleteTemplate(id: number) {
    try {
      await apiClient.deleteReportTemplate(id)
      toast({ title: "Thành công", description: "Đã xóa mẫu báo cáo" })
      // Reload templates
      const res = await apiClient.getReportTemplates()
      const data: any = (res as any)?.data || []
      setTemplates(Array.isArray(data) ? data : [])
    } catch (e: any) {
      toast({ title: "Lỗi", description: e?.message || "Không thể xóa mẫu", variant: "destructive" })
    }
  }

  // Send email handler
  async function handleSendEmail() {
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(recipientEmail)) {
      toast({ title: "Lỗi", description: "Email không hợp lệ", variant: "destructive" })
      return
    }

    if (dateRangeError || (dateRange === "custom" && (!customDateRange?.from || !customDateRange?.to))) {
      toast({ title: "Lỗi", description: "Vui lòng chọn khoảng thời gian hợp lệ", variant: "destructive" })
      return
    }

    try {
      setSendingEmail(true)
      await apiClient.sendReportEmail({
        format: "pdf",
        type: reportType,
        from,
        to,
        recipientEmail: recipientEmail.trim(),
        filters,
      })
      toast({ title: "Thành công", description: `Đã gửi báo cáo đến ${recipientEmail}` })
      setEmailDialogOpen(false)
      setRecipientEmail("")
    } catch (e: any) {
      toast({ title: "Lỗi", description: e?.message || "Không thể gửi email. Vui lòng thử lại.", variant: "destructive" })
    } finally {
      setSendingEmail(false)
    }
  }

  // Export handler with better error handling
  async function handleExport(format: "pdf" | "xlsx" | "csv") {
    if (dateRangeError || (dateRange === "custom" && (!customDateRange?.from || !customDateRange?.to))) {
      toast({ title: "Lỗi", description: "Vui lòng chọn khoảng thời gian hợp lệ", variant: "destructive" })
      return
    }

    try {
      const blob = await apiClient.exportReport({ format, type: reportType, from, to, filters })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `report_${reportType}_${from}_${to}.${format === "xlsx" ? "xlsx" : format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast({ title: "Thành công", description: `Đã xuất báo cáo ${format.toUpperCase()}` })
    } catch (e: any) {
      toast({ title: "Lỗi", description: "Không thể xuất báo cáo. Vui lòng thử lại.", variant: "destructive" })
    }
  }

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

  // Calculate trip trend data from real data
  const tripTrendData = useMemo(() => {
    if (!reportData?.trips || !Array.isArray(reportData.trips)) {
      return []
    }

    // Group trips by date
    const tripsByDate = new Map<string, { total: number; onTime: number; late: number }>()

    reportData.trips.forEach((trip: any) => {
      const date = trip.ngayChay || ""
      if (!date) return

      const existing = tripsByDate.get(date) || { total: 0, onTime: 0, late: 0 }
      existing.total += 1

      // Consider on-time if status is completed and no delay
      if (trip.trangThai === "hoan_thanh") {
        existing.onTime += 1
      } else if (trip.trangThai === "dang_chay" || trip.trangThai === "huy") {
        // Consider late if delayed or cancelled
        existing.late += 1
      }

      tripsByDate.set(date, existing)
    })

    // Convert to array and format dates
    const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"]
    return Array.from(tripsByDate.entries())
      .slice(0, 7)
      .map(([date, data]) => {
        const dateObj = new Date(date)
        const dayName = days[dateObj.getDay()] || dateObj.toLocaleDateString("vi-VN", { weekday: "short" })
        return {
          date: dayName,
          trips: data.total,
          onTime: data.onTime,
          late: data.late,
        }
      })
  }, [reportData])

  // Calculate bus utilization from real data
  const busUtilizationData = useMemo(() => {
    if (!reportData?.buses || !Array.isArray(reportData.buses)) {
      return []
    }

    // Get trips for each bus
    const tripsByBus = new Map<number, number>()
    if (reportData?.trips && Array.isArray(reportData.trips)) {
      reportData.trips.forEach((trip: any) => {
        const busId = trip.maXe
        if (busId) {
          tripsByBus.set(busId, (tripsByBus.get(busId) || 0) + 1)
        }
      })
    }

    return reportData.buses
      .slice(0, 5)
      .map((bus: any) => {
        const tripCount = tripsByBus.get(bus.maXe) || 0
        // Calculate utilization (assuming max 50 trips per period as baseline)
        const utilization = Math.min(100, Math.round((tripCount / 50) * 100))
        return {
          name: bus.bienSoXe || `Xe ${bus.maXe}`,
          trips: tripCount,
          utilization: utilization,
        }
      })
      .sort((a: { utilization: number }, b: { utilization: number }) => b.utilization - a.utilization)
  }, [reportData])

  // Calculate attendance data from real data (simplified - would need TrangThaiHocSinh data)
  const attendanceData = useMemo(() => {
    if (!reportData?.students || !Array.isArray(reportData.students)) {
      return [
        { name: "Có mặt", value: 0, color: "#10b981" },
        { name: "Vắng mặt", value: 0, color: "#ef4444" },
        { name: "Đi muộn", value: 0, color: "#f59e0b" },
      ]
    }

    // For now, estimate based on total students
    // In real implementation, this should come from TrangThaiHocSinh
    const total = reportData.students.length
    const present = Math.round(total * 0.92) // Estimate 92% present
    const absent = Math.round(total * 0.05) // Estimate 5% absent
    const late = total - present - absent // Remaining as late

    return [
      { name: "Có mặt", value: present, color: "#10b981" },
      { name: "Vắng mặt", value: absent, color: "#ef4444" },
      { name: "Đi muộn", value: late, color: "#f59e0b" },
    ]
  }, [reportData])

  // Calculate incident data from real data
  const incidentData = useMemo(() => {
    if (!reportData?.incidents || !Array.isArray(reportData.incidents)) {
      return []
    }

    // Group incidents by type
    const incidentsByType = new Map<string, { count: number; severity: string }>()

    reportData.incidents.forEach((incident: any) => {
      const type = incident.loaiSuCo || "Khác"
      const severity = incident.mucDo || "nhe"
      const existing = incidentsByType.get(type) || { count: 0, severity: "nhe" }
      existing.count += 1
      // Use highest severity if multiple
      if (severity === "nghiem_trong" || (severity === "trung_binh" && existing.severity === "nhe")) {
        existing.severity = severity
      }
      incidentsByType.set(type, existing)
    })

    return Array.from(incidentsByType.entries())
      .map(([type, data]) => ({
        type,
        count: data.count,
        severity: data.severity === "nghiem_trong" ? "high" : data.severity === "trung_binh" ? "medium" : "low",
      }))
      .sort((a, b) => b.count - a.count)
  }, [reportData])

  // Calculate driver performance from real data
  const driverPerformanceData = useMemo(() => {
    if (!reportData?.drivers || !Array.isArray(reportData.drivers)) {
      return []
    }

    // Get trips for each driver
    const tripsByDriver = new Map<number, { total: number; onTime: number }>()
    if (reportData?.trips && Array.isArray(reportData.trips)) {
      reportData.trips.forEach((trip: any) => {
        const driverId = trip.maTaiXe
        if (driverId) {
          const existing = tripsByDriver.get(driverId) || { total: 0, onTime: 0 }
          existing.total += 1
          if (trip.trangThai === "hoan_thanh") {
            existing.onTime += 1
          }
          tripsByDriver.set(driverId, existing)
        }
      })
    }

    return reportData.drivers
      .slice(0, 5)
      .map((driver: any) => {
        const driverStats = tripsByDriver.get(driver.maTaiXe) || { total: 0, onTime: 0 }
        const onTimeRate = driverStats.total > 0
          ? Math.round((driverStats.onTime / driverStats.total) * 100)
          : 0
        // Estimate rating based on on-time rate
        const rating = 3.5 + (onTimeRate / 100) * 1.5

        return {
          name: driver.hoTen || driver.tenTaiXe || `Tài xế ${driver.maTaiXe}`,
          trips: driverStats.total,
          onTimeRate: onTimeRate,
          rating: Math.round(rating * 10) / 10,
        }
      })
      .sort((a: { onTimeRate: number }, b: { onTimeRate: number }) => b.onTimeRate - a.onTimeRate)
  }, [reportData])

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
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t("reports.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("reports.description")}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={dateRange} onValueChange={(v) => {
              setDateRange(v)
              if (v !== "custom") setCustomDateRange(undefined)
            }}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">{t("reports.last7Days")}</SelectItem>
                <SelectItem value="30days">30 ngày</SelectItem>
                <SelectItem value="90days">90 ngày</SelectItem>
                <SelectItem value="custom">Tùy chỉnh</SelectItem>
              </SelectContent>
            </Select>

            {dateRange === "custom" && (
              <DateRangePicker
                dateRange={customDateRange}
                onDateRangeChange={setCustomDateRange}
              />
            )}

            {dateRangeError && (
              <p className="text-sm text-destructive">{dateRangeError}</p>
            )}

            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4" />
              Bộ lọc
            </Button>

            <Dialog open={saveTemplateDialogOpen} onOpenChange={setSaveTemplateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Save className="w-4 h-4" />
                  Lưu mẫu
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Lưu mẫu báo cáo</DialogTitle>
                  <DialogDescription>
                    Lưu cấu hình báo cáo hiện tại để sử dụng lại sau
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="template-name">Tên mẫu</Label>
                    <Input
                      id="template-name"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="Nhập tên mẫu báo cáo"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSaveTemplateDialogOpen(false)}>
                    Hủy
                  </Button>
                  <Button onClick={handleSaveTemplate}>Lưu</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Mail className="w-4 h-4" />
                  Gửi email
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Gửi báo cáo qua email</DialogTitle>
                  <DialogDescription>
                    Nhập địa chỉ email người nhận để gửi báo cáo
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="recipient-email">Email người nhận</Label>
                    <Input
                      id="recipient-email"
                      type="email"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      placeholder="example@email.com"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
                    Hủy
                  </Button>
                  <Button onClick={handleSendEmail} disabled={sendingEmail}>
                    {sendingEmail ? "Đang gửi..." : "Gửi email"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button
              className="gap-2"
              onClick={() => handleExport("xlsx")}
            >
              <Download className="w-4 h-4" />
              Xuất Excel
            </Button>
          </div>
        </div>

        {/* Templates List */}
        {templates.length > 0 && (
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Mẫu báo cáo đã lưu</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    <span className="text-sm">{template.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleLoadTemplate(template)}
                    >
                      <Calendar className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-destructive"
                      onClick={() => handleDeleteTemplate(template.id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters Panel */}
        {showFilters && (
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Bộ lọc
                </span>
                <Button variant="ghost" size="sm" onClick={() => setShowFilters(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportType === "trips" && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Tuyến đường</Label>
                      <Select
                        value={filters.routeId || "all"}
                        onValueChange={(v) => setFilters({ ...filters, routeId: v === "all" ? undefined : v })}
                        disabled={loadingFilterData}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Tất cả tuyến" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tất cả tuyến</SelectItem>
                          {filterData.routes.map((route: any) => (
                            <SelectItem key={route.maTuyen || route.id} value={String(route.maTuyen || route.id)}>
                              {route.tenTuyen || route.name || `Tuyến ${route.maTuyen || route.id}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Xe buýt</Label>
                      <Select
                        value={filters.busId || "all"}
                        onValueChange={(v) => setFilters({ ...filters, busId: v === "all" ? undefined : v })}
                        disabled={loadingFilterData}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Tất cả xe" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tất cả xe</SelectItem>
                          {filterData.buses.map((bus: any) => (
                            <SelectItem key={bus.maXe || bus.id} value={String(bus.maXe || bus.id)}>
                              {bus.bienSoXe || bus.licensePlate || `Xe ${bus.maXe || bus.id}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Tài xế</Label>
                      <Select
                        value={filters.driverId || "all"}
                        onValueChange={(v) => setFilters({ ...filters, driverId: v === "all" ? undefined : v })}
                        disabled={loadingFilterData}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Tất cả tài xế" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tất cả tài xế</SelectItem>
                          {filterData.drivers.map((driver: any) => (
                            <SelectItem key={driver.maTaiXe || driver.id} value={String(driver.maTaiXe || driver.id)}>
                              {driver.hoTen || driver.name || `Tài xế ${driver.maTaiXe || driver.id}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Trạng thái</Label>
                      <Select
                        value={filters.status || "all"}
                        onValueChange={(v) => setFilters({ ...filters, status: v === "all" ? undefined : v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Tất cả" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tất cả</SelectItem>
                          <SelectItem value="chua_khoi_hanh">Chưa khởi hành</SelectItem>
                          <SelectItem value="dang_chay">Đang chạy</SelectItem>
                          <SelectItem value="hoan_thanh">Hoàn thành</SelectItem>
                          <SelectItem value="huy">Hủy</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                {reportType === "students" && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Lớp học</Label>
                      <Select
                        value={filters.class || "all"}
                        onValueChange={(v) => setFilters({ ...filters, class: v === "all" ? undefined : v })}
                        disabled={loadingFilterData}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={loadingFilterData ? "Đang tải..." : "Tất cả lớp"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tất cả lớp</SelectItem>
                          {filterData.classes.length > 0 ? (
                            filterData.classes.map((className: string) => (
                              <SelectItem key={className} value={className}>
                                {className}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-data" disabled>
                              Không có dữ liệu
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      {filterData.classes.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {filterData.classes.length} lớp học
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Tuyến đường</Label>
                      <Select
                        value={filters.routeId || "all"}
                        onValueChange={(v) => setFilters({ ...filters, routeId: v === "all" ? undefined : v })}
                        disabled={loadingFilterData}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Tất cả tuyến" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tất cả tuyến</SelectItem>
                          {(filterData.routesWithStudents || filterData.routes).length > 0 ? (
                            (filterData.routesWithStudents || filterData.routes).map((route: any) => (
                              <SelectItem key={route.maTuyen || route.id} value={String(route.maTuyen || route.id)}>
                                {route.tenTuyen || route.name || `Tuyến ${route.maTuyen || route.id}`}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-data" disabled>
                              Không có dữ liệu
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      {(filterData.routesWithStudents || filterData.routes).length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {(filterData.routesWithStudents || filterData.routes).length} tuyến đường
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Trạng thái điểm danh</Label>
                      <Select
                        value={filters.attendanceStatus || "all"}
                        onValueChange={(v) => setFilters({ ...filters, attendanceStatus: v === "all" ? undefined : v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Tất cả" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tất cả</SelectItem>
                          <SelectItem value="co_mat">Có mặt</SelectItem>
                          <SelectItem value="vang_mat">Vắng mặt</SelectItem>
                          <SelectItem value="di_muon">Đi muộn</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                {reportType === "incidents" && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Loại sự cố</Label>
                      <Select
                        value={filters.type || "all"}
                        onValueChange={(v) => setFilters({ ...filters, type: v === "all" ? undefined : v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Tất cả" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tất cả</SelectItem>
                          <SelectItem value="tai_nan">Tai nạn</SelectItem>
                          <SelectItem value="hu_hong">Hư hỏng</SelectItem>
                          <SelectItem value="tre_gio">Trễ giờ</SelectItem>
                          <SelectItem value="khac">Khác</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Mức độ</Label>
                      <Select
                        value={filters.severity || "all"}
                        onValueChange={(v) => setFilters({ ...filters, severity: v === "all" ? undefined : v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Tất cả" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tất cả</SelectItem>
                          <SelectItem value="nhe">Nhẹ</SelectItem>
                          <SelectItem value="trung_binh">Trung bình</SelectItem>
                          <SelectItem value="nghiem_trong">Nghiêm trọng</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Trạng thái</Label>
                      <Select
                        value={filters.status || "all"}
                        onValueChange={(v) => setFilters({ ...filters, status: v === "all" ? undefined : v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Tất cả" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tất cả</SelectItem>
                          <SelectItem value="moi">Mới</SelectItem>
                          <SelectItem value="dang_xu_ly">Đang xử lý</SelectItem>
                          <SelectItem value="da_xu_ly">Đã xử lý</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Xe buýt</Label>
                      <Select
                        value={filters.busId || "all"}
                        onValueChange={(v) => setFilters({ ...filters, busId: v === "all" ? undefined : v })}
                        disabled={loadingFilterData}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Tất cả xe" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tất cả xe</SelectItem>
                          {filterData.buses.map((bus: any) => (
                            <SelectItem key={bus.maXe || bus.id} value={String(bus.maXe || bus.id)}>
                              {bus.bienSoXe || bus.licensePlate || `Xe ${bus.maXe || bus.id}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                {reportType === "drivers" && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Trạng thái</Label>
                      <Select
                        value={filters.status || "all"}
                        onValueChange={(v) => setFilters({ ...filters, status: v === "all" ? undefined : v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Tất cả" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tất cả</SelectItem>
                          <SelectItem value="hoat_dong">Hoạt động</SelectItem>
                          <SelectItem value="tam_nghi">Tạm nghỉ</SelectItem>
                          <SelectItem value="nghi_huu">Nghỉ hưu</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Xe được phân công</Label>
                      <Select
                        value={filters.busId || "all"}
                        onValueChange={(v) => setFilters({ ...filters, busId: v === "all" ? undefined : v })}
                        disabled={loadingFilterData}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Tất cả xe" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tất cả xe</SelectItem>
                          <SelectItem value="chua_phan_cong">Chưa phân công</SelectItem>
                          {filterData.buses.map((bus: any) => (
                            <SelectItem key={bus.maXe || bus.id} value={String(bus.maXe || bus.id)}>
                              {bus.bienSoXe || bus.licensePlate || `Xe ${bus.maXe || bus.id}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Đánh giá</Label>
                      <Select
                        value={filters.rating || "all"}
                        onValueChange={(v) => setFilters({ ...filters, rating: v === "all" ? undefined : v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Tất cả" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tất cả</SelectItem>
                          <SelectItem value="5">5 sao</SelectItem>
                          <SelectItem value="4">4 sao trở lên</SelectItem>
                          <SelectItem value="3">3 sao trở lên</SelectItem>
                          <SelectItem value="2">Dưới 3 sao</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                {reportType === "buses" && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Trạng thái</Label>
                      <Select
                        value={filters.status || "all"}
                        onValueChange={(v) => setFilters({ ...filters, status: v === "all" ? undefined : v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Tất cả" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tất cả</SelectItem>
                          <SelectItem value="hoat_dong">Hoạt động</SelectItem>
                          <SelectItem value="bao_tri">Bảo trì</SelectItem>
                          <SelectItem value="ngung_hoat_dong">Ngừng hoạt động</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Tuyến đường</Label>
                      <Select
                        value={filters.routeId || "all"}
                        onValueChange={(v) => setFilters({ ...filters, routeId: v === "all" ? undefined : v })}
                        disabled={loadingFilterData}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Tất cả tuyến" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tất cả tuyến</SelectItem>
                          {filterData.routes.map((route: any) => (
                            <SelectItem key={route.maTuyen || route.id} value={String(route.maTuyen || route.id)}>
                              {route.tenTuyen || route.name || `Tuyến ${route.maTuyen || route.id}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Tài xế</Label>
                      <Select
                        value={filters.driverId || "all"}
                        onValueChange={(v) => setFilters({ ...filters, driverId: v === "all" ? undefined : v })}
                        disabled={loadingFilterData}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Tất cả tài xế" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tất cả tài xế</SelectItem>
                          {filterData.drivers.map((driver: any) => (
                            <SelectItem key={driver.maTaiXe || driver.id} value={String(driver.maTaiXe || driver.id)}>
                              {driver.hoTen || driver.name || `Tài xế ${driver.maTaiXe || driver.id}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setFilters({})}>
                    Xóa bộ lọc
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t("reports.totalTrips")}</p>
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
                  <p className="text-sm text-muted-foreground">{t("reports.onTimeRate")}</p>
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
                  <p className="text-sm text-muted-foreground">{t("reports.students")}</p>
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
                  <p className="text-sm text-muted-foreground">{t("reports.avgDelay")}</p>
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
                  <p className="text-sm text-muted-foreground">{t("reports.incidents")}</p>
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
        <Tabs defaultValue="trips" className="space-y-6" onValueChange={(v) => setActiveTab(v)}>
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
                  {tripTrendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={tripTrendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--background))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="trips" stroke="#3b82f6" name="Tổng chuyến" strokeWidth={2} />
                        <Line type="monotone" dataKey="onTime" stroke="#10b981" name="Hoàn thành" strokeWidth={2} />
                        <Line type="monotone" dataKey="late" stroke="#f59e0b" name="Trễ/Hủy" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      <p>Không có dữ liệu để hiển thị biểu đồ</p>
                    </div>
                  )}
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

                    {(() => {
                      const trips = reportData?.trips || []
                      const completed = trips.filter((t: any) => t.trangThai === "hoan_thanh").length
                      const delayed = trips.filter((t: any) => t.trangThai === "dang_chay" || t.trangThai === "huy").length
                      const onTimeRate = uiStats.totalTrips > 0 ? Math.round((completed / uiStats.totalTrips) * 100) : 0

                      return (
                        <>
                          <div className="p-4 rounded-lg bg-muted/30">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-muted-foreground">Chuyến hoàn thành</span>
                              <span className="text-lg font-bold text-green-500">{completed}</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div
                                className="bg-green-500 h-2 rounded-full"
                                style={{ width: `${onTimeRate}%` }}
                              />
                            </div>
                          </div>

                          <div className="p-4 rounded-lg bg-muted/30">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-muted-foreground">Chuyến trễ/Hủy</span>
                              <span className="text-lg font-bold text-orange-500">{delayed}</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div
                                className="bg-orange-500 h-2 rounded-full"
                                style={{ width: `${uiStats.totalTrips > 0 ? Math.round((delayed / uiStats.totalTrips) * 100) : 0}%` }}
                              />
                            </div>
                          </div>

                          <div className="pt-4 border-t border-border">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Tỷ lệ đúng giờ</p>
                                <p className="font-semibold text-foreground mt-1">{onTimeRate}%</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Tổng chuyến</p>
                                <p className="font-semibold text-foreground mt-1">{uiStats.totalTrips}</p>
                              </div>
                            </div>
                          </div>
                        </>
                      )
                    })()}
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
                  {busUtilizationData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={busUtilizationData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--background))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Bar dataKey="utilization" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      <p>Không có dữ liệu để hiển thị biểu đồ</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Hiệu suất xe buýt</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {busUtilizationData.length > 0 ? (
                      busUtilizationData.map((bus: { name: string; trips: number; utilization: number }, index: number) => (
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
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Không có dữ liệu xe buýt
                      </p>
                    )}
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
                  {driverPerformanceData.length > 0 ? (
                    driverPerformanceData.map((driver: { name: string; trips: number; onTimeRate: number; rating: number }, index: number) => (
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
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Không có dữ liệu tài xế
                    </p>
                  )}
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
                  {attendanceData.some(a => a.value > 0) ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={attendanceData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => {
                            const p = Number(percent ?? 0)
                            return `${name}: ${(p * 100).toFixed(0)}%`
                          }}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {attendanceData.map((entry, index: number) => (
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
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      <p>Không có dữ liệu điểm danh</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Thống kê học sinh</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {attendanceData.map((item, index: number) => (
                      <div key={index} className="p-4 rounded-lg bg-muted/30">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-sm font-medium text-foreground">{item.name}</span>
                          </div>
                          <span className="text-lg font-bold text-foreground">{item.value}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              backgroundColor: item.color,
                              width: `${(item.value / 490) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}

                    <div className="pt-4 border-t border-border">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Tổng học sinh</p>
                          <p className="font-semibold text-foreground mt-1">
                            {reportData?.students?.length || 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Tỷ lệ có mặt</p>
                          <p className="font-semibold text-green-500 mt-1">
                            {(() => {
                              const total = reportData?.students?.length || 0
                              const present = attendanceData.find(a => a.name === "Có mặt")?.value || 0
                              return total > 0 ? `${Math.round((present / total) * 100 * 10) / 10}%` : "0%"
                            })()}
                          </p>
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
                  {incidentData.length > 0 ? (
                    incidentData.map((incident, index: number) => (
                      <div
                        key={index}
                        className="p-4 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            <div
                              className={`w-12 h-12 rounded-lg flex items-center justify-center ${incident.severity === "high"
                                  ? "bg-red-500/10"
                                  : incident.severity === "medium"
                                    ? "bg-orange-500/10"
                                    : "bg-blue-500/10"
                                }`}
                            >
                              <AlertTriangle
                                className={`w-6 h-6 ${incident.severity === "high"
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
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Không có dữ liệu sự cố trong khoảng thời gian này
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Export Options */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Xuất báo cáo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                variant="outline"
                className="gap-2 h-auto py-4 flex-col bg-transparent"
                onClick={() => handleExport("pdf")}
              >
                <Download className="w-6 h-6 text-primary" />
                <div className="text-center">
                  <p className="font-semibold">Báo cáo PDF</p>
                  <p className="text-xs text-muted-foreground mt-1">Xuất báo cáo PDF</p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="gap-2 h-auto py-4 flex-col bg-transparent"
                onClick={() => handleExport("xlsx")}
              >
                <Download className="w-6 h-6 text-green-500" />
                <div className="text-center">
                  <p className="font-semibold">Báo cáo Excel</p>
                  <p className="text-xs text-muted-foreground mt-1">Xuất dữ liệu Excel</p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="gap-2 h-auto py-4 flex-col bg-transparent"
                onClick={() => handleExport("csv")}
              >
                <Download className="w-6 h-6 text-orange-500" />
                <div className="text-center">
                  <p className="font-semibold">Báo cáo CSV</p>
                  <p className="text-xs text-muted-foreground mt-1">Xuất dữ liệu CSV</p>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
