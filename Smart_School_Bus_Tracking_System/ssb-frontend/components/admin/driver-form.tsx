"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { apiClient } from "@/lib/api"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon, Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"

export type Driver = {
  id?: string
  name: string
  email?: string
  phone?: string
  license?: string
  licenseExpiry?: string
  experience?: number
  status?: string
  password?: string
}

interface DriverFormProps {
  onClose: () => void
  onCreated?: (driver?: Driver) => void
  mode?: "create" | "edit"
  initial?: Driver & { raw?: any }
}

export function DriverForm({ onClose, onCreated, mode = "create", initial }: DriverFormProps) {
  const [name, setName] = useState(initial?.name || "")
  const [email, setEmail] = useState(initial?.email || "")
  const [phone, setPhone] = useState(initial?.phone || "")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [license, setLicense] = useState(initial?.license || "")
  const [licenseExpiry, setLicenseExpiry] = useState<Date | undefined>(
    initial?.licenseExpiry ? new Date(initial.licenseExpiry) : undefined
  )
  const [experience, setExperience] = useState(initial?.experience?.toString() || "0")
  const [status, setStatus] = useState(initial?.status || "hoat_dong")
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!name || !phone || !email) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập Họ tên, Email và Số điện thoại",
        variant: "destructive",
      })
      return
    }

    if (mode === "create" && !password) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập mật khẩu cho tài khoản tài xế",
        variant: "destructive",
      })
      return
    }

    if (!license) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập số bằng lái",
        variant: "destructive",
      })
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast({
        title: "Lỗi",
        description: "Email không hợp lệ",
        variant: "destructive",
      })
      return
    }

    // Validate phone format
    const phoneRegex = /^[0-9]{10,11}$/
    if (!phoneRegex.test(phone)) {
      toast({
        title: "Lỗi",
        description: "Số điện thoại phải có 10-11 chữ số",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmitting(true)

      const driverData: any = {
        hoTen: name.trim(),
        email: email.trim(),
        soDienThoai: phone.trim(),
        soBangLai: license.trim(),
        soNamKinhNghiem: parseInt(experience) || 0,
        trangThai: status,
      }

      if (licenseExpiry) {
        driverData.ngayHetHanBangLai = format(licenseExpiry, "yyyy-MM-dd")
      }

      if (mode === "create") {
        driverData.matKhau = password
        driverData.vaiTro = "tai_xe"
      }

      if (mode === "edit" && initial?.id) {
        const res = await apiClient.updateDriver(initial.id, driverData)
        if ((res as any)?.success === false) throw new Error((res as any)?.message || "Cập nhật thất bại")
        toast({
          title: "Thành công",
          description: "Đã cập nhật thông tin tài xế",
        })
        onCreated?.()
      } else {
        const res = await apiClient.createDriver(driverData)
        if ((res as any)?.success === false) throw new Error((res as any)?.message || "Tạo mới thất bại")
        toast({
          title: "Thành công",
          description: "Đã thêm tài xế mới và tạo tài khoản",
        })
        onCreated?.()
      }
      onClose()
    } catch (err: any) {
      const msg =
        err?.message || (err?.status === 409 ? "Email hoặc số bằng lái đã tồn tại trong hệ thống" : "Thao tác thất bại")
      toast({
        title: "Không thành công",
        description: msg,
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Thông tin tài khoản */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground border-b pb-2">Thông tin tài khoản</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">
              Họ và tên <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Nguyễn Văn A"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="taixe@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">
              Số điện thoại <span className="text-destructive">*</span>
            </Label>
            <Input
              id="phone"
              placeholder="0901234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          {mode === "create" && (
            <div className="space-y-2">
              <Label htmlFor="password">
                Mật khẩu <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Mật khẩu sẽ được sử dụng để đăng nhập</p>
            </div>
          )}
        </div>
      </div>

      {/* Thông tin tài xế */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground border-b pb-2">Thông tin tài xế</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="license">
              Số bằng lái <span className="text-destructive">*</span>
            </Label>
            <Input
              id="license"
              placeholder="A1234567"
              value={license}
              onChange={(e) => setLicense(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Ngày hết hạn bằng lái</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !licenseExpiry && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {licenseExpiry ? format(licenseExpiry, "dd/MM/yyyy") : "Chọn ngày"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={licenseExpiry}
                  onSelect={setLicenseExpiry}
                  disabled={(date) => {
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)
                    return date < today
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="experience">Số năm kinh nghiệm</Label>
            <Input
              id="experience"
              type="number"
              min="0"
              max="50"
              placeholder="0"
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Trạng thái</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hoat_dong">Đang làm việc</SelectItem>
                <SelectItem value="tam_nghi">Tạm nghỉ</SelectItem>
                <SelectItem value="nghi_huu">Nghỉ hưu</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
          Hủy
        </Button>
        <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={submitting}>
          {submitting ? "Đang lưu..." : mode === "edit" ? "Cập nhật" : "Thêm tài xế"}
        </Button>
      </div>
    </form>
  )
}
