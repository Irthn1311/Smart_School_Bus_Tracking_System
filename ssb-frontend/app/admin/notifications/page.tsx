"use client"

import { useEffect, useState } from "react"
import { useLanguage } from "@/lib/language-context"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bell, CheckCircle, AlertTriangle, Clock, Info, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { apiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

export default function NotificationsPage() {
  const { t } = useLanguage()
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("all")
  const { toast } = useToast()

  // Helper function to map notification type
  const getTimeAgo = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Vừa xong"
    if (diffMins < 60) return `${diffMins} phút trước`
    if (diffHours < 24) return `${diffHours} giờ trước`
    return `${diffDays} ngày trước`
  }

  // Helper to determine notification type
  const getNotificationType = (n: any) => {
    let type = "info"
    console.log('🔍 [getNotificationType] Input:', { loaiThongBao: n.loaiThongBao, tieuDe: n.tieuDe })
    
    if (n.loaiThongBao === "su_co") type = "danger"
    else if (n.loaiThongBao === "chuyen_di") {
      type = n.tieuDe?.includes("hoàn thành") || n.tieuDe?.includes("thành công") ? "success" : "info"
    }
    else if (n.tieuDe?.includes("trễ") || n.tieuDe?.includes("cảnh báo")) type = "warning"
    
    console.log('✅ [getNotificationType] Result:', type)
    return type
  }

  // Initial load from API
  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const res = await apiClient.getNotifications({ limit: 100 })
        console.log('🔍 [ADMIN LOAD] Raw API response:', res)
        const arr = Array.isArray(res?.data) ? res.data : []
        console.log('🔍 [ADMIN LOAD] Total notifications from API:', arr.length)
        
        const mapped = arr.map((n: any) => {
          const dt = n.thoiGianGui ? new Date(n.thoiGianGui) : new Date()
          const timeAgo = getTimeAgo(dt)
          const type = getNotificationType(n)
          
          console.log('📋 [ADMIN LOAD] Processing notification:', {
            maThongBao: n.maThongBao,
            loaiThongBao: n.loaiThongBao,
            tieuDe: n.tieuDe,
            calculatedType: type,
            daDoc: n.daDoc
          })
          
          return {
            id: String(n.maThongBao || n.id || Date.now()),
            type,
            title: n.tieuDe || "Thông báo",
            description: n.noiDung || "",
            time: timeAgo,
            read: !!n.daDoc,
          }
        })
        console.log('✅ [ADMIN LOAD] Mapped notifications:', mapped.length, mapped)
        setNotifications(mapped)
      } catch (e) {
        console.error("Failed to load notifications", e)
        toast({ title: t("common.error"), description: t("notifications.loadError"), variant: "destructive" })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [toast])

  // 🔔 REALTIME: Listen for new notifications via window event
  useEffect(() => {
    const handleNewNotification = (event: any) => {
      const payload = event.detail
      console.log('🔔 [ADMIN NOTIF] Received new notification:', payload)
      console.log('🔔 [ADMIN NOTIF] Event type:', event.type)
      console.log('🔔 [ADMIN NOTIF] Payload details:', {
        maThongBao: payload.maThongBao,
        loaiThongBao: payload.loaiThongBao,
        tieuDe: payload.tieuDe,
        noiDung: payload.noiDung
      })

      const dt = payload.thoiGianGui ? new Date(payload.thoiGianGui) : new Date()
      const type = getNotificationType(payload)
      console.log('🔍 [ADMIN NOTIF] Calculated type:', type, 'from loaiThongBao:', payload.loaiThongBao)
      
      const newNotif = {
        id: String(payload.maThongBao || Date.now()),
        type,
        title: payload.tieuDe || "Thông báo",
        description: payload.noiDung || "",
        time: "Vừa xong",
        read: false,
      }

      console.log('✅ [ADMIN NOTIF] Adding to list:', newNotif)
      setNotifications((prev) => {
        console.log('📊 [ADMIN NOTIF] Current list size:', prev.length)
        const updated = [newNotif, ...prev]
        console.log('📊 [ADMIN NOTIF] New list size:', updated.length)
        return updated
      })

      // Show toast for important notifications
      if (type === "danger" || type === "warning") {
        toast({
          title: newNotif.title,
          description: newNotif.description,
          variant: type === "danger" ? "destructive" : "default",
        })
      }
    }

    window.addEventListener("notificationNew", handleNewNotification)
    return () => {
      window.removeEventListener("notificationNew", handleNewNotification)
    }
  }, [toast])

  const markAllRead = async () => {
    try {
      await apiClient.markAllNotificationsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      toast({ title: t("common.success"), description: t("notifications.markAllReadSuccess") })
    } catch (e) {
      toast({ title: t("common.error"), description: t("notifications.markAllReadError"), variant: "destructive" })
    }
  }

  const deleteNotification = async (id: string) => {
    // Skip API call if ID is a timestamp (realtime notification not yet in DB)
    const numId = Number(id)
    if (numId > 1000000000000) {
      console.log('⚠️ [ADMIN NOTIF] Skipping delete API for temporary ID:', id)
      // Just remove from local state
      setNotifications((prev) => prev.filter((n) => n.id !== id))
      toast({ title: "Thành công", description: "Đã xóa thông báo" })
      return
    }

    try {
      await apiClient.deleteNotification(numId)
      setNotifications((prev) => prev.filter((n) => n.id !== id))
      toast({ title: t("common.success"), description: t("notifications.deleteSuccess") })
    } catch (e) {
      toast({ title: t("common.error"), description: t("notifications.deleteError"), variant: "destructive" })
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length
  const warningCount = notifications.filter((n) => n.type === "warning" || n.type === "danger").length
  const dangerCount = notifications.filter((n) => n.type === "danger").length
  const successCount = notifications.filter((n) => n.type === "success").length

  const filteredNotifications = filter === "all" 
    ? notifications
    : filter === "unread"
    ? notifications.filter((n) => !n.read)
    : filter === "warning"
    ? notifications.filter((n) => n.type === "warning" || n.type === "danger")
    : notifications.filter((n) => n.type === filter)
  return (
    <DashboardLayout sidebar={<AdminSidebar />}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t("notifications.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("notifications.description")}</p>
          </div>
          <Button variant="outline" onClick={markAllRead} disabled={loading}>
            <CheckCircle className="w-4 h-4 mr-2" />
            {t("notifications.markAllRead")}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-foreground">{unreadCount}</div>
                  <p className="text-sm text-muted-foreground">{t("notifications.unread")}</p>
                </div>
                <Bell className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-warning">{warningCount}</div>
                  <p className="text-sm text-muted-foreground">{t("notifications.warning")}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-warning" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-destructive">{dangerCount}</div>
                  <p className="text-sm text-muted-foreground">{t("notifications.urgent")}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-success">{successCount}</div>
                  <p className="text-sm text-muted-foreground">{t("notifications.success")}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notifications List */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>{t("notifications.list")}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-12 text-center text-muted-foreground">{t("common.loading")}</div>
            ) : (
              <Tabs defaultValue="all" onValueChange={setFilter}>
                <TabsList className="mb-4">
                  <TabsTrigger value="all">{t("notifications.all")} ({notifications.length})</TabsTrigger>
                  <TabsTrigger value="unread">{t("notifications.unread")} ({unreadCount})</TabsTrigger>
                  <TabsTrigger value="warning">{t("notifications.warning")} ({warningCount})</TabsTrigger>
                  <TabsTrigger value="success">{t("notifications.success")} ({successCount})</TabsTrigger>
                </TabsList>

                <TabsContent value="all">
                  <ScrollArea className="h-[600px] pr-4">
                    <div className="space-y-3">
                      {filteredNotifications.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground">{t("notifications.noNotifications")}</div>
                      ) : (
                        filteredNotifications.map((notification) => (
                          <Card
                            key={notification.id}
                            className={cn(
                              "border transition-colors",
                              notification.read ? "border-border/50 bg-muted/20" : "border-primary/30 bg-card",
                            )}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start gap-4">
                                <div
                                  className={cn(
                                    "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                                    notification.type === "success" && "bg-success/10",
                                    notification.type === "warning" && "bg-warning/10",
                                    notification.type === "danger" && "bg-destructive/10",
                                    notification.type === "info" && "bg-primary/10",
                                  )}
                                >
                                  {notification.type === "success" && <CheckCircle className="w-5 h-5 text-success" />}
                                  {notification.type === "warning" && <Clock className="w-5 h-5 text-warning" />}
                                  {notification.type === "danger" && <AlertTriangle className="w-5 h-5 text-destructive" />}
                                  {notification.type === "info" && <Info className="w-5 h-5 text-primary" />}
                                </div>

                                <div className="flex-1 space-y-1">
                                  <div className="flex items-start justify-between">
                                    <h4 className="font-medium text-foreground">{notification.title}</h4>
                                    {!notification.read && (
                                      <Badge variant="outline" className="border-primary text-primary ml-2">
                                        Mới
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">{notification.description}</p>
                                  <p className="text-xs text-muted-foreground">{notification.time}</p>
                                </div>

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="flex-shrink-0"
                                  onClick={() => deleteNotification(notification.id)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="unread">
                  <ScrollArea className="h-[600px] pr-4">
                    <div className="space-y-3">
                      {filteredNotifications.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground">{t("notifications.noNotifications")}</div>
                      ) : (
                        filteredNotifications.map((notification) => (
                          <Card key={notification.id} className="border-primary/30 bg-card">
                            <CardContent className="p-4">
                              <div className="flex items-start gap-4">
                                <div
                                  className={cn(
                                    "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                                    notification.type === "success" && "bg-success/10",
                                    notification.type === "warning" && "bg-warning/10",
                                    notification.type === "danger" && "bg-destructive/10",
                                    notification.type === "info" && "bg-primary/10",
                                  )}
                                >
                                  {notification.type === "success" && <CheckCircle className="w-5 h-5 text-success" />}
                                  {notification.type === "warning" && <Clock className="w-5 h-5 text-warning" />}
                                  {notification.type === "danger" && (
                                    <AlertTriangle className="w-5 h-5 text-destructive" />
                                  )}
                                  {notification.type === "info" && <Info className="w-5 h-5 text-primary" />}
                                </div>

                                <div className="flex-1 space-y-1">
                                  <h4 className="font-medium text-foreground">{notification.title}</h4>
                                  <p className="text-sm text-muted-foreground">{notification.description}</p>
                                  <p className="text-xs text-muted-foreground">{notification.time}</p>
                                </div>

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="flex-shrink-0"
                                  onClick={() => deleteNotification(notification.id)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="warning">
                  <ScrollArea className="h-[600px] pr-4">
                    <div className="space-y-3">
                      {filteredNotifications.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground">Không có cảnh báo</div>
                      ) : (
                        filteredNotifications.map((notification) => (
                          <Card key={notification.id} className="border-warning/30 bg-card">
                            <CardContent className="p-4">
                              <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
                                  {notification.type === "warning" ? (
                                    <Clock className="w-5 h-5 text-warning" />
                                  ) : (
                                    <AlertTriangle className="w-5 h-5 text-destructive" />
                                  )}
                                </div>
                                <div className="flex-1 space-y-1">
                                  <h4 className="font-medium text-foreground">{notification.title}</h4>
                                  <p className="text-sm text-muted-foreground">{notification.description}</p>
                                  <p className="text-xs text-muted-foreground">{notification.time}</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="flex-shrink-0"
                                  onClick={() => deleteNotification(notification.id)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="success">
                  <ScrollArea className="h-[600px] pr-4">
                    <div className="space-y-3">
                      {filteredNotifications.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground">Không có thông báo thành công</div>
                      ) : (
                        filteredNotifications.map((notification) => (
                          <Card key={notification.id} className="border-success/30 bg-card">
                            <CardContent className="p-4">
                              <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
                                  <CheckCircle className="w-5 h-5 text-success" />
                                </div>
                                <div className="flex-1 space-y-1">
                                  <h4 className="font-medium text-foreground">{notification.title}</h4>
                                  <p className="text-sm text-muted-foreground">{notification.description}</p>
                                  <p className="text-xs text-muted-foreground">{notification.time}</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="flex-shrink-0"
                                  onClick={() => deleteNotification(notification.id)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
