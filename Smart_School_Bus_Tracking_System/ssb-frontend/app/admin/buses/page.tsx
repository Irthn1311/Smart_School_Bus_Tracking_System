"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Search, Edit, Trash2, Eye, List, Grid3x3, LayoutGrid, Filter, Loader2, Calendar, CheckCircle2, XCircle, AlertCircle, Route, Clock, User } from "lucide-react"
import { BusForm } from "@/components/admin/bus-form"
import { getBusesWithMeta } from "@/lib/services/bus.service"
import { apiClient } from '@/lib/api'
import { useToast } from "@/hooks/use-toast"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"

type BusType = { 
  id: string
  plateNumber: string
  model?: string
  capacity?: number
  status?: string
  raw?: any
  maXe?: number
  bienSoXe?: string
  dongXe?: string
  sucChua?: number
  trangThai?: string
  ngayTao?: string
  ngayCapNhat?: string
}

type ViewMode = "table" | "grid" | "card"
// state for buses
// will be fetched from backend via busService.getBuses()

export default function BusesPage() {
  const { toast } = useToast()
  const router = useRouter()
  const [busSchedules, setBusSchedules] = useState<Record<string, any>>({})
  const [selectedBus, setSelectedBus] = useState<BusType | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingBus, setEditingBus] = useState<BusType | null>(null)
  const [buses, setBuses] = useState<BusType[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<string>('maXe')
  const [sortDir, setSortDir] = useState<'ASC'|'DESC'>('DESC')
  const [viewMode, setViewMode] = useState<ViewMode>("table")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [deletingBusId, setDeletingBusId] = useState<string | null>(null)

  // Map any status string from list to backend enum for BusForm
  const toBEStatus = (s?: string) => (
    s === 'active' ? 'hoat_dong' :
    s === 'maintenance' ? 'bao_tri' :
    s === 'inactive' ? 'ngung_hoat_dong' :
    s === 'hoat_dong' || s === 'bao_tri' || s === 'ngung_hoat_dong' ? s : undefined
  ) as any

  // Map backend status to display text
  const getStatusDisplay = (status?: string) => {
    if (!status) return "Không xác định"
    const normalized = status.toLowerCase()
    if (normalized === 'hoat_dong' || normalized === 'active') return "Hoạt động"
    if (normalized === 'bao_tri' || normalized === 'maintenance') return "Bảo trì"
    if (normalized === 'ngung_hoat_dong' || normalized === 'inactive') return "Ngưng hoạt động"
    return status
  }

  // Get status badge variant
  const getStatusBadge = (status?: string) => {
    if (!status) return { variant: "outline" as const, className: "border-muted text-muted" }
    const normalized = status.toLowerCase()
    if (normalized === 'hoat_dong' || normalized === 'active') {
      return { variant: "outline" as const, className: "border-green-500 text-green-700 bg-green-50" }
    }
    if (normalized === 'bao_tri' || normalized === 'maintenance') {
      return { variant: "outline" as const, className: "border-orange-500 text-orange-700 bg-orange-50" }
    }
    if (normalized === 'ngung_hoat_dong' || normalized === 'inactive') {
      return { variant: "outline" as const, className: "border-gray-500 text-gray-700 bg-gray-50" }
    }
    return { variant: "outline" as const, className: "border-muted text-muted" }
  }

  // Hàm reload lại danh sách (bỏ trong useCallback nếu tối ưu hơn)
  const reloadBuses = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getBusesWithMeta({ limit: 100, sortBy, sortDir })
      const schRes = await (apiClient.getSchedules as any)({ dangApDung: 'true' })
      const schArr: any[] = Array.isArray(schRes?.data) ? schRes.data : Array.isArray(schRes) ? schRes : [];
      const schMap: Record<string, any> = {}
      schArr.forEach(sch => { if (sch.maXe) schMap[String(sch.maXe)] = sch })
      
      // Map buses với đầy đủ thông tin từ database
      const mapped: BusType[] = (res.items || []).map((b: any) => ({
        id: String(b.id || b.raw?.maXe || ''),
        plateNumber: b.plateNumber || b.raw?.bienSoXe || '',
        model: b.model || b.raw?.dongXe,
        capacity: b.capacity || b.raw?.sucChua,
        status: b.status || b.raw?.trangThai,
        maXe: b.raw?.maXe || Number(b.id) || undefined,
        bienSoXe: b.raw?.bienSoXe || b.plateNumber,
        dongXe: b.raw?.dongXe || b.model,
        sucChua: b.raw?.sucChua || b.capacity,
        trangThai: b.raw?.trangThai || b.status,
        ngayTao: b.raw?.ngayTao || b.createdAt,
        ngayCapNhat: b.raw?.ngayCapNhat,
        raw: b.raw || b,
      }))
      
      setBuses(mapped)
      setBusSchedules(schMap)
    } catch (err: any) {
      setError(err?.message || 'Không lấy được danh sách xe')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await getBusesWithMeta({ limit: 100, sortBy, sortDir })
        // Lấy tất cả schedule có dangApDung=true
        const schRes = await (apiClient.getSchedules as any)({ dangApDung: 'true' })
        const schArr: any[] = Array.isArray(schRes?.data) ? schRes.data : Array.isArray(schRes) ? schRes : [];
        // Build map: maXe => schedule info
        const schMap: Record<string, any> = {}
        schArr.forEach(sch => {
          if (sch.maXe) schMap[String(sch.maXe)] = sch
        })
        
        if (mounted) {
          // Map buses với đầy đủ thông tin từ database
          const mapped: BusType[] = (res.items || []).map((b: any) => ({
            id: String(b.id || b.raw?.maXe || ''),
            plateNumber: b.plateNumber || b.raw?.bienSoXe || '',
            model: b.model || b.raw?.dongXe,
            capacity: b.capacity || b.raw?.sucChua,
            status: b.status || b.raw?.trangThai,
            maXe: b.raw?.maXe || Number(b.id) || undefined,
            bienSoXe: b.raw?.bienSoXe || b.plateNumber,
            dongXe: b.raw?.dongXe || b.model,
            sucChua: b.raw?.sucChua || b.capacity,
            trangThai: b.raw?.trangThai || b.status,
            ngayTao: b.raw?.ngayTao || b.createdAt,
            ngayCapNhat: b.raw?.ngayCapNhat,
            raw: b.raw || b,
          }))
          
          setBuses(mapped)
          setBusSchedules(schMap)
        }
      } catch (err: any) {
        console.error('Lỗi khi lấy danh sách xe:', err)
        if (mounted) setError(err?.message || 'Không lấy được danh sách xe')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [sortBy, sortDir])

  // Filter buses
  const filteredBuses = buses.filter((bus) => {
    // Search filter
    const matchesSearch = 
      (bus.plateNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (bus.model || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (bus.bienSoXe || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (bus.dongXe || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(bus.maXe || bus.id || '').includes(searchQuery)
    
    if (!matchesSearch) return false

    // Status filter
    if (statusFilter !== "all") {
      const normalizedStatus = (bus.status || bus.trangThai || '').toLowerCase()
      if (statusFilter === "hoat_dong" && normalizedStatus !== 'hoat_dong' && normalizedStatus !== 'active') return false
      if (statusFilter === "bao_tri" && normalizedStatus !== 'bao_tri' && normalizedStatus !== 'maintenance') return false
      if (statusFilter === "ngung_hoat_dong" && normalizedStatus !== 'ngung_hoat_dong' && normalizedStatus !== 'inactive') return false
    }

    return true
  })

  const handleDeleteBus = async (busId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa xe buýt này?')) return
    
    try {
      setDeletingBusId(busId)
      await apiClient.deleteBus(busId)
      toast({
        title: "Thành công",
        description: "Đã xóa xe buýt thành công",
      })
      await reloadBuses()
    } catch (err: any) {
      console.error("Error deleting bus:", err)
      toast({
        title: "Lỗi",
        description: err?.message || "Không thể xóa xe buýt",
        variant: "destructive",
      })
    } finally {
      setDeletingBusId(null)
    }
  }

  return (
    <DashboardLayout sidebar={<AdminSidebar />}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Quản lý Xe buýt</h1>
            <p className="text-muted-foreground mt-1">Quản lý thông tin và trạng thái xe buýt</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Thêm xe mới
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Thêm xe buýt mới</DialogTitle>
                <DialogDescription>Nhập thông tin xe buýt để thêm vào hệ thống</DialogDescription>
              </DialogHeader>
              <BusForm onClose={() => setIsAddDialogOpen(false)} onCreated={() => {
                // refresh list after creation
                (async () => {
                  try {
                    setLoading(true)
                    const res = await apiClient.getBuses({ limit: 100 })
                    const data = (res as any).data || []
                    const items = Array.isArray(data) ? data : data?.data || []
                    const mapped: BusType[] = items.map((b: any) => ({
                      id: String(b.maXe || b.id || b._id || ''),
                      plateNumber: b.bienSoXe || b.plateNumber || '',
                      model: b.model || '',
                      capacity: b.sucChua || b.capacity,
                      status: b.trangThai || b.status,
                      raw: b,
                    }))
                    setBuses(mapped)
                  } finally {
                    setLoading(false)
                  }
                })()
              }} />
            </DialogContent>
          </Dialog>
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Chỉnh sửa xe buýt</DialogTitle>
                <DialogDescription>Cập nhật thông tin xe buýt</DialogDescription>
              </DialogHeader>
              <BusForm
                mode="edit"
                initialBus={{
                  id: editingBus?.id,
                  bienSoXe: editingBus?.bienSoXe || editingBus?.plateNumber,
                  sucChua: editingBus?.sucChua || editingBus?.capacity,
                  trangThai: toBEStatus(editingBus?.status || editingBus?.trangThai),
                  dongXe: editingBus?.dongXe || editingBus?.model,
                }}
                onClose={() => {
                  setIsEditDialogOpen(false)
                  setEditingBus(null)
                }}
                onUpdated={async () => {
                  await reloadBuses()
                  toast({
                    title: "Thành công",
                    description: "Đã cập nhật thông tin xe buýt",
                  })
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-border/50">
            <CardContent className="pt-6">
                <div className="text-2xl font-bold text-foreground">{buses.length}</div>
                <p className="text-sm text-muted-foreground">Tổng số xe</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-6">
                <div className="text-2xl font-bold text-success">{buses.filter(b => b.status === 'hoat_dong' || b.status === 'active').length}</div>
                <p className="text-sm text-muted-foreground">Đang hoạt động</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-6">
                <div className="text-2xl font-bold text-warning">{buses.filter(b => b.status === 'bao_tri' || b.status === 'maintenance').length}</div>
                <p className="text-sm text-muted-foreground">Đang bảo trì</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-6">
                <div className="text-2xl font-bold text-secondary">{buses.filter(b => b.status === 'ngung_hoat_dong' || b.status === 'inactive').length}</div>
                <p className="text-sm text-muted-foreground">Ngưng hoạt động</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and View Controls */}
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <CardTitle>Danh sách xe buýt ({filteredBuses.length})</CardTitle>
              <div className="flex items-center gap-3 flex-wrap">
                {/* View Mode Toggle */}
                <div className="flex items-center gap-1 border rounded-md p-1">
                  <Button
                    variant={viewMode === "table" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("table")}
                    className="h-8"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className="h-8"
                  >
                    <Grid3x3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === "card" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("card")}
                    className="h-8"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                </div>

                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Lọc trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả trạng thái</SelectItem>
                    <SelectItem value="hoat_dong">Hoạt động</SelectItem>
                    <SelectItem value="bao_tri">Bảo trì</SelectItem>
                    <SelectItem value="ngung_hoat_dong">Ngưng hoạt động</SelectItem>
                  </SelectContent>
                </Select>

                {/* Sort */}
                <div className="hidden md:flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground whitespace-nowrap">Sắp xếp:</Label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="maXe">Mã xe</SelectItem>
                      <SelectItem value="bienSoXe">Biển số</SelectItem>
                      <SelectItem value="sucChua">Sức chứa</SelectItem>
                      <SelectItem value="trangThai">Trạng thái</SelectItem>
                      <SelectItem value="ngayTao">Ngày tạo</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortDir} onValueChange={(v) => setSortDir(v as any)}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ASC">Tăng dần</SelectItem>
                      <SelectItem value="DESC">Giảm dần</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Search */}
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm kiếm..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="text-destructive py-4 text-center">{error}</div>
            ) : filteredBuses.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Không tìm thấy xe buýt nào
              </div>
            ) : viewMode === "table" ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã xe</TableHead>
                    <TableHead>Biển số</TableHead>
                    <TableHead>Dòng xe</TableHead>
                    <TableHead>Sức chứa</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Tuyến hiện tại</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBuses.map((bus) => {
                    const statusBadge = getStatusBadge(bus.status || bus.trangThai)
                    return (
                      <TableRow key={bus.id}>
                        <TableCell className="font-mono text-sm">{bus.maXe || bus.id}</TableCell>
                        <TableCell className="font-medium">{bus.bienSoXe || bus.plateNumber}</TableCell>
                        <TableCell>{bus.dongXe || bus.model || '-'}</TableCell>
                        <TableCell>{bus.sucChua || bus.capacity || '-'} chỗ</TableCell>
                        <TableCell>
                          <Badge {...statusBadge}>
                            {getStatusDisplay(bus.status || bus.trangThai)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {busSchedules[bus.id] ? (
                            <div className="relative group">
                              <button
                                onClick={() => {
                                  const schedule = busSchedules[bus.id]
                                  if (schedule?.maTuyen) {
                                    router.push(`/admin/routes/${schedule.maTuyen}`)
                                  }
                                }}
                                className="text-left hover:text-primary hover:underline transition-colors cursor-pointer flex items-center gap-1"
                                title={`${busSchedules[bus.id].tenTuyen}${busSchedules[bus.id].loaiChuyen ? ` - ${busSchedules[bus.id].loaiChuyen === 'don_sang' ? 'Đón sáng' : 'Trả chiều'}` : ''}${busSchedules[bus.id].gioKhoiHanh ? ` - ${busSchedules[bus.id].gioKhoiHanh}` : ''}`}
                              >
                                <Route className="w-3 h-3" />
                                <span>{busSchedules[bus.id].tenTuyen || '-'}</span>
                              </button>
                              {/* Custom tooltip */}
                              <div className="absolute bottom-full left-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                <div className="bg-popover border border-border rounded-lg p-2 shadow-lg text-xs whitespace-nowrap max-w-xs">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Route className="w-3 h-3" />
                                    <span className="font-semibold">{busSchedules[bus.id].tenTuyen}</span>
                                  </div>
                                  {busSchedules[bus.id].loaiChuyen && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <Clock className="w-3 h-3" />
                                      <span>
                                        {busSchedules[bus.id].loaiChuyen === 'don_sang' ? 'Đón sáng' : 'Trả chiều'}
                                        {busSchedules[bus.id].gioKhoiHanh && ` - ${busSchedules[bus.id].gioKhoiHanh}`}
                                      </span>
                                    </div>
                                  )}
                                  {busSchedules[bus.id].tenTaiXe && (
                                    <div className="flex items-center gap-2 text-muted-foreground mt-1">
                                      <User className="w-3 h-3" />
                                      <span>Tài xế: {busSchedules[bus.id].tenTaiXe}</span>
                                    </div>
                                  )}
                                  <div className="text-muted-foreground mt-1 pt-1 border-t text-[10px]">
                                    Click để xem chi tiết
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {bus.ngayTao || bus.raw?.ngayTao ? (
                            <div className="relative group">
                              <span 
                                className="text-sm text-muted-foreground cursor-help"
                                title={new Date(bus.ngayTao || bus.raw.ngayTao).toLocaleString("vi-VN", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              >
                                {new Date(bus.ngayTao || bus.raw.ngayTao).toLocaleDateString("vi-VN", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric"
                                })}
                              </span>
                              {/* Custom tooltip */}
                              <div className="absolute bottom-full left-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                <div className="bg-popover border border-border rounded-lg p-2 shadow-lg text-xs whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-3 h-3" />
                                    <span>
                                      {new Date(bus.ngayTao || bus.raw.ngayTao).toLocaleString("vi-VN", {
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit"
                                      })}
                                    </span>
                                  </div>
                                  {bus.ngayCapNhat && bus.ngayCapNhat !== bus.ngayTao && (
                                    <div className="text-muted-foreground pt-1 mt-1 border-t">
                                      Cập nhật: {new Date(bus.ngayCapNhat).toLocaleString("vi-VN", {
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit"
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => { setSelectedBus(bus); setShowDetail(true); }}
                              title="Xem chi tiết"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => { 
                                setEditingBus(bus)
                                setIsEditDialogOpen(true)
                              }}
                              title="Chỉnh sửa"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-destructive hover:text-destructive" 
                              onClick={() => handleDeleteBus(bus.id)}
                              disabled={deletingBusId === bus.id}
                              title="Xóa"
                            >
                              {deletingBusId === bus.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBuses.map((bus) => {
                  const statusBadge = getStatusBadge(bus.status || bus.trangThai)
                  return (
                    <Card key={bus.id} className="border-border/50 hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{bus.bienSoXe || bus.plateNumber}</CardTitle>
                            <p className="text-xs text-muted-foreground mt-1">Mã: {bus.maXe || bus.id}</p>
                          </div>
                          <Badge {...statusBadge} className="text-xs">
                            {getStatusDisplay(bus.status || bus.trangThai)}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Dòng xe:</span>
                          <span className="font-medium">{bus.dongXe || bus.model || '-'}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Sức chứa:</span>
                          <span className="font-medium">{bus.sucChua || bus.capacity || '-'} chỗ</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Tuyến:</span>
                          {busSchedules[bus.id]?.tenTuyen ? (
                            <button
                              onClick={() => {
                                const schedule = busSchedules[bus.id]
                                if (schedule?.maTuyen) {
                                  router.push(`/admin/routes/${schedule.maTuyen}`)
                                }
                              }}
                              className="font-medium hover:text-primary hover:underline transition-colors flex items-center gap-1"
                            >
                              <Route className="w-3 h-3" />
                              {busSchedules[bus.id].tenTuyen}
                            </button>
                          ) : (
                            <span className="font-medium">-</span>
                          )}
                        </div>
                        {bus.ngayTao && (
                          <div className="relative group">
                            <div 
                              className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t cursor-help"
                              title={new Date(bus.ngayTao).toLocaleString("vi-VN", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            >
                              <span>Ngày tạo:</span>
                              <span>{new Date(bus.ngayTao).toLocaleDateString("vi-VN", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric"
                              })}</span>
                            </div>
                            {/* Custom tooltip */}
                            <div className="absolute bottom-full left-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                              <div className="bg-popover border border-border rounded-lg p-2 shadow-lg text-xs whitespace-nowrap">
                                {new Date(bus.ngayTao).toLocaleString("vi-VN", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-2 pt-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => { setSelectedBus(bus); setShowDetail(true); }}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Chi tiết
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => { 
                              setEditingBus(bus)
                              setIsEditDialogOpen(true)
                            }}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Sửa
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteBus(bus.id)}
                            disabled={deletingBusId === bus.id}
                          >
                            {deletingBusId === bus.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ) : (
              // Card view
              <div className="space-y-3">
                {filteredBuses.map((bus) => {
                  const statusBadge = getStatusBadge(bus.status || bus.trangThai)
                  return (
                    <Card key={bus.id} className="border-border/50 hover:bg-muted/30 transition-colors">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-3">
                              <div>
                                <h3 className="font-semibold text-lg">{bus.bienSoXe || bus.plateNumber}</h3>
                                <p className="text-sm text-muted-foreground">Mã xe: {bus.maXe || bus.id}</p>
                              </div>
                              <Badge {...statusBadge}>
                                {getStatusDisplay(bus.status || bus.trangThai)}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Dòng xe</p>
                                <p className="font-medium">{bus.dongXe || bus.model || '-'}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Sức chứa</p>
                                <p className="font-medium">{bus.sucChua || bus.capacity || '-'} chỗ</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Tuyến hiện tại</p>
                                {busSchedules[bus.id]?.tenTuyen ? (
                                  <button
                                    onClick={() => {
                                      const schedule = busSchedules[bus.id]
                                      if (schedule?.maTuyen) {
                                        router.push(`/admin/routes/${schedule.maTuyen}`)
                                      }
                                    }}
                                    className="font-medium hover:text-primary hover:underline transition-colors flex items-center gap-1"
                                  >
                                    <Route className="w-3 h-3" />
                                    {busSchedules[bus.id].tenTuyen}
                                  </button>
                                ) : (
                                  <p className="font-medium">-</p>
                                )}
                              </div>
                              {bus.ngayTao && (
                                <div className="relative group">
                                  <div 
                                    className="cursor-help"
                                    title={new Date(bus.ngayTao).toLocaleString("vi-VN", {
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit"
                                    })}
                                  >
                                    <p className="text-muted-foreground">Ngày tạo</p>
                                    <p className="font-medium text-xs">
                                      {new Date(bus.ngayTao).toLocaleDateString("vi-VN", {
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "numeric"
                                      })}
                                    </p>
                                  </div>
                                  {/* Custom tooltip */}
                                  <div className="absolute bottom-full left-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                    <div className="bg-popover border border-border rounded-lg p-2 shadow-lg text-xs whitespace-nowrap">
                                      {new Date(bus.ngayTao).toLocaleString("vi-VN", {
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit"
                                      })}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => { setSelectedBus(bus); setShowDetail(true); }}
                              title="Xem chi tiết"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => { 
                                setEditingBus(bus)
                                setIsEditDialogOpen(true)
                              }}
                              title="Chỉnh sửa"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-destructive hover:text-destructive" 
                              onClick={() => handleDeleteBus(bus.id)}
                              disabled={deletingBusId === bus.id}
                              title="Xóa"
                            >
                              {deletingBusId === bus.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal chi tiết xe */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chi tiết xe buýt</DialogTitle>
            <DialogDescription>Thông tin đầy đủ về xe buýt</DialogDescription>
          </DialogHeader>
          {selectedBus && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Mã xe</Label>
                  <p className="font-medium font-mono">{selectedBus.maXe || selectedBus.id}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Biển số</Label>
                  <p className="font-medium">{selectedBus.bienSoXe || selectedBus.plateNumber}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Dòng xe</Label>
                  <p className="font-medium">{selectedBus.dongXe || selectedBus.model || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Sức chứa</Label>
                  <p className="font-medium">{selectedBus.sucChua || selectedBus.capacity || '-'} chỗ</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Trạng thái</Label>
                  <div className="mt-1">
                    <Badge {...getStatusBadge(selectedBus.status || selectedBus.trangThai)}>
                      {getStatusDisplay(selectedBus.status || selectedBus.trangThai)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Tuyến hiện tại</Label>
                  <p className="font-medium">{busSchedules[selectedBus.id]?.tenTuyen || '-'}</p>
                </div>
                {selectedBus.ngayTao && (
                  <div>
                    <Label className="text-muted-foreground">Ngày tạo</Label>
                    <p className="font-medium text-sm">
                      {new Date(selectedBus.ngayTao).toLocaleString("vi-VN")}
                    </p>
                  </div>
                )}
                {selectedBus.ngayCapNhat && (
                  <div>
                    <Label className="text-muted-foreground">Ngày cập nhật</Label>
                    <p className="font-medium text-sm">
                      {new Date(selectedBus.ngayCapNhat).toLocaleString("vi-VN")}
                    </p>
                  </div>
                )}
              </div>
              {busSchedules[selectedBus.id] && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2">Lịch trình hiện tại</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Tuyến:</span>
                      <span className="font-medium">{busSchedules[selectedBus.id].tenTuyen || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Loại chuyến:</span>
                      <span className="font-medium">
                        {busSchedules[selectedBus.id].loaiChuyen === 'don_sang' ? 'Đón sáng' : 'Trả chiều'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Giờ khởi hành:</span>
                      <span className="font-medium">{busSchedules[selectedBus.id].gioKhoiHanh || '-'}</span>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowDetail(false)}>
                  Đóng
                </Button>
                <Button onClick={() => {
                  setShowDetail(false)
                  setEditingBus(selectedBus)
                  setIsEditDialogOpen(true)
                }}>
                  <Edit className="w-4 h-4 mr-2" />
                  Chỉnh sửa
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Modal sửa xe (old - keeping for compatibility) */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa xe buýt</DialogTitle>
            <DialogDescription>Cập nhật thông tin xe buýt</DialogDescription>
          </DialogHeader>
          {selectedBus && <BusForm
            onClose={() => setShowEdit(false)}
            onSuccess={() => { 
              setShowEdit(false)
              reloadBuses()
              toast({
                title: "Thành công",
                description: "Đã cập nhật thông tin xe buýt",
              })
            }}
            initialBus={{
              id: selectedBus.id,
              bienSoXe: selectedBus.bienSoXe || selectedBus.plateNumber,
              sucChua: selectedBus.sucChua || selectedBus.capacity,
              trangThai: toBEStatus(selectedBus.status || selectedBus.trangThai),
              dongXe: selectedBus.dongXe || selectedBus.model,
            }}
            mode="edit"
          />}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
