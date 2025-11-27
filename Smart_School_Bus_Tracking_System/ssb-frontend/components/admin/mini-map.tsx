"use client"

import { Badge } from "@/components/ui/badge"
import { MapPin } from "lucide-react"

const buses = [
  { id: "R01", lat: 10.762622, lng: 106.660172, status: "running", label: "Quận 1" },
  { id: "R03", lat: 10.772622, lng: 106.670172, status: "late", label: "Quận 3" },
  { id: "R05", lat: 10.752622, lng: 106.650172, status: "incident", label: "Quận 5" },
  { id: "R07", lat: 10.742622, lng: 106.640172, status: "running", label: "Quận 7" },
]

export function MiniMap() {
  return (
    <div className="relative h-[400px] w-full bg-muted/30 rounded-lg overflow-hidden">
      {/* Map Background - Placeholder */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-success/5">
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
      </div>

      {/* Bus Markers */}
      <div className="absolute inset-0 p-8">
        {buses.map((bus, index) => (
          <div
            key={bus.id}
            className="absolute animate-pulse"
            style={{
              left: `${20 + index * 20}%`,
              top: `${30 + (index % 2) * 30}%`,
            }}
          >
            <div className="relative group cursor-pointer">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${
                  bus.status === "running" ? "bg-primary" : bus.status === "late" ? "bg-warning" : "bg-destructive"
                }`}
              >
                <MapPin className="w-5 h-5 text-white" />
              </div>

              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="bg-card border border-border rounded-lg p-3 shadow-xl whitespace-nowrap">
                  <p className="text-sm font-medium">{bus.id}</p>
                  <p className="text-xs text-muted-foreground">{bus.label}</p>
                  <Badge
                    variant="outline"
                    className={`mt-1 text-xs ${
                      bus.status === "running"
                        ? "border-primary text-primary"
                        : bus.status === "late"
                          ? "border-warning text-warning"
                          : "border-destructive text-destructive"
                    }`}
                  >
                    {bus.status === "running" ? "Đang chạy" : bus.status === "late" ? "Trễ" : "Sự cố"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-xs text-foreground">Đang chạy (12)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-warning" />
            <span className="text-xs text-foreground">Trễ (3)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive" />
            <span className="text-xs text-foreground">Sự cố (1)</span>
          </div>
        </div>
      </div>
    </div>
  )
}
