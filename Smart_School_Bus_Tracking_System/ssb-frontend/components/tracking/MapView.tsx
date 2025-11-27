"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import dynamic from "next/dynamic";
import { useTripBusPosition } from "@/hooks/use-socket";
import type { StopDTO, BusMarker } from "@/components/map/SSBMap";

const SSBMap = dynamic(() => import("@/components/map/SSBMap"), { ssr: false });

interface Bus {
  id: string;
  plateNumber: string;
  route: string;
  status: "running" | "late" | "incident" | "idle";
  lat: number;
  lng: number;
  speed: number;
  students: number;
  heading?: number; // Direction in degrees
}

type RouteInfo = {
  routeId: number;
  routeName: string;
  polyline: string | null;
  color: string;
};

interface MapViewProps {
  buses: Bus[];
  stops?: { id: string; lat: number; lng: number; label?: string }[];
  routes?: RouteInfo[];
  selectedBus?: Bus;
  onSelectBus?: (bus: Bus) => void;
  className?: string;
  height?: string;
  // When true, pan the map to the first marker as it moves
  followFirstMarker?: boolean;
  // When true, auto fit bounds when markers update (useful if multiple points)
  autoFitOnUpdate?: boolean;
  // Show "My Location" button (default: true)
  showMyLocation?: boolean;
  // Custom label for location button (e.g., "Vị trí xe buýt")
  customLocationLabel?: string;
  // Custom target location instead of user's location
  customLocationTarget?: { lat: number; lng: number };
}

export function MapView({
  buses,
  stops,
  routes = [],
  selectedBus,
  onSelectBus,
  className = "",
  height = "600px",
  followFirstMarker = false,
  autoFitOnUpdate = false,
  showMyLocation = true,
  customLocationLabel,
  customLocationTarget,
}: MapViewProps) {
  // Convert buses to BusMarker format (memoized to avoid new references every render)
  const busMarkers = React.useMemo<BusMarker[]>(() => {
    return buses.map((b) => ({
      id: b.id,
      lat: b.lat,
      lng: b.lng,
      label: `${b.plateNumber} · ${b.route}`,
      status: b.status as "running" | "idle" | "late" | "incident",
      heading: b.heading,
    }));
  }, [buses]);

  // Convert stops to StopDTO format (memoized)
  const stopMarkers = React.useMemo<StopDTO[]>(() => {
    return (stops || []).map((s, idx) => ({
      maDiem: parseInt(s.id) || idx + 1,
      tenDiem: s.label || `Stop ${idx + 1}`,
      viDo: s.lat,
      kinhDo: s.lng,
      sequence: idx + 1,
    }));
  }, [stops]);

  // Throttle bus position updates (max 1 update per second)
  const [throttledBuses, setThrottledBuses] = useState(busMarkers);
  const lastUpdateRef = React.useRef<number>(0);
  const lastDataRef = React.useRef<BusMarker[]>(busMarkers);

  const hasBusDataChanged = React.useCallback(
    (next: BusMarker[], prev: BusMarker[]) => {
      if (next.length !== prev.length) return true;
      for (let i = 0; i < next.length; i++) {
        const a = next[i];
        const b = prev[i];
        if (
          a.id !== b.id ||
          a.lat !== b.lat ||
          a.lng !== b.lng ||
          a.status !== b.status ||
          a.heading !== b.heading
        ) {
          return true;
        }
      }
      return false;
    },
    []
  );

  useEffect(() => {
    const now = Date.now();
    const dataChanged = hasBusDataChanged(busMarkers, lastDataRef.current);
    if (!dataChanged) {
      return;
    }
    if (now - lastUpdateRef.current >= 1000) {
      lastDataRef.current = busMarkers;
      lastUpdateRef.current = now;
      setThrottledBuses(busMarkers);
    }
  }, [busMarkers, hasBusDataChanged]);

  // Calculate center from buses or stops
  const center = React.useMemo(() => {
    if (throttledBuses.length > 0) {
      const avgLat =
        throttledBuses.reduce((sum, b) => sum + b.lat, 0) /
        throttledBuses.length;
      const avgLng =
        throttledBuses.reduce((sum, b) => sum + b.lng, 0) /
        throttledBuses.length;
      return { lat: avgLat, lng: avgLng };
    }
    if (stopMarkers.length > 0) {
      const avgLat =
        stopMarkers.reduce((sum, s) => sum + s.viDo, 0) / stopMarkers.length;
      const avgLng =
        stopMarkers.reduce((sum, s) => sum + s.kinhDo, 0) / stopMarkers.length;
      return { lat: avgLat, lng: avgLng };
    }
    return { lat: 10.77653, lng: 106.700981 };
  }, [throttledBuses, stopMarkers]);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Bản đồ theo dõi
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {buses.length} xe
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <SSBMap
            height={height}
            center={center}
            zoom={13}
            buses={throttledBuses}
            stops={stopMarkers}
            routes={routes.map((r) => ({
              routeId: r.routeId,
              routeName: r.routeName,
              polyline: r.polyline,
              color: r.color,
            }))}
            showMyLocation={showMyLocation}
            customLocationLabel={customLocationLabel}
            customLocationTarget={customLocationTarget}
            onBusClick={(bus) => {
              if (onSelectBus) {
                const b = buses.find((x) => String(x.id) === String(bus.id));
                if (b) onSelectBus(b as any);
              }
            }}
            onStopClick={(stop) => {
              // Handle stop click if needed
            }}
          />
          <div
            className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg pointer-events-none"
            style={{ zIndex: 99999 }}
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full border-2 border-white"
                  style={{ backgroundColor: "#22c55e" }}
                />
                <span className="text-xs text-foreground">Đang chạy</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full border-2 border-white"
                  style={{ backgroundColor: "#6b7280" }}
                />
                <span className="text-xs text-foreground">Đứng yên</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full border-2 border-white"
                  style={{ backgroundColor: "#eab308" }}
                />
                <span className="text-xs text-foreground">Trễ</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full border-2 border-white animate-pulse"
                  style={{ backgroundColor: "#ef4444" }}
                />
                <span className="text-xs text-foreground">Sự cố</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default MapView;
