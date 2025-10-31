"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { vi } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { apiClient } from "@/lib/api"

interface ScheduleFormProps {
  onClose: () => void
}

export function ScheduleForm({ onClose }: ScheduleFormProps) {
  const [date, setDate] = useState<Date>()
  const [route, setRoute] = useState("")
  const [bus, setBus] = useState("")
  const [driver, setDriver] = useState("")
  const [startTime, setStartTime] = useState("")
  const [routes, setRoutes] = useState<any[]>([])
  const [buses, setBuses] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!date || !route || !bus || !driver || !startTime) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập đầy đủ thông tin",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmitting(true)
      const payload = {
        ngayChay: date.toISOString().slice(0, 10),
        gioKhoiHanh: startTime,
        maTuyen: route,
        maXe: bus,
        maTaiXe: driver,
        trangThai: 'da_len_lich',
      }
      await apiClient.createSchedule(payload)
      toast({ title: "Thành công", description: "Đã tạo lịch trình mới" })
      onClose()
    } catch (err: any) {
      toast({ title: "Không thành công", description: err?.message || "Tạo lịch thất bại", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Ngày *</Label>
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
        <Label htmlFor="startTime">Giờ khởi hành *</Label>
        <Input id="startTime" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
          Hủy
        </Button>
        <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={submitting}>
          {submitting ? "Đang lưu..." : "Tạo lịch trình"}
        </Button>
      </div>
    </form>
  )
}
