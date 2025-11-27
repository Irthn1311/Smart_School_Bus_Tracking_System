"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ParentSidebar } from "@/components/parent/parent-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Clock,
  Phone,
  CheckCircle2,
  AlertCircle,
  TriangleAlert,
} from "lucide-react";
import { MapView } from "@/components/tracking/MapView";
import { apiClient } from "@/lib/api";
import { useTripBusPosition, useTripAlerts } from "@/hooks/use-socket";
import { useToast } from "@/hooks/use-toast";
// Removed filter selects per request

export default function ParentDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  // Selection
  const [selectedRouteId, setSelectedRouteId] = useState<number | undefined>(
    undefined
  );
  const [selectedTripId, setSelectedTripId] = useState<number | undefined>(
    undefined
  );

  const { busPosition } = useTripBusPosition(selectedTripId);
  const [busLocation, setBusLocation] = useState<{
    lat: number;
    lng: number;
    heading?: number;
  } | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const { toast } = useToast();
  const { approachStop, delayAlert } = useTripAlerts(selectedTripId);
  const [banner, setBanner] = useState<{
    type: "info" | "warning";
    title: string;
    description?: string;
  } | null>(null);
  const [stops, setStops] = useState<
    { id: string; lat: number; lng: number; label?: string }[]
  >([]);
  const [busInfo, setBusInfo] = useState<{
    id: string;
    plateNumber: string;
    route: string;
  } | null>(null);

  // M5: Realtime notifications state
  const [recentNotifications, setRecentNotifications] = useState<
    Array<{
      type: "success" | "info" | "warning";
      title: string;
      time: string;
      timestamp: number;
    }>
  >([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // M5: Child info state (MUST be before useEffect that uses it)
  const [childInfo, setChildInfo] = useState<{
    name: string;
    grade: string;
    status: string;
    busNumber: string;
    driverName: string;
    driverPhone: string;
    pickupTime: string;
    dropoffTime: string;
    currentStop: string;
    estimatedArrival: string;
  } | null>(null);

  useEffect(() => {
    if (user && user.role?.toLowerCase() !== "parent") {
      const userRole = user.role?.toLowerCase();
      if (userRole === "admin" || userRole === "driver") {
        router.push(`/${userRole}`);
      }
    }
  }, [user, router]);

  // Update local position whenever realtime event arrives
  // 🔥 FIX: Sử dụng useMemo để tránh infinite loop
  useEffect(() => {
    if (
      busPosition &&
      Number.isFinite(busPosition.lat) &&
      Number.isFinite(busPosition.lng)
    ) {
      // Chỉ update nếu giá trị thực sự thay đổi (tránh loop)
      setBusLocation((prev) => {
        if (
          prev &&
          prev.lat === busPosition.lat &&
          prev.lng === busPosition.lng &&
          prev.heading === busPosition.heading
        ) {
          return prev; // Không thay đổi, tránh re-render
        }
        console.log("[Parent] busPosition updated:", busPosition);
        return {
          lat: busPosition.lat,
          lng: busPosition.lng,
          heading: busPosition.heading,
        };
      });
      setLastUpdate(Date.now());
    } else {
      console.warn(
        "[Parent] No valid busPosition yet, keeping default location"
      );
    }
    // 🔥 FIX: Chỉ depend vào giá trị cụ thể, không phải object reference
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busPosition?.lat, busPosition?.lng, busPosition?.heading]);

  // Day 4: show alerts for approach_stop & delay_alert
  useEffect(() => {
    if (!approachStop) return;

    const stopName = approachStop.stopName || approachStop.stop_name || "điểm dừng";
    const distance = approachStop.distance_m || approachStop.distance || 0;
    const etaMinutes = approachStop.eta?.etaMinutes || Math.round(distance / 1000 * 2);

    // Show toast notification
    toast({
      title: "🚏 Xe sắp đến điểm dừng",
      description: `Xe đang cách ${stopName} khoảng ${Math.round(distance)}m (~${etaMinutes} phút)`,
      duration: 5000,
    });

    // Update banner
    setBanner({
      type: "info",
      title: `🚏 Xe sắp đến ${stopName}`,
      description: `Còn khoảng ${Math.round(distance)}m (~${etaMinutes} phút)`,
    });
  }, [approachStop, toast]);

  // M5 FIX: Delay alert - Show persistent banner that updates delay minutes only
  useEffect(() => {
    if (!delayAlert) return;

    const delayMinutes =
      delayAlert.delayMinutes ||
      delayAlert.delay_minutes ||
      delayAlert.delay_min ||
      0;

    console.log("[PARENT DEBUG] delayAlert received:", {
      delayAlert,
      delayMinutes,
      willShowAsLate: delayMinutes > 0,
    });

    const description = `Xe đang trễ khoảng ${delayMinutes} phút so với dự kiến`;

    setBanner((prev) => {
      const isSameWarning =
        prev &&
        prev.type === "warning" &&
        prev.description === description;

      if (!prev || prev.type !== "warning") {
        toast({
          title: "⚠️ Xe buýt đang trễ",
          description,
          variant: "destructive",
        });
      }

      if (isSameWarning) {
        return prev;
      }

      console.log(`[Parent] Updated delay banner: ${delayMinutes} phút`);
      return {
        type: "warning",
        title: "⚠️ Xe buýt đang trễ",
        description,
      };
    });
  }, [delayAlert, toast]);

  // M5: Listen for realtime notifications from WebSocket
  useEffect(() => {
    const handleNotificationNew = (event: CustomEvent) => {
      const data = event.detail;
      console.log("[Parent M5] notification:new received:", data);

      // Determine notification type based on content
      let notifType: "success" | "info" | "warning" = "info";
      const title = data.tieuDe || data.title || "Thông báo mới";
      const content = data.noiDung || data.content || data.message || "";

      if (title.includes("bắt đầu") || title.includes("khởi hành")) {
        notifType = "info";
      } else if (title.includes("sắp đến") || title.includes("approach")) {
        notifType = "info";
      } else if (
        title.includes("trễ") ||
        title.includes("delay") ||
        title.includes("chậm") ||
        title.includes("vắng") ||
        title.includes("vắng mặt")
      ) {
        notifType = "warning";
      } else if (
        title.includes("hoàn thành") ||
        title.includes("completed") ||
        title.includes("đã đón") ||
        title.includes("đã đưa") ||
        title.includes("lên xe") ||
        title.includes("kết thúc")
      ) {
        notifType = "success";
      }

      // Show toast
      toast({
        title: title,
        description: content,
        variant: notifType === "warning" ? "destructive" : "default",
      });

      // Add to recent notifications list (max 10 items)
      setRecentNotifications((prev) => {
        const newNotif = {
          type: notifType,
          title: title,
          time: "Vừa xong",
          timestamp: Date.now(),
        };
        const updated = [newNotif, ...prev].slice(0, 10);
        return updated;
      });

      // Increment unread count
      setUnreadCount((prev) => prev + 1);

      // M5 FIX: Reload child info when trip starts or student picked up to update UI
      if (
        title.includes("bắt đầu") ||
        title.includes("khởi hành") ||
        title.includes("lên xe") ||
        title.includes("đã đón") ||
        title.includes("vắng") ||
        title.includes("hoàn thành") ||
        title.includes("kết thúc")
      ) {
        console.log("[Parent M5] Trip event detected, reloading child info...");
        // Reload student info to get new trip ID and status
        apiClient
          .getStudentsByParent()
          .then((res) => {
            const students = Array.isArray((res as any)?.data)
              ? (res as any).data
              : [];
            if (students.length > 0) {
              const firstChild = students[0];
              const tripInfo = firstChild.tripInfo || {};
              const schedule = tripInfo.gioKhoiHanh || "07:15";

              // Update trip ID if available
              if (tripInfo.maChuyen) {
                console.log(
                  "[Parent M5] Updating selectedTripId to:",
                  tripInfo.maChuyen
                );
                setSelectedTripId(tripInfo.maChuyen);
              }

              // Map student status
              const studentStatus =
                firstChild.trangThaiHocSinh ||
                tripInfo.trangThaiHocSinh ||
                "cho_don";
              let displayStatus: "waiting" | "on-bus" | "picked-up" | "absent" = "waiting";

              if (studentStatus === "da_don") {
                displayStatus = "on-bus";
              } else if (studentStatus === "da_tra") {
                displayStatus = "picked-up";
              } else if (studentStatus === "vang") {
                displayStatus = "absent"; // 🔥 FIX: Phân biệt "vang" với "cho_don"
              } else if (studentStatus === "cho_don") {
                displayStatus = "waiting";
              }

              setChildInfo({
                name: firstChild.hoTen || "Chưa có tên",
                grade: firstChild.lop || "Chưa có lớp",
                status: displayStatus,
                busNumber:
                  tripInfo.bienSoXe || busInfo?.plateNumber || "29B-12345",
                driverName: tripInfo.tenTaiXe || "Chưa phân công",
                driverPhone: tripInfo.sdtTaiXe || "—",
                pickupTime: schedule.slice(0, 5) || "07:15",
                dropoffTime: "16:30",
                currentStop: "Điểm đón",
                estimatedArrival: "5 phút",
              });
            }
          })
          .catch((err) => {
            console.warn("[Parent M5] Failed to reload child info:", err);
          });
      }
    };

    // Listen to custom event dispatched by socket
    window.addEventListener(
      "notificationNew",
      handleNotificationNew as EventListener
    );

    return () => {
      window.removeEventListener(
        "notificationNew",
        handleNotificationNew as EventListener
      );
    };
  }, [toast, busInfo]);

  // M5: Update relative time for notifications every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setRecentNotifications((prev) =>
        prev.map((notif) => {
          const diffMs = Date.now() - notif.timestamp;
          const diffMin = Math.floor(diffMs / 60000);
          const diffHour = Math.floor(diffMs / 3600000);

          let timeStr = "Vừa xong";
          if (diffMin < 1) {
            timeStr = "Vừa xong";
          } else if (diffMin < 60) {
            timeStr = `${diffMin} phút trước`;
          } else if (diffHour < 24) {
            timeStr = `${diffHour} giờ trước`;
          } else {
            timeStr = `${Math.floor(diffHour / 24)} ngày trước`;
          }

          return { ...notif, time: timeStr };
        })
      );
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // M5: Listen for pickup status updates (student checkin/checkout)
  useEffect(() => {
    const handlePickupStatusUpdate = (event: CustomEvent) => {
      const data = event.detail;
      console.log("[Parent M5] pickup_status_update received:", data);

      // Reload child info to reflect new status
      if (childInfo && user) {
        apiClient
          .getStudentsByParent()
          .then((res) => {
            const students = Array.isArray((res as any)?.data)
              ? (res as any).data
              : [];
            if (students.length > 0) {
              const firstChild = students[0];
              const tripInfo = firstChild.tripInfo || {};
              const schedule = tripInfo.gioKhoiHanh || "07:15";

              // Map student status
              const studentStatus =
                firstChild.trangThaiHocSinh ||
                tripInfo.trangThaiHocSinh ||
                "cho_don";
              let displayStatus: "waiting" | "on-bus" | "picked-up" | "absent" = "waiting";

              if (studentStatus === "da_don") {
                displayStatus = "on-bus";
              } else if (studentStatus === "da_tra") {
                displayStatus = "picked-up";
              } else if (studentStatus === "vang") {
                displayStatus = "absent"; // 🔥 FIX: Phân biệt "vang" với "cho_don"
              } else if (studentStatus === "cho_don") {
                displayStatus = "waiting";
              }

              setChildInfo({
                name: firstChild.hoTen || "Chưa có tên",
                grade: firstChild.lop || "Chưa có lớp",
                status: displayStatus,
                busNumber:
                  tripInfo.bienSoXe || busInfo?.plateNumber || "29B-12345",
                driverName: tripInfo.tenTaiXe || "Chưa phân công",
                driverPhone: tripInfo.sdtTaiXe || "—",
                pickupTime: schedule.slice(0, 5) || "07:15",
                dropoffTime: "16:30",
                currentStop: "Điểm đón",
                estimatedArrival: delayAlert?.delayMinutes
                  ? `Trễ ${delayAlert.delayMinutes} phút`
                  : "5 phút",
              });
            }
          })
          .catch((e) =>
            console.warn(
              "[Parent] Failed to reload children after pickup update",
              e
            )
          );
      }
    };

    window.addEventListener(
      "pickupStatusUpdate",
      handlePickupStatusUpdate as EventListener
    );

    return () => {
      window.removeEventListener(
        "pickupStatusUpdate",
        handlePickupStatusUpdate as EventListener
      );
    };
  }, [childInfo, user, busInfo, delayAlert]);

  // M5: Listen for trip_incident (emergency)
  useEffect(() => {
    const handleTripIncident = (event: CustomEvent) => {
      const data = event.detail;
      console.log("[Parent M5] trip_incident received:", data);

      // Show urgent toast
      toast({
        title: `⚠️ Sự cố: ${data.incidentType || "Khẩn cấp"}`,
        description:
          data.description ||
          "Xe buýt đang gặp sự cố. Vui lòng liên hệ nhà trường.",
        variant: "destructive",
      });

      // Add to notifications
      setRecentNotifications((prev) => {
        const newNotif = {
          type: "warning" as const,
          title: `⚠️ Sự cố: ${data.incidentType || "Khẩn cấp"}`,
          time: "Vừa xong",
          timestamp: Date.now(),
        };
        return [newNotif, ...prev].slice(0, 10);
      });
      setUnreadCount((prev) => prev + 1);
    };

    window.addEventListener(
      "tripIncident",
      handleTripIncident as EventListener
    );

    return () => {
      window.removeEventListener(
        "tripIncident",
        handleTripIncident as EventListener
      );
    };
  }, [toast]);

  // M5: Listen for trip_completed
  useEffect(() => {
    const handleTripCompleted = (event: CustomEvent) => {
      const data = event.detail;
      console.log("[Parent M5] trip_completed received:", data);

      // 🔥 FIX: Không tự tạo notification nữa, chỉ reload từ DB để tránh duplicate
      // Notification sẽ được hiển thị từ DB qua notification:new event hoặc khi reload
      
      // Reload child info để cập nhật trạng thái "Đã đến nơi"
      apiClient
        .getStudentsByParent()
        .then((res) => {
          const students = Array.isArray((res as any)?.data)
            ? (res as any).data
            : [];
          if (students.length > 0) {
            const firstChild = students[0];
            const tripInfo = firstChild.tripInfo || {};
            const schedule = tripInfo.gioKhoiHanh || "07:15";

            // Map student status - sau khi kết thúc chuyến đi, status sẽ là "da_tra"
            const studentStatus =
              firstChild.trangThaiHocSinh ||
              tripInfo.trangThaiHocSinh ||
              "cho_don";
            let displayStatus: "waiting" | "on-bus" | "picked-up" | "absent" = "waiting";

            if (studentStatus === "da_don") {
              displayStatus = "on-bus";
            } else if (studentStatus === "da_tra") {
              displayStatus = "picked-up"; // 🔥 FIX: Hiển thị "Đã đến nơi"
            } else if (studentStatus === "vang") {
              displayStatus = "absent"; // 🔥 FIX: Phân biệt "vang" với "cho_don"
            } else if (studentStatus === "cho_don") {
              displayStatus = "waiting";
            }

            setChildInfo({
              name: firstChild.hoTen || "Chưa có tên",
              grade: firstChild.lop || "Chưa có lớp",
              status: displayStatus,
              busNumber:
                tripInfo.bienSoXe || busInfo?.plateNumber || "29B-12345",
              driverName: tripInfo.tenTaiXe || "Chưa phân công",
              driverPhone: tripInfo.sdtTaiXe || "—",
              pickupTime: schedule.slice(0, 5) || "07:15",
              dropoffTime: "16:30",
              currentStop: "Điểm đón",
              estimatedArrival: delayAlert?.delayMinutes
                ? `Trễ ${delayAlert.delayMinutes} phút`
                : "5 phút",
            });
          }
        })
        .catch((e) => {
          console.warn("[Parent M5] Failed to reload child info after trip_completed:", e);
        });

      // Reload notifications từ DB
      apiClient
        .getNotifications({ limit: 10 })
        .then((res: any) => {
          const notifications = Array.isArray(res?.data) ? res.data : [];
          if (notifications.length > 0) {
            const mapped = notifications.map((n: any) => ({
              type: n.loaiThongBao === "trip_incident" ? "warning" : "success",
              title: n.tieuDe || "Thông báo",
              time: "Vừa xong",
              timestamp: new Date(n.thoiGianGui || Date.now()).getTime(),
            }));
            setRecentNotifications(mapped.slice(0, 10));
            setUnreadCount(notifications.filter((n: any) => !n.daDoc).length);
          }
        })
        .catch((e) => {
          console.warn("[Parent M5] Failed to reload notifications:", e);
        });
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
  }, [toast, busInfo, delayAlert]);

  // Note: Removed initial fetching of students/routes to avoid 401/404 when not needed.

  // When route changes or student changes, load stops for that route
  useEffect(() => {
    async function loadStops(routeId?: number) {
      if (!routeId) return;
      try {
        const routeRes = await apiClient.getRouteById(routeId);
        const routeData: any = (routeRes as any).data || routeRes;
        const points: any[] =
          routeData?.diemDung || routeData?.route?.diemDung || [];
        const mapped = points.map((s: any) => ({
          id: (s.maDiem || s.id || `${s.viDo}_${s.kinhDo}`) + "",
          lat: Number(s.viDo || s.lat || s.latitude),
          lng: Number(s.kinhDo || s.lng || s.longitude),
          label: s.tenDiem || s.ten,
        }));
        setStops(
          mapped.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
        );
      } catch (e) {
        console.warn("[Parent] loadStops failed", e);
      }
    }
    loadStops(selectedRouteId);
  }, [selectedRouteId]);

  // Resolve and select a trip for current selection (run after auth ready)
  useEffect(() => {
    async function resolveTrip() {
      try {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, "0");
        const dd = String(today.getDate()).padStart(2, "0");
        const ngayChay = `${yyyy}-${mm}-${dd}`;

        const paramsBase: any = { ngayChay };
        if (selectedRouteId) paramsBase.maTuyen = selectedRouteId;

        // Prefer running trips
        const runningRes: any = await apiClient
          .getTrips({ ...paramsBase, trangThai: "dang_chay" })
          .catch(() => ({ data: [] }));
        let trips: any[] =
          (runningRes && (runningRes.data || runningRes)) || [];

        // Fallback: not started yet
        if (!trips || trips.length === 0) {
          const scheduledRes: any = await apiClient
            .getTrips({ ...paramsBase, trangThai: "chua_khoi_hanh" })
            .catch(() => ({ data: [] }));
          trips = (scheduledRes && (scheduledRes.data || scheduledRes)) || [];
        }

        if (trips.length > 0) {
          const first = trips[0];
          const tid = Number(first.maChuyen || first.id);
          setSelectedTripId(Number.isFinite(tid) ? tid : undefined);
          // derive route id from trip
          const rid = Number(first.maTuyen || first.routeId);
          setSelectedRouteId(Number.isFinite(rid) ? rid : undefined);
          // Best effort bus info
          setBusInfo({
            id: (first.maXe || first.busId || "bus") + "",
            plateNumber: first.bienSoXe || "29B-12345",
            route: first.tenTuyen || `Trip ${tid}`,
          });
        } else {
          setSelectedTripId(undefined);
        }
      } catch (e) {
        console.warn("[Parent] resolveTrip failed", e);
        setSelectedTripId(undefined);
      }
    }
    if (!loading && user) resolveTrip();
  }, [selectedRouteId, loading, user]);

  // Load thông tin con từ API - FIX: Hiển thị thông tin từ schedule trước khi trip start
  useEffect(() => {
    async function loadChildren() {
      if (!user || user.role?.toLowerCase() !== "parent") return;
      try {
        const res = await apiClient.getStudentsByParent();
        const students = Array.isArray((res as any)?.data)
          ? (res as any).data
          : [];
        if (students.length > 0) {
          const firstChild = students[0];
          const tripInfo = firstChild.tripInfo || {};
          const schedule = tripInfo.gioKhoiHanh || "07:15";

          // M5 FIX: Map student status from TrangThaiHocSinh properly
          // Database ENUM values: 'cho_don', 'da_don', 'da_tra', 'vang'
          const studentStatus =
            firstChild.trangThaiHocSinh ||
            tripInfo.trangThaiHocSinh ||
            "cho_don";
          let displayStatus: "waiting" | "on-bus" | "picked-up" | "absent" = "waiting";

          if (studentStatus === "da_don") {
            displayStatus = "on-bus"; // Học sinh đã lên xe
          } else if (studentStatus === "da_tra") {
            displayStatus = "picked-up"; // Học sinh đã được đưa đến nơi
          } else if (studentStatus === "vang") {
            displayStatus = "absent"; // 🔥 FIX: Phân biệt "vang" với "cho_don"
          } else if (studentStatus === "cho_don") {
            displayStatus = "waiting"; // Học sinh chưa lên xe
          }

          // 🔥 FIX: Set trip ID và bus info từ schedule ngay cả khi chưa start
          if (tripInfo.maChuyen) {
            const tid = Number(tripInfo.maChuyen);
            if (Number.isFinite(tid)) {
              setSelectedTripId(tid);
              console.log("[Parent] Set selectedTripId from schedule:", tid);
            }
          }

          // Set route ID nếu có
          if (tripInfo.maTuyen) {
            const rid = Number(tripInfo.maTuyen);
            if (Number.isFinite(rid)) {
              setSelectedRouteId(rid);
            }
          }

          // Set bus info từ schedule
          if (tripInfo.bienSoXe || tripInfo.tenTuyen) {
            setBusInfo({
              id: (tripInfo.maXe || "bus") + "",
              plateNumber: tripInfo.bienSoXe || "—",
              route: tripInfo.tenTuyen || "—",
            });
            console.log("[Parent] Set busInfo from schedule:", {
              plateNumber: tripInfo.bienSoXe,
              route: tripInfo.tenTuyen,
            });
          }

          // Load trip details if trip ID is available
          let dropoffTime = "16:30"; // Default fallback
          if (tripInfo.maChuyen) {
            try {
              const tripDetailRes = await apiClient.getTripById(tripInfo.maChuyen);
              const tripDetail: any = (tripDetailRes as any)?.data || tripDetailRes;
              // Try to get dropoff time from schedule or trip
              if (tripDetail?.schedule?.gioKhoiHanh) {
                const pickupTime = tripDetail.schedule.gioKhoiHanh;
                // Estimate dropoff time (add 1-2 hours for return trip)
                const [hours, minutes] = pickupTime.split(':').map(Number);
                const dropoffHours = (hours + (tripDetail.schedule.loaiChuyen === 'don_sang' ? 2 : 1)) % 24;
                dropoffTime = `${String(dropoffHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
              }
            } catch (e) {
              console.warn("[Parent] Failed to load trip details:", e);
            }
          }

          setChildInfo({
            name: firstChild.hoTen || "Chưa có tên",
            grade: firstChild.lop || "Chưa có lớp",
            status: displayStatus,
            busNumber: tripInfo.bienSoXe || busInfo?.plateNumber || "—",
            driverName: tripInfo.tenTaiXe || "Chưa phân công",
            driverPhone: tripInfo.sdtTaiXe || "—",
            pickupTime: schedule.slice(0, 5) || "07:15",
            dropoffTime: dropoffTime,
            currentStop: "Điểm đón",
            estimatedArrival: delayAlert?.delayMinutes
              ? `Trễ ${delayAlert.delayMinutes} phút`
              : "5 phút",
          });
        }
      } catch (e) {
        console.warn("[Parent] Failed to load children", e);
      }
    }
    loadChildren();
  }, [user, delayAlert]); // Removed busInfo dependency to avoid circular updates

  // M5: Fetch recent notifications from API on mount
  useEffect(() => {
    async function fetchNotifications() {
      if (!user || user.role?.toLowerCase() !== "parent") return;
      try {
        console.log("[Parent M5] Fetching notifications from API...");
        const response = await apiClient.getNotifications({ limit: 10 });
        console.log("[Parent M5] Notifications response:", response);

        const data = response as any;
        const notifications = Array.isArray(data?.data) ? data.data : [];

        console.log("[Parent M5] Parsed notifications:", notifications);

        // Map to UI format
        const mapped = notifications.map((notif: any) => {
          let type: "success" | "info" | "warning" = "info";
          const title = notif.tieuDe || "Thông báo";

          if (title.includes("bắt đầu") || title.includes("khởi hành")) {
            type = "info";
          } else if (title.includes("trễ") || title.includes("delay")) {
            type = "warning";
          } else if (
            title.includes("hoàn thành") ||
            title.includes("completed")
          ) {
            type = "success";
          }

          const timestamp = notif.thoiGianGui
            ? new Date(notif.thoiGianGui).getTime()
            : Date.now();
          const diffMs = Date.now() - timestamp;
          const diffMin = Math.floor(diffMs / 60000);
          const diffHour = Math.floor(diffMs / 3600000);

          let timeStr = "Vừa xong";
          if (diffMin < 1) {
            timeStr = "Vừa xong";
          } else if (diffMin < 60) {
            timeStr = `${diffMin} phút trước`;
          } else if (diffHour < 24) {
            timeStr = `${diffHour} giờ trước`;
          } else {
            timeStr = `${Math.floor(diffHour / 24)} ngày trước`;
          }

          return {
            type,
            title,
            time: timeStr,
            timestamp,
          };
        });

        console.log("[Parent M5] Mapped notifications:", mapped);
        setRecentNotifications(mapped);

        // Count unread
        const unread = notifications.filter((n: any) => !n.daDoc).length;
        setUnreadCount(unread);
        console.log("[Parent M5] Unread count:", unread);
      } catch (error) {
        console.error("[Parent M5] Failed to fetch notifications:", error);
      }
    }

    fetchNotifications();
  }, [user]);

  // Guard: Only render for parent role
  if (!user || user.role?.toLowerCase() !== "parent") {
    return null;
  }

  const displayChildInfo = childInfo || {
    name: "Chưa có thông tin",
    grade: "—",
    status: "waiting",
    busNumber: busInfo?.plateNumber || "—",
    driverName: "—",
    driverPhone: "—",
    pickupTime: "—",
    dropoffTime: "—",
    currentStop: "—",
    estimatedArrival: "—",
  };

  return (
    <DashboardLayout sidebar={<ParentSidebar />}>
      <div className="space-y-6">
        {/* Approach/Delay banner */}
        {banner && (
          <div
            className={`flex items-start gap-3 p-3 rounded-lg border ${
              banner.type === "warning"
                ? "bg-orange-500/10 border-orange-300 text-orange-800"
                : "bg-primary/10 border-primary/30 text-primary"
            }`}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-white/40">
              {banner.type === "warning" ? (
                <AlertCircle className="w-5 h-5" />
              ) : (
                <TriangleAlert className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">{banner.title}</div>
              {banner.description && (
                <div className="text-xs opacity-90 mt-0.5">
                  {banner.description}
                </div>
              )}
            </div>
            <button
              onClick={() => setBanner(null)}
              className="text-xs underline opacity-80 hover:opacity-100"
            >
              Đóng
            </button>
          </div>
        )}
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Theo dõi xe buýt
          </h1>
          <p className="text-muted-foreground mt-1">
            Xem vị trí xe buýt của con bạn trong thời gian thực
          </p>
        </div>

        {/* Child Status Card */}
        <Card className="border-border/50 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <div>
                  <h3 className="text-xl font-bold text-foreground">
                    {displayChildInfo.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {displayChildInfo.grade}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {displayChildInfo.status === "on-bus" && (
                    <>
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <Badge
                        variant="default"
                        className="bg-green-500/20 text-green-700 hover:bg-green-500/30"
                      >
                        Đang trên xe
                      </Badge>
                    </>
                  )}
                  {displayChildInfo.status === "picked-up" && (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <Badge
                        variant="default"
                        className="bg-green-500/20 text-green-700 hover:bg-green-500/30"
                      >
                        Đã đón
                      </Badge>
                    </>
                  )}
                  {displayChildInfo.status === "waiting" && (
                    <>
                      <Clock className="w-4 h-4 text-orange-500" />
                      <Badge
                        variant="default"
                        className="bg-orange-500/20 text-orange-700 hover:bg-orange-500/30"
                      >
                        Đang chờ
                      </Badge>
                    </>
                  )}
                  {displayChildInfo.status === "absent" && (
                    <>
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <Badge
                        variant="default"
                        className="bg-red-500/20 text-red-700 hover:bg-red-500/30"
                      >
                        Vắng mặt
                      </Badge>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{displayChildInfo.currentStop}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>Còn {displayChildInfo.estimatedArrival}</span>
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                className="gap-2"
                onClick={() => {
                  if (
                    displayChildInfo.driverPhone &&
                    displayChildInfo.driverPhone !== "—"
                  ) {
                    window.location.href = `tel:${displayChildInfo.driverPhone}`;
                  } else {
                    toast({
                      title: "Thông báo",
                      description: "Chưa có số điện thoại tài xế",
                    });
                  }
                }}
              >
                <Phone className="w-4 h-4" />
                Gọi tài xế
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Real-time Map */}
          <Card className="lg:col-span-2 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Vị trí xe buýt
                {selectedTripId ? (
                  <Badge variant="outline" className="ml-2">
                    Trip {selectedTripId}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="ml-2">
                    Chưa có chuyến
                  </Badge>
                )}
                {delayAlert?.delayMinutes ? (
                  <Badge variant="destructive" className="ml-2">
                    Trễ {delayAlert.delayMinutes} phút
                  </Badge>
                ) : null}
                {lastUpdate && busLocation && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    Cập nhật: {new Date(lastUpdate).toLocaleTimeString()} | (
                    {busLocation.lat.toFixed(5)}, {busLocation.lng.toFixed(5)})
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Replace placeholder with Leaflet MapView */}
              {selectedTripId ? (
                busLocation ? (
                  <MapView
                    buses={
                      [
                        {
                          id: busInfo?.id || "bus",
                          plateNumber:
                            busInfo?.plateNumber || displayChildInfo.busNumber,
                          route: busInfo?.route || `Trip ${selectedTripId}`,
                          status: (() => {
                            const delayMinutes =
                              delayAlert?.delayMinutes ||
                              delayAlert?.delay_minutes ||
                              delayAlert?.delay_min ||
                              0;
                            console.log("[MAP DEBUG] Bus status calculation:", {
                              delayAlert,
                              delayMinutes,
                              status: delayMinutes > 0 ? "late" : "running",
                            });
                            return delayMinutes > 0 ? "late" : "running";
                          })(),
                          lat: busLocation.lat,
                          lng: busLocation.lng,
                          heading: busLocation.heading,
                          speed: 30,
                          students: 12,
                        },
                      ] as any
                    }
                    stops={stops}
                    height="500px"
                    followFirstMarker
                    autoFitOnUpdate
                    showMyLocation={true}
                    customLocationLabel="Vị trí xe buýt"
                    customLocationTarget={{
                      lat: busLocation.lat,
                      lng: busLocation.lng,
                    }}
                  />
                ) : (
                  <div className="h-[500px] flex flex-col items-center justify-center text-sm text-muted-foreground border rounded-lg gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p>Đang tải vị trí xe buýt...</p>
                    <p className="text-xs">Vui lòng chờ kết nối GPS</p>
                  </div>
                )
              ) : (
                <div className="h-[500px] flex items-center justify-center text-sm text-muted-foreground border rounded-lg">
                  Không có chuyến phù hợp để hiển thị bản đồ
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right sidebar with schedule and notifications */}
          <div className="space-y-6">
            {/* Today's Schedule */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Lịch trình hôm nay</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        Đón sáng
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {displayChildInfo.pickupTime} - Điểm đón
                      </p>
                      <Badge variant="outline" className="mt-2 text-xs">
                        Xe buýt {displayChildInfo.busNumber}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        Trả chiều
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {displayChildInfo.dropoffTime} - Điểm trả
                      </p>
                      <Badge variant="outline" className="mt-2 text-xs">
                        Xe buýt {displayChildInfo.busNumber}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-border">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Tài xế</span>
                    <span className="font-medium text-foreground">
                      {displayChildInfo.driverName}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-3 gap-2 bg-transparent"
                    onClick={() => {
                      if (
                        displayChildInfo.driverPhone &&
                        displayChildInfo.driverPhone !== "—"
                      ) {
                        window.location.href = `tel:${displayChildInfo.driverPhone}`;
                      } else {
                        toast({
                          title: "Thông báo",
                          description: "Chưa có số điện thoại tài xế",
                        });
                      }
                    }}
                  >
                    <Phone className="w-4 h-4" />
                    {displayChildInfo.driverPhone}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Notifications */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Thông báo gần đây</span>
                  {unreadCount > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {unreadCount} mới
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentNotifications.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    Chưa có thông báo nào
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentNotifications.map((notification, index) => {
                      const Icon =
                        notification.type === "success"
                          ? CheckCircle2
                          : notification.type === "warning"
                          ? AlertCircle
                          : MapPin;
                      return (
                        <div
                          key={`${notification.timestamp}-${index}`}
                          className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() =>
                            setUnreadCount((prev) => Math.max(0, prev - 1))
                          }
                        >
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              notification.type === "success"
                                ? "bg-green-500/10"
                                : notification.type === "warning"
                                ? "bg-orange-500/10"
                                : "bg-primary/10"
                            }`}
                          >
                            <Icon
                              className={`w-4 h-4 ${
                                notification.type === "success"
                                  ? "text-green-500"
                                  : notification.type === "warning"
                                  ? "text-orange-500"
                                  : "text-primary"
                              }`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">
                              {notification.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {notification.time}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-3"
                  onClick={() => {
                    setUnreadCount(0);
                    router.push("/parent/notifications");
                  }}
                >
                  Xem tất cả thông báo
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
