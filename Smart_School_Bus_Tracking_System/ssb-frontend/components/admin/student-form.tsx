"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { apiClient } from "@/lib/api"
import { MapPin, Phone, Mail, User, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { useDebounce } from "@/lib/hooks/useDebounce"

type Student = any

interface StudentFormProps {
  onClose: () => void
  onCreated?: (student: Student) => void
  onUpdated?: (student: Student) => void
  mode?: "create" | "edit"
  initial?: Partial<Student> & { id?: string | number }
}

type ParentInfo = {
  maNguoiDung?: number
  hoTen?: string
  email?: string
  soDienThoai?: string
}

// Format ngày sinh cho input type="date" (YYYY-MM-DD)
function formatDateForInput(dateValue: any): string {
  if (!dateValue) return ""
  if (typeof dateValue === "string") {
    // Nếu đã là format YYYY-MM-DD, trả về luôn
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return dateValue
    }
    // Thử parse từ các format khác
    const date = new Date(dateValue)
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    // Nếu không parse được, thử lấy phần đầu (YYYY-MM-DD) từ string
    const dateStr = dateValue.split('T')[0].split(' ')[0]
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr
    }
  }
  return ""
}

export function StudentForm({ onClose, onCreated, onUpdated, mode = "create", initial }: StudentFormProps) {

  const [studentName, setStudentName] = useState(String((initial as any)?.hoTen || (initial as any)?.name || ""))
  const [birthDate, setBirthDate] = useState(formatDateForInput((initial as any)?.ngaySinh || (initial as any)?.birthDate))
  const [grade, setGrade] = useState(String((initial as any)?.lop || (initial as any)?.grade || ""))
  const [address, setAddress] = useState(String((initial as any)?.diaChi || (initial as any)?.address || ""))
  
  // Parent fields - SĐT là bắt buộc nhập trước
  const [parentPhone, setParentPhone] = useState(String((initial as any)?.sdtPhuHuynh || (initial as any)?.parentPhone || ""))
  const [parentName, setParentName] = useState(String((initial as any)?.tenPhuHuynh || (initial as any)?.parentName || ""))
  const [parentEmail, setParentEmail] = useState(String((initial as any)?.emailPhuHuynh || (initial as any)?.parentEmail || ""))
  
  // State for phone checking
  const [checkingPhone, setCheckingPhone] = useState(false)
  const [foundParent, setFoundParent] = useState<ParentInfo | null>(null)
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [useExistingParent, setUseExistingParent] = useState(false)
  
  // State for dialogs
  const [showCreateConfirm, setShowCreateConfirm] = useState(false)
  const [showEditConfirm, setShowEditConfirm] = useState(false)
  const [originalParentId, setOriginalParentId] = useState<number | null>(null)
  const [originalParentPhone, setOriginalParentPhone] = useState<string | null>(null)
  
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()
  
  const debouncedPhone = useDebounce(parentPhone, 500)

  // Check phone when it changes (only if not in edit mode with existing parent)
  useEffect(() => {
    if (debouncedPhone && debouncedPhone.length >= 10) {
      checkPhoneNumber(debouncedPhone)
    } else if (debouncedPhone && debouncedPhone.length > 0 && debouncedPhone.length < 10) {
      setPhoneError("Số điện thoại phải có ít nhất 10 chữ số")
      setFoundParent(null)
    } else {
      setPhoneError(null)
      setFoundParent(null)
      setUseExistingParent(false)
    }
  }, [debouncedPhone])

  // Load initial parent info if editing
  useEffect(() => {
    if (mode === "edit" && initial?.id) {
      const initialPhone = (initial as any).sdtPhuHuynh || (initial as any).parentPhone || ""
      setOriginalParentPhone(initialPhone)
      if ((initial as any).maPhuHuynh) {
        setOriginalParentId((initial as any).maPhuHuynh)
      }
      if (initialPhone) {
        checkPhoneNumber(initialPhone)
      }
      
      // Cập nhật lại ngày sinh khi initial thay đổi (để đảm bảo format đúng)
      const formattedDate = formatDateForInput((initial as any)?.ngaySinh || (initial as any)?.birthDate)
      if (formattedDate) {
        setBirthDate(formattedDate)
      }
    }
  }, [mode, initial])

  async function checkPhoneNumber(phone: string) {
    if (!phone || phone.length < 10) {
      setFoundParent(null)
      return
    }

    setCheckingPhone(true)
    setPhoneError(null)
    
    try {
      const res = await apiClient.findParentByPhone(phone)
      const response = res as any
      
      if (response.success && response.data) {
        // Tìm thấy phụ huynh
        setFoundParent(response.data)
        setUseExistingParent(true)
        // Tự động điền thông tin
        setParentName(response.data.hoTen || "")
        setParentEmail(response.data.email || "")
        setPhoneError(null)
        
        // Nếu đang chỉnh sửa và tìm thấy cùng phụ huynh, không cần cảnh báo
        if (mode === "edit" && originalParentId && response.data.maNguoiDung === originalParentId) {
          // Cùng phụ huynh, không có gì thay đổi
        }
      } else if (response.success && !response.data) {
        // Chưa có tài khoản
        setFoundParent(null)
        setUseExistingParent(false)
        setPhoneError(null)
      } else {
        // Lỗi hoặc SĐT đã dùng bởi tài khoản khác
        setFoundParent(null)
        setUseExistingParent(false)
        if (response.data?.existingUser) {
          setPhoneError(`Số điện thoại này đã được sử dụng bởi ${response.data.existingUser.hoTen} (${response.data.existingUser.vaiTro})`)
        } else {
          setPhoneError(response.message || "Số điện thoại không hợp lệ")
        }
      }
    } catch (error: any) {
      console.error("Error checking phone:", error)
      if (error?.response?.status === 409) {
        const errorData = error?.response?.data || {}
        if (errorData.data?.existingUser) {
          setPhoneError(`Số điện thoại này đã được sử dụng bởi ${errorData.data.existingUser.hoTen} (${errorData.data.existingUser.vaiTro})`)
        } else {
          setPhoneError(errorData.message || "Số điện thoại đã được sử dụng")
        }
      } else {
        setPhoneError("Không thể kiểm tra số điện thoại")
      }
      setFoundParent(null)
      setUseExistingParent(false)
    } finally {
      setCheckingPhone(false)
    }
  }

  const validateForm = () => {
    if (!studentName.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập tên học sinh",
        variant: "destructive",
      })
      return false
    }

    if (!birthDate) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn ngày sinh",
        variant: "destructive",
      })
      return false
    }

    // Validate age (3-18 years)
    const birth = new Date(birthDate)
    const today = new Date()
    const age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate()) ? age - 1 : age

    if (actualAge < 3 || actualAge > 18) {
      toast({
        title: "Lỗi",
        description: "Tuổi học sinh phải từ 3 đến 18 tuổi",
        variant: "destructive",
      })
      return false
    }

    if (!grade.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập lớp",
        variant: "destructive",
      })
      return false
    }

    // Validate phone
    if (!parentPhone.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập số điện thoại phụ huynh",
        variant: "destructive",
      })
      return false
    }

    if (phoneError) {
      toast({
        title: "Lỗi",
        description: phoneError,
        variant: "destructive",
      })
      return false
    }

    // If not using existing parent, require name and email
    if (!useExistingParent && !foundParent) {
      if (!parentName.trim()) {
        toast({
          title: "Lỗi",
          description: "Vui lòng nhập tên phụ huynh",
          variant: "destructive",
        })
        return false
      }

      if (!parentEmail.trim()) {
        toast({
          title: "Lỗi",
          description: "Vui lòng nhập email phụ huynh",
          variant: "destructive",
        })
        return false
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(parentEmail.trim())) {
        toast({
          title: "Lỗi",
          description: "Email không hợp lệ",
          variant: "destructive",
        })
        return false
      }
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    // Check if editing and phone changed
    if (mode === "edit" && originalParentPhone && parentPhone !== originalParentPhone) {
      // Nếu SĐT thay đổi
      if (foundParent) {
        // Tìm thấy phụ huynh - kiểm tra xem có phải phụ huynh khác không
        if (!originalParentId || foundParent.maNguoiDung !== originalParentId) {
          setShowEditConfirm(true)
          return
        }
        // Nếu là cùng phụ huynh, không cần cảnh báo
      } else if (!foundParent && parentPhone.length >= 10 && !phoneError) {
        // SĐT thay đổi và cần tạo tài khoản mới
        setShowEditConfirm(true)
        return
      }
    }

    // Check if creating new parent account
    if (!useExistingParent && !foundParent) {
      setShowCreateConfirm(true)
      return
    }

    await submitForm()
  }

  const submitForm = async () => {
    try {
      setSubmitting(true)
      
      const payload: any = {
        hoTen: studentName.trim(),
        lop: grade.trim(),
        ngaySinh: birthDate || undefined, // Chỉ gửi nếu có giá trị
      }
      
      // Add address if provided
      if (address.trim()) {
        payload.diaChi = address.trim()
      }
      
      // Add parent info
      if (useExistingParent && foundParent && foundParent.maNguoiDung) {
        // Use existing parent
        payload.maPhuHuynh = foundParent.maNguoiDung
      } else if (!foundParent && parentPhone.trim() && parentName.trim() && parentEmail.trim()) {
        // Create new parent
        payload.sdtPhuHuynh = parentPhone.trim()
        payload.tenPhuHuynh = parentName.trim()
        payload.emailPhuHuynh = parentEmail.trim()
      } else if (parentPhone.trim()) {
        // Fallback: nếu có SĐT nhưng chưa có thông tin đầy đủ
        payload.sdtPhuHuynh = parentPhone.trim()
        if (parentName.trim()) payload.tenPhuHuynh = parentName.trim()
        if (parentEmail.trim()) payload.emailPhuHuynh = parentEmail.trim()
      }
      
      if (mode === "edit" && initial?.id != null) {
        const updatedRes = await apiClient.updateStudent(initial.id, payload)
        const updated = (updatedRes as any).data || updatedRes
        toast({
          title: "Thành công",
          description: "Đã cập nhật học sinh thành công",
        })
        onUpdated?.(updated)
        onClose()
      } else {
        const createdRes = await apiClient.createStudent(payload)
        const created = (createdRes as any).data || createdRes
        toast({
          title: "Thành công",
          description: useExistingParent 
            ? "Đã thêm học sinh và liên kết với phụ huynh hiện có"
            : "Đã thêm học sinh và tạo tài khoản phụ huynh mới. Thông tin đăng nhập đã được gửi qua email.",
        })
        onCreated?.(created)
        onClose()
      }
    } catch (err: any) {
      console.error("Error creating/updating student:", err)
      const errorResponse = err?.response || {}
      const errorMessages = errorResponse.errors || []
      const errorMessage = err?.message || (mode === "edit" ? "Cập nhật học sinh thất bại" : "Tạo học sinh thất bại")
      
      toast({
        title: "Lỗi",
        description: errorMessages.length > 0 
          ? errorMessages.join(". ") 
          : errorMessage,
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
      setShowCreateConfirm(false)
      setShowEditConfirm(false)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Student Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Thông tin học sinh</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="studentName">
                Tên học sinh <span className="text-destructive">*</span>
              </Label>
              <Input
                id="studentName"
                placeholder="Nguyễn Văn A"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="grade">
                Lớp <span className="text-destructive">*</span>
              </Label>
              <Input id="grade" placeholder="5A" value={grade} onChange={(e) => setGrade(e.target.value)} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="birthDate">
              Ngày sinh <span className="text-destructive">*</span>
            </Label>
            <Input
              id="birthDate"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              max={new Date(new Date().setFullYear(new Date().getFullYear() - 3)).toISOString().split('T')[0]}
              min={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
              required
            />
            {birthDate && (() => {
              const birth = new Date(birthDate)
              const today = new Date()
              const age = today.getFullYear() - birth.getFullYear()
              const monthDiff = today.getMonth() - birth.getMonth()
              const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate()) ? age - 1 : age
              return (
                <p className="text-xs text-muted-foreground">
                  Tuổi: {actualAge} tuổi
                </p>
              )
            })()}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">
              <MapPin className="w-3 h-3 inline mr-1" />
              Địa chỉ (điểm đón/trả)
            </Label>
            <Textarea
              id="address"
              placeholder="Nhập địa chỉ nơi đón và trả học sinh (ví dụ: 123 Nguyễn Văn Linh, Quận 7, TP.HCM)"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Địa chỉ này sẽ được sử dụng làm điểm đón và điểm trả cho học sinh
            </p>
          </div>
        </div>

        {/* Parent Information - SĐT trước */}
        <div className="space-y-4 pt-4 border-t">
          <div>
            <h3 className="text-lg font-semibold">Thông tin phụ huynh</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Vui lòng nhập số điện thoại phụ huynh trước. Hệ thống sẽ tự động kiểm tra và đề xuất tài khoản nếu đã tồn tại.
            </p>
          </div>

          {/* SĐT Input */}
          <div className="space-y-2">
            <Label htmlFor="parentPhone">
              <Phone className="w-3 h-3 inline mr-1" />
              Số điện thoại phụ huynh <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="parentPhone"
                placeholder="0901234567"
                value={parentPhone}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '') // Chỉ cho phép số
                  setParentPhone(value)
                  setUseExistingParent(false)
                }}
                className={phoneError ? "border-destructive" : foundParent ? "border-success" : ""}
                required
              />
              {checkingPhone && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
              )}
            </div>
            {phoneError && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {phoneError}
              </p>
            )}
            {foundParent && !phoneError && (
              <p className="text-xs text-success flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Tìm thấy tài khoản phụ huynh
              </p>
            )}
          </div>

          {/* Found Parent Card */}
          {foundParent && !phoneError && (
            <Card className="border-success/50 bg-success/5 p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-success" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold">{foundParent.hoTen}</h4>
                    <Badge variant="outline" className="border-success text-success">
                      Phụ huynh hiện có
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {foundParent.email && (
                      <div className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        <span>{foundParent.email}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      <span>{foundParent.soDienThoai}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Học sinh sẽ được liên kết với tài khoản phụ huynh này.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* New Parent Form - chỉ hiển thị khi chưa tìm thấy */}
          {!foundParent && !phoneError && parentPhone.length >= 10 && (
            <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/30">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-warning" />
                <p className="text-sm font-medium">Số điện thoại chưa được sử dụng</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Vui lòng nhập thông tin để tạo tài khoản phụ huynh mới. Thông tin đăng nhập sẽ được gửi qua email.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="parentName">
                    Tên phụ huynh <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="parentName"
                    placeholder="Nguyễn Văn X"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    required={!foundParent}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="parentEmail">
                    <Mail className="w-3 h-3 inline mr-1" />
                    Email phụ huynh <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="parentEmail"
                    type="email"
                    placeholder="phuhuynh@example.com"
                    value={parentEmail}
                    onChange={(e) => setParentEmail(e.target.value)}
                    required={!foundParent}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Hủy
          </Button>
          <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={submitting || checkingPhone}>
            {submitting ? "Đang lưu..." : mode === 'edit' ? "Cập nhật" : "Thêm học sinh"}
          </Button>
        </div>
      </form>

      {/* Confirm Create New Parent Dialog */}
      <AlertDialog open={showCreateConfirm} onOpenChange={setShowCreateConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận tạo tài khoản phụ huynh mới</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <div>Bạn có chắc chắn muốn tạo tài khoản mới cho:</div>
                <div className="bg-muted p-3 rounded-lg space-y-1">
                  <div><strong>Tên:</strong> {parentName}</div>
                  <div><strong>Email:</strong> {parentEmail}</div>
                  <div><strong>SĐT:</strong> {parentPhone}</div>
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  Thông tin đăng nhập (email và mật khẩu) sẽ được gửi đến email <strong>{parentEmail}</strong>.
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={submitForm}>Xác nhận tạo mới</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Edit - Change Parent Dialog */}
      <AlertDialog open={showEditConfirm} onOpenChange={setShowEditConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cảnh báo: Thay đổi phụ huynh</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <div>Bạn đang thay đổi phụ huynh của học sinh này từ số điện thoại <strong>{originalParentPhone}</strong> sang <strong>{parentPhone}</strong>.</div>
                <div className="bg-warning/10 border border-warning/20 p-3 rounded-lg space-y-1">
                  <div className="text-sm font-medium text-warning">Lưu ý:</div>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    <li>Học sinh sẽ được liên kết với phụ huynh mới</li>
                    {foundParent ? (
                      <li>Học sinh sẽ được liên kết với tài khoản phụ huynh hiện có</li>
                    ) : (
                      <>
                        <li>Tài khoản phụ huynh mới sẽ được tạo cho <strong>{parentName}</strong></li>
                        <li>Thông tin đăng nhập sẽ được gửi đến email <strong>{parentEmail}</strong></li>
                      </>
                    )}
                  </ul>
                </div>
                {foundParent ? (
                  <div className="bg-muted p-3 rounded-lg space-y-1 mt-2">
                    <div><strong>Phụ huynh mới (hiện có):</strong> {foundParent.hoTen}</div>
                    <div><strong>Email:</strong> {foundParent.email}</div>
                    <div><strong>SĐT:</strong> {foundParent.soDienThoai}</div>
                  </div>
                ) : (
                  <div className="bg-muted p-3 rounded-lg space-y-1 mt-2">
                    <div><strong>Phụ huynh mới (sẽ tạo):</strong> {parentName}</div>
                    <div><strong>Email:</strong> {parentEmail}</div>
                    <div><strong>SĐT:</strong> {parentPhone}</div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={submitForm} className="bg-destructive hover:bg-destructive/90">
              Xác nhận thay đổi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
