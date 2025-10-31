"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Plus, Trash2, GripVertical } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { apiClient } from "@/lib/api"
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
  const [stops, setStops] = useState<Stop[]>(
    Array.isArray((initial as any)?.stops)
      ? ((initial as any)?.stops || []).map((s: any, idx: number) => ({
          id: String(s.id || idx + 1),
          name: s.tenDiemDung || s.name || "",
          address: s.diaChi || s.address || "",
          estimatedTime: s.thoiGianDuKien || s.estimatedTime || "",
        }))
      : [{ id: "1", name: "", address: "", estimatedTime: "" }]
  )
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  const addStop = () => {
    setStops([...stops, { id: Date.now().toString(), name: "", address: "", estimatedTime: "" }])
  }

  const removeStop = (id: string) => {
    setStops(stops.filter((stop) => stop.id !== id))
  }

  const updateStop = (id: string, field: keyof Stop, value: string) => {
    setStops(stops.map((stop) => (stop.id === id ? { ...stop, [field]: value } : stop)))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!routeName) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập tên tuyến",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmitting(true)
      const payload = {
        tenTuyen: routeName.trim(),
        diemDung: stops
          .filter((s) => s.name.trim())
          .map((s) => ({ tenDiemDung: s.name.trim(), diaChi: s.address || undefined, thoiGianDuKien: s.estimatedTime || undefined })),
      }
      if (mode === "edit" && initial?.id != null) {
        const res = await apiClient.updateRoute(initial.id as any, payload)
        toast({ title: "Thành công", description: "Đã cập nhật tuyến đường" })
        onUpdated?.()
        onClose()
      } else {
        const res = await apiClient.createRoute({ maTuyen: `T${Date.now()}`, ...payload })
        toast({ title: "Thành công", description: "Đã thêm tuyến đường mới" })
        onCreated?.()
        onClose()
      }
    } catch (err: any) {
      toast({ title: "Không thành công", description: err?.message || "Tạo tuyến thất bại", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="routeName">Tên tuyến *</Label>
        <Input
          id="routeName"
          placeholder="Tuyến 1 - Quận 1"
          value={routeName}
          onChange={(e) => setRouteName(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Điểm dừng</Label>
          <Button type="button" variant="outline" size="sm" onClick={addStop}>
            <Plus className="w-4 h-4 mr-2" />
            Thêm điểm dừng
          </Button>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {stops.map((stop, index) => (
            <Card key={stop.id} className="p-4 border-border/50">
              <div className="flex gap-3">
                <div className="flex items-center">
                  <GripVertical className="w-5 h-5 text-muted-foreground cursor-move" />
                </div>

                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                      {index + 1}
                    </div>
                    <Input
                      placeholder="Tên điểm dừng"
                      value={stop.name}
                      onChange={(e) => updateStop(stop.id, "name", e.target.value)}
                    />
                  </div>

                  <Input
                    placeholder="Địa chỉ"
                    value={stop.address}
                    onChange={(e) => updateStop(stop.id, "address", e.target.value)}
                  />

                  <Input
                    placeholder="Giờ dự kiến (VD: 06:30)"
                    value={stop.estimatedTime}
                    onChange={(e) => updateStop(stop.id, "estimatedTime", e.target.value)}
                  />
                </div>

                <div className="flex items-start">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeStop(stop.id)}
                    disabled={stops.length === 1}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

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
