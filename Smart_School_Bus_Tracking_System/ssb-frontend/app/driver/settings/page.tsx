"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { DriverSidebar } from "@/components/driver/driver-sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/hooks/use-toast"

export default function DriverSettings() {
  const { user } = useAuth()

  const [darkMode, setDarkMode] = useState(false)
  const [language, setLanguage] = useState("vi")
  const [notifyDelay, setNotifyDelay] = useState(true)
  const [notifyIncident, setNotifyIncident] = useState(false)

  const handleSave = (section: string) => {
    toast({
      title: "Lưu thành công",
      description: `Cài đặt ${section} đã được cập nhật.`,
    })
  }

  return (
    <DashboardLayout sidebar={<DriverSidebar />}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Cài đặt tài xế</h1>
          <p className="text-muted-foreground mt-1">
            Quản lý cài đặt giao diện và thông báo của ứng dụng.
          </p>
        </div>

        <Separator />

        <Tabs defaultValue="appearance" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="appearance">Giao diện</TabsTrigger>
            <TabsTrigger value="notifications">Thông báo</TabsTrigger>
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
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
