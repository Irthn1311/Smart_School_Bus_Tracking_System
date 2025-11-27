"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { IncidentForm } from "@/components/driver/incident-form"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { DriverSidebar } from "@/components/driver/driver-sidebar"
import {
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  Calendar,
  TrendingUp,
  TrendingDown,
} from "lucide-react"
import apiClient from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

type UIIncident = {
  id: string
  type: string
  severity: string
  status: string
  description: string
  location?: string
  date: string
  time: string
  resolvedAt?: string
  affectedStudents?: number
}

export default function DriverIncidentsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [filterSeverity, setFilterSeverity] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [selectedIncident, setSelectedIncident] = useState<any>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [incidents, setIncidents] = useState<UIIncident[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiClient.getIncidents({ limit: 100 })
        const arr = Array.isArray(res?.data) ? res.data : []
        const items = arr.map((i: any) => {
          const dt = i.thoiGianBao ? new Date(i.thoiGianBao) : new Date()
          const severityMap: Record<string, string> = {
            nhe: "Low",
            trung_binh: "Medium",
            nghiem_trong: "High",
          }
          return {
            id: `INC-${i.maSuCo}`,
            type: "Sự cố",
            severity: severityMap[i.mucDo] || "Low",
            status: i.trangThai === "da_xu_ly" ? "Đã xử lý" : i.trangThai === "dang_xu_ly" ? "Đang xử lý" : "Chờ xử lý",
            description: i.moTa,
            location: i.bienSoXe ? `Xe ${i.bienSoXe}` : undefined,
            date: dt.toLocaleDateString("vi-VN"),
            time: dt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
          } as UIIncident
        })
        setIncidents(items)
      } catch (e) {
        setIncidents([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Calculate statistics
  const totalIncidents = incidents.length
  const pendingIncidents = incidents.filter((i) => i.status === "Chờ xử lý" || i.status === "Đang xử lý").length
  const resolvedIncidents = incidents.filter((i) => i.status === "Đã xử lý").length
  const criticalIncidents = incidents.filter((i) => i.severity === "Critical" || i.severity === "High").length

  // Filter incidents
  const filteredIncidents = incidents.filter((incident) => {
    const matchesSearch =
      incident.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (incident.location || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      incident.id.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = filterType === "all" || incident.type === filterType
    const matchesSeverity = filterSeverity === "all" || incident.severity === filterSeverity
    const matchesStatus = filterStatus === "all" || incident.status === filterStatus
    return matchesSearch && matchesType && matchesSeverity && matchesStatus
  })

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "Critical":
        return "bg-destructive text-destructive-foreground"
      case "High":
        return "bg-warning text-warning-foreground"
      case "Medium":
        return "bg-info text-info-foreground"
      case "Low":
        return "bg-muted text-muted-foreground"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Đã xử lý":
        return "bg-success text-success-foreground"
      case "Đang xử lý":
        return "bg-warning text-warning-foreground"
      case "Chờ xử lý":
        return "bg-muted text-muted-foreground"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Đã xử lý":
        return <CheckCircle2 className="w-4 h-4" />
      case "Đang xử lý":
        return <AlertCircle className="w-4 h-4" />
      case "Chờ xử lý":
        return <Clock className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  async function markResolved(incident: UIIncident) {
    try {
      const idNum = Number(incident.id.replace(/[^\d]/g, ""))
      await apiClient.updateIncident(idNum, { trangThai: "da_xu_ly" })
      setIncidents((prev) => prev.map((i) => i.id === incident.id ? { ...i, status: "Đã xử lý" } : i))
      toast({ title: "Đã cập nhật", description: `${incident.id} → Đã xử lý` })
    } catch (e: any) {
      toast({ title: "Cập nhật thất bại", description: e?.message || "Vui lòng thử lại", variant: "destructive" })
    }
  }

  async function removeIncident(incident: UIIncident) {
    try {
      const idNum = Number(incident.id.replace(/[^\d]/g, ""))
      await apiClient.deleteIncident(idNum)
      setIncidents((prev) => prev.filter((i) => i.id !== incident.id))
      toast({ title: "Đã xóa", description: `${incident.id} đã được xóa` })
    } catch (e: any) {
      toast({ title: "Xóa thất bại", description: e?.message || "Vui lòng thử lại", variant: "destructive" })
    }
  }

  return (
    <DashboardLayout sidebar={<DriverSidebar />}>
      <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Báo cáo Sự cố</h1>
          <p className="text-muted-foreground mt-1">Quản lý và theo dõi các sự cố đã báo cáo</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Báo cáo Sự cố Mới
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Báo cáo Sự cố Mới</DialogTitle>
              <DialogDescription>Điền thông tin chi tiết về sự cố đã xảy ra</DialogDescription>
            </DialogHeader>
            <IncidentForm onClose={() => setIsFormOpen(false)} tripId="" />
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Tổng Sự cố</p>
              <p className="text-2xl font-bold text-foreground mt-1">{totalIncidents}</p>
              <div className="flex items-center gap-1 mt-2 text-xs text-success">
                <TrendingDown className="w-3 h-3" />
                <span>-12% so với tháng trước</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Chờ xử lý</p>
              <p className="text-2xl font-bold text-foreground mt-1">{pendingIncidents}</p>
              <div className="flex items-center gap-1 mt-2 text-xs text-warning">
                <TrendingUp className="w-3 h-3" />
                <span>+2 hôm nay</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center">
              <Clock className="w-6 h-6 text-warning" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Đã xử lý</p>
              <p className="text-2xl font-bold text-foreground mt-1">{resolvedIncidents}</p>
              <div className="flex items-center gap-1 mt-2 text-xs text-success">
                <CheckCircle2 className="w-3 h-3" />
                <span>Tỷ lệ: {Math.round((resolvedIncidents / totalIncidents) * 100)}%</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-success" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Nghiêm trọng</p>
              <p className="text-2xl font-bold text-foreground mt-1">{criticalIncidents}</p>
              <div className="flex items-center gap-1 mt-2 text-xs text-destructive">
                <AlertCircle className="w-3 h-3" />
                <span>Cần ưu tiên xử lý</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center">
              <XCircle className="w-6 h-6 text-destructive" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm theo mã, mô tả, địa điểm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full md:w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Loại sự cố" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả loại</SelectItem>
              <SelectItem value="Tắc đường">Tắc đường</SelectItem>
              <SelectItem value="Sự cố xe">Sự cố xe</SelectItem>
              <SelectItem value="Tai nạn">Tai nạn</SelectItem>
              <SelectItem value="Học sinh">Học sinh</SelectItem>
              <SelectItem value="Khác">Khác</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterSeverity} onValueChange={setFilterSeverity}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Mức độ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả mức độ</SelectItem>
              <SelectItem value="Critical">Nghiêm trọng</SelectItem>
              <SelectItem value="High">Cao</SelectItem>
              <SelectItem value="Medium">Trung bình</SelectItem>
              <SelectItem value="Low">Thấp</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="Chờ xử lý">Chờ xử lý</SelectItem>
              <SelectItem value="Đang xử lý">Đang xử lý</SelectItem>
              <SelectItem value="Đã xử lý">Đã xử lý</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Incidents List */}
      <div className="space-y-3">
        {loading ? (
          <Card className="p-12 text-center">Đang tải dữ liệu...</Card>
        ) : filteredIncidents.length === 0 ? (
          <Card className="p-12 text-center">
            <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Không tìm thấy sự cố</h3>
            <p className="text-muted-foreground">Thử thay đổi bộ lọc hoặc tìm kiếm khác</p>
          </Card>
        ) : (
          filteredIncidents.map((incident) => (
            <Card key={incident.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-5 h-5 text-destructive" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <h3 className="font-semibold text-foreground">{incident.id}</h3>
                        <Badge variant="outline" className="text-xs">
                          {incident.type}
                        </Badge>
                        <Badge className={`text-xs ${getSeverityColor(incident.severity)}`}>{incident.severity}</Badge>
                        <Badge className={`text-xs ${getStatusColor(incident.status)} gap-1`}>
                          {getStatusIcon(incident.status)}
                          {incident.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-foreground mb-2">{incident.description}</p>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>{incident.location}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {incident.date} lúc {incident.time}
                          </span>
                        </div>
                        {typeof incident.affectedStudents === "number" && incident.affectedStudents > 0 && (
                          <div className="flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            <span>{incident.affectedStudents} học sinh bị ảnh hưởng</span>
                          </div>
                        )}
                        {incident.resolvedAt && (
                          <div className="flex items-center gap-1 text-success">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Đã xử lý lúc {incident.resolvedAt}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => markResolved(incident)}
                    className="gap-2 bg-transparent"
                    disabled={incident.status === "Đã xử lý"}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Đánh dấu xử lý
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => removeIncident(incident)}
                    className="gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Xóa
                  </Button>
                </div>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 flex-shrink-0 bg-transparent">
                      <Eye className="w-4 h-4" />
                      Chi tiết
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Chi tiết Sự cố {incident.id}</DialogTitle>
                      <DialogDescription>Thông tin đầy đủ về sự cố đã báo cáo</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Loại sự cố</p>
                          <Badge variant="outline">{incident.type}</Badge>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Mức độ nghiêm trọng</p>
                          <Badge className={getSeverityColor(incident.severity)}>{incident.severity}</Badge>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Trạng thái</p>
                          <Badge className={`${getStatusColor(incident.status)} gap-1`}>
                            {getStatusIcon(incident.status)}
                            {incident.status}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Học sinh bị ảnh hưởng</p>
                          <p className="font-semibold text-foreground">{incident.affectedStudents} học sinh</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Mô tả chi tiết</p>
                        <p className="text-sm text-foreground">{incident.description}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Địa điểm</p>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <p className="text-sm text-foreground">{incident.location}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Thời gian xảy ra</p>
                          <p className="text-sm text-foreground">
                            {incident.date} lúc {incident.time}
                          </p>
                        </div>
                        {incident.resolvedAt && (
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Thời gian xử lý</p>
                            <p className="text-sm text-success">{incident.resolvedAt}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  </DashboardLayout>
  )
}
