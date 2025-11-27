"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent } from "@/components/ui/card"
import {
  AlertTriangle,
  Car,
  Clock,
  MapPin,
  Camera,
  Upload,
  X,
  Zap,
  AlertCircle,
  Construction,
  UserX,
  FileText,
} from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import apiClient from "@/lib/api"
import { Checkbox } from "@/components/ui/checkbox"

interface IncidentFormProps {
  onClose: () => void
  tripId: string | number
  currentLocation?: { lat: number; lng: number } // Vị trí từ busPosition
  gpsLastPoint?: { lat: number; lng: number } // Vị trí từ useGPS hook
}

const incidentCategories = [
  {
    value: "traffic",
    label: "Kẹt xe",
    icon: Car,
    description: "Tắc đường, ùn tắc giao thông",
    color: "text-warning",
  },
  {
    value: "breakdown",
    label: "Hỏng xe",
    icon: Construction,
    description: "Sự cố kỹ thuật, hư hỏng xe",
    color: "text-destructive",
  },
  {
    value: "accident",
    label: "Tai nạn",
    icon: AlertCircle,
    description: "Va chạm, tai nạn giao thông",
    color: "text-destructive",
  },
  {
    value: "student",
    label: "Học sinh",
    icon: UserX,
    description: "Vấn đề liên quan đến học sinh",
    color: "text-warning",
  },
  {
    value: "weather",
    label: "Thời tiết",
    icon: Zap,
    description: "Mưa lớn, thời tiết xấu",
    color: "text-info",
  },
  {
    value: "other",
    label: "Khác",
    icon: FileText,
    description: "Sự cố khác",
    color: "text-muted-foreground",
  },
]

const quickTemplates = [
  { label: "Kẹt xe nghiêm trọng", description: "Đường đang bị tắc nghẽn, dự kiến chậm 15-20 phút" },
  { label: "Xe hỏng nhẹ", description: "Xe gặp sự cố kỹ thuật nhỏ, đang xử lý" },
  { label: "Học sinh không đến", description: "Học sinh không có mặt tại điểm đón" },
  { label: "Thời tiết xấu", description: "Mưa lớn, di chuyển chậm hơn dự kiến" },
]

export function IncidentForm({ onClose, tripId, currentLocation, gpsLastPoint }: IncidentFormProps) {
  const [type, setType] = useState("")
  const [severity, setSeverity] = useState("medium")
  const [description, setDescription] = useState("")
  // 🔥 FIX: Ưu tiên dùng vị trí từ useGPS hoặc busPosition
  const initialLocation = gpsLastPoint || currentLocation
  const [location, setLocation] = useState(initialLocation ? `Vị trí: ${initialLocation.lat.toFixed(6)}, ${initialLocation.lng.toFixed(6)}` : "Chưa lấy vị trí")
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(initialLocation || null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [affectedStudents, setAffectedStudents] = useState<string[]>([])
  const [studentsList, setStudentsList] = useState<Array<{ id: string; name: string }>>([])
  const [witnessName, setWitnessName] = useState("")
  const [witnessPhone, setWitnessPhone] = useState("")
  const [photos, setPhotos] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  // 🔥 FIX: Dùng useRef để track watchId và tránh gọi nhiều lần
  const watchIdRef = useRef<number | null>(null)
  const isFetchingRef = useRef(false)

  // 🔥 FIX: Hàm lấy GPS location - ưu tiên dùng vị trí từ useGPS/busPosition, chỉ gọi getCurrentPosition khi cần
  const fetchLocation = useCallback(async () => {
    // 🔥 FIX: Ưu tiên dùng vị trí từ useGPS hoặc busPosition (đã có permission)
    const availableLocation = gpsLastPoint || currentLocation
    if (availableLocation) {
      console.log("[IncidentForm] Using location from GPS hook/busPosition:", availableLocation)
      setLocationCoords({ lat: availableLocation.lat, lng: availableLocation.lng })
      
      // Reverse geocoding để lấy địa chỉ
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${availableLocation.lat}&lon=${availableLocation.lng}&zoom=18&addressdetails=1`
        )
        const data = await response.json()
        if (data.address) {
          const address = data.display_name || 
            `${data.address.road || ""} ${data.address.house_number || ""}, ${data.address.suburb || data.address.quarter || ""}, ${data.address.city || data.address.town || ""}`.trim()
          setLocation(address || `Vị trí: ${availableLocation.lat.toFixed(6)}, ${availableLocation.lng.toFixed(6)}`)
        } else {
          setLocation(`Vị trí: ${availableLocation.lat.toFixed(6)}, ${availableLocation.lng.toFixed(6)}`)
        }
      } catch (err) {
        console.warn("[IncidentForm] Reverse geocoding failed:", err)
        setLocation(`Vị trí: ${availableLocation.lat.toFixed(6)}, ${availableLocation.lng.toFixed(6)}`)
      }
      return
    }

    // Nếu không có vị trí sẵn, mới gọi getCurrentPosition
    if (!navigator.geolocation) {
      setLocation("Trình duyệt không hỗ trợ GPS")
      toast({
        title: "Không hỗ trợ GPS",
        description: "Trình duyệt của bạn không hỗ trợ định vị GPS",
        variant: "destructive",
      })
      return
    }

    // Tránh gọi nhiều lần cùng lúc
    if (isFetchingRef.current) {
      console.log("[IncidentForm] Already fetching location, skipping...")
      return
    }

    isFetchingRef.current = true
    setLocationLoading(true)
    setLocation("Đang lấy vị trí...")

    // Clear watch position nếu có
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          // Kiểm tra xem component còn mount không
          if (!isFetchingRef.current) return

          const lat = position.coords.latitude
          const lng = position.coords.longitude
          setLocationCoords({ lat, lng })
          
          // Reverse geocoding để lấy địa chỉ
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
            )
            const data = await response.json()
            if (data.address) {
              const address = data.display_name || 
                `${data.address.road || ""} ${data.address.house_number || ""}, ${data.address.suburb || data.address.quarter || ""}, ${data.address.city || data.address.town || ""}`.trim()
              setLocation(address || `Vị trí: ${lat.toFixed(6)}, ${lng.toFixed(6)}`)
            } else {
              setLocation(`Vị trí: ${lat.toFixed(6)}, ${lng.toFixed(6)}`)
            }
          } catch (err) {
            console.warn("[IncidentForm] Reverse geocoding failed:", err)
            setLocation(`Vị trí: ${lat.toFixed(6)}, ${lng.toFixed(6)}`)
          }
        } catch (err) {
          console.error("[IncidentForm] Error processing location:", err)
          if (isFetchingRef.current) {
            setLocation("Lỗi xử lý vị trí")
          }
        } finally {
          isFetchingRef.current = false
          setLocationLoading(false)
        }
      },
      (error) => {
        console.warn("[IncidentForm] Geolocation error:", error)
        let errorMsg = "Không thể lấy vị trí GPS"
        let toastMsg = "Không thể lấy vị trí GPS"
        
        if (error.code === error.TIMEOUT) {
          errorMsg = "Hết thời gian chờ GPS (thử lại)"
          toastMsg = "Hết thời gian chờ GPS. Vui lòng thử lại"
        } else if (error.code === error.PERMISSION_DENIED) {
          errorMsg = "Bị từ chối quyền truy cập vị trí"
          toastMsg = "Quyền truy cập vị trí bị từ chối. Vui lòng cấp quyền trong cài đặt trình duyệt (biểu tượng khóa ở thanh địa chỉ)"
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = "Vị trí không khả dụng"
          toastMsg = "Vị trí GPS không khả dụng. Vui lòng kiểm tra kết nối GPS"
        }
        
        if (isFetchingRef.current) {
          setLocation(errorMsg)
          // Chỉ hiển thị toast cho lỗi permission để không spam
          if (error.code === error.PERMISSION_DENIED) {
            toast({
              title: "Quyền truy cập vị trí bị từ chối",
              description: "Vui lòng cấp quyền truy cập vị trí trong cài đặt trình duyệt (biểu tượng khóa ở thanh địa chỉ)",
              variant: "destructive",
              duration: 5000,
            })
          }
        }
        isFetchingRef.current = false
        setLocationLoading(false)
      },
      {
        enableHighAccuracy: false, // 🔥 FIX: Tắt high accuracy để nhanh hơn, ít bị timeout
        timeout: 10000, // 🔥 FIX: Giảm timeout xuống 10 giây, nếu timeout thì retry
        maximumAge: 300000, // Chấp nhận vị trí trong vòng 5 phút (để không phải lấy lại nhiều)
      }
    )
  }, [toast, gpsLastPoint, currentLocation])

  // 🔥 FIX: Tự động cập nhật vị trí khi gpsLastPoint hoặc currentLocation thay đổi
  useEffect(() => {
    const availableLocation = gpsLastPoint || currentLocation
    if (!availableLocation) {
      return
    }

    const sameLocation =
      locationCoords &&
      locationCoords.lat === availableLocation.lat &&
      locationCoords.lng === availableLocation.lng

    if (sameLocation) {
      return
    }

    console.log("[IncidentForm] Auto-updating location from GPS:", availableLocation)
    setLocationCoords({ lat: availableLocation.lat, lng: availableLocation.lng })

    let cancelled = false

    const updateAddress = async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${availableLocation.lat}&lon=${availableLocation.lng}&zoom=18&addressdetails=1`
        )
        const data = await response.json()
        if (cancelled) return
        if (data.address) {
          const address =
            data.display_name ||
            `${data.address.road || ""} ${data.address.house_number || ""}, ${data.address.suburb || data.address.quarter || ""}, ${data.address.city || data.address.town || ""}`.trim()
          setLocation(
            address || `Vị trí: ${availableLocation.lat.toFixed(6)}, ${availableLocation.lng.toFixed(6)}`
          )
        } else {
          setLocation(`Vị trí: ${availableLocation.lat.toFixed(6)}, ${availableLocation.lng.toFixed(6)}`)
        }
      } catch (err) {
        if (!cancelled) {
          console.warn("[IncidentForm] Reverse geocoding failed:", err)
          setLocation(`Vị trí: ${availableLocation.lat.toFixed(6)}, ${availableLocation.lng.toFixed(6)}`)
        }
      }
    }

    updateAddress()

    return () => {
      cancelled = true
    }
  }, [gpsLastPoint, currentLocation, locationCoords?.lat, locationCoords?.lng])

  // 🔥 FIX: Cleanup khi component unmount (không tự động lấy vị trí khi mount)
  useEffect(() => {
    // Cleanup: Clear watch position khi component unmount
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation?.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      isFetchingRef.current = false
    }
  }, [])

  // 🔥 FIX: Load danh sách học sinh từ trip
  useEffect(() => {
    async function loadStudents() {
      if (!tripId) {
        setStudentsList([])
        return
      }
      try {
        setLoading(true)
        // Lấy danh sách học sinh trong chuyến đi
        const tripRes: any = await apiClient.getTripById(Number(tripId))
        const trip = tripRes?.data || tripRes
        
        console.log("[IncidentForm] Trip data:", trip)
        
        if (trip?.students && Array.isArray(trip.students) && trip.students.length > 0) {
          const mapped = trip.students.map((s: any) => ({
            id: (s.maHocSinh || s.maTrangThai || s.id) + "",
            name: s.hoTen || s.tenHocSinh || s.name || "Học sinh",
          }))
          setStudentsList(mapped)
          console.log("[IncidentForm] Loaded", mapped.length, "students")
        } else {
          // Fallback: Thử lấy từ API getTripStudents
          try {
            const studentsRes: any = await apiClient.getTripStudents(Number(tripId))
            const students = studentsRes?.data || studentsRes || []
            if (Array.isArray(students) && students.length > 0) {
              const mapped = students.map((s: any) => ({
                id: (s.maHocSinh || s.maTrangThai || s.id) + "",
                name: s.hoTen || s.tenHocSinh || s.name || "Học sinh",
              }))
              setStudentsList(mapped)
              console.log("[IncidentForm] Loaded", mapped.length, "students from getTripStudents")
            } else {
              setStudentsList([])
            }
          } catch (fallbackErr) {
            console.warn("[IncidentForm] Fallback API also failed:", fallbackErr)
            setStudentsList([])
          }
        }
      } catch (err) {
        console.error("[IncidentForm] Failed to load students:", err)
        setStudentsList([])
      } finally {
        setLoading(false)
      }
    }
    loadStudents()
  }, [tripId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!type || !description) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập đầy đủ thông tin",
        variant: "destructive",
      })
      return
    }
    try {
      // Map severity to backend mucDo
      const severityMap: Record<string, string> = {
        low: "nhe",
        medium: "trung_binh",
        high: "nghiem_trong", // treating 'high' as serious for now
        critical: "nghiem_trong",
      }
      // 🔥 FIX: Gửi kèm vị trí GPS thật
      const finalTripId = selectedTripId || tripId
      
      if (!finalTripId) {
        toast({
          title: "Lỗi",
          description: "Vui lòng chọn chuyến đi",
          variant: "destructive",
        })
        return
      }
      
      const payload: any = {
        maChuyen: Number(finalTripId),
        loaiSuCo: type,
        moTa: description,
        mucDo: severityMap[severity] || "nhe",
        thoiGianBao: new Date().toISOString(),
      }
      
      if (affectedStudents.length > 0) {
        const studentIds = Array.from(
          new Set(
            affectedStudents
              .map((id) => Number(id))
              .filter((id) => Number.isFinite(id) && id > 0)
          )
        )
        if (studentIds.length > 0) {
          payload.hocSinhLienQuan = studentIds
        }
      }
      
      // Thêm vị trí nếu có
      if (locationCoords) {
        payload.viTri = `${locationCoords.lat},${locationCoords.lng}`
        console.log("[IncidentForm] Sending with GPS coords:", payload.viTri)
      } else if (location && location !== "Đang lấy vị trí..." && location !== "Không thể lấy vị trí GPS" && location !== "Chưa lấy vị trí" && !location.includes("Bị từ chối") && !location.includes("Lỗi")) {
        payload.viTri = location
        console.log("[IncidentForm] Sending with location text:", payload.viTri)
      } else {
        console.warn("[IncidentForm] No valid location available, sending without viTri")
      }
      
      console.log("[IncidentForm] Submitting incident:", { 
        ...payload, 
        viTri: payload.viTri ? "***" : "none",
        maChuyen: payload.maChuyen,
        moTa: payload.moTa ? `${payload.moTa.substring(0, 50)}...` : "EMPTY"
      })
      
      if (!payload.maChuyen || !payload.moTa) {
        console.error("[IncidentForm] Missing required fields:", { 
          maChuyen: payload.maChuyen, 
          moTa: payload.moTa 
        })
        toast({
          title: "Lỗi",
          description: "Thiếu thông tin bắt buộc (maChuyen hoặc moTa)",
          variant: "destructive",
        })
        return
      }
      
      await apiClient.createIncident(payload)
      toast({
        title: "Đã gửi báo cáo",
        description: "Admin và phụ huynh sẽ nhận được thông báo ngay lập tức",
      })
      onClose()
    } catch (err: any) {
      toast({
        title: "Gửi báo cáo thất bại",
        description: err?.message || "Vui lòng thử lại",
        variant: "destructive",
      })
    }
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newPhotos = Array.from(e.target.files)
      setPhotos([...photos, ...newPhotos])
    }
  }

  const handleRemovePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index))
  }

  const handleUseTemplate = (template: (typeof quickTemplates)[0]) => {
    setDescription(template.description)
  }

  const selectedCategory = incidentCategories.find((cat) => cat.value === type)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="border-border/50 bg-muted/30">
        <CardContent className="pt-4 space-y-2">
          <div className="flex items-center justify-between gap-2 text-sm">
            <div className="flex items-center gap-2 flex-1">
              <MapPin className={`w-4 h-4 ${locationCoords ? "text-green-500" : location.includes("Không thể") || location.includes("Lỗi") || location.includes("Bị từ chối") ? "text-destructive" : "text-primary"}`} />
              <span className="text-muted-foreground">Vị trí:</span>
              <span className={`font-medium ${location.includes("Không thể") || location.includes("Lỗi") || location.includes("Bị từ chối") ? "text-destructive" : locationCoords ? "text-green-600" : "text-foreground"}`}>
                {location}
              </span>
              {locationCoords && (
                <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
                  ✓ Đã lưu
                </span>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchLocation}
              disabled={locationLoading}
              className="shrink-0"
            >
              {locationLoading 
                ? "Đang lấy..." 
                : location === "Chưa lấy vị trí" || location.includes("Không thể") || location.includes("Lỗi") || location.includes("Bị từ chối")
                  ? "Lấy vị trí"
                  : "Lấy lại"}
            </Button>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">Thời gian:</span>
            <span className="font-medium text-foreground">{new Date().toLocaleString("vi-VN")}</span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Label>Loại sự cố *</Label>
        <div className="grid grid-cols-2 gap-3">
          {incidentCategories.map((category) => {
            const Icon = category.icon
            return (
              <Card
                key={category.value}
                className={`cursor-pointer transition-all border-2 ${
                  type === category.value ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/50"
                }`}
                onClick={() => setType(category.value)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Icon className={`w-5 h-5 ${type === category.value ? "text-primary" : category.color}`} />
                    <div className="flex-1">
                      <p className="font-medium text-sm text-foreground">{category.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{category.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Mức độ nghiêm trọng *</Label>
        <RadioGroup value={severity} onValueChange={setSeverity} className="grid grid-cols-4 gap-3">
          <div>
            <RadioGroupItem value="low" id="low" className="peer sr-only" />
            <Label
              htmlFor="low"
              className="flex flex-col items-center justify-center rounded-lg border-2 border-border/50 bg-background p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-success peer-data-[state=checked]:bg-success/5 cursor-pointer"
            >
              <span className="text-sm font-medium">Thấp</span>
            </Label>
          </div>
          <div>
            <RadioGroupItem value="medium" id="medium" className="peer sr-only" />
            <Label
              htmlFor="medium"
              className="flex flex-col items-center justify-center rounded-lg border-2 border-border/50 bg-background p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-info peer-data-[state=checked]:bg-info/5 cursor-pointer"
            >
              <span className="text-sm font-medium">Trung bình</span>
            </Label>
          </div>
          <div>
            <RadioGroupItem value="high" id="high" className="peer sr-only" />
            <Label
              htmlFor="high"
              className="flex flex-col items-center justify-center rounded-lg border-2 border-border/50 bg-background p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-warning peer-data-[state=checked]:bg-warning/5 cursor-pointer"
            >
              <span className="text-sm font-medium">Cao</span>
            </Label>
          </div>
          <div>
            <RadioGroupItem value="critical" id="critical" className="peer sr-only" />
            <Label
              htmlFor="critical"
              className="flex flex-col items-center justify-center rounded-lg border-2 border-border/50 bg-background p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-destructive peer-data-[state=checked]:bg-destructive/5 cursor-pointer"
            >
              <span className="text-sm font-medium">Nghiêm trọng</span>
            </Label>
          </div>
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label>Mẫu nhanh (tùy chọn)</Label>
        <div className="grid grid-cols-2 gap-2">
          {quickTemplates.map((template, index) => (
            <Button
              key={index}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleUseTemplate(template)}
              className="justify-start text-left h-auto py-2 bg-transparent"
            >
              <div>
                <p className="text-xs font-medium">{template.label}</p>
                <p className="text-xs text-muted-foreground">{template.description.substring(0, 30)}...</p>
              </div>
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Mô tả chi tiết *</Label>
        <Textarea
          id="description"
          placeholder="Mô tả tình huống đang gặp phải..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
        />
      </div>

      <div className="space-y-2">
        <Label>Hình ảnh (tùy chọn)</Label>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => document.getElementById("photo-upload")?.click()}
              className="bg-transparent"
            >
              <Camera className="w-4 h-4 mr-2" />
              Chụp ảnh
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => document.getElementById("photo-upload")?.click()}
              className="bg-transparent"
            >
              <Upload className="w-4 h-4 mr-2" />
              Tải ảnh lên
            </Button>
            <input
              id="photo-upload"
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo, index) => (
                <div key={index} className="relative group">
                  <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                    <img
                      src={URL.createObjectURL(photo) || "/placeholder.svg"}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleRemovePhoto(index)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Học sinh liên quan (nếu có)</Label>
        <Card className="border-border/50">
          <CardContent className="pt-4 space-y-2">
            {loading ? (
              <div className="text-sm text-muted-foreground py-2">Đang tải danh sách học sinh...</div>
            ) : studentsList.length > 0 ? (
              studentsList.map((student) => (
                <div key={student.id} className="flex items-center gap-2">
                  <Checkbox
                    id={student.id}
                    checked={affectedStudents.includes(student.id)}
                    onCheckedChange={(checked: boolean | "indeterminate") => {
                      const isChecked = checked === true
                      if (isChecked) {
                        setAffectedStudents([...affectedStudents, student.id])
                      } else {
                        setAffectedStudents(affectedStudents.filter((s) => s !== student.id))
                      }
                    }}
                  />
                  <Label htmlFor={student.id} className="text-sm font-normal cursor-pointer">
                    {student.name}
                  </Label>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground py-2">
                {tripId ? "Không có học sinh trong chuyến đi này" : "Vui lòng chọn chuyến đi"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <Label>Thông tin nhân chứng (nếu có)</Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Input placeholder="Tên nhân chứng" value={witnessName} onChange={(e) => setWitnessName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Input placeholder="Số điện thoại" value={witnessPhone} onChange={(e) => setWitnessPhone(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <div className="flex items-center gap-2">
          <AlertTriangle
            className={`w-5 h-5 ${
              severity === "critical"
                ? "text-destructive"
                : severity === "high"
                  ? "text-warning"
                  : severity === "medium"
                    ? "text-info"
                    : "text-success"
            }`}
          />
          <span className="text-sm text-muted-foreground">
            Mức độ:{" "}
            <span className="font-medium text-foreground capitalize">
              {severity === "low"
                ? "Thấp"
                : severity === "medium"
                  ? "Trung bình"
                  : severity === "high"
                    ? "Cao"
                    : "Nghiêm trọng"}
            </span>
          </span>
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
            Gửi báo cáo
          </Button>
        </div>
      </div>
    </form>
  )
}
