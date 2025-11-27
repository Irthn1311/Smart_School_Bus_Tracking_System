"use client"

import { Badge } from "@/components/ui/badge"
import { MapPin, Navigation } from "lucide-react"

interface Bus {
  id: string
  plateNumber: string
  route: string
  status: string
  lat: number
  lng: number
  speed: number
  students: number
}

interface TrackingMapProps {
  buses: Bus[]
  selectedBus: Bus
  onSelectBus: (bus: Bus) => void
}

export function TrackingMap({ buses, selectedBus, onSelectBus }: TrackingMapProps) {
  return (
    <div className="relative h-[600px] w-full bg-muted/30 rounded-lg overflow-hidden">
      {/* Map Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-success/5">
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="tracking-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#tracking-grid)" />
          </svg>
        </div>
      </div>

      {/* Route Lines */}
      <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
        {/* Route 1 */}
        <path
          d="M 100 450 Q 200 400, 300 420 T 500 400 T 700 420"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          fill="none"
          strokeDasharray="5,5"
          opacity="0.3"
        />
        {/* Route 2 */}
        <path
          d="M 150 200 Q 300 180, 450 200 T 750 180"
          stroke="hsl(var(--warning))"
          strokeWidth="2"
          fill="none"
          strokeDasharray="5,5"
          opacity="0.3"
        />
      </svg>

      {/* Bus Markers */}
      <div className="absolute inset-0 p-8">
        {buses.map((bus, index) => {
          const isSelected = selectedBus.id === bus.id
          const positions = [
            { left: "15%", top: "70%" },
            { left: "35%", top: "30%" },
            { left: "55%", top: "65%" },
            { left: "75%", top: "35%" },
          ]
          const position = positions[index % positions.length]

          return (
            <div
              key={bus.id}
              className="absolute cursor-pointer transition-transform hover:scale-110"
              style={position}
              onClick={() => onSelectBus(bus)}
            >
              <div className="relative group">
                {/* Pulse Effect */}
                {bus.status === "running" && (
                  <div className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
                )}

                {/* Bus Icon */}
                <div
                  className={`relative w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all ${
                    isSelected ? "ring-4 ring-primary/50 scale-110" : ""
                  } ${
                    bus.status === "running" ? "bg-primary" : bus.status === "late" ? "bg-warning" : "bg-destructive"
                  }`}
                >
                  <Navigation className="w-6 h-6 text-white" style={{ transform: "rotate(45deg)" }} />
                </div>

                {/* Speed Indicator */}
                {bus.speed > 0 && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-background border-2 border-border flex items-center justify-center">
                    <span className="text-xs font-bold">{bus.speed}</span>
                  </div>
                )}

                {/* Tooltip */}
                <div
                  className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-3 transition-opacity ${
                    isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  } pointer-events-none`}
                >
                  <div className="bg-card border border-border rounded-lg p-3 shadow-xl whitespace-nowrap">
                    <p className="text-sm font-medium">{bus.plateNumber}</p>
                    <p className="text-xs text-muted-foreground">{bus.route}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          bus.status === "running"
                            ? "border-primary text-primary"
                            : bus.status === "late"
                              ? "border-warning text-warning"
                              : "border-destructive text-destructive"
                        }`}
                      >
                        {bus.status === "running" ? "Đang chạy" : bus.status === "late" ? "Trễ" : "Sự cố"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{bus.students} HS</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-xs text-foreground">Đang chạy</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-warning" />
            <span className="text-xs text-foreground">Trễ</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive" />
            <span className="text-xs text-foreground">Sự cố</span>
          </div>
        </div>
      </div>

      {/* Info Panel */}
      <div className="absolute top-4 right-4 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">{buses.length} xe đang hoạt động</span>
          </div>
          <p className="text-xs text-muted-foreground">Cập nhật: Vừa xong</p>
        </div>
      </div>
    </div>
  )
}
