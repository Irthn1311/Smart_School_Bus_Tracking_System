"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { DriverSidebar } from "@/components/driver/driver-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  MapPin,
  Navigation,
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  Flag,
  Cloud,
  Droplets,
  Wind,
  Fuel,
  Gauge,
  Thermometer,
  Phone,
  Navigation2,
  TrendingUp,
  AlertCircle,
  MapPinned,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { IncidentForm } from "@/components/driver/incident-form"
import { useTripBusPosition } from "@/hooks/use-socket"
import { startTripStrict as startTrip, endTrip } from "@/lib/services/trip.service"
import { useGPS } from "@/hooks/use-gps"
import { apiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import dynamic from "next/dynamic"
const LeafletMap = dynamic(() => import("@/components/map/leaflet-map"), { ssr: false })
// Input and ScrollArea removed (old admin chat UI deleted)

const mockTrip = {
  id: "1",
  route: "Tuyến 1 - Quận 1",
  startTime: "06:30",
  status: "in-progress",
  currentStop: 2,
  vehicle: {
    plateNumber: "51A-12345",
    fuel: 75,
    speed: 35,
    temperature: 85,
    mileage: 45230,
  },
  weather: {
    temp: 28,
    condition: "Nắng nhẹ",
    humidity: 65,
    wind: 12,
  },
  stops: [
    {
      id: "1",
      name: "Điểm 1",
      address: "123 Nguyễn Huệ, Q1",
      time: "06:30",
      eta: "06:30",
      status: "completed",
      notes: "Đã đón đủ học sinh",
      students: [
        {
          id: "1",
          name: "Nguyễn Văn A",
          status: "picked",
          avatar: "/placeholder.svg?height=40&width=40",
          parent: "0901234567",
        },
        {
          id: "2",
          name: "Trần Thị B",
          status: "picked",
          avatar: "/placeholder.svg?height=40&width=40",
          parent: "0901234568",
        },
      ],
    },
    {
      id: "2",
      name: "Điểm 2",
      address: "456 Lê Lợi, Q1",
      time: "06:38",
      eta: "06:40",
      status: "current",
      notes: "",
      students: [
        {
          id: "3",
          name: "Lê Văn C",
          status: "pending",
          avatar: "/placeholder.svg?height=40&width=40",
          parent: "0901234569",
        },
        {
          id: "4",
          name: "Phạm Thị D",
          status: "pending",
          avatar: "/placeholder.svg?height=40&width=40",
          parent: "0901234570",
        },
        {
          id: "5",
          name: "Hoàng Văn E",
          status: "absent",
          avatar: "/placeholder.svg?height=40&width=40",
          parent: "0901234571",
        },
      ],
    },
    {
      id: "3",
      name: "Điểm 3",
      address: "789 Pasteur, Q1",
      time: "06:45",
      eta: "06:48",
      status: "upcoming",
      notes: "",
      students: [
        {
          id: "6",
          name: "Võ Thị F",
          status: "pending",
          avatar: "/placeholder.svg?height=40&width=40",
          parent: "0901234572",
        },
        {
          id: "7",
          name: "Đặng Văn G",
          status: "pending",
          avatar: "/placeholder.svg?height=40&width=40",
          parent: "0901234573",
        },
      ],
    },
    {
      id: "4",
      name: "Trường TH ABC",
      address: "999 Trần Hưng Đạo, Q1",
      time: "07:00",
      eta: "07:05",
      status: "upcoming",
      notes: "",
      students: [],
    },
  ],
}


export default function TripDetailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useParams()
  const [trip, setTrip] = useState(mockTrip)
  const [isIncidentDialogOpen, setIsIncidentDialogOpen] = useState(false)
  const [stopNotes, setStopNotes] = useState<Record<string, string>>({})
  // old admin chat state removed
  const [atCurrentStop, setAtCurrentStop] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [started, setStarted] = useState(false)
  const [tripStatus, setTripStatus] = useState<'chua_khoi_hanh'|'dang_chay'|'hoan_thanh'|'huy'|undefined>(undefined)
  const [loadingDetail, setLoadingDetail] = useState<boolean>(true)
  const { toast } = useToast()

  // Realtime: join driver's trip room and move the vehicle marker when updates arrive
  const tripIdParam = (params?.id as string) || ""
  const tripIdNum = Number(tripIdParam)
  // DEV: Cho phép override tripId bằng biến môi trường hoặc query (?testTrip=42)
  const testTripFromQuery = searchParams?.get('testTrip') || searchParams?.get('testTripId') || undefined
  const testTripIdEnv = process.env.NEXT_PUBLIC_TEST_TRIP_ID
  const testTripId = testTripFromQuery ? Number(testTripFromQuery) : (testTripIdEnv ? Number(testTripIdEnv) : undefined)
  // Nếu có testTripId (env hoặc query) thì ưu tiên dùng để nhận event từ script test_bus_position
  const effectiveTripId = (typeof testTripId === 'number' && Number.isFinite(testTripId))
    ? testTripId
    : (Number.isFinite(tripIdNum) ? tripIdNum : undefined)
  const { busPosition } = useTripBusPosition(effectiveTripId)
  const { start: startGPS, stop: stopGPS, running: gpsRunning } = useGPS(effectiveTripId)
  // Khởi tạo theo vị trí test script (Hà Nội) để tránh nhảy từ HCM ra HN khi mới vào trang
  const [busLocation, setBusLocation] = useState<{ lat: number; lng: number }>({ lat: 21.0285, lng: 105.8542 })
  useEffect(() => {
    if (busPosition && Number.isFinite(busPosition.lat) && Number.isFinite(busPosition.lng)) {
      // Log for quick verification during test
      console.log('[Driver Trip] busPosition', busPosition)
      setBusLocation({ lat: busPosition.lat, lng: busPosition.lng })
    }
  }, [busPosition])

  // Load trip detail from API (ONLY trips; no schedules fallback)
  useEffect(() => {
    async function loadDetail() {
      try {
        if (!tripIdNum) return
        const res = await apiClient.getTripById(tripIdNum)
        const data: any = (res as any).data || res
        // Map minimal fields used by UI
        const route = data?.routeInfo?.tenTuyen || data?.tuyen?.tenTuyen || data?.tenTuyen || trip.route
        const stops = data?.routeInfo?.diemDung || data?.tuyen?.diemDung || data?.stops || []
        if (data?.trangThai) {
          setTripStatus(data.trangThai)
          if (data.trangThai === 'dang_chay') setStarted(true)
        }
        setTrip((prev) => ({
          ...prev,
          id: (data?.maChuyen || data?.id || prev.id) + '',
          route: route || prev.route,
          stops: Array.isArray(stops) && stops.length > 0 ? prev.stops.map((s, i) => ({ ...s, name: stops[i]?.tenDiem || s.name })) : prev.stops,
        }))
      } catch (e) {
        console.warn('Failed to load trip detail', e)
      } finally {
        setLoadingDetail(false)
      }
    }
    loadDetail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripIdNum])

  const currentStop = trip.stops[trip.currentStop]
  const progress = ((trip.currentStop + 1) / trip.stops.length) * 100

  const handleStudentCheck = (studentId: string, checked: boolean) => {
    setTrip((prev) => ({
      ...prev,
      stops: prev.stops.map((stop) =>
        stop.id === currentStop.id
          ? {
              ...stop,
              students: stop.students.map((student) =>
                student.id === studentId ? { ...student, status: checked ? "picked" : "pending" } : student,
              ),
            }
          : stop,
      ),
    }))
  }

  const handleMarkAbsent = (studentId: string) => {
    setTrip((prev) => ({
      ...prev,
      stops: prev.stops.map((stop) =>
        stop.id === currentStop.id
          ? {
              ...stop,
              students: stop.students.map((student) =>
                student.id === studentId ? { ...student, status: "absent" } : student,
              ),
            }
          : stop,
      ),
    }))
  }

  const arriveCurrentStop = () => {
    // Có thể cập nhật trạng thái điểm dừng nếu muốn hiển thị khác biệt
    setAtCurrentStop(true)
  }

  const leaveCurrentStop = () => {
    // Chuyển sang điểm tiếp theo
    if (trip.currentStop < trip.stops.length - 1) {
      setTrip((prev) => ({
        ...prev,
        currentStop: prev.currentStop + 1,
        stops: prev.stops.map((stop, index) =>
          index === prev.currentStop
            ? { ...stop, status: "completed" }
            : index === prev.currentStop + 1
              ? { ...stop, status: "current" }
              : stop,
        ),
      }))
      setAtCurrentStop(false)
    }
  }

  async function doStartTrip() {
    try {
      // Guard: chỉ start khi trạng thái hiện tại là 'chua_khoi_hanh'
      if (tripStatus && tripStatus !== 'chua_khoi_hanh') {
        toast({ title: 'Không thể bắt đầu', description: 'Chuyến đi đã được bắt đầu hoặc kết thúc', variant: 'destructive' })
        return
      }
      setProcessing(true)
      const res = await startTrip(tripIdNum)
      startGPS()
      setStarted(true)
      setTripStatus('dang_chay')
      const newId = (res as any)?.data?.maChuyen || (res as any)?.trip?.maChuyen || tripIdNum
      toast({ title: 'Đã bắt đầu chuyến đi', description: `Trip ${newId} đang chạy` })
      if (newId && newId !== tripIdNum) {
        router.push(`/driver/trip/${newId}`)
      }
    } catch (e) {
      toast({ title: 'Không thể bắt đầu chuyến', description: (e as Error)?.message || 'Vui lòng thử lại', variant: 'destructive' })
    } finally {
      setProcessing(false)
    }
  }

  const finishTrip = async () => {
    try {
      setProcessing(true)
      // Luôn đồng bộ trạng thái mới nhất trước khi kết thúc
      try {
        const res = await apiClient.getTripById(tripIdNum)
        const data: any = (res as any).data || res
        if (data?.trangThai) setTripStatus(data.trangThai)
        if (data?.trangThai === 'hoan_thanh' || data?.trangThai === 'bi_huy') {
          toast({ title: 'Không thể kết thúc', description: 'Chuyến đi đã kết thúc hoặc bị hủy', variant: 'destructive' })
          return
        }
      } catch { /* ignore refresh error and try ending anyway */ }

      // Thực hiện gọi API kết thúc; backend sẽ kiểm tra trạng thái hợp lệ
      await endTrip(tripIdNum)
      stopGPS()
      setTripStatus('hoan_thanh')
      toast({ title: 'Hoàn thành chuyến đi', description: `Trip ${tripIdNum} đã kết thúc` })
      // Điều hướng về giao diện chính Driver
      router.push('/driver')
    } catch (e) {
      toast({ title: 'Không thể kết thúc chuyến', description: (e as Error)?.message || 'Vui lòng thử lại', variant: 'destructive' })
      // Ở lại trang để người dùng thử lại, không điều hướng khi lỗi
    } finally {
      setProcessing(false)
    }
  }

  // Một nút duy nhất, thay đổi theo trạng thái
  const isLastStop = trip.currentStop === trip.stops.length - 1
  // Single CTA simplified to: if GPS not running → Start Trip; else follow stop flow
  // Hiển thị nút Bắt đầu nếu trạng thái hiện tại là 'chua_khoi_hanh'
  const showStart = tripStatus === 'chua_khoi_hanh'

  // Derive UI display for status/speed/time
  const currentSpeed = (typeof (busPosition as any)?.speed === 'number')
    ? Math.round((busPosition as any).speed)
    : trip.vehicle.speed
  const lastUpdateISO = (busPosition as any)?.timestamp || (busPosition as any)?.time
  const lastUpdateText = lastUpdateISO ? new Date(lastUpdateISO).toLocaleTimeString() : undefined
  const statusLabel = tripStatus === 'dang_chay' ? 'Đang chạy' : (tripStatus === 'hoan_thanh' ? 'Đã kết thúc' : 'Chưa khởi hành')
  const primaryCta = showStart
    ? {
        label: 'Bắt đầu chuyến đi',
        onClick: doStartTrip,
        icon: Navigation,
        variant: 'default' as const,
        className: 'bg-primary hover:bg-primary/90 text-white',
      }
    : {
        label: !atCurrentStop ? (isLastStop ? 'Đến điểm cuối' : 'Đến điểm dừng') : (isLastStop ? 'Kết thúc chuyến đi' : 'Rời điểm dừng'),
        onClick: !atCurrentStop ? arriveCurrentStop : (isLastStop ? finishTrip : leaveCurrentStop),
        icon: !atCurrentStop ? Navigation : (isLastStop ? Flag : ArrowRight),
        variant: (atCurrentStop && isLastStop) ? 'destructive' as const : 'default' as const,
        className: (!atCurrentStop) ? 'bg-sky-600 hover:bg-sky-700 text-white' : (isLastStop ? '' : 'bg-amber-500 hover:bg-amber-600 text-white'),
      }

  // Header nút Start/End không còn cần thiết khi dùng luồng 1 nút ở phần điểm dừng

  // chat handler removed

  return (
    <DashboardLayout sidebar={<DriverSidebar />}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{trip.route}</h1>
            <p className="text-muted-foreground mt-1">{statusLabel}{lastUpdateText ? ` • Cập nhật: ${lastUpdateText}` : ''}</p>
          </div>
          <div />
          <Dialog open={isIncidentDialogOpen} onOpenChange={setIsIncidentDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="border-destructive text-destructive hover:bg-destructive/10 bg-transparent"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Báo cáo sự cố
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Báo cáo sự cố</DialogTitle>
                <DialogDescription>Mô tả chi tiết sự cố đang gặp phải</DialogDescription>
              </DialogHeader>
              <IncidentForm onClose={() => setIsIncidentDialogOpen(false)} tripId={trip.id} />
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Nhiên liệu</p>
                  <p className="text-2xl font-bold text-foreground">{trip.vehicle.fuel}%</p>
                </div>
                <Fuel
                  className={`w-8 h-8 ${trip.vehicle.fuel > 50 ? "text-success" : trip.vehicle.fuel > 25 ? "text-warning" : "text-destructive"}`}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tốc độ</p>
                  <p className="text-2xl font-bold text-foreground">{trip.vehicle.speed} km/h</p>
                </div>
                <Gauge className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Nhiệt độ xe</p>
                  <p className="text-2xl font-bold text-foreground">{trip.vehicle.temperature}°C</p>
                </div>
                <Thermometer className={`w-8 h-8 ${trip.vehicle.temperature < 90 ? "text-success" : "text-warning"}`} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Thời tiết</p>
                  <p className="text-2xl font-bold text-foreground">{trip.weather.temp}°C</p>
                  <p className="text-xs text-muted-foreground">{trip.weather.condition}</p>
                </div>
                <Cloud className="w-8 h-8 text-info" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress */}
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tiến độ chuyến đi</span>
                <span className="font-medium">
                  {trip.currentStop + 1}/{trip.stops.length} điểm dừng
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Stop */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-primary/50 bg-primary/5">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    {currentStop.name}
                    {effectiveTripId && (
                      <Badge variant="outline" className="ml-2">Trip {effectiveTripId}</Badge>
                    )}
                  </CardTitle>
                  <Badge className="bg-primary text-primary-foreground">Điểm hiện tại</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{currentStop.address}</p>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    Dự kiến: {currentStop.time}
                  </div>
                  <div className="flex items-center gap-2 text-primary font-medium">
                    <TrendingUp className="w-4 h-4" />
                    ETA: {currentStop.eta}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Card className="border-border/50 bg-muted/30">
                      <CardContent className="p-4">
                                {/* Leaflet map (replaces Google Maps) */}
                                <div className="h-[640px] w-full">
                                  <LeafletMap
                                    height="640px"
                                    center={{ lat: busLocation.lat, lng: busLocation.lng }}
                                    zoom={13}
                                    followFirstMarker={true}
                                    autoFitOnUpdate={true}
                                    markers={[
                                      {
                                        // Use bus id from event if present; fallback to '5' to match test script
                                        id: (busPosition?.busId ?? 5) + "",
                                        lat: busLocation.lat,
                                        lng: busLocation.lng,
                                        label: `${trip.vehicle.plateNumber} - ${trip.route}`,
                                        type: 'bus' as const,
                                        status: 'running',
                                      },
                                    ]}
                                  />
                                </div>
                    {/* Removed route hints to bring students list closer */}
                  </CardContent>
                </Card>

                {/* Students List */}
                <div className="space-y-3">
                  <h4 className="font-medium text-foreground">Danh sách học sinh ({currentStop.students.length})</h4>
                  {currentStop.students.map((student) => (
                    <Card key={student.id} className="border-border/50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={student.status === "picked"}
                              onCheckedChange={(checked) => handleStudentCheck(student.id, checked as boolean)}
                              disabled={student.status === "absent"}
                            />
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={student.avatar || "/placeholder.svg"} alt={student.name} />
                              <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-foreground">{student.name}</p>
                              <div className="flex items-center gap-2">
                                {student.status === "picked" && (
                                  <p className="text-xs text-success flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" />
                                    Đã đón
                                  </p>
                                )}
                                {student.status === "absent" && (
                                  <p className="text-xs text-warning flex items-center gap-1">
                                    <XCircle className="w-3 h-3" />
                                    Vắng
                                  </p>
                                )}
                                {student.status === "pending" && (
                                  <p className="text-xs text-muted-foreground">Chờ đón</p>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="bg-transparent">
                              <Phone className="w-4 h-4" />
                            </Button>
                            {student.status === "pending" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleMarkAbsent(student.id)}
                                className="text-warning border-warning hover:bg-warning/10"
                              >
                                Đánh dấu vắng
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-foreground">Ghi chú điểm dừng</h4>
                  <Textarea
                    placeholder="Thêm ghi chú cho điểm dừng này..."
                    value={stopNotes[currentStop.id] || currentStop.notes}
                    onChange={(e) => setStopNotes({ ...stopNotes, [currentStop.id]: e.target.value })}
                    rows={2}
                    className="resize-none"
                  />
                </div>

                {/* Nút hành động đã chuyển ra dạng nổi (floating) để dễ thấy và bấm hơn */}
              </CardContent>
            </Card>

            {/* Old inline 'Liên lạc với Admin' chat removed - use floating widget instead */}
          </div>

          {/* Route Overview */}
          <div className="space-y-6">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Tổng quan tuyến đường</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {trip.stops.map((stop, index) => (
                    <div key={stop.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm ${
                            stop.status === "completed"
                              ? "bg-success text-success-foreground"
                              : stop.status === "current"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {index === trip.stops.length - 1 ? <Flag className="w-4 h-4" /> : index + 1}
                        </div>
                        {index < trip.stops.length - 1 && (
                          <div className={`w-0.5 h-12 ${stop.status === "completed" ? "bg-success" : "bg-border"}`} />
                        )}
                      </div>

                      <div className="flex-1 pb-4">
                        <p className="font-medium text-foreground text-sm">{stop.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <Clock className="w-3 h-3" />
                          <span>{stop.time}</span>
                          {stop.status !== "completed" && (
                            <>
                              <span>•</span>
                              <span className="text-primary">ETA: {stop.eta}</span>
                            </>
                          )}
                        </div>
                        {stop.students.length > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <Users className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{stop.students.length} học sinh</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Thống kê</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Đã đón</span>
                  <span className="text-sm font-medium text-success">2 học sinh</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Vắng</span>
                  <span className="text-sm font-medium text-warning">1 học sinh</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Còn lại</span>
                  <span className="text-sm font-medium">5 học sinh</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Thao tác</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  size="lg"
                  variant={primaryCta.variant}
                  onClick={primaryCta.onClick}
                  disabled={processing || loadingDetail}
                  className={cn('w-full h-12 rounded-lg', primaryCta.className)}
                >
                  <primaryCta.icon className="w-5 h-5 mr-2" />
                  {processing ? 'Đang xử lý…' : (loadingDetail ? 'Đang tải…' : primaryCta.label)}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      {/* Floating CTA removed; moved into the right sidebar's "Thao tác" card */}
    </DashboardLayout>
  )
}
