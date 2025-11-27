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
import { Input } from "@/components/ui/input";
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
import {
  startTripStrict as startTrip,
  endTrip,
  cancelTrip,
} from "@/lib/services/trip.service";
import { useGPS } from "@/hooks/use-gps";
import { useGPSSimulator } from "@/hooks/use-gps-simulator";
import apiClient from "@/lib/api-client";
import { apiClient as api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import type { StopDTO, BusMarker } from "@/components/map/SSBMap";
import { useETA } from "@/lib/hooks/useMaps";
import { SpeedControlCard } from "@/components/driver/speed-control-card";

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
  const [trip, setTrip] = useState(mockTrip);
  const [routePolyline, setRoutePolyline] = useState<string | null>(null); // Add polyline state
  const [dynamicDirections, setDynamicDirections] = useState<string | null>(
    null
  ); // Dynamic directions from current pos to next stop
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
  const [locationSource, setLocationSource] = useState<"demo" | "real">("real");
  const { toast } = useToast();
  const [routeId, setRouteId] = useState<number | string | undefined>(undefined);
  const [demoSpeed, setDemoSpeed] = useState<number>(40); // Speed for DEMO mode (km/h)
  const [mapZoom, setMapZoom] = useState<number>(13); // Dynamic zoom level
  const [isLastStop, setIsLastStop] = useState<boolean>(false); // Is current stop the final stop
  const [tripType, setTripType] = useState<"don_sang" | "tra_chieu" | null>(null); // Trip type

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
  
  // GPS Simulator for DEMO mode
  const {
    start: startSimulator,
    stop: stopSimulator,
    continueToNextStop: continueSimulator,
    updateSpeed: updateSimulatorSpeed,
    running: simulatorRunning,
    currentPosition: simulatorPosition,
    isAtStop: simulatorAtStop,
    error: simulatorError,
    currentSpeed: simulatorCurrentSpeed,
  } = useGPSSimulator({
    tripId: effectiveTripId,
    routeId: routeId,
    speed: demoSpeed,
    interval: 3,
    stopDistanceThreshold: 50,
  });
  // Khởi tạo theo vị trí test script (Hà Nội) để tránh nhảy từ HCM ra HN khi mới vào trang
  const [busLocation, setBusLocation] = useState<{ lat: number; lng: number }>({
    lat: 21.0285,
    lng: 105.8542,
  });
  useEffect(() => {
    if (
      busPosition &&
      Number.isFinite(busPosition.lat) &&
      Number.isFinite(busPosition.lng)
    ) {
      // Log for quick verification during test
      console.log("[Driver Trip] busPosition", busPosition);
      setBusLocation({ lat: busPosition.lat, lng: busPosition.lng });
    }
  }, [busPosition]);

  // Update busLocation from GPS simulator when in DEMO mode
  useEffect(() => {
    if (
      locationSource === "demo" &&
      simulatorPosition &&
      Number.isFinite(simulatorPosition.lat) &&
      Number.isFinite(simulatorPosition.lng)
    ) {
      console.log("[Driver Trip] simulatorPosition", simulatorPosition);
      setBusLocation({ lat: simulatorPosition.lat, lng: simulatorPosition.lng });
    }
  }, [simulatorPosition, locationSource]);

  // Derive UI display for status/speed/time
  const currentSpeed =
    typeof (busPosition as any)?.speed === "number"
      ? Math.round((busPosition as any).speed)
      : trip.vehicle.speed;

  // 🔥 Cập nhật isLastStop khi currentStop thay đổi
  useEffect(() => {
    if (trip.stops.length > 0 && trip.currentStop >= 0) {
      const currentStopData = trip.stops[trip.currentStop];
      const currentStopSequence = (currentStopData as any)?.sequence || (trip.currentStop + 1);
      const maxSequence = Math.max(...trip.stops.map((s: any) => s.sequence || 0));
      const isLastStopValue = currentStopSequence === maxSequence;
      setIsLastStop(isLastStopValue);
    }
  }, [trip.currentStop, trip.stops]);

  // Auto-zoom map when bus moves (smooth zoom, not too close)
  useEffect(() => {
    if (
      tripStatus === "dang_chay" &&
      busLocation &&
      Number.isFinite(busLocation.lat) &&
      Number.isFinite(busLocation.lng)
    ) {
      // Calculate zoom based on speed: faster = zoom out more, slower = zoom in more
      // But keep it reasonable: between 14 (close) and 16 (very close)
      const currentSpeedValue = 
        locationSource === "demo" 
          ? simulatorCurrentSpeed || demoSpeed
          : currentSpeed || 30;
      
      // Zoom formula: faster speed = lower zoom (zoom out), slower = higher zoom (zoom in)
      // Speed range: 10-80 km/h -> Zoom range: 16-14
      const minZoom = 14;
      const maxZoom = 16;
      const minSpeed = 10;
      const maxSpeed = 80;
      
      const normalizedSpeed = Math.max(minSpeed, Math.min(maxSpeed, currentSpeedValue));
      const zoomLevel = maxZoom - ((normalizedSpeed - minSpeed) / (maxSpeed - minSpeed)) * (maxZoom - minZoom);
      
      setMapZoom(Math.round(zoomLevel * 10) / 10); // Round to 1 decimal
    }
  }, [busLocation, tripStatus, locationSource, simulatorCurrentSpeed, demoSpeed, currentSpeed]);

  // Sync atCurrentStop with simulatorAtStop in DEMO mode
  useEffect(() => {
    if (locationSource === "demo") {
      setAtCurrentStop(simulatorAtStop);
    }
  }, [simulatorAtStop, locationSource]);

  // P1 Fix: Fetch dynamic directions from current position to next stop
  useEffect(() => {
    // Only fetch if trip is running and we have a valid current position and next stop
    if (
      tripStatus !== "dang_chay" ||
      !busLocation ||
      !trip.stops[trip.currentStop]
    ) {
      return;
    }

    const nextStop = trip.stops[trip.currentStop] as any;
    const nextStopLat = Number(nextStop.lat);
    const nextStopLng = Number(nextStop.lng);

    // Validate coordinates
    if (
      !Number.isFinite(nextStopLat) ||
      !Number.isFinite(nextStopLng) ||
      !Number.isFinite(busLocation.lat) ||
      !Number.isFinite(busLocation.lng)
    ) {
      return;
    }

    // Don't fetch if already at stop (< 50m)
    const distanceToStop =
      Math.sqrt(
        Math.pow(nextStopLat - busLocation.lat, 2) +
          Math.pow(nextStopLng - busLocation.lng, 2)
      ) * 111000; // rough conversion to meters

    if (distanceToStop < 50) {
      console.log("[Driver Trip] Already at stop, clearing dynamic directions");
      setDynamicDirections(null);
      return;
    }

    // Debounce: only fetch every 30 seconds to avoid too many requests
    const lastFetch = (window as any).__lastDirectionsFetch || 0;
    const now = Date.now();
    if (now - lastFetch < 30000) {
      return;
    }
    (window as any).__lastDirectionsFetch = now;

    console.log(
      "[Driver Trip] Fetching dynamic directions from current position to next stop"
    );

      apiClient
      .getDirections({
        origin: `${busLocation.lat},${busLocation.lng}`,
        destination: `${nextStopLat},${nextStopLng}`,
        mode: "driving", // Mode driving phù hợp với xe buýt
        vehicleType: "bus", // Chỉ định loại xe là buýt
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
              "[Driver Trip] Successfully fetched dynamic directions:",
              newPolyline.length,
              "chars"
            );
            setDynamicDirections(newPolyline);
          } else {
            console.warn("[Driver Trip] No polyline in directions response");
          }
        }
      })
      .catch((err: any) => {
        console.error(
          "[Driver Trip] Error fetching dynamic directions:",
          err?.message || err
        );
      });
  }, [busLocation, trip.currentStop, trip.stops, tripStatus]);

  // Day 5: Show toast notifications for trip alerts
  // 🔥 Ref để tránh gọi API liên tục
  const loadedStopsRef = useRef<Set<number>>(new Set());
  
  useEffect(() => {
    if (approachStop && tripStatus === "dang_chay") {
      const stopName =
        approachStop.stopName || approachStop.stop_name || "điểm dừng";
      const distance = approachStop.distance || 0;
      const stopSequence = approachStop.stopSequence || approachStop.sequence;
      
      toast({
        title: "🚏 Gần đến điểm dừng",
        description: `Xe đang cách ${stopName} khoảng ${Math.round(distance)}m`,
        variant: "default",
      });

      // Auto-load students when approaching stop (< 60m) - chỉ load 1 lần cho mỗi stop
      if (distance < 60 && stopSequence && tripIdNum && !loadedStopsRef.current.has(stopSequence)) {
        loadedStopsRef.current.add(stopSequence);
        
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
          .then((res) => {
            if (!res.ok) {
              throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }
            return res.json();
          })
          .then((data) => {
            const studentsList = data.data?.students || [];
            
            // Find stop index by sequence
            const stopIndex = trip.stops.findIndex(
              (s: any) => s.sequence === stopSequence || s.id === stopSequence
            );

            if (stopIndex >= 0) {
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
                          parent: "",
                        })),
                      }
                    : stop
                ),
              }));
            }
          })
          .catch((err) => {
            console.warn("[Driver Trip] Failed to auto-load students:", err);
            // Remove from loaded set để có thể retry sau
            loadedStopsRef.current.delete(stopSequence);
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

  // Day 5: Listen for trip_completed event
  useEffect(() => {
    const handleTripCompleted = (event: Event) => {
      const data = (event as CustomEvent).detail;
      const completedTripId = data?.tripId || data?.trip_id || data?.maChuyen;
      // Only show toast if it's this trip
      if (completedTripId && Number(completedTripId) === effectiveTripId) {
        toast({
          title: "✅ Hoàn thành chuyến đi",
          description: `Chuyến đi #${completedTripId} đã kết thúc thành công`,
          variant: "default",
        });
        // Update trip status
        setTripStatus("hoan_thanh");
      }
    };

    window.addEventListener(
      "tripCompleted",
      handleTripCompleted as EventListener
    );
    return () => {
      window.removeEventListener(
        "tripCompleted",
        handleTripCompleted as EventListener
      );
    };
  }, [effectiveTripId, toast]);

  // Load trip detail from API (ONLY trips; no schedules fallback)
  useEffect(() => {
    async function loadDetail() {
      try {
        if (!tripIdNum) return;
        console.log("[Driver Trip] Loading trip detail for:", tripIdNum);
        const res = await api.getTripById(tripIdNum);
        const data: any = (res as any).data || res;
        console.log("[Driver Trip] API response:", data);

        // Map route name with trip type (don_sang/tra_chieu)
        const loaiChuyen = data?.schedule?.loaiChuyen || "";
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
                loaiChuyen === "don_sang"
                  ? "(Đi)"
                  : loaiChuyen === "tra_chieu"
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

        // Get route ID for GPS simulator
        const currentRouteId =
          data?.routeInfo?.maTuyen ||
          data?.maTuyen ||
          data?.tuyenId ||
          data?.routeId ||
          data?.idTuyen;
        if (currentRouteId) {
          setRouteId(currentRouteId);
          console.log("[Driver Trip] Route ID for simulator:", currentRouteId);
        }

        // Get polyline from route data
        const routePolyline = data?.routeInfo?.polyline || null;
        console.log(
          "[Driver Trip] Route polyline:",
          routePolyline ? "Available" : "Not found"
        );
        // Store polyline in component state so SSBMap can render it
        try {
          setRoutePolyline(routePolyline);
        } catch (err) {
          console.warn("[Driver Trip] Failed to set route polyline state", err);
        }

        const mappedStops = routeStops.map((stop: any, index: number) => {
          // Use stop.sequence if available, otherwise use index + 1
          const stopSequence = stop.sequence || index + 1;

          // 🔥 FIX: Ưu tiên sử dụng students từ stop (backend đã tính sẵn)
          // Nếu không có, fallback về students từ data?.students
          let stopStudents = [];
          
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
          
          console.log(`[Driver Trip] Stop ${stopSequence} (${stop.tenDiem}): ${stopStudents.length} students`, {
            stopSequence,
            stopName: stop.tenDiem,
            studentCount: stop.studentCount,
            studentsFromStop: stop.students?.length || 0,
            studentsMapped: stopStudents.length,
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
            sequence: stop.sequence || stopSequence || (index + 1), // 🔥 Lưu sequence để tính điểm cuối
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

        // 🔥 Tính toán điểm cuối và tripType
        const maxSequence = mappedStops.length > 0 
          ? Math.max(...mappedStops.map((s: any) => s.sequence || 0))
          : mappedStops.length;
        const currentStopSequence = mappedStops[currentStopIndex]?.sequence || (currentStopIndex + 1);
        const isLastStopValue = currentStopSequence === maxSequence;
        
        // Lấy tripType từ schedule
        const tripTypeValue = data?.schedule?.loaiChuyen || data?.loaiChuyen || null;
        
        setIsLastStop(isLastStopValue);
        setTripType(tripTypeValue as "don_sang" | "tra_chieu" | null);
        
        console.log("[Driver Trip] Trip type and last stop:", {
          tripType: tripTypeValue,
          isLastStop: isLastStopValue,
          currentStopSequence,
          maxSequence,
          currentStopIndex,
        });

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
            setTrip((prevTrip) => ({
              ...prevTrip,
              stops: prevTrip.stops.map((stop: any, idx: number) => {
                const thuTu = idx + 1;
                const savedStatus = statuses.find(
                  (s: any) => s.thuTuDiem === thuTu
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
            const firstNonCompleted = mappedStops.findIndex(
              (s: any, idx: number) => {
                const thuTu = idx + 1;
                const savedStatus = statuses.find(
                  (s: any) => s.thuTuDiem === thuTu
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
  
  // Handle checkout (trả học sinh) - cho chuyến về
  const handleStudentCheckout = async (studentId: string) => {
    // Update UI optimistically
    setTrip((prev) => ({
      ...prev,
      stops: prev.stops.map((stop) =>
        stop.id === currentStop.id
          ? {
              ...stop,
              students: stop.students.map((student) =>
                student.id === studentId
                  ? { ...student, status: "dropped" }
                  : student
              ),
            }
          : stop
      ),
    }));

    // Call API POST /checkout
    try {
      const token = localStorage.getItem("ssb_token");
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

      const response = await fetch(
        `${API_URL}/trips/${tripIdNum}/students/${studentId}/checkout`,
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
        throw new Error(errorData.message || "Failed to checkout student");
      }

      const result = await response.json();
      console.log("[Driver Trip] Student checked out:", result);

      toast({
        title: "✅ Đã trả học sinh",
        description: "Phụ huynh đã nhận thông báo",
      });
      
      // Reload trip data để cập nhật summary
      const res = await api.getTripById(tripIdNum);
      const data: any = (res as any).data || res;
      if (data?.summary) {
        console.log("[Driver Trip] Updated summary:", data.summary);
      }
    } catch (error: any) {
      console.error("[Driver Trip] Error checking out student:", error);
      // Revert UI on error
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
      toast({
        title: "❌ Lỗi cập nhật",
        description: error?.message || "Không thể trả học sinh",
        variant: "destructive",
      });
    }
  };

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
      
      // Reload trip data để cập nhật summary
      const res = await api.getTripById(tripIdNum);
      const data: any = (res as any).data || res;
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

      console.log("[Driver Trip] Arriving at stop:", {
        stopId,
        stopSequence,
        stopName,
        tripIdNum,
      });

      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("ssb_token")
          : null;

      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

      // 🔥 Kiểm tra điểm cuối: Chuyến đi (don_sang) không đón học sinh tại điểm cuối
      const currentStopSequence = (currentStop as any).sequence || trip.currentStop + 1;
      const maxSequence = Math.max(...trip.stops.map((s: any) => s.sequence || 0));
      const isCurrentLastStop = currentStopSequence === maxSequence;

      // 1. Load students at this stop (skip nếu là điểm cuối của chuyến đi)
      if (!(isCurrentLastStop && tripType === "don_sang")) {
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
      } else {
        console.log("[Driver Trip] Final stop for morning trip - skipping student load");
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
      if (isCurrentLastStop && tripType === "don_sang") {
        toast({
          title: "🏫 Đã đến trường",
          description: `Xe đã đến điểm cuối (trường học). Nhấn "Đến điểm cuối" để hoàn thành chuyến đi.`,
        });
      } else {
        toast({
          title: "🚏 Đã đến điểm dừng",
          description: `Xe đã đến ${stopName}. Đã tải danh sách học sinh.`,
        });
      }
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
        
        // If DEMO mode and simulator is at stop, continue simulation
        if (locationSource === "demo" && simulatorAtStop) {
          continueSimulator();
          console.log("[Driver Trip] Continuing GPS simulator to next stop");
        }
        
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

      // 🔥 Load học sinh cho chuyến về (tra_chieu) khi bắt đầu
      if (tripType === "tra_chieu") {
        try {
          const token = localStorage.getItem("ssb_token");
          const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
          
          const studentsResponse = await fetch(
            `${API_URL}/trips/${tripIdNum}/students-from-morning`,
            {
              headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
            }
          );

          if (studentsResponse.ok) {
            const studentsData = await studentsResponse.json();
            const morningStudents = studentsData.data?.students || [];
            
            console.log(`[Driver Trip] Loaded ${morningStudents.length} students from morning trip`);

            // Map học sinh vào đúng điểm dừng dựa trên thuTuDiemDon
            setTrip((prev) => ({
              ...prev,
              stops: prev.stops.map((stop: any, idx: number) => {
                const stopSequence = stop.sequence || (idx + 1);
                const studentsAtStop = morningStudents.filter(
                  (s: any) => s.thuTuDiemDon === stopSequence
                );

                return {
                  ...stop,
                  students: studentsAtStop.map((s: any) => ({
                    id: String(s.maHocSinh),
                    name: s.hoTen || "Học sinh",
                    status: "picked", // Đã có trên xe từ đầu
                    avatar: s.anhDaiDien || "/placeholder.svg?height=40&width=40",
                    parent: "",
                  })),
                };
              }),
            }));
          }
        } catch (err) {
          console.warn("[Driver Trip] Failed to load students from morning trip:", err);
        }
      }

      // Start GPS tracking based on mode
      if (locationSource === "real") {
        startGPS();
      } else if (locationSource === "demo") {
        // Start GPS simulator for DEMO mode
        try {
          await startSimulator();
          console.log("[Driver Trip] GPS Simulator started");
        } catch (err: any) {
          console.error("[Driver Trip] Failed to start GPS simulator:", err);
          toast({
            title: "Lỗi khởi động simulator",
            description: err?.message || "Không thể khởi động GPS simulator",
            variant: "destructive",
          });
        }
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
        // Fallback: Vẫn set state dựa trên assumption trip đã start thành công
        setTripStatus("dang_chay");
        setStarted(true);
        setTrip((prev) => ({
          ...prev,
          status: "in-progress",
        }));
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
        responseData: e?.response?.data,
        errorData: e?.errorData,
        url: e?.url,
        stack: e?.stack,
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
      
      // 🔥 Kiểm tra học sinh chưa được trả (chuyến về)
      if (tripType === "tra_chieu") {
        const allStudents = trip.stops.flatMap((stop: any) => stop.students || []);
        const studentsOnBus = allStudents.filter((s: any) => s.status === "picked" || s.status === "pending");
        
        if (studentsOnBus.length > 0) {
          toast({
            title: "⚠️ Không thể kết thúc chuyến đi",
            description: `Còn ${studentsOnBus.length} học sinh chưa được trả. Vui lòng trả tất cả học sinh trước khi kết thúc.`,
            variant: "destructive",
            duration: 7000,
          });
          setProcessing(false);
          return;
        }
      }
      
      // Gọi API kết thúc nếu backend có hỗ trợ
      await endTrip(tripIdNum);
      stopGPS();
      // Stop simulator if running
      if (simulatorRunning) {
        stopSimulator();
      }
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
      // Stop simulator if running
      if (simulatorRunning) {
        stopSimulator();
      }
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

  // 🔥 Tính toán điểm cuối dựa trên sequence (không phải index)
  const currentStopSequence = (currentStop as any).sequence || trip.currentStop + 1;
  const maxSequence = trip.stops.length > 0 
    ? Math.max(...trip.stops.map((s: any) => s.sequence || 0))
    : trip.stops.length;
  const isCurrentLastStop = currentStopSequence === maxSequence;
  // 🔥 Single CTA: Chỉ hiện nút "Bắt đầu" nếu trip chưa start
  // Dựa trên cả tripStatus và started state để đảm bảo sync với backend
  const showStart = !gpsRunning && !started && tripStatus !== "dang_chay" && tripStatus !== "hoan_thanh";

  // Auto-start GPS if trip is already running and REAL mode is selected
  useEffect(() => {
    if (
      tripStatus === "dang_chay" &&
      effectiveTripId &&
      locationSource === "real" &&
      !gpsRunning
    ) {
      console.log(
        "[Driver Trip] Auto-starting GPS for running trip",
        effectiveTripId
      );
      startGPS();
    } else if (
      tripStatus === "dang_chay" &&
      effectiveTripId &&
      locationSource === "demo" &&
      !simulatorRunning &&
      routeId
    ) {
      console.log(
        "[Driver Trip] Auto-starting GPS Simulator for running trip",
        effectiveTripId
      );
      startSimulator().catch((err) => {
        console.error("[Driver Trip] Failed to auto-start simulator:", err);
      });
    } else if (locationSource === "demo" && gpsRunning) {
      // Stop GPS if switching to DEMO mode
      stopGPS();
    } else if (locationSource === "real" && simulatorRunning) {
      // Stop simulator if switching to REAL mode
      stopSimulator();
    }
  }, [
    tripStatus,
    gpsRunning,
    simulatorRunning,
    effectiveTripId,
    routeId,
    startGPS,
    stopGPS,
    startSimulator,
    stopSimulator,
    locationSource,
  ]);

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
          ? isCurrentLastStop
            ? "Đến điểm cuối"
            : "Đến điểm dừng"
          : isCurrentLastStop
          ? "Kết thúc chuyến đi"
          : "Rời điểm dừng",
        onClick: !atCurrentStop
          ? arriveCurrentStop
          : isCurrentLastStop
          ? finishTrip
          : leaveCurrentStop,
        icon: !atCurrentStop ? Navigation : isCurrentLastStop ? Flag : ArrowRight,
        variant:
          atCurrentStop && isCurrentLastStop
            ? ("destructive" as const)
            : ("default" as const),
        className: !atCurrentStop
          ? "bg-sky-600 hover:bg-sky-700 text-white"
          : isCurrentLastStop
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
                if (value === "demo") {
                  if (gpsRunning) {
                    stopGPS();
                  }
                  if (simulatorRunning) {
                    // Already running, just show message
                    toast({
                      title: "Chế độ DEMO",
                      description: simulatorAtStop 
                        ? "Đã đến điểm dừng - Đang đợi driver đón học sinh"
                        : "Đang mô phỏng GPS",
                    });
                  } else if (tripStatus === "dang_chay" && routeId) {
                    // Auto-start simulator if trip is running
                    startSimulator().catch((err) => {
                      console.error("[Driver Trip] Failed to start simulator:", err);
                      toast({
                        title: "Lỗi khởi động simulator",
                        description: err?.message || "Không thể khởi động GPS simulator",
                        variant: "destructive",
                      });
                    });
                  } else {
                    toast({
                      title: "Chuyển sang chế độ DEMO",
                      description: "Simulator sẽ khởi động khi bạn nhấn 'Bắt đầu chuyến đi'",
                    });
                  }
                } else if (value === "real") {
                  if (simulatorRunning) {
                    stopSimulator();
                  }
                  if (tripStatus === "dang_chay" && !gpsRunning) {
                    startGPS();
                    toast({
                      title: "Chuyển sang chế độ REAL",
                      description: "Đang lấy vị trí GPS từ thiết bị...",
                    });
                  } else {
                    toast({
                      title: "Chuyển sang chế độ REAL",
                      description: "GPS sẽ tự động bật khi bạn nhấn 'Bắt đầu chuyến đi'",
                    });
                  }
                }
              }}
              className="space-y-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="demo" id="demo" />
                <Label htmlFor="demo" className="cursor-pointer flex-1">
                  <div className="flex flex-col">
                    <span className="font-medium">DEMO - GPS Simulator (tích hợp)</span>
                    <span className="text-sm text-muted-foreground">
                      Xe tự động di chuyển theo polyline, dừng tại mỗi điểm dừng
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
              <div className="mt-4 space-y-3">
                {/* Speed Control for DEMO mode */}
                <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="demo-speed" className="text-sm font-medium flex items-center gap-2">
                      <Gauge className="w-4 h-4" />
                      Tốc độ mô phỏng (km/h)
                    </Label>
                    <span className="text-sm font-mono text-muted-foreground">
                      {demoSpeed} km/h
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Input
                      id="demo-speed"
                      type="number"
                      min={10}
                      max={120}
                      step={5}
                      value={demoSpeed}
                      onChange={(e) => {
                        const newSpeed = Math.max(10, Math.min(120, parseInt(e.target.value) || 40));
                        setDemoSpeed(newSpeed);
                        if (simulatorRunning) {
                          // Update speed and restart simulation
                          updateSimulatorSpeed(newSpeed);
                          // Restart simulation with new speed
                          stopSimulator();
                          setTimeout(() => {
                            startSimulator().catch((err) => {
                              console.error("[Driver Trip] Failed to restart simulator:", err);
                              toast({
                                title: "Lỗi cập nhật tốc độ",
                                description: err?.message || "Không thể cập nhật tốc độ",
                                variant: "destructive",
                              });
                            });
                          }, 200);
                        }
                      }}
                      className="flex-1"
                      disabled={!simulatorRunning && tripStatus !== "dang_chay"}
                    />
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      (10-120)
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {simulatorRunning 
                      ? "Thay đổi tốc độ sẽ khởi động lại simulation"
                      : "Điều chỉnh tốc độ trước khi bắt đầu chuyến đi"}
                  </p>
                </div>

                {simulatorError && (
                  <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                    <p className="text-sm text-red-700 dark:text-red-300">
                      ❌ <strong>Lỗi:</strong> {simulatorError}
                    </p>
                  </div>
                )}
                {simulatorRunning && !simulatorAtStop && (
                  <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                    <p className="text-sm text-green-700 dark:text-green-300">
                      ✅ <strong>DEMO Mode:</strong> Đang mô phỏng GPS - Xe đang di chuyển với tốc độ {simulatorCurrentSpeed || demoSpeed} km/h
                    </p>
                  </div>
                )}
                {simulatorRunning && simulatorAtStop && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg">
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      🚏 <strong>DEMO Mode:</strong> Đã đến điểm dừng - Đang đợi driver đón học sinh
                    </p>
                  </div>
                )}
                {!simulatorRunning && tripStatus === "dang_chay" && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      ⚠️ <strong>DEMO Mode:</strong> Simulator chưa được khởi động. Nhấn "Bắt đầu chuyến đi" để khởi động.
                    </p>
                  </div>
                )}
                {!simulatorRunning && tripStatus !== "dang_chay" && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      💡 <strong>DEMO Mode:</strong> Simulator sẽ tự động khởi động khi bạn nhấn "Bắt đầu chuyến đi"
                    </p>
                  </div>
                )}
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
                    <div className="h-[640px] w-full">
                      <SSBMap
                        polyline={dynamicDirections || routePolyline}
                        height="640px"
                        center={busLocation}
                        zoom={mapZoom}
                        followFirstMarker={tripStatus === "dang_chay"}
                        buses={[
                          {
                            id:
                              (busPosition?.busId ??
                                trip.vehicle?.plateNumber ??
                                5) + "",
                            lat: busLocation.lat,
                            lng: busLocation.lng,
                            label: `${trip.vehicle.plateNumber} - ${trip.route}`,
                            status: "running",
                          },
                        ]}
                        stops={(() => {
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
                        })()}
                        autoFitOnUpdate={false}
                      />
                    </div>
                    {/* Removed route hints to bring students list closer */}
                  </CardContent>
                </Card>

                {/* 🔥 Students List với nút hành động rõ ràng */}
                <div className="space-y-3">
                  {/* 🔥 Hiển thị message đặc biệt cho điểm cuối của chuyến đi */}
                  {isCurrentLastStop && tripType === "don_sang" ? (
                    <Card className="border-border/50 bg-blue-50 dark:bg-blue-950">
                      <CardContent className="p-4 text-center">
                        <p className="font-medium text-blue-700 dark:text-blue-300 mb-2">
                          🏫 Đã đến trường
                        </p>
                        <p className="text-sm text-blue-600 dark:text-blue-400">
                          Điểm cuối là trường học. Không có học sinh để đón tại đây.
                          Nhấn "Đến điểm cuối" để hoàn thành chuyến đi.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <>
                      <h4 className="font-medium text-foreground">
                        {tripType === "tra_chieu" 
                          ? `Học sinh trên xe cần trả (${currentStop.students.filter((s: any) => s.status === "picked").length})`
                          : `Danh sách học sinh (${currentStop.students.length})`}
                      </h4>
                      {currentStop.students.length === 0 ? (
                        <Card className="border-border/50">
                          <CardContent className="p-4 text-center text-muted-foreground">
                            {tripType === "tra_chieu" 
                              ? "Không có học sinh cần trả tại điểm dừng này"
                              : "Không có học sinh tại điểm dừng này"}
                          </CardContent>
                        </Card>
                      ) : (
                    currentStop.students.map((student) => (
                      <Card key={student.id} className="border-border/50">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-10 h-10">
                                <AvatarImage
                                  src={student.avatar || "/placeholder.svg"}
                                  alt={student.name}
                                />
                                <AvatarFallback>
                                  {student.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-foreground">
                                  {student.name}
                                </p>
                                <div className="flex items-center gap-2">
                                  {student.status === "picked" && (
                                    <Badge variant="default" className="bg-green-600">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Đã đón
                                    </Badge>
                                  )}
                                  {student.status === "absent" && (
                                    <Badge variant="destructive">
                                      <XCircle className="w-3 h-3 mr-1" />
                                      Vắng
                                    </Badge>
                                  )}
                                  {student.status === "pending" && (
                                    <Badge variant="outline">
                                      <Clock className="w-3 h-3 mr-1" />
                                      Chờ đón
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="bg-transparent"
                                title="Liên hệ phụ huynh"
                              >
                                <Phone className="w-4 h-4" />
                              </Button>
                              {/* 🔥 Chuyến về: Hiển thị button "Trả học sinh" cho học sinh đã lên xe */}
                              {tripType === "tra_chieu" && student.status === "picked" && (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleStudentCheckout(student.id)}
                                  className="bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Trả học sinh
                                </Button>
                              )}
                              {/* Chuyến đi: Hiển thị button "Đã đón" và "Vắng" cho học sinh chờ đón */}
                              {tripType === "don_sang" && student.status === "pending" && (
                                <>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleStudentCheckin(student.id)}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Đã đón
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleMarkAbsent(student.id)}
                                    className="text-warning border-warning hover:bg-warning/10"
                                  >
                                    <XCircle className="w-4 h-4 mr-1" />
                                    Vắng
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                      )}
                    </>
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

            {/* Speed Control - Only show in DEMO mode */}
            {locationSource === "demo" && (
              <SpeedControlCard
                currentSpeed={simulatorCurrentSpeed || demoSpeed}
                onSpeedChange={(newSpeed) => {
                  setDemoSpeed(newSpeed);
                  updateSimulatorSpeed(newSpeed);
                }}
                min={10}
                max={120}
                disabled={!simulatorRunning}
              />
            )}

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
