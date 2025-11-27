"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/lib/language-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Zap,
  MapPin,
  Users,
  Route,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Settings,
  BarChart3,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/api-client";
import SSBMap from "@/components/map/SSBMap";
import type { StopDTO } from "@/components/map/SSBMap";
import { useRouter } from "next/navigation";

interface OptimizationParams {
  r_walk: number;
  s_max: number;
  c_bus: number;
  max_routes: number;
  max_route_distance: number; // km - Giới hạn quãng đường tối đa của một tuyến
  use_roads_api: boolean;
  use_places_api: boolean;
  school_location: {
    lat: number;
    lng: number;
  };
  max_distance_from_school: number;
  auto_create_schedules: boolean;
}

interface OptimizationResult {
  routes: Array<{
    routeId: number;
    maTuyen: number;
    tenTuyen: string;
    nodes: Array<{
      maDiem: number;
      tenDiem: string;
      viDo: number;
      kinhDo: number;
      demand: number;
    }>;
    totalDemand: number;
    stopCount: number;
    estimatedDistance: number;
    polyline?: string | null;
  }>;
  stats: {
    totalStops: number;
    totalStudents: number;
    totalRoutes: number;
    totalDistance: string;
    averageStopsPerRoute: string;
    averageStudentsPerRoute: string;
  };
  summary: {
    totalStops: number;
    totalStudents: number;
    totalRoutes: number;
    averageStudentsPerStop: string;
  };
}

export function BusStopOptimizer() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [creatingRoutes, setCreatingRoutes] = useState(false);
  
  const [params, setParams] = useState<OptimizationParams>({
    r_walk: 500,
    s_max: 25,
    c_bus: 40,
    max_routes: 4,
    max_route_distance: 50, // km - Mặc định 50km
    use_roads_api: true,
    use_places_api: true,
    school_location: {
      lat: 10.7600193,
      lng: 106.6822534,
    },
    max_distance_from_school: 15000,
    auto_create_schedules: false,
  });

  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [vrpResult, setVrpResult] = useState<any>(null); // Lưu vrpResult để tạo routes sau
  const [optimizationParams, setOptimizationParams] = useState<any>(null); // Lưu params để tạo routes sau

  // Load stats on mount
  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await apiClient.getBusStopStats();
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (error: any) {
      console.error("Failed to load stats:", error);
    }
  };

  const handleOptimize = async () => {
    setOptimizing(true);
    setResult(null);
    setSelectedRouteId(null);
    
    try {
      const response = await apiClient.optimizeFull({
        school_location: params.school_location,
        r_walk: params.r_walk,
        s_max: params.s_max,
        c_bus: params.c_bus,
        max_routes: params.max_routes,
        max_route_distance: params.max_route_distance,
        use_roads_api: params.use_roads_api,
        use_places_api: params.use_places_api,
        max_distance_from_school: params.max_distance_from_school,
      });

      if (response.success && response.data) {
        const data = response.data as any;
        
        // Lưu vrpResult và optimizationParams để có thể tạo routes sau
        if (data.vrpResult) {
          setVrpResult(data.vrpResult);
        }
        if (data.optimizationParams) {
          setOptimizationParams(data.optimizationParams);
        }
        
        // Format result để tương thích với component
        const formattedResult: OptimizationResult = {
          routes: data.tier2?.routes || [],
          stats: data.tier2?.stats || {
            totalStops: 0,
            totalStudents: 0,
            totalRoutes: 0,
            totalDistance: "0.00",
            averageStopsPerRoute: "0.00",
            averageStudentsPerRoute: "0.00",
          },
          summary: data.summary || {
            totalStops: 0,
            totalStudents: 0,
            totalRoutes: 0,
            averageStudentsPerStop: "0.00",
          },
        };
        
        setResult(formattedResult);
        await loadStats();
        
        if (formattedResult.summary.totalRoutes === 0) {
          toast({
            title: "Cảnh báo",
            description: "Không tìm thấy học sinh có tọa độ hợp lệ hoặc không có tuyến đường được tạo. Vui lòng kiểm tra dữ liệu học sinh trong database.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Thành công",
            description: `Đã tối ưu hóa: ${formattedResult.summary.totalRoutes} tuyến đường, ${formattedResult.summary.totalStops} điểm dừng, ${formattedResult.summary.totalStudents} học sinh. Nhấn "Xác nhận thêm tuyến đường" để lưu vào database.`,
          });
        }
      } else {
        throw new Error(response.error?.message || "Lỗi không xác định");
      }
    } catch (error: any) {
      console.error("Optimization error:", error);
      toast({
        title: "Lỗi",
        description: error.message || "Không thể tối ưu hóa tuyến đường",
        variant: "destructive",
      });
    } finally {
      setOptimizing(false);
    }
  };

  const handleConfirmCreateRoutes = async () => {
    if (!vrpResult || !optimizationParams) {
      toast({
        title: "Cảnh báo",
        description: "Vui lòng chạy tối ưu hóa trước khi xác nhận thêm tuyến đường",
        variant: "destructive",
      });
      return;
    }

    setCreatingRoutes(true);
    try {
      const response = await apiClient.createRoutesFromOptimization({
        vrp_result: vrpResult,
        depot: optimizationParams.depot,
        capacity: optimizationParams.capacity,
        route_name_prefix: "Tuyến Tối Ưu",
        create_return_routes: false,
        clear_existing_routes: true, // Xóa tuyến cũ trước khi tạo mới
        max_route_distance: optimizationParams.max_route_distance,
      });

      if (response.success && response.data) {
        const data = response.data as any;
        toast({
          title: "Thành công",
          description: `Đã tạo ${data.stats?.totalRoutes || 0} tuyến đường thành công`,
        });
        
        // Reset state
        setVrpResult(null);
        setOptimizationParams(null);
        setResult(null);
        await loadStats();
        
        // Redirect to routes page
        setTimeout(() => {
          router.push("/admin/routes");
        }, 1500);
      } else {
        throw new Error(response.error?.message || "Lỗi không xác định");
      }
    } catch (error: any) {
      console.error("Create routes error:", error);
      toast({
        title: "Lỗi",
        description: error.message || "Không thể tạo tuyến đường",
        variant: "destructive",
      });
    } finally {
      setCreatingRoutes(false);
    }
  };

  const handleCreateSchedules = async () => {
    if (!result || !result.routes || result.routes.length === 0) {
      toast({
        title: "Cảnh báo",
        description: "Vui lòng chạy tối ưu hóa trước khi tạo lịch trình",
        variant: "destructive",
      });
      return;
    }

    setCreatingRoutes(true);
    try {
      const routeIds = result.routes
        .filter((r) => r.maTuyen)
        .map((r) => r.maTuyen);

      const response = await apiClient.createSchedulesFromRoutes({
        route_ids: routeIds,
        default_departure_time: "06:00:00",
        auto_assign_bus: true,
        auto_assign_driver: true,
      });

      if (response.success && response.data) {
        const data = response.data as any;
        toast({
          title: "Thành công",
          description: `Đã tạo ${data.stats?.totalSchedules || 0} lịch trình thành công`,
        });
        
        // Redirect to routes page
        setTimeout(() => {
          router.push("/admin/routes");
        }, 1500);
      } else {
        throw new Error(response.error?.message || "Lỗi không xác định");
      }
    } catch (error: any) {
      console.error("Create schedules error:", error);
      toast({
        title: "Lỗi",
        description: error.message || "Không thể tạo lịch trình",
        variant: "destructive",
      });
    } finally {
      setCreatingRoutes(false);
    }
  };

  const handleRouteClick = (route: OptimizationResult['routes'][0]) => {
    if (selectedRouteId === route.routeId) {
      setSelectedRouteId(null);
    } else {
      setSelectedRouteId(route.routeId);
    }
  };

  const getStopsForMap = (): StopDTO[] => {
    if (!result || !result.routes || result.routes.length === 0) {
      return [];
    }

    let stops = result.routes.flatMap((route, routeIndex) =>
      route.nodes.map((node, idx) => ({
        maDiem: node.maDiem,
        tenDiem: node.tenDiem,
        viDo: node.viDo,
        kinhDo: node.kinhDo,
        address: null,
        sequence: idx + 1,
        routeIndex,
      }))
    );

    if (selectedRouteId !== null) {
      const selectedRoute = result.routes.find((r) => r.routeId === selectedRouteId);
      if (selectedRoute) {
        const selectedRouteIndex = result.routes.findIndex((r) => r.routeId === selectedRouteId);
        stops = selectedRoute.nodes.map((node, idx) => ({
          maDiem: node.maDiem,
          tenDiem: node.tenDiem,
          viDo: node.viDo,
          kinhDo: node.kinhDo,
          address: null,
          sequence: idx + 1,
          routeIndex: selectedRouteIndex,
        }));
      }
    }

    return stops;
  };

  const getRoutePolylines = () => {
    if (!result || !result.routes || result.routes.length === 0) {
      return undefined;
    }

    const COLORS = ["#EF4444", "#3B82F6", "#10B981", "#F97316", "#8B5CF6", "#EC4899", "#14B8A6", "#F59E0B"];

    const polylines = result.routes
      .filter((route) => route.polyline && route.polyline.trim().length > 0)
      .map((route, index) => ({
        routeId: route.routeId,
        routeName: route.tenTuyen || `Tuyến ${route.routeId}`,
        polyline: route.polyline!,
        color: COLORS[index % COLORS.length],
      }));

    if (selectedRouteId !== null) {
      return polylines.filter((r) => r.routeId === selectedRouteId);
    }

    return polylines.length > 0 ? polylines : undefined;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tối Ưu Hóa Tuyến Đường</h1>
          <p className="text-muted-foreground mt-2">
            Tự động tối ưu hóa điểm dừng và tuyến đường cho học sinh
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Parameters Panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Tham Số Tối Ưu Hóa
            </CardTitle>
            <CardDescription>Điều chỉnh các tham số để tối ưu hóa phù hợp</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="r_walk">Bán kính đi bộ (mét)</Label>
              <Input
                id="r_walk"
                type="number"
                value={params.r_walk}
                onChange={(e) =>
                  setParams({ ...params, r_walk: parseInt(e.target.value) || 300 })
                }
                min={100}
                max={2000}
                step={50}
              />
              <p className="text-xs text-muted-foreground">
                Khoảng cách tối đa học sinh đi bộ đến điểm dừng (mặc định: 300m)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="s_max">Số học sinh tối đa mỗi điểm dừng</Label>
              <Input
                id="s_max"
                type="number"
                value={params.s_max}
                onChange={(e) =>
                  setParams({ ...params, s_max: parseInt(e.target.value) || 25 })
                }
                min={1}
                max={100}
              />
              <p className="text-xs text-muted-foreground">
                Số học sinh tối đa được gán vào một điểm dừng (mặc định: 25)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="c_bus">Sức chứa xe buýt</Label>
              <Input
                id="c_bus"
                type="number"
                value={params.c_bus}
                onChange={(e) =>
                  setParams({ ...params, c_bus: parseInt(e.target.value) || 40 })
                }
                min={1}
                max={100}
              />
              <p className="text-xs text-muted-foreground">
                Số học sinh tối đa mỗi xe buýt (mặc định: 40)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_routes">Số tuyến tối đa</Label>
              <Input
                id="max_routes"
                type="number"
                value={params.max_routes}
                onChange={(e) =>
                  setParams({ ...params, max_routes: parseInt(e.target.value) || 4 })
                }
                min={1}
                max={100}
              />
              <p className="text-xs text-muted-foreground">
                Số lượng tuyến tối đa được tạo (mặc định: 4)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_route_distance">Giới hạn quãng đường tuyến (km)</Label>
              <Input
                id="max_route_distance"
                type="number"
                value={params.max_route_distance}
                onChange={(e) =>
                  setParams({
                    ...params,
                    max_route_distance: parseFloat(e.target.value) || 50,
                  })
                }
                min={10}
                max={200}
                step={5}
              />
              <p className="text-xs text-muted-foreground">
                Quãng đường tối đa của một tuyến (mặc định: 50km). Nếu tuyến vượt quá sẽ được tách thành nhiều tuyến
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="school_lat">Vĩ độ trường học</Label>
              <Input
                id="school_lat"
                type="number"
                step="0.000001"
                value={params.school_location.lat}
                onChange={(e) =>
                  setParams({
                    ...params,
                    school_location: {
                      ...params.school_location,
                      lat: parseFloat(e.target.value) || 10.7600193,
                    },
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="school_lng">Kinh độ trường học</Label>
              <Input
                id="school_lng"
                type="number"
                step="0.000001"
                value={params.school_location.lng}
                onChange={(e) =>
                  setParams({
                    ...params,
                    school_location: {
                      ...params.school_location,
                      lng: parseFloat(e.target.value) || 106.6822534,
                    },
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_distance_from_school">Giới hạn khoảng cách từ trường (mét)</Label>
              <Input
                id="max_distance_from_school"
                type="number"
                value={params.max_distance_from_school}
                onChange={(e) =>
                  setParams({
                    ...params,
                    max_distance_from_school: parseInt(e.target.value) || 15000,
                  })
                }
                min={1000}
                max={50000}
                step={1000}
              />
              <p className="text-xs text-muted-foreground">
                Khoảng cách tối đa từ trường học (mặc định: 15000m = 15km)
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="use_roads_api"
                  checked={params.use_roads_api}
                  onChange={(e) =>
                    setParams({ ...params, use_roads_api: e.target.checked })
                  }
                  className="rounded"
                />
                <Label htmlFor="use_roads_api" className="cursor-pointer">
                  Sử dụng Roads API để snap điểm dừng lên đường
                </Label>
              </div>
              <p className="text-xs text-muted-foreground ml-6">
                Tự động điều chỉnh điểm dừng lên đường gần nhất (khuyến nghị: bật)
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="use_places_api"
                  checked={params.use_places_api}
                  onChange={(e) =>
                    setParams({ ...params, use_places_api: e.target.checked })
                  }
                  className="rounded"
                />
                <Label htmlFor="use_places_api" className="cursor-pointer">
                  Sử dụng Places API để lấy địa chỉ chi tiết
                </Label>
              </div>
              <p className="text-xs text-muted-foreground ml-6">
                Lấy địa chỉ chi tiết cho điểm dừng (khuyến nghị: bật)
              </p>
            </div>

            <Separator />

            <Button
              onClick={handleOptimize}
              disabled={optimizing || loading}
              className="w-full"
              size="lg"
            >
              {optimizing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang tối ưu hóa...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Chạy Tối Ưu Hóa
                </>
              )}
            </Button>

            {result && result.routes.length > 0 && (
              <>
                <Separator />
                <Button
                  onClick={handleConfirmCreateRoutes}
                  disabled={creatingRoutes || !vrpResult}
                  className="w-full"
                  size="lg"
                  variant="default"
                >
                  {creatingRoutes ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Đang tạo tuyến đường...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Xác nhận thêm tuyến đường
                    </>
                  )}
                </Button>
                {result.routes.some((r) => r.maTuyen) && (
                  <Button
                    onClick={handleCreateSchedules}
                    disabled={creatingRoutes}
                    className="w-full"
                    size="lg"
                    variant="secondary"
                  >
                    {creatingRoutes ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Đang tạo lịch trình...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Tạo Lịch Trình Tự Động
                      </>
                    )}
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Results Panel */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Kết Quả Tối Ưu Hóa
            </CardTitle>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="text-2xl font-bold">{result.summary.totalRoutes}</div>
                    <div className="text-sm text-muted-foreground">Tuyến đường</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-2xl font-bold">{result.summary.totalStops}</div>
                    <div className="text-sm text-muted-foreground">Điểm dừng</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-2xl font-bold">{result.summary.totalStudents}</div>
                    <div className="text-sm text-muted-foreground">Học sinh</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-2xl font-bold">{result.summary.averageStudentsPerStop}</div>
                    <div className="text-sm text-muted-foreground">HS/Điểm dừng</div>
                  </div>
                </div>

                {/* Map */}
                <div className="h-[500px] rounded-lg overflow-hidden border relative">
                  <SSBMap
                    center={params.school_location}
                    zoom={13}
                    stops={getStopsForMap()}
                    routes={getRoutePolylines()}
                    disableDirections={false}
                    height="100%"
                  />
                </div>

                {/* Routes List */}
                <div className="space-y-2">
                  <h3 className="font-semibold">Chi Tiết Tuyến Đường</h3>
                  <ScrollArea className="h-[200px]">
                    {result.routes.map((route) => (
                      <div
                        key={route.routeId}
                        className={`p-3 border rounded-lg mb-2 cursor-pointer transition-colors ${
                          selectedRouteId === route.routeId
                            ? "bg-primary/10 border-primary"
                            : "hover:bg-muted/50"
                        }`}
                        onClick={() => handleRouteClick(route)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium">{route.tenTuyen}</span>
                            <Badge variant="outline" className="ml-2">
                              {route.stopCount} điểm dừng
                            </Badge>
                            <Badge variant="outline" className="ml-2">
                              {route.totalDemand} học sinh
                            </Badge>
                            {selectedRouteId === route.routeId && (
                              <Badge variant="default" className="ml-2">
                                Đang xem
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            ~{route.estimatedDistance.toFixed(1)} km
                          </div>
                        </div>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Chưa có kết quả. Nhấn "Chạy Tối Ưu Hóa" để bắt đầu.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stats Card */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Thống Kê Hiện Tại</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold">{stats.totalStops || 0}</div>
                <div className="text-sm text-muted-foreground">Tổng điểm dừng</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold">{stats.totalAssignedStudents || 0}</div>
                <div className="text-sm text-muted-foreground">Học sinh đã gán</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold">
                  {stats.avgWalkDistance ? `${Math.round(stats.avgWalkDistance)}m` : "N/A"}
                </div>
                <div className="text-sm text-muted-foreground">Đi bộ trung bình</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold">{stats.maxWalkDistance || 0}m</div>
                <div className="text-sm text-muted-foreground">Đi bộ tối đa</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
