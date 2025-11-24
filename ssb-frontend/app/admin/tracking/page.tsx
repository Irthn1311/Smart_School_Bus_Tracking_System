"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MapPin } from "lucide-react"
import { Clock } from "lucide-react"
import { Users } from "lucide-react"
import { Navigation } from "lucide-react"
import { Phone } from "lucide-react"
import { MessageSquare } from "lucide-react"
import { Search } from "lucide-react"
import { AlertTriangle } from "lucide-react"
import { Activity } from "lucide-react"
import { Zap } from "lucide-react"
import { BarChart3 } from "lucide-react"
import { Settings } from "lucide-react"
import { RefreshCw } from "lucide-react"
import { Download } from "lucide-react"
import { Bell } from "lucide-react"
import { Route } from "lucide-react"
import { Timer } from "lucide-react"
import { Gauge } from "lucide-react"
import { AlertCircle } from "lucide-react"
import { CheckCircle2 } from "lucide-react"
import { XCircle } from "lucide-react"
import { Info } from "lucide-react"
import { MapView } from "@/components/tracking/MapView"
import { apiClient } from "@/lib/api"
import { socketService } from "@/lib/socket"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useSearchParams } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useSocket } from "@/hooks/use-socket"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"

type Bus = {
  id: string
  tripId?: string
  plateNumber: string
  route: string
  routeId?: number
  routePolyline?: string | null
  driver?: string
  driverPhone?: string
  driverId?: number
  status: "running" | "late" | "incident" | "idle"
  speed?: number
  students?: number
  currentStop?: string
  nextStop?: string
  eta?: string
  progress?: number
  lat: number
  lng: number
  hasDelay?: boolean
  lastUpdate?: string
  heading?: number
  delayMinutes?: number
  incidentType?: string
}

type RouteInfo = {
  routeId: number
  routeName: string
  polyline: string | null
  color: string
  busCount: number
}

type Alert = {
  id: string
  type: "delay" | "incident" | "speed" | "route_deviation"
  severity: "low" | "medium" | "high"
  busId: string
  busPlate: string
  message: string
  timestamp: string
  acknowledged: boolean
}

// Color palette for routes (distinct colors)
const ROUTE_COLORS = [
  "#3B82F6", // blue-500
  "#10B981", // emerald-500
  "#F59E0B", // amber-500
  "#EF4444", // red-500
  "#8B5CF6", // violet-500
  "#EC4899", // pink-500
  "#06B6D4", // cyan-500
  "#84CC16", // lime-500
  "#F97316", // orange-500
  "#6366F1", // indigo-500
]

export default function TrackingPage() {
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { isConnected } = useSocket()
  const [buses, setBuses] = useState<Bus[]>([])
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null)
  const [routes, setRoutes] = useState<RouteInfo[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [routeFilter, setRouteFilter] = useState<string>("all")
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [showPolylines, setShowPolylines] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(30) // seconds
  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    running: 0,
    late: 0,
    incident: 0,
    idle: 0,
    avgSpeed: 0,
    totalStudents: 0,
  })

  // Helper function to determine bus status
  const determineStatus = (
    trip: any,
    speed: number,
    hasDelay: boolean,
    hasIncident: boolean
  ): "running" | "late" | "incident" | "idle" => {
    if (hasIncident || trip?.suCo || trip?.hasIncident) return "incident"
    if (hasDelay) return "late"
    if (speed > 5) return "running" // Consider moving if speed > 5 km/h
    return "idle"
  }

  // Get status color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case "running":
        return "#22c55e" // green-500
      case "late":
        return "#eab308" // yellow-500
      case "incident":
        return "#ef4444" // red-500
      case "idle":
        return "#6b7280" // gray-500
      default:
        return "#6b7280"
    }
  }

  // Get route color (assign distinct colors)
  const getRouteColor = (routeId: number): string => {
    return ROUTE_COLORS[routeId % ROUTE_COLORS.length]
  }

  // Load trips and buses
  const loadBuses = useCallback(async () => {
    if (isLoading) return
    setIsLoading(true)
    try {
      const tripsRes = await apiClient.getTrips({ trangThai: "dang_chay" })
      const trips: any[] = Array.isArray(tripsRes?.data) ? tripsRes.data : []

      const busesWithRoutes: Bus[] = []
      const routeMap = new Map<number, RouteInfo>()

      const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
      const batchSize = 3

      for (let i = 0; i < trips.length; i += batchSize) {
        const batch = trips.slice(i, i + batchSize)

        const batchPromises = batch.map(async (trip, idx) => {
          if (idx > 0) await delay(200)

          try {
            const tripDetail = await apiClient.getTripById(trip.maChuyen || trip.id)
            const detail: any = tripDetail?.data || tripDetail
            return { trip, detail }
          } catch (err: any) {
            if (err?.status === 429) {
              console.warn(`[Tracking] Rate limited for trip ${trip.maChuyen || trip.id}`)
              return null
            }
            console.warn(`[Tracking] Failed to load trip detail:`, err)
            return null
          }
        })

        const batchResults = await Promise.all(batchPromises)

        for (const result of batchResults) {
          if (!result) continue

          const { trip, detail } = result
          const routeInfo = detail?.routeInfo
          const busInfo = detail?.busInfo
          const driverInfo = detail?.driverInfo
          const schedule = detail?.schedule

          const currentPos = detail?.currentPosition || { lat: 10.762622, lng: 106.660172 }
          const speed = Number(detail?.speed ?? detail?.tocDo ?? 0)
          const hasDelay = detail?.hasDelay || false
          const hasIncident = detail?.suCo || detail?.hasIncident || false

          const routeId = routeInfo?.maTuyen || schedule?.maTuyen
          const routeName = routeInfo?.tenTuyen || schedule?.tenTuyen || "Chưa có tên tuyến"
          const polyline = routeInfo?.polyline || null

          if (routeId && !routeMap.has(routeId)) {
            routeMap.set(routeId, {
              routeId,
              routeName,
              polyline,
              color: getRouteColor(routeId),
              busCount: 0,
            })
          }

          if (routeId) {
            const route = routeMap.get(routeId)
            if (route) route.busCount++
          }

          const students = Array.isArray(detail?.students) ? detail.students.length : 0
          const status = determineStatus(detail, speed, hasDelay, hasIncident)

          busesWithRoutes.push({
            id: (trip.maChuyen || trip.id) + "", // Use tripId as unique key to avoid duplicates
            tripId: (trip.maChuyen || trip.id) + "",
            plateNumber: busInfo?.bienSoXe || detail?.bienSoXe || "N/A",
            route: routeName,
            routeId,
            routePolyline: polyline,
            driver: driverInfo?.tenTaiXe || driverInfo?.hoTen || "-",
            driverPhone: driverInfo?.soDienThoai || "-",
            driverId: driverInfo?.maTaiXe || schedule?.maTaiXe,
            speed,
            status,
            students,
            lat: Number(currentPos.lat || currentPos.viDo || 10.762622),
            lng: Number(currentPos.lng || currentPos.kinhDo || 106.660172),
            hasDelay,
            progress: 0,
            lastUpdate: new Date().toISOString(),
            heading: detail?.heading || detail?.huongDi,
            delayMinutes: detail?.delayMinutes,
            incidentType: detail?.incidentType,
          })

          const tripId = trip.maChuyen || trip.id
          if (tripId) {
            socketService.joinTrip(tripId)
          }
        }

        if (i + batchSize < trips.length) {
          await delay(500)
        }
      }

      setBuses(busesWithRoutes)
      setRoutes(Array.from(routeMap.values()))

      // Calculate stats
      const newStats = {
        total: busesWithRoutes.length,
        running: busesWithRoutes.filter((b) => b.status === "running").length,
        late: busesWithRoutes.filter((b) => b.status === "late").length,
        incident: busesWithRoutes.filter((b) => b.status === "incident").length,
        idle: busesWithRoutes.filter((b) => b.status === "idle").length,
        avgSpeed:
          busesWithRoutes.length > 0
            ? Math.round(
                busesWithRoutes.reduce((sum, b) => sum + (b.speed || 0), 0) /
                  busesWithRoutes.length
              )
            : 0,
        totalStudents: busesWithRoutes.reduce((sum, b) => sum + (b.students || 0), 0),
      }
      setStats(newStats)

      // Generate alerts
      const newAlerts: Alert[] = []
      busesWithRoutes.forEach((bus) => {
        if (bus.status === "incident") {
          newAlerts.push({
            id: `incident-${bus.id}-${Date.now()}`,
            type: "incident",
            severity: "high",
            busId: bus.id,
            busPlate: bus.plateNumber,
            message: `Sự cố: ${bus.incidentType || "Không xác định"}`,
            timestamp: bus.lastUpdate || new Date().toISOString(),
            acknowledged: false,
          })
        } else if (bus.status === "late" && bus.delayMinutes && bus.delayMinutes > 10) {
          newAlerts.push({
            id: `delay-${bus.id}-${Date.now()}`,
            type: "delay",
            severity: bus.delayMinutes > 20 ? "high" : "medium",
            busId: bus.id,
            busPlate: bus.plateNumber,
            message: `Trễ ${bus.delayMinutes} phút`,
            timestamp: bus.lastUpdate || new Date().toISOString(),
            acknowledged: false,
          })
        }
      })
      setAlerts((prev) => {
        const existingIds = new Set(prev.map((a) => a.id))
        return [...prev, ...newAlerts.filter((a) => !existingIds.has(a.id))]
      })

      if (busesWithRoutes.length > 0 && !selectedBus) {
        setSelectedBus(busesWithRoutes[0])
      }
    } catch (e) {
      console.error("[Tracking] Failed to load trips:", e)
      toast({
        title: "Lỗi",
        description: "Không thể tải dữ liệu xe buýt",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, selectedBus, toast])

  // Initial load
  useEffect(() => {
    loadBuses()
  }, [])

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => {
      loadBuses()
    }, refreshInterval * 1000)
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, loadBuses])

  // Real-time position updates
  useEffect(() => {
    const positionHandler = (e: Event) => {
      const d: any = (e as CustomEvent).detail
      if (!d) return
      const tripId = d.tripId ?? d.maChuyen
      const busId = d.busId ?? d.id ?? d.vehicleId ?? d.bus?.id
      const lat = d.lat ?? d.latitude ?? d.coords?.lat
      const lng = d.lng ?? d.longitude ?? d.coords?.lng ?? d.lon
      const speed = typeof d.speed === "number" ? d.speed : undefined
      const heading = typeof d.heading === "number" ? d.heading : undefined

      if (!tripId && !busId && lat == null && lng == null && speed == null) return

      setBuses((prev) =>
        prev.map((b) => {
          const matches =
            (tripId && b.tripId === String(tripId)) ||
            (busId && b.id + "" === busId + "")

          if (!matches) return b

          const nextLat = typeof lat === "number" ? lat : b.lat
          const nextLng = typeof lng === "number" ? lng : b.lng
          const nextSpeed = typeof speed === "number" ? speed : b.speed || 0
          const nextHeading = typeof heading === "number" ? heading : b.heading
          const nextStatus = determineStatus({}, nextSpeed, b.hasDelay || false, false)

          return {
            ...b,
            lat: nextLat,
            lng: nextLng,
            speed: nextSpeed,
            heading: nextHeading,
            status: nextStatus,
            lastUpdate: new Date().toISOString(),
          }
        })
      )
    }

    const delayHandler = (e: Event) => {
      const d: any = (e as CustomEvent).detail
      if (!d?.tripId) return

      setBuses((prev) =>
        prev.map((b) => {
          if (b.tripId !== String(d.tripId)) return b
          return {
            ...b,
            hasDelay: true,
            status: "late",
            delayMinutes: d.delayMinutes || 0,
          }
        })
      )
    }

    window.addEventListener("busPositionUpdate", positionHandler as EventListener)
    window.addEventListener("busLocationUpdate", positionHandler as EventListener)
    window.addEventListener("delayAlert", delayHandler as EventListener)

    return () => {
      window.removeEventListener("busPositionUpdate", positionHandler as EventListener)
      window.removeEventListener("busLocationUpdate", positionHandler as EventListener)
      window.removeEventListener("delayAlert", delayHandler as EventListener)
    }
  }, [])

  // Listen for approach_stop and delay_alert events via WebSocket
  useEffect(() => {
    if (!isConnected) return

    const socket = socketService.getSocket()
    if (!socket) return

    const handleApproachStop = (data: any) => {
      const tripId = data?.tripId ?? data?.trip_id
      const stopName = data?.stopName || data?.stop_name || "điểm dừng"
      const distance = data?.distance_m || data?.distance || 0
      const etaMinutes = data?.eta?.etaMinutes || Math.round(distance / 1000 * 2) // rough estimate

      // Find bus by tripId and update
      setBuses((prev) =>
        prev.map((b) => {
          if (b.tripId === String(tripId)) {
            return {
              ...b,
              nextStop: stopName,
              eta: etaMinutes > 0 ? `${etaMinutes} phút` : undefined,
            }
          }
          return b
        })
      )

      // Show toast notification
      toast({
        title: "🚏 Xe sắp đến điểm dừng",
        description: `Xe ${data?.busId ? `#${data.busId}` : ""} đang cách ${stopName} khoảng ${Math.round(distance)}m (~${etaMinutes} phút)`,
        duration: 5000,
      })
    }

    const handleDelayAlert = (data: any) => {
      const tripId = data?.tripId ?? data?.trip_id
      const delayMinutes = data?.delayMinutes || data?.delay_minutes || data?.delay_min || 0

      // Update bus status
      setBuses((prev) =>
        prev.map((b) => {
          if (b.tripId === String(tripId)) {
            return {
              ...b,
              hasDelay: true,
              status: "late",
              delayMinutes,
            }
          }
          return b
        })
      )

      // Show warning toast
      toast({
        title: "⏰ Cảnh báo chậm trễ",
        description: `Chuyến ${tripId} bị trễ ${delayMinutes} phút so với kế hoạch`,
        variant: "destructive",
        duration: 7000,
      })
    }

    socket.on("approach_stop", handleApproachStop)
    socket.on("delay_alert", handleDelayAlert)

    return () => {
      socket.off("approach_stop", handleApproachStop)
      socket.off("delay_alert", handleDelayAlert)
    }
  }, [isConnected, toast])

  // Filter buses
  const filteredBuses = useMemo(() => {
    let filtered = buses

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (b) =>
          b.plateNumber.toLowerCase().includes(query) ||
          b.route.toLowerCase().includes(query) ||
          b.driver?.toLowerCase().includes(query)
      )
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((b) => b.status === statusFilter)
    }

    // Route filter
    if (routeFilter !== "all") {
      filtered = filtered.filter((b) => b.routeId === Number(routeFilter))
    }

    return filtered
  }, [buses, searchQuery, statusFilter, routeFilter])

  // Filtered routes for map (only show routes with visible buses)
  const visibleRoutes = useMemo(() => {
    if (!showPolylines) return []
    const visibleRouteIds = new Set(filteredBuses.map((b) => b.routeId).filter(Boolean))
    return routes.filter((r) => visibleRouteIds.has(r.routeId))
  }, [routes, filteredBuses, showPolylines])

  return (
    <DashboardLayout sidebar={<AdminSidebar />}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Theo dõi Real-time</h1>
            <p className="text-muted-foreground mt-1">
              Giám sát vị trí và trạng thái xe buýt trực tiếp
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadBuses()}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Làm mới
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Xuất báo cáo
            </Button>
          </div>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tổng số xe</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Activity className="w-8 h-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 border-green-500/20 bg-green-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Đang chạy</p>
                  <p className="text-2xl font-bold text-green-500">{stats.running}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 border-yellow-500/20 bg-yellow-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Trễ</p>
                  <p className="text-2xl font-bold text-yellow-500">{stats.late}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-yellow-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 border-red-500/20 bg-red-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Sự cố</p>
                  <p className="text-2xl font-bold text-red-500">{stats.incident}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 border-gray-500/20 bg-gray-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Đứng yên</p>
                  <p className="text-2xl font-bold text-gray-500">{stats.idle}</p>
                </div>
                <Timer className="w-8 h-8 text-gray-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tốc độ TB</p>
                  <p className="text-2xl font-bold">{stats.avgSpeed} km/h</p>
                </div>
                <Gauge className="w-8 h-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Học sinh</p>
                  <p className="text-2xl font-bold">{stats.totalStudents}</p>
                </div>
                <Users className="w-8 h-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Controls */}
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm kiếm biển số, tuyến, tài xế..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="running">Đang chạy</SelectItem>
                  <SelectItem value="late">Trễ</SelectItem>
                  <SelectItem value="incident">Sự cố</SelectItem>
                  <SelectItem value="idle">Đứng yên</SelectItem>
                </SelectContent>
              </Select>

              <Select value={routeFilter} onValueChange={setRouteFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tuyến đường" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả tuyến</SelectItem>
                  {routes.map((route) => (
                    <SelectItem key={route.routeId} value={String(route.routeId)}>
                      {route.routeName} ({route.busCount})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="auto-refresh"
                    checked={autoRefresh}
                    onCheckedChange={setAutoRefresh}
                  />
                  <Label htmlFor="auto-refresh" className="text-sm">
                    Tự động làm mới
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="show-polylines"
                    checked={showPolylines}
                    onCheckedChange={setShowPolylines}
                  />
                  <Label htmlFor="show-polylines" className="text-sm">
                    Hiển thị tuyến
                  </Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Bản đồ theo dõi</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-primary text-primary">
                      <div className="w-2 h-2 rounded-full bg-primary mr-2 animate-pulse" />
                      Live
                    </Badge>
                    {autoRefresh && (
                      <Badge variant="outline" className="text-xs">
                        Tự làm mới: {refreshInterval}s
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <MapView
                  buses={filteredBuses.map((b) => ({
                    id: b.id,
                    plateNumber: b.plateNumber,
                    route: b.route,
                    status: b.status,
                    lat: b.lat,
                    lng: b.lng,
                    speed: b.speed || 0,
                    students: b.students || 0,
                    heading: b.heading,
                  }))}
                  selectedBus={
                    selectedBus
                      ? {
                          id: selectedBus.id,
                          plateNumber: selectedBus.plateNumber,
                          route: selectedBus.route,
                          status: selectedBus.status,
                          lat: selectedBus.lat,
                          lng: selectedBus.lng,
                          speed: selectedBus.speed || 0,
                          students: selectedBus.students || 0,
                          heading: selectedBus.heading,
                        }
                      : undefined
                  }
                  onSelectBus={(b: any) => {
                    const bus = buses.find((bus) => bus.id === b.id)
                    if (bus) setSelectedBus(bus)
                  }}
                  routes={visibleRoutes.map((r) => ({
                    routeId: r.routeId,
                    routeName: r.routeName,
                    polyline: r.polyline,
                    color: r.color,
                  }))}
                  autoFitOnUpdate
                />
              </CardContent>
            </Card>

            {/* Alerts */}
            {alerts.length > 0 && (
              <Card className="border-border/50 border-yellow-500/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-yellow-500" />
                      Cảnh báo ({alerts.filter((a) => !a.acknowledged).length})
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAlerts([])}
                    >
                      Xóa tất cả
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {alerts
                        .filter((a) => !a.acknowledged)
                        .slice(0, 5)
                        .map((alert) => (
                          <div
                            key={alert.id}
                            className={`p-3 rounded-lg border ${
                              alert.severity === "high"
                                ? "border-red-500/20 bg-red-500/5"
                                : alert.severity === "medium"
                                ? "border-yellow-500/20 bg-yellow-500/5"
                                : "border-blue-500/20 bg-blue-500/5"
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge
                                    variant="outline"
                                    className={
                                      alert.severity === "high"
                                        ? "border-red-500 text-red-500"
                                        : alert.severity === "medium"
                                        ? "border-yellow-500 text-yellow-500"
                                        : "border-blue-500 text-blue-500"
                                    }
                                  >
                                    {alert.type === "incident"
                                      ? "Sự cố"
                                      : alert.type === "delay"
                                      ? "Trễ"
                                      : alert.type}
                                  </Badge>
                                  <span className="text-sm font-medium">
                                    {alert.busPlate}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {alert.message}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(alert.timestamp).toLocaleTimeString("vi-VN")}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setAlerts((prev) =>
                                    prev.map((a) =>
                                      a.id === alert.id ? { ...a, acknowledged: true } : a
                                    )
                                  )
                                }}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Bus List & Details */}
          <div className="space-y-6">
            {/* Bus List */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>
                  Xe đang hoạt động ({filteredBuses.length}/{buses.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-3">
                    {filteredBuses.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Không tìm thấy xe nào
                      </div>
                    ) : (
                      filteredBuses.map((bus) => (
                        <Card
                          key={bus.id}
                          className={`border cursor-pointer transition-all ${
                            selectedBus && selectedBus.id === bus.id
                              ? "border-primary bg-primary/5 shadow-md"
                              : "border-border/50 hover:border-primary/50"
                          }`}
                          onClick={() => setSelectedBus(bus)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="font-medium text-foreground">
                                  {bus.plateNumber}
                                </p>
                                <p className="text-xs text-muted-foreground">{bus.route}</p>
                              </div>
                              <Badge
                                variant="outline"
                                className={`${
                                  bus.status === "running"
                                    ? "border-green-500 text-green-500 bg-green-500/10"
                                    : bus.status === "late"
                                    ? "border-yellow-500 text-yellow-500 bg-yellow-500/10"
                                    : bus.status === "incident"
                                    ? "border-red-500 text-red-500 bg-red-500/10"
                                    : "border-gray-500 text-gray-500 bg-gray-500/10"
                                }`}
                              >
                                {bus.status === "running"
                                  ? "Đang chạy"
                                  : bus.status === "late"
                                  ? "Trễ"
                                  : bus.status === "incident"
                                  ? "Sự cố"
                                  : "Đứng yên"}
                              </Badge>
                            </div>

                            <div className="space-y-1 text-xs">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Navigation className="w-3 h-3" />
                                {bus.speed || 0} km/h
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Users className="w-3 h-3" />
                                {bus.students || 0} học sinh
                              </div>
                              {bus.delayMinutes && bus.delayMinutes > 0 && (
                                <div className="flex items-center gap-2 text-yellow-500">
                                  <Clock className="w-3 h-3" />
                                  Trễ {bus.delayMinutes} phút
                                </div>
                              )}
                            </div>

                            {/* Progress Bar */}
                            <div className="mt-3">
                              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all ${
                                    bus.status === "running"
                                      ? "bg-green-500"
                                      : bus.status === "late"
                                      ? "bg-yellow-500"
                                      : bus.status === "incident"
                                      ? "bg-red-500"
                                      : "bg-gray-500"
                                  }`}
                                  style={{ width: `${bus.progress || 0}%` }}
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Advanced Features Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Route Analytics */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Phân tích tuyến đường
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {routes.map((route) => {
                  const routeBuses = buses.filter((b) => b.routeId === route.routeId)
                  const avgSpeed =
                    routeBuses.length > 0
                      ? Math.round(
                          routeBuses.reduce((sum, b) => sum + (b.speed || 0), 0) /
                            routeBuses.length
                        )
                      : 0
                  const onTimeRate =
                    routeBuses.length > 0
                      ? Math.round(
                          (routeBuses.filter((b) => b.status === "running").length /
                            routeBuses.length) *
                            100
                        )
                      : 0

                  return (
                    <div
                      key={route.routeId}
                      className="p-4 border rounded-lg"
                      style={{ borderLeftColor: route.color, borderLeftWidth: "4px" }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{route.routeName}</h4>
                        <Badge variant="outline">{route.busCount} xe</Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Tốc độ TB</span>
                          <span className="font-medium">{avgSpeed} km/h</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Tỷ lệ đúng giờ</span>
                          <span className="font-medium">{onTimeRate}%</span>
                        </div>
                        <Progress value={onTimeRate} className="h-2" />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Hành động nhanh
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-auto flex-col py-4">
                  <Bell className="w-5 h-5 mb-2" />
                  <span className="text-xs">Thông báo tất cả</span>
                </Button>
                <Button variant="outline" className="h-auto flex-col py-4">
                  <Download className="w-5 h-5 mb-2" />
                  <span className="text-xs">Xuất báo cáo</span>
                </Button>
                <Button variant="outline" className="h-auto flex-col py-4">
                  <Route className="w-5 h-5 mb-2" />
                  <span className="text-xs">Tối ưu tuyến</span>
                </Button>
                <Button variant="outline" className="h-auto flex-col py-4">
                  <Settings className="w-5 h-5 mb-2" />
                  <span className="text-xs">Cài đặt</span>
                </Button>
              </div>

              {/* Route Optimization Suggestions */}
              {stats.late > 0 && (
                <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-yellow-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-yellow-500">
                        Gợi ý tối ưu hóa
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Có {stats.late} xe đang trễ. Xem xét điều chỉnh lịch trình hoặc
                        tối ưu tuyến đường.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Selected Bus Details */}
        {selectedBus && (
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Chi tiết xe {selectedBus.plateNumber}</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Phone className="w-4 h-4 mr-2" />
                    Gọi {selectedBus.driver}
                  </Button>
                  <Button variant="outline" size="sm">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Nhắn tin
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="info" className="w-full">
                <TabsList>
                  <TabsTrigger value="info">Thông tin</TabsTrigger>
                  <TabsTrigger value="route">Tuyến đường</TabsTrigger>
                  <TabsTrigger value="history">Lịch sử</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Driver Info */}
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-muted-foreground">Tài xế</p>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage
                            src={`/.jpg?height=40&width=40&query=${selectedBus.driver || ""}`}
                          />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {(selectedBus.driver || "T")[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">
                            {selectedBus.driver || "-"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {selectedBus.driverPhone || "-"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Current Location */}
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-muted-foreground">
                        Vị trí hiện tại
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium">
                            {selectedBus.currentStop || "Đang di chuyển"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Navigation className="w-4 h-4" />
                          <span className="text-sm">
                            Tiếp theo: {selectedBus.nextStop || "-"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm">ETA: {selectedBus.eta || "-"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Trip Stats */}
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-muted-foreground">
                        Thống kê chuyến đi
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Tốc độ</span>
                          <span className="text-sm font-medium">
                            {selectedBus.speed || 0} km/h
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Học sinh</span>
                          <span className="text-sm font-medium">
                            {selectedBus.students || 0}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Tiến độ</span>
                          <span className="text-sm font-medium">
                            {selectedBus.progress || 0}%
                          </span>
                        </div>
                        {selectedBus.delayMinutes && selectedBus.delayMinutes > 0 && (
                          <div className="flex items-center justify-between text-yellow-500">
                            <span className="text-sm">Trễ</span>
                            <span className="text-sm font-medium">
                              {selectedBus.delayMinutes} phút
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status */}
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-muted-foreground">Trạng thái</p>
                      <div className="space-y-2">
                        <Badge
                          variant="outline"
                          className={`w-full justify-center ${
                            selectedBus.status === "running"
                              ? "border-green-500 text-green-500"
                              : selectedBus.status === "late"
                              ? "border-yellow-500 text-yellow-500"
                              : selectedBus.status === "incident"
                              ? "border-red-500 text-red-500"
                              : "border-gray-500 text-gray-500"
                          }`}
                        >
                          {selectedBus.status === "running"
                            ? "Đang chạy"
                            : selectedBus.status === "late"
                            ? "Trễ"
                            : selectedBus.status === "incident"
                            ? "Sự cố"
                            : "Đứng yên"}
                        </Badge>
                        {selectedBus.lastUpdate && (
                          <p className="text-xs text-muted-foreground text-center">
                            Cập nhật:{" "}
                            {new Date(selectedBus.lastUpdate).toLocaleTimeString("vi-VN")}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="route" className="mt-4">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        Tuyến đường
                      </p>
                      <p className="text-lg font-semibold">{selectedBus.route}</p>
                    </div>
                    {selectedBus.routePolyline && (
                      <div className="p-4 bg-muted/30 rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          Polyline đã được hiển thị trên bản đồ
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="history" className="mt-4">
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
                      <div>
                        <p className="text-xs font-medium">Đã đón học sinh</p>
                        <p className="text-xs text-muted-foreground">2 phút trước</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                      <div>
                        <p className="text-xs font-medium">Rời điểm dừng</p>
                        <p className="text-xs text-muted-foreground">5 phút trước</p>
                      </div>
                    </div>
                    {selectedBus.status === "incident" && (
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5" />
                        <div>
                          <p className="text-xs font-medium">
                            Báo cáo sự cố: {selectedBus.incidentType || "Không xác định"}
                          </p>
                          <p className="text-xs text-muted-foreground">12 phút trước</p>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
