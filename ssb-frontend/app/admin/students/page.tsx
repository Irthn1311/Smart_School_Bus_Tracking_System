"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Search, Edit, Trash2, Eye, User } from "lucide-react"
import { StudentForm } from "@/components/admin/student-form"
import { apiClient } from "@/lib/api"
type Student = { id: string; name: string; grade?: string; parentName?: string; parentPhone?: string; pickupPoint?: string; dropoffPoint?: string; status?: string; raw?: any }
// tạo dữ liệu giả cho các học sinh
export default function StudentsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function mapStudent(s: any): Student {
    return {
      id: String(s.maHocSinh || s.id || s._id || ''),
      name: s.hoTen || s.ten || s.name || '',
      grade: s.lop || s.grade,
      parentName: s.tenPhuHuynh || s.parentName,
      parentPhone: s.sdtPhuHuynh || s.parentPhone,
      pickupPoint: s.diemDon || s.pickupPoint,
      dropoffPoint: s.diemTra || s.dropoffPoint,
      status: s.trangThai || s.status,
      raw: s,
    }
  }

  async function fetchStudents() {
    setLoading(true)
    setError(null)
    try {
      const res = await apiClient.getStudents({ limit: 100 })
      const data = (res as any).data || []
      const items = Array.isArray(data) ? data : data?.data || []
      setStudents(items.map(mapStudent))
    } catch (e: any) {
      setError(e?.message || "Không lấy được danh sách học sinh")
      console.error("Lỗi khi lấy danh sách học sinh:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStudents()
  }, [])
  const filteredStudents = students.filter(
    (student) =>
      (student.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (student.parentName || '').toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <DashboardLayout sidebar={<AdminSidebar />}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Quản lý Học sinh</h1>
            <p className="text-muted-foreground mt-1">Quản lý thông tin học sinh và phụ huynh</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Thêm học sinh
              </Button>
            </DialogTrigger>
              <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Thêm học sinh mới</DialogTitle>
                <DialogDescription>Nhập thông tin học sinh và phụ huynh</DialogDescription>
              </DialogHeader>
                <StudentForm onClose={() => setIsAddDialogOpen(false)} onCreated={() => fetchStudents()} />
            </DialogContent>
          </Dialog>
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Chỉnh sửa học sinh</DialogTitle>
                <DialogDescription>Cập nhật thông tin học sinh và phụ huynh</DialogDescription>
              </DialogHeader>
              <StudentForm
                mode="edit"
                initial={{
                  id: editingStudent?.id,
                  hoTen: editingStudent?.name,
                  lop: editingStudent?.grade,
                  tenPhuHuynh: editingStudent?.parentName,
                  sdtPhuHuynh: editingStudent?.parentPhone,
                }}
                onClose={() => setIsEditDialogOpen(false)}
                onUpdated={() => fetchStudents()}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-foreground">{students.length}</div>
              <p className="text-sm text-muted-foreground">Tổng học sinh</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-success">342</div>
              <p className="text-sm text-muted-foreground">Đang trên xe</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-warning">12</div>
              <p className="text-sm text-muted-foreground">Vắng hôm nay</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-primary">102</div>
              <p className="text-sm text-muted-foreground">Đã đến trường</p>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Danh sách học sinh</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm theo tên học sinh hoặc phụ huynh..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading && <div className="py-4">Đang tải danh sách học sinh...</div>}
            {error && <div className="py-4 text-destructive">{error}</div>}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Học sinh</TableHead>
                  <TableHead>Lớp</TableHead>
                  <TableHead>Phụ huynh</TableHead>
                  <TableHead>Điểm đón</TableHead>
                  <TableHead>Điểm trả</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={`/.jpg?height=32&width=32&query=${student.name}`} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {student.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{student.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{student.grade || '-'}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <User className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm">{student.parentName || '-'}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{student.parentPhone || '-'}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{student.pickupPoint || '-'}</TableCell>
                    <TableCell className="text-sm">{student.dropoffPoint || '-'}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          student.status === "present" || student.status === "co_mat"
                            ? "border-success text-success"
                            : "border-warning text-warning"
                        }
                      >
                        {student.status === "present" || student.status === "co_mat" ? "Có mặt" : "Vắng"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { setEditingStudent(student); setIsEditDialogOpen(true) }}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={async () => {
                            if (!confirm('Xóa học sinh này?')) return
                            try {
                              await apiClient.deleteStudent(student.id)
                              fetchStudents()
                            } catch (err: any) {
                              console.error(err)
                              alert(err?.message || 'Xóa thất bại')
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
