"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Bus, CheckCircle, AlertTriangle, Clock, UserCheck } from "lucide-react"
import { cn } from "@/lib/utils"

const activities = [
  {
    id: 1,
    type: "success",
    icon: CheckCircle,
    title: "Xe R01 hoàn thành chuyến",
    description: "Đã trả 28 học sinh",
    time: "2 phút trước",
  },
  {
    id: 2,
    type: "warning",
    icon: Clock,
    title: "Xe R03 trễ 6 phút",
    description: "Tuyến Quận 1 - Quận 3",
    time: "5 phút trước",
  },
  {
    id: 3,
    type: "danger",
    icon: AlertTriangle,
    title: "Sự cố: Xe R05 kẹt xe",
    description: "Tài xế đã báo cáo",
    time: "12 phút trước",
  },
  {
    id: 4,
    type: "info",
    icon: UserCheck,
    title: "Tài xế Nguyễn Văn A đăng nhập",
    description: "Bắt đầu ca làm việc",
    time: "15 phút trước",
  },
  {
    id: 5,
    type: "success",
    icon: Bus,
    title: "Xe R07 bắt đầu chuyến",
    description: "Tuyến Quận 7 - Quận 1",
    time: "18 phút trước",
  },
  {
    id: 6,
    type: "info",
    icon: CheckCircle,
    title: "Phụ huynh xác nhận đón",
    description: "Học sinh Trần Văn B",
    time: "22 phút trước",
  },
]

export function ActivityFeed() {
  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle>Hoạt động gần đây</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex gap-3">
                <div
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                    activity.type === "success" && "bg-success/10",
                    activity.type === "warning" && "bg-warning/10",
                    activity.type === "danger" && "bg-destructive/10",
                    activity.type === "info" && "bg-primary/10",
                  )}
                >
                  <activity.icon
                    className={cn(
                      "w-5 h-5",
                      activity.type === "success" && "text-success",
                      activity.type === "warning" && "text-warning",
                      activity.type === "danger" && "text-destructive",
                      activity.type === "info" && "text-primary",
                    )}
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium text-foreground">{activity.title}</p>
                  <p className="text-xs text-muted-foreground">{activity.description}</p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
