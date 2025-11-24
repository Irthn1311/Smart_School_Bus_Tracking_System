"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { DriverSidebar } from "@/components/driver/driver-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  MapPin,
  Navigation,
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  Flag,
  Cloud,
  Droplets,
  Wind,
  Fuel,
  Gauge,
  Thermometer,
  Phone,
  Navigation2,
  TrendingUp,
  AlertCircle,
  MapPinned,
  Radio,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { IncidentForm } from "@/components/driver/incident-form";
import { useTripBusPosition, useTripAlerts } from "@/hooks/use-socket";
import { apiCache } from "@/lib/api-cache";
import { socketService } from "@/lib/socket";
import {
  startTripStrict as startTrip,
  endTrip,
  cancelTrip,
} from "@/lib/services/trip.service";
import { useGPS } from "@/hooks/use-gps";
import apiClient from "@/lib/api-client";
import { apiClient as api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import type { StopDTO, BusMarker } from "@/components/map/SSBMap";
import { useETA } from "@/lib/hooks/useMaps";

const SSBMap = dynamic(() => import("@/components/map/SSBMap"), {
  ssr: false,
});
// Input and ScrollArea removed (old admin chat UI deleted)

const mockTrip = {
  id: "1",
  route: "Tuyến 1 - Quận 1",
  startTime: "06:30",
  status: "in-progress",
  currentStop: 2,
  vehicle: {
    plateNumber: "51A-12345",
    fuel: 75,
    speed: 35,
    temperature: 85,
    mileage: 45230,
  },
  weather: {
    temp: 28,
    condition: "Nắng nhẹ",
    humidity: 65,
    wind: 12,
  },
  stops: [
    {
      id: "1",
      name: "Điểm 1",
      address: "123 Nguyễn Huệ, Q1",
      time: "06:30",
      eta: "06:30",
      status: "completed",
      notes: "Đã đón đủ học sinh",
      lat: 10.762622,
      lng: 106.660172,
      students: [
        {
          id: "1",
          name: "Nguyễn Văn A",
          status: "picked",
          avatar: "/placeholder.svg?height=40&width=40",
          parent: "0901234567",
        },
        {
          id: "2",
          name: "Trần Thị B",
          status: "picked",
          avatar: "/placeholder.svg?height=40&width=40",
          parent: "0901234568",
        },
      ],
    },
    {
      id: "2",
      name: "Điểm 2",
      address: "456 Lê Lợi, Q1",
      time: "06:38",
      eta: "06:40",
      status: "current",
      notes: "",
      lat: 10.76342,
      lng: 106.66572,
      students: [
        {
          id: "3",
          name: "Lê Văn C",
          status: "pending",
          avatar: "/placeholder.svg?height=40&width=40",
          parent: "0901234569",
        },
        {
          id: "4",
          name: "Phạm Thị D",
          status: "pending",
          avatar: "/placeholder.svg?height=40&width=40",
          parent: "0901234570",
        },
        {
          id: "5",
          name: "Hoàng Văn E",
          status: "absent",
          avatar: "/placeholder.svg?height=40&width=40",
          parent: "0901234571",
        },
      ],
    },
    {
      id: "3",
      name: "Điểm 3",
      address: "789 Pasteur, Q1",
      time: "06:45",
      eta: "06:48",
      status: "upcoming",
      notes: "",
      lat: 10.76442,
      lng: 106.67072,
      students: [
        {
          id: "6",
          name: "Võ Thị F",
          status: "pending",
          avatar: "/placeholder.svg?height=40&width=40",
          parent: "0901234572",
        },
        {
          id: "7",
          name: "Đặng Văn G",
          status: "pending",
          avatar: "/placeholder.svg?height=40&width=40",
          parent: "0901234573",
        },
      ],
    },
    {
      id: "4",
      name: "Trường TH ABC",
      address: "999 Trần Hưng Đạo, Q1",
      time: "07:00",
      eta: "07:05",
      status: "upcoming",
      notes: "",
      lat: 10.76542,
      lng: 106.67572,
      students: [],
    },
  ],
};

export default function TripDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  
  // Check authentication on mount - FIX: Use useRef to avoid hydration error
  const authCheckedRef = useRef(false);
  
  useEffect(() => {
    // Only run on client side, and only once
    if (typeof window === 'undefined' || authCheckedRef.current) return;
    authCheckedRef.current = true;
    
    const token = localStorage.getItem('ssb_token');
    if (!token) {
      console.warn('[Driver Trip] No token found, redirecting to login');
      toast({
        title: "Chưa đăng nhập",
        description: "Vui lòng đăng nhập để xem chuyến đi",
        variant: "destructive",
      });
      setTimeout(() => router.push('/login'), 1000);
    }
  }, [router, toast]);
  
  const [trip, setTrip] = useState(mockTrip);
  const [routePolyline, setRoutePolyline] = useState<string | null>(null); // Add polyline state
  const [dynamicDirections, setDynamicDirections] = useState<string | null>(
    null
  ); // Dynamic directions from current pos to next stop
  const [isFetchingRoute, setIsFetchingRoute] = useState(false); // Loading state for initial route
  const hasInitialRouteFetched = useRef(false); // Track if we've already fetched initial route
  const [isIncidentDialogOpen, setIsIncidentDialogOpen] = useState(false);
  const [stopNotes, setStopNotes] = useState<Record<string, string>>({});
  // old admin chat state removed
  const [atCurrentStop, setAtCurrentStop] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [started, setStarted] = useState(false);
  const [tripStatus, setTripStatus] = useState<
    "chua_khoi_hanh" | "dang_chay" | "hoan_thanh" | "huy" | undefined
  >(undefined);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [locationSource, setLocationSource] = useState<"demo" | "real">("demo"); // Changed to "demo" for automatic simulation
  const [loaiChuyen, setLoaiChuyen] = useState<"don_sang" | "tra_chieu" | "">(""); // Lưu loại chuyến để xác định điểm xuất phát

  // Realtime: join driver's trip room and move the vehicle marker when updates arrive
  const tripIdParam = (params?.id as string) || "";
  const tripIdNum = Number(tripIdParam);
  // DEV: Cho phép override tripId bằng biến môi trường để chạy script test (ví dụ 42)
  const testTripIdEnv = process.env.NEXT_PUBLIC_TEST_TRIP_ID;
  const testTripId = testTripIdEnv ? Number(testTripIdEnv) : undefined;
  // Nếu có NEXT_PUBLIC_TEST_TRIP_ID thì ưu tiên dùng để đảm bảo nhận được sự kiện từ script
  const effectiveTripId =
    typeof testTripId === "number" && Number.isFinite(testTripId)
      ? testTripId
      : Number.isFinite(tripIdNum)
      ? tripIdNum
      : undefined;
  const { busPosition } = useTripBusPosition(effectiveTripId);
  const { approachStop, delayAlert } = useTripAlerts(effectiveTripId);
  const {
    start: startGPS,
    stop: stopGPS,
    running: gpsRunning,
    lastPoint: gpsLastPoint,
  } = useGPS(effectiveTripId);
  // Initialize with undefined, will be set from trip data or first stop
  // 🔥 FIX: Chỉ set busLocation từ busPosition (WebSocket) khi trip đang chạy
  // Không dùng GPS của người dùng để tránh vẽ đường từ vị trí hiện tại
  const [busLocation, setBusLocation] = useState<{ lat: number; lng: number } | undefined>(undefined);
  const [busHeading, setBusHeading] = useState<number | undefined>(undefined); // Heading in degrees (0-360)
  const prevBusLocationRef = useRef<{ lat: number; lng: number } | undefined>(undefined);
  
  useEffect(() => {
    // Chỉ cập nhật busLocation từ busPosition khi trip đang chạy
    // Khi trip chưa start, busLocation sẽ được set từ first stop (xem useEffect loadDetail)
    if (
      tripStatus === "dang_chay" &&
      busPosition &&
      Number.isFinite(busPosition.lat) &&
      Number.isFinite(busPosition.lng)
    ) {
      // Log for quick verification during test
      console.log("[Driver Trip] busPosition from WebSocket", busPosition);
      
      // Tính heading từ vị trí trước và sau
      if (prevBusLocationRef.current) {
        const prev = prevBusLocationRef.current;
        const current = { lat: busPosition.lat, lng: busPosition.lng };
        
        // Calculate bearing (heading) in degrees
        const dLng = (current.lng - prev.lng) * Math.PI / 180;
        const lat1 = prev.lat * Math.PI / 180;
        const lat2 = current.lat * Math.PI / 180;
        const y = Math.sin(dLng) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
        const bearing = Math.atan2(y, x) * 180 / Math.PI;
        const heading = (bearing + 360) % 360; // Normalize to 0-360
        setBusHeading(heading);
      }
      
      prevBusLocationRef.current = { lat: busPosition.lat, lng: busPosition.lng };
      setBusLocation({ lat: busPosition.lat, lng: busPosition.lng });
    }
  }, [busPosition, tripStatus]);

  // Fetch initial route directions when trip data is loaded (before starting)
  useEffect(() => {
    // Only fetch ONCE when trip data is loaded
    if (
      hasInitialRouteFetched.current ||
      dynamicDirections ||
      (routePolyline && routePolyline.trim()) ||
      isFetchingRoute ||
      !trip.stops ||
      trip.stops.length < 2
    ) {
      return;
    }

    const firstStop = trip.stops[0] as any;
    const lastStop = trip.stops[trip.stops.length - 1] as any;

    // Validate coordinates
    if (
      !Number.isFinite(firstStop?.lat) ||
      !Number.isFinite(firstStop?.lng) ||
      !Number.isFinite(lastStop?.lat) ||
      !Number.isFinite(lastStop?.lng)
    ) {
      console.warn("[Driver Trip] Invalid stop coordinates for initial route");
      return;
    }

    // Build waypoints (intermediate stops)
    const waypoints = trip.stops.length > 2
      ? trip.stops.slice(1, -1).map((stop: any) => ({
          location: `${Number(stop.lat)},${Number(stop.lng)}`,
        })).filter((wp: any) => {
          const [lat, lng] = wp.location.split(',').map(Number);
          return Number.isFinite(lat) && Number.isFinite(lng);
        })
      : [];

    // Limit waypoints to 23 (Google Maps API limit)
    const MAX_WAYPOINTS = 23;
    let limitedWaypoints = waypoints;
    if (waypoints.length > MAX_WAYPOINTS) {
      const step = Math.floor(waypoints.length / MAX_WAYPOINTS);
      limitedWaypoints = waypoints.filter((_, idx) => idx % step === 0).slice(0, MAX_WAYPOINTS);
    }

    console.log(
      `[Driver Trip] Fetching initial route: ${trip.stops.length} stops, ${limitedWaypoints.length} waypoints`
    );

    hasInitialRouteFetched.current = true; // Mark as fetched
    setIsFetchingRoute(true);

    apiClient
      .getDirections({
        origin: `${firstStop.lat},${firstStop.lng}`,
        destination: `${lastStop.lat},${lastStop.lng}`,
        waypoints: limitedWaypoints.length > 0 ? limitedWaypoints : undefined,
        mode: "driving",
        vehicleType: "bus",
      })
      .then((response: any) => {
        if (response.success && response.data) {
          const data = response.data as any;
          const polyline = data.polyline || data.overview_polyline?.points || null;
          if (polyline && typeof polyline === "string" && polyline.trim()) {
            console.log(
              `[Driver Trip] ✅ Initial route loaded:`,
              polyline.length,
              "chars"
            );
            setRoutePolyline(polyline);
          }
        }
      })
      .catch((err: any) => {
        console.error("[Driver Trip] Error fetching initial route:", err?.message);
        hasInitialRouteFetched.current = false; // Reset on error to allow retry
      })
      .finally(() => {
        setIsFetchingRoute(false);
      });
  }, [trip.stops.length]); // Only depend on stops COUNT, not the array itself

  // OPTIMIZED: Fetch dynamic directions for remaining route (current position → all remaining stops)
  // 🔥 FIX: Chỉ fetch khi trip đang chạy VÀ có busLocation từ busPosition (không phải từ GPS người dùng)
  useEffect(() => {
    // Only fetch if trip is running and we have a valid current position from busPosition
    // Không fetch nếu trip chưa start hoặc không có busLocation từ WebSocket
    if (
      tripStatus !== "dang_chay" ||
      !busLocation ||
      !trip.stops ||
      trip.stops.length === 0 ||
      !busPosition // 🔥 Đảm bảo có busPosition từ WebSocket, không phải từ GPS người dùng
    ) {
      return;
    }

    // Get remaining stops (from current stop onwards)
    const currentStopIndex = trip.currentStop || 0;
    const remainingStops = trip.stops.slice(currentStopIndex);
    
    if (remainingStops.length === 0) {
      console.log("[Driver Trip] No remaining stops, clearing directions");
      setDynamicDirections(null);
      return;
    }

    const nextStop = remainingStops[0] as any;
    const nextStopLat = Number(nextStop.lat);
    const nextStopLng = Number(nextStop.lng);

    // Validate coordinates
    if (
      !Number.isFinite(nextStopLat) ||
      !Number.isFinite(nextStopLng) ||
      !Number.isFinite(busLocation.lat) ||
      !Number.isFinite(busLocation.lng)
    ) {
      console.warn("[Driver Trip] Invalid coordinates, skipping directions fetch");
      return;
    }

    // Calculate distance to next stop using Haversine formula (more accurate)
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 6371000; // Earth radius in meters
    const dLat = toRad(nextStopLat - busLocation.lat);
    const dLng = toRad(nextStopLng - busLocation.lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(busLocation.lat)) *
        Math.cos(toRad(nextStopLat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceToStop = R * c; // Distance in meters

    // Don't fetch if already at stop (< 30m) - tighter threshold
    if (distanceToStop < 30) {
      console.log(
        `[Driver Trip] Already at stop (${Math.round(distanceToStop)}m), clearing dynamic directions`
      );
      setDynamicDirections(null);
      return;
    }

    // 🔥 FIX: Rate limiting - fetch every 30 seconds để tránh "Too many requests"
    // Google Maps Directions API có giới hạn: 40 requests/100 seconds/user
    const lastFetch = (window as any).__lastDirectionsFetch || 0;
    const now = Date.now();
    const DEBOUNCE_MS = 30000; // 30 seconds
    if (now - lastFetch < DEBOUNCE_MS) {
      return;
    }
    (window as any).__lastDirectionsFetch = now;

    // Build waypoints from remaining stops (exclude first and last for waypoints)
    const destination = remainingStops[remainingStops.length - 1] as any;
    const destLat = Number(destination.lat);
    const destLng = Number(destination.lng);
    
    // Validate destination
    if (!Number.isFinite(destLat) || !Number.isFinite(destLng)) {
      console.warn("[Driver Trip] Invalid destination coordinates");
      return;
    }

    // Waypoints are intermediate stops (between next stop and final destination)
    let waypoints = remainingStops.length > 2
      ? remainingStops.slice(1, -1).map((stop: any) => ({
          location: `${Number(stop.lat)},${Number(stop.lng)}`,
        })).filter((wp: any) => {
          const [lat, lng] = wp.location.split(',').map(Number);
          return Number.isFinite(lat) && Number.isFinite(lng);
        })
      : [];

    // Google Maps API limit: 25 waypoints max, use 23 to be safe
    const MAX_WAYPOINTS = 23;
    if (waypoints.length > MAX_WAYPOINTS) {
      console.warn(
        `[Driver Trip] Too many waypoints (${waypoints.length}), sampling to ${MAX_WAYPOINTS}`
      );
      // Sample waypoints evenly to stay within limit
      const step = Math.floor(waypoints.length / MAX_WAYPOINTS);
      waypoints = waypoints.filter((_, idx) => idx % step === 0).slice(0, MAX_WAYPOINTS);
    }

    console.log(
      `[Driver Trip] Fetching optimized directions for remaining route: ${remainingStops.length} stops, ${waypoints.length} waypoints`
    );

    apiClient
      .getDirections({
        origin: `${busLocation.lat},${busLocation.lng}`,
        destination: `${destLat},${destLng}`,
        waypoints: waypoints.length > 0 ? waypoints : undefined,
        mode: "driving",
        vehicleType: "bus",
        // Note: Google Maps API có giới hạn 25 waypoints cho directions API
        // Nếu có nhiều hơn, cần optimize hoặc split thành nhiều requests
      })
      .then((response: any) => {
        if (response.success && response.data) {
          const data = response.data as any;
          const newPolyline =
            data.polyline || data.overview_polyline?.points || null;
          if (
            newPolyline &&
            typeof newPolyline === "string" &&
            newPolyline.trim()
          ) {
            console.log(
              `[Driver Trip] ✅ Successfully fetched directions for ${remainingStops.length} stops:`,
              newPolyline.length,
              "chars,",
              Math.round(data.distance || 0),
              "m,",
              Math.round((data.duration || 0) / 60),
              "min"
            );
            setDynamicDirections(newPolyline);
          } else {
            console.warn("[Driver Trip] No polyline in directions response");
          }
        } else {
          console.warn("[Driver Trip] Directions response not successful:", response);
        }
      })
      .catch((err: any) => {
        const errorMessage = err?.message || String(err);
        const isRateLimit = 
          errorMessage.includes("Too many requests") ||
          errorMessage.includes("OVER_QUERY_LIMIT") ||
          errorMessage.includes("429") ||
          err?.status === 429;
        
        if (isRateLimit) {
          console.warn("[Driver Trip] ⚠️ Google Maps API rate limit reached, extending debounce to 60s");
          // Extend debounce to 60s when rate limited
          (window as any).__lastDirectionsFetch = Date.now() + 30000; // Add 30s more
        } else {
          console.error(
            "[Driver Trip] Error fetching dynamic directions:",
            errorMessage
          );
        }
        // Don't clear existing directions on error, keep showing last valid route
      });
  }, [busLocation, trip.currentStop, trip.stops, tripStatus]);

  // Track which stops have been auto-arrived to prevent duplicate calls
  const arrivedStopsRef = useRef<Set<number>>(new Set());
  // 🔒 Lock để tránh race condition khi auto-arrive cùng một stop nhiều lần
  const pendingArrivesRef = useRef<Set<number>>(new Set());

  // Day 5: Show toast notifications for trip alerts and auto-arrive at stop
  useEffect(() => {
    if (approachStop && tripStatus === "dang_chay") {
      const stopName =
        approachStop.stopName || approachStop.stop_name || "điểm dừng";
      const distance = approachStop.distance || approachStop.distance_m || 0;
      const stopSequence = approachStop.stopSequence || approachStop.sequence;
      
      toast({
        title: "🚏 Gần đến điểm dừng",
        description: `Xe đang cách ${stopName} khoảng ${Math.round(distance)}m`,
        variant: "default",
      });

      // 🚀 AUTO-ARRIVE: Tự động đánh dấu đã đến điểm dừng khi trong vùng geofence (< 30m)
      // 🔥 FIX: Bỏ qua điểm cuối (không đón học sinh) - điểm cuối là điểm trả
      // stopSequence từ approachStop là sequence (1-based), cần tìm index (0-based) tương ứng
      let stopIndex = trip.stops.findIndex((s: any) => {
        const sSeq = (s as any).sequence || 0;
        return sSeq === stopSequence || sSeq === parseInt(String(stopSequence));
      });
      
      // 🔥 FIX: Fallback - nếu không tìm thấy bằng sequence, thử tìm bằng index (sequence - 1)
      if (stopIndex < 0 && stopSequence) {
        const seqNum = typeof stopSequence === 'number' ? stopSequence : parseInt(String(stopSequence));
        if (seqNum > 0 && seqNum <= trip.stops.length) {
          stopIndex = seqNum - 1; // sequence is 1-based, index is 0-based
          console.log(`[Driver Trip] ⚠️ Sequence ${stopSequence} not found, using index ${stopIndex} as fallback`);
        }
      }
      
      const isLastStop = stopIndex === trip.stops.length - 1;
      const shouldArriveAtStop = !isLastStop && stopIndex >= 0; // Chỉ auto-arrive nếu không phải điểm cuối và tìm thấy stop
      
      // 🔒 FIX: Tránh race condition - check cả arrivedStopsRef và pendingArrivesRef
      const stopSeqNum = typeof stopSequence === 'number' ? stopSequence : parseInt(String(stopSequence));
      const isAlreadyArrived = arrivedStopsRef.current.has(stopSeqNum);
      const isPending = pendingArrivesRef.current.has(stopSeqNum);
      
      if (distance < 30 && stopSequence && tripIdNum && !isAlreadyArrived && !isPending && shouldArriveAtStop) {
        console.log(`[Driver Trip] 🚏 Auto-arriving at stop ${stopSequence} (${stopName}) - distance: ${Math.round(distance)}m, stopIndex: ${stopIndex}`);
        
        // 🔒 Mark as pending để tránh duplicate calls (atomic operation)
        pendingArrivesRef.current.add(stopSeqNum);
        
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("ssb_token")
            : null;

        const API_URL =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

        // 1. Auto-call arriveAtStop API
        fetch(`${API_URL}/trips/${tripIdNum}/stops/${stopSequence}/arrive`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            arrivedAt: new Date().toISOString(),
          }),
        })
          .then((res) => {
            if (res.ok) {
              console.log(`[Driver Trip] ✅ Auto-arrived at stop ${stopSequence} (index ${stopIndex})`);
              
              // 🔒 Mark as arrived và remove from pending (atomic operation)
              arrivedStopsRef.current.add(stopSeqNum);
              pendingArrivesRef.current.delete(stopSeqNum);
              
              // Update current stop status - dùng stopIndex đã tìm được thay vì tính toán
              setTrip((prev) => ({
                ...prev,
                currentStop: stopIndex >= 0 ? stopIndex : prev.currentStop, // Dùng stopIndex đã tìm được
                stops: prev.stops.map((stop, idx) => {
                  if (idx === stopIndex) {
                    return { ...stop, status: "current" as const };
                  } else if (idx < stopIndex) {
                    return { ...stop, status: "completed" as const };
                  }
                  return stop;
                }),
              }));
              setAtCurrentStop(true);
              
              toast({
                title: "✅ Đã đến điểm dừng",
                description: `Đã tự động đánh dấu đến ${stopName}`,
                variant: "default",
              });
            } else {
              console.warn(`[Driver Trip] Failed to auto-arrive at stop ${stopSequence}:`, res.statusText);
              // 🔒 Remove from pending to allow retry (không add vào arrivedStopsRef)
              pendingArrivesRef.current.delete(stopSeqNum);
            }
          })
          .catch((err) => {
            console.error("[Driver Trip] Error auto-arriving at stop:", err);
            // 🔒 Remove from pending to allow retry (không add vào arrivedStopsRef)
            pendingArrivesRef.current.delete(stopSeqNum);
          });

        // 2. Auto-load students when arriving at stop
        // 🔥 FIX: Load students ngay cả khi stopIndex không tìm thấy, dùng stopSequence trực tiếp
        if (stopIndex >= 0) {
          // Load students vào đúng stopIndex
          fetch(`${API_URL}/trips/${tripIdNum}/stops/${stopSequence}/students`, {
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          })
            .then((res) => res.json())
            .then((data) => {
              const studentsList = data.data?.students || [];
              
              setTrip((prev) => ({
                ...prev,
                stops: prev.stops.map((stop, idx) =>
                  idx === stopIndex
                    ? {
                        ...stop,
                        students: studentsList.map((s: any) => ({
                          id: String(s.maHocSinh),
                          name: s.hoTen || "Học sinh",
                          status:
                            s.trangThai === "da_don"
                              ? "picked"
                              : s.trangThai === "vang"
                              ? "absent"
                              : "pending",
                          avatar: s.anhDaiDien || "/placeholder.svg?height=40&width=40",
                          parent: s.soDienThoaiPhuHuynh || "",
                        })),
                      }
                    : stop
                ),
              }));
              
              console.log(`[Driver Trip] ✅ Auto-loaded ${studentsList.length} students at stop ${stopSequence} (index ${stopIndex})`);
            })
            .catch((err) => {
              console.warn("[Driver Trip] Failed to auto-load students:", err);
            });
        } else {
          // 🔥 FIX: Fallback - load students ngay cả khi không tìm thấy stopIndex
          // Tìm stop bằng cách so sánh sequence trong response
          console.warn(`[Driver Trip] ⚠️ Could not find stop index for sequence ${stopSequence}, trying to load students anyway`);
          fetch(`${API_URL}/trips/${tripIdNum}/stops/${stopSequence}/students`, {
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          })
            .then((res) => res.json())
            .then((data) => {
              const studentsList = data.data?.students || [];
              
              // Tìm stop bằng sequence trong response hoặc tìm stop có sequence match
              setTrip((prev) => ({
                ...prev,
                stops: prev.stops.map((stop: any) => {
                  const sSeq = stop.sequence || 0;
                  const seqMatch = sSeq === stopSequence || sSeq === parseInt(String(stopSequence));
                  
                  if (seqMatch) {
                    return {
                      ...stop,
                      students: studentsList.map((s: any) => ({
                        id: String(s.maHocSinh),
                        name: s.hoTen || "Học sinh",
                        status:
                          s.trangThai === "da_don"
                            ? "picked"
                            : s.trangThai === "vang"
                            ? "absent"
                            : "pending",
                        avatar: s.anhDaiDien || "/placeholder.svg?height=40&width=40",
                        parent: s.soDienThoaiPhuHuynh || "",
                      })),
                    };
                  }
                  return stop;
                }),
              }));
              
              console.log(`[Driver Trip] ✅ Auto-loaded ${studentsList.length} students at stop ${stopSequence} (fallback method)`);
            })
            .catch((err) => {
              console.warn("[Driver Trip] Failed to auto-load students (fallback):", err);
            });
        }
      } else if (distance < 60 && stopSequence && tripIdNum && stopIndex >= 0 && !isLastStop) {
        // Auto-load students when approaching stop (< 60m) even if not arrived yet
        // Chỉ load nếu tìm thấy stopIndex và không phải điểm cuối
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("ssb_token")
            : null;

        const API_URL =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

        // Load students at this stop
        fetch(`${API_URL}/trips/${tripIdNum}/stops/${stopSequence}/students`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        })
          .then((res) => res.json())
          .then((data) => {
            const studentsList = data.data?.students || [];
            
            setTrip((prev) => ({
              ...prev,
              stops: prev.stops.map((stop, idx) =>
                idx === stopIndex
                  ? {
                      ...stop,
                      students: studentsList.map((s: any) => ({
                        id: String(s.maHocSinh),
                        name: s.hoTen || "Học sinh",
                        status:
                          s.trangThai === "da_don"
                            ? "picked"
                            : s.trangThai === "vang"
                            ? "absent"
                            : "pending",
                        avatar: s.anhDaiDien || "/placeholder.svg?height=40&width=40",
                        parent: s.soDienThoaiPhuHuynh || "",
                      })),
                    }
                  : stop
              ),
            }));
          })
          .catch((err) => {
            console.warn("[Driver Trip] Failed to auto-load students:", err);
          });
      }
    }
  }, [approachStop, tripStatus, tripIdNum, trip.stops, toast]);

  useEffect(() => {
    if (delayAlert) {
      const delay = delayAlert.delayMinutes || delayAlert.delay_minutes || 0;
      toast({
        title: "⏰ Cảnh báo chậm trễ",
        description: `Chuyến đi đang chậm ${delay} phút so với kế hoạch`,
        variant: "destructive",
      });
    }
  }, [delayAlert, toast]);

  // 🔥 FIX: Listen for trip status updates via WebSocket + polling fallback
  useEffect(() => {
    if (!effectiveTripId) return;

    // WebSocket event handlers
    const handleTripStatusUpdate = (event: Event) => {
      const data = (event as CustomEvent).detail;
      const updatedTripId = data?.tripId || data?.trip_id || data?.maChuyen;
      
      if (updatedTripId && Number(updatedTripId) === effectiveTripId) {
        console.log("[Driver Trip] Trip status updated via WebSocket:", data);
        
        // Update trip status
        if (data?.status) {
          setTripStatus(data.status);
          setStarted(data.status === "dang_chay");
        }
        
        // Invalidate cache to force refresh
        apiCache.invalidate(`trip-${effectiveTripId}`);
        
        // Reload trip data if needed
        if (data?.trip) {
          // Update trip state with new data
          setTrip((prev) => ({
            ...prev,
            status: data.trip.trangThai === "dang_chay" ? "in-progress" : prev.status,
          }));
        }
      }
    };

    const handleTripCompleted = (event: Event) => {
      const data = (event as CustomEvent).detail;
      const completedTripId = data?.tripId || data?.trip_id || data?.maChuyen;
      
      if (completedTripId && Number(completedTripId) === effectiveTripId) {
        toast({
          title: "✅ Hoàn thành chuyến đi",
          description: `Chuyến đi #${completedTripId} đã kết thúc thành công`,
          variant: "default",
        });
        setTripStatus("hoan_thanh");
        apiCache.invalidate(`trip-${effectiveTripId}`);
      }
    };

    const handleTripStarted = (event: Event) => {
      const data = (event as CustomEvent).detail;
      const startedTripId = data?.tripId || data?.trip_id || data?.maChuyen;
      
      if (startedTripId && Number(startedTripId) === effectiveTripId) {
        console.log("[Driver Trip] Trip started via WebSocket");
        setTripStatus("dang_chay");
        setStarted(true);
        apiCache.invalidate(`trip-${effectiveTripId}`);
      }
    };

    // Register event listeners
    window.addEventListener("tripStatusUpdate", handleTripStatusUpdate as EventListener);
    window.addEventListener("tripCompleted", handleTripCompleted as EventListener);
    window.addEventListener("tripStarted", handleTripStarted as EventListener);

    // 🔥 Polling fallback: Poll trip status every 10 seconds if WebSocket fails
    // Only poll if trip is running (to reduce unnecessary calls)
    let pollingInterval: NodeJS.Timeout | null = null;
    if (tripStatus === "dang_chay") {
      pollingInterval = setInterval(async () => {
        try {
          const res = await api.getTripById(effectiveTripId);
          const data: any = (res as any).data || res;
          
          if (data?.trangThai && data.trangThai !== tripStatus) {
            console.log("[Driver Trip] Trip status changed via polling:", data.trangThai);
            setTripStatus(data.trangThai);
            setStarted(data.trangThai === "dang_chay");
            apiCache.set(`trip-${effectiveTripId}`, data, 30000);
          }
        } catch (err) {
          console.warn("[Driver Trip] Polling error:", err);
        }
      }, 10000); // Poll every 10 seconds
    }

    return () => {
      window.removeEventListener("tripStatusUpdate", handleTripStatusUpdate as EventListener);
      window.removeEventListener("tripCompleted", handleTripCompleted as EventListener);
      window.removeEventListener("tripStarted", handleTripStarted as EventListener);
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [effectiveTripId, tripStatus, toast]);

  // Load trip detail from API (ONLY trips; no schedules fallback)
  // 🔥 FIX: Thêm cache để giảm API calls
  useEffect(() => {
    async function loadDetail() {
      try {
        if (!tripIdNum) return;
        console.log("[Driver Trip] Loading trip detail for:", tripIdNum);
        
        // Check cache first
        const cacheKey = `trip-${tripIdNum}`;
        const cached = apiCache.get(cacheKey);
        if (cached) {
          console.log("[Driver Trip] Using cached trip data");
          // Use cached data but still update in background
          const data: any = cached;
          // Process cached data (same as below)
          // ... (will continue with full processing)
        }
        
        const res = await api.getTripById(tripIdNum);
        const data: any = (res as any).data || res;
        
        // Cache the response (30 seconds TTL)
        apiCache.set(cacheKey, data, 30000);
        console.log("[Driver Trip] API response:", data);

        // Map route name with trip type (don_sang/tra_chieu)
        const tripLoaiChuyen = data?.schedule?.loaiChuyen || "";
        setLoaiChuyen(tripLoaiChuyen); // Lưu loại chuyến để dùng trong velocity simulation
        const baseRouteName =
          data?.routeInfo?.tenTuyen ||
          data?.tuyen?.tenTuyen ||
          data?.tenTuyen ||
          "Chưa có tên tuyến";
        // Add trip type indicator if not already in name
        const routeName =
          baseRouteName.includes("Đi") || baseRouteName.includes("Về")
            ? baseRouteName
            : `${baseRouteName} ${
                tripLoaiChuyen === "don_sang"
                  ? "(Đi)"
                  : tripLoaiChuyen === "tra_chieu"
                  ? "(Về)"
                  : ""
              }`;

        // 🔥 UPDATE: Sử dụng data.stops[] mới (format chuẩn từ backend)
        // Fallback về data.routeInfo.diemDung nếu chưa có data.stops
        const routeStops = data?.stops || data?.routeInfo?.diemDung || [];
        
        // Lấy summary từ API response
        const summary = data?.summary || {
          totalStudents: data?.students?.length || 0,
          pickedCount: 0,
          absentCount: 0,
          waitingCount: 0,
          droppedCount: 0,
        };
        
        console.log("[Driver Trip] Route stops from API:", {
          count: routeStops.length,
          stops: routeStops.map((s: any) => ({
            sequence: s.sequence,
            name: s.tenDiem,
            studentCount: s.studentCount,
            hasStudents: s.students?.length > 0,
          })),
        });
        
        console.log("[Driver Trip] Summary:", summary);

        // Debug: Log raw stop data from API
        console.log(
          "[Driver Trip] Raw routeStops from API:",
          routeStops.length > 0 ? routeStops[0] : "No stops"
        );
        console.log("[Driver Trip] All routeStops:", routeStops);
        console.log(
          "[Driver Trip] Sample stop fields:",
          routeStops.length > 0 ? Object.keys(routeStops[0]) : "No stops"
        );

        // Get polyline from route data
        const routePolylineFromBackend = data?.routeInfo?.polyline || null;
        console.log(
          "[Driver Trip] Route polyline:",
          routePolylineFromBackend ? "Available" : "Not found"
        );
        // 🔥 FIX: Chỉ set routePolyline nếu hợp lệ (không null và không rỗng)
        // Nếu backend không có polyline, useEffect sẽ fetch từ Directions API
        try {
          if (routePolylineFromBackend && routePolylineFromBackend.trim()) {
            setRoutePolyline(routePolylineFromBackend);
            console.log("[Driver Trip] ✅ Set routePolyline from backend");
          } else {
            console.log("[Driver Trip] No valid polyline from backend, will fetch from Directions API");
            // Không set routePolyline, để useEffect fetch từ Directions API
          }
        } catch (err) {
          console.warn("[Driver Trip] Failed to set route polyline state", err);
        }

        // 🔥 FIX: Xác định điểm cuối (không đón học sinh)
        // - tra_chieu (về): Điểm cuối = trả học sinh, điểm đầu (SGU) = đón học sinh
        // - don_sang (đi): Điểm cuối (SGU) = trả học sinh, điểm đầu = đón học sinh
        const isLastStop = (idx: number) => idx === routeStops.length - 1;
        const shouldShowStudentsAtStop = (idx: number) => {
          // Điểm cuối: Không đón học sinh (là điểm trả)
          if (isLastStop(idx)) {
            return false;
          }
          // Điểm đầu và giữa: Đều đón học sinh
          return true;
        };

        const mappedStops = routeStops.map((stop: any, index: number) => {
          // Use stop.sequence if available, otherwise use index + 1
          const stopSequence = stop.sequence || index + 1;
          const isLast = isLastStop(index);
          const shouldShowStudents = shouldShowStudentsAtStop(index);

          // 🔥 FIX: Ưu tiên sử dụng students từ stop (backend đã tính sẵn)
          // Nếu không có, fallback về students từ data?.students
          // Chỉ load students nếu điểm này nên hiển thị học sinh (không phải điểm cuối)
          let stopStudents = [];
          
          if (shouldShowStudents) {
            if (stop.students && Array.isArray(stop.students) && stop.students.length > 0) {
              // Sử dụng students từ stop (backend đã match đúng)
              stopStudents = stop.students.map((student: any) => ({
                id: String(student.maHocSinh || student.id || ""),
                name: student.hoTen || student.name || "Học sinh",
                status:
                  student.trangThai === "da_don"
                    ? "picked"
                    : student.trangThai === "vang"
                    ? "absent"
                    : "pending",
                avatar:
                  student.anhDaiDien || "/placeholder.svg?height=40&width=40",
                parent: student.soDienThoaiPhuHuynh || student.parentPhone || "",
              }));
            } else {
              // Fallback: Match từ data?.students
              stopStudents = (data?.students || [])
                .filter((student: any) => {
                  // Match students to stops by thuTuDiemDon (sequence)
                  return (
                    student.thuTuDiemDon === stopSequence ||
                    student.thuTuDiemDon === index + 1
                  );
                })
                .map((student: any) => ({
                  id: String(student.maHocSinh || student.id || ""),
                  name: student.hoTen || student.name || "Học sinh",
                  status:
                    student.trangThai === "da_don"
                      ? "picked"
                      : student.trangThai === "vang"
                      ? "absent"
                      : "pending",
                  avatar:
                    student.anhDaiDien || "/placeholder.svg?height=40&width=40",
                  parent: student.soDienThoaiPhuHuynh || student.parentPhone || "",
                }));
            }
          } else {
            // Điểm cuối: Không có học sinh cần đón (là điểm trả)
            stopStudents = [];
            console.log(`[Driver Trip] Stop ${stopSequence} (${stop.tenDiem}) is last stop - dropoff point, no students to pick up`);
          }
          
          console.log(`[Driver Trip] Stop ${stopSequence} (${stop.tenDiem}): ${stopStudents.length} students`, {
            stopSequence,
            stopName: stop.tenDiem,
            studentCount: stop.studentCount,
            studentsFromStop: stop.students?.length || 0,
            studentsMapped: stopStudents.length,
            isLastStop: isLast,
            shouldShowStudents,
            loaiChuyen: tripLoaiChuyen,
            isFirstStop: index === 0,
          });

          // Determine stop status
          let stopStatus: "completed" | "current" | "upcoming" = "upcoming";
          if (data?.trangThai === "dang_chay") {
            // For running trips, we need to determine current stop
            // This is a simplified logic - you may need to enhance based on actual tracking
            stopStatus = index === 0 ? "current" : "upcoming";
          } else if (
            data?.trangThai === "hoan_thanh" ||
            data?.trangThai === "da_hoan_thanh"
          ) {
            stopStatus = "completed";
          }

          // Try multiple field names for coordinates (lat/lng first, then viDo/kinhDo)
          let stopLat = stop.lat || stop.viDo || stop.latitude || 0;
          let stopLng = stop.lng || stop.kinhDo || stop.longitude || 0;

          // FALLBACK: If coordinates are 0, log warning
          if ((stopLat === 0 || stopLng === 0) && index === 0) {
            console.warn(
              "[Driver Trip] Stop has no coordinates, available fields:",
              Object.keys(stop)
            );
            console.warn("[Driver Trip] Stop data:", stop);
          } else if (index === 0) {
            console.log("[Driver Trip] ✅ First stop HAS coords:", {
              lat: stopLat,
              lng: stopLng,
            });
          }

          return {
            id: String(stop.maDiem || stop.id || index + 1),
            name: stop.tenDiem || stop.name || `Điểm ${index + 1}`,
            address: stop.address || stop.diaChi || `${stopLat}, ${stopLng}`,
            time: stop.scheduled_time || data?.schedule?.gioKhoiHanh || "--:--",
            eta: stop.scheduled_time || "--:--",
            status: stopStatus,
            notes: "",
            students: stopStudents,
            lat: stopLat,
            lng: stopLng,
          };
        });

        // 🔥 Set trip status và started state
        if (data?.trangThai) {
          setTripStatus(data.trangThai);
          // Update started state dựa trên trangThai từ backend
          // Đảm bảo UI sync với backend khi vào lại trang
          setStarted(data.trangThai === "dang_chay");
          
          console.log("[Driver Trip] Trip status loaded from backend:", {
            trangThai: data.trangThai,
            started: data.trangThai === "dang_chay",
            maChuyen: data?.maChuyen,
          });
        } else {
          // Fallback: Nếu không có trangThai, giữ nguyên state hiện tại
          console.warn("[Driver Trip] No trangThai in API response");
        }

        // Determine current stop index
        let currentStopIndex = 0;
        if (data?.trangThai === "dang_chay" && mappedStops.length > 0) {
          // Find first non-completed stop
          const firstNonCompleted = mappedStops.findIndex(
            (s: any) => s.status !== "completed"
          );
          currentStopIndex = firstNonCompleted >= 0 ? firstNonCompleted : 0;
        }

        // Update trip state with real data
        setTrip({
          id: String(data?.maChuyen || data?.id || tripIdNum),
          route: routeName,
          startTime:
            data?.gioBatDauThucTe ||
            data?.schedule?.gioKhoiHanh ||
            data?.gioKhoiHanh ||
            "--:--",
          status:
            data?.trangThai === "dang_chay"
              ? "in-progress"
              : data?.trangThai === "hoan_thanh" ||
                data?.trangThai === "da_hoan_thanh"
              ? "completed"
              : "pending",
          currentStop: currentStopIndex,
          vehicle: {
            plateNumber: data?.busInfo?.bienSoXe || data?.bienSoXe || "N/A",
            fuel: 75, // Not available from API yet
            speed: 0,
            temperature: 85, // Not available from API yet
            mileage: 0, // Not available from API yet
          },
          weather: {
            temp: 28, // Not available from API yet
            condition: "Nắng nhẹ",
            humidity: 65,
            wind: 12,
          },
          stops: mappedStops.length > 0 ? mappedStops : trip.stops, // Fallback to mock if no stops
        });

        console.log("[Driver Trip] Trip data loaded:", {
          route: routeName,
          stopsCount: mappedStops.length,
          status: data?.trangThai,
          currentStop: currentStopIndex,
        });

        // 🗺️ Initialize bus location from trip data
        // 🔥 FIX: Chỉ set busLocation từ first stop khi trip chưa start
        // Khi trip đang chạy, busLocation sẽ được set từ busPosition (WebSocket) ở useEffect khác
        if (!busLocation && mappedStops.length > 0 && tripStatus !== "dang_chay") {
          // Khi trip chưa start, dùng first stop làm vị trí ban đầu
          // KHÔNG dùng GPS của người dùng để tránh vẽ đường từ vị trí hiện tại
          const firstStop = mappedStops[currentStopIndex] || mappedStops[0];
          const initialLat = firstStop.lat;
          const initialLng = firstStop.lng;
          
          if (initialLat && initialLng && Number.isFinite(initialLat) && Number.isFinite(initialLng)) {
            console.log("[Driver Trip] Setting initial bus location from first stop (trip not started):", { lat: initialLat, lng: initialLng });
            setBusLocation({ lat: initialLat, lng: initialLng });
          }
        }

        // 💾 Load stop arrival/departure status from database
        try {
          const API_URL =
            process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
          const token = localStorage.getItem("ssb_token");

          // Only load status if we have a token
          if (!token) {
            console.warn(
              "[Driver Trip] No token found, skipping stop status load"
            );
            return;
          }

          const statusResponse = await fetch(
            `${API_URL}/trips/${tripIdNum}/stops/status`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }
          );

          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            const statuses = statusData.data || [];
            console.log("[Driver Trip] Loaded stop statuses:", statuses);

            // Update stop statuses based on database (thoiGianDen/thoiGianRoi)
            // 🔥 FIX: Match bằng sequence thật từ stop, không dùng idx + 1
            setTrip((prevTrip) => ({
              ...prevTrip,
              stops: prevTrip.stops.map((stop: any, idx: number) => {
                // Dùng sequence từ stop nếu có, fallback về idx + 1
                const stopSeq = (stop as any).sequence || idx + 1;
                const savedStatus = statuses.find(
                  (s: any) => s.thuTuDiem === stopSeq || s.thuTuDiem === idx + 1
                );

                if (savedStatus) {
                  // If both arrival and departure times exist, mark as completed
                  if (savedStatus.thoiGianDen && savedStatus.thoiGianRoi) {
                    return { ...stop, status: "completed" };
                  }
                  // If only arrival time exists, mark as current
                  if (savedStatus.thoiGianDen) {
                    return { ...stop, status: "current" };
                  }
                }
                return stop;
              }),
            }));

            // Update currentStop to first non-completed stop
            // 🔥 FIX: Match bằng sequence thật từ stop
            const firstNonCompleted = mappedStops.findIndex(
              (s: any, idx: number) => {
                const stopSeq = (s as any).sequence || idx + 1;
                const savedStatus = statuses.find(
                  (s: any) => s.thuTuDiem === stopSeq || s.thuTuDiem === idx + 1
                );
                return !savedStatus || !savedStatus.thoiGianRoi;
              }
            );
            if (firstNonCompleted >= 0) {
              setTrip((prev) => ({ ...prev, currentStop: firstNonCompleted }));
            }
          }
        } catch (statusError) {
          console.warn(
            "[Driver Trip] Failed to load stop statuses:",
            statusError
          );
          // Not critical - continue without status
        }
      } catch (e) {
        console.error("Failed to load trip detail", e);
        toast({
          title: "Lỗi",
          description: "Không thể tải thông tin chuyến đi. Vui lòng thử lại.",
          variant: "destructive",
        });
      }
    }
    loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripIdNum]);

  // P1 Fix: Calculate ETA for current stop using useETA hook
  const currentStopData = trip.stops[trip.currentStop] as any;
  // Use actual coordinates from stop data (lat/lng from API)
  const nextStopCoords =
    currentStopData &&
    Number.isFinite(currentStopData.lat) &&
    Number.isFinite(currentStopData.lng)
      ? { lat: currentStopData.lat, lng: currentStopData.lng }
      : null;

  const etaParams =
    busLocation && nextStopCoords
      ? {
          origins: [`${busLocation.lat},${busLocation.lng}`],
          destinations: [`${nextStopCoords.lat},${nextStopCoords.lng}`],
          mode: "driving" as const,
          enabled:
            tripStatus === "dang_chay" && !!busLocation && !!nextStopCoords,
        }
      : { origins: [], destinations: [], enabled: false };

  const {
    data: etaData,
    isFetchedFromCacheFE,
    isBESaysCached,
  } = useETA(etaParams);

  const currentStop = trip.stops[trip.currentStop];
  const progress = ((trip.currentStop + 1) / trip.stops.length) * 100;

  // 🔥 UPDATE: Sử dụng API endpoints mới (POST /checkin, /absent, /checkout)
  const handleStudentCheckin = async (studentId: string) => {
    // Update UI optimistically
    setTrip((prev) => ({
      ...prev,
      stops: prev.stops.map((stop) =>
        stop.id === currentStop.id
          ? {
              ...stop,
              students: stop.students.map((student) =>
                student.id === studentId
                  ? { ...student, status: "picked" }
                  : student
              ),
            }
          : stop
      ),
    }));

    // Call API POST /checkin
    try {
      const token = localStorage.getItem("ssb_token");
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

      const response = await fetch(
        `${API_URL}/trips/${tripIdNum}/students/${studentId}/checkin`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to checkin student");
      }

      const result = await response.json();
      console.log("[Driver Trip] Student checked in:", result);

      toast({
        title: "✅ Đã đón học sinh",
        description: "Phụ huynh đã nhận thông báo",
      });
      
      // 🔥 FIX: Invalidate cache và reload trip data để cập nhật summary
      apiCache.invalidate(`trip-${tripIdNum}`);
      const res = await api.getTripById(tripIdNum);
      const data: any = (res as any).data || res;
      apiCache.set(`trip-${tripIdNum}`, data, 30000);
      if (data?.summary) {
        // Update summary nếu có
        console.log("[Driver Trip] Updated summary:", data.summary);
      }
    } catch (error: any) {
      console.error("[Driver Trip] Error checking in student:", error);
      // Revert UI on error
      setTrip((prev) => ({
        ...prev,
        stops: prev.stops.map((stop) =>
          stop.id === currentStop.id
            ? {
                ...stop,
                students: stop.students.map((student) =>
                  student.id === studentId
                    ? { ...student, status: "pending" }
                    : student
                ),
              }
            : stop
        ),
      }));
      toast({
        title: "❌ Lỗi cập nhật",
        description: error?.message || "Không thể cập nhật trạng thái học sinh",
        variant: "destructive",
      });
    }
  };

  // 🔥 UPDATE: Sử dụng API POST /absent
  const handleMarkAbsent = async (studentId: string) => {
    // Update UI optimistically
    setTrip((prev) => ({
      ...prev,
      stops: prev.stops.map((stop) =>
        stop.id === currentStop.id
          ? {
              ...stop,
              students: stop.students.map((student) =>
                student.id === studentId
                  ? { ...student, status: "absent" }
                  : student
              ),
            }
          : stop
      ),
    }));

    // Call API POST /absent
    try {
      const token = localStorage.getItem("ssb_token");
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

      const response = await fetch(
        `${API_URL}/trips/${tripIdNum}/students/${studentId}/absent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to mark student as absent");
      }

      const result = await response.json();
      console.log("[Driver Trip] Student marked as absent:", result);

      toast({
        title: "⚠️ Đã đánh dấu vắng",
        description: "Phụ huynh đã nhận thông báo",
      });
      
      // Reload trip data để cập nhật summary
      const res = await api.getTripById(tripIdNum);
      const data: any = (res as any).data || res;
      if (data?.summary) {
        console.log("[Driver Trip] Updated summary:", data.summary);
      }
    } catch (error: any) {
      console.error("[Driver Trip] Error marking student absent:", error);
      // Revert UI on error
      setTrip((prev) => ({
        ...prev,
        stops: prev.stops.map((stop) =>
          stop.id === currentStop.id
            ? {
                ...stop,
                students: stop.students.map((student) =>
                  student.id === studentId
                    ? { ...student, status: "pending" }
                    : student
                ),
              }
            : stop
        ),
      }));
      toast({
        title: "❌ Lỗi cập nhật",
        description: error?.message || "Không thể đánh dấu học sinh vắng",
        variant: "destructive",
      });
    }
  };

  const arriveCurrentStop = async () => {
    console.log("[Driver Trip] arriveCurrentStop called!");
    try {
      setProcessing(true);
      const stopName = currentStop.name || `Điểm dừng ${trip.currentStop + 1}`;
      const stopId = (currentStop as any).id || (currentStop as any).maDiem;
      const stopSequence = (currentStop as any).sequence || trip.currentStop + 1;
      
      // 🔥 FIX: Kiểm tra nếu là điểm cuối thì không cần load students (là điểm trả)
      const isLastStop = trip.currentStop === trip.stops.length - 1;
      
      if (isLastStop) {
        console.log("[Driver Trip] Last stop - dropoff point, skipping student load");
        toast({
          title: "🚏 Đã đến điểm trả học sinh",
          description: `Đây là điểm cuối cùng. Không có học sinh cần đón tại ${stopName}.`,
        });
        setAtCurrentStop(true);
        setProcessing(false);
        return;
      }

      console.log("[Driver Trip] Arriving at stop:", {
        stopId,
        stopSequence,
        stopName,
        tripIdNum,
        isLastStop,
      });

      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("ssb_token")
          : null;

      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

      // 1. Load students at this stop
      try {
        const studentsResponse = await fetch(
          `${API_URL}/trips/${tripIdNum}/stops/${stopSequence}/students`,
          {
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          }
        );

        if (studentsResponse.ok) {
          const studentsData = await studentsResponse.json();
          const studentsList = studentsData.data?.students || [];

          // Update trip state with students at this stop
          setTrip((prev) => ({
            ...prev,
            stops: prev.stops.map((stop, idx) =>
              idx === trip.currentStop
                ? {
                    ...stop,
                    students: studentsList.map((s: any) => ({
                      id: String(s.maHocSinh),
                      name: s.hoTen || "Học sinh",
                      status:
                        s.trangThai === "da_don"
                          ? "picked"
                          : s.trangThai === "vang"
                          ? "absent"
                          : "pending",
                      avatar: s.anhDaiDien || "/placeholder.svg?height=40&width=40",
                      parent: "",
                    })),
                  }
                : stop
            ),
          }));

          console.log(
            `[Driver Trip] Loaded ${studentsList.length} students at stop ${stopSequence}`
          );
        }
      } catch (err) {
        console.warn("[Driver Trip] Failed to load students:", err);
      }

      // 2. Call API to notify arrival at stop (triggers parent notification)
      try {
        const response = await fetch(
          `${API_URL}/trips/${tripIdNum}/stops/${stopSequence}/arrive`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              arrivedAt: new Date().toISOString(),
            }),
          }
        );

        if (!response.ok) {
          console.warn(
            "[Driver Trip] Failed to notify stop arrival:",
            response.statusText
          );
        }
      } catch (err) {
        console.warn("[Driver Trip] Failed to notify stop arrival:", err);
        // Continue anyway - update local state
      }

      setAtCurrentStop(true);

      // Show notification
      toast({
        title: "🚏 Đã đến điểm dừng",
        description: `Xe đã đến ${stopName}. Đã tải danh sách học sinh.`,
      });
    } catch (error) {
      console.error("[Driver Trip] Error arriving at stop:", error);
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật trạng thái điểm dừng",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const leaveCurrentStop = async () => {
    // Chuyển sang điểm tiếp theo
    if (trip.currentStop < trip.stops.length - 1) {
      try {
        setProcessing(true);
        const currentStopName =
          currentStop.name || `Điểm dừng ${trip.currentStop + 1}`;
        const stopId = (currentStop as any).id || (currentStop as any).maDiem;
        const stopSequence = (currentStop as any).sequence || trip.currentStop + 1;

        // Call API to notify leaving stop
        // This will trigger WebSocket notification to parents
        try {
          const token =
            typeof window !== "undefined"
              ? localStorage.getItem("ssb_token")
              : null;
          const response = await fetch(
            `${
              process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1"
            }/trips/${tripIdNum}/stops/${stopSequence}/leave`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({
                leftAt: new Date().toISOString(),
              }),
            }
          );

          if (!response.ok) {
            console.warn(
              "[Driver Trip] Failed to notify stop departure:",
              response.statusText
            );
          }
        } catch (err) {
          console.warn("[Driver Trip] Failed to notify stop departure:", err);
          // Continue anyway - update local state
        }

        setTrip((prev) => ({
          ...prev,
          currentStop: prev.currentStop + 1,
          stops: prev.stops.map((stop, index) =>
            index === prev.currentStop
              ? { ...stop, status: "completed" }
              : index === prev.currentStop + 1
              ? { ...stop, status: "current" }
              : stop
          ),
        }));
        setAtCurrentStop(false);

        // Show notification
        const nextStopName =
          trip.stops[trip.currentStop + 1]?.name ||
          `Điểm dừng ${trip.currentStop + 2}`;
        toast({
          title: "🚌 Đã rời điểm dừng",
          description: `Đang di chuyển đến ${nextStopName}`,
        });
        
        // 🔥 START VELOCITY SIMULATION khi tài xế rời điểm dừng
        // Chỉ start simulation nếu đang ở chế độ DEMO và có routePolyline
        // Nếu ở chế độ REAL, GPS sẽ tự động cập nhật vị trí
        if (locationSource === "demo" && routePolyline && trip.stops.length >= 2 && busLocation) {
          console.log("[Driver Trip] Starting velocity simulation after leaving stop");
          
          // Decode polyline để lấy các điểm trên route
          const decodePolyline = (encoded: string): Array<{ lat: number; lng: number }> => {
            if (!encoded || typeof encoded !== 'string') return [];
            
            const poly: Array<{ lat: number; lng: number }> = [];
            let index = 0;
            const len = encoded.length;
            let lat = 0;
            let lng = 0;
            
            while (index < len) {
              let b: number;
              let shift = 0;
              let result = 0;
              do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
              } while (b >= 0x20);
              const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
              lat += dlat;
              
              shift = 0;
              result = 0;
              do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
              } while (b >= 0x20);
              const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
              lng += dlng;
              
              poly.push({ lat: lat * 1e-5, lng: lng * 1e-5 });
            }
            
            return poly;
          };
          
          let routePoints = decodePolyline(routePolyline);
          
          if (routePoints.length === 0) {
            console.warn("[Driver Trip] Failed to decode route polyline for simulation");
            return;
          }
          
          // Tính khoảng cách giữa 2 điểm (Haversine formula) - Định nghĩa trước khi sử dụng
          const calculateDistance = (p1: { lat: number; lng: number }, p2: { lat: number; lng: number }): number => {
            const R = 6371000; // Earth radius in meters
            const dLat = (p2.lat - p1.lat) * Math.PI / 180;
            const dLng = (p2.lng - p1.lng) * Math.PI / 180;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c; // Distance in meters
          };
          
          // 🧭 Tính toán heading (hướng) chính xác từ 2 điểm GPS (giống Grab)
          const calculateHeading = (p1: { lat: number; lng: number }, p2: { lat: number; lng: number }): number => {
            // Sử dụng công thức bearing (azimuth) chuẩn
            const dLng = (p2.lng - p1.lng) * Math.PI / 180;
            const lat1 = p1.lat * Math.PI / 180;
            const lat2 = p2.lat * Math.PI / 180;
            
            // Công thức bearing chính xác
            const y = Math.sin(dLng) * Math.cos(lat2);
            const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
            
            // Tính bearing (0-360 độ, 0 = Bắc, 90 = Đông, 180 = Nam, 270 = Tây)
            const bearing = Math.atan2(y, x) * 180 / Math.PI;
            
            // Normalize về 0-360
            return (bearing + 360) % 360;
          };
          
          // Tìm điểm hiện tại trên route (gần nhất với vị trí hiện tại)
          const currentBusLocation = busLocation || (trip.stops[trip.currentStop] ? { lat: trip.stops[trip.currentStop].lat, lng: trip.stops[trip.currentStop].lng } : routePoints[0]);
          let currentPointIndex = 0;
          let minDistance = Infinity;
          
          routePoints.forEach((point, idx) => {
            const dist = calculateDistance(currentBusLocation, point);
            if (dist < minDistance) {
              minDistance = dist;
              currentPointIndex = idx;
            }
          });
          
          console.log(`[Driver Trip] Starting simulation from point ${currentPointIndex} of ${routePoints.length} (distance: ${Math.round(minDistance)}m from current location)`);
          
          // 🚗 Vận tốc cố định: 30 km/h = 8.33 m/s (giống Grab)
          const TARGET_SPEED_KMH = 30; // km/h
          const TARGET_SPEED_MS = (TARGET_SPEED_KMH * 1000) / 3600; // 8.33 m/s
          const UPDATE_INTERVAL_MS = 1000; // Update every 1 second (60 FPS simulation)
          
          let distanceTraveled = 0; // meters traveled in current segment
          let prevLocation: { lat: number; lng: number } | undefined = currentBusLocation;
          
          // 🔥 FIX: Track current stop để tự động arrive khi gần điểm dừng
          // Sử dụng ref để có thể access từ bên ngoài closure
          const currentStopIndexRef = { value: trip.currentStop || 0 };
          const isAtStopRef = { value: false }; // Flag để biết đang dừng tại điểm dừng
          
          // Clear existing simulation if any
          const existingInterval = (window as any).__velocitySimulationInterval;
          if (existingInterval) {
            clearInterval(existingInterval);
          }
          
          const velocityInterval = setInterval(() => {
            // 🔥 FIX: Check nếu đang dừng tại điểm dừng TRƯỚC KHI update location
            if (isAtStopRef.value) {
              return; // Không update location, dừng tại chỗ
            }
            
            setBusLocation((prev) => {
              if (!prev || currentPointIndex >= routePoints.length - 1) {
                clearInterval(velocityInterval);
                (window as any).__velocitySimulationInterval = undefined;
                return routePoints[routePoints.length - 1];
              }
              
              // Tính toán vị trí mới trước
              distanceTraveled += TARGET_SPEED_MS;
              
              while (currentPointIndex < routePoints.length - 1) {
                const currentPoint = routePoints[currentPointIndex];
                const nextPoint = routePoints[currentPointIndex + 1];
                const segmentDist = calculateDistance(currentPoint, nextPoint);
                
                if (distanceTraveled >= segmentDist) {
                  distanceTraveled -= segmentDist;
                  currentPointIndex++;
                  continue;
                } else {
                  const ratio = distanceTraveled / segmentDist;
                  const newLat = currentPoint.lat + (nextPoint.lat - currentPoint.lat) * ratio;
                  const newLng = currentPoint.lng + (nextPoint.lng - currentPoint.lng) * ratio;
                  const newLocation = { lat: newLat, lng: newLng };
                  
                  // 🔥 FIX: Sync currentStopIndexRef với trip.currentStop mỗi lần check
                  // Đảm bảo luôn dùng giá trị mới nhất từ trip state
                  // Lấy giá trị mới nhất từ trip state (sử dụng closure)
                  const latestCurrentStop = trip.currentStop || 0;
                  if (currentStopIndexRef.value !== latestCurrentStop) {
                    console.log(`[Driver Trip] 🔄 Syncing currentStopIndexRef: ${currentStopIndexRef.value} → ${latestCurrentStop}`);
                    currentStopIndexRef.value = latestCurrentStop;
                  }
                  
                  // Check khoảng cách đến điểm dừng tiếp theo SAU KHI tính toán vị trí mới
                  const currentStopIdx = currentStopIndexRef.value;
                  const nextStopIndex = currentStopIdx + 1;
                  
                  if (nextStopIndex < trip.stops.length) {
                    const nextStop = trip.stops[nextStopIndex];
                    if (nextStop && nextStop.lat && nextStop.lng) {
                      // Check distance từ vị trí MỚI (newLocation) đến điểm dừng
                      const distanceToStop = calculateDistance(newLocation, { lat: nextStop.lat, lng: nextStop.lng });
                      
                      // 🔥 FIX: Tăng threshold lên 50m để đảm bảo không miss điểm dừng
                      // Vì xe di chuyển 8.33m/giây, nếu check < 30m có thể miss
                      const nextStopSeq = (nextStop as any).sequence || nextStopIndex + 1;
                      const nextStopSeqNum = typeof nextStopSeq === 'number' ? nextStopSeq : parseInt(String(nextStopSeq));
                      const isAlreadyArrived = arrivedStopsRef.current.has(nextStopSeqNum);
                      const isPending = pendingArrivesRef.current.has(nextStopSeqNum);
                      
                      if (distanceToStop < 50 && !isAlreadyArrived && !isPending) {
                        console.log(`[Driver Trip] 🚏 Auto-arriving at stop ${nextStopIndex + 1} (${nextStop.name}) - distance: ${Math.round(distanceToStop)}m`);
                        
                        // Dừng simulation ngay lập tức
                        isAtStopRef.value = true;
                        currentStopIndexRef.value = nextStopIndex;
                        
                        // 🔒 Mark as pending để tránh duplicate calls
                        pendingArrivesRef.current.add(nextStopSeqNum);
                        
                        const token = typeof window !== "undefined" ? localStorage.getItem("ssb_token") : null;
                        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
                        
                        // 🔥 FIX: Dừng tại vị trí điểm dừng (không di chuyển thêm)
                        const stopLocation = { lat: nextStop.lat, lng: nextStop.lng };
                        
                        // 1. Call arrive API
                        fetch(`${API_URL}/trips/${tripIdNum}/stops/${nextStopSeqNum}/arrive`, {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            ...(token ? { Authorization: `Bearer ${token}` } : {}),
                          },
                          body: JSON.stringify({
                            arrivedAt: new Date().toISOString(),
                          }),
                        })
                          .then((res) => {
                            if (res.ok) {
                              console.log(`[Driver Trip] ✅ Auto-arrived at stop ${nextStopSeqNum}`);
                              
                              // 🔒 Mark as arrived và remove from pending (atomic operation)
                              arrivedStopsRef.current.add(nextStopSeqNum);
                              pendingArrivesRef.current.delete(nextStopSeqNum);
                              
                              // 🔥 FIX: Thêm toast notification
                              toast({
                                title: "🚏 Đã đến điểm dừng",
                                description: `Xe đã đến ${nextStop.name || `điểm dừng ${nextStopIndex + 1}`}`,
                                variant: "default",
                              });
                              
                              setAtCurrentStop(true);
                              // 🔥 FIX: Update currentStopIndexRef khi trip state thay đổi
                              currentStopIndexRef.value = nextStopIndex;
                              
                              setTrip((prev) => ({
                                ...prev,
                                currentStop: nextStopIndex,
                                stops: prev.stops.map((stop, idx) => {
                                  if (idx === nextStopIndex) {
                                    return { ...stop, status: "current" as const };
                                  } else if (idx < nextStopIndex) {
                                    return { ...stop, status: "completed" as const };
                                  }
                                  return stop;
                                }),
                              }));
                              
                              // 2. Load students
                              fetch(`${API_URL}/trips/${tripIdNum}/stops/${nextStopSeqNum}/students`, {
                                headers: {
                                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                                },
                              })
                                .then((res) => res.json())
                                .then((data) => {
                                  const studentsList = data.data?.students || [];
                                  setTrip((prev) => ({
                                    ...prev,
                                    stops: prev.stops.map((stop, idx) =>
                                      idx === nextStopIndex
                                        ? {
                                            ...stop,
                                            students: studentsList.map((s: any) => ({
                                              id: String(s.maHocSinh),
                                              name: s.hoTen || "Học sinh",
                                              status:
                                                s.trangThai === "da_don"
                                                  ? "picked"
                                                  : s.trangThai === "vang"
                                                  ? "absent"
                                                  : "pending",
                                              avatar: s.anhDaiDien || "/placeholder.svg?height=40&width=40",
                                              parent: s.soDienThoaiPhuHuynh || "",
                                            })),
                                          }
                                        : stop
                                    ),
                                  }));
                                  
                                  console.log(`[Driver Trip] ✅ Loaded ${studentsList.length} students at stop ${nextStopSeqNum}`);
                                })
                                .catch((err) => {
                                  console.warn("[Driver Trip] Failed to load students:", err);
                                });
                              
                              // 3. Đợi 5 giây tại điểm dừng, sau đó tiếp tục
                              setTimeout(() => {
                                console.log(`[Driver Trip] Leaving stop ${nextStopSeqNum}, continuing to next stop`);
                                isAtStopRef.value = false;
                                setAtCurrentStop(false);
                                
                                toast({
                                  title: "🚌 Đã rời điểm dừng",
                                  description: `Đang di chuyển đến điểm dừng tiếp theo`,
                                  variant: "default",
                                });
                                
                                fetch(`${API_URL}/trips/${tripIdNum}/stops/${nextStopSeqNum}/leave`, {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                                  },
                                  body: JSON.stringify({
                                    leftAt: new Date().toISOString(),
                                  }),
                                }).catch((err) => {
                                  console.warn("[Driver Trip] Failed to leave stop:", err);
                                });
                              }, 5000);
                            } else {
                              // API failed, allow retry
                              isAtStopRef.value = false;
                              // 🔒 Remove from pending to allow retry (không add vào arrivedStopsRef)
                              pendingArrivesRef.current.delete(nextStopSeqNum);
                            }
                          })
                          .catch((err) => {
                            console.warn("[Driver Trip] Failed to auto-arrive:", err);
                            // 🔒 Remove from pending to allow retry (không add vào arrivedStopsRef)
                            pendingArrivesRef.current.delete(nextStopSeqNum);
                            isAtStopRef.value = false;
                          });
                        
                        // Return stop location để dừng tại điểm dừng
                        return stopLocation;
                      }
                    }
                  }
                  
                  // Nếu không gần điểm dừng, tiếp tục di chuyển
                  // 🧭 Tính toán và cập nhật heading (hướng) chính xác
                  if (prevLocation) {
                    const heading = calculateHeading(prevLocation, newLocation);
                    setBusHeading(heading);
                    
                    // 🔥 FIX: Gửi GPS update lên backend với heading chính xác
                    try {
                      const socket = socketService.getSocket();
                      if (socket && socket.connected) {
                        socket.emit("driver_gps", {
                          tripId: tripIdNum,
                          lat: newLat,
                          lng: newLng,
                          speed: TARGET_SPEED_KMH, // Gửi km/h
                          heading: heading, // Heading đã tính từ prevLocation -> newLocation
                        });
                      }
                    } catch (err) {
                      // Ignore
                    }
                  }
                  prevLocation = newLocation;
                  
                  return newLocation;
                }
              }
              
              return routePoints[routePoints.length - 1];
            });
          }, UPDATE_INTERVAL_MS);
          
          // Store interval ID for cleanup later
          (window as any).__velocitySimulationInterval = velocityInterval;
        }
      } catch (error) {
        console.error("[Driver Trip] Error leaving stop:", error);
        toast({
          title: "Lỗi",
          description: "Không thể cập nhật trạng thái điểm dừng",
          variant: "destructive",
        });
      } finally {
        setProcessing(false);
      }
    }
  };

  async function doStartTrip() {
    try {
      setProcessing(true);
      console.log("[Driver Trip] Starting trip:", tripIdNum);
      const res = await startTrip(tripIdNum);
      console.log("[Driver Trip] Start trip response:", res);

      // Extract trip ID from response
      const newId =
        (res as any)?.data?.maChuyen ||
        (res as any)?.trip?.maChuyen ||
        (res as any)?.maChuyen ||
        tripIdNum;

      // Start GPS tracking only if REAL mode is selected
      if (locationSource === "real") {
        startGPS();
      }
      
      // 🔥 FIX: KHÔNG tự động chạy simulation khi bắt đầu
      // Chỉ set vị trí ban đầu ở điểm đầu tiên, chờ tài xế bấm "Rời điểm dừng" mới bắt đầu di chuyển
      if (trip.stops.length >= 2) {
        // Set initial location at first stop để hiển thị trên map
        const firstStop = trip.stops[0];
        if (firstStop.lat && firstStop.lng) {
          console.log("[Driver Trip] Setting initial location at first stop (waiting for driver to leave stop)");
          setBusLocation({ lat: firstStop.lat, lng: firstStop.lng });
          
          // 🔥 Tự động đánh dấu đã đến điểm đầu tiên khi bắt đầu chuyến
          // Điểm đầu tiên là điểm đón học sinh đầu tiên (không phải điểm cuối)
          const firstStopIndex = 0;
          const isLastStop = firstStopIndex === trip.stops.length - 1;
          const firstStopSequence = (firstStop as any).sequence || 1;
          
          if (!isLastStop) {
            // Auto-arrive at first stop
            const token = typeof window !== "undefined" ? localStorage.getItem("ssb_token") : null;
            const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
            
            // Mark as arrived to prevent duplicate calls
            arrivedStopsRef.current.add(firstStopSequence);
            
            // Auto-call arriveAtStop API for first stop
            fetch(`${API_URL}/trips/${newId}/stops/${firstStopSequence}/arrive`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({
                arrivedAt: new Date().toISOString(),
              }),
            })
              .then((res) => {
                if (res.ok) {
                  console.log(`[Driver Trip] ✅ Auto-arrived at first stop ${firstStopSequence} (index ${firstStopIndex})`);
                  setAtCurrentStop(true);
                  
                  // Update trip state
                  setTrip((prev) => ({
                    ...prev,
                    currentStop: firstStopIndex,
                    stops: prev.stops.map((stop, idx) =>
                      idx === firstStopIndex
                        ? { ...stop, status: "current" as const }
                        : stop
                    ),
                  }));
                  
                  // Load students at first stop
                  fetch(`${API_URL}/trips/${newId}/stops/${firstStopSequence}/students`, {
                    headers: {
                      ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                  })
                    .then((res) => res.json())
                    .then((data) => {
                      const studentsList = data.data?.students || [];
                      setTrip((prev) => ({
                        ...prev,
                        stops: prev.stops.map((stop, idx) =>
                          idx === firstStopIndex
                            ? {
                                ...stop,
                                students: studentsList.map((s: any) => ({
                                  id: String(s.maHocSinh),
                                  name: s.hoTen || "Học sinh",
                                  status:
                                    s.trangThai === "da_don"
                                      ? "picked"
                                      : s.trangThai === "vang"
                                      ? "absent"
                                      : "pending",
                                  avatar: s.anhDaiDien || "/placeholder.svg?height=40&width=40",
                                  parent: s.soDienThoaiPhuHuynh || "",
                                })),
                              }
                            : stop
                        ),
                      }));
                      
                      // 🚗 FIX: Tự động bắt đầu di chuyển nếu ở demo mode
                      // Sau khi load students, đợi 5 giây để đón học sinh, sau đó tự động start velocity simulation
                      if (locationSource === "demo" && routePolyline && busLocation && trip.stops.length >= 2) {
                        console.log("[Driver Trip] 🚗 Demo mode: Will auto-start movement after 5 seconds at first stop...");
                        setTimeout(() => {
                          console.log("[Driver Trip] 🚗 Auto-starting velocity simulation in demo mode after first stop");
                          
                          // Call leave API for first stop
                          const token = typeof window !== "undefined" ? localStorage.getItem("ssb_token") : null;
                          const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
                          
                          fetch(`${API_URL}/trips/${newId}/stops/${firstStopSequence}/leave`, {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              ...(token ? { Authorization: `Bearer ${token}` } : {}),
                            },
                            body: JSON.stringify({
                              leftAt: new Date().toISOString(),
                            }),
                          })
                            .then(() => {
                              console.log("[Driver Trip] ✅ Left first stop, starting simulation...");
                              // Set atCurrentStop = false để trigger simulation
                              setAtCurrentStop(false);
                              // 🔥 FIX: Gọi trực tiếp leaveCurrentStop để start simulation
                              // Sử dụng setTimeout để đảm bảo state đã được update
                              setTimeout(() => {
                                // leaveCurrentStop sẽ start simulation nếu ở demo mode
                                if (typeof leaveCurrentStop === 'function') {
                                  leaveCurrentStop();
                                }
                              }, 200);
                            })
                            .catch((err) => {
                              console.warn("[Driver Trip] Failed to leave first stop:", err);
                              // Vẫn start simulation ngay cả khi API fail
                              setAtCurrentStop(false);
                              setTimeout(() => {
                                if (typeof leaveCurrentStop === 'function') {
                                  leaveCurrentStop();
                                }
                              }, 200);
                            });
                        }, 5000); // Đợi 5 giây tại điểm đầu tiên để đón học sinh
                      }
                    })
                    .catch((err) => {
                      console.warn("[Driver Trip] Failed to load students at first stop:", err);
                    });
                } else {
                  // Remove from set to allow retry
                  arrivedStopsRef.current.delete(firstStopSequence);
                }
              })
              .catch((err) => {
                console.warn("[Driver Trip] Failed to auto-arrive at first stop:", err);
                // Remove from set to allow retry
                arrivedStopsRef.current.delete(firstStopSequence);
              });
          }
        }
        
        // 🔥 FIX: Nếu không phải demo mode, chờ tài xế bấm "Rời điểm dừng"
        if (locationSource !== "demo") {
          console.log("[Driver Trip] Real mode: Waiting at first stop for driver to leave");
        }
      } else {
        // Fallback: Nếu không có stops, không làm gì
        console.warn("[Driver Trip] Not enough stops to start trip");
      }
      
      // 🚗 AUTO-START: Trong demo mode, tự động start velocity simulation sau khi arrive tại điểm đầu
      // Đợi một chút để đảm bảo auto-arrive đã hoàn thành
      if (locationSource === "demo" && routePolyline && busLocation && trip.stops.length >= 2) {
        console.log("[Driver Trip] 🚗 Demo mode: Will auto-start movement after arriving at first stop...");
        
        // Đợi 6 giây (1s để arrive + 5s để đón học sinh) rồi tự động chạy
        setTimeout(() => {
          // Kiểm tra lại điều kiện trước khi start
          if (
            tripStatus === "dang_chay" &&
            locationSource === "demo" &&
            routePolyline &&
            busLocation &&
            !(window as any).__velocitySimulationInterval
          ) {
            console.log("[Driver Trip] 🚗 Auto-starting velocity simulation after arriving at first stop in demo mode");
            // Trigger simulation bằng cách gọi logic tương tự leaveCurrentStop
            // Nhưng không cần gọi API leave vì chưa thực sự rời điểm dừng
            // Chỉ cần start simulation để xe di chuyển
            setAtCurrentStop(false);
          }
        }, 6000); // 6 giây: 1s arrive + 5s đón học sinh
      }
      
      // 🔥 Reload trip data to get updated status (BẮT BUỘC)
      // Đảm bảo UI sync với backend sau khi start trip
      try {
        const updatedRes = await api.getTripById(newId);
        const updatedData: any = (updatedRes as any).data || updatedRes;

        console.log("[Driver Trip] Reloaded trip data after start:", {
          trangThai: updatedData?.trangThai,
          maChuyen: updatedData?.maChuyen,
        });

        // Update trip status in state
        if (updatedData?.trangThai) {
          setTripStatus(updatedData.trangThai);
          // 🔥 Update started state dựa trên trangThai từ backend
          setStarted(updatedData.trangThai === "dang_chay");
        } else {
          // Fallback: Nếu không có trangThai từ backend, dùng state đã set
          setTripStatus("dang_chay");
          setStarted(true);
        }

        // Update route name if available
        const routeName =
          updatedData?.routeInfo?.tenTuyen ||
          updatedData?.tuyen?.tenTuyen ||
          updatedData?.tenTuyen ||
          trip.route;

        // 🔥 Update trip state với data mới từ backend
        setTrip((prev) => ({
          ...prev,
          route: routeName,
          status: updatedData?.trangThai === "dang_chay" ? "in-progress" : prev.status,
          startTime: updatedData?.gioBatDauThucTe || updatedData?.schedule?.gioKhoiHanh || prev.startTime,
        }));
      } catch (reloadError) {
        console.error(
          "[Driver Trip] Failed to reload trip data after start:",
          reloadError
        );
        // 🔥 FIX: Retry reload status từ backend (tối đa 3 lần)
        let retryCount = 0;
        const maxRetries = 3;
        const retryReload = async () => {
          try {
            const retryRes = await api.getTripById(newId);
            const retryData: any = (retryRes as any).data || retryRes;
            if (retryData?.trangThai) {
              console.log("[Driver Trip] ✅ Successfully reloaded trip status after retry:", retryData.trangThai);
              setTripStatus(retryData.trangThai);
              setStarted(retryData.trangThai === "dang_chay");
              return; // Success, stop retrying
            }
          } catch (retryError) {
            console.warn(`[Driver Trip] Retry ${retryCount + 1}/${maxRetries} failed:`, retryError);
          }
          
          retryCount++;
          if (retryCount < maxRetries) {
            // Retry after 1 second
            setTimeout(retryReload, 1000);
          } else {
            // Max retries reached, use fallback
            console.warn("[Driver Trip] Max retries reached, using fallback state");
            setTripStatus("dang_chay");
            setStarted(true);
            setTrip((prev) => ({
              ...prev,
              status: "in-progress",
            }));
          }
        };
        
        // Start retry after 500ms
        setTimeout(retryReload, 500);
      }

      toast({
        title: "Đã bắt đầu chuyến đi",
        description: `Chuyến đi #${newId} đang chạy`,
      });

      // Only redirect if trip ID changed
      if (newId && newId !== tripIdNum) {
        router.push(`/driver/trip/${newId}`);
      } else {
        // 🔥 Nếu trip ID không đổi, trigger reload bằng cách refresh page hoặc reload data
        // Option 1: Reload lại toàn bộ trip data (giống như useEffect ban đầu)
        // Option 2: Chỉ cần đảm bảo state đã được update (đã làm ở trên)
        // Hiện tại state đã được update, nhưng để chắc chắn, có thể force re-render
        console.log("[Driver Trip] Trip started, state updated. No redirect needed.");
      }
    } catch (e: any) {
      // 🔥 FIX: Khi start trip thất bại, vẫn reload status từ backend để sync
      console.error("[Driver Trip] Error starting trip:", e);
      
      // Reload trip status từ backend để đảm bảo sync
      try {
        const reloadRes = await api.getTripById(tripIdNum);
        const reloadData: any = (reloadRes as any).data || reloadRes;
        if (reloadData?.trangThai) {
          console.log("[Driver Trip] ✅ Reloaded trip status after error:", reloadData.trangThai);
          setTripStatus(reloadData.trangThai);
          setStarted(reloadData.trangThai === "dang_chay");
        }
      } catch (reloadError) {
        console.error("[Driver Trip] Failed to reload trip status after error:", reloadError);
        // Keep current state if reload fails
      }
      
      // 🔥 Cải thiện error handling: Extract error message từ nhiều nguồn
      let errorMessage = "Vui lòng thử lại"
      const isAlreadyStarted = 
        e?.errorCode === "TRIP_ALREADY_STARTED_OR_INVALID_STATUS" ||
        e?.errorData?.errorCode === "TRIP_ALREADY_STARTED_OR_INVALID_STATUS" ||
        e?.message?.includes("đã bắt đầu") ||
        e?.message?.includes("chưa khởi hành") ||
        e?.errorData?.message?.includes("đã bắt đầu") ||
        e?.errorData?.message?.includes("chưa khởi hành")
      
      if (e?.message) {
        errorMessage = e.message
      } else if (e?.errorData?.message) {
        errorMessage = e.errorData.message
      } else if (e?.errorData?.error?.message) {
        errorMessage = e.errorData.error.message
      } else if (e?.response?.data?.message) {
        errorMessage = e.response.data.message
      } else if (e?.response?.data?.error?.message) {
        errorMessage = e.response.data.error.message
      } else if (e?.response?.data?.error) {
        errorMessage = typeof e.response.data.error === 'string' 
          ? e.response.data.error 
          : JSON.stringify(e.response.data.error)
      } else if (e?.errorCode) {
        errorMessage = `Error code: ${e.errorCode}`
      } else if (e?.status) {
        errorMessage = `HTTP ${e.status}: ${e.statusText || 'Request failed'}`
      } else if (typeof e === 'string') {
        errorMessage = e
      } else if (e?.error) {
        errorMessage = typeof e.error === 'string' ? e.error : JSON.stringify(e.error)
      }
      
      console.error("[Driver Trip] Failed to start trip:", {
        error: e,
        errorMessage,
        status: e?.status,
        errorCode: e?.errorCode,
        responseData: e?.response?.data || e?.errorData,
        errorDataFull: JSON.stringify(e, null, 2).substring(0, 500), // Log full error (first 500 chars)
        url: e?.url,
        stack: e?.stack?.substring(0, 200),
        isAlreadyStarted,
      });

      // 🔥 Nếu trip đã start rồi, reload lại trip data để sync UI
      if (isAlreadyStarted || e?.status === 400) {
        console.log("[Driver Trip] Trip already started, reloading trip data...");
        try {
          const reloadRes = await api.getTripById(tripIdNum);
          const reloadData: any = (reloadRes as any).data || reloadRes;
          
          if (reloadData?.trangThai) {
            setTripStatus(reloadData.trangThai);
            setStarted(reloadData.trangThai === "dang_chay");
            console.log("[Driver Trip] Reloaded trip status:", reloadData.trangThai);
          }
        } catch (reloadErr) {
          console.error("[Driver Trip] Failed to reload trip data:", reloadErr);
        }
      }

      toast({
        title: isAlreadyStarted ? "Chuyến đi đã bắt đầu" : "Không thể bắt đầu chuyến",
        description: isAlreadyStarted 
          ? "Chuyến đi này đã được bắt đầu trước đó. Đang tải lại thông tin..."
          : errorMessage,
        variant: isAlreadyStarted ? "default" : "destructive",
        duration: 7000,
      });
    } finally {
      setProcessing(false);
    }
  }

  const finishTrip = async () => {
    try {
      setProcessing(true);
      // Gọi API kết thúc nếu backend có hỗ trợ
      await endTrip(tripIdNum);
      stopGPS();
      setTripStatus("hoan_thanh");
      toast({
        title: "Hoàn thành chuyến đi",
        description: `Trip ${tripIdNum} đã kết thúc`,
      });
      // Điều hướng về giao diện chính Driver
      router.push("/driver");
    } catch (e) {
      toast({
        title: "Không thể kết thúc chuyến",
        description: (e as Error)?.message || "Vui lòng thử lại",
        variant: "destructive",
      });
      // Vẫn cho phép quay về trang chính nếu muốn
      router.push("/driver");
    } finally {
      setProcessing(false);
    }
  };

  // P1 Fix: Cancel Trip handler
  const handleCancelTrip = async () => {
    try {
      setProcessing(true);
      setIsCancelDialogOpen(false);
      await cancelTrip(tripIdNum);
      stopGPS();
      setTripStatus("huy");
      toast({
        title: "Đã hủy chuyến đi",
        description: `Trip ${tripIdNum} đã được hủy`,
        variant: "destructive",
      });
      // Điều hướng về giao diện chính Driver
      router.push("/driver");
    } catch (e) {
      toast({
        title: "Không thể hủy chuyến",
        description: (e as Error)?.message || "Vui lòng thử lại",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  // Listen for trip_cancelled event
  useEffect(() => {
    const handleTripCancelled = (event: Event) => {
      const data = (event as CustomEvent).detail;
      const cancelledTripId = data?.tripId || data?.trip_id || data?.maChuyen;
      if (cancelledTripId && Number(cancelledTripId) === effectiveTripId) {
        toast({
          title: "Chuyến đi đã bị hủy",
          description: `Trip ${cancelledTripId} đã được hủy`,
          variant: "destructive",
        });
        setTripStatus("huy");
        stopGPS();
      }
    };

    window.addEventListener(
      "tripCancelled",
      handleTripCancelled as EventListener
    );
    return () => {
      window.removeEventListener(
        "tripCancelled",
        handleTripCancelled as EventListener
      );
    };
  }, [effectiveTripId, toast, stopGPS]);

  // 🔥 FIX: Auto-start velocity simulation khi trip bắt đầu trong demo mode
  // Tự động bắt đầu simulation sau khi trip đã start và đã auto-arrive tại điểm đầu tiên
  useEffect(() => {
    // Chỉ start simulation nếu:
    // 1. Trip đang chạy
    // 2. Ở demo mode
    // 3. Có routePolyline và busLocation
    // 4. Chưa có simulation đang chạy
    // 5. Đã auto-arrive tại điểm đầu tiên (atCurrentStop = true ban đầu, sau đó set = false để trigger)
    if (
      tripStatus === "dang_chay" &&
      locationSource === "demo" &&
      routePolyline &&
      busLocation &&
      trip.stops.length >= 2 &&
      !(window as any).__velocitySimulationInterval
    ) {
      // Đợi một chút để đảm bảo tất cả state đã được set
      const timeoutId = setTimeout(() => {
        // Kiểm tra lại điều kiện
        if (
          tripStatus === "dang_chay" &&
          locationSource === "demo" &&
          routePolyline &&
          busLocation &&
          !(window as any).__velocitySimulationInterval
        ) {
          console.log("[Driver Trip] 🔥 Auto-starting velocity simulation in demo mode");
          // Trigger simulation bằng cách set atCurrentStop = false
          // Điều này sẽ trigger logic trong leaveCurrentStop
          setAtCurrentStop(false);
          
          // Gọi trực tiếp logic start simulation (tương tự leaveCurrentStop)
          // Decode polyline
          const decodePolyline = (encoded: string): Array<{ lat: number; lng: number }> => {
            if (!encoded || typeof encoded !== 'string') return [];
            const poly: Array<{ lat: number; lng: number }> = [];
            let index = 0;
            const len = encoded.length;
            let lat = 0;
            let lng = 0;
            
            while (index < len) {
              let b: number;
              let shift = 0;
              let result = 0;
              do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
              } while (b >= 0x20);
              const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
              lat += dlat;
              
              shift = 0;
              result = 0;
              do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
              } while (b >= 0x20);
              const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
              lng += dlng;
              
              poly.push({ lat: lat * 1e-5, lng: lng * 1e-5 });
            }
            
            return poly;
          };
          
          const calculateDistance = (p1: { lat: number; lng: number }, p2: { lat: number; lng: number }): number => {
            const R = 6371000;
            const dLat = (p2.lat - p1.lat) * Math.PI / 180;
            const dLng = (p2.lng - p1.lng) * Math.PI / 180;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c;
          };
          
          // 🧭 Tính toán heading (hướng) chính xác từ 2 điểm GPS (giống Grab)
          const calculateHeading = (p1: { lat: number; lng: number }, p2: { lat: number; lng: number }): number => {
            // Sử dụng công thức bearing (azimuth) chuẩn
            const dLng = (p2.lng - p1.lng) * Math.PI / 180;
            const lat1 = p1.lat * Math.PI / 180;
            const lat2 = p2.lat * Math.PI / 180;
            
            // Công thức bearing chính xác
            const y = Math.sin(dLng) * Math.cos(lat2);
            const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
            
            // Tính bearing (0-360 độ, 0 = Bắc, 90 = Đông, 180 = Nam, 270 = Tây)
            const bearing = Math.atan2(y, x) * 180 / Math.PI;
            
            // Normalize về 0-360
            return (bearing + 360) % 360;
          };
          
          let routePoints = decodePolyline(routePolyline);
          
          if (routePoints.length > 0) {
            const currentBusLocation = busLocation;
            let currentPointIndex = 0;
            let minDistance = Infinity;
            
            routePoints.forEach((point, idx) => {
              const dist = calculateDistance(currentBusLocation, point);
              if (dist < minDistance) {
                minDistance = dist;
                currentPointIndex = idx;
              }
            });
            
            console.log(`[Driver Trip] ✅ Auto-starting simulation from point ${currentPointIndex} of ${routePoints.length}`);
            
            // 🚗 Vận tốc cố định: 30 km/h = 8.33 m/s (giống Grab)
            const TARGET_SPEED_KMH = 30; // km/h
            const TARGET_SPEED_MS = (TARGET_SPEED_KMH * 1000) / 3600; // 8.33 m/s
            const UPDATE_INTERVAL_MS = 1000; // Update every 1 second
            let distanceTraveled = 0;
            let prevLocation: { lat: number; lng: number } | undefined = currentBusLocation;
            
            // 🔥 FIX: Track current stop để tự động arrive khi gần điểm dừng
            // Sử dụng ref để có thể access từ bên ngoài closure
            const currentStopIndexRef = { value: trip.currentStop || 0 };
            const isAtStopRef = { value: false }; // Flag để biết đang dừng tại điểm dừng
            
            const velocityInterval = setInterval(() => {
              // 🔥 FIX: Check nếu đang dừng tại điểm dừng TRƯỚC KHI update location
              if (isAtStopRef.value) {
                return; // Không update location, dừng tại chỗ
              }
              
              setBusLocation((prev) => {
                if (!prev || currentPointIndex >= routePoints.length - 1) {
                  clearInterval(velocityInterval);
                  (window as any).__velocitySimulationInterval = undefined;
                  return routePoints[routePoints.length - 1];
                }
                
                distanceTraveled += TARGET_SPEED_MS;
                
                while (currentPointIndex < routePoints.length - 1) {
                  const currentPoint = routePoints[currentPointIndex];
                  const nextPoint = routePoints[currentPointIndex + 1];
                  const segmentDist = calculateDistance(currentPoint, nextPoint);
                  
                  if (distanceTraveled >= segmentDist) {
                    distanceTraveled -= segmentDist;
                    currentPointIndex++;
                    continue;
                  } else {
                    const ratio = distanceTraveled / segmentDist;
                    const newLat = currentPoint.lat + (nextPoint.lat - currentPoint.lat) * ratio;
                    const newLng = currentPoint.lng + (nextPoint.lng - currentPoint.lng) * ratio;
                    const newLocation = { lat: newLat, lng: newLng };
                    
                    // 🔥 FIX: Sync currentStopIndexRef với trip.currentStop mỗi lần check
                    const latestCurrentStop = trip.currentStop || 0;
                    if (currentStopIndexRef.value !== latestCurrentStop) {
                      console.log(`[Driver Trip] 🔄 Syncing currentStopIndexRef (useEffect): ${currentStopIndexRef.value} → ${latestCurrentStop}`);
                      currentStopIndexRef.value = latestCurrentStop;
                    }
                    
                    // Check khoảng cách đến điểm dừng tiếp theo SAU KHI tính toán vị trí mới
                    const currentStopIdx = currentStopIndexRef.value;
                    const nextStopIndex = currentStopIdx + 1;
                    
                    if (nextStopIndex < trip.stops.length) {
                      const nextStop = trip.stops[nextStopIndex];
                      if (nextStop && nextStop.lat && nextStop.lng) {
                        const distanceToStop = calculateDistance(newLocation, { lat: nextStop.lat, lng: nextStop.lng });
                        
                        // 🔥 FIX: Tăng threshold lên 50m để đảm bảo không miss điểm dừng
                        const nextStopSeq = (nextStop as any).sequence || nextStopIndex + 1;
                        const nextStopSeqNum = typeof nextStopSeq === 'number' ? nextStopSeq : parseInt(String(nextStopSeq));
                        const isAlreadyArrived = arrivedStopsRef.current.has(nextStopSeqNum);
                        const isPending = pendingArrivesRef.current.has(nextStopSeqNum);
                        
                        if (distanceToStop < 50 && !isAlreadyArrived && !isPending) {
                          console.log(`[Driver Trip] 🚏 Auto-arriving at stop ${nextStopIndex + 1} (${nextStop.name}) - distance: ${Math.round(distanceToStop)}m`);
                          
                          // Dừng simulation ngay lập tức
                          isAtStopRef.value = true;
                          currentStopIndexRef.value = nextStopIndex;
                          
                          // 🔒 Mark as pending để tránh duplicate calls
                          pendingArrivesRef.current.add(nextStopSeqNum);
                          
                          const token = typeof window !== "undefined" ? localStorage.getItem("ssb_token") : null;
                          const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
                          
                          // 🔥 FIX: Dừng tại vị trí điểm dừng (không di chuyển thêm)
                          const stopLocation = { lat: nextStop.lat, lng: nextStop.lng };
                          
                          // 1. Call arrive API
                          fetch(`${API_URL}/trips/${tripIdNum}/stops/${nextStopSeqNum}/arrive`, {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              ...(token ? { Authorization: `Bearer ${token}` } : {}),
                            },
                            body: JSON.stringify({
                              arrivedAt: new Date().toISOString(),
                            }),
                          })
                            .then((res) => {
                              if (res.ok) {
                                console.log(`[Driver Trip] ✅ Auto-arrived at stop ${nextStopSeqNum}`);
                                
                                // 🔒 Mark as arrived và remove from pending (atomic operation)
                                arrivedStopsRef.current.add(nextStopSeqNum);
                                pendingArrivesRef.current.delete(nextStopSeqNum);
                                
                                // 🔥 FIX: Thêm toast notification
                                toast({
                                  title: "🚏 Đã đến điểm dừng",
                                  description: `Xe đã đến ${nextStop.name || `điểm dừng ${nextStopIndex + 1}`}`,
                                  variant: "default",
                                });
                                
                                setAtCurrentStop(true);
                                // 🔥 FIX: Update currentStopIndexRef khi trip state thay đổi
                                currentStopIndexRef.value = nextStopIndex;
                                
                                setTrip((prev) => ({
                                  ...prev,
                                  currentStop: nextStopIndex,
                                  stops: prev.stops.map((stop, idx) => {
                                    if (idx === nextStopIndex) {
                                      return { ...stop, status: "current" as const };
                                    } else if (idx < nextStopIndex) {
                                      return { ...stop, status: "completed" as const };
                                    }
                                    return stop;
                                  }),
                                }));
                                
                                // 2. Load students
                                fetch(`${API_URL}/trips/${tripIdNum}/stops/${nextStopSeqNum}/students`, {
                                  headers: {
                                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                                  },
                                })
                                  .then((res) => res.json())
                                  .then((data) => {
                                    const studentsList = data.data?.students || [];
                                    setTrip((prev) => ({
                                      ...prev,
                                      stops: prev.stops.map((stop, idx) =>
                                        idx === nextStopIndex
                                          ? {
                                              ...stop,
                                              students: studentsList.map((s: any) => ({
                                                id: String(s.maHocSinh),
                                                name: s.hoTen || "Học sinh",
                                                status:
                                                  s.trangThai === "da_don"
                                                    ? "picked"
                                                    : s.trangThai === "vang"
                                                    ? "absent"
                                                    : "pending",
                                                avatar: s.anhDaiDien || "/placeholder.svg?height=40&width=40",
                                                parent: s.soDienThoaiPhuHuynh || "",
                                              })),
                                            }
                                          : stop
                                      ),
                                    }));
                                    
                                    console.log(`[Driver Trip] ✅ Loaded ${studentsList.length} students at stop ${nextStopSeqNum}`);
                                  })
                                  .catch((err) => {
                                    console.warn("[Driver Trip] Failed to load students:", err);
                                  });
                                
                                // 3. Đợi 5 giây tại điểm dừng, sau đó tiếp tục
                                setTimeout(() => {
                                  console.log(`[Driver Trip] Leaving stop ${nextStopSeqNum}, continuing to next stop`);
                                  isAtStopRef.value = false;
                                  setAtCurrentStop(false);
                                  
                                  toast({
                                    title: "🚌 Đã rời điểm dừng",
                                    description: `Đang di chuyển đến điểm dừng tiếp theo`,
                                    variant: "default",
                                  });
                                  
                                  fetch(`${API_URL}/trips/${tripIdNum}/stops/${nextStopSeqNum}/leave`, {
                                    method: "POST",
                                    headers: {
                                      "Content-Type": "application/json",
                                      ...(token ? { Authorization: `Bearer ${token}` } : {}),
                                    },
                                    body: JSON.stringify({
                                      leftAt: new Date().toISOString(),
                                    }),
                                  }).catch((err) => {
                                    console.warn("[Driver Trip] Failed to leave stop:", err);
                                  });
                                }, 5000);
                              } else {
                                // API failed, allow retry
                                isAtStopRef.value = false;
                                // 🔒 Remove from pending to allow retry (không add vào arrivedStopsRef)
                                pendingArrivesRef.current.delete(nextStopSeqNum);
                              }
                            })
                            .catch((err) => {
                              console.warn("[Driver Trip] Failed to auto-arrive:", err);
                              // 🔒 Remove from pending to allow retry (không add vào arrivedStopsRef)
                              pendingArrivesRef.current.delete(nextStopSeqNum);
                              isAtStopRef.value = false;
                            });
                          
                          // Return stop location để dừng tại điểm dừng
                          return stopLocation;
                        }
                      }
                    }
                    
                    // 🧭 Tính toán và cập nhật heading (hướng) chính xác
                    if (prevLocation) {
                      const heading = calculateHeading(prevLocation, newLocation);
                      setBusHeading(heading);
                      
                      // 🔥 FIX: Gửi GPS update lên backend với heading chính xác
                      try {
                        const socket = socketService.getSocket();
                        if (socket && socket.connected) {
                          socket.emit("driver_gps", {
                            tripId: tripIdNum,
                            lat: newLat,
                            lng: newLng,
                            speed: TARGET_SPEED_KMH, // Gửi km/h
                            heading: heading, // Heading đã tính từ prevLocation -> newLocation
                          });
                        }
                      } catch (err) {
                        // Ignore
                      }
                    }
                    prevLocation = newLocation;
                    
                    return newLocation;
                  }
                }
                
                return routePoints[routePoints.length - 1];
              });
            }, UPDATE_INTERVAL_MS);
            
            (window as any).__velocitySimulationInterval = velocityInterval;
            console.log("[Driver Trip] ✅ Velocity simulation started automatically in demo mode");
          }
        }
      }, 4000); // Đợi 4 giây sau khi trip bắt đầu để đảm bảo tất cả state đã được set
      
      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [tripStatus, locationSource, routePolyline, busLocation, trip.stops.length]);

  // 🧹 Cleanup velocity simulation on unmount
  useEffect(() => {
    return () => {
      const velocityInterval = (window as any).__velocitySimulationInterval;
      if (velocityInterval) {
        clearInterval(velocityInterval);
        (window as any).__velocitySimulationInterval = undefined;
        console.log("[Driver Trip] Cleaned up velocity simulation on unmount");
      }
    };
  }, []);

  // Một nút duy nhất, thay đổi theo trạng thái
  const isLastStop = trip.currentStop === trip.stops.length - 1;
  // 🔥 Single CTA: Chỉ hiện nút "Bắt đầu" nếu trip chưa start
  // Dựa trên cả tripStatus và started state để đảm bảo sync với backend
  const showStart = !gpsRunning && !started && tripStatus !== "dang_chay" && tripStatus !== "hoan_thanh";

  // Auto-start GPS if trip is already running and REAL mode is selected
  useEffect(() => {
    if (
      tripStatus === "dang_chay" &&
      !gpsRunning &&
      effectiveTripId &&
      locationSource === "real"
    ) {
      console.log(
        "[Driver Trip] Auto-starting GPS for running trip",
        effectiveTripId
      );
      startGPS();
    } else if (locationSource === "demo" && gpsRunning) {
      // Stop GPS if switching to DEMO mode
      stopGPS();
    }
  }, [tripStatus, gpsRunning, effectiveTripId, startGPS, stopGPS, locationSource]);

  // Derive UI display for status/speed/time
  const currentSpeed =
    typeof (busPosition as any)?.speed === "number"
      ? Math.round((busPosition as any).speed)
      : trip.vehicle.speed;
  const lastUpdateISO =
    (busPosition as any)?.timestamp || (busPosition as any)?.time;
  const lastUpdateText = lastUpdateISO
    ? new Date(lastUpdateISO).toLocaleTimeString()
    : undefined;
  const statusLabel =
    tripStatus === "dang_chay"
      ? "Đang chạy"
      : tripStatus === "hoan_thanh"
      ? "Đã kết thúc"
      : "Chưa khởi hành";
  const primaryCta = showStart
    ? {
        label: "Bắt đầu chuyến đi",
        onClick: doStartTrip,
        icon: Navigation,
        variant: "default" as const,
        className: "bg-primary hover:bg-primary/90 text-white",
      }
    : {
        label: !atCurrentStop
          ? isLastStop
            ? "Đến điểm cuối"
            : "Đến điểm dừng"
          : isLastStop
          ? "Kết thúc chuyến đi"
          : "Rời điểm dừng",
        onClick: !atCurrentStop
          ? arriveCurrentStop
          : isLastStop
          ? finishTrip
          : leaveCurrentStop,
        icon: !atCurrentStop ? Navigation : isLastStop ? Flag : ArrowRight,
        variant:
          atCurrentStop && isLastStop
            ? ("destructive" as const)
            : ("default" as const),
        className: !atCurrentStop
          ? "bg-sky-600 hover:bg-sky-700 text-white"
          : isLastStop
          ? ""
          : "bg-amber-500 hover:bg-amber-600 text-white",
      };

  // Header nút Start/End không còn cần thiết khi dùng luồng 1 nút ở phần điểm dừng

  // chat handler removed

  return (
    <DashboardLayout sidebar={<DriverSidebar />}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{trip.route}</h1>
            <p className="text-muted-foreground mt-1">
              {statusLabel}
              {lastUpdateText ? ` • Cập nhật: ${lastUpdateText}` : ""}
            </p>
          </div>
          <div />
          <Dialog
            open={isIncidentDialogOpen}
            onOpenChange={setIsIncidentDialogOpen}
          >
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="border-destructive text-destructive hover:bg-destructive/10 bg-transparent"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Báo cáo sự cố
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Báo cáo sự cố</DialogTitle>
                <DialogDescription>
                  Mô tả chi tiết sự cố đang gặp phải
                </DialogDescription>
              </DialogHeader>
              <IncidentForm
                onClose={() => setIsIncidentDialogOpen(false)}
                tripId={trip.id}
                currentLocation={busLocation}
                gpsLastPoint={gpsLastPoint ?? undefined}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Location Source Mode Toggle */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Nguồn vị trí (Location Source)</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={locationSource}
              onValueChange={(value) => {
                setLocationSource(value as "demo" | "real");
                if (value === "demo" && gpsRunning) {
                  stopGPS();
                  toast({
                    title: "Chuyển sang chế độ DEMO",
                    description: "Đang chờ script demo gửi vị trí...",
                  });
                } else if (value === "real" && tripStatus === "dang_chay" && !gpsRunning) {
                  startGPS();
                  toast({
                    title: "Chuyển sang chế độ REAL",
                    description: "Đang lấy vị trí GPS từ thiết bị...",
                  });
                }
              }}
              className="space-y-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="demo" id="demo" />
                <Label htmlFor="demo" className="cursor-pointer flex-1">
                  <div className="flex flex-col">
                    <span className="font-medium">DEMO - Script mô phỏng (server)</span>
                    <span className="text-sm text-muted-foreground">
                      Vị trí được gửi từ script backend (npm run ws:demo)
                    </span>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="real" id="real" />
                <Label htmlFor="real" className="cursor-pointer flex-1">
                  <div className="flex flex-col">
                    <span className="font-medium">REAL - GPS từ thiết bị</span>
                    <span className="text-sm text-muted-foreground">
                      Lấy vị trí thật từ GPS của điện thoại/thiết bị
                    </span>
                  </div>
                </Label>
              </div>
            </RadioGroup>
            {locationSource === "demo" && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  💡 <strong>Hướng dẫn:</strong> Chạy script demo từ backend:
                </p>
                <code className="block mt-2 p-2 bg-background rounded text-xs">
                  npm run ws:demo -- --tripId={effectiveTripId || 16}
                </code>
              </div>
            )}
            {locationSource === "real" && gpsRunning && (
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-300">
                  ✅ GPS đang hoạt động - Đang gửi vị trí thật lên server
                </p>
              </div>
            )}
            {locationSource === "real" && tripStatus === "dang_chay" && !gpsRunning && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  ⚠️ GPS chưa được bật. Vui lòng cho phép truy cập vị trí khi trình duyệt yêu cầu.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Nhiên liệu</p>
                  <p className="text-2xl font-bold text-foreground">
                    {trip.vehicle.fuel}%
                  </p>
                </div>
                <Fuel
                  className={`w-8 h-8 ${
                    trip.vehicle.fuel > 50
                      ? "text-success"
                      : trip.vehicle.fuel > 25
                      ? "text-warning"
                      : "text-destructive"
                  }`}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tốc độ</p>
                  <p className="text-2xl font-bold text-foreground">
                    {currentSpeed} km/h
                  </p>
                </div>
                <Gauge className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Nhiệt độ xe</p>
                  <p className="text-2xl font-bold text-foreground">
                    {trip.vehicle.temperature}°C
                  </p>
                </div>
                <Thermometer
                  className={`w-8 h-8 ${
                    trip.vehicle.temperature < 90
                      ? "text-success"
                      : "text-warning"
                  }`}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Thời tiết</p>
                  <p className="text-2xl font-bold text-foreground">
                    {trip.weather.temp}°C
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {trip.weather.condition}
                  </p>
                </div>
                <Cloud className="w-8 h-8 text-info" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress */}
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tiến độ chuyến đi</span>
                <span className="font-medium">
                  {trip.currentStop + 1}/{trip.stops.length} điểm dừng
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* 🔥 Summary: Tổng số học sinh theo trạng thái */}
        {(() => {
          // Tính summary từ trip.stops
          let totalStudents = 0;
          let pickedCount = 0;
          let absentCount = 0;
          let waitingCount = 0;
          
          trip.stops.forEach((stop: any) => {
            stop.students?.forEach((student: any) => {
              totalStudents++;
              if (student.status === "picked") pickedCount++;
              else if (student.status === "absent") absentCount++;
              else waitingCount++;
            });
          });
          
          return (
            <Card className="border-primary/50 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Tổng quan học sinh
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">{totalStudents}</p>
                    <p className="text-sm text-muted-foreground">Tổng số</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{pickedCount}</p>
                    <p className="text-sm text-muted-foreground">Đã đón</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-yellow-600">{absentCount}</p>
                    <p className="text-sm text-muted-foreground">Vắng</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-muted-foreground">{waitingCount}</p>
                    <p className="text-sm text-muted-foreground">Chưa đón</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Stop */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-primary/50 bg-primary/5">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    {currentStop.name}
                    {effectiveTripId && (
                      <Badge variant="outline" className="ml-2">
                        Trip {effectiveTripId}
                      </Badge>
                    )}
                  </CardTitle>
                  <Badge className="bg-primary text-primary-foreground">
                    Điểm hiện tại
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {currentStop.address}
                </p>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    Dự kiến: {currentStop.time}
                  </div>
                  <div className="flex items-center gap-2 text-primary font-medium">
                    <TrendingUp className="w-4 h-4" />
                    ETA: {currentStop.eta}
                    {/* P1 Fix: ETA Cached Badge */}
                    {(() => {
                      const isCached = isFetchedFromCacheFE || isBESaysCached;
                      if (isCached) {
                        const cacheSource =
                          isFetchedFromCacheFE && isBESaysCached
                            ? "FE+BE"
                            : isFetchedFromCacheFE
                            ? "FE"
                            : "BE";
                        return (
                          <Badge
                            variant="outline"
                            className="text-xs bg-muted text-muted-foreground"
                            title="Kết quả được cache 120s"
                          >
                            Cached ({cacheSource})
                          </Badge>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Card className="border-border/50 bg-muted/30">
                  <CardContent className="p-4">
                    {/* Google Maps with SSBMap */}
                    <div className="h-[640px] w-full relative">
                      {isFetchingRoute && !routePolyline && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                          <div className="text-center space-y-2">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                            <p className="text-sm text-muted-foreground">Đang tải tuyến đường...</p>
                          </div>
                        </div>
                      )}
                      <SSBMap
                        // 🔥 FIX: Ưu tiên routePolyline khi trip chưa start, dynamicDirections khi đang chạy
                        // Không dùng dynamicDirections khi trip chưa start để tránh vẽ đường từ GPS người dùng
                        polyline={
                          tripStatus === "dang_chay" && dynamicDirections
                            ? dynamicDirections
                            : routePolyline
                        }
                        height="640px"
                        center={busLocation || (trip.stops[0]?.lat && trip.stops[0]?.lng ? { lat: trip.stops[0].lat, lng: trip.stops[0].lng } : undefined)}
                        zoom={13}
                        autoFitOnUpdate={true}
                        buses={[
                          {
                            id:
                              (busPosition?.busId ??
                                trip.vehicle?.plateNumber ??
                                5) + "",
                            lat: busLocation?.lat || trip.stops[0]?.lat || 10.8231,
                            lng: busLocation?.lng || trip.stops[0]?.lng || 106.6297,
                            label: `${trip.vehicle.plateNumber} - ${trip.route}`,
                            status: "running",
                            heading: busHeading, // 🔥 Truyền heading để icon xoay theo hướng di chuyển
                          },
                        ]}
                        stops={
                          // 🔥 FIX: Chỉ pass stops khi có polyline hoặc không đang fetch route
                          // Điều này ngăn SSBMap tạo simple polyline (đường chim bay) khi đang fetch route thực tế
                          // Nếu đang fetch và chưa có polyline, pass mảng rỗng để SSBMap không vẽ đường chim bay
                          (routePolyline || dynamicDirections || !isFetchingRoute)
                            ? (() => {
                          const mappedStops = trip.stops.map(
                            (stop: any, idx) => {
                              const stopData = {
                                maDiem: parseInt(stop.id) || idx + 1,
                                tenDiem: stop.name,
                                viDo: stop.lat || 0,
                                kinhDo: stop.lng || 0,
                                sequence: idx + 1,
                              };
                              // Debug: log stop coordinates
                              if (idx === 0) {
                                console.log(
                                  "[Driver Trip] First stop data for SSBMap:",
                                  stopData,
                                  "from trip.stops:",
                                  stop
                                );
                              }
                              return stopData;
                            }
                          );
                          console.log(
                            "[Driver Trip] Total stops for SSBMap:",
                            mappedStops.length,
                            "stops with valid coords:",
                            mappedStops.filter(
                              (s) => s.viDo !== 0 && s.kinhDo !== 0
                            ).length
                          );
                          return mappedStops;
                        })()
                            : [] // 🔥 Pass mảng rỗng khi đang fetch để tránh vẽ đường chim bay
                        }
                        followFirstMarker={true}
                      />
                    </div>
                    {/* Removed route hints to bring students list closer */}
                  </CardContent>
                </Card>

                {/* 🔥 Students List với nút hành động rõ ràng - Cải thiện UI */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-lg text-foreground flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary" />
                      {trip.currentStop === trip.stops.length - 1
                        ? "Điểm trả học sinh"
                        : "Danh sách học sinh tại điểm dừng"}
                    </h4>
                    {trip.currentStop !== trip.stops.length - 1 ? (
                      <Badge variant="outline" className="text-sm">
                        {currentStop.students.length} học sinh
                      </Badge>
                    ) : null}
                  </div>
                  
                  {/* 🔥 FIX: Kiểm tra nếu là điểm cuối thì hiển thị thông báo điểm trả */}
                  {trip.currentStop === trip.stops.length - 1 ? (
                    <Card className="border-primary/50 bg-primary/5">
                      <CardContent className="p-6 text-center">
                        <Flag className="w-12 h-12 mx-auto mb-2 text-primary" />
                        <p className="text-foreground font-medium text-lg mb-2">
                          Điểm đến cuối cùng
                        </p>
                        <p className="text-muted-foreground">
                          Đây là điểm trả học sinh. Không có học sinh cần đón tại điểm này.
                        </p>
                      </CardContent>
                    </Card>
                  ) : currentStop.students.length === 0 ? (
                    <Card className="border-border/50 bg-muted/30">
                      <CardContent className="p-6 text-center">
                        <Users className="w-12 h-12 mx-auto mb-2 text-muted-foreground opacity-50" />
                        <p className="text-muted-foreground font-medium">
                          Không có học sinh tại điểm dừng này
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {currentStop.students.map((student) => {
                        const isPicked = student.status === "picked";
                        const isAbsent = student.status === "absent";
                        const isPending = student.status === "pending";
                        
                        return (
                          <Card 
                            key={student.id} 
                            className={cn(
                              "border-border/50 transition-all",
                              isPicked && "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800",
                              isAbsent && "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800",
                              isPending && "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                            )}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 flex-1">
                                  <Avatar className="w-12 h-12 border-2 border-background">
                                    <AvatarImage
                                      src={student.avatar || "/placeholder.svg"}
                                      alt={student.name}
                                    />
                                    <AvatarFallback className="text-base font-semibold">
                                      {student.name.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-foreground text-base">
                                      {student.name}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                      {isPicked && (
                                        <Badge variant="default" className="bg-green-600 text-white">
                                          <CheckCircle className="w-3 h-3 mr-1" />
                                          Đã lên xe
                                        </Badge>
                                      )}
                                      {isAbsent && (
                                        <Badge variant="destructive">
                                          <XCircle className="w-3 h-3 mr-1" />
                                          Vắng mặt
                                        </Badge>
                                      )}
                                      {isPending && (
                                        <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-400">
                                          <Clock className="w-3 h-3 mr-1" />
                                          Chờ đón
                                        </Badge>
                                      )}
                                    </div>
                                    {student.parent && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        PH: {student.parent}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {student.parent && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="bg-transparent"
                                      title={`Gọi phụ huynh: ${student.parent}`}
                                      onClick={() => {
                                        window.open(`tel:${student.parent}`, '_self');
                                      }}
                                    >
                                      <Phone className="w-4 h-4" />
                                    </Button>
                                  )}
                                  {isPending && (
                                    <>
                                      <Button
                                        variant="default"
                                        size="sm"
                                        onClick={() => handleStudentCheckin(student.id)}
                                        className="bg-green-600 hover:bg-green-700 text-white shadow-sm"
                                        title="Xác nhận học sinh đã lên xe"
                                      >
                                        <CheckCircle className="w-4 h-4 mr-1" />
                                        Đã đón
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleMarkAbsent(student.id)}
                                        className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/20"
                                        title="Đánh dấu học sinh vắng mặt"
                                      >
                                        <XCircle className="w-4 h-4 mr-1" />
                                        Vắng
                                      </Button>
                                    </>
                                  )}
                                  {isPicked && (
                                    <div className="text-green-600 dark:text-green-400 text-sm font-medium">
                                      ✓ Đã xác nhận
                                    </div>
                                  )}
                                  {isAbsent && (
                                    <div className="text-red-600 dark:text-red-400 text-sm font-medium">
                                      ✗ Vắng mặt
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Summary tại điểm dừng */}
                  {currentStop.students.length > 0 && trip.currentStop !== trip.stops.length - 1 && (
                    <Card className="border-primary/20 bg-primary/5">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Tổng kết:</span>
                          <div className="flex items-center gap-4">
                            <span className="text-green-600 font-medium">
                              Đã đón: {currentStop.students.filter((s: any) => s.status === "picked").length}
                            </span>
                            <span className="text-red-600 font-medium">
                              Vắng: {currentStop.students.filter((s: any) => s.status === "absent").length}
                            </span>
                            <span className="text-amber-600 font-medium">
                              Chờ: {currentStop.students.filter((s: any) => s.status === "pending").length}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-foreground">
                    Ghi chú điểm dừng
                  </h4>
                  <Textarea
                    placeholder="Thêm ghi chú cho điểm dừng này..."
                    value={stopNotes[currentStop.id] || currentStop.notes}
                    onChange={(e) =>
                      setStopNotes({
                        ...stopNotes,
                        [currentStop.id]: e.target.value,
                      })
                    }
                    rows={2}
                    className="resize-none"
                  />
                </div>

                {/* Nút hành động đã chuyển ra dạng nổi (floating) để dễ thấy và bấm hơn */}
              </CardContent>
            </Card>

            {/* Old inline 'Liên lạc với Admin' chat removed - use floating widget instead */}
          </div>

          {/* Route Overview */}
          <div className="space-y-6">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Tổng quan tuyến đường</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {trip.stops.map((stop, index) => (
                    <div key={stop.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm ${
                            stop.status === "completed"
                              ? "bg-success text-success-foreground"
                              : stop.status === "current"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {index === trip.stops.length - 1 ? (
                            <Flag className="w-4 h-4" />
                          ) : (
                            index + 1
                          )}
                        </div>
                        {index < trip.stops.length - 1 && (
                          <div
                            className={`w-0.5 h-12 ${
                              stop.status === "completed"
                                ? "bg-success"
                                : "bg-border"
                            }`}
                          />
                        )}
                      </div>

                      <div className="flex-1 pb-4">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-foreground text-sm">
                            {stop.name}
                          </p>
                          {/* 🔥 Hiển thị số học sinh tại stop */}
                          {stop.students && stop.students.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              <Users className="w-3 h-3 mr-1" />
                              {stop.students.length} học sinh
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <Clock className="w-3 h-3" />
                          <span>{stop.time}</span>
                          {stop.status !== "completed" && (
                            <>
                              <span>•</span>
                              <span className="text-primary">
                                ETA: {stop.eta}
                              </span>
                            </>
                          )}
                        </div>
                        {stop.students.length > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <Users className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {stop.students.length} học sinh
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Thống kê</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Đã đón</span>
                  <span className="text-sm font-medium text-success">
                    2 học sinh
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Vắng</span>
                  <span className="text-sm font-medium text-warning">
                    1 học sinh
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Còn lại</span>
                  <span className="text-sm font-medium">5 học sinh</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Thao tác</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  size="lg"
                  variant={primaryCta.variant}
                  onClick={primaryCta.onClick}
                  disabled={processing}
                  className={cn("w-full h-12 rounded-lg", primaryCta.className)}
                >
                  <primaryCta.icon className="w-5 h-5 mr-2" />
                  {processing ? "Đang xử lý…" : primaryCta.label}
                </Button>
                {/* P1 Fix: Cancel Trip Button */}
                {tripStatus === "dang_chay" && (
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => setIsCancelDialogOpen(true)}
                    disabled={processing}
                    className="w-full h-12 rounded-lg border-destructive text-destructive hover:bg-destructive/10"
                  >
                    <XCircle className="w-5 h-5 mr-2" />
                    Hủy chuyến đi
                  </Button>
                )}
                {/* Cancel Trip Confirmation Dialog */}
                <AlertDialog
                  open={isCancelDialogOpen}
                  onOpenChange={setIsCancelDialogOpen}
                >
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Xác nhận hủy chuyến đi
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Bạn có chắc chắn muốn hủy chuyến đi này? Hành động này
                        không thể hoàn tác. Phụ huynh sẽ nhận được thông báo về
                        việc hủy chuyến.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Không</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleCancelTrip}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Xác nhận hủy
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      {/* Floating CTA removed; moved into the right sidebar's "Thao tác" card */}
    </DashboardLayout>
  );
}
