"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { apiClient } from "@/lib/api"
export type Driver = {
  id?: string
  name: string
  email?: string
  phone?: string
  license?: string
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
  const [license, setLicense] = useState(initial?.license || "B2")
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name || !phone || !email) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập Họ tên, Email và Số điện thoại",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmitting(true)
      if (mode === "edit" && initial?.id) {
        const res = await apiClient.updateDriver(initial.id, {
          hoTen: name.trim(),
          email: email.trim(),
          soDienThoai: phone.trim(),
          soBangLai: license,
        })
        if ((res as any)?.success === false) throw new Error((res as any)?.message || 'Cập nhật thất bại')
        toast({ title: "Thành công", description: "Đã cập nhật tài xế" })
        onCreated?.()
      } else {
        const res = await apiClient.createDriver({
          maTaiXe: `TX${Date.now()}`,
          hoTen: name.trim(),
          email: email.trim(),
          soDienThoai: phone.trim(),
          soBangLai: license,
        })
        if ((res as any)?.success === false) throw new Error((res as any)?.message || 'Tạo mới thất bại')
        toast({ title: "Thành công", description: "Đã thêm tài xế mới" })
        onCreated?.()
      }
      onClose()
    } catch (err: any) {
      const msg = err?.message || (err?.status === 409 ? "Xung đột dữ liệu" : "Thao tác thất bại")
      toast({ title: "Không thành công", description: msg, variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Họ và tên *</Label>
          <Input id="name" placeholder="Nguyễn Văn A" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input id="email" type="email" placeholder="taixe@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Số điện thoại *</Label>
          <Input id="phone" placeholder="0901234567" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="license">Bằng lái</Label>
        <Select value={license} onValueChange={setLicense}>
          <SelectTrigger id="license">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="B2">B2</SelectItem>
            <SelectItem value="C">C</SelectItem>
            <SelectItem value="D">D</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
          Hủy
        </Button>
        <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={submitting}>
          {submitting ? "Đang lưu..." : mode === 'edit' ? "Cập nhật" : "Thêm tài xế"}
        </Button>
      </div>
    </form>
  )
}
