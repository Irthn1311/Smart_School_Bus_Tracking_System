"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Lock, Mail, Phone, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { apiClient } from "@/lib/api"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotEmail, setForgotEmail] = useState("")
  const [forgotPhone, setForgotPhone] = useState("")
  const [forgotLoading, setForgotLoading] = useState(false)
  const { login, loading, user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  // Redirect if already logged in
  useEffect(() => {
    if (user && user.role && !loading) {
      const userRole = user.role.toLowerCase()
      if (userRole === "admin" || userRole === "driver" || userRole === "parent") {
        router.push(`/${userRole}`)
      }
    }
  }, [user, loading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập đầy đủ thông tin",
        variant: "destructive",
      })
      return
    }

    try {
      const loggedInUser = await login(email, password)
      toast({
        title: "Đăng nhập thành công",
        description: `Chào mừng bạn đến với SSB 1.0`,
      })
      
      // Redirect based on user role
      const userRole = loggedInUser.role?.toLowerCase()
      if (userRole === "parent") {
        // Kiểm tra số học sinh của phụ huynh
        try {
          const studentsRes = await apiClient.getStudentsByParent()
          const studentsData = (studentsRes as any).data || []
          
          if (studentsData.length > 1) {
            // Nếu có nhiều hơn 1 học sinh, chuyển đến trang chọn học sinh
            router.push("/parent/select-student")
          } else if (studentsData.length === 1) {
            // Nếu chỉ có 1 học sinh, lưu vào localStorage và chuyển đến trang chính
            if (typeof window !== "undefined") {
              localStorage.setItem("selected_student_id", String(studentsData[0].maHocSinh))
            }
            router.push("/parent")
          } else {
            // Không có học sinh
            toast({
              title: "Thông báo",
              description: "Bạn chưa có học sinh nào được liên kết",
              variant: "destructive",
            })
            router.push("/parent")
          }
        } catch (err: any) {
          console.error("Error checking students:", err)
          // Nếu lỗi, vẫn chuyển đến trang parent
          router.push("/parent")
        }
      } else if (userRole === "admin" || userRole === "driver") {
        router.push(`/${userRole}`)
      } else {
        // Fallback redirect
        router.push("/")
      }
    } catch (error: any) {
      toast({
        title: "Đăng nhập thất bại",
        description: error?.message || "Email hoặc mật khẩu không đúng",
        variant: "destructive",
      })
    }
  }

  return (
    <div
      className="min-h-screen relative"
      style={{
        backgroundImage: `url('/schoolbus-bg.jpg')`,
        /* make the image slightly smaller and anchor it to the right so left text is clearer */
        backgroundSize: "100% auto",
        backgroundPosition: "right center",
        backgroundRepeat: "no-repeat",
      }}
    >
  {/* Overlay to mute the background so content is readable (slightly less opaque) */}
  <div className="absolute inset-0 bg-[rgba(255,255,255,0.15)] backdrop-blur-sm" />

      <div className="min-h-screen flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left promotional text */}
          <div className="px-6 py-12 text-center lg:text-left">
            <div className="max-w-lg mx-auto lg:mx-0 p-0">
              <h2 className="text-7xl lg:text-8xl font-extrabold text-foreground mb-3">SSB 1.0</h2>
              <p className="text-xl lg:text-2xl text-muted-foreground mb-6 leading-relaxed">
                Hệ thống theo dõi xe buýt trường học thông minh — <strong className="text-primary">giám sát lộ trình</strong>, <strong className="text-primary">an toàn học sinh</strong> và quản lý vận hành.
              </p>
              <ul className="space-y-3 text-sm text-muted-foreground max-w-md mx-auto lg:mx-0">
                <li className="flex items-start gap-2"><span className="text-primary">●</span> Theo dõi thời gian thực</li>
                <li className="flex items-start gap-2"><span className="text-primary">●</span> Quản lý lịch trình và phân công</li>
                <li className="flex items-start gap-2"><span className="text-primary">●</span> Báo cáo và cảnh báo tức thì</li>
              </ul>
            </div>
          </div>

          {/* Right: login form */}
          <div className="px-6 py-8">
            <div className="w-full max-w-md mx-auto">
              <Card className="border-border/50 shadow-xl">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-2xl font-bold">Đăng nhập</CardTitle>
                  <CardDescription>Nhập thông tin để truy cập hệ thống</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Email */}
                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email / Số điện thoại
                      </Label>
                      <Input
                        id="email"
                        type="text"
                        placeholder="admin@school.edu.vn"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-11"
                      />
                    </div>

                    {/* Password */}
                    <div className="space-y-2">
                      <Label htmlFor="password" className="flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        Mật khẩu
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-11"
                      />
                    </div>

                    {/* Forgot Password Link */}
                    <div className="flex justify-end">
                      <Button 
                        variant="link" 
                        className="px-0 text-primary hover:text-primary/80" 
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                      >
                        Quên mật khẩu?
                      </Button>
                    </div>

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                      disabled={loading}
                    >
                      {loading ? "Đang đăng nhập..." : "Đăng nhập"}
                    </Button>

                    {/* Demo credentials removed */}
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Dialog */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Quên mật khẩu</DialogTitle>
            <DialogDescription asChild>
              <div>
                Nhập email hoặc số điện thoại của bạn. Mật khẩu mới sẽ được gửi đến email đã đăng ký.
              </div>
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              
              if (!forgotEmail.trim() && !forgotPhone.trim()) {
                toast({
                  title: "Lỗi",
                  description: "Vui lòng nhập email hoặc số điện thoại",
                  variant: "destructive",
                })
                return
              }

              setForgotLoading(true)
              try {
                const emailValue = forgotEmail.trim() || undefined
                const phoneValue = forgotPhone.trim().replace(/\D/g, '') || undefined
                
                await apiClient.forgotPassword(emailValue, phoneValue)
                
                toast({
                  title: "Thành công",
                  description: "Mật khẩu mới đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.",
                })
                
                setShowForgotPassword(false)
                setForgotEmail("")
                setForgotPhone("")
              } catch (error: any) {
                toast({
                  title: "Lỗi",
                  description: error?.message || "Không thể gửi mật khẩu mới. Vui lòng thử lại sau.",
                  variant: "destructive",
                })
              } finally {
                setForgotLoading(false)
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="forgot-email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </Label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="your-email@example.com"
                value={forgotEmail}
                onChange={(e) => {
                  setForgotEmail(e.target.value)
                  if (e.target.value.trim()) setForgotPhone("") // Clear phone if email is entered
                }}
                disabled={forgotLoading}
              />
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Hoặc</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="forgot-phone" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Số điện thoại
              </Label>
              <Input
                id="forgot-phone"
                type="tel"
                placeholder="0901234567"
                value={forgotPhone}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '') // Chỉ cho phép số
                  setForgotPhone(value)
                  if (value.trim()) setForgotEmail("") // Clear email if phone is entered
                }}
                disabled={forgotLoading}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForgotPassword(false)
                  setForgotEmail("")
                  setForgotPhone("")
                }}
                disabled={forgotLoading}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={forgotLoading}>
                {forgotLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  "Gửi mật khẩu mới"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
