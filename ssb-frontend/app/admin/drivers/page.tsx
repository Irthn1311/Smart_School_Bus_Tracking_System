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
import { Plus, Search, Edit, Trash2, Eye, Phone } from "lucide-react"
import { DriverForm } from "@/components/admin/driver-form"
import { apiClient } from "@/lib/api"
type Driver = { id: string; name: string; phone?: string; license?: string; status?: string; raw?: any }

export default function DriversPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null)
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function mapDriver(d: any): Driver {
    return {
      id: String(d.maTaiXe || d.id || d._id || ''),
      name: d.hoTen || d.userInfo?.hoTen || d.ten || '',
      phone: d.soDienThoai || d.userInfo?.soDienThoai,
      license: d.soBangLai,
      status: d.trangThai,
      raw: d,
    }
  }

  async function fetchDrivers() {
    setLoading(true)
    setError(null)
    try {
      const res = await apiClient.getDrivers({ limit: 100 })
      const data = (res as any).data || []
      const items = Array.isArray(data) ? data : data?.data || []
      setDrivers(items.map(mapDriver))
    } catch (e: any) {
      setError(e?.message || "Không lấy được danh sách tài xế")
      console.error("Lỗi khi lấy danh sách tài xế:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true
    fetchDrivers()
    return () => {
      mounted = false
    }
  }, [])

  const filteredDrivers = drivers.filter((driver) => (driver.name || '').toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <DashboardLayout sidebar={<AdminSidebar />}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Quản lý Tài xế</h1>
            <p className="text-muted-foreground mt-1">Quản lý thông tin và phân công tài xế</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Thêm tài xế
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Thêm tài xế mới</DialogTitle>
                <DialogDescription>Nhập thông tin tài xế để thêm vào hệ thống</DialogDescription>
              </DialogHeader>
              <DriverForm
                onClose={() => setIsAddDialogOpen(false)}
                onCreated={() => {
                  fetchDrivers()
                }}
              />
            </DialogContent>
          </Dialog>
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Chỉnh sửa tài xế</DialogTitle>
                <DialogDescription>Cập nhật thông tin tài xế</DialogDescription>
              </DialogHeader>
              <DriverForm
                mode="edit"
                initial={{
                  id: editingDriver?.id as string,
                  name: (editingDriver?.name || '') as string,
                  phone: (editingDriver?.phone || '') as string,
                  license: (editingDriver?.license || '') as string,
                  email: (editingDriver?.raw?.email || '') as string,
                  raw: editingDriver?.raw,
                }}
                onClose={() => setIsEditDialogOpen(false)}
                onCreated={() => fetchDrivers()}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-foreground">{drivers.length}</div>
              <p className="text-sm text-muted-foreground">Tổng tài xế</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-success">{drivers.filter(d => d.status === 'hoat_dong' || d.status === 'active').length}</div>
              <p className="text-sm text-muted-foreground">Đang làm việc</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-primary">-</div>
              <p className="text-sm text-muted-foreground">Đang lái xe</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-muted-foreground">-</div>
              <p className="text-sm text-muted-foreground">Nghỉ phép</p>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Danh sách tài xế</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm theo tên..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading && <div className="py-4">Đang tải danh sách tài xế...</div>}
            {error && <div className="py-4 text-destructive">{error}</div>}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tài xế</TableHead>
                  <TableHead>Số điện thoại</TableHead>
                  <TableHead>Bằng lái</TableHead>
                  <TableHead>Tuyến gán</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Số chuyến</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDrivers.map((driver) => (
                  <TableRow key={driver.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={`/.jpg?height=32&width=32&query=${driver.name}`} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {driver.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{driver.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Phone className="w-3 h-3 text-muted-foreground" />
                        {driver.phone || '-'}
                      </div>
                    </TableCell>
                    <TableCell>{driver.license || '-'}</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          driver.status === "hoat_dong" || driver.status === "active"
                            ? "border-success text-success"
                            : "border-muted-foreground text-muted-foreground"
                        }
                      >
                        {driver.status === "hoat_dong" || driver.status === "active" ? "Đang làm việc" : "Nghỉ phép"}
                      </Badge>
                    </TableCell>
                    <TableCell>-</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => setIsAddDialogOpen(true)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setEditingDriver(driver); setIsEditDialogOpen(true) }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={async () => {
                            if (!confirm("Xóa tài xế này?")) return
                            try {
                              await apiClient.deleteDriver(driver.id)
                              fetchDrivers()
                            } catch (err: any) {
                              console.error(err)
                              alert(err?.message || "Xóa thất bại")
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
