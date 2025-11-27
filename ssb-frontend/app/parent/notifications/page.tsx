"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ParentSidebar } from "@/components/parent/parent-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle2, AlertCircle, Info, MapPin, Clock, Bell, BellOff, Trash2 } from "lucide-react"
import { apiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
// socket events are bridged via window CustomEvent 'notificationNew' in lib/socket

export default function ParentNotifications() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [filter, setFilter] = useState("all")
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user && user.role !== "parent") {
      router.push(`/${user.role}`)
    }
  }, [user, router])

  if (!user || user.role !== "parent") {
    return null
  }

  const iconForType = (t: string) => (t === "warning" ? AlertCircle : t === "success" ? CheckCircle2 : Info)

  // Load initial notifications from API
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const res = await apiClient.getNotifications({ limit: 100 })
        console.log('🔍 [PARENT LOAD] Raw API response:', res)
        const arr = Array.isArray(res?.data) ? res.data : []
        console.log('🔍 [PARENT LOAD] Total notifications from API:', arr.length)
        
        const mapped = arr.map((n: any) => {
          const t = n.loaiThongBao === "su_co" ? "warning" : n.loaiThongBao === "chuyen_di" ? "info" : "info"
          const dt = n.thoiGianGui ? new Date(n.thoiGianGui) : new Date()
          
          console.log('📋 [PARENT LOAD] Processing notification:', {
            maThongBao: n.maThongBao,
            loaiThongBao: n.loaiThongBao,
            tieuDe: n.tieuDe,
            calculatedType: t
          })
          
          return {
            id: n.maThongBao,
            type: t,
            title: n.tieuDe || "Thông báo",
            message: n.noiDung,
            time: dt.toLocaleString("vi-VN"),
            date: dt.toISOString().slice(0, 10),
            read: !!n.daDoc,
            icon: iconForType(t),
          }
        })
        console.log('✅ [PARENT LOAD] Mapped notifications:', mapped.length, mapped)
        setNotifications(mapped)
      } catch (e) {
        setNotifications([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // 🔔 REALTIME: Listen for new notifications
  useEffect(() => {
    const handler = (e: any) => {
      const payload = e.detail
      console.log('🔔 [PARENT NOTIF] Received new notification:', payload)
      console.log('🔔 [PARENT NOTIF] Payload details:', {
        maThongBao: payload.maThongBao,
        loaiThongBao: payload.loaiThongBao,
        tieuDe: payload.tieuDe,
        noiDung: payload.noiDung
      })
      
      const dt = payload.thoiGianGui ? new Date(payload.thoiGianGui) : new Date()
      const t = payload.loaiThongBao === "su_co" ? "warning" : payload.loaiThongBao === "chuyen_di" ? "info" : "info"
      console.log('🔍 [PARENT NOTIF] Calculated type:', t, 'from loaiThongBao:', payload.loaiThongBao)
      
      const item = {
        id: payload.maThongBao || Date.now(),
        type: t,
        title: payload.tieuDe || "Thông báo",
        message: payload.noiDung,
        time: dt.toLocaleString("vi-VN"),
        date: dt.toISOString().slice(0, 10),
        read: false,
        icon: iconForType(t),
      }
      console.log('✅ [PARENT NOTIF] Adding to list (current count:', notifications.length, ')');
      
      // Check for duplicates before adding
      setNotifications((prev) => {
        const exists = prev.some(n => n.id === item.id)
        if (exists) {
          console.log('⚠️ [PARENT NOTIF] Duplicate notification, skipping:', item.id)
          return prev
        }
        console.log('✅ [PARENT NOTIF] Added new notification:', item.id)
        return [item, ...prev]
      })

      // Show toast for urgent notifications
      if (t === "warning") {
        toast({
          title: item.title,
          description: item.message,
          variant: "destructive",
        })
      }
    }
    window.addEventListener("notificationNew", handler)

    return () => {
      window.removeEventListener("notificationNew", handler)
    }
  }, [toast])

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAllRead = async () => {
    try {
      await apiClient.markAllNotificationsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      toast({
        title: "Thành công",
        description: "Đã đánh dấu tất cả thông báo là đã đọc",
      })
    } catch (error: any) {
      console.error("Error marking all as read:", error)
      toast({
        title: "Lỗi",
        description: error?.message || "Không thể đánh dấu đã đọc",
        variant: "destructive",
      })
    }
  }

  const deleteAllRead = async () => {
    try {
      await apiClient.deleteAllReadNotifications()
      setNotifications((prev) => prev.filter((n) => !n.read))
      toast({
        title: "Thành công",
        description: "Đã xóa tất cả thông báo đã đọc",
      })
    } catch (error: any) {
      console.error("Error deleting read notifications:", error)
      toast({
        title: "Lỗi",
        description: error?.message || "Không thể xóa thông báo",
        variant: "destructive",
      })
    }
  }

  const deleteOne = async (id: number) => {
    // Skip API call if ID is a timestamp (realtime notification not yet in DB)
    if (id > 1000000000000) {
      console.log('⚠️ [PARENT NOTIF] Skipping delete API for temporary ID:', id)
      setNotifications((prev) => prev.filter((n) => n.id !== id))
      toast({
        title: "Thành công",
        description: "Đã xóa thông báo",
      })
      return
    }

    try {
      await apiClient.deleteNotification(id)
      setNotifications((prev) => prev.filter((n) => n.id !== id))
      toast({
        title: "Thành công",
        description: "Đã xóa thông báo",
      })
    } catch (error: any) {
      console.error("Error deleting notification:", error)
      toast({
        title: "Lỗi",
        description: error?.message || "Không thể xóa thông báo",
        variant: "destructive",
      })
    }
  }

  const markAsRead = async (id: number) => {
    // Skip if ID is a timestamp (realtime notification not yet in DB)
    if (id > 1000000000000) {
      console.log('⚠️ [PARENT NOTIF] Skipping mark read for temporary ID:', id)
      // Just update local state
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))
      return
    }

    try {
      await apiClient.markNotificationRead(id)
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))
    } catch (error: any) {
      console.error("Error marking notification as read:", error)
    }
  }

  return (
    <DashboardLayout sidebar={<ParentSidebar />}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Thông báo</h1>
            <p className="text-muted-foreground mt-1">Nhận thông báo về chuyến đi của con bạn</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={markAllRead} variant="outline" size="sm" className="gap-2 bg-transparent">
              <Bell className="w-4 h-4" />
              Đánh dấu đã đọc
            </Button>
            <Button onClick={deleteAllRead} variant="outline" size="sm" className="gap-2 bg-transparent">
              <Trash2 className="w-4 h-4" />
              Xóa tất cả
            </Button>
          </div>
        </div>

        {/* Notification Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Chưa đọc</p>
                  <p className="text-2xl font-bold text-primary mt-1">{unreadCount}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Bell className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Hôm nay</p>
                  <p className="text-2xl font-bold text-foreground mt-1">3</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tổng cộng</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{notifications.length}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                  <BellOff className="w-6 h-6 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notifications List */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Danh sách thông báo</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-4">
                <TabsTrigger value="all">Tất cả</TabsTrigger>
                <TabsTrigger value="success">Thành công</TabsTrigger>
                <TabsTrigger value="warning">Cảnh báo</TabsTrigger>
                <TabsTrigger value="info">Thông tin</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-3 mt-6">
                {(loading ? [] : notifications).map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                      notification.read ? "border-border/50 bg-muted/20" : "border-primary/50 bg-primary/5"
                    }`}
                    onClick={() => {
                      if (!notification.read) {
                        markAsRead(notification.id)
                      }
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          notification.type === "success"
                            ? "bg-green-500/10"
                            : notification.type === "warning"
                              ? "bg-orange-500/10"
                              : "bg-primary/10"
                        }`}
                      >
                        <notification.icon
                          className={`w-5 h-5 ${
                            notification.type === "success"
                              ? "text-green-500"
                              : notification.type === "warning"
                                ? "text-orange-500"
                                : "text-primary"
                          }`}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-foreground">{notification.title}</h4>
                              {!notification.read && <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
                            </div>
                            <p className="text-sm text-muted-foreground">{notification.message}</p>
                            <p className="text-xs text-muted-foreground mt-2">{notification.time}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            {!notification.read && (
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  markAsRead(notification.id)
                                }}
                                variant="ghost"
                                size="sm"
                                title="Đánh dấu đã đọc"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteOne(notification.id)
                              }}
                              variant="ghost"
                              size="sm"
                              title="Xóa"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="success" className="space-y-3 mt-6">
                {notifications
                  .filter((n) => n.type === "success")
                  .map((notification) => (
                    <div key={notification.id} className="p-4 rounded-lg border border-border/50 bg-muted/20">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                          <notification.icon className="w-5 h-5 text-green-500" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground">{notification.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                          <p className="text-xs text-muted-foreground mt-2">{notification.time}</p>
                        </div>
                      </div>
                    </div>
                  ))}
              </TabsContent>

              <TabsContent value="warning" className="space-y-3 mt-6">
                {notifications
                  .filter((n) => n.type === "warning")
                  .map((notification) => (
                    <div key={notification.id} className="p-4 rounded-lg border border-border/50 bg-muted/20">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                          <notification.icon className="w-5 h-5 text-orange-500" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground">{notification.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                          <p className="text-xs text-muted-foreground mt-2">{notification.time}</p>
                        </div>
                      </div>
                    </div>
                  ))}
              </TabsContent>

              <TabsContent value="info" className="space-y-3 mt-6">
                {notifications
                  .filter((n) => n.type === "info")
                  .map((notification) => (
                    <div key={notification.id} className="p-4 rounded-lg border border-border/50 bg-muted/20">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <notification.icon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground">{notification.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                          <p className="text-xs text-muted-foreground mt-2">{notification.time}</p>
                        </div>
                      </div>
                    </div>
                  ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
