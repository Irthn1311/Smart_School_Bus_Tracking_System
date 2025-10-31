"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { apiClient } from "@/lib/api"
type Student = any

interface StudentFormProps {
  onClose: () => void
  onCreated?: (student: Student) => void
  onUpdated?: (student: Student) => void
  mode?: "create" | "edit"
  initial?: Partial<Student> & { id?: string | number }
}

export function StudentForm({ onClose, onCreated, onUpdated, mode = "create", initial }: StudentFormProps) {
  const [studentName, setStudentName] = useState(String((initial as any)?.hoTen || (initial as any)?.name || ""))
  const [birthDate, setBirthDate] = useState(String((initial as any)?.ngaySinh || ""))
  const [grade, setGrade] = useState(String((initial as any)?.lop || (initial as any)?.grade || ""))
  const [parentName, setParentName] = useState(String((initial as any)?.tenPhuHuynh || (initial as any)?.parentName || ""))
  const [parentPhone, setParentPhone] = useState(String((initial as any)?.sdtPhuHuynh || (initial as any)?.parentPhone || ""))
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!studentName || !grade || !birthDate) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập đầy đủ thông tin (Tên, Lớp, Ngày sinh)",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmitting(true)
      
      // Try to find parent by phone number
      let maPhuHuynh = null
      if (parentPhone) {
        try {
          // First, we need to check if there's a parent with this phone
          // Since we don't have a direct API for this, we'll need to implement it
          // For now, we'll just leave maPhuHuynh as null and let backend handle it
          // TODO: Implement parent search by phone
        } catch (err) {
          console.warn("Could not find parent by phone:", err)
        }
      }
      
      const payload = {
        hoTen: studentName.trim(),
        lop: grade.trim(),
        ngaySinh: birthDate,
      }
      
      if (mode === "edit" && initial?.id != null) {
        const updatedRes = await apiClient.updateStudent(initial.id, payload)
        const updated = (updatedRes as any).data || updatedRes
        toast({ title: "Thành công", description: "Đã cập nhật học sinh" })
        onUpdated?.(updated)
        onClose()
      } else {
        const createdRes = await apiClient.createStudent(payload)
        const created = (createdRes as any).data || createdRes
        toast({ title: "Thành công", description: "Đã thêm học sinh mới" })
        onCreated?.(created)
        onClose()
      }
    } catch (err: any) {
      toast({ title: "Không thành công", description: err?.message || "Tạo học sinh thất bại", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="studentName">Tên học sinh *</Label>
          <Input
            id="studentName"
            placeholder="Nguyễn Văn A"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="grade">Lớp *</Label>
          <Input id="grade" placeholder="Lớp 5A" value={grade} onChange={(e) => setGrade(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="birthDate">Ngày sinh *</Label>
        <Input 
          id="birthDate" 
          type="date" 
          value={birthDate} 
          onChange={(e) => setBirthDate(e.target.value)} 
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="parentName">Tên phụ huynh (tùy chọn)</Label>
          <Input
            id="parentName"
            placeholder="Nguyễn Văn X"
            value={parentName}
            onChange={(e) => setParentName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="parentPhone">SĐT phụ huynh (tùy chọn)</Label>
          <Input
            id="parentPhone"
            placeholder="0901234567"
            value={parentPhone}
            onChange={(e) => setParentPhone(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="pickup">Điểm đón</Label>
          <Select>
            <SelectTrigger id="pickup">
              <SelectValue placeholder="Chọn điểm đón" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="point1">Điểm 1 - Quận 1</SelectItem>
              <SelectItem value="point3">Điểm 3 - Quận 3</SelectItem>
              <SelectItem value="point5">Điểm 5 - Quận 5</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dropoff">Điểm trả</Label>
          <Select>
            <SelectTrigger id="dropoff">
              <SelectValue placeholder="Chọn điểm trả" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="school">Trường TH ABC</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
          Hủy
        </Button>
        <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={submitting}>
          {submitting ? "Đang lưu..." : mode === 'edit' ? "Cập nhật" : "Thêm học sinh"}
        </Button>
      </div>
    </form>
  )
}
