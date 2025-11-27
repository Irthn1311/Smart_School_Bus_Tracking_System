"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Save, Shield, User, Mail, Phone, Globe, Moon } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/hooks/use-toast"

export default function AdminProfile() {
  const { user } = useAuth()
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [openPasswordDialog, setOpenPasswordDialog] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [language, setLanguage] = useState("vi")

  useEffect(() => {
    if (user && user.role !== "admin") {
      router.push(`/${user.role}`)
    }
  }, [user, router])

  if (!user || user.role !== "admin") return null

  const profile = {
    name: "Nguyễn Quản Trị",
    email: "admin@smartbus.vn",
    phone: "0909123456",
    role: "Quản trị viên",
  }

  return (
    <DashboardLayout sidebar={<AdminSidebar />}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Hồ sơ cá nhân</h1>
          <p className="text-muted-foreground mt-1">Quản lý thông tin và bảo mật tài khoản.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/*Thông tin cá nhân */}
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
                  <AvatarFallback className="text-2xl">AD</AvatarFallback>
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
                  <Input defaultValue={profile.name} disabled={!isEditing} />
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" defaultValue={profile.email} disabled={!isEditing} />
                </div>

                <div className="space-y-2">
                  <Label>Số điện thoại</Label>
                  <Input defaultValue={profile.phone} disabled={!isEditing} />
                </div>

                <div className="space-y-2">
                  <Label>Vai trò</Label>
                  <Input defaultValue={profile.role} disabled />
                </div>
              </div>
            </CardContent>
          </Card>

          {/*Thông tin nhanh & Bảo mật */}
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

        {/* Cài đặt thêm
        <Card>
          <CardHeader>
            <CardTitle>Cài đặt hiển thị</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Chế độ tối</span>
              <Switch checked={darkMode} onCheckedChange={setDarkMode} />
            </div>

            <div className="flex items-center justify-between">
              <span>Ngôn ngữ</span>
              <select
                className="border border-border rounded-md p-2 text-sm bg-background"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="vi">Tiếng Việt</option>
                <option value="en">English</option>
              </select>
            </div>
          </CardContent>
        </Card> */}

        {/*Dialog đổi mật khẩu */}
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
              <Button onClick={() => {
                toast({ title: "Thành công", description: "Mật khẩu đã được thay đổi." })
                setOpenPasswordDialog(false)
              }}>
                Lưu thay đổi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
