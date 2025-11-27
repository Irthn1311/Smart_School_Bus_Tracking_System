"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { apiClient } from "@/lib/api"

export default function SettingsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // M8: System settings
  const [geofenceRadiusMeters, setGeofenceRadiusMeters] = useState(60)
  const [delayThresholdMinutes, setDelayThresholdMinutes] = useState(5)
  const [realtimeThrottleSeconds, setRealtimeThrottleSeconds] = useState(2)
  const [mapsProvider, setMapsProvider] = useState<"google" | "osm">("google")

  // Load settings
  useEffect(() => {
    let mounted = true
    async function loadSettings() {
      try {
        setLoading(true)
        const res = await apiClient.getSettings()
        const data = (res as any)?.data
        if (!mounted) return
        if (data) {
          setGeofenceRadiusMeters(data.geofenceRadiusMeters || 60)
          setDelayThresholdMinutes(data.delayThresholdMinutes || 5)
          setRealtimeThrottleSeconds(data.realtimeThrottleSeconds || 2)
          setMapsProvider(data.mapsProvider || "google")
        }
      } catch (e: any) {
        console.error(e)
        setError(e?.message || "Không tải được cài đặt")
      } finally {
        if (mounted) setLoading(false)
      }
    }
    loadSettings()
    return () => { mounted = false }
  }, [])

  const handleSaveSystem = async () => {
    try {
      setSaving(true)
      setError(null)
      await apiClient.updateSettings({
        geofenceRadiusMeters,
        delayThresholdMinutes,
        realtimeThrottleSeconds,
        mapsProvider,
      })
      toast({
        title: "Lưu thành công",
        description: "Cài đặt hệ thống đã được cập nhật và áp dụng",
      })
    } catch (e: any) {
      console.error(e)
      const errorMsg = e?.response?.data?.message || e?.message || "Lỗi khi cập nhật cài đặt"
      setError(errorMsg)
      toast({
        title: "Lỗi",
        description: errorMsg,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout sidebar={<AdminSidebar />}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Cài đặt hệ thống</h1>
          <p className="text-muted-foreground mt-1">
            Quản lý cài đặt tài khoản, giao diện, thông báo và hệ thống.
          </p>
        </div>

        <Separator />

        <Tabs defaultValue="account" className="w-full">
          <TabsList className="mb-4">
            
            <TabsTrigger value="appearance">Giao diện</TabsTrigger>
            <TabsTrigger value="notifications">Thông báo</TabsTrigger>
            <TabsTrigger value="system">Hệ thống</TabsTrigger>
          </TabsList>

          

          {/* --- Giao diện --- */}
          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle>Tùy chỉnh giao diện</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <p>Chế độ tối</p>
                  <Switch checked={darkMode} onCheckedChange={setDarkMode} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Ngôn ngữ</label>
                  <select
                    className="border border-border rounded-md p-2 text-sm w-full bg-background"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    <option value="vi">Tiếng Việt</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={() => handleSave("giao diện")}>Lưu thay đổi</Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* --- Thông báo --- */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Cài đặt thông báo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">

                <div className="flex items-center justify-between">
                  <p>Thông báo khi xe trễ</p>
                  <Switch checked={notifyDelay} onCheckedChange={setNotifyDelay} />
                </div>

                <div className="flex items-center justify-between">
                  <p>Thông báo khi có sự cố</p>
                  <Switch checked={notifyIncident} onCheckedChange={setNotifyIncident} />
                </div>

              </CardContent>
              <CardFooter>
                <Button onClick={() => handleSave("thông báo")}>Lưu thay đổi</Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* --- Hệ thống --- */}
          <TabsContent value="system">
            <Card>
              <CardHeader>
                <CardTitle>Thông số hệ thống</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Lỗi</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div>
                  <Label htmlFor="geofenceRadius">
                    Bán kính geofence (mét)
                  </Label>
                  <Input
                    id="geofenceRadius"
                    type="number"
                    min={20}
                    max={200}
                    value={geofenceRadiusMeters}
                    onChange={(e) => {
                      const val = parseInt(e.target.value)
                      if (!isNaN(val) && val >= 20 && val <= 200) {
                        setGeofenceRadiusMeters(val)
                      }
                    }}
                    disabled={loading || saving}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Khoảng cách phát hiện "đến gần điểm dừng" (20-200 mét)
                  </p>
                </div>
                <div>
                  <Label htmlFor="delayThreshold">
                    Ngưỡng trễ (phút)
                  </Label>
                  <Input
                    id="delayThreshold"
                    type="number"
                    min={1}
                    max={30}
                    value={delayThresholdMinutes}
                    onChange={(e) => {
                      const val = parseInt(e.target.value)
                      if (!isNaN(val) && val >= 1 && val <= 30) {
                        setDelayThresholdMinutes(val)
                      }
                    }}
                    disabled={loading || saving}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Thời gian trễ tối thiểu để phát cảnh báo (1-30 phút)
                  </p>
                </div>
                <div>
                  <Label htmlFor="throttleSeconds">
                    Throttle GPS (giây)
                  </Label>
                  <Input
                    id="throttleSeconds"
                    type="number"
                    min={1}
                    value={realtimeThrottleSeconds}
                    onChange={(e) => {
                      const val = parseInt(e.target.value)
                      if (!isNaN(val) && val >= 1) {
                        setRealtimeThrottleSeconds(val)
                      }
                    }}
                    disabled={loading || saving}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Thời gian tối thiểu giữa 2 lần cập nhật GPS (≥1 giây)
                  </p>
                </div>
                <div>
                  <Label htmlFor="mapsProvider">
                    Maps Provider
                  </Label>
                  <select
                    id="mapsProvider"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={mapsProvider}
                    onChange={(e) => setMapsProvider(e.target.value as "google" | "osm")}
                    disabled={loading || saving}
                  >
                    <option value="google">Google Maps</option>
                    <option value="osm">OpenStreetMap</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Nhà cung cấp bản đồ
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSaveSystem} disabled={loading || saving}>
                  {saving ? "Đang lưu..." : "Lưu cấu hình"}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
