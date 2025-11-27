"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ParentSidebar } from "@/components/parent/parent-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { User, Mail, Phone, MapPin, Bell, Shield, Save, Loader2, Calendar, CheckCircle2, XCircle, MapPin as MapPinIcon, Cake } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { apiClient } from "@/lib/api"
import { Switch } from "@/components/ui/switch"

export default function ParentProfile() {
  const { user } = useAuth()
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [openPasswordDialog, setOpenPasswordDialog] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  
  // Profile state
  const [profile, setProfile] = useState({
    maNguoiDung: 0,
    hoTen: "",
    email: "",
    soDienThoai: "",
    diaChi: "",
    anhDaiDien: "",
    vaiTro: "",
    ngayTao: "",
    ngayCapNhat: "",
    trangThai: true,
  })
  
  // Form state
  const [formData, setFormData] = useState({
    hoTen: "",
    soDienThoai: "",
    diaChi: "",
  })
  
  // Password form state
  const [passwordData, setPasswordData] = useState({
    matKhauCu: "",
    matKhauMoi: "",
    xacNhanMatKhauMoi: "",
  })
  
  // Children state
  const [children, setChildren] = useState<any[]>([])

  useEffect(() => {
    if (user && user.role !== "parent") {
      router.push(`/${user.role}`)
    }
  }, [user, router])

  // Load profile data
  useEffect(() => {
    async function loadProfile() {
      if (!user || user.role !== "parent") return
      
      try {
        setLoading(true)
        const [profileRes, studentsRes] = await Promise.all([
          apiClient.getProfile(),
          apiClient.getStudentsByParent(),
        ])
        
        const profileData = (profileRes as any)?.data?.user || (profileRes as any)?.data || profileRes || {}
        const students = Array.isArray((studentsRes as any)?.data) ? (studentsRes as any).data : []
        
        setProfile({
          maNguoiDung: profileData.maNguoiDung || user.id || 0,
          hoTen: profileData.hoTen || user.name || "",
          email: profileData.email || user.email || "",
          soDienThoai: profileData.soDienThoai || "",
          diaChi: profileData.diaChi || "",
          anhDaiDien: profileData.anhDaiDien || "",
          vaiTro: profileData.vaiTro || user.role || "",
          ngayTao: profileData.ngayTao || "",
          ngayCapNhat: profileData.ngayCapNhat || "",
          trangThai: profileData.trangThai !== undefined ? profileData.trangThai : true,
        })
        
        setFormData({
          hoTen: profileData.hoTen || user.name || "",
          soDienThoai: profileData.soDienThoai || "",
          diaChi: profileData.diaChi || "",
        })
        
        setChildren(students)
      } catch (error: any) {
        console.error("Error loading profile:", error)
        toast({
          title: "Lỗi",
          description: error?.message || "Không thể tải thông tin hồ sơ",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
    
    loadProfile()
  }, [user])

  if (!user || user.role !== "parent") {
    return null
  }

  const handleSaveProfile = async () => {
    try {
      setSaving(true)
      await apiClient.updateProfile(formData)
      
      // Update local state
      setProfile((prev) => ({ ...prev, ...formData }))
      
      setIsEditing(false)
      toast({
        title: "Thành công",
        description: "Thông tin đã được cập nhật",
      })
    } catch (error: any) {
      console.error("Error updating profile:", error)
      toast({
        title: "Lỗi",
        description: error?.message || "Không thể cập nhật thông tin",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (passwordData.matKhauMoi !== passwordData.xacNhanMatKhauMoi) {
      toast({
        title: "Lỗi",
        description: "Mật khẩu mới và xác nhận không khớp",
        variant: "destructive",
      })
      return
    }
    
    if (passwordData.matKhauMoi.length < 6) {
      toast({
        title: "Lỗi",
        description: "Mật khẩu mới phải có ít nhất 6 ký tự",
        variant: "destructive",
      })
      return
    }
    
    try {
      setChangingPassword(true)
      await apiClient.changePassword(passwordData)
      
      setPasswordData({
        matKhauCu: "",
        matKhauMoi: "",
        xacNhanMatKhauMoi: "",
      })
      setOpenPasswordDialog(false)
      
      toast({
        title: "Thành công",
        description: "Mật khẩu đã được thay đổi",
      })
    } catch (error: any) {
      console.error("Error changing password:", error)
      toast({
        title: "Lỗi",
        description: error?.message || "Không thể đổi mật khẩu",
        variant: "destructive",
      })
    } finally {
      setChangingPassword(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout sidebar={<ParentSidebar />}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Đang tải thông tin...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout sidebar={<ParentSidebar />}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Hồ sơ cá nhân</h1>
          <p className="text-muted-foreground mt-1">Quản lý thông tin cá nhân và cài đặt</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <Card className="lg:col-span-2 border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Thông tin cá nhân</CardTitle>
                <Button
                  variant={isEditing ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  className="gap-2"
                >
                  {isEditing ? (
                    <>
                      <Save className="w-4 h-4" />
                      Lưu thay đổi
                    </>
                  ) : (
                    "Chỉnh sửa"
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="w-24 h-24">
                  <AvatarImage 
                    src={(() => {
                      const imagePath = profile.anhDaiDien;
                      if (!imagePath) return "/placeholder.svg?height=96&width=96";
                      // Nếu đã là full URL thì dùng luôn
                      if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
                        return imagePath;
                      }
                      // Nếu là relative path, thêm base URL
                      const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:4000';
                      const normalizedPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
                      return `${apiBase}${normalizedPath}`;
                    })()}
                  />
                  <AvatarFallback className="text-2xl">
                    {profile.hoTen?.charAt(0)?.toUpperCase() || user.name?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                {isEditing && (
                  <Button variant="outline" size="sm" disabled>
                    Thay đổi ảnh (Sắp có)
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Họ và tên</Label>
                  <Input
                    id="name"
                    value={isEditing ? formData.hoTen : profile.hoTen}
                    onChange={(e) => setFormData({ ...formData, hoTen: e.target.value })}
                    disabled={!isEditing}
                    className="disabled:opacity-100"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    disabled
                    className="disabled:opacity-100 bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">Email không thể thay đổi</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Số điện thoại</Label>
                  <Input
                    id="phone"
                    value={isEditing ? formData.soDienThoai : profile.soDienThoai}
                    onChange={(e) => setFormData({ ...formData, soDienThoai: e.target.value })}
                    disabled={!isEditing}
                    className="disabled:opacity-100"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Địa chỉ</Label>
                  <Input
                    id="address"
                    value={isEditing ? formData.diaChi : profile.diaChi}
                    onChange={(e) => setFormData({ ...formData, diaChi: e.target.value })}
                    disabled={!isEditing}
                    className="disabled:opacity-100"
                  />
                </div>
              </div>
              
              {isEditing && (
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false)
                      setFormData({
                        hoTen: profile.hoTen,
                        soDienThoai: profile.soDienThoai,
                        diaChi: profile.diaChi,
                      })
                    }}
                    disabled={saving}
                  >
                    Hủy
                  </Button>
                  <Button onClick={handleSaveProfile} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Đang lưu...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Lưu thay đổi
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Info */}
          <div className="space-y-6">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Thông tin nhanh</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-muted-foreground">Vai trò</p>
                    <p className="font-medium text-foreground">Phụ huynh</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium text-foreground">{profile.email || user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-muted-foreground">Điện thoại</p>
                    <p className="font-medium text-foreground">{profile.soDienThoai || "—"}</p>
                  </div>
                </div>

                {profile.ngayTao && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-muted-foreground">Ngày tạo tài khoản</p>
                      <p className="font-medium text-foreground">
                        {new Date(profile.ngayTao).toLocaleDateString("vi-VN")}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 text-sm">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    {profile.trangThai ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-muted-foreground">Trạng thái</p>
                    <p className="font-medium text-foreground">
                      {profile.trangThai ? "Hoạt động" : "Đã khóa"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Bảo mật</CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full gap-2 bg-transparent" onClick={() => setOpenPasswordDialog(true)}>
                  <Shield className="w-4 h-4" />
                  Đổi mật khẩu
                </Button>
              </CardContent>
            </Card>

            
          </div>

          
        </div>

        {/* Popup đổi mật khẩu */}
        <Dialog open={openPasswordDialog} onOpenChange={setOpenPasswordDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Đổi mật khẩu</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-3">
              <div className="space-y-2">
                <Label htmlFor="oldPassword">Mật khẩu hiện tại</Label>
                <Input
                  id="oldPassword"
                  type="password"
                  placeholder="Nhập mật khẩu hiện tại"
                  value={passwordData.matKhauCu}
                  onChange={(e) => setPasswordData({ ...passwordData, matKhauCu: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Mật khẩu mới</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                  value={passwordData.matKhauMoi}
                  onChange={(e) => setPasswordData({ ...passwordData, matKhauMoi: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Xác nhận mật khẩu mới</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Nhập lại mật khẩu mới"
                  value={passwordData.xacNhanMatKhauMoi}
                  onChange={(e) => setPasswordData({ ...passwordData, xacNhanMatKhauMoi: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setOpenPasswordDialog(false)
                  setPasswordData({
                    matKhauCu: "",
                    matKhauMoi: "",
                    xacNhanMatKhauMoi: "",
                  })
                }}
                disabled={changingPassword}
              >
                Hủy
              </Button>
              <Button onClick={handleChangePassword} disabled={changingPassword}>
                {changingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  "Lưu thay đổi"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>


        {/* Children Information */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Thông tin con em ({children.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {children.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Chưa có thông tin học sinh
              </div>
            ) : (
              <div className="space-y-4">
                {children.map((child, index) => {
                  const tripInfo = child.tripInfo || {}
                  return (
                    <div key={child.maHocSinh || index} className="p-4 rounded-lg border border-border/50 bg-muted/20">
                      <div className="flex items-start justify-between">
                        <div className="space-y-3 flex-1">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-12 h-12">
                              <AvatarImage 
                                src={(() => {
                                  const imagePath = child.anhDaiDien;
                                  if (!imagePath) return undefined;
                                  // Nếu đã là full URL thì dùng luôn
                                  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
                                    return imagePath;
                                  }
                                  // Nếu là relative path, thêm base URL
                                  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:4000';
                                  const normalizedPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
                                  return `${apiBase}${normalizedPath}`;
                                })()}
                              />
                              <AvatarFallback>
                                {child.hoTen?.charAt(0)?.toUpperCase() || "H"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h4 className="font-semibold text-foreground">{child.hoTen || "Chưa có tên"}</h4>
                              <p className="text-sm text-muted-foreground">{child.lop || "—"}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            {child.ngaySinh && (
                              <div className="flex items-center gap-2">
                                <Cake className="w-4 h-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Ngày sinh:</span>
                                <span className="font-medium text-foreground">
                                  {new Date(child.ngaySinh).toLocaleDateString("vi-VN")}
                                </span>
                              </div>
                            )}
                            {child.diaChi && (
                              <div className="flex items-start gap-2 md:col-span-2">
                                <MapPinIcon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <span className="text-muted-foreground">Địa chỉ: </span>
                                  <span className="font-medium text-foreground">{child.diaChi}</span>
                                </div>
                              </div>
                            )}
                            {child.viDo && child.kinhDo && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground md:col-span-2">
                                <span>Tọa độ: {Number(child.viDo).toFixed(6)}, {Number(child.kinhDo).toFixed(6)}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Tuyến:</span>
                              <span className="font-medium text-foreground">{tripInfo.tenTuyen || "—"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">Xe buýt:</span>
                              <Badge variant="outline">{tripInfo.bienSoXe || "—"}</Badge>
                            </div>
                            {tripInfo.tenTaiXe && (
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Tài xế:</span>
                                <span className="font-medium text-foreground">{tripInfo.tenTaiXe}</span>
                              </div>
                            )}
                            {tripInfo.gioKhoiHanh && (
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Giờ đón:</span>
                                <span className="font-medium text-foreground">{tripInfo.gioKhoiHanh}</span>
                              </div>
                            )}
                            {child.trangThai !== undefined && (
                              <div className="flex items-center gap-2 md:col-span-2">
                                <span className="text-muted-foreground">Trạng thái:</span>
                                {child.trangThai ? (
                                  <Badge className="bg-green-500/20 text-green-700">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Hoạt động
                                  </Badge>
                                ) : (
                                  <Badge className="bg-red-500/20 text-red-700">
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Đã khóa
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>


        
      </div>
    </DashboardLayout>
  )
}
