"use client"

import { useEffect, useState } from "react"
import { useLanguage } from "@/lib/language-context"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Plus, 
  CalendarIcon, 
  Bus, 
  User, 
  Zap, 
  Search, 
  Edit, 
  Trash2, 
  Eye,
  TrendingUp,
  Clock,
  Route as RouteIcon,
  Filter,
  Download,
  Copy,
  Calendar as CalendarIcon2
} from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { vi } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { ScheduleForm } from "@/components/admin/schedule-form"
import { apiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar } from "@/components/ui/calendar"
import { getScheduleStudents } from "@/lib/services/schedule.service"
import { MapPin, Users } from "lucide-react"

type Schedule = { 
  id: string; 
  date?: string; 
  route?: string; 
  bus?: string; 
  driver?: string; 
  startTime?: string; 
  status?: string; 
  raw?: any 
  routeId?: number;
  busId?: number;
  driverId?: number;
  tripType?: string;
}

export default function SchedulePage() {
  const { t } = useLanguage()
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null)
  const [isStudentsDialogOpen, setIsStudentsDialogOpen] = useState(false)
  const [viewingScheduleId, setViewingScheduleId] = useState<string | number | null>(null)
  const [scheduleStudents, setScheduleStudents] = useState<any>(null)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [allSchedules, setAllSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [autoAssignLoading, setAutoAssignLoading] = useState(false)
  const [autoAssignProgress, setAutoAssignProgress] = useState<{
    current: number
    total: number
    currentDate?: string
  } | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterTripType, setFilterTripType] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [isMobile, setIsMobile] = useState(false)
  // 🔥 Auto-assign improvements: Thêm state cho loại phân công
  const [autoAssignType, setAutoAssignType] = useState<'day' | 'week' | 'month'>('day')
  const [autoAssignStartDate, setAutoAssignStartDate] = useState<Date | undefined>(new Date())
  const { toast } = useToast()

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  function formatDate(d?: Date) {
    if (!d) return ''
    const yyyy = d.getFullYear()
    const mm = `${d.getMonth() + 1}`.padStart(2, '0')
    const dd = `${d.getDate()}`.padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  function mapSchedule(s: any): Schedule {
    return {
      id: String(s.maLichTrinh || s.id || s.maLich || s._id || ''),
      date: s.ngayChay || s.date,
      route: s.tenTuyen || s.route?.tenTuyen || s.routeName || s.route,
      bus: s.bienSoXe || s.bus?.bienSoXe || s.busPlate || s.bus,
      driver: s.tenTaiXe || s.driver?.hoTen || s.driverName || s.driver,
      startTime: s.gioKhoiHanh || s.startTime,
      status: s.dangApDung ? 'active' : 'inactive',
      tripType: s.loaiChuyen,
      raw: s,
      routeId: s.maTuyen,
      busId: s.maXe,
      driverId: s.maTaiXe,
    }
  }

  // Reload schedule list without resetting filters
  async function fetchAllSchedules() {
    setLoading(true)
    setError(null)
    try {
      const res = await apiClient.getSchedules({})
      const data = (res as any).data || []
      const items = Array.isArray(data) ? data : data?.data || []
      const mappedSchedules = items.map(mapSchedule)
      setAllSchedules(mappedSchedules)
      // Note: Filters (searchQuery, filterTripType, filterStatus) are preserved
    } catch (e: any) {
      setError(e?.message || 'Không lấy được lịch trình')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllSchedules()
  }, [])

  // 🔥 Tính toán danh sách ngày cần phân công dựa trên loại
  function getDatesToAssign(type: 'day' | 'week' | 'month', startDate: Date): Date[] {
    const dates: Date[] = []
    const current = new Date(startDate)
    current.setHours(0, 0, 0, 0)

    if (type === 'day') {
      // Chỉ phân công cho ngày được chọn
      dates.push(new Date(current))
    } else if (type === 'week') {
      // Phân công từ ngày hiện tại đến hết tuần (thứ 7)
      // Lưu ý: getDay() trả về 0 = Chủ nhật, 1 = Thứ 2, ..., 6 = Thứ 7
      const dayOfWeek = current.getDay() // 0 = Chủ nhật, 6 = Thứ 7
      let daysUntilSaturday: number
      
      if (dayOfWeek === 0) {
        // Nếu là Chủ nhật, tính đến thứ 7 tuần sau (6 ngày)
        daysUntilSaturday = 6
      } else {
        // Nếu không phải Chủ nhật, tính đến thứ 7 tuần này
        daysUntilSaturday = 6 - dayOfWeek
      }
      
      for (let i = 0; i <= daysUntilSaturday; i++) {
        const date = new Date(current)
        date.setDate(current.getDate() + i)
        dates.push(date)
      }
    } else if (type === 'month') {
      // Phân công từ ngày hiện tại đến hết tháng (ngày 31 hoặc ngày cuối tháng)
      const year = current.getFullYear()
      const month = current.getMonth()
      const lastDayOfMonth = new Date(year, month + 1, 0).getDate() // Ngày cuối cùng của tháng
      const currentDay = current.getDate()
      
      for (let day = currentDay; day <= lastDayOfMonth; day++) {
        const date = new Date(year, month, day)
        dates.push(date)
      }
    }

    return dates
  }

  async function handleAutoAssign() {
    if (!autoAssignStartDate) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn ngày bắt đầu",
        variant: "destructive",
      })
      return
    }

    setAutoAssignLoading(true)
    try {
      // Fetch available resources
      const [routesRes, busesRes, driversRes] = await Promise.all([
        apiClient.getRoutes({ limit: 100 }),
        apiClient.getBuses({ limit: 100 }),
        apiClient.getDrivers({ limit: 100 }),
      ])

      const routes = (routesRes as any).data || (routesRes as any).data?.data || []
      const buses = (busesRes as any).data || (busesRes as any).data?.data || []
      const drivers = (driversRes as any).data || (driversRes as any).data?.data || []

      // Filter only active resources
      const activeBuses = buses.filter((b: any) => b.trangThai === 'hoat_dong')
      const activeDrivers = drivers.filter((d: any) => d.trangThai === 'hoat_dong')

      if (activeBuses.length === 0 || activeDrivers.length === 0 || routes.length === 0) {
        toast({
          title: "Không thể phân công",
          description: "Không đủ xe, tài xế hoặc tuyến đường",
          variant: "destructive",
        })
        return
      }

      // Tính toán danh sách ngày cần phân công
      const datesToAssign = getDatesToAssign(autoAssignType, autoAssignStartDate)
      
      if (datesToAssign.length === 0) {
        toast({
          title: "Lỗi",
          description: "Không có ngày nào để phân công",
          variant: "destructive",
        })
        return
      }

      // Tính tổng số chuyến sẽ tạo (để hiển thị progress)
      const totalSchedulesToCreate = datesToAssign.length * routes.length * 2 // mỗi ngày × mỗi route × 2 chuyến
      setAutoAssignProgress({
        current: 0,
        total: totalSchedulesToCreate,
      })

      // Lấy tất cả schedules đã có để check conflict
      const allSchedulesByDate = new Map<string, Set<number>>() // date -> Set<maXe>
      const allSchedulesByDriverDate = new Map<string, Set<number>>() // date -> Set<maTaiXe>
      
      allSchedules.forEach(s => {
        const scheduleDate = s.date || s.raw?.ngayChay
        if (scheduleDate) {
          if (!allSchedulesByDate.has(scheduleDate)) {
            allSchedulesByDate.set(scheduleDate, new Set())
            allSchedulesByDriverDate.set(scheduleDate, new Set())
          }
          if (s.raw?.maXe) allSchedulesByDate.get(scheduleDate)!.add(s.raw.maXe)
          if (s.raw?.maTaiXe) allSchedulesByDriverDate.get(scheduleDate)!.add(s.raw.maTaiXe)
        }
      })

      const tripTypes = ['don_sang', 'tra_chieu']
      const defaultTimes = ['06:30', '16:30'] // Default departure times
      
      let totalCreated = 0
      let totalFailed = 0
      const errors: string[] = []

      // Phân công cho từng ngày
      for (let dateIdx = 0; dateIdx < datesToAssign.length; dateIdx++) {
        const assignDate = datesToAssign[dateIdx]
        const dateStr = formatDate(assignDate)
        
        // Cập nhật progress
        setAutoAssignProgress({
          current: totalCreated,
          total: totalSchedulesToCreate,
          currentDate: dateStr,
        })
        
        // Lấy resources đã được phân công trong ngày này (từ DB)
        const assignedBusIds = new Set(allSchedulesByDate.get(dateStr) || [])
        const assignedDriverIds = new Set(allSchedulesByDriverDate.get(dateStr) || [])

        // Tìm available resources cho ngày này (chưa được phân công)
        let availableBuses = activeBuses.filter((b: any) => !assignedBusIds.has(b.maXe))
        let availableDrivers = activeDrivers.filter((d: any) => !assignedDriverIds.has(d.maTaiXe))

        if (availableBuses.length === 0 || availableDrivers.length === 0) {
          console.log(`[AutoAssign] Skip date ${dateStr}: No available resources (buses: ${availableBuses.length}, drivers: ${availableDrivers.length})`)
          continue
        }

        // Phân công tất cả routes với cả 2 loại chuyến (don_sang + tra_chieu)
        // Logic: Mỗi route cần 2 chuyến (đón sáng + trả chiều) cho mỗi ngày
        let routeIndex = 0
        for (const route of routes) {
          for (let tripTypeIdx = 0; tripTypeIdx < tripTypes.length; tripTypeIdx++) {
            const tripType = tripTypes[tripTypeIdx]
            const startTime = defaultTimes[tripTypeIdx]

            // Kiểm tra nếu không còn available resources
            if (availableBuses.length === 0 || availableDrivers.length === 0) {
              console.log(`[AutoAssign] Skip route ${route.maTuyen || route.id}, tripType ${tripType}: No available resources`)
              break
            }

            // Tìm bus và driver available (round-robin để phân bổ đều)
            // Sử dụng routeIndex và tripTypeIdx để đảm bảo phân bổ đều
            let resourceIndex = (routeIndex * 2 + tripTypeIdx) % Math.min(availableBuses.length, availableDrivers.length)
            let bus = availableBuses[resourceIndex % availableBuses.length]
            let driver = availableDrivers[resourceIndex % availableDrivers.length]

            // 🔥 Check conflict trước khi tạo schedule
            // Kiểm tra xem bus hoặc driver đã có schedule trong cùng ngày và giờ chưa
            const existingScheduleForBus = allSchedules.find((s: Schedule) => {
              const sDate = s.date || s.raw?.ngayChay
              const sBusId = s.raw?.maXe || s.busId
              const sTime = s.raw?.gioKhoiHanh || s.startTime
              return sDate === dateStr && 
                     sBusId === (bus.maXe || bus.id) &&
                     sTime === startTime
            })
            
            const existingScheduleForDriver = allSchedules.find((s: Schedule) => {
              const sDate = s.date || s.raw?.ngayChay
              const sDriverId = s.raw?.maTaiXe || s.driverId
              const sTime = s.raw?.gioKhoiHanh || s.startTime
              return sDate === dateStr && 
                     sDriverId === (driver.maTaiXe || driver.maNguoiDung || driver.id) &&
                     sTime === startTime
            })

            if (existingScheduleForBus || existingScheduleForDriver) {
              const conflictType = existingScheduleForBus && existingScheduleForDriver 
                ? 'xe và tài xế' 
                : existingScheduleForBus 
                ? 'xe' 
                : 'tài xế'
              
              const errorMsg = `Xung đột lịch trình với ${conflictType}`
              totalFailed++
              errors.push(`Ngày ${dateStr}, Tuyến ${route.tenTuyen || route.maTuyen}, ${tripType === 'don_sang' ? 'Đón sáng' : 'Trả chiều'}: ${errorMsg}`)
              
              console.warn(`[AutoAssign] Skip schedule due to conflict:`, {
                dateStr,
                route: route.tenTuyen || route.maTuyen,
                tripType,
                busId: bus.maXe || bus.id,
                driverId: driver.maTaiXe || driver.maNguoiDung || driver.id,
                conflictType,
              })
              
              // Tìm bus/driver khác available (thử tối đa số lượng available)
              let foundAlternative = false
              const maxAttempts = Math.min(availableBuses.length, availableDrivers.length)
              
              for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                const nextIndex = (resourceIndex + attempt) % Math.min(availableBuses.length, availableDrivers.length)
                const nextBus = availableBuses[nextIndex % availableBuses.length]
                const nextDriver = availableDrivers[nextIndex % availableDrivers.length]
                
                // Check conflict với bus/driver mới
                const nextBusConflict = allSchedules.find((s: Schedule) => {
                  const sDate = s.date || s.raw?.ngayChay
                  const sBusId = s.raw?.maXe || s.busId
                  const sTime = s.raw?.gioKhoiHanh || s.startTime
                  return sDate === dateStr && 
                         sBusId === (nextBus.maXe || nextBus.id) &&
                         sTime === startTime
                })
                
                const nextDriverConflict = allSchedules.find((s: Schedule) => {
                  const sDate = s.date || s.raw?.ngayChay
                  const sDriverId = s.raw?.maTaiXe || s.driverId
                  const sTime = s.raw?.gioKhoiHanh || s.startTime
                  return sDate === dateStr && 
                         sDriverId === (nextDriver.maTaiXe || nextDriver.maNguoiDung || nextDriver.id) &&
                         sTime === startTime
                })
                
                if (!nextBusConflict && !nextDriverConflict) {
                  // Tìm thấy bus/driver không conflict
                  bus = nextBus
                  driver = nextDriver
                  resourceIndex = nextIndex
                  foundAlternative = true
                  break
                }
              }
              
              if (!foundAlternative) {
                // Không tìm thấy resource available, skip route này
                console.warn(`[AutoAssign] No available resources for route ${route.tenTuyen || route.maTuyen}, tripType ${tripType} on ${dateStr}`)
                continue
              }
            }

            try {
              const payload = {
                maTuyen: route.maTuyen || route.id,
                maXe: bus.maXe || bus.id,
                maTaiXe: driver.maTaiXe || driver.maNguoiDung || driver.id,
                loaiChuyen: tripType,
                gioKhoiHanh: startTime,
                ngayChay: dateStr,
                dangApDung: true,
              }

              const createdSchedule = await apiClient.createSchedule(payload)
              totalCreated++
              
              // 🔥 Cập nhật allSchedules ngay lập tức để tránh conflict trong cùng batch
              const newSchedule: Schedule = {
                id: String((createdSchedule as any)?.data?.maLichTrinh || (createdSchedule as any)?.maLichTrinh || totalCreated),
                date: dateStr,
                route: route.tenTuyen || route.maTuyen,
                bus: bus.bienSoXe || bus.plateNumber || String(bus.maXe || bus.id),
                driver: driver.tenTaiXe || driver.hoTen || String(driver.maTaiXe || driver.maNguoiDung || driver.id),
                startTime: startTime,
                tripType: tripType,
                status: 'active',
                routeId: route.maTuyen || route.id,
                busId: bus.maXe || bus.id,
                driverId: driver.maTaiXe || driver.maNguoiDung || driver.id,
                raw: (createdSchedule as any)?.data || createdSchedule,
              }
              allSchedules.push(newSchedule)
              
              // Cập nhật progress
              setAutoAssignProgress({
                current: totalCreated,
                total: totalSchedulesToCreate,
                currentDate: dateStr,
              })
              
              // Cập nhật assigned sets để tránh conflict trong cùng ngày
              assignedBusIds.add(bus.maXe || bus.id)
              assignedDriverIds.add(driver.maTaiXe || driver.maNguoiDung || driver.id)
              
              // 🔥 Throttle: Thêm delay giữa các requests để tránh rate limiting
              // Delay tăng dần: 150ms mỗi request, 300ms mỗi 5 requests, 500ms mỗi 10 requests
              if (totalCreated % 10 === 0) {
                // Delay lâu hơn mỗi 10 requests
                await new Promise(resolve => setTimeout(resolve, 500))
              } else if (totalCreated % 5 === 0) {
                // Delay vừa mỗi 5 requests
                await new Promise(resolve => setTimeout(resolve, 300))
              } else {
                // Delay nhỏ mỗi request
                await new Promise(resolve => setTimeout(resolve, 150))
              }
              
            } catch (err: any) {
              totalFailed++
              
              // 🔥 Cải thiện error handling: Extract error message từ nhiều nguồn
              let errorMessage = 'Lỗi không xác định'
              
              // Thử extract từ nhiều nguồn khác nhau
              if (err?.message) {
                errorMessage = err.message
              } else if (err?.response?.data?.message) {
                errorMessage = err.response.data.message
              } else if (err?.response?.data?.error?.message) {
                errorMessage = err.response.data.error.message
              } else if (err?.response?.data?.error) {
                errorMessage = typeof err.response.data.error === 'string' 
                  ? err.response.data.error 
                  : JSON.stringify(err.response.data.error)
              } else if (err?.response?.data?.errorCode) {
                errorMessage = `Error code: ${err.response.data.errorCode}`
              } else if (err?.code) {
                errorMessage = `Error code: ${err.code}`
              } else if (typeof err === 'string') {
                errorMessage = err
              } else if (err?.error) {
                errorMessage = typeof err.error === 'string' ? err.error : JSON.stringify(err.error)
              } else if (err?.status) {
                errorMessage = `HTTP ${err.status}: ${err.statusText || 'Request failed'}`
              }
              
              // Log toàn bộ error object để debug (chỉ log một lần để tránh spam)
              if (totalFailed === 1) {
                // Tạo một object để log (vì Error objects không stringify tốt)
                const errorDetails: any = {
                  message: err?.message,
                  name: err?.name,
                  stack: err?.stack,
                  status: err?.status,
                  code: err?.code,
                  statusText: err?.statusText,
                  response: err?.response ? {
                    status: err.response.status,
                    statusText: err.response.statusText,
                    data: err.response.data,
                  } : undefined,
                  // Thử stringify với replacer function
                  stringified: (() => {
                    try {
                      return JSON.stringify(err, (key, value) => {
                        // Skip circular references và functions
                        if (typeof value === 'function') return '[Function]'
                        if (value instanceof Error) {
                          return {
                            name: value.name,
                            message: value.message,
                            stack: value.stack,
                          }
                        }
                        return value
                      }, 2)
                    } catch (e) {
                      return `[Cannot stringify: ${e}]`
                    }
                  })(),
                }
                console.error('[AutoAssign] First error details (full error object):', errorDetails)
              }
              
              const errorMsg = `Ngày ${dateStr}, Tuyến ${route.tenTuyen || route.maTuyen}, ${tripType === 'don_sang' ? 'Đón sáng' : 'Trả chiều'}: ${errorMessage}`
              errors.push(errorMsg)
              
              console.error(`[AutoAssign] Failed to create schedule (${totalFailed}/${totalCreated + totalFailed}):`, {
                errorMessage,
                status: err?.status,
                code: err?.code,
                dateStr,
                route: route.tenTuyen || route.maTuyen,
                tripType,
                maTuyen: route.maTuyen || route.id,
                maXe: bus.maXe || bus.id,
                maTaiXe: driver.maTaiXe || driver.maNguoiDung || driver.id,
                responseData: err?.response?.data,
              })
              
              // Nếu lỗi do rate limiting, thêm delay lâu hơn trước khi tiếp tục
              const isRateLimit = errorMessage.includes('Too many requests') || 
                                  errorMessage.includes('rate limit') || 
                                  err?.status === 429 ||
                                  err?.code === 'RATE_LIMIT_EXCEEDED'
              
              if (isRateLimit) {
                const waitTime = 3000 + (totalFailed * 1000) // Exponential backoff: 3s, 4s, 5s...
                console.warn(`[AutoAssign] Rate limit detected, waiting ${waitTime}ms...`)
                await new Promise(resolve => setTimeout(resolve, waitTime))
              }
            }
          }
          routeIndex++
        }
      }

      // Hiển thị kết quả
      if (totalCreated > 0) {
        const typeLabel = autoAssignType === 'day' ? 'ngày' : autoAssignType === 'week' ? 'tuần' : 'tháng'
        const description = totalFailed > 0 && errors.length > 0
          ? `Đã tự động phân công ${totalCreated} lịch trình cho ${typeLabel} (${datesToAssign.length} ngày). ${totalFailed} lỗi xảy ra. Xem console để biết chi tiết.`
          : `Đã tự động phân công ${totalCreated} lịch trình cho ${typeLabel} (${datesToAssign.length} ngày).`
        
        toast({
          title: totalFailed > 0 ? "Thành công một phần" : "Thành công",
          description,
          duration: totalFailed > 0 ? 7000 : 5000,
          variant: totalFailed > 0 ? "default" : "default",
        })
        
        if (totalFailed > 0 && errors.length > 0) {
          console.warn(`[AutoAssign] ${totalFailed} errors occurred:`, errors)
          // Log từng error để dễ debug
          errors.slice(0, 10).forEach((err, idx) => {
            console.warn(`[AutoAssign] Error ${idx + 1}:`, err)
          })
          if (errors.length > 10) {
            console.warn(`[AutoAssign] ... và ${errors.length - 10} lỗi khác`)
          }
        }
        
        fetchAllSchedules()
      } else {
        const description = totalFailed > 0 && errors.length > 0
          ? `Không thể tạo lịch trình tự động. ${totalFailed} lỗi xảy ra. Lỗi đầu tiên: ${errors[0]}. Xem console để biết chi tiết.`
          : `Không thể tạo lịch trình tự động. Có thể tất cả resources đã được phân công.`
        
        toast({
          title: "Không thành công",
          description,
          variant: "destructive",
          duration: 7000,
        })
        
        if (errors.length > 0) {
          console.error(`[AutoAssign] All ${errors.length} errors:`, errors)
        }
      }
    } catch (err: any) {
      // Extract error message từ nhiều nguồn (giống như trong try-catch của từng request)
      let errorMessage = 'Không thể phân công tự động'
      
      if (err?.message) {
        errorMessage = err.message
      } else if (err?.response?.data?.message) {
        errorMessage = err.response.data.message
      } else if (err?.response?.data?.error?.message) {
        errorMessage = err.response.data.error.message
      } else if (err?.response?.data?.error) {
        errorMessage = typeof err.response.data.error === 'string' 
          ? err.response.data.error 
          : JSON.stringify(err.response.data.error)
      } else if (typeof err === 'string') {
        errorMessage = err
      } else if (err?.error) {
        errorMessage = typeof err.error === 'string' ? err.error : JSON.stringify(err.error)
      } else if (err?.status) {
        errorMessage = `HTTP ${err.status}: ${err.statusText || 'Request failed'}`
      }
      
      console.error('[AutoAssign] Fatal error in handleAutoAssign:', {
        error: err,
        errorMessage,
        status: err?.status,
        code: err?.code,
        responseData: err?.response?.data,
        stack: err?.stack,
      })
      
      toast({
        title: "Lỗi",
        description: errorMessage,
        variant: "destructive",
        duration: 7000, // Hiển thị lâu hơn để user đọc được
      })
    } finally {
      setAutoAssignLoading(false)
      setAutoAssignProgress(null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Bạn có chắc chắn muốn xóa lịch trình này?")) return

    try {
      await apiClient.deleteSchedule(id)
      toast({ title: "Thành công", description: "Đã xóa lịch trình" })
      fetchAllSchedules()
    } catch (err: any) {
      toast({
        title: "Lỗi",
        description: err?.message || "Không thể xóa lịch trình",
        variant: "destructive",
      })
    }
  }

  async function handleDuplicate(schedule: Schedule) {
    try {
      const payload = {
        maTuyen: schedule.routeId,
        maXe: schedule.busId,
        maTaiXe: schedule.driverId,
        loaiChuyen: schedule.tripType,
        gioKhoiHanh: schedule.startTime,
        ngayChay: schedule.date,
        dangApDung: true,
      }
      await apiClient.createSchedule(payload)
      toast({ title: "Thành công", description: "Đã sao chép lịch trình" })
      fetchAllSchedules()
    } catch (err: any) {
      toast({
        title: "Lỗi",
        description: err?.message || "Không thể sao chép lịch trình",
        variant: "destructive",
      })
    }
  }

  async function handleViewStudents(scheduleId: string | number) {
    setViewingScheduleId(scheduleId)
    setIsStudentsDialogOpen(true)
    setLoadingStudents(true)
    try {
      const data = await getScheduleStudents(scheduleId)
      setScheduleStudents(data)
    } catch (err: any) {
      toast({
        title: "Lỗi",
        description: err?.message || "Không thể tải danh sách học sinh",
        variant: "destructive",
      })
      setScheduleStudents(null)
    } finally {
      setLoadingStudents(false)
    }
  }
  
  const selectedDateStr = formatDate(date)
  const todaysSchedules = allSchedules.filter(s => {
    // Check both date field and raw.ngayChay
    const scheduleDate = s.date || s.raw?.ngayChay || ''
    return scheduleDate === selectedDateStr
  })

  // Filter and search
  const filteredSchedules = allSchedules.filter(schedule => {
    const matchesSearch = !searchQuery || 
      schedule.route?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      schedule.bus?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      schedule.driver?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesTripType = filterTripType === 'all' || schedule.tripType === filterTripType
    const matchesStatus = filterStatus === 'all' || schedule.status === filterStatus
    
    return matchesSearch && matchesTripType && matchesStatus
  })

  // Statistics
  const stats = {
    total: allSchedules.length,
    active: allSchedules.filter(s => s.status === 'active').length,
    morning: allSchedules.filter(s => s.tripType === 'don_sang').length,
    afternoon: allSchedules.filter(s => s.tripType === 'tra_chieu').length,
    today: todaysSchedules.length,
  }

  return (
    <DashboardLayout sidebar={<AdminSidebar />}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t("schedule.title")}</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">{t("schedule.description")}</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">{t("schedule.addNew")}</span>
                <span className="sm:hidden">{t("schedule.addNew")}</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl sm:text-2xl">{t("schedule.addNew")}</DialogTitle>
                <DialogDescription className="text-sm sm:text-base">{t("schedule.description")}</DialogDescription>
              </DialogHeader>
              <ScheduleForm onClose={() => {
                setIsAddDialogOpen(false)
                fetchAllSchedules()
              }} />
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
          <Card className="border-border/50">
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground">{t("schedule.total")}</p>
                  <p className="text-xl sm:text-2xl font-bold">{stats.total}</p>
                </div>
                <RouteIcon className="w-6 h-6 sm:w-8 sm:h-8 text-primary opacity-20 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground">{t("schedule.applied")}</p>
                  <p className="text-xl sm:text-2xl font-bold text-success">{stats.active}</p>
                </div>
                <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-success opacity-20 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground">{t("schedule.morningPickup")}</p>
                  <p className="text-xl sm:text-2xl font-bold text-warning">{stats.morning}</p>
                </div>
                <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-warning opacity-20 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground">{t("schedule.afternoonDropoff")}</p>
                  <p className="text-xl sm:text-2xl font-bold text-primary">{stats.afternoon}</p>
                </div>
                <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-primary opacity-20 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 col-span-2 md:col-span-1">
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground">{t("schedule.today")}</p>
                  <p className="text-xl sm:text-2xl font-bold">{stats.today}</p>
                </div>
                <CalendarIcon className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground opacity-20 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Quick Actions */}
        <Card className="border-border/50">
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t("schedule.search")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={filterTripType} onValueChange={setFilterTripType}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Loại chuyến" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("schedule.all")}</SelectItem>
                    <SelectItem value="don_sang">{t("schedule.morningPickup")}</SelectItem>
                    <SelectItem value="tra_chieu">{t("schedule.afternoonDropoff")}</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder={t("common.status")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("schedule.all")}</SelectItem>
                    <SelectItem value="active">{t("schedule.applied")}</SelectItem>
                    <SelectItem value="inactive">{t("common.inactive")}</SelectItem>
                  </SelectContent>
                </Select>

                {(filterTripType !== 'all' || filterStatus !== 'all' || searchQuery) && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setFilterTripType('all')
                      setFilterStatus('all')
                      setSearchQuery('')
                    }}
                    className="w-full sm:w-auto"
                    title={t("common.filter")}
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    {t("common.filter")}
                  </Button>
                )}

                <Button variant="outline" onClick={fetchAllSchedules} className="w-full sm:w-auto">
                  {t("schedule.reload")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="table" className="space-y-4">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="table" className="flex-1 sm:flex-none">{t("schedule.viewTable")}</TabsTrigger>
            <TabsTrigger value="calendar" className="flex-1 sm:flex-none">{t("schedule.viewCalendar")}</TabsTrigger>
          </TabsList>

          <TabsContent value="table" className="space-y-4">
            <Card className="border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{t("schedule.list")}</CardTitle>
                  <div className="flex gap-2">
                    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="text-xl sm:text-2xl">Chỉnh sửa lịch trình</DialogTitle>
                          <DialogDescription className="text-sm sm:text-base">Cập nhật thông tin lịch trình</DialogDescription>
                        </DialogHeader>
                        {editingSchedule && (
                          <ScheduleForm 
                            mode="edit" 
                            initialSchedule={editingSchedule}
                            onClose={() => {
                              setIsEditDialogOpen(false)
                              setEditingSchedule(null)
                              fetchAllSchedules()
                            }} 
                          />
                        )}
                      </DialogContent>
                    </Dialog>
                    
                    {/* Students Dialog */}
                    <Dialog open={isStudentsDialogOpen} onOpenChange={setIsStudentsDialogOpen}>
                      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="text-xl sm:text-2xl flex items-center gap-2">
                            <Users className="w-5 h-5" />
                            Danh sách học sinh
                          </DialogTitle>
                          <DialogDescription className="text-sm sm:text-base">
                            Học sinh được phân công vào các điểm dừng của lịch trình
                          </DialogDescription>
                        </DialogHeader>
                        {loadingStudents ? (
                          <div className="py-8 text-center text-muted-foreground">
                            Đang tải danh sách học sinh...
                          </div>
                        ) : scheduleStudents && scheduleStudents.studentsByStop?.length > 0 ? (
                          <div className="space-y-4">
                            <div className="text-sm text-muted-foreground">
                              Tổng cộng: <strong>{scheduleStudents.totalStudents}</strong> học sinh
                            </div>
                            {scheduleStudents.studentsByStop.map((stop: any, idx: number) => (
                              <Card key={idx} className="border-border/50">
                                <CardHeader className="pb-3">
                                  <CardTitle className="text-base flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-primary" />
                                    Điểm {stop.thuTuDiem}: {stop.tenDiem}
                                  </CardTitle>
                                  {stop.stopAddress && (
                                    <p className="text-xs text-muted-foreground mt-1">{stop.stopAddress}</p>
                                  )}
                                </CardHeader>
                                <CardContent>
                                  {stop.students.length > 0 ? (
                                    <div className="space-y-2">
                                      {stop.students.map((student: any, sIdx: number) => (
                                        <div key={sIdx} className="flex items-center justify-between p-2 border rounded">
                                          <div>
                                            <p className="font-medium text-sm">{student.hoTen}</p>
                                            {student.lop && (
                                              <p className="text-xs text-muted-foreground">Lớp: {student.lop}</p>
                                            )}
                                            {student.diaChi && (
                                              <p className="text-xs text-muted-foreground">{student.diaChi}</p>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-muted-foreground">Chưa có học sinh</p>
                                  )}
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <div className="py-8 text-center text-muted-foreground">
                            Chưa có học sinh nào được phân công
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading && (
                  <div className="py-8 text-center text-muted-foreground">
                    Đang tải lịch trình...
                  </div>
                )}
                {error && (
                  <div className="py-8 text-center text-destructive">{error}</div>
                )}
                {!loading && !error && filteredSchedules.length === 0 && (
                  <div className="py-8 text-center text-muted-foreground">
                    Không có lịch trình nào
                  </div>
                )}
                {!loading && !error && filteredSchedules.length > 0 && (
                  <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Ngày chạy</TableHead>
                            <TableHead>Giờ khởi hành</TableHead>
                            <TableHead>Tuyến đường</TableHead>
                            <TableHead>Loại chuyến</TableHead>
                            <TableHead>Xe buýt</TableHead>
                            <TableHead>Tài xế</TableHead>
                            <TableHead>Trạng thái</TableHead>
                            <TableHead className="text-right">Thao tác</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredSchedules.map((schedule) => (
                            <TableRow key={schedule.id}>
                              <TableCell className="font-medium">
                                {schedule.date ? new Date(schedule.date).toLocaleDateString('vi-VN') : '-'}
                              </TableCell>
                              <TableCell>{schedule.startTime || '-'}</TableCell>
                              <TableCell>{schedule.route || '-'}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={
                                  schedule.tripType === 'don_sang' 
                                    ? 'border-warning text-warning' 
                                    : 'border-primary text-primary'
                                }>
                                  {schedule.tripType === 'don_sang' ? t("schedule.morningPickup") : schedule.tripType === 'tra_chieu' ? t("schedule.afternoonDropoff") : '-'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Bus className="w-4 h-4 text-primary" />
                                  {schedule.bus || '-'}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-success" />
                                  {schedule.driver || '-'}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={schedule.status === 'active' ? 'default' : 'secondary'}>
                                  {schedule.status === 'active' ? t("schedule.applied") : t("common.inactive")}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => handleDuplicate(schedule)}
                                    title="Sao chép"
                                  >
                                    <Copy className="w-4 h-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => handleViewStudents(schedule.id)}
                                    title="Xem học sinh"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => {
                                      setEditingSchedule(schedule)
                                      setIsEditDialogOpen(true)
                                    }}
                                    title="Chỉnh sửa"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => handleDelete(schedule.id)}
                                    title="Xóa"
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-3">
                      {filteredSchedules.map((schedule) => (
                        <Card key={schedule.id} className="border-border/50 hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-primary" />
                                  <h4 className="font-medium text-foreground">{schedule.route}</h4>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {schedule.date ? new Date(schedule.date).toLocaleDateString('vi-VN') : '-'} • {schedule.startTime}
                                </p>
                              </div>
                              <Badge variant="outline" className={
                                schedule.tripType === 'don_sang' 
                                  ? 'border-warning text-warning' 
                                  : 'border-primary text-primary'
                              }>
                                {schedule.tripType === 'don_sang' ? 'Đón sáng' : schedule.tripType === 'tra_chieu' ? 'Trả chiều' : '-'}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-3">
                              <div className="flex items-center gap-2 text-sm">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                  <Bus className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                  <p className="text-muted-foreground text-xs">Xe buýt</p>
                                  <p className="font-medium">{schedule.bus}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 text-sm">
                                <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                                  <User className="w-4 h-4 text-success" />
                                </div>
                                <div>
                                  <p className="text-muted-foreground text-xs">Tài xế</p>
                                  <p className="font-medium">{schedule.driver}</p>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t">
                              <Badge variant={schedule.status === 'active' ? 'default' : 'secondary'}>
                                {schedule.status === 'active' ? 'Đang áp dụng' : 'Không áp dụng'}
                              </Badge>
                              <div className="flex gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleDuplicate(schedule)}
                                  title="Sao chép"
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleViewStudents(schedule.id)}
                                  title="Xem học sinh"
                                >
                                  <Eye className="w-3 h-3" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => {
                                    setEditingSchedule(schedule)
                                    setIsEditDialogOpen(true)
                                  }}
                                  title="Chỉnh sửa"
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => handleDelete(schedule.id)}
                                  title="Xóa"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calendar" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Calendar */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5" />
                    Lịch
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Calendar mode="single" selected={date} onSelect={setDate} className="rounded-md border-0" />
                </CardContent>
              </Card>

              {/* Today's Schedules */}
              <div className="lg:col-span-3 space-y-4">
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle>Lịch trình ngày {date?.toLocaleDateString("vi-VN")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {loading && <div className="py-8 text-center text-muted-foreground">Đang tải...</div>}
                    {error && <div className="py-8 text-center text-destructive">{error}</div>}
                    {!loading && !error && todaysSchedules.length === 0 && (
                      <div className="py-8 text-center text-muted-foreground">
                        {t("schedule.noSchedules")}
                      </div>
                    )}
                    {!loading && !error && todaysSchedules.map((schedule) => (
                      <Card key={schedule.id} className="border-border/50 hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-primary" />
                                <h4 className="font-medium text-foreground">{schedule.route}</h4>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                Khởi hành: {schedule.startTime}
                              </p>
                            </div>
                            <Badge variant="outline" className={
                              schedule.tripType === 'don_sang' 
                                ? 'border-warning text-warning' 
                                : 'border-primary text-primary'
                            }>
                              {schedule.tripType === 'don_sang' ? t("schedule.morningPickup") : t("schedule.afternoonDropoff")}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-2 text-sm">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Bus className="w-4 h-4 text-primary" />
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs">Xe buýt</p>
                                <p className="font-medium">{schedule.bus}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 text-sm">
                              <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                                <User className="w-4 h-4 text-success" />
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs">Tài xế</p>
                                <p className="font-medium">{schedule.driver}</p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </CardContent>
                </Card>

                {/* Quick Assignment */}
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="w-5 h-5" />
                      Phân công tự động
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* 🔥 Cải tiến: Chọn loại phân công */}
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Loại phân công</label>
                          <Select value={autoAssignType} onValueChange={(value: 'day' | 'week' | 'month') => setAutoAssignType(value)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="day">Theo ngày</SelectItem>
                              <SelectItem value="week">Theo tuần (đến thứ 7)</SelectItem>
                              <SelectItem value="month">Theo tháng (đến cuối tháng)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Ngày bắt đầu</label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !autoAssignStartDate && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon2 className="mr-2 h-4 w-4" />
                                {autoAssignStartDate ? (
                                  format(autoAssignStartDate, "PPP", { locale: vi })
                                ) : (
                                  <span>Chọn ngày</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar mode="single" selected={autoAssignStartDate} onSelect={setAutoAssignStartDate} initialFocus />
                            </PopoverContent>
                          </Popover>
                        </div>

                        {/* Preview số ngày sẽ phân công */}
                        {autoAssignStartDate && (
                          <div className="p-3 bg-muted/50 rounded-md">
                            <p className="text-xs text-muted-foreground">
                              Sẽ phân công cho: <strong className="text-foreground">
                                {(() => {
                                  const dates = getDatesToAssign(autoAssignType, autoAssignStartDate)
                                  if (dates.length === 1) {
                                    return `1 ngày (${format(dates[0], "dd/MM/yyyy", { locale: vi })})`
                                  } else if (dates.length > 1) {
                                    return `${dates.length} ngày (${format(dates[0], "dd/MM/yyyy", { locale: vi })} - ${format(dates[dates.length - 1], "dd/MM/yyyy", { locale: vi })})`
                                  }
                                  return "0 ngày"
                                })()}
                              </strong>
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Mỗi ngày: Tất cả tuyến × 2 chuyến (đón sáng + trả chiều)
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => setIsAddDialogOpen(true)}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Tạo lịch trình thủ công
                        </Button>
                        <Button 
                          className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                          onClick={handleAutoAssign}
                          disabled={autoAssignLoading || !autoAssignStartDate}
                        >
                          {autoAssignLoading ? (
                            <>
                              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                              Đang phân công...
                            </>
                          ) : (
                            <>
                              <Zap className="w-4 h-4 mr-2" />
                              Phân công tự động
                            </>
                          )}
                        </Button>
                        
                        {/* 🔥 Progress indicator */}
                        {autoAssignProgress && (
                          <div className="mt-3 space-y-2">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>
                                {autoAssignProgress.currentDate && (
                                  <>Đang xử lý: {format(new Date(autoAssignProgress.currentDate), "dd/MM/yyyy", { locale: vi })}</>
                                )}
                              </span>
                              <span>
                                {autoAssignProgress.current} / {autoAssignProgress.total}
                              </span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div 
                                className="bg-primary h-2 rounded-full transition-all duration-300"
                                style={{ 
                                  width: `${Math.min(100, (autoAssignProgress.current / autoAssignProgress.total) * 100)}%` 
                                }}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground text-center">
                              {Math.round((autoAssignProgress.current / autoAssignProgress.total) * 100)}% hoàn thành
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
