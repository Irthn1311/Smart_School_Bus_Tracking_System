"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, AlertTriangle, Users, MapPin } from "lucide-react"
import { format } from "date-fns"
import { vi } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { apiClient } from "@/lib/api"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface ScheduleFormProps {
  onClose: () => void
  onSaved?: (schedule: any) => void
  mode?: "create" | "edit"
  initialSchedule?: any
}

export function ScheduleForm({ onClose, onSaved, mode = "create", initialSchedule }: ScheduleFormProps) {
  const [date, setDate] = useState<Date>()
  const [route, setRoute] = useState("")
  const [bus, setBus] = useState("")
  const [driver, setDriver] = useState("")
  const [tripType, setTripType] = useState("")
  const [startTime, setStartTime] = useState("")
  const [tripTypeAutoFilled, setTripTypeAutoFilled] = useState(false) // Track if tripType was auto-filled
  const [routes, setRoutes] = useState<any[]>([])
  const [buses, setBuses] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [routeStops, setRouteStops] = useState<any[]>([])
  const [routeStudentsByStop, setRouteStudentsByStop] = useState<Record<string, Array<{ maHocSinh: number; hoTen: string; lop?: string; diaChi?: string }>>>({})
  const [loadingStops, setLoadingStops] = useState(false)
  const [conflictError, setConflictError] = useState<{
    message: string
    conflicts: Array<{
      scheduleId: number
      conflictType: 'bus' | 'driver' | 'both'
      bus: string
      driver: string
      time: string
      date: string
    }>
  } | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [r, b, d] = await Promise.all([
          apiClient.getRoutes({ limit: 100 }),
          apiClient.getBuses({ limit: 100 }),
          apiClient.getDrivers({ limit: 100 }),
        ])
        const rItems = ((r as any).data && Array.isArray((r as any).data) ? (r as any).data : (r as any).data?.data) || []
        const bItems = ((b as any).data && Array.isArray((b as any).data) ? (b as any).data : (b as any).data?.data) || []
        const dItems = ((d as any).data && Array.isArray((d as any).data) ? (d as any).data : (d as any).data?.data) || []
        if (mounted) {
          setRoutes(rItems)
          setBuses(bItems)
          setDrivers(dItems)
        }
      } catch (e) {
        console.error(e)
      }
    })()
    return () => { mounted = false }
  }, [])

  // Load route stops and suggestions when route is selected
  useEffect(() => {
    if (route) {
      setLoadingStops(true)
      
      // Load route details first to get routeType
      const loadRouteDetails = apiClient.getRouteById(parseInt(route))
        .then((res: any) => {
          const routeData = (res as any).data || res || {}
          
          // Tự động điền loại chuyến dựa vào routeType
          // Chỉ điền khi chưa có tripType (user chưa chọn thủ công)
          if (routeData.routeType && !tripType) {
            if (routeData.routeType === 'di') {
              setTripType('don_sang')
              setTripTypeAutoFilled(true)
              console.log("[ScheduleForm] Auto-filled tripType: don_sang (from routeType: di)")
              toast({
                title: "Đã tự động điền",
                description: "Loại chuyến: Đón sáng (từ tuyến đường)",
                variant: "default",
              })
            } else if (routeData.routeType === 've') {
              setTripType('tra_chieu')
              setTripTypeAutoFilled(true)
              console.log("[ScheduleForm] Auto-filled tripType: tra_chieu (from routeType: ve)")
              toast({
                title: "Đã tự động điền",
                description: "Loại chuyến: Trả chiều (từ tuyến đường)",
                variant: "default",
              })
            }
          }
          
          return routeData
        })
        .catch((err: any) => {
          console.warn("Failed to load route details:", err)
          return {}
        })
      
      // Load route stops
      const loadStops = apiClient.getRouteStops(parseInt(route))
        .then((res: any) => {
          const stops = (res as any).data || []
          const sortedStops = stops.sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0))
          setRouteStops(sortedStops)
          return sortedStops
        })
        .catch((err: any) => {
          console.error("Failed to load route stops:", err)
          setRouteStops([])
          return []
        })

      // Load students assigned to stops from route (từ student_stop_suggestions hoặc schedule_student_stops)
      const loadRouteStudents = apiClient.getRouteStopSuggestions(parseInt(route))
        .then((res: any) => {
          const data = (res as any).data || {}
          const stopsWithStudents = data.stops || []
          
          console.log("[ScheduleForm] Loaded students from route:", {
            totalStops: stopsWithStudents.length,
            totalStudents: data.totalStudents || 0,
          })

          // Tổ chức học sinh theo stop (key: `${sequence}_${maDiem}`)
          const studentsByStop: Record<string, Array<{ maHocSinh: number; hoTen: string; lop?: string; diaChi?: string }>> = {}
          
          stopsWithStudents.forEach((stop: any) => {
            if (stop.students && Array.isArray(stop.students) && stop.students.length > 0) {
              const stopKey = `${stop.sequence}_${stop.maDiem}`
              studentsByStop[stopKey] = stop.students.map((s: any) => ({
                maHocSinh: s.maHocSinh,
                hoTen: s.hoTen || s.name,
                lop: s.lop,
                diaChi: s.diaChi || s.address,
              }))
            }
          })

          setRouteStudentsByStop(studentsByStop)
          
          const totalStudents = Object.values(studentsByStop).reduce((sum, students) => sum + students.length, 0)
          if (totalStudents > 0) {
            toast({
              title: "Đã tải học sinh",
              description: `Đã tải ${totalStudents} học sinh từ tuyến đường`,
              variant: "default",
            })
          }

          return stopsWithStudents
        })
        .catch((err: any) => {
          // Không bắt buộc phải có students, chỉ log warning
          console.warn("[ScheduleForm] No students assigned to route stops:", err)
          setRouteStudentsByStop({})
          return []
        })

      // Wait for all to complete
      Promise.all([loadRouteDetails, loadStops, loadRouteStudents])
        .finally(() => setLoadingStops(false))
    } else {
      setRouteStops([])
      // Reset tripType when route is cleared (chỉ khi đã được auto-fill)
      if (mode === 'create' && tripTypeAutoFilled) {
        setTripType('')
        setTripTypeAutoFilled(false)
      }
    }
  }, [route, mode])

  // Load existing students when editing (từ schedule_student_stops)
  useEffect(() => {
    if (mode === "edit" && initialSchedule?.id) {
      apiClient.getScheduleStudents(initialSchedule.id)
        .then((res: any) => {
          const data = (res as any).data || {}
          const studentsByStop = data.studentsByStop || []
          const studentsByStopMap: Record<string, Array<{ maHocSinh: number; hoTen: string; lop?: string; diaChi?: string }>> = {}
          
          studentsByStop.forEach((stop: any) => {
            const stopKey = `${stop.thuTuDiem}_${stop.maDiem}`
            studentsByStopMap[stopKey] = stop.students.map((s: any) => ({
              maHocSinh: s.maHocSinh,
              hoTen: s.hoTen || s.name,
              lop: s.lop,
              diaChi: s.diaChi || s.address,
            }))
          })
          
          setRouteStudentsByStop(studentsByStopMap)
          
          const totalStudents = Object.values(studentsByStopMap).reduce((sum, students) => sum + students.length, 0)
          if (totalStudents > 0) {
            console.log(`[ScheduleForm] Loaded ${totalStudents} students from existing schedule`)
          }
        })
        .catch((err: any) => {
          console.error("Failed to load schedule students:", err)
          // Nếu không load được từ schedule, thử load từ route
          if (route) {
            console.log("[ScheduleForm] Falling back to load students from route")
          }
        })
    }
  }, [mode, initialSchedule?.id])

  // Populate form when editing or when routeId is provided (wizard mode)
  useEffect(() => {
    if (mode === "edit" && initialSchedule) {
      if (initialSchedule.raw?.ngayChay) {
        const [year, month, day] = initialSchedule.raw.ngayChay.split('-')
        setDate(new Date(parseInt(year), parseInt(month) - 1, parseInt(day)))
      }
      const routeId = String(initialSchedule.routeId || initialSchedule.raw?.maTuyen || initialSchedule.maTuyen || '')
      setRoute(routeId)
      setBus(String(initialSchedule.busId || initialSchedule.raw?.maXe || ''))
      setDriver(String(initialSchedule.driverId || initialSchedule.raw?.maTaiXe || ''))
      const initialTripType = initialSchedule.tripType || initialSchedule.raw?.loaiChuyen || ''
      setTripType(initialTripType)
      // Nếu đã có tripType từ initialSchedule, không tự động điền nữa
      if (initialTripType) {
        setTripTypeAutoFilled(true)
      }
      setStartTime(initialSchedule.startTime || initialSchedule.raw?.gioKhoiHanh || '')
      
      // Ensure route stops are loaded when editing (route might already be set)
      if (routeId) {
        setLoadingStops(true)
        apiClient.getRouteStops(parseInt(routeId))
          .then((res: any) => {
            const stops = (res as any).data || []
            const sortedStops = stops.sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0))
            setRouteStops(sortedStops)
          })
          .catch((err: any) => {
            console.error("Failed to load route stops when editing:", err)
            setRouteStops([])
          })
          .finally(() => setLoadingStops(false))
      }
    } else if (mode === "create" && initialSchedule?.routeId) {
      // Pre-fill routeId in wizard mode
      setRoute(String(initialSchedule.routeId || initialSchedule.maTuyen || ''))
    }
  }, [mode, initialSchedule])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!date || !route || !bus || !driver || !tripType || !startTime) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập đầy đủ thông tin",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmitting(true)
      setConflictError(null) // Clear previous conflicts
      
      // Format date correctly without timezone conversion
      const yyyy = date.getFullYear()
      const mm = `${date.getMonth() + 1}`.padStart(2, '0')
      const dd = `${date.getDate()}`.padStart(2, '0')
      const ngayChay = `${yyyy}-${mm}-${dd}`
      
      // Build students array from routeStudentsByStop (học sinh đã được gán từ route)
      const studentsArray: Array<{ maHocSinh: number; thuTuDiem: number; maDiem: number }> = []
      
      Object.entries(routeStudentsByStop).forEach(([stopKey, students]) => {
        const [sequence, maDiem] = stopKey.split('_').map(Number)
        students.forEach(student => {
          studentsArray.push({
            maHocSinh: student.maHocSinh,
            thuTuDiem: sequence,
            maDiem: maDiem,
          })
        })
      })
      
      console.log("[ScheduleForm] Submitting schedule with students from route:", {
        studentsCount: studentsArray.length,
        students: studentsArray.slice(0, 3),
      })
      
      // Gửi students[] từ route (đã được gán khi tạo route)
      const payload = {
        maTuyen: parseInt(route),
        maXe: parseInt(bus),
        maTaiXe: parseInt(driver),
        loaiChuyen: tripType,
        gioKhoiHanh: startTime,
        ngayChay: ngayChay,
        dangApDung: true,
        students: studentsArray, // Học sinh đã được gán từ route
      }
      
      console.log("[ScheduleForm] Payload:", {
        ...payload,
        students: payload.students ? `${payload.students.length} students` : 'none',
      })
      
      if (mode === "edit" && initialSchedule?.id) {
        const response = await apiClient.updateSchedule(initialSchedule.id, payload)
        toast({ title: "Thành công", description: "Đã cập nhật lịch trình" })
        if (onSaved && response.data) {
          onSaved(response.data)
        }
        onClose()
      } else {
        try {
          const response = await apiClient.createSchedule(payload)
          toast({ title: "Thành công", description: "Đã tạo lịch trình mới" })
          if (onSaved && response.data) {
            onSaved(response.data)
          }
          onClose()
        } catch (createErr: any) {
          // Re-throw conflict errors để wizard có thể handle
          if (createErr?.status === 409 || createErr?.response?.status === 409 || createErr?.conflict) {
            throw createErr
          }
          throw createErr
        }
      }
    } catch (err: any) {
      // M1-M3: Handle 409 conflict with details
      if (err?.status === 409 || err?.response?.status === 409 || err?.conflict) {
        const conflictData = err?.response?.data || err?.data || err
        const conflicts = conflictData.details?.conflicts || conflictData.conflicts || []
        
        setConflictError({
          message: conflictData.message || "Xung đột lịch trình",
          conflicts: conflicts,
        })
        
        toast({
          title: "Xung đột lịch trình",
          description: "Xe buýt hoặc tài xế đã có lịch trình trùng thời gian",
          variant: "destructive",
        })
        
        // Nếu có onSaved callback, không gọi nó khi có conflict
        // Wizard sẽ handle conflict error riêng
      } else if (err?.status === 400 || err?.response?.status === 400) {
        // 🔥 Handle validation errors (INVALID_STUDENT_ASSIGNMENT)
        const errorData = err?.response?.data || err?.data || err
        const validationErrors = errorData?.details?.errors || errorData?.errors || []
        
        if (validationErrors.length > 0) {
          const errorMessages = validationErrors.map((e: any) => e.message || e).join('\n')
          toast({
            title: "Lỗi phân công học sinh",
            description: errorMessages,
            variant: "destructive",
          })
        } else {
          toast({
            title: "Lỗi validation",
            description: errorData?.message || "Dữ liệu không hợp lệ",
            variant: "destructive",
          })
        }
      } else {
        toast({ 
          title: "Không thành công", 
          description: err?.message || (mode === "edit" ? "Cập nhật lịch thất bại" : "Tạo lịch thất bại"), 
          variant: "destructive" 
        })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* M1-M3: Conflict Error Banner */}
      {conflictError && conflictError.conflicts.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Xung đột lịch trình</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-2">{conflictError.message}</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {conflictError.conflicts.map((conflict, idx) => (
                <li key={idx}>
                  {conflict.conflictType === 'bus' && (
                    <>Xe <strong>{conflict.bus}</strong> đã có lịch trình vào {conflict.time} ngày {conflict.date}</>
                  )}
                  {conflict.conflictType === 'driver' && (
                    <>Tài xế <strong>{conflict.driver}</strong> đã có lịch trình vào {conflict.time} ngày {conflict.date}</>
                  )}
                  {conflict.conflictType === 'both' && (
                    <>Xe <strong>{conflict.bus}</strong> và tài xế <strong>{conflict.driver}</strong> đã có lịch trình vào {conflict.time} ngày {conflict.date}</>
                  )}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label>Ngày chạy *</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP", { locale: vi }) : "Chọn ngày"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label htmlFor="route">Tuyến đường *</Label>
        <Select value={route} onValueChange={setRoute}>
          <SelectTrigger id="route">
            <SelectValue placeholder="Chọn tuyến" />
          </SelectTrigger>
          <SelectContent>
            {routes.map((r: any) => (
              <SelectItem key={r.maTuyen || r.id || r._id} value={String(r.maTuyen || r.id || r._id)}>
                {r.tenTuyen || r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="bus">Xe buýt *</Label>
          <Select value={bus} onValueChange={setBus}>
            <SelectTrigger id="bus">
              <SelectValue placeholder="Chọn xe" />
            </SelectTrigger>
            <SelectContent>
              {buses.map((b: any) => (
                <SelectItem key={b.maXe || b.id || b._id} value={String(b.maXe || b.id || b._id)}>
                  {b.bienSoXe || b.plateNumber}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="driver">Tài xế *</Label>
          <Select value={driver} onValueChange={setDriver}>
            <SelectTrigger id="driver">
              <SelectValue placeholder="Chọn tài xế" />
            </SelectTrigger>
            <SelectContent>
              {drivers.map((d: any) => (
                <SelectItem key={d.maTaiXe || d.id || d._id} value={String(d.maTaiXe || d.id || d._id)}>
                  {d.hoTen || d.ten || d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tripType">Loại chuyến *</Label>
        <Select 
          value={tripType} 
          onValueChange={(value) => {
            setTripType(value)
            // Khi user chọn thủ công, đánh dấu là không phải auto-fill nữa
            setTripTypeAutoFilled(false)
          }}
        >
          <SelectTrigger id="tripType">
            <SelectValue placeholder="Chọn loại chuyến (sẽ tự động điền khi chọn tuyến đường)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="don_sang">Đón sáng</SelectItem>
            <SelectItem value="tra_chieu">Trả chiều</SelectItem>
          </SelectContent>
        </Select>
        {tripTypeAutoFilled && tripType && (
          <p className="text-xs text-muted-foreground">
            ℹ️ Đã tự động điền từ tuyến đường. Bạn có thể thay đổi nếu cần.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="startTime">Giờ khởi hành *</Label>
        <Input id="startTime" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
      </div>

      {/* Hiển thị học sinh đã được gán từ tuyến đường */}
      {route && routeStops.length > 0 && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              Học sinh đã được gán từ tuyến đường
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingStops ? (
              <p className="text-sm text-muted-foreground">Đang tải danh sách điểm dừng và học sinh...</p>
            ) : (
              <>
                {routeStops.map((stop: any) => {
                  const stopKey = `${stop.sequence}_${stop.maDiem}`
                  const students = routeStudentsByStop[stopKey] || []

                  return (
                    <div key={`${stop.sequence}_${stop.maDiem}`} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-primary" />
                          <div>
                            <p className="font-medium">
                              Điểm {stop.sequence}: {stop.tenDiem || stop.name}
                            </p>
                            {stop.address && (
                              <p className="text-xs text-muted-foreground">{stop.address}</p>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline">
                          {students.length} học sinh
                        </Badge>
                      </div>

                      {/* Hiển thị học sinh đã được gán */}
                      {students.length > 0 ? (
                        <div className="space-y-2">
                          <Label className="text-sm">Học sinh:</Label>
                          <div className="flex flex-wrap gap-2">
                            {students.map((student) => (
                              <Badge
                                key={student.maHocSinh}
                                variant="secondary"
                                className="flex items-center gap-1"
                              >
                                {student.hoTen}
                                {student.lop && (
                                  <span className="text-xs text-muted-foreground">({student.lop})</span>
                                )}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Chưa có học sinh được gán cho điểm dừng này</p>
                      )}
                    </div>
                  )
                })}
                {Object.values(routeStudentsByStop).reduce((sum, students) => sum + students.length, 0) > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground">
                      Tổng cộng: <strong>{Object.values(routeStudentsByStop).reduce((sum, students) => sum + students.length, 0)}</strong> học sinh đã được gán từ tuyến đường
                    </p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
          Hủy
        </Button>
        <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={submitting}>
          {submitting 
            ? "Đang lưu..." 
            : mode === "edit" 
              ? "Cập nhật lịch trình" 
              : "Tạo lịch trình"}
        </Button>
      </div>
    </form>
  )
}
