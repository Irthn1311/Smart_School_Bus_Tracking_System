"use client"

import { useEffect, useState } from "react"
import { useLanguage } from "@/lib/language-context"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Phone,
  Mail,
  Calendar,
  Award,
  User,
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react"
import { DriverForm } from "@/components/admin/driver-form"
import { apiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

type Driver = {
  id: string
  name: string
  email?: string
  phone?: string
  license?: string
  licenseExpiry?: string
  experience?: number
  status?: string
  raw?: any
}

export default function DriversPage() {
  const { t } = useLanguage()
  const [searchQuery, setSearchQuery] = useState("")
  
  const statusConfig = {
    hoat_dong: {
      label: t("drivers.working"),
      variant: "default" as const,
      icon: CheckCircle2,
      className: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
    },
    tam_nghi: {
      label: t("drivers.onLeave"),
      variant: "outline" as const,
      icon: AlertCircle,
      className: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
    },
    nghi_huu: {
      label: t("drivers.retired"),
      variant: "outline" as const,
      icon: XCircle,
      className: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
    },
  }
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null)
  const [viewingDriver, setViewingDriver] = useState<Driver | null>(null)
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  function mapDriver(d: any): Driver {
    return {
      id: String(d.maTaiXe || d.id || d._id || ""),
      name: d.tenTaiXe || d.hoTen || d.userInfo?.hoTen || d.name || "",
      email: d.email || d.userInfo?.email || "",
      phone: d.soDienThoai || d.userInfo?.soDienThoai || "",
      license: d.soBangLai || "",
      licenseExpiry: d.ngayHetHanBangLai || "",
      experience: d.soNamKinhNghiem || 0,
      status: d.trangThai || "hoat_dong",
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
      setError(e?.message || t("drivers.loadError"))
      console.error("Lỗi khi lấy danh sách tài xế:", e)
      toast({
        title: t("common.error"),
        description: e?.message || t("drivers.loadError"),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDrivers()
  }, [])

  const filteredDrivers = drivers.filter((driver) =>
    (driver.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (driver.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (driver.phone || "").includes(searchQuery)
  )

  const stats = {
    total: drivers.length,
    active: drivers.filter((d) => d.status === "hoat_dong").length,
    onLeave: drivers.filter((d) => d.status === "tam_nghi").length,
    retired: drivers.filter((d) => d.status === "nghi_huu").length,
  }

  const handleDelete = async (driver: Driver) => {
    if (!confirm(t("drivers.deleteConfirm", { name: driver.name }))) return
    try {
      await apiClient.deleteDriver(driver.id)
      toast({
        title: t("common.success"),
        description: t("drivers.deleteSuccess"),
      })
      fetchDrivers()
    } catch (err: any) {
      console.error(err)
      toast({
        title: t("common.error"),
        description: err?.message || t("drivers.deleteError"),
        variant: "destructive",
      })
    }
  }

  const handleView = async (driver: Driver) => {
    try {
      const res = await apiClient.getDriverById(driver.id)
      const data = (res as any).data || res
      setViewingDriver(mapDriver(data))
      setIsViewDialogOpen(true)
    } catch (err: any) {
      toast({
        title: t("common.error"),
        description: err?.message || t("drivers.loadError"),
        variant: "destructive",
      })
    }
  }

  return (
    <DashboardLayout sidebar={<AdminSidebar />}>
      <div className="space-y-6 p-6">
        {/* Header Section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{t("drivers.title")}</h1>
            <p className="text-muted-foreground mt-1.5">{t("drivers.description")}</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 shadow-sm">
                <Plus className="w-4 h-4 mr-2" />
                {t("drivers.addNew")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl">{t("drivers.addNew")}</DialogTitle>
                <DialogDescription>
                  {t("drivers.description")}
                </DialogDescription>
              </DialogHeader>
              <DriverForm
                onClose={() => setIsAddDialogOpen(false)}
                onCreated={() => {
                  fetchDrivers()
                  setIsAddDialogOpen(false)
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border/50 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t("drivers.total")}</p>
                  <p className="text-3xl font-bold text-foreground mt-2">{stats.total}</p>
                </div>
                <div className="rounded-full bg-blue-500/10 p-3">
                  <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t("drivers.working")}</p>
                  <p className="text-3xl font-bold text-foreground mt-2">{stats.active}</p>
                </div>
                <div className="rounded-full bg-green-500/10 p-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-gradient-to-br from-yellow-50 to-yellow-100/50 dark:from-yellow-950/20 dark:to-yellow-900/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t("drivers.onLeave")}</p>
                  <p className="text-3xl font-bold text-foreground mt-2">{stats.onLeave}</p>
                </div>
                <div className="rounded-full bg-yellow-500/10 p-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-950/20 dark:to-gray-900/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t("drivers.retired")}</p>
                  <p className="text-3xl font-bold text-foreground mt-2">{stats.retired}</p>
                </div>
                <div className="rounded-full bg-gray-500/10 p-3">
                  <XCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-xl">{t("drivers.list")}</CardTitle>
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t("drivers.search")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">{t("common.loading")}</span>
              </div>
            )}
            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
                {error}
              </div>
            )}
            {!loading && !error && filteredDrivers.length === 0 && (
              <div className="text-center py-12">
                <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{t("common.noResults")}</p>
              </div>
            )}
            {!loading && !error && filteredDrivers.length > 0 && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredDrivers.map((driver) => {
                  const statusInfo = statusConfig[driver.status as keyof typeof statusConfig] || statusConfig.hoat_dong
                  const StatusIcon = statusInfo.icon

                  return (
                    <Card
                      key={driver.id}
                      className="border-border/50 hover:shadow-md transition-shadow duration-200 group"
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-12 h-12 ring-2 ring-border">
                              <AvatarImage src={driver.raw?.anhDaiDien || driver.raw?.userInfo?.anhDaiDien} />
                              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                {driver.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-foreground truncate">{driver.name}</h3>
                              <p className="text-sm text-muted-foreground truncate">{driver.email || "—"}</p>
                            </div>
                          </div>
                          <Badge className={statusInfo.className} variant={statusInfo.variant}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusInfo.label}
                          </Badge>
                        </div>

                        <div className="space-y-2 mb-4">
                          {driver.phone && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="w-4 h-4" />
                              <span>{driver.phone}</span>
                            </div>
                          )}
                          {driver.license && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Award className="w-4 h-4" />
                              <span>{t("drivers.license")} {driver.license}</span>
                            </div>
                          )}
                          {driver.experience !== undefined && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="w-4 h-4" />
                              <span>{driver.experience} {t("drivers.experience")}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 pt-4 border-t">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleView(driver)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            {t("drivers.view")}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              setEditingDriver(driver)
                              setIsEditDialogOpen(true)
                            }}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            {t("drivers.edit")}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(driver)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">{t("drivers.edit")}</DialogTitle>
              <DialogDescription>{t("drivers.description")}</DialogDescription>
            </DialogHeader>
            {editingDriver && (
              <DriverForm
                mode="edit"
                initial={{
                  id: editingDriver.id,
                  name: editingDriver.name,
                  email: editingDriver.email || "",
                  phone: editingDriver.phone || "",
                  license: editingDriver.license || "",
                  licenseExpiry: editingDriver.licenseExpiry || "",
                  experience: editingDriver.experience || 0,
                  status: editingDriver.status || "hoat_dong",
                  raw: editingDriver.raw,
                }}
                onClose={() => {
                  setIsEditDialogOpen(false)
                  setEditingDriver(null)
                }}
                onCreated={() => {
                  fetchDrivers()
                  setIsEditDialogOpen(false)
                  setEditingDriver(null)
                }}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* View Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">Thông tin chi tiết tài xế</DialogTitle>
              <DialogDescription>Xem toàn bộ thông tin của tài xế</DialogDescription>
            </DialogHeader>
            {viewingDriver && (
              <div className="space-y-6">
                {/* Profile Section */}
                <div className="flex items-center gap-4 pb-4 border-b">
                  <Avatar className="w-20 h-20 ring-2 ring-border">
                    <AvatarImage
                      src={viewingDriver.raw?.anhDaiDien || viewingDriver.raw?.userInfo?.anhDaiDien}
                    />
                    <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
                      {viewingDriver.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-foreground">{viewingDriver.name}</h3>
                    <p className="text-muted-foreground">{viewingDriver.email || "—"}</p>
                    <Badge
                      className={`mt-2 ${statusConfig[viewingDriver.status as keyof typeof statusConfig]?.className || statusConfig.hoat_dong.className}`}
                      variant={statusConfig[viewingDriver.status as keyof typeof statusConfig]?.variant || "default"}
                    >
                      {statusConfig[viewingDriver.status as keyof typeof statusConfig]?.label || "Đang làm việc"}
                    </Badge>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Thông tin liên hệ
                  </h4>
                  <div className="grid grid-cols-1 gap-3 pl-6">
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Email:</span>
                      <span className="text-sm font-medium text-foreground">{viewingDriver.email || "—"}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Số điện thoại:</span>
                      <span className="text-sm font-medium text-foreground">{viewingDriver.phone || "—"}</span>
                    </div>
                  </div>
                </div>

                {/* Driver Information */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    Thông tin tài xế
                  </h4>
                  <div className="grid grid-cols-1 gap-3 pl-6">
                    <div className="flex items-center gap-3">
                      <Award className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Số bằng lái:</span>
                      <span className="text-sm font-medium text-foreground">{viewingDriver.license || "—"}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Ngày hết hạn:</span>
                      <span className="text-sm font-medium text-foreground">
                        {viewingDriver.licenseExpiry
                          ? new Date(viewingDriver.licenseExpiry).toLocaleDateString("vi-VN")
                          : "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Kinh nghiệm:</span>
                      <span className="text-sm font-medium text-foreground">
                        {viewingDriver.experience || 0} năm
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setIsViewDialogOpen(false)
                      setEditingDriver(viewingDriver)
                      setIsEditDialogOpen(true)
                    }}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Chỉnh sửa
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setIsViewDialogOpen(false)}
                  >
                    Đóng
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
