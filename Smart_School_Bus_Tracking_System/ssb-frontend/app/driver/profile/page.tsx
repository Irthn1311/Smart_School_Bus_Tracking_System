"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { DriverSidebar } from "@/components/driver/driver-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Save, Shield, User, Mail, Phone, Truck, IdCard } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { apiClient } from "@/lib/api"

export default function DriverProfile() {
  const { user } = useAuth()
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [openPasswordDialog, setOpenPasswordDialog] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [profile, setProfile] = useState<{
    name: string
    email: string
    phone?: string
    license?: string
    vehicle?: string
    role: string
  }>({ name: '', email: '', phone: '', license: '', vehicle: '', role: 'Tài xế' })

  useEffect(() => {
    if (user && user.role !== "driver") {
      router.push(`/${user.role}`)
    }
  }, [user, router])

  useEffect(() => {
    async function load() {
      if (!user || user.role !== 'driver') return
      setLoadingProfile(true)
      try {
        // Lấy thông tin tài xế theo id đăng nhập
        const res: any = await apiClient.getDriverById(user.id)
        const data: any = (res?.data ?? res) || {}
        const userInfo = data.userInfo || data.nguoiDung || {}
        const name = userInfo.hoTen || user.name || ''
        const email = userInfo.email || user.email || ''
        const phone = userInfo.soDienThoai || ''
        const license = data.soBangLai || data.license || ''
        // Xe phụ trách: cố gắng suy ra từ lịch trình hiện tại
        const schedules = Array.isArray(data.currentSchedules) ? data.currentSchedules : []
        const vehicle = schedules[0]?.bienSoXe || schedules[0]?.busPlate || ''
        setProfile({ name, email, phone, license, vehicle, role: 'Tài xế' })
      } catch (e) {
        // Fallback: hiển thị thông tin cơ bản từ context
        setProfile({ name: user?.name || '', email: user?.email || '', role: 'Tài xế', phone: '', license: '', vehicle: '' })
      } finally {
        setLoadingProfile(false)
      }
    }
    load()
  }, [user])

  if (!user || user.role !== "driver") return null

  return (
    <DashboardLayout sidebar={<DriverSidebar />}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Hồ sơ tài xế</h1>
          <p className="text-muted-foreground mt-1">Quản lý thông tin cá nhân, xe phụ trách và bảo mật tài khoản.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Thông tin cá nhân */}
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
                  <AvatarImage src="/placeholder.svg" />
                  <AvatarFallback className="text-2xl">TX</AvatarFallback>
                </Avatar>
                {isEditing && (
                  <Button variant="outline" size="sm">
                    Thay đổi ảnh
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Họ và tên</Label>
                  <Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} disabled={!isEditing} />
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} disabled={!isEditing} />
                </div>

                <div className="space-y-2">
                  <Label>Số điện thoại</Label>
                  <Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} disabled={!isEditing} />
                </div>

                <div className="space-y-2">
                  <Label>Số bằng lái</Label>
                  <Input value={profile.license} onChange={(e) => setProfile({ ...profile, license: e.target.value })} disabled={!isEditing} />
                </div>

                <div className="space-y-2">
                  <Label>Xe phụ trách</Label>
                  <Input value={profile.vehicle} onChange={(e) => setProfile({ ...profile, vehicle: e.target.value })} disabled={!isEditing} />
                </div>

                <div className="space-y-2">
                  <Label>Vai trò</Label>
                  <Input defaultValue={profile.role} disabled />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Thông tin nhanh & bảo mật */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Thông tin nhanh</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" /> <span>{profile.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" /> <span>{profile.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-primary" /> <span>{profile.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <IdCard className="w-4 h-4 text-primary" /> <span>{profile.license}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-primary" /> <span>{profile.vehicle}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Bảo mật</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => setOpenPasswordDialog(true)}
                >
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
              <Input type="password" placeholder="Mật khẩu hiện tại" />
              <Input type="password" placeholder="Mật khẩu mới" />
              <Input type="password" placeholder="Xác nhận mật khẩu mới" />
            </div>
            <DialogFooter>
              <Button
                onClick={() => {
                  toast({ title: "Thành công", description: "Mật khẩu đã được thay đổi." })
                  setOpenPasswordDialog(false)
                }}
              >
                Lưu thay đổi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
