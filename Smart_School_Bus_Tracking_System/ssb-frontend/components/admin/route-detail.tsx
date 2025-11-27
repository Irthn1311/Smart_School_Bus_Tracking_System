"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Clock, Navigation, Loader2, Route as RouteIcon } from "lucide-react"
import { apiClient } from "@/lib/api"

interface RouteDetailProps {
  routeId: string
}

export function RouteDetail({ routeId }: RouteDetailProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [routeData, setRouteData] = useState<any>(null)

  useEffect(() => {
    async function fetchRouteDetail() {
      try {
        setLoading(true)
        setError(null)
        const res = await apiClient.getRouteById(routeId)
        
        // Handle different response formats
        if ((res as any).success === false) {
          throw new Error((res as any).message || "Không thể tải thông tin tuyến đường")
        }
        
        const data = (res as any).data
        if (!data) {
          throw new Error("Không tìm thấy dữ liệu tuyến đường")
        }
        
        setRouteData(data)
      } catch (err: any) {
        console.error("Error fetching route detail:", err)
        setError(err?.message || err?.error || "Không thể tải thông tin tuyến đường")
      } finally {
        setLoading(false)
      }
    }

    if (routeId) {
      fetchRouteDetail()
    }
  }, [routeId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">{error}</p>
      </div>
    )
  }

  if (!routeData) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Không tìm thấy thông tin tuyến đường</p>
      </div>
    )
  }

  const stops = routeData.diemDung || routeData.stops || []
  const schedules = routeData.schedules || []

  // Calculate route path for visualization
  const calculateRoutePath = () => {
    if (stops.length < 2) return "M 0 0"
    
    const svgWidth = 700
    const svgHeight = 256
    const baseX = 50
    const baseY = svgHeight / 2
    
    const path = stops.map((_: any, index: number) => {
      const x = baseX + (index * (svgWidth - 100) / (stops.length - 1))
      const y = baseY + Math.sin(index * 0.5) * 60
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
    }).join(' ')
    
    return path
  }

  const calculateMarkerPosition = (index: number) => {
    const svgWidth = 700
    const svgHeight = 256
    const baseX = 50
    const baseY = svgHeight / 2
    
    const x = baseX + (index * (svgWidth - 100) / (stops.length - 1))
    const y = baseY + Math.sin(index * 0.5) * 60
    
    return { x, y }
  }

  return (
    <div className="space-y-6">
      {/* Route Info Summary */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <RouteIcon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tên tuyến</p>
                <p className="font-semibold">{routeData.tenTuyen || routeData.name}</p>
              </div>
            </div>
            
            {routeData.diemBatDau && (
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                  <Navigation className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Điểm bắt đầu</p>
                  <p className="font-semibold">{routeData.diemBatDau}</p>
                </div>
              </div>
            )}
            
            {routeData.diemKetThuc && (
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Navigation className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Điểm kết thúc</p>
                  <p className="font-semibold">{routeData.diemKetThuc}</p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-border/50 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Tổng điểm dừng</p>
              <p className="text-2xl font-bold">{stops.length}</p>
            </div>
            {routeData.thoiGianUocTinh && (
              <div>
                <p className="text-xs text-muted-foreground">Thời gian ước tính</p>
                <p className="text-2xl font-bold">{routeData.thoiGianUocTinh} phút</p>
              </div>
            )}
            {schedules.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground">Lịch trình</p>
                <p className="text-2xl font-bold">{schedules.length}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Map Visualization */}
      <Card className="border-border/50">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Bản đồ tuyến đường
          </h3>
          
          {stops.length === 0 ? (
            <div className="h-64 bg-muted/30 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Chưa có điểm dừng</p>
              </div>
            </div>
          ) : (
            <div className="h-64 bg-muted/30 rounded-lg flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-success/5">
                <div className="absolute inset-0 opacity-10">
                  <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <pattern id={`route-grid-${routeId}`} width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill={`url(#route-grid-${routeId})`} />
                  </svg>
                </div>
              </div>

              {/* Route Line */}
              {stops.length >= 2 && (
                <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
                  <path
                    d={calculateRoutePath()}
                    stroke="hsl(var(--primary))"
                    strokeWidth="3"
                    fill="none"
                    strokeDasharray="5,5"
                  />
                </svg>
              )}

              {/* Stop Markers */}
              {stops.map((stop: any, index: number) => {
                const pos = calculateMarkerPosition(index)
                const isLast = index === stops.length - 1
                return (
                  <div
                    key={stop.maDiem || stop.id || index}
                    className="absolute w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg border-2 border-white"
                    style={{ 
                      left: `${pos.x}px`, 
                      top: `${pos.y}px`, 
                      zIndex: 2,
                      transform: 'translate(-50%, -50%)',
                      background: isLast 
                        ? 'linear-gradient(135deg, hsl(var(--success)) 0%, hsl(var(--success)) 100%)'
                        : 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)) 100%)'
                    }}
                  >
                    {isLast ? <Navigation className="w-5 h-5" /> : index + 1}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stops List */}
      {stops.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Danh sách điểm dừng ({stops.length} điểm)
          </h3>
          {stops.map((stop: any, index: number) => (
            <Card key={stop.maDiem || stop.id || index} className="border-border/50 hover:border-primary/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center font-bold border-2 ${
                        index === stops.length - 1
                          ? "bg-success/10 text-success border-success/20"
                          : "bg-primary/10 text-primary border-primary/20"
                      }`}
                    >
                      {index === stops.length - 1 ? <Navigation className="w-6 h-6" /> : index + 1}
                    </div>
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-foreground">{stop.tenDiem || stop.name || `Điểm ${index + 1}`}</h4>
                        {(stop.diaChi || stop.address) && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <MapPin className="w-3 h-3" />
                            {stop.diaChi || stop.address}
                          </div>
                        )}
                      </div>
                      <Badge variant="outline" className={index === stops.length - 1 ? "border-success text-success" : "border-primary text-primary"}>
                        {index === stops.length - 1 ? "Điểm cuối" : `Điểm ${index + 1}`}
                      </Badge>
                    </div>

                    {(stop.viDo || stop.latitude) && (stop.kinhDo || stop.longitude) && (
                      <div className="flex items-center gap-4 text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                        <span>📍 Vĩ độ: {stop.viDo || stop.latitude}</span>
                        <span>•</span>
                        <span>Kinh độ: {stop.kinhDo || stop.longitude}</span>
                      </div>
                    )}

                    {stop.thoiGianDung && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">Dừng lại: {stop.thoiGianDung} phút</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Schedules */}
      {schedules.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground">Lịch trình</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {schedules.map((schedule: any) => (
              <Card key={schedule.maLichTrinh || schedule.id} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{schedule.loaiChuyen === 'don_sang' ? 'Đón sáng' : 'Trả chiều'}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {schedule.gioKhoiHanh || schedule.startTime}
                      </p>
                      {schedule.bienSoXe && (
                        <p className="text-xs text-muted-foreground mt-1">Xe: {schedule.bienSoXe}</p>
                      )}
                    </div>
                    <Badge variant="outline" className={schedule.dangApDung ? "border-success text-success" : "border-muted text-muted"}>
                      {schedule.dangApDung ? "Đang áp dụng" : "Không áp dụng"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
