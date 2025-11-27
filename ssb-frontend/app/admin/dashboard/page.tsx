"use client"

import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useLanguage } from "@/lib/language-context"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, TrendingUp, Clock, AlertTriangle, Users, Bus, Activity } from "lucide-react"
import { format } from "date-fns"
import { vi } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { apiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

export default function AdminDashboard() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)

  // Filters
  const [dateFrom, setDateFrom] = useState<Date>()
  const [dateTo, setDateTo] = useState<Date>()
  const [routeId, setRouteId] = useState<string>("")
  const [driverId, setDriverId] = useState<string>("")
  const [busId, setBusId] = useState<string>("")

  // Data
  const [overview, setOverview] = useState<any>(null)
  const [tripsByDay, setTripsByDay] = useState<any[]>([])
  const [driverPerformance, setDriverPerformance] = useState<any[]>([])
  const [busUtilization, setBusUtilization] = useState<any[]>([])
  const [routePunctuality, setRoutePunctuality] = useState<any[]>([])

  // Options for filters
  const [routes, setRoutes] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  const [buses, setBuses] = useState<any[]>([])

  // Initialize date range to last 7 days
  useEffect(() => {
    const today = new Date()
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    setDateFrom(sevenDaysAgo)
    setDateTo(today)
  }, [])

  // Load filter options
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [r, d, b] = await Promise.all([
          apiClient.getRoutes({ limit: 100 }).catch(() => ({ data: [] })),
          apiClient.getDrivers({ limit: 100 }).catch(() => ({ data: [] })),
          apiClient.getBuses({ limit: 100 }).catch(() => ({ data: [] })),
        ])
        if (!mounted) return
        setRoutes((r as any)?.data?.data || (r as any)?.data || [])
        setDrivers((d as any)?.data?.data || (d as any)?.data || [])
        setBuses((b as any)?.data?.data || (b as any)?.data || [])
      } catch (e) {
        console.error(e)
      }
    })()
    return () => { mounted = false }
  }, [])

  // Load stats
  useEffect(() => {
    if (!dateFrom || !dateTo) return

    let mounted = true
    async function loadStats() {
      try {
        setLoading(true)
        const params: any = {
          from: format(dateFrom!, "yyyy-MM-dd"),
          to: format(dateTo!, "yyyy-MM-dd"),
        }
        if (routeId) params.routeId = parseInt(routeId)
        if (driverId) params.driverId = parseInt(driverId)
        if (busId) params.busId = parseInt(busId)

        const [ov] = await Promise.all([
          // Use backend reports overview endpoint
          (apiClient as any).getReportsOverview(params).catch(() => ({ data: null })),
        ])

        if (!mounted) return
        setOverview((ov as any)?.data || null)
        setTripsByDay([])
        setDriverPerformance([])
        setBusUtilization([])
        setRoutePunctuality([])
      } catch (e: any) {
        console.error(e)
        toast({
          title: t("common.error"),
          description: e?.message || t("dashboard.loadError"),
          variant: "destructive",
        })
      } finally {
        if (mounted) setLoading(false)
      }
    }
    loadStats()
    return () => { mounted = false }
  }, [dateFrom, dateTo, routeId, driverId, busId, toast])

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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t("dashboard.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("dashboard.description")}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              className="gap-2"
              onClick={async () => {
                try {
                  if (!dateFrom || !dateTo) return
                  const from = format(dateFrom, "yyyy-MM-dd")
                  const to = format(dateTo, "yyyy-MM-dd")
                  const blob = await apiClient.exportReport({ format: "xlsx", type: "overview", from, to })
                  const url = window.URL.createObjectURL(blob)
                  const a = document.createElement("a")
                  a.href = url
                  a.download = `dashboard_overview_${from}_${to}.xlsx`
                  document.body.appendChild(a)
                  a.click()
                  window.URL.revokeObjectURL(url)
                  document.body.removeChild(a)
                  toast({ title: "Thành công", description: "Đã xuất báo cáo tổng quan" })
                } catch (e: any) {
                  toast({ title: "Lỗi", description: e?.message || "Không thể xuất báo cáo", variant: "destructive" })
                }
              }}
            >
              Xuất báo cáo
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.filters")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label>{t("dashboard.fromDate")}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "PPP", { locale: vi }) : t("dashboard.selectDate")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>{t("dashboard.toDate")}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !dateTo && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "PPP", { locale: vi }) : t("dashboard.selectDate")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>{t("dashboard.route")}</Label>
                <Select value={routeId} onValueChange={setRouteId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("common.all")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t("common.all")}</SelectItem>
                    {routes.map((r: any) => (
                      <SelectItem key={r.maTuyen || r.id} value={String(r.maTuyen || r.id)}>
                        {r.tenTuyen || r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("dashboard.driver")}</Label>
                <Select value={driverId} onValueChange={setDriverId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("common.all")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t("common.all")}</SelectItem>
                    {drivers.map((d: any) => (
                      <SelectItem key={d.maTaiXe || d.id} value={String(d.maTaiXe || d.id)}>
                        {d.hoTen || d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("dashboard.bus")}</Label>
                <Select value={busId} onValueChange={setBusId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("common.all")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t("common.all")}</SelectItem>
                    {buses.map((b: any) => (
                      <SelectItem key={b.maXe || b.id} value={String(b.maXe || b.id)}>
                        {b.bienSoXe || b.plateNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="h-20 bg-muted animate-pulse rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : overview ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("dashboard.completionRate")}</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview.completionRate}%</div>
                <p className="text-xs text-muted-foreground">
                  {overview.tripsCompleted} / {overview.totalTrips} {t("dashboard.trips")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("dashboard.avgDelay")}</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview.avgDelayMinutes?.p50 || 0} {t("dashboard.minutes")}</div>
                <p className="text-xs text-muted-foreground">
                  P95: {overview.avgDelayMinutes?.p95 || 0} {t("dashboard.minutes")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("dashboard.delayAlerts")}</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview.delayAlerts || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {t("dashboard.approachEvents")}: {overview.approachStopEvents || 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("dashboard.activity")}</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview.activeDrivers || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {t("dashboard.drivers")} / {overview.activeBuses || 0} {t("dashboard.buses")}
                </p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trips by Day */}
          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.tripsByDay")}</CardTitle>
            </CardHeader>
            <CardContent>
              {tripsByDay.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={tripsByDay}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="planned" stroke="#8884d8" name={t("dashboard.planned")} />
                    <Line type="monotone" dataKey="completed" stroke="#82ca9d" name={t("dashboard.completed")} />
                    <Line type="monotone" dataKey="avgDelayMinutes" stroke="#ffc658" name={t("dashboard.avgDelay")} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  {t("dashboard.noData")}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Driver Performance */}
          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.driverPerformance")}</CardTitle>
            </CardHeader>
            <CardContent>
              {driverPerformance.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={driverPerformance.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="driverName" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="completionRate" fill="#8884d8" name={`${t("dashboard.completionRate")} (%)`} />
                    <Bar dataKey="avgDelay" fill="#82ca9d" name={`${t("dashboard.avgDelay")} (${t("dashboard.minutes")})`} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  {t("dashboard.noData")}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bus Utilization */}
          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.busUtilization")}</CardTitle>
            </CardHeader>
            <CardContent>
              {busUtilization.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={busUtilization.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="plateNumber" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="trips" fill="#8884d8" name={t("dashboard.trips")} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  {t("dashboard.noData")}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Route Punctuality */}
          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.routePunctuality")}</CardTitle>
            </CardHeader>
            <CardContent>
              {routePunctuality.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={routePunctuality.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="routeName" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="onTimeRate" fill="#82ca9d" name={`${t("dashboard.onTimeRate")} (%)`} />
                    <Bar dataKey="avgStopDelay" fill="#ffc658" name={`${t("dashboard.avgDelay")} (${t("dashboard.minutes")})`} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  {t("dashboard.noData")}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}

