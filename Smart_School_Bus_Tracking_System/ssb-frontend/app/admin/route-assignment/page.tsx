"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, ArrowRight, CheckCircle2, MapPin, Clock, Users, AlertTriangle } from "lucide-react"
import { format } from "date-fns"
import { vi } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { apiClient } from "@/lib/api"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { RouteBuilder } from "@/components/admin/route-builder"
import { ScheduleForm } from "@/components/admin/schedule-form"

type Step = 1 | 2 | 3

interface ConflictDetail {
  scheduleId: number
  conflictType: 'bus' | 'driver' | 'both'
  bus: string
  driver: string
  time: string
  date: string
}

export default function RouteAssignmentPage() {
  const [step, setStep] = useState<Step>(1)
  const [routeId, setRouteId] = useState<number | null>(null)
  const [scheduleId, setScheduleId] = useState<number | null>(null)
  const [tripId, setTripId] = useState<number | null>(null)
  const [conflictError, setConflictError] = useState<{
    message: string
    conflicts: ConflictDetail[]
  } | null>(null)
  const { toast } = useToast()

  // Step 1: Route & Stops
  const [routeName, setRouteName] = useState("")
  const [routeCreated, setRouteCreated] = useState(false)

  // Step 2: Schedule
  const [scheduleCreated, setScheduleCreated] = useState(false)

  // Step 3: Trip
  const [tripCreated, setTripCreated] = useState(false)

  const handleRouteSaved = (route: any) => {
    setRouteId(route.maTuyen || route.id)
    setRouteCreated(true)
    toast({
      title: "Thành công",
      description: "Đã tạo tuyến đường và điểm dừng",
    })
  }

  const handleScheduleSaved = (schedule: any) => {
    setScheduleId(schedule.maLichTrinh || schedule.id)
    setScheduleCreated(true)
    setConflictError(null)
  }

  const handleCreateTrip = async () => {
    if (!scheduleId) {
      toast({
        title: "Lỗi",
        description: "Chưa có lịch trình",
        variant: "destructive",
      })
      return
    }

    try {
      const today = new Date().toISOString().split("T")[0]
      const response = await apiClient.createTrip({
        maLichTrinh: scheduleId,
        ngayChay: today,
        trangThai: "chua_khoi_hanh",
        ghiChu: "Tạo từ wizard Route Assignment",
      })

      if (response.success && response.data) {
        const trip = response.data as any
        setTripId(trip.maChuyen || trip.id)
        setTripCreated(true)
        toast({
          title: "Thành công",
          description: "Đã tạo chuyến đi",
        })
      }
    } catch (err: any) {
      toast({
        title: "Lỗi",
        description: err?.message || "Không thể tạo chuyến đi",
        variant: "destructive",
      })
    }
  }

  const handleNext = () => {
    if (step === 1 && routeCreated) {
      setStep(2)
    } else if (step === 2 && scheduleCreated) {
      setStep(3)
    }
  }

  const handleBack = () => {
    if (step === 2) {
      setStep(1)
    } else if (step === 3) {
      setStep(2)
    }
  }

  return (
    <DashboardLayout sidebar={<AdminSidebar />}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Phân công tuyến đường</h1>
          <p className="text-muted-foreground mt-1">Tạo tuyến → Lịch trình → Chuyến đi</p>
        </div>

        {/* Progress Steps */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <div className={cn("flex items-center gap-2", step >= 1 && "text-primary")}>
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center border-2",
                    step >= 1 ? "bg-primary text-primary-foreground border-primary" : "border-muted"
                  )}>
                    {step > 1 ? <CheckCircle2 className="w-5 h-5" /> : "1"}
                  </div>
                  <span className="font-medium">Tuyến & Điểm dừng</span>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
                <div className={cn("flex items-center gap-2", step >= 2 && "text-primary")}>
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center border-2",
                    step >= 2 ? "bg-primary text-primary-foreground border-primary" : "border-muted"
                  )}>
                    {step > 2 ? <CheckCircle2 className="w-5 h-5" /> : "2"}
                  </div>
                  <span className="font-medium">Lịch trình</span>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
                <div className={cn("flex items-center gap-2", step >= 3 && "text-primary")}>
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center border-2",
                    step >= 3 ? "bg-primary text-primary-foreground border-primary" : "border-muted"
                  )}>
                    {step > 3 ? <CheckCircle2 className="w-5 h-5" /> : "3"}
                  </div>
                  <span className="font-medium">Chuyến đi</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 1: Route & Stops */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Bước 1: Tạo tuyến đường và điểm dừng
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RouteBuilder
                mode="create"
                onClose={() => {}}
                onSaved={handleRouteSaved}
              />
              {routeCreated && (
                <div className="mt-4 flex justify-end">
                  <Button onClick={handleNext}>
                    Tiếp theo: Lịch trình
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Schedule */}
        {step === 2 && routeId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Bước 2: Tạo lịch trình
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScheduleForm
                mode="create"
                initialSchedule={{ routeId, maTuyen: routeId }}
                onClose={() => {}}
                onSaved={handleScheduleSaved}
              />
              <div className="mt-4 flex justify-between">
                <Button variant="outline" onClick={handleBack}>
                  Quay lại
                </Button>
                {scheduleCreated && (
                  <Button onClick={handleNext}>
                    Tiếp theo: Chuyến đi
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Trip */}
        {step === 3 && scheduleId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Bước 3: Tạo chuyến đi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Lịch trình đã tạo:</p>
                  <Badge variant="outline">ID: {scheduleId}</Badge>
                </div>
                <div className="flex justify-between">
                  <Button variant="outline" onClick={handleBack}>
                    Quay lại
                  </Button>
                  {!tripCreated ? (
                    <Button onClick={handleCreateTrip}>
                      Tạo chuyến đi
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <Alert>
                        <CheckCircle2 className="h-4 w-4" />
                        <AlertTitle>Đã tạo chuyến đi thành công!</AlertTitle>
                        <AlertDescription>
                          <p className="mt-2">Chuyến đi ID: <strong>{tripId}</strong></p>
                          <p className="text-sm text-muted-foreground mt-2">
                            Tài xế có thể bắt đầu chuyến đi từ ứng dụng driver.
                          </p>
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}

