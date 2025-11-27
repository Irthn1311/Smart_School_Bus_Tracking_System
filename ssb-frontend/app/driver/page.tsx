"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { DriverSidebar } from "@/components/driver/driver-sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Users, Play } from "lucide-react";
import { apiClient } from "@/lib/api";
import MapView from "@/components/tracking/MapView";
// Removed: startTrip import - không start trip ở trang driver nữa, để trang trip/[id] xử lý
import { useToast } from "@/hooks/use-toast";

// Remove hardcoded todayTrips; we'll use real API

export default function DriverDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [trips, setTrips] = useState<any[]>([]);
  const [stops, setStops] = useState<
    { id: string; lat: number; lng: number; label?: string }[]
  >([]);
  const [routePolyline, setRoutePolyline] = useState<string | null>(null);
  const [routeId, setRouteId] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (user && user.role?.toLowerCase() !== "driver") {
      const userRole = user.role?.toLowerCase();
      if (userRole === "admin" || userRole === "parent") {
        router.push(`/${userRole}`);
      }
    }
  }, [user, router]);

  // Load TRIPS (hôm nay) cho tài xế đăng nhập và dựng stops cho trip đang chạy (nếu có)
  useEffect(() => {
    if (!user) return;

    async function load() {
      try {
        const driverIdNum = Number(user!.id);
        if (!driverIdNum || isNaN(driverIdNum)) {
          console.error("Invalid driver ID:", user!.id);
          setTrips([]);
          return;
        }

        // Chỉ lấy TRIPS hôm nay của tài xế, lọc trạng thái 'chua_khoi_hanh' | 'dang_chay'
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, "0");
        const dd = String(today.getDate()).padStart(2, "0");
        const todayStr = `${yyyy}-${mm}-${dd}`;

        let normalized: any[] = [];
        try {
          // Truyền maTaiXe vào API để lọc ở backend thay vì lọc ở frontend
          console.log("🔍 Loading trips for driver:", {
            driverId: driverIdNum,
            today: todayStr,
            user: user,
          });

          const rTrips = await apiClient.getTrips({
            ngayChay: todayStr,
            maTaiXe: driverIdNum,
          });

          console.log("📦 API Response:", rTrips);

          // Xử lý response structure
          const tripsRaw: any[] = Array.isArray(rTrips?.data)
            ? rTrips.data
            : Array.isArray(rTrips)
            ? rTrips
            : [];

          console.log("📋 Raw trips from API:", {
            count: tripsRaw.length,
            trips: tripsRaw.map((t: any) => ({
              maChuyen: t.maChuyen,
              trangThai: t.trangThai,
              ngayChay: t.ngayChay,
              maTaiXe: t.maTaiXe,
              tenTuyen: t.tenTuyen,
            })),
          });

          // 🔥 Hiển thị TẤT CẢ chuyến đi hôm nay (kể cả đã hoàn thành)
          // Nhưng sẽ disable nút action cho chuyến đã kết thúc ở UI
          normalized = tripsRaw;

          // Sắp xếp: chuyến chưa hoàn thành lên trước
          normalized.sort((a: any, b: any) => {
            const statusOrder: Record<string, number> = {
              dang_chay: 1,
              chua_khoi_hanh: 2,
              hoan_thanh: 3,
              da_hoan_thanh: 3,
              huy: 4,
              bi_huy: 4,
            };
            const aOrder = statusOrder[a?.trangThai] || 99;
            const bOrder = statusOrder[b?.trangThai] || 99;
            return aOrder - bOrder;
          });

          // Log để debug
          console.log("✅ Filtered active trips:", {
            total: normalized.length,
            trips: normalized.map((t: any) => ({
              maChuyen: t.maChuyen,
              trangThai: t.trangThai,
              tenTuyen: t.tenTuyen,
              loaiChuyen: t.loaiChuyen,
            })),
          });

          if (normalized.length === 0 && tripsRaw.length > 0) {
            console.warn("⚠️ Found trips but none are active:", {
              driverId: driverIdNum,
              today: todayStr,
              totalTripsFromAPI: tripsRaw.length,
              allStatuses: tripsRaw.map((t: any) => t?.trangThai),
              allTrips: tripsRaw,
            });
          } else if (normalized.length === 0) {
            console.warn("⚠️ No trips found for driver:", {
              driverId: driverIdNum,
              today: todayStr,
              totalTripsFromAPI: tripsRaw.length,
            });
          }
        } catch (error: any) {
          console.error("Error loading trips:", error);

          // Handle rate limit errors specifically
          if (
            error?.status === 429 ||
            error?.message?.includes("Too many requests")
          ) {
            const retryAfter = error?.retryAfter || 60;
            toast({
              title: "Quá nhiều yêu cầu",
              description: `Vui lòng đợi ${retryAfter} giây trước khi thử lại.`,
              variant: "destructive",
            });
          } else {
            const errorMessage =
              error?.message ||
              error?.response?.message ||
              "Không thể tải danh sách chuyến đi";
            toast({
              title: "Lỗi",
              description: errorMessage,
              variant: "destructive",
            });
          }
          normalized = [];
        }

        setTrips(normalized);

        // Dựng stops từ trip đang chạy (nếu có)
        const active = normalized.find((t: any) => t.trangThai === "dang_chay");
        if (active && active.maChuyen) {
          try {
            const detailRes = await apiClient.getTripById(active.maChuyen);
            const detail =
              detailRes && detailRes.data ? detailRes.data : detailRes;
            const detailAny: any = detail;

            // Lấy route stops
            const routeStops = detailAny?.routeInfo?.diemDung || [];
            const mappedStops = (routeStops || []).map((s: any) => ({
              id: s.maDiem || s.id || s.maDiemDung || `${s.lat}_${s.lng}`,
              lat: Number(s.viDo || s.lat || s.latitude),
              lng: Number(s.kinhDo || s.lng || s.longitude),
              label: s.tenDiem || s.ten || s.label,
            }));
            setStops(
              mappedStops.filter(
                (s: any) => Number.isFinite(s.lat) && Number.isFinite(s.lng)
              )
            );

            // Lấy polyline từ route
            const routePolylineData = detailAny?.routeInfo?.polyline || null;
            const routeIdData =
              detailAny?.routeInfo?.maTuyen ||
              detailAny?.schedule?.maTuyen ||
              null;

            if (routePolylineData) {
              setRoutePolyline(routePolylineData);
              console.log(
                "[Driver] Loaded route polyline:",
                routePolylineData.substring(0, 50) + "..."
              );
            } else if (routeIdData) {
              // Nếu không có polyline trong trip detail, lấy từ route
              try {
                const routeRes = await apiClient.getRouteById(routeIdData);
                const routeData: any = (routeRes as any)?.data || routeRes;
                const polyline = routeData?.polyline || null;
                if (polyline) {
                  setRoutePolyline(polyline);
                  console.log(
                    "[Driver] Loaded polyline from route:",
                    polyline.substring(0, 50) + "..."
                  );
                }
              } catch (routeErr) {
                console.warn(
                  "[Driver] Failed to load route polyline:",
                  routeErr
                );
              }
            }

            if (routeIdData) {
              setRouteId(Number(routeIdData));
            }
          } catch {
            setStops([]);
            setRoutePolyline(null);
            setRouteId(null);
          }
        } else {
          setStops([]);
          setRoutePolyline(null);
          setRouteId(null);
        }
      } catch (err) {
        console.error("Failed to load trips for driver", err);
        setStops([]);
      }
    }

    load();
  }, [user, toast]);

  if (!user || user.role?.toLowerCase() !== "driver") {
    return null;
  }

  // Tính toán stats từ trips data
  const totalTripsToday = trips.length;
  const totalStudents = trips.reduce((sum, t) => sum + (t.soHocSinh || 0), 0);
  const completedTrips = trips.filter(
    (t) =>
      t.trangThai === "hoan_thanh" ||
      t.trangThai === "da_hoan_thanh" ||
      t.gioKetThucThucTe ||
      (t.soDiemDung > 0 && (t.summary?.droppedCount || 0) === t.soDiemDung)
  ).length;

  return (
    <DashboardLayout sidebar={<DriverSidebar />}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Lịch trình hôm nay
          </h1>
          <p className="text-muted-foreground mt-1">
            Quản lý chuyến đi và điểm dừng của bạn
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-foreground">
                {totalTripsToday}
              </div>
              <p className="text-sm text-muted-foreground">Chuyến hôm nay</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-primary">
                {totalStudents}
              </div>
              <p className="text-sm text-muted-foreground">Học sinh</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-success">
                {completedTrips}
              </div>
              <p className="text-sm text-muted-foreground">
                Chuyến hoàn thành hôm nay
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-foreground">
                {totalTripsToday > 0
                  ? ((completedTrips / totalTripsToday) * 100).toFixed(1)
                  : "0"}
                %
              </div>
              <p className="text-sm text-muted-foreground">Hoàn thành</p>
            </CardContent>
          </Card>
        </div>

        {/* Today's Trips + Map */}
        <div
          className={
            stops.length > 0
              ? "grid grid-cols-1 lg:grid-cols-3 gap-6"
              : "space-y-5"
          }
        >
          <div
            className={
              stops.length > 0 ? "lg:col-span-1 space-y-5" : "space-y-5"
            }
          >
            <h2 className="text-xl font-semibold text-foreground">
              Chuyến đi hôm nay
            </h2>
            {trips.length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="p-6">
                  <div className="text-center space-y-2">
                    <p className="text-muted-foreground">
                      Không có chuyến đi nào hôm nay
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Vui lòng kiểm tra console (F12) để xem chi tiết
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              trips.map((trip: any, idx: number) => {
                const tripId =
                  trip.maChuyen || trip.maChuyenDi || trip.id || idx;
                const baseTitle =
                  trip.tenTuyen ||
                  trip.route ||
                  trip.moTa ||
                  trip.loai ||
                  `Chuyến ${tripId}`;
                // Add trip type indicator if not already in name
                const loaiChuyen = trip.loaiChuyen || "";
                const title =
                  baseTitle.includes("Đi") || baseTitle.includes("Về")
                    ? baseTitle
                    : `${baseTitle} ${
                        loaiChuyen === "don_sang"
                          ? "(Đi)"
                          : loaiChuyen === "tra_chieu"
                          ? "(Về)"
                          : ""
                      }`;

                // 🔥 FIX: Kiểm tra xem chuyến đã hoàn thành chưa
                // Backend không luôn set gioKetThucThucTe, nên phải kiểm tra thêm summary
                const totalStops = trip.soDiemDung || 0;
                const droppedCount =
                  trip.summary?.droppedCount || trip.summary?.dropped || 0;
                const allStopsCompleted =
                  totalStops > 0 && droppedCount === totalStops;

                const isNotStarted =
                  trip.trangThai === "chua_khoi_hanh" && !trip.gioBatDauThucTe;
                const isRunning =
                  trip.trangThai === "dang_chay" ||
                  (trip.gioBatDauThucTe &&
                    !trip.gioKetThucThucTe &&
                    !allStopsCompleted);
                const isCompleted =
                  trip.trangThai === "hoan_thanh" ||
                  trip.trangThai === "da_hoan_thanh" ||
                  !!trip.gioKetThucThucTe ||
                  allStopsCompleted; // Nếu đã hoàn thành hết điểm dừng
                const isCancelled =
                  trip.trangThai === "huy" || trip.trangThai === "bi_huy";
                const isFinished = isCompleted || isCancelled;

                // 🔥 DEBUG: Log trip status
                console.log(`[Driver] Trip ${tripId} status:`, {
                  trangThai: trip.trangThai,
                  gioBatDauThucTe: trip.gioBatDauThucTe,
                  gioKetThucThucTe: trip.gioKetThucThucTe,
                  totalStops,
                  droppedCount,
                  allStopsCompleted,
                  isNotStarted,
                  isRunning,
                  isCompleted,
                  isCancelled,
                  isFinished,
                });

                return (
                  <Card
                    key={tripId}
                    className={`border-border/50 ${
                      isFinished ? "opacity-60" : ""
                    }`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-medium text-foreground">
                            {title}
                          </h3>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {/* Ưu tiên giờ khởi hành từ lịch trình nếu không có giờ thực tế */}
                              {trip.gioBatDauThucTe ||
                                trip.gioKhoiHanh ||
                                trip.startTime ||
                                "-"}{" "}
                              - {trip.gioKetThucThucTe || trip.endTime || "-"}
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {trip.soDiemDung ||
                                (Array.isArray(trip.diemDung)
                                  ? trip.diemDung.length
                                  : trip.stops || 0)}{" "}
                              điểm dừng
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {trip.soHocSinh ||
                                (Array.isArray(trip.students)
                                  ? trip.students.length
                                  : 0)}{" "}
                              học sinh
                            </div>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            trip.trangThai === "dang_chay"
                              ? "border-green-500 text-green-500"
                              : trip.trangThai === "chua_khoi_hanh"
                              ? "border-blue-500 text-blue-500"
                              : trip.trangThai === "hoan_thanh" ||
                                trip.trangThai === "da_hoan_thanh"
                              ? "border-gray-500 text-gray-500"
                              : "border-primary text-primary"
                          }
                        >
                          {trip.trangThai === "chua_khoi_hanh"
                            ? "Chưa khởi hành"
                            : trip.trangThai === "dang_chay"
                            ? "Đang chạy"
                            : trip.trangThai === "hoan_thanh" ||
                              trip.trangThai === "da_hoan_thanh"
                            ? "Hoàn thành"
                            : trip.trangThai === "huy" ||
                              trip.trangThai === "bi_huy"
                            ? "Đã hủy"
                            : trip.trangThai || trip.status || "N/A"}
                        </Badge>
                      </div>

                      {isFinished ? (
                        <Button
                          variant="outline"
                          className="w-full cursor-pointer"
                          onClick={() => router.push(`/driver/trip/${tripId}`)}
                        >
                          Xem chi tiết chuyến đi
                        </Button>
                      ) : isNotStarted ? (
                        <Button
                          className="w-full bg-primary hover:bg-primary/90 cursor-pointer"
                          onClick={() => {
                            // 🔥 FIX: Chỉ navigate, không start trip ở đây
                            // Để trang trip/[id] xử lý start trip để tránh trùng lặp
                            router.push(`/driver/trip/${tripId}`);
                          }}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Chi tiết chuyến đi
                        </Button>
                      ) : (
                        <Button
                          className="w-full bg-primary hover:bg-primary/90 cursor-pointer"
                          onClick={() => router.push(`/driver/trip/${tripId}`)}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Vào chi tiết chuyến đi
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {stops.length > 0 && (
            <div className="lg:col-span-2">
              <MapView
                buses={[]}
                stops={stops}
                routes={
                  routePolyline && routeId
                    ? [
                        {
                          routeId: routeId,
                          routeName:
                            trips.find((t: any) => t.trangThai === "dang_chay")
                              ?.tenTuyen || "Tuyến đường",
                          polyline: routePolyline,
                          color: "#3b82f6", // Blue color for route
                        },
                      ]
                    : []
                }
                height="640px"
              />
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
