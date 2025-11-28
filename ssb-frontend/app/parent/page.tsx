"use client";

import { useEffect, useState, useRef } from "react";
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
  const [tripStatus, setTripStatus] = useState<string | null>(null); // Track trip status
  const [morningTripStatus, setMorningTripStatus] = useState<string | null>(
    null
  ); // Track morning trip status
  const [afternoonTripStatus, setAfternoonTripStatus] = useState<string | null>(
    null
  ); // Track afternoon trip status

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
    {
      id: string;
      lat: number;
      lng: number;
      label?: string;
      sequence?: number;
    }[]
  >([]);
  const [routePolyline, setRoutePolyline] = useState<string | null>(null);
  const [dynamicDirections, setDynamicDirections] = useState<string | null>(
    null
  ); // 🔥 NEW: Dynamic route from bus to next stop
  const [currentStopIndex, setCurrentStopIndex] = useState<number>(0); // 🔥 NEW: Track current stop
  const [busInfo, setBusInfo] = useState<{
    id: string;
    plateNumber: string;
    route: string;
  } | null>(null);

  // M5: Realtime notifications state
  const [recentNotifications, setRecentNotifications] = useState<
    Array<{
      id: number; // ← FIX: Thêm id field vào type
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
  // 🔥 DEBUG: Log when hook receives position
  useEffect(() => {
    console.log("[Parent DEBUG] busPosition from hook:", busPosition);
    console.log("[Parent DEBUG] tripStatus:", tripStatus);

    // 🔥 FIX: Stop updating bus position if trip is completed
    if (tripStatus === "hoan_thanh" || tripStatus === "da_hoan_thanh") {
      console.log("[Parent] Trip completed, stopping bus position updates");
      return;
    }

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

      // 🔥 FIX: Loại bỏ logic fetch currentStopIndex từ busPosition update
      // Vì đã có periodic fetch (3s) và socket event (real-time) để cập nhật currentStopIndex
      // Fetch từ busPosition update có thể gây race condition và làm chậm cập nhật
    } else {
      console.warn(
        "[Parent] No valid busPosition yet, keeping default location"
      );
    }
    // 🔥 FIX: Chỉ depend vào giá trị cụ thể, không phải object reference
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    busPosition?.lat,
    busPosition?.lng,
    busPosition?.heading,
    tripStatus,
    selectedTripId,
  ]);

  // Day 4: show alerts for approach_stop & delay_alert
  useEffect(() => {
    if (!approachStop) return;

    const stopName =
      approachStop.stopName || approachStop.stop_name || "điểm dừng";
    const distance = approachStop.distance_m || approachStop.distance || 0;
    const etaMinutes =
      approachStop.eta?.etaMinutes || Math.round((distance / 1000) * 2);

    // Show toast notification
    toast({
      title: "🚏 Xe sắp đến điểm dừng",
      description: `Xe đang cách ${stopName} khoảng ${Math.round(
        distance
      )}m (~${etaMinutes} phút)`,
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

    // 🔥 FIX: Di chuyển toast ra ngoài setBanner để tránh lỗi React
    const prevBanner = prevBannerRef.current;
    const shouldShowToast = !prevBanner || prevBanner.type !== "warning";

    setBanner((prev) => {
      const isSameWarning =
        prev && prev.type === "warning" && prev.description === description;

      if (isSameWarning) {
        return prev;
      }

      console.log(`[Parent] Updated delay banner: ${delayMinutes} phút`);
      const newBanner = {
        type: "warning" as const,
        title: "⚠️ Xe buýt đang trễ",
        description,
      };

      // Update ref for next comparison
      prevBannerRef.current = newBanner;

      return newBanner;
    });

    // Show toast notification outside of setState
    if (shouldShowToast) {
      // Use setTimeout to defer toast call to next tick to avoid calling during render
      setTimeout(() => {
        toast({
          title: "⚠️ Xe buýt đang trễ",
          description,
          variant: "destructive",
        });
      }, 0);
    }
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

      // 🔥 NEW: Show toast with larger, more visible format
      toast({
        title: title,
        description: content,
        variant: notifType === "warning" ? "destructive" : "default",
        duration: notifType === "warning" ? 10000 : 7000, // Warnings stay longer
        className:
          notifType === "warning"
            ? "text-lg font-bold border-2 border-red-500"
            : "text-lg font-semibold",
      });

      // Add to recent notifications list (max 10 items)
      setRecentNotifications((prev) => {
        console.log("📋 [PARENT DASH] Adding notification to recent list:", {
          maThongBao: data.maThongBao,
          loaiThongBao: data.loaiThongBao,
          tieuDe: data.tieuDe,
          title: title,
          calculatedType: notifType,
        });

        const newNotif = {
          id: data.maThongBao || Date.now(), // ← FIX: Thêm ID từ payload
          type: notifType,
          title: title,
          time: "Vừa xong",
          timestamp: Date.now(),
        };
        const updated = [newNotif, ...prev].slice(0, 10);
        console.log(
          "✅ [PARENT DASH] Updated recent notifications:",
          updated.length,
          updated
        );
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
              let displayStatus: "waiting" | "on-bus" | "picked-up" | "absent" =
                "waiting";

              // 🔥 FIX: Phân biệt trạng thái dựa vào trip status
              if (studentStatus === "da_don") {
                // Nếu trip đã hoàn thành → "Đã đến nơi"
                if (
                  tripStatus === "hoan_thanh" ||
                  tripStatus === "da_hoan_thanh"
                ) {
                  displayStatus = "picked-up";
                } else {
                  // Trip đang chạy → "Đang trên xe"
                  displayStatus = "on-bus";
                }
              } else if (studentStatus === "da_tra") {
                displayStatus = "picked-up"; // Đã trả = Đã đến nơi
              } else if (studentStatus === "vang") {
                displayStatus = "absent";
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
              let displayStatus: "waiting" | "on-bus" | "picked-up" | "absent" =
                "waiting";

              // 🔥 FIX: Phân biệt trạng thái dựa vào trip status
              if (studentStatus === "da_don") {
                // Nếu trip đã hoàn thành → "Đã đến nơi"
                if (
                  tripStatus === "hoan_thanh" ||
                  tripStatus === "da_hoan_thanh"
                ) {
                  displayStatus = "picked-up";
                } else {
                  // Trip đang chạy → "Đang trên xe"
                  displayStatus = "on-bus";
                }
              } else if (studentStatus === "da_tra") {
                displayStatus = "picked-up"; // Đã trả = Đã đến nơi
              } else if (studentStatus === "vang") {
                displayStatus = "absent";
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
          id: data.id || Date.now(), // ← FIX: Thêm ID
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

  // 🔥 NEW: Listen for trip_status_update to update current stop index
  useEffect(() => {
    const handleTripStatusUpdate = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const data = customEvent.detail;
      console.log("[Parent] trip_status_update received:", data);

      // Update trip status
      if (data.trangThai || data.status) {
        const status = data.trangThai || data.status;
        setTripStatus(status);
        console.log("[Parent] Updated tripStatus:", status);

        // 🔥 NEW: Update morning/afternoon trip status based on trip type
        const tripType = data.loaiChuyen || data.tripType;
        if (tripType === "don_sang") {
          setMorningTripStatus(status);
          console.log("[Parent] Updated morningTripStatus:", status);
        } else if (tripType === "tra_chieu") {
          setAfternoonTripStatus(status);
          console.log("[Parent] Updated afternoonTripStatus:", status);
        }

        // 🔥 FIX: Reload trip detail when trip starts to get driver info
        if (status === "dang_chay" && data.maChuyen) {
          try {
            console.log(
              "[Parent] Trip started, reloading trip detail for driver info..."
            );
            const tripDetailRes = await apiClient.getTripById(data.maChuyen);
            const tripDetailData: any =
              (tripDetailRes as any)?.data || tripDetailRes;
            const tripDetail = tripDetailData?.data || tripDetailData;

            // Update driver info
            let driverName = "Chưa phân công";
            let driverPhone = "—";

            if (tripDetail?.driverInfo) {
              const driver = tripDetail.driverInfo;
              driverName = driver.hoTen || driver.tenTaiXe || driverName;
              driverPhone = driver.soDienThoai || driverPhone;
              console.log(
                "[Parent] ✅ Updated driver info from trip_status_update:",
                {
                  driverName,
                  driverPhone,
                }
              );
            } else if (tripDetail?.driver || tripDetail?.taiXe) {
              const driver = tripDetail.driver || tripDetail.taiXe;
              driverName = driver.hoTen || driver.name || driverName;
              driverPhone = driver.soDienThoai || driver.phone || driverPhone;
            }

            // Update childInfo with new driver info
            setChildInfo((prev) => {
              if (!prev) return prev; // Skip if childInfo not initialized yet
              return {
                ...prev,
                driverName,
                driverPhone,
              };
            });
          } catch (error) {
            console.error("[Parent] Failed to reload trip detail:", error);
          }
        }
      }

      // Update current stop index if provided
      // 🔥 FIX: Clear dynamicDirections ngay và reset debounce timer khi currentStopIndex thay đổi từ socket event
      // Để đảm bảo tuyến đường được cập nhật ngay lập tức (giống chuyến đi)
      if (typeof data.currentStop === "number") {
        setCurrentStopIndex((prev) => {
          if (prev !== data.currentStop) {
            console.log(
              "[Parent] ✅ Updated currentStopIndex from tripStatusUpdate:",
              prev,
              "→",
              data.currentStop,
              "(tripId:",
              data.tripId || data.maChuyen,
              ")"
            );
            // 🔥 FIX: Clear dynamicDirections ngay lập tức để đảm bảo tuyến đường mới được fetch
            setDynamicDirections(null);
            // Reset debounce timer để cho phép fetch tuyến đường ngay lập tức
            (window as any).__lastParentDirectionsFetch = 0;
            // Reset last currentStopIndex để trigger clear dynamicDirections trong useEffect
            (window as any).__lastParentCurrentStopIndex = prev;
            return data.currentStop;
          }
          return prev;
        });
      } else if (typeof data.diemHienTai === "number") {
        setCurrentStopIndex((prev) => {
          if (prev !== data.diemHienTai) {
            console.log(
              "[Parent] ✅ Updated currentStopIndex from diemHienTai (tripStatusUpdate):",
              prev,
              "→",
              data.diemHienTai,
              "(tripId:",
              data.tripId || data.maChuyen,
              ")"
            );
            // 🔥 FIX: Clear dynamicDirections ngay lập tức để đảm bảo tuyến đường mới được fetch
            setDynamicDirections(null);
            // Reset debounce timer để cho phép fetch tuyến đường ngay lập tức
            (window as any).__lastParentDirectionsFetch = 0;
            // Reset last currentStopIndex để trigger clear dynamicDirections trong useEffect
            (window as any).__lastParentCurrentStopIndex = prev;
            return data.diemHienTai;
          }
          return prev;
        });
      }
    };

    window.addEventListener("tripStatusUpdate", handleTripStatusUpdate);

    return () => {
      window.removeEventListener("tripStatusUpdate", handleTripStatusUpdate);
    };
  }, []);

  // M5: Listen for trip_completed
  useEffect(() => {
    const handleTripCompleted = (event: Event) => {
      const customEvent = event as CustomEvent;
      const data = customEvent.detail;
      console.log("[Parent M5] trip_completed received:", data);

      // 🔥 FIX: Set trip status to completed to stop bus position tracking
      setTripStatus("hoan_thanh");
      console.log("[Parent] Trip completed, setting tripStatus to hoan_thanh");

      // 🔥 NEW: Update morning/afternoon trip status based on trip type
      const tripType = data.loaiChuyen || data.tripType;
      if (tripType === "don_sang") {
        setMorningTripStatus("hoan_thanh");
        console.log("[Parent] Morning trip completed");
      } else if (tripType === "tra_chieu") {
        setAfternoonTripStatus("hoan_thanh");
        console.log("[Parent] Afternoon trip completed");
      }

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
            let displayStatus: "waiting" | "on-bus" | "picked-up" | "absent" =
              "waiting";

            if (studentStatus === "da_don") {
              // Nếu trip đã hoàn thành → "Đã đến nơi"
              if (
                tripStatus === "hoan_thanh" ||
                tripStatus === "da_hoan_thanh"
              ) {
                displayStatus = "picked-up";
              } else {
                // Trip đang chạy → "Đang trên xe"
                displayStatus = "on-bus";
              }
            } else if (studentStatus === "da_tra") {
              displayStatus = "picked-up"; // Đã trả = Đã đến nơi
            } else if (studentStatus === "vang") {
              displayStatus = "absent";
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
          console.warn(
            "[Parent M5] Failed to reload child info after trip_completed:",
            e
          );
        });

      // Reload notifications từ DB
      apiClient
        .getNotifications({ limit: 10 })
        .then((res: any) => {
          const notifications = Array.isArray(res?.data) ? res.data : [];
          if (notifications.length > 0) {
            const mapped = notifications.map((n: any) => ({
              id: n.maThongBao, // ← FIX: Thêm ID để tránh duplicate trong React
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

    window.addEventListener("tripCompleted", handleTripCompleted);

    return () => {
      window.removeEventListener("tripCompleted", handleTripCompleted);
    };
  }, [toast, busInfo, delayAlert]);

  // Note: Removed initial fetching of students/routes to avoid 401/404 when not needed.

  // 🔥 NEW: Fetch trip detail when selectedTripId changes to initialize currentStopIndex and tripStatus
  useEffect(() => {
    if (!selectedTripId) {
      return;
    }

    // Fetch trip detail immediately when selectedTripId changes
    async function fetchTripDetail() {
      if (!selectedTripId) {
        return;
      }
      try {
        console.log(
          "[Parent] Fetching trip detail for initialization:",
          selectedTripId
        );
        const tripRes = await apiClient.getTripById(selectedTripId);
        console.log("[Parent] 🔍 Raw API response:", tripRes);
        const tripData: any = (tripRes as any).data || tripRes;
        console.log("[Parent] 🔍 Parsed tripData:", tripData);
        const tripDetail = tripData?.data || tripData;
        console.log("[Parent] 🔍 Parsed tripDetail:", tripDetail);

        if (tripDetail) {
          // 🔥 FIX: Access trip object from response structure
          // Backend returns: { success: true, data: { trip: {...}, schedule: {...}, ... } }
          const trip = tripDetail.trip || tripDetail;
          console.log("[Parent] 🔍 Extracted trip object:", trip);
          console.log("[Parent] 🔍 trip.currentStop:", trip?.currentStop);
          console.log("[Parent] 🔍 trip.diemHienTai:", trip?.diemHienTai);

          // Update trip status
          if (trip?.trangThai || tripDetail?.trangThai || tripDetail?.status) {
            const status =
              trip?.trangThai || tripDetail.trangThai || tripDetail.status;
            setTripStatus(status);
            console.log("[Parent] ✅ Initialized tripStatus:", status);
          }

          // Update current stop index from trip data
          // 🔥 FIX: Convert sequence number (1-based) to array index (0-based) ngay khi load từ database
          // Giống hệt driver page để đảm bảo consistency
          const dbCurrentStopSequence = trip?.currentStop || trip?.diemHienTai;

          if (
            typeof dbCurrentStopSequence === "number" &&
            dbCurrentStopSequence > 0
          ) {
            // 🔥 FIX: Cần đợi stops array được load để convert đúng
            // Nếu stops chưa load, sẽ convert lại trong useEffect khi stops thay đổi
            // Tạm thời lưu sequence number, sẽ convert trong useEffect
            setCurrentStopIndex((prev) => {
              if (prev !== dbCurrentStopSequence) {
                console.log(
                  "[Parent] ✅ Initialized currentStopIndex (sequence) from database:",
                  prev,
                  "→",
                  dbCurrentStopSequence
                );
                // Reset debounce timer để cho phép fetch tuyến đường ngay lập tức
                (window as any).__lastParentDirectionsFetch = 0;
                // Reset last currentStopIndex để trigger clear dynamicDirections trong useEffect
                (window as any).__lastParentCurrentStopIndex = prev;
                return dbCurrentStopSequence;
              }
              return prev;
            });
          } else {
            console.warn(
              "[Parent] ⚠️ No currentStop or diemHienTai in trip detail:",
              { trip, tripDetail }
            );
          }
        }
      } catch (error) {
        console.warn(
          "[Parent] Failed to fetch trip detail for initialization:",
          error
        );
      }
    }

    fetchTripDetail();
  }, [selectedTripId]);

  // 🔥 NEW: Periodically fetch trip detail to update currentStopIndex when trip is running
  useEffect(() => {
    if (!selectedTripId || tripStatus !== "dang_chay") {
      return;
    }

    // 🔥 FIX: Fetch trip detail every 3 seconds (giảm từ 10s) để cập nhật currentStopIndex nhanh hơn
    const interval = setInterval(async () => {
      try {
        const tripRes = await apiClient.getTripById(selectedTripId);
        const tripData: any = (tripRes as any).data || tripRes;
        const tripDetail = tripData?.data || tripData;

        if (tripDetail) {
          // 🔥 FIX: Access trip object from response structure
          const trip = tripDetail.trip || tripDetail;

          // Update current stop index from trip data
          // 🔥 FIX: Reset debounce timer khi currentStopIndex thay đổi từ periodic fetch
          // 🔥 QUAN TRỌNG: Luôn ưu tiên diemHienTai từ database để đảm bảo cập nhật đúng
          const dbCurrentStopSequence = trip?.currentStop || trip?.diemHienTai;

          if (
            typeof dbCurrentStopSequence === "number" &&
            dbCurrentStopSequence > 0
          ) {
            setCurrentStopIndex((prev) => {
              if (prev !== dbCurrentStopSequence) {
                console.log(
                  "[Parent] ✅ Updated currentStopIndex from periodic fetch (diemHienTai):",
                  prev,
                  "→",
                  dbCurrentStopSequence,
                  "(tripId:",
                  selectedTripId,
                  ")"
                );
                // 🔥 FIX: Clear dynamicDirections ngay lập tức để đảm bảo tuyến đường mới được fetch
                setDynamicDirections(null);
                // Reset debounce timer để cho phép fetch tuyến đường ngay lập tức
                (window as any).__lastParentDirectionsFetch = 0;
                // Reset last currentStopIndex để trigger clear dynamicDirections trong useEffect
                (window as any).__lastParentCurrentStopIndex = prev;
                return dbCurrentStopSequence;
              }
              return prev;
            });
          } else {
            console.warn(
              "[Parent] ⚠️ No currentStop or diemHienTai in periodic fetch:",
              { trip, tripDetail }
            );
          }
        }
      } catch (error) {
        console.warn(
          "[Parent] Failed to fetch trip detail for currentStopIndex:",
          error
        );
      }
    }, 3000); // 🔥 FIX: Fetch every 3 seconds (giảm từ 10s) để cập nhật nhanh hơn

    return () => clearInterval(interval);
  }, [selectedTripId, tripStatus]);

  // 🔥 NEW: Track last GPS position to detect significant changes
  const lastGpsLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const prevBannerRef = useRef<{ type: string; description?: string } | null>(
    null
  );

  // Calculate distance between two GPS points (Haversine formula)
  function getDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  // 🔥 NEW: Fetch dynamic directions from bus position to next stop
  // 🔥 FIX: Làm giống hệt bên tài xế - dùng currentStopIndex để slice stops
  useEffect(() => {
    console.log("[Parent] 🔍 Dynamic directions useEffect triggered:", {
      hasBusLocation: !!busLocation,
      busLocation,
      stopsCount: stops?.length || 0,
      currentStopIndex,
      tripStatus,
      selectedTripId,
      stopsSequences:
        stops?.map((s, i) => ({
          index: i,
          sequence: s.sequence,
          label: s.label,
        })) || [],
    });

    // Need bus location and at least one remaining stop
    if (!busLocation || !stops || stops.length === 0) {
      console.log("[Parent] ❌ Skipping dynamic directions - missing data", {
        hasBusLocation: !!busLocation,
        hasStops: !!stops,
        stopsLength: stops?.length || 0,
      });
      return;
    }

    // 🔥 FIX: Validate stops array has sequence property
    const stopsWithSequence = stops.filter(
      (s) => typeof s.sequence === "number"
    );
    if (stopsWithSequence.length === 0) {
      console.warn(
        "[Parent] ⚠️ No stops with sequence property, cannot calculate route"
      );
      return;
    }

    if (stopsWithSequence.length !== stops.length) {
      console.warn(
        `[Parent] ⚠️ Some stops missing sequence: ${stopsWithSequence.length}/${stops.length} have sequence`
      );
    }

    // 🔥 FIX: Chỉ tính tuyến đường khi trip đang chạy (nhưng không chặn nếu tripStatus chưa được set)
    // Cho phép tính tuyến đường nếu tripStatus là null/undefined hoặc "dang_chay"
    if (tripStatus && tripStatus !== "dang_chay") {
      console.log("[Parent] ❌ Skipping - trip not running:", tripStatus);
      return;
    }

    // Validate bus coordinates
    if (
      !Number.isFinite(busLocation.lat) ||
      !Number.isFinite(busLocation.lng)
    ) {
      console.log("[Parent] ❌ Invalid bus coordinates");
      return;
    }

    // 🔥 FIX: Kiểm tra xem currentStopIndex có thay đổi không TRƯỚC TIÊN
    // Nếu currentStopIndex thay đổi (tài xế rời điểm dừng), cần clear và fetch lại tuyến đường ngay lập tức
    const lastCurrentStopIndexRef = (window as any)
      .__lastParentCurrentStopIndex;
    const currentStopIndexChanged =
      lastCurrentStopIndexRef === undefined ||
      lastCurrentStopIndexRef !== currentStopIndex;

    // 🔥 FIX: Clear dynamicDirections ngay khi currentStopIndex thay đổi (TRƯỚC khi check debounce)
    if (currentStopIndexChanged) {
      console.log(
        `[Parent] 🔄 Current stop index changed from ${lastCurrentStopIndexRef} to ${currentStopIndex}, clearing old route immediately`
      );
      // Clear dynamicDirections cũ ngay lập tức để đảm bảo tuyến đường mới được hiển thị
      setDynamicDirections(null);
      // Reset debounce timer để cho phép fetch ngay
      (window as any).__lastParentDirectionsFetch = 0;
      // Lưu currentStopIndex mới ngay lập tức
      (window as any).__lastParentCurrentStopIndex = currentStopIndex;
    }

    // 🔥 FIX: Kiểm tra xem GPS có thay đổi đáng kể không (> 50m)
    const shouldUpdateImmediately =
      !lastGpsLocationRef.current ||
      getDistance(
        busLocation.lat,
        busLocation.lng,
        lastGpsLocationRef.current.lat,
        lastGpsLocationRef.current.lng
      ) > 50; // Cập nhật ngay nếu di chuyển > 50m

    // Debounce: giảm từ 10s xuống 2s để responsive hơn
    // Nhưng nếu GPS thay đổi đáng kể (> 50m) hoặc currentStopIndex thay đổi, cập nhật ngay lập tức
    const lastFetch = (window as any).__lastParentDirectionsFetch || 0;
    const now = Date.now();
    const debounceTime =
      shouldUpdateImmediately || currentStopIndexChanged ? 0 : 2000; // 0ms nếu GPS thay đổi đáng kể hoặc currentStopIndex thay đổi, 2s nếu không

    if (now - lastFetch < debounceTime) {
      console.log(
        `[Parent] ⏳ Skipping - fetched recently (${Math.ceil(
          (debounceTime - (now - lastFetch)) / 1000
        )}s ago)`
      );
      return;
    }

    // Lưu currentStopIndex hiện tại để so sánh lần sau (nếu chưa lưu ở trên)
    if (!currentStopIndexChanged) {
      (window as any).__lastParentCurrentStopIndex = currentStopIndex;
    }

    // Cập nhật vị trí GPS đã dùng
    lastGpsLocationRef.current = {
      lat: busLocation.lat,
      lng: busLocation.lng,
    };
    (window as any).__lastParentDirectionsFetch = now;

    // 🔥 FIX: Tính tuyến đường từ GPS đến các điểm dừng CÒN LẠI (giống hệt bên tài xế)
    // currentStopIndex từ backend là sequence number (1, 2, 3...), không phải array index (0, 1, 2...)
    // Cần convert sequence number thành array index
    // 🔥 QUAN TRỌNG: diemHienTai = sequence của điểm TIẾP THEO sau khi rời điểm hiện tại
    // Ví dụ: Rời điểm 1 → diemHienTai = 2 (điểm tiếp theo)
    // Vậy cần slice từ điểm có sequence = diemHienTai

    // 🔥 FIX: Đảm bảo stops array được sort đúng trước khi convert
    // Chỉ dùng stops có sequence property để đảm bảo tính toán đúng
    const sortedStops = [...stopsWithSequence].sort(
      (a, b) => (a.sequence || 0) - (b.sequence || 0)
    );

    // 🔥 FIX: Validate sortedStops có đủ stops
    if (sortedStops.length === 0) {
      console.warn(
        "[Parent] ⚠️ No stops after sorting, cannot calculate route"
      );
      return;
    }

    // 🔥 FIX: Log thông tin để debug
    console.log("[Parent] 🔍 Calculating route with:", {
      currentStopIndex, // Sequence number từ database
      sortedStopsCount: sortedStops.length,
      sortedStopsSequences: sortedStops.map((s, i) => ({
        index: i,
        sequence: s.sequence,
        label: s.label,
      })),
    });

    let actualCurrentStop = 0;
    if (currentStopIndex > 0) {
      // Tìm index của stop có sequence = currentStopIndex trong sortedStops
      const stopIndex = sortedStops.findIndex(
        (s) => (s.sequence || 0) === currentStopIndex
      );
      if (stopIndex >= 0) {
        actualCurrentStop = stopIndex;
        console.log(
          `[Parent] ✅ Found stop with sequence ${currentStopIndex} at array index ${stopIndex} (${
            sortedStops[stopIndex]?.label || sortedStops[stopIndex]?.id
          })`
        );
      } else {
        // 🔥 FIX: Fallback logic - tìm stop gần nhất với currentStopIndex
        // Nếu không tìm thấy exact match, tìm stop có sequence gần nhất nhưng <= currentStopIndex
        const nearestStopIndex = sortedStops.findLastIndex(
          (s) => (s.sequence || 0) <= currentStopIndex
        );
        if (nearestStopIndex >= 0) {
          actualCurrentStop = nearestStopIndex;
          console.warn(
            `[Parent] ⚠️ Stop with sequence ${currentStopIndex} not found, using nearest stop at array index ${nearestStopIndex} (sequence: ${sortedStops[nearestStopIndex]?.sequence})`
          );
        } else {
          // Nếu không tìm thấy stop nào có sequence <= currentStopIndex, bắt đầu từ đầu
          actualCurrentStop = 0;
          console.warn(
            `[Parent] ⚠️ Stop with sequence ${currentStopIndex} not found and no nearest stop, starting from first stop`,
            {
              stopsSequences: sortedStops.map((s, i) => ({
                index: i,
                sequence: s.sequence,
                label: s.label,
              })),
              currentStopIndex,
            }
          );
        }
      }
    } else {
      console.log(
        `[Parent] ℹ️ currentStopIndex is ${currentStopIndex}, starting from first stop`
      );
    }

    // Lấy các điểm dừng CÒN LẠI (từ điểm tiếp theo đến điểm cuối)
    // Nếu chưa rời điểm dừng 1 (actualCurrentStop = 0): GPS → điểm 1 → điểm 2 → ... → điểm cuối
    // Nếu đã rời điểm dừng 1 (actualCurrentStop > 0): GPS → điểm tiếp theo → ... → điểm cuối
    const remainingStops = sortedStops.slice(actualCurrentStop);

    console.log("[Parent] 🔍 DEBUG - Route calculation:", {
      currentStopIndex, // Sequence number from backend
      actualCurrentStop, // Array index after conversion
      totalStops: sortedStops.length,
      remainingStopsCount: remainingStops.length,
      allStops: sortedStops.map((s, i) => ({
        index: i,
        sequence: s.sequence,
        id: s.id,
        label: s.label,
        isIncluded: i >= actualCurrentStop,
      })),
      remainingStops: remainingStops.map((s) => ({
        sequence: s.sequence,
        id: s.id,
        label: s.label,
      })),
    });

    if (remainingStops.length === 0) {
      console.log("[Parent] ❌ No remaining stops", {
        currentStopIndex, // Sequence number
        actualCurrentStop, // Array index
        stopsLength: sortedStops.length,
        sortedStops: sortedStops.map((s, i) => ({
          index: i,
          sequence: s.sequence,
          label: s.label,
        })),
      });
      setDynamicDirections(null);
      return;
    }

    // 🔥 FIX: Logic clear dynamicDirections đã được di chuyển lên trên (trước debounce check)
    // Để đảm bảo khi currentStopIndex thay đổi, tuyến đường được clear ngay và fetch lại ngay lập tức

    console.log("[Parent] ✅ Calculating route:", {
      currentStopIndex,
      actualCurrentStop,
      totalStops: sortedStops.length,
      remainingStopsCount: remainingStops.length,
      firstRemainingStop: remainingStops[0]?.label || remainingStops[0]?.id,
      firstRemainingStopSequence: remainingStops[0]?.sequence,
      firstRemainingStopCoords: {
        lat: remainingStops[0]?.lat,
        lng: remainingStops[0]?.lng,
      },
      routeOrder: remainingStops
        .map((s, i) => `${i + 1}. ${s.label || s.id} (seq: ${s.sequence})`)
        .join(" → "),
    });

    const firstRemainingStop = remainingStops[0];
    const firstRemainingStopLat = Number(firstRemainingStop.lat);
    const firstRemainingStopLng = Number(firstRemainingStop.lng);

    if (
      !Number.isFinite(firstRemainingStopLat) ||
      !Number.isFinite(firstRemainingStopLng)
    ) {
      console.warn("[Parent] Invalid first remaining stop coords");
      return;
    }

    // Nếu chỉ có 1 điểm dừng còn lại, tính trực tiếp từ GPS đến điểm đó
    if (remainingStops.length === 1) {
      console.log(
        `[Parent] 🗺️ Fetching route: GPS → Next stop (${firstRemainingStopLat},${firstRemainingStopLng})`
      );
      apiClient
        .getDirections({
          origin: `${busLocation.lat},${busLocation.lng}`,
          destination: `${firstRemainingStopLat},${firstRemainingStopLng}`,
          mode: "driving",
          vehicleType: "bus",
          _t: Date.now(),
        } as any)
        .then((response: any) => {
          const polyline =
            response?.data?.polyline ||
            response?.polyline ||
            response?.routes?.[0]?.overview_polyline?.points;
          if (polyline && typeof polyline === "string") {
            setDynamicDirections(polyline);
          } else {
            setDynamicDirections(null);
          }
        })
        .catch((err: any) => {
          console.warn("[Parent] Dynamic directions failed:", err);
          setDynamicDirections(null);
        });
      return;
    }

    // Nếu có nhiều điểm dừng còn lại: GPS → Điểm tiếp theo → Điểm 2 → ... → Điểm cuối
    const waypoints = remainingStops
      .slice(1, -1) // Tất cả điểm dừng trừ điểm đầu và điểm cuối
      .map((stop) => {
        const lat = Number(stop.lat);
        const lng = Number(stop.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          console.warn("[Parent] Invalid waypoint coords:", stop);
          return null;
        }
        return { location: `${lat},${lng}` };
      })
      .filter(Boolean) as Array<{ location: string }>;

    const lastStop = remainingStops[remainingStops.length - 1];
    const destinationLat = Number(lastStop.lat);
    const destinationLng = Number(lastStop.lng);

    if (!Number.isFinite(destinationLat) || !Number.isFinite(destinationLng)) {
      console.warn("[Parent] Invalid destination coords");
      return;
    }

    console.log(
      `[Parent] 🗺️ Fetching route: GPS (${busLocation.lat},${busLocation.lng}) → Next stop (${firstRemainingStopLat},${firstRemainingStopLng}) → ${waypoints.length} waypoint(s) → Final stop (${destinationLat},${destinationLng})`
    );

    // 🔥 FIX: Tính tuyến từ GPS → Điểm tiếp theo → các điểm tiếp theo → điểm cuối
    // Nếu đã rời điểm dừng 1, không còn chỉ đến điểm dừng 1 nữa
    apiClient
      .getDirections({
        origin: `${busLocation.lat},${busLocation.lng}`,
        destination: `${destinationLat},${destinationLng}`,
        waypoints:
          waypoints.length > 0
            ? [
                {
                  location: `${firstRemainingStopLat},${firstRemainingStopLng}`,
                },
                ...waypoints,
              ]
            : [
                {
                  location: `${firstRemainingStopLat},${firstRemainingStopLng}`,
                },
              ],
        mode: "driving",
        vehicleType: "bus",
        _t: Date.now(), // Force bypass cache when GPS changes
      } as any) // Cast to any to allow cache buster
      .then((response: any) => {
        const polyline =
          response?.data?.polyline ||
          response?.polyline ||
          response?.routes?.[0]?.overview_polyline?.points;
        if (polyline && typeof polyline === "string") {
          console.log(
            `[Parent] ✅ Got dynamic directions: ${polyline.substring(
              0,
              50
            )}...`
          );
          setDynamicDirections(polyline);
        } else {
          console.warn("[Parent] No polyline in directions response");
          setDynamicDirections(null);
        }
      })
      .catch((err: any) => {
        console.warn("[Parent] Dynamic directions failed:", err);
        setDynamicDirections(null);
      });
  }, [busLocation, currentStopIndex, stops, tripStatus]); // 🔥 FIX: Add tripStatus to dependencies

  // 🔥 NEW: Validate và reset currentStopIndex khi stops thay đổi (đảm bảo tính toán đúng khi refresh)
  useEffect(() => {
    if (!stops || stops.length === 0 || currentStopIndex === 0) {
      return;
    }

    // Đảm bảo stops có sequence property
    const stopsWithSequence = stops.filter(
      (s) => typeof s.sequence === "number"
    );
    if (stopsWithSequence.length === 0) {
      return;
    }

    // Sort stops để đảm bảo thứ tự đúng
    const sortedStops = [...stopsWithSequence].sort(
      (a, b) => (a.sequence || 0) - (b.sequence || 0)
    );

    // Kiểm tra xem currentStopIndex có match với bất kỳ stop nào không
    const stopIndex = sortedStops.findIndex(
      (s) => (s.sequence || 0) === currentStopIndex
    );

    if (stopIndex < 0) {
      // Nếu không tìm thấy, tìm stop gần nhất
      const nearestStopIndex = sortedStops.findLastIndex(
        (s) => (s.sequence || 0) <= currentStopIndex
      );
      if (nearestStopIndex >= 0) {
        const nearestSequence = sortedStops[nearestStopIndex]?.sequence;
        if (nearestSequence && nearestSequence !== currentStopIndex) {
          console.warn(
            `[Parent] ⚠️ currentStopIndex ${currentStopIndex} không match với stops, cập nhật về ${nearestSequence}`
          );
          setCurrentStopIndex(nearestSequence);
          // Reset debounce timer để fetch lại tuyến đường
          (window as any).__lastParentDirectionsFetch = 0;
          (window as any).__lastParentCurrentStopIndex = currentStopIndex;
        }
      } else {
        // Nếu không tìm thấy stop nào, reset về 0
        console.warn(
          `[Parent] ⚠️ currentStopIndex ${currentStopIndex} không hợp lệ, reset về 0`
        );
        setCurrentStopIndex(0);
        // Reset debounce timer để fetch lại tuyến đường
        (window as any).__lastParentDirectionsFetch = 0;
        (window as any).__lastParentCurrentStopIndex = 0;
      }
    }
  }, [stops, currentStopIndex]);

  // When route changes or student changes, load stops for that route
  useEffect(() => {
    async function loadStops(routeId?: number) {
      if (!routeId) {
        console.log("[Parent] loadStops skipped: No routeId");
        return;
      }
      console.log(
        "[Parent] loadStops calling API for route:",
        routeId,
        "trip:",
        selectedTripId
      );

      let polyline: string | null = null;
      let points: any[] = [];

      // 1. Try to get detailed polyline from Trip API if trip is selected
      if (selectedTripId) {
        try {
          // Note: We intentionally skip fetching polyline from backend here
          // because the backend often returns a simplified straight-line polyline.
          // By leaving polyline as null, we force SSBMap to auto-fetch detailed
          // directions from Google Maps API based on the stops.

          /* 
          const tripRes = await apiClient.getTripById(selectedTripId);
          const resBody: any = (tripRes as any).data || tripRes;
          
          if (resBody?.success && resBody?.data?.routeInfo?.polyline) {
             polyline = resBody.data.routeInfo.polyline;
          } else if (resBody?.data?.polyline) {
             polyline = resBody.data.polyline;
          }
          */
          console.log(
            "[Parent] Skipped backend polyline to force Google Maps Directions"
          );
        } catch (e) {
          console.warn("[Parent] Failed to fetch trip polyline:", e);
        }
      }

      // 2. Load stops (and fallback polyline) from Route API
      try {
        const routeRes = await apiClient.getRouteById(routeId);
        const routeData: any = (routeRes as any).data || routeRes;

        // If trip didn't provide polyline, use route polyline (might be less detailed)
        if (!polyline) {
          // Also skip route polyline fallback for the same reason
          // polyline = routeData?.polyline || routeData?.route?.polyline || null;
          console.log("[Parent] Skipped route polyline fallback");
        }

        console.log("[Parent] Final polyline to render:", {
          hasPolyline: !!polyline,
          length: (polyline as string | null)?.length || 0,
        });

        setRoutePolyline(polyline);

        points = routeData?.diemDung || routeData?.route?.diemDung || [];
        const mapped = points.map((s: any) => ({
          id: (s.maDiem || s.id || `${s.viDo}_${s.kinhDo}`) + "",
          lat: Number(s.viDo || s.lat || s.latitude),
          lng: Number(s.kinhDo || s.lng || s.longitude),
          label: s.tenDiem || s.ten,
          sequence: s.thuTu || s.sequence || 0, // Map sequence for correct ordering
        }));
        // 🔥 FIX: Sort by sequence to ensure correct order (CRITICAL for route calculation)
        mapped.sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0));

        const filteredAndSorted = mapped.filter(
          (p: any) => Number.isFinite(p.lat) && Number.isFinite(p.lng)
        );

        // 🔥 FIX: Đảm bảo stops được sort đúng và có sequence property
        console.log("[Parent] 🔍 Setting stops array:", {
          count: filteredAndSorted.length,
          stops: filteredAndSorted.map((s, i) => ({
            index: i,
            sequence: s.sequence,
            label: s.label,
            id: s.id,
          })),
        });

        setStops(filteredAndSorted);
      } catch (e) {
        console.warn("[Parent] loadStops failed", e);
      }
    }
    loadStops(selectedRouteId);
  }, [selectedRouteId, selectedTripId]);

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
          let displayStatus: "waiting" | "on-bus" | "picked-up" | "absent" =
            "waiting";

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
          let driverName = tripInfo.tenTaiXe || "Chưa phân công"; // Default from schedule
          let driverPhone = tripInfo.sdtTaiXe || "—"; // Default from schedule

          // 🔥 FIX: Load both morning and afternoon trip statuses
          // 🔥 FIX: Lấy trip status trực tiếp từ schedule thay vì query API
          // Vì schedule đã có đầy đủ thông tin về các chuyến đi của học sinh
          try {
            // Set trip status từ schedule hiện tại
            if (tripInfo.trangThai && tripInfo.loaiChuyen) {
              console.log(
                `[Parent] ✅ Setting trip status from schedule: ${tripInfo.loaiChuyen} = ${tripInfo.trangThai}`
              );

              if (tripInfo.loaiChuyen === "don_sang") {
                setMorningTripStatus(tripInfo.trangThai);
              } else if (tripInfo.loaiChuyen === "tra_chieu") {
                setAfternoonTripStatus(tripInfo.trangThai);
              }
            }

            // Nếu có 2 chuyến (sáng + chiều), cần load chuyến còn lại
            if (tripInfo.maChuyen) {
              try {
                const today = new Date().toISOString().split("T")[0];
                const tripsRes = await apiClient.getTrips({ ngayChay: today });
                const allTrips = Array.isArray((tripsRes as any)?.data)
                  ? (tripsRes as any).data
                  : [];

                console.log(
                  `[Parent] Checking ${allTrips.length} trips for other trip type`
                );

                // Tìm chuyến đi còn lại (nếu schedule là sáng thì tìm chiều, và ngược lại)
                for (const trip of allTrips) {
                  const tripType = trip.schedule?.loaiChuyen || trip.loaiChuyen;
                  const status = trip.trangThai || trip.status;

                  // Chỉ set trip type khác với trip hiện tại
                  if (
                    tripType === "don_sang" &&
                    tripInfo.loaiChuyen !== "don_sang"
                  ) {
                    setMorningTripStatus(status);
                    console.log(
                      `[Parent] ✅ Set morning trip status: ${status}`
                    );
                  } else if (
                    tripType === "tra_chieu" &&
                    tripInfo.loaiChuyen !== "tra_chieu"
                  ) {
                    setAfternoonTripStatus(status);
                    console.log(
                      `[Parent] ✅ Set afternoon trip status: ${status}`
                    );
                  }
                }
              } catch (err) {
                console.warn(
                  "[Parent] Failed to load trips for other type:",
                  err
                );
              }
            }
          } catch (err) {
            console.warn("[Parent] Failed to load trip statuses:", err);
          }

          if (tripInfo.maChuyen) {
            try {
              const tripDetailRes = await apiClient.getTripById(
                tripInfo.maChuyen
              );
              const tripDetail: any =
                (tripDetailRes as any)?.data || tripDetailRes;

              // 🔥 FIX: Update trip status from trip detail (override schedule status)
              if (tripDetail?.trangThai || tripDetail?.status) {
                const status = tripDetail.trangThai || tripDetail.status;
                setTripStatus(status);
                console.log("[Parent] Set tripStatus from trip:", status);

                // 🔥 FIX: Override morning/afternoon status from schedule with actual trip status
                const tripType =
                  tripDetail?.schedule?.loaiChuyen || tripInfo.loaiChuyen;
                if (tripType === "don_sang") {
                  setMorningTripStatus(status);
                  console.log(
                    "[Parent] ✅ Override morningTripStatus from trip detail:",
                    status
                  );
                } else if (tripType === "tra_chieu") {
                  setAfternoonTripStatus(status);
                  console.log(
                    "[Parent] ✅ Override afternoonTripStatus from trip detail:",
                    status
                  );
                }
              }

              // 🔥 NEW: Update current stop index from trip data
              // 🔥 FIX: Access trip object from response structure
              const trip = tripDetail.trip || tripDetail;
              if (typeof trip?.currentStop === "number") {
                setCurrentStopIndex((prev) => {
                  if (prev !== trip.currentStop) {
                    console.log(
                      "[Parent] ✅ Set currentStopIndex from trip:",
                      prev,
                      "→",
                      trip.currentStop
                    );
                    return trip.currentStop;
                  }
                  return prev;
                });
              } else if (typeof trip?.diemHienTai === "number") {
                setCurrentStopIndex((prev) => {
                  if (prev !== trip.diemHienTai) {
                    console.log(
                      "[Parent] ✅ Set currentStopIndex from diemHienTai:",
                      prev,
                      "→",
                      trip.diemHienTai
                    );
                    return trip.diemHienTai;
                  }
                  return prev;
                });
              }

              // Fallback: Set route ID from trip detail if not already set
              if (tripDetail?.maTuyen || tripDetail?.routeId) {
                const rid = Number(tripDetail.maTuyen || tripDetail.routeId);
                if (Number.isFinite(rid)) {
                  setSelectedRouteId((prev) => {
                    if (!prev) {
                      console.log(
                        "[Parent] Set selectedRouteId from tripDetail:",
                        rid
                      );
                      return rid;
                    }
                    return prev;
                  });
                }
              }

              // Try to get dropoff time from schedule or trip
              if (tripDetail?.schedule?.gioKhoiHanh) {
                const pickupTime = tripDetail.schedule.gioKhoiHanh;
                // Estimate dropoff time (add 1-2 hours for return trip)
                const [hours, minutes] = pickupTime.split(":").map(Number);
                const dropoffHours =
                  (hours +
                    (tripDetail.schedule.loaiChuyen === "don_sang" ? 2 : 1)) %
                  24;
                dropoffTime = `${String(dropoffHours).padStart(
                  2,
                  "0"
                )}:${String(minutes).padStart(2, "0")}`;
              }

              // 🔥 FIX: Lấy thông tin tài xế từ tripDetail (khi trip đã bắt đầu)
              // Backend trả về driverInfo object với hoTen và soDienThoai
              if (tripDetail?.driverInfo) {
                const driver = tripDetail.driverInfo;
                driverName = driver.hoTen || driver.tenTaiXe || driverName;
                driverPhone = driver.soDienThoai || driverPhone;
                console.log(
                  "[Parent] ✅ Updated driver info from driverInfo:",
                  {
                    driverName,
                    driverPhone,
                  }
                );
              } else if (tripDetail?.driver || tripDetail?.taiXe) {
                // Fallback 1: driver/taiXe object
                const driver = tripDetail.driver || tripDetail.taiXe;
                driverName = driver.hoTen || driver.name || driverName;
                driverPhone = driver.soDienThoai || driver.phone || driverPhone;
                console.log(
                  "[Parent] ✅ Updated driver info from driver/taiXe:",
                  {
                    driverName,
                    driverPhone,
                  }
                );
              } else if (tripDetail?.tenTaiXe) {
                // Fallback 2: Lấy từ field trực tiếp
                driverName = tripDetail.tenTaiXe;
                driverPhone = tripDetail.sdtTaiXe || driverPhone;
                console.log(
                  "[Parent] ✅ Updated driver info from trip fields:",
                  {
                    driverName,
                    driverPhone,
                  }
                );
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
            driverName: driverName, // 🔥 FIX: Dùng biến đã load từ trip
            driverPhone: driverPhone, // 🔥 FIX: Dùng biến đã load từ trip
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
            id: notif.maThongBao, // ← FIX: Thêm ID
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
                        Đã đến nơi
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
                    routes={
                      selectedRouteId
                        ? [
                            {
                              routeId: selectedRouteId,
                              routeName: busInfo?.route || "Tuyến đường",
                              polyline: dynamicDirections || routePolyline, // 🔥 Use dynamic directions if available
                              color: dynamicDirections ? "#10b981" : "#3b82f6", // Green for dynamic, blue for static
                            },
                          ]
                        : []
                    }
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
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground">
                          Đón sáng
                        </p>
                        {morningTripStatus === "hoan_thanh" ||
                        morningTripStatus === "da_hoan_thanh" ? (
                          <Badge
                            variant="default"
                            className="bg-green-500/20 text-green-700 text-xs"
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Đã hoàn thành
                          </Badge>
                        ) : morningTripStatus === "dang_chay" ? (
                          <Badge
                            variant="default"
                            className="bg-blue-500/20 text-blue-700 text-xs"
                          >
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse mr-1" />
                            Đang chạy
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Chưa bắt đầu
                          </Badge>
                        )}
                      </div>
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
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground">
                          Trả chiều
                        </p>
                        {afternoonTripStatus === "hoan_thanh" ||
                        afternoonTripStatus === "da_hoan_thanh" ? (
                          <Badge
                            variant="default"
                            className="bg-green-500/20 text-green-700 text-xs"
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Đã hoàn thành
                          </Badge>
                        ) : afternoonTripStatus === "dang_chay" ? (
                          <Badge
                            variant="default"
                            className="bg-blue-500/20 text-blue-700 text-xs"
                          >
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse mr-1" />
                            Đang chạy
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Chưa bắt đầu
                          </Badge>
                        )}
                      </div>
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

            {/* 🔥 NEW: Enhanced Recent Notifications with larger, more visible cards */}
            <Card className="border-border/50 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="font-bold">📢 Thông báo gần đây</span>
                  {unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="text-sm font-bold animate-pulse"
                    >
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
                  <div className="space-y-4">
                    {recentNotifications.map((notification, index) => {
                      const Icon =
                        notification.type === "success"
                          ? CheckCircle2
                          : notification.type === "warning"
                          ? AlertCircle
                          : MapPin;
                      return (
                        <div
                          key={
                            notification.id ||
                            `${notification.timestamp}-${index}`
                          }
                          className={`flex items-start gap-4 p-4 rounded-lg transition-all cursor-pointer border-2 ${
                            notification.type === "warning"
                              ? "bg-orange-50 dark:bg-orange-950/20 border-orange-500 hover:bg-orange-100 dark:hover:bg-orange-900/30"
                              : notification.type === "success"
                              ? "bg-green-50 dark:bg-green-950/20 border-green-500 hover:bg-green-100 dark:hover:bg-green-900/30"
                              : "bg-blue-50 dark:bg-blue-950/20 border-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                          }`}
                          onClick={() =>
                            setUnreadCount((prev) => Math.max(0, prev - 1))
                          }
                        >
                          <div
                            className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              notification.type === "success"
                                ? "bg-green-500/20"
                                : notification.type === "warning"
                                ? "bg-orange-500/20"
                                : "bg-primary/20"
                            }`}
                          >
                            <Icon
                              className={`w-6 h-6 ${
                                notification.type === "success"
                                  ? "text-green-600 dark:text-green-400"
                                  : notification.type === "warning"
                                  ? "text-orange-600 dark:text-orange-400"
                                  : "text-primary"
                              }`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-base font-bold text-foreground leading-snug">
                              {notification.title}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
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
