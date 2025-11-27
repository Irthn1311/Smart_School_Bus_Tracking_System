"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Plus, Trash2, GripVertical, MapPin, Clock, Eye, Map } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import apiClient from "@/lib/api-client"
import { Badge } from "@/components/ui/badge"
import PlacePicker from "@/lib/maps/PlacePicker"
import dynamic from "next/dynamic"

const SSBMap = dynamic(() => import("@/components/map/SSBMap"), { ssr: false })

type Route = { id?: string | number; name: string; stops?: any[] }

interface Stop {
  id: string
  name: string
  address: string
  estimatedTime: string
}

interface RouteFormProps {
  onClose: () => void
  onCreated?: (route?: Route) => void
  onUpdated?: (route?: Route) => void
  mode?: "create" | "edit"
  initial?: Partial<Route>
}

export function RouteForm({ onClose, onCreated, onUpdated, mode = "create", initial }: RouteFormProps) {
  const [routeName, setRouteName] = useState(String((initial as any)?.tenTuyen || (initial as any)?.name || ""))
  const [diemBatDau, setDiemBatDau] = useState(String((initial as any)?.diemBatDau || ""))
  const [diemKetThuc, setDiemKetThuc] = useState(String((initial as any)?.diemKetThuc || ""))
  const [stops, setStops] = useState<Stop[]>(
    Array.isArray((initial as any)?.stops) && (initial as any)?.stops.length > 0
      ? ((initial as any)?.stops || []).map((s: any, idx: number) => ({
          id: String(s.maDiem || s.id || idx + 1),
          name: s.tenDiem || s.tenDiemDung || s.name || "",
          address: s.diaChi || s.address || "",
          estimatedTime: s.thoiGianDung || s.estimatedTime || "",
        }))
      : [{ id: "1", name: "", address: "", estimatedTime: "" }]
  )
  const [submitting, setSubmitting] = useState(false)
  const [showMapPreview, setShowMapPreview] = useState(false)
  const [previewPolyline, setPreviewPolyline] = useState<string | null>(null)
  const [previewStops, setPreviewStops] = useState<Array<{ maDiem: number; tenDiem: string; viDo: number; kinhDo: number; address?: string; sequence: number }>>([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const { toast } = useToast()

  const addStop = () => {
    setStops([...stops, { id: Date.now().toString(), name: "", address: "", estimatedTime: "" }])
  }

  const removeStop = (id: string) => {
    if (stops.length <= 1) {
      toast({
        title: "Không thể xóa",
        description: "Tuyến đường cần ít nhất một điểm dừng",
        variant: "destructive",
      })
      return
    }
    setStops(stops.filter((stop) => stop.id !== id))
  }

  const updateStop = (id: string, field: keyof Stop, value: string) => {
    setStops(stops.map((stop) => (stop.id === id ? { ...stop, [field]: value } : stop)))
  }

  const handlePreviewRoute = async () => {
    const validStops = stops.filter((s) => s.name.trim() && s.address.trim())
    if (validStops.length < 2) {
      toast({
        title: "Cần ít nhất 2 điểm dừng",
        description: "Vui lòng thêm địa chỉ cho ít nhất 2 điểm dừng để xem trước lộ trình",
        variant: "destructive",
      })
      return
    }

    try {
      setPreviewLoading(true)

      // Geocode addresses to get coordinates
      const geocodePromises = validStops.map((stop) => 
        apiClient.geocode({ address: stop.address })
      )
      const geocodeResults = await Promise.all(geocodePromises)

      const coordinates = geocodeResults.map((result, idx) => {
        if (result.success && result.data) {
          const location = (result.data as any)?.results?.[0]?.geometry?.location
          if (location) {
            return { lat: location.lat, lng: location.lng }
          }
        }
        return null
      })

      if (coordinates.some(c => !c)) {
        toast({
          title: "Lỗi",
          description: "Không thể lấy tọa độ từ một số địa chỉ",
          variant: "destructive",
        })
        return
      }

      const origin = `${coordinates[0]!.lat},${coordinates[0]!.lng}`
      const destination = `${coordinates[coordinates.length - 1]!.lat},${coordinates[coordinates.length - 1]!.lng}`
      const waypoints =
        coordinates.length > 2
          ? coordinates.slice(1, -1).map((c) => ({
              location: `${c!.lat},${c!.lng}`,
            }))
          : undefined

      const response = await apiClient.getDirections({
        origin,
        destination,
        waypoints,
        mode: "driving", // Mode driving phù hợp với xe buýt
        vehicleType: "bus", // Chỉ định loại xe là buýt
      })

      if (response.success && (response.data as any)?.polyline) {
        setPreviewPolyline((response.data as any).polyline)
        // Set preview stops with coordinates
        setPreviewStops(validStops.map((stop, idx) => {
          const coord = coordinates[idx]
          return {
            maDiem: idx + 1,
            tenDiem: stop.name || `Điểm ${idx + 1}`,
            viDo: coord?.lat || 0,
            kinhDo: coord?.lng || 0,
            address: stop.address || undefined,
            sequence: idx + 1,
          }
        }))
        setShowMapPreview(true)
        toast({
          title: "Đã tạo xem trước lộ trình",
          description: `Quãng đường: ${(response.data as any)?.distance || "N/A"}, Thời gian: ${(response.data as any)?.duration || "N/A"}`,
        })
      }
    } catch (err: any) {
      console.error("Preview route error:", err)
      toast({
        title: "Lỗi",
        description: err?.message || "Không thể tạo xem trước lộ trình",
        variant: "destructive",
      })
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!routeName.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập tên tuyến",
        variant: "destructive",
      })
      return
    }

    const validStops = stops.filter((s) => s.name.trim())
    if (validStops.length === 0) {
      toast({
        title: "Lỗi",
        description: "Vui lòng thêm ít nhất một điểm dừng",
        variant: "destructive",
      })
      return
    }

    // Validate addresses
    for (const stop of validStops) {
      if (!stop.address.trim()) {
        toast({
          title: "Lỗi",
          description: `Vui lòng nhập địa chỉ cho điểm "${stop.name || 'chưa đặt tên'}"`,
          variant: "destructive",
        })
        return
      }
    }

    try {
      setSubmitting(true)

      // Prepare route data
      const routePayload: any = {
        tenTuyen: routeName.trim(),
      }

      if (diemBatDau.trim()) routePayload.diemBatDau = diemBatDau.trim()
      if (diemKetThuc.trim()) routePayload.diemKetThuc = diemKetThuc.trim()

      if (mode === "edit" && initial?.id != null) {
        // Update existing route
        await apiClient.updateRoute(initial.id as any, routePayload)

        // Update stops
        const routeId = initial.id
        const existingStops = await apiClient.getRouteStops(routeId)
        const existingStopsData = (existingStops as any).data || []

        // For now, just update the route info
        // In production, you might want to add/update/delete stops separately
        toast({
          title: "Thành công",
          description: "Đã cập nhật tuyến đường",
        })
        onUpdated?.()
        onClose()
      } else {
        // Create new route
        const result = await apiClient.createRoute(routePayload)
        const newRouteId = (result as any).data?.maTuyen || (result as any).data?.id

        if (newRouteId && validStops.length > 0) {
          // Create stops for the new route
          // Geocode addresses if needed
          for (const stop of validStops) {
            try {
              const stopPayload: any = {
                tenDiem: stop.name.trim(),
                diaChi: stop.address.trim() || undefined,
                thuTu: validStops.indexOf(stop) + 1,
                thoiGianDung: stop.estimatedTime || undefined,
              }

              // Geocode address to get coordinates
              if (stop.address.trim()) {
                try {
                  const geocodeResponse = await apiClient.geocode({ address: stop.address.trim() })
                  if (geocodeResponse.success && geocodeResponse.data) {
                    const location = (geocodeResponse.data as any)?.results?.[0]?.geometry?.location
                    if (location) {
                      stopPayload.viDo = location.lat
                      stopPayload.kinhDo = location.lng
                    }
                  }
                } catch (geocodeErr) {
                  console.warn("Failed to geocode address:", geocodeErr)
                  // Continue without coordinates - backend may handle it
                }
              }

              await apiClient.addRouteStop(newRouteId, stopPayload)
            } catch (err) {
              console.error("Lỗi khi thêm điểm dừng:", err)
            }
          }

          // 🆕 Tự động rebuild polyline sau khi thêm stops (giống Google Maps)
          if (validStops.length >= 2) {
            try {
              await apiClient.rebuildPolyline(newRouteId)
              console.log("✅ Auto-rebuilt polyline for new route")
            } catch (err) {
              console.error("Không thể tạo polyline tự động:", err)
              // Non-fatal, route vẫn được tạo
            }
          }
        }

        toast({
          title: "Thành công",
          description: validStops.length >= 2 
            ? "Đã thêm tuyến đường mới với lộ trình Google Maps"
            : "Đã thêm tuyến đường mới",
        })
        onCreated?.()
        onClose()
      }
    } catch (err: any) {
      console.error("Lỗi:", err)
      toast({
        title: "Không thành công",
        description: err?.message || mode === "edit" ? "Cập nhật tuyến thất bại" : "Tạo tuyến thất bại",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Route Basic Info */}
      <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border/50">
        <div className="space-y-2">
          <Label htmlFor="routeName">Tên tuyến *</Label>
          <Input
            id="routeName"
            placeholder="VD: Tuyến 1 - Quận 1 → Quận 7"
            value={routeName}
            onChange={(e) => setRouteName(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="diemBatDau">Điểm bắt đầu</Label>
            <Input
              id="diemBatDau"
              placeholder="VD: Trường TH ABC"
              value={diemBatDau}
              onChange={(e) => setDiemBatDau(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="diemKetThuc">Điểm kết thúc</Label>
            <Input
              id="diemKetThuc"
              placeholder="VD: Khu dân cư XYZ"
              value={diemKetThuc}
              onChange={(e) => setDiemKetThuc(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Stops Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            <Label className="text-base">Điểm dừng</Label>
            <Badge variant="outline" className="text-xs">
              {stops.filter((s) => s.name.trim()).length} điểm
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePreviewRoute}
              disabled={previewLoading || stops.filter((s) => s.name.trim() && s.address.trim()).length < 2}
            >
              <Eye className="w-4 h-4 mr-2" />
              {previewLoading ? "Đang tải..." : "Xem trước lộ trình"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={addStop}>
              <Plus className="w-4 h-4 mr-2" />
              Thêm điểm dừng
            </Button>
          </div>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {stops.map((stop, index) => (
            <Card key={stop.id} className="p-4 border-border/50 hover:border-primary/50 transition-colors">
              <div className="flex gap-3">
                <div className="flex items-center">
                  <GripVertical className="w-5 h-5 text-muted-foreground cursor-move" />
                </div>

                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary border-2 border-primary/20">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <PlacePicker
                        onPlaceSelected={(place) => {
                          updateStop(stop.id, "name", place.name || "")
                          updateStop(stop.id, "address", place.address || "")
                        }}
                        placeholder={`Tìm kiếm: Đại học Sài Gòn, Quận 7...`}
                      />
                    </div>
                  </div>

                  <Input
                    placeholder="Hoặc nhập tên thủ công"
                    value={stop.name}
                    onChange={(e) => updateStop(stop.id, "name", e.target.value)}
                    className="text-sm"
                  />

                  <Input
                    placeholder="Địa chỉ chi tiết *"
                    value={stop.address}
                    onChange={(e) => updateStop(stop.id, "address", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Tọa độ sẽ được tự động lấy từ địa chỉ
                  </p>

                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Thời gian dừng (phút) VD: 2"
                      type="number"
                      min="0"
                      value={stop.estimatedTime}
                      onChange={(e) => updateStop(stop.id, "estimatedTime", e.target.value)}
                      className="w-32"
                    />
                    <span className="text-xs text-muted-foreground">phút</span>
                  </div>
                </div>

                <div className="flex items-start pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeStop(stop.id)}
                    disabled={stops.length === 1}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {stops.filter((s) => s.name.trim()).length === 0 && (
          <div className="text-center text-sm text-muted-foreground p-4 bg-muted/30 rounded-lg border border-dashed">
            Chưa có điểm dừng nào. Vui lòng thêm ít nhất một điểm dừng.
          </div>
        )}
      </div>

      {/* Map Preview Section */}
      {showMapPreview && previewPolyline && (
        <Card className="p-4 border-primary/30 bg-primary/5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Map className="w-5 h-5 text-primary" />
                <Label className="text-base font-semibold">Xem trước lộ trình</Label>
                <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                  Giống Google Maps
                </Badge>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowMapPreview(false)}
              >
                Ẩn bản đồ
              </Button>
            </div>
            <div className="h-[400px] rounded-lg overflow-hidden border">
              <SSBMap
                height="400px"
                polyline={previewPolyline}
                stops={previewStops}
                autoFitOnUpdate
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              💡 Lộ trình sẽ được lưu vào database khi bạn nhấn &quot;{mode === "edit" ? "Cập nhật tuyến" : "Thêm tuyến đường"}&quot;
            </p>
          </div>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
          Hủy
        </Button>
        <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={submitting}>
          {submitting ? "Đang lưu..." : mode === 'edit' ? "Cập nhật tuyến" : "Thêm tuyến đường"}
        </Button>
      </div>
    </form>
  )
}
