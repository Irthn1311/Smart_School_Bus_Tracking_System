"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/api-client";
import SSBMap from "@/components/map/SSBMap";
import type { StopDTO } from "@/components/map/SSBMap";

interface OptimizationParams {
  r_walk: number;
  s_max: number;
  c_bus: number;
  max_stops: number | null;
  use_roads_api: boolean;
  use_places_api: boolean;
  split_virtual_nodes: boolean;
  school_location: {
    lat: number;
    lng: number;
  };
  max_distance_from_school: number; // meters - khoảng cách tối đa từ trường
}

interface OptimizationResult {
  stops: Array<{
    maDiem: number;
    tenDiem: string;
    viDo: number;
    kinhDo: number;
    address?: string;
    studentCount?: number;
  }>;
  assignments: Array<{
    maHocSinh: number;
    maDiemDung: number;
    khoangCachMet: number;
  }>;
  stats: {
    totalStudents: number;
    assignedStudents: number;
    totalStops: number;
    averageStudentsPerStop: string;
    maxWalkDistance: number;
  };
}

interface VRPResult {
  routes: Array<{
    routeId: number;
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
    polyline?: string | null; // Polyline từ DB (depot → stops → depot)
  }>;
  stats: {
    totalStops: number;
    totalNodes: number;
    totalStudents: number;
    totalRoutes: number;
    totalDistance: string;
    averageStopsPerRoute: string;
    averageStudentsPerRoute: string;
  };
}

export function BusStopOptimizer() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"tier1" | "tier2" | "full">("full");
  
  const [params, setParams] = useState<OptimizationParams>({
    r_walk: 500,
    s_max: 25,
    c_bus: 40,
    max_stops: null,
    use_roads_api: true,
    use_places_api: true,
    split_virtual_nodes: true,
    school_location: {
      lat: 10.77653,
      lng: 106.700981,
    },
    max_distance_from_school: 15000, // 15km
  });

  const [tier1Result, setTier1Result] = useState<OptimizationResult | null>(null);
  const [tier2Result, setTier2Result] = useState<VRPResult | null>(null);
  const [fullResult, setFullResult] = useState<{
    tier1: OptimizationResult;
    tier2: VRPResult;
    summary: any;
  } | null>(null);

  const [stats, setStats] = useState<any>(null);
  const [routesCreated, setRoutesCreated] = useState<{
    routes: any[];
    stats: { totalRoutes: number; totalStops: number; totalStudents: number };
  } | null>(null);
  const [creatingRoutes, setCreatingRoutes] = useState(false);
  const [schedulesCreated, setSchedulesCreated] = useState<{
    schedules: any[];
    stats: { totalSchedules: number; totalRoutes: number };
  } | null>(null);
  const [creatingSchedules, setCreatingSchedules] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
  const [allRoutePolylines, setAllRoutePolylines] = useState<Array<{
    routeId: number;
    routeName: string;
    polyline: string;
    color: string;
  }>>([]);
  const [isLoadingAllPolylines, setIsLoadingAllPolylines] = useState(false);

  // Load stats on mount
  useEffect(() => {
    loadStats();
  }, []);

  // Tự động tạo polyline array từ routes khi tier2Result được set
  useEffect(() => {
    const prepareRoutePolylines = () => {
      const vrpResult = tier2Result || fullResult?.tier2;
      if (!vrpResult || !vrpResult.routes || vrpResult.routes.length === 0) {
        setAllRoutePolylines([]);
        return;
      }

      const COLORS = ["#EF4444", "#3B82F6", "#10B981", "#F97316", "#8B5CF6", "#EC4899", "#14B8A6", "#F59E0B"];
      
      // Ưu tiên dùng polyline từ response (đã có từ DB)
      const polylinesFromResponse = vrpResult.routes
        .map((route: any, index: number) => {
          if (route.polyline && typeof route.polyline === "string" && route.polyline.trim().length > 0) {
            console.log(`[BusStopOptimizer] ✅ Using polyline from response for route ${route.routeId} (${route.polyline.length} chars)`);
            return {
              routeId: route.routeId,
              routeName: `Tuyến ${route.routeId}`,
              polyline: route.polyline,
              color: COLORS[index % COLORS.length],
            };
          }
          return null;
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

      if (polylinesFromResponse.length > 0) {
        console.log(`[BusStopOptimizer] ✅ Using ${polylinesFromResponse.length} polylines from response`);
        setAllRoutePolylines(polylinesFromResponse);
        return;
      }

      // Fallback: Tự fetch polyline nếu không có trong response
      console.log(`[BusStopOptimizer] ⚠️ No polylines in response, fetching from API...`);
      setIsLoadingAllPolylines(true);
      
      const fetchPolylines = async () => {
        try {
          const polylinePromises = vrpResult.routes.map(async (route: any, index: number) => {
            const nodes = route.nodes;
            if (nodes.length === 0) {
              return null;
            }

            try {
              // Origin = depot (trường học)
              const origin = `${params.school_location.lat},${params.school_location.lng}`;
              // Destination = điểm dừng cuối cùng
              const lastNode = nodes[nodes.length - 1];
              const destination = `${lastNode.viDo},${lastNode.kinhDo}`;
              // Waypoints = các điểm dừng trừ điểm cuối
              const waypoints = nodes.slice(0, -1).map((node: any) => ({
                location: `${node.viDo},${node.kinhDo}`,
              }));

              const response = await apiClient.getDirections({
                origin,
                destination,
                waypoints: waypoints.length > 0 ? waypoints : undefined,
                mode: "driving",
                vehicleType: "bus",
              });

              if (response.success && response.data) {
                const polyline = (response.data as any).polyline;
                if (polyline && typeof polyline === "string") {
                  return {
                    routeId: route.routeId,
                    routeName: `Tuyến ${route.routeId}`,
                    polyline: polyline,
                    color: COLORS[index % COLORS.length],
                  };
                }
              }
              return null;
            } catch (error) {
              console.error(`[BusStopOptimizer] Error fetching polyline for route ${route.routeId}:`, error);
              return null;
            }
          });

          const results = await Promise.all(polylinePromises);
          const validPolylines = results.filter((r): r is NonNullable<typeof r> => r !== null);
          setAllRoutePolylines(validPolylines);
          console.log(`[BusStopOptimizer] Fetched ${validPolylines.length} route polylines from API`);
        } catch (error) {
          console.error("[BusStopOptimizer] Error fetching all route polylines:", error);
          setAllRoutePolylines([]);
        } finally {
          setIsLoadingAllPolylines(false);
        }
      };

      fetchPolylines();
    };

    prepareRoutePolylines();
  }, [tier2Result, fullResult?.tier2, params.school_location]);

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

  const handleOptimizeTier1 = async () => {
    setLoading(true);
    try {
      const response = await apiClient.optimizeBusStops({
        r_walk: params.r_walk,
        s_max: params.s_max,
        max_stops: params.max_stops,
        use_roads_api: params.use_roads_api,
        use_places_api: params.use_places_api,
        school_location: params.school_location,
        max_distance_from_school: params.max_distance_from_school,
      });

      if (response.success && response.data) {
        const result = response.data as OptimizationResult;
        setTier1Result(result);
        // Reset selected route when new optimization runs
        setSelectedRouteId(null);
        await loadStats();
        
        // Kiểm tra nếu không có kết quả
        if (result.stats.totalStops === 0) {
          toast({
            title: "Cảnh báo",
            description: (result.stats as any).error || "Không tìm thấy học sinh có tọa độ hợp lệ. Vui lòng kiểm tra dữ liệu học sinh trong database.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Thành công",
            description: `Tối ưu hóa điểm dừng: ${result.stats.totalStops} điểm dừng, ${result.stats.assignedStudents} học sinh`,
          });
        }
      } else {
        throw new Error(response.error?.message || "Lỗi không xác định");
      }
    } catch (error: any) {
      console.error("Optimization error:", error);
      toast({
        title: "Lỗi",
        description: error.message || "Không thể tối ưu hóa điểm dừng",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOptimizeTier2 = async () => {
    setLoading(true);
    try {
      const response = await apiClient.optimizeVRP({
        depot: params.school_location,
        capacity: params.c_bus,
        split_virtual_nodes: params.split_virtual_nodes,
      });

      if (response.success && response.data) {
        const result = response.data as VRPResult;
        setTier2Result(result);
        // Reset selected route when new optimization runs
        setSelectedRouteId(null);
        setAllRoutePolylines([]); // Reset all route polylines, sẽ được fetch tự động bởi useEffect
        
        // Kiểm tra nếu không có kết quả
        if (result.stats.totalRoutes === 0) {
          toast({
            title: "Cảnh báo",
            description: "Không có điểm dừng nào có học sinh được gán. Vui lòng chạy Tầng 1 (Tối ưu điểm dừng) trước.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Thành công",
            description: `Tối ưu hóa tuyến xe: ${result.stats.totalRoutes} tuyến, ${result.stats.totalStudents} học sinh`,
          });
        }
      } else {
        throw new Error(response.error?.message || "Lỗi không xác định");
      }
    } catch (error: any) {
      console.error("VRP optimization error:", error);
      toast({
        title: "Lỗi",
        description: error.message || "Không thể tối ưu hóa tuyến xe",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

   const handleOptimizeFull = async () => {
    setLoading(true);
    try {
      const response = await apiClient.optimizeFull({
        school_location: params.school_location,
        r_walk: params.r_walk,
        s_max: params.s_max,
        c_bus: params.c_bus,
        max_stops: params.max_stops,
        // Xóa hoặc comment out nếu backend không hỗ trợ
        // use_roads_api: params.use_roads_api,
        // use_places_api: params.use_places_api,
        split_virtual_nodes: params.split_virtual_nodes,
        max_distance_from_school: params.max_distance_from_school,
      });

      if (response.success && response.data) {
        const result = response.data as {
          tier1: OptimizationResult;
          tier2: VRPResult;
          summary: any;
        };
        setFullResult(result);
        setTier1Result(result.tier1);
        setTier2Result(result.tier2);
        // Reset selected route when new optimization runs
        setSelectedRouteId(null);
        setAllRoutePolylines([]); // Reset all route polylines, sẽ được fetch tự động bởi useEffect
        await loadStats();
        
        if (result.summary.totalStops === 0 || result.summary.totalRoutes === 0) {
          const errorMsg = (result.tier1?.stats as any)?.error 
            ? (result.tier1.stats as any).error 
            : "Không tìm thấy học sinh có tọa độ hợp lệ hoặc không có điểm dừng được tạo. Vui lòng kiểm tra dữ liệu học sinh trong database.";
          toast({
            title: "Cảnh báo",
            description: errorMsg,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Thành công",
            description: `Tối ưu hóa hoàn chỉnh: ${result.summary.totalStops} điểm dừng, ${result.summary.totalRoutes} tuyến xe`,
          });
        }
      } else {
        throw new Error(response.error?.message || "Lỗi không xác định");
      }
    } catch (error: any) {
      console.error("Full optimization error:", error);
      toast({
        title: "Lỗi",
        description: error.message || "Không thể tối ưu hóa hoàn chỉnh",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoutes = async () => {
    if (!tier2Result && !fullResult?.tier2) {
      toast({
        title: "Cảnh báo",
        description: "Vui lòng chạy optimization Tầng 2 trước khi tạo tuyến đường",
        variant: "destructive",
      });
      return;
    }

    setCreatingRoutes(true);
    try {
      const vrpResult = tier2Result || fullResult?.tier2;
      const response = await apiClient.createRoutesFromOptimization({
        depot: {
          lat: params.school_location.lat,
          lng: params.school_location.lng,
          name: "Đại học Sài Gòn",
        },
        capacity: params.c_bus,
        route_name_prefix: "Tuyến Tối Ưu",
        create_return_routes: true,
        vrp_result: vrpResult,
      });

      if (response.success && response.data) {
        const result = response.data as {
          routes: any[];
          stats: { totalRoutes: number; totalStops: number; totalStudents: number };
        };
        setRoutesCreated(result);
        toast({
          title: "Thành công",
          description: `Đã tạo ${result.stats.totalRoutes} tuyến đường thành công`,
        });
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
    if (!routesCreated || !routesCreated.routes || routesCreated.routes.length === 0) {
      toast({
        title: "Cảnh báo",
        description: "Vui lòng tạo tuyến đường trước khi tạo lịch trình",
        variant: "destructive",
      });
      return;
    }

    setCreatingSchedules(true);
    try {
      const routeIds = routesCreated.routes
        .filter((r: any) => r.maTuyen)
        .map((r: any) => r.maTuyen);

      const response = await apiClient.createSchedulesFromRoutes({
        route_ids: routeIds,
        default_departure_time: "06:00:00",
        auto_assign_bus: true,
        auto_assign_driver: true,
      });

      if (response.success && response.data) {
        const result = response.data as {
          schedules: any[];
          stats: { totalSchedules: number; totalRoutes: number };
        };
        setSchedulesCreated(result);
        toast({
          title: "Thành công",
          description: `Đã tạo ${result.stats.totalSchedules} lịch trình thành công`,
        });
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
      setCreatingSchedules(false);
    }
  };

  // Handle route click to toggle selection
  const handleRouteClick = (route: VRPResult['routes'][0]) => {
    if (selectedRouteId === route.routeId) {
      // Click lại cùng tuyến -> bỏ chọn
      setSelectedRouteId(null);
      return;
    }

    // Chọn tuyến mới
    setSelectedRouteId(route.routeId);
  };

  // Get stops for map - filter by selected route if any
  const getStopsForMap = (): StopDTO[] => {
    // ƯU TIÊN dùng kết quả FULL (tier2 – VRP) nếu có
    if (fullResult?.tier2 && fullResult.tier2.routes.length > 0) {
      const vrp = fullResult.tier2;
      let stops = vrp.routes.flatMap((route, routeIndex) =>
        route.nodes.map((node, idx) => ({
          maDiem: node.maDiem,
          tenDiem: node.tenDiem,
          viDo: node.viDo,
          kinhDo: node.kinhDo,
          address: null,              // VRPResult hiện không có address
          sequence: idx + 1,
          routeIndex,                 // ⬅️ tuyến thứ mấy (0,1,2,...)
        }))
      );
      
      // Filter by selected route if any
      if (selectedRouteId !== null) {
        const selectedRoute = vrp.routes.find((r) => r.routeId === selectedRouteId);
        if (selectedRoute) {
          const selectedRouteIndex = vrp.routes.findIndex((r) => r.routeId === selectedRouteId);
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
      
      console.log("[BusStopOptimizer] getStopsForMap: Using fullResult.tier2, stops count:", stops.length);
      return stops;
    }

    // Nếu có tier2Result riêng (chạy tier2 độc lập)
    if (tier2Result && tier2Result.routes.length > 0) {
      let stops = tier2Result.routes.flatMap((route, routeIndex) =>
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
      
      // Filter by selected route if any
      if (selectedRouteId !== null) {
        const selectedRoute = tier2Result.routes.find((r) => r.routeId === selectedRouteId);
        if (selectedRoute) {
          const selectedRouteIndex = tier2Result.routes.findIndex((r) => r.routeId === selectedRouteId);
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
      
      console.log("[BusStopOptimizer] getStopsForMap: Using tier2Result, stops count:", stops.length);
      return stops;
    }

    // Nếu chưa có tier2, fallback về tier1 như cũ
    const result = tier1Result || fullResult?.tier1;
    if (!result) {
      console.log("[BusStopOptimizer] getStopsForMap: No result available, returning empty array");
      return [];
    }

    const stops = result.stops.map((stop, index) => ({
      maDiem: stop.maDiem,
      tenDiem: stop.tenDiem,
      viDo: stop.viDo,
      kinhDo: stop.kinhDo,
      address: stop.address || null,
      sequence: index + 1,
      // không set routeIndex -> SSBMap sẽ dùng màu mặc định
    }));
    console.log("[BusStopOptimizer] getStopsForMap: Using tier1 result, stops count:", stops.length);
    return stops;
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tối Ưu Hóa Điểm Dừng & Tuyến Xe</h1>
          <p className="text-muted-foreground mt-2">
            Sử dụng thuật toán Greedy Maximum Coverage và VRP để tối ưu hóa hệ thống
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="full">
            <Zap className="w-4 h-4 mr-2" />
            Tối Ưu Hoàn Chỉnh
          </TabsTrigger>
          <TabsTrigger value="tier1">
            <MapPin className="w-4 h-4 mr-2" />
            Tầng 1: Điểm Dừng
          </TabsTrigger>
          <TabsTrigger value="tier2">
            <Route className="w-4 h-4 mr-2" />
            Tầng 2: Tuyến Xe
          </TabsTrigger>
        </TabsList>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Parameters Panel */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Tham Số
              </CardTitle>
              <CardDescription>Điều chỉnh tham số tối ưu hóa</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="r_walk">Bán kính đi bộ (mét)</Label>
                <Input
                  id="r_walk"
                  type="number"
                  value={params.r_walk}
                  onChange={(e) =>
                    setParams({ ...params, r_walk: parseInt(e.target.value) || 500 })
                  }
                  min={100}
                  max={2000}
                />
                <p className="text-xs text-muted-foreground">Khoảng cách tối đa học sinh đi bộ đến điểm dừng</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="s_max">Số học sinh tối đa/điểm dừng</Label>
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
                <p className="text-xs text-muted-foreground">Giới hạn số học sinh tại mỗi điểm dừng</p>
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
                <p className="text-xs text-muted-foreground">Số học sinh tối đa mỗi xe buýt</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_stops">Số điểm dừng tối đa (tùy chọn)</Label>
                <Input
                  id="max_stops"
                  type="number"
                  value={params.max_stops || ""}
                  onChange={(e) =>
                    setParams({
                      ...params,
                      max_stops: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  min={1}
                  placeholder="Không giới hạn"
                />
                <p className="text-xs text-muted-foreground">Để trống nếu không giới hạn</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Thông tin trường học</Label>
                <div className="p-3 bg-muted rounded-md">
                  <p className="font-semibold text-sm">Đại Học Sài Gòn</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    273 An Dương Vương, Phường Chợ Quán, Thành phố Hồ Chí Minh 700000
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Tọa độ: {params.school_location.lat.toFixed(6)}, {params.school_location.lng.toFixed(6)}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_distance_from_school">Khoảng cách tối đa từ trường (mét)</Label>
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
                  Giới hạn khoảng cách tối đa từ trường học (mặc định: 15km = 15000m)
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
                    Sử dụng Roads API
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground ml-6">
                  Snap điểm dừng lên đường lớn
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
                    Sử dụng Places API
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground ml-6">
                  Tìm địa điểm dễ nhận diện
                </p>
              </div>

              <Separator />

              <Button
                onClick={
                  activeTab === "full"
                    ? handleOptimizeFull
                    : activeTab === "tier1"
                    ? handleOptimizeTier1
                    : handleOptimizeTier2
                }
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? (
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

              {/* Button tạo tuyến đường - chỉ hiển thị khi đã có kết quả */}
              {(tier2Result || fullResult?.tier2) && (
                <>
                  <Separator />
                  <Button
                    onClick={handleCreateRoutes}
                    disabled={creatingRoutes || loading}
                    className="w-full"
                    size="lg"
                    variant="outline"
                  >
                    {creatingRoutes ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Đang tạo tuyến đường...
                      </>
                    ) : (
                      <>
                        <Route className="w-4 h-4 mr-2" />
                        Tạo Tuyến Đường
                      </>
                    )}
                  </Button>
                </>
              )}

              {/* Button tạo lịch trình - chỉ hiển thị khi đã tạo tuyến đường */}
              {routesCreated && routesCreated.routes.length > 0 && (
                <>
                  <Separator />
                  <Button
                    onClick={handleCreateSchedules}
                    disabled={creatingSchedules || creatingRoutes}
                    className="w-full"
                    size="lg"
                    variant="secondary"
                  >
                    {creatingSchedules ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Đang tạo lịch trình...
                      </>
                    ) : (
                      <>
                        <Settings className="w-4 h-4 mr-2" />
                        Tạo Lịch Trình Tự Động
                      </>
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Results Panel */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Kết Quả
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TabsContent value="full" className="mt-0">
                {fullResult ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 border rounded-lg">
                        <div className="text-2xl font-bold">{fullResult.summary.totalStops}</div>
                        <div className="text-sm text-muted-foreground">Điểm dừng</div>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="text-2xl font-bold">{fullResult.summary.totalRoutes}</div>
                        <div className="text-sm text-muted-foreground">Tuyến xe</div>
                      </div>
                      {routesCreated && (
                        <div className="p-4 border rounded-lg bg-green-50">
                          <div className="text-2xl font-bold text-green-600">{routesCreated.stats.totalRoutes}</div>
                          <div className="text-sm text-muted-foreground">Tuyến đã tạo</div>
                        </div>
                      )}
                      {schedulesCreated && (
                        <div className="p-4 border rounded-lg bg-blue-50">
                          <div className="text-2xl font-bold text-blue-600">{schedulesCreated.stats.totalSchedules}</div>
                          <div className="text-sm text-muted-foreground">Lịch trình đã tạo</div>
                        </div>
                      )}
                      <div className="p-4 border rounded-lg">
                        <div className="text-2xl font-bold">{fullResult.summary.totalStudents}</div>
                        <div className="text-sm text-muted-foreground">Học sinh</div>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="text-2xl font-bold">
                          {fullResult.summary.averageStudentsPerStop}
                        </div>
                        <div className="text-sm text-muted-foreground">HS/Điểm dừng</div>
                      </div>
                    </div>

                    <div className="h-[500px] rounded-lg overflow-hidden border relative">
                      <SSBMap
                        center={params.school_location}
                        zoom={13}
                        stops={getStopsForMap()}
                        routes={
                          allRoutePolylines.length > 0
                            ? selectedRouteId !== null
                              ? allRoutePolylines
                                  .filter((r) => r.routeId === selectedRouteId)
                                  .map((r) => ({
                                    routeId: r.routeId,
                                    routeName: r.routeName,
                                    polyline: r.polyline,
                                    color: r.color,
                                  }))
                              : allRoutePolylines.map((r) => ({
                                  routeId: r.routeId,
                                  routeName: r.routeName,
                                  polyline: r.polyline,
                                  color: r.color,
                                }))
                            : undefined
                        }
                        disableDirections={false}
                        height="100%"
                      />
                      {isLoadingAllPolylines && (
                        <div className="absolute top-2 right-2 bg-white/90 px-3 py-2 rounded-md shadow-md flex items-center gap-2 z-10">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Đang tải tất cả tuyến đường...</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-semibold">Chi tiết Tuyến Xe</h3>
                      <ScrollArea className="h-[200px]">
                        {fullResult.tier2.routes.map((route) => (
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
                                <span className="font-medium">Tuyến {route.routeId}</span>
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
              </TabsContent>

              <TabsContent value="tier1" className="mt-0">
                {tier1Result ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 border rounded-lg">
                        <div className="text-2xl font-bold">{tier1Result.stats.totalStops}</div>
                        <div className="text-sm text-muted-foreground">Điểm dừng</div>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="text-2xl font-bold">{tier1Result.stats.assignedStudents}</div>
                        <div className="text-sm text-muted-foreground">Học sinh</div>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="text-2xl font-bold">
                          {tier1Result.stats.averageStudentsPerStop}
                        </div>
                        <div className="text-sm text-muted-foreground">HS/Điểm dừng</div>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="text-2xl font-bold">{tier1Result.stats.maxWalkDistance}m</div>
                        <div className="text-sm text-muted-foreground">Đi bộ tối đa</div>
                      </div>
                    </div>

                    <div className="h-[400px] rounded-lg overflow-hidden border">
                      <SSBMap
                        center={params.school_location}
                        zoom={13}
                        disableDirections={true}
                        stops={getStopsForMap()}
                        height="100%"
                      />
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-semibold">Danh Sách Điểm Dừng</h3>
                      <ScrollArea className="h-[200px]">
                        {tier1Result.stops.length > 0 ? (
                          tier1Result.stops.map((stop, index) => (
                            <div key={stop.maDiem} className="p-3 border rounded-lg mb-2">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline">{index + 1}</Badge>
                                    <span className="font-medium">{stop.tenDiem}</span>
                                  </div>
                                  {stop.address && (
                                    <p className="text-xs text-muted-foreground mt-1 ml-8">
                                      {stop.address}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-4 mt-2 ml-8 text-xs text-muted-foreground">
                                    <span>Tọa độ: {stop.viDo.toFixed(6)}, {stop.kinhDo.toFixed(6)}</span>
                                    {stop.studentCount !== undefined && (
                                      <Badge variant="secondary">{stop.studentCount} học sinh</Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <p>Chưa có điểm dừng nào</p>
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Chưa có kết quả. Nhấn "Chạy Tối Ưu Hóa" để bắt đầu.</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="tier2" className="mt-0">
                {tier2Result ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 border rounded-lg">
                        <div className="text-2xl font-bold">{tier2Result.stats.totalRoutes}</div>
                        <div className="text-sm text-muted-foreground">Tuyến xe</div>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="text-2xl font-bold">{tier2Result.stats.totalStudents}</div>
                        <div className="text-sm text-muted-foreground">Học sinh</div>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="text-2xl font-bold">
                          {tier2Result.stats.averageStopsPerRoute}
                        </div>
                        <div className="text-sm text-muted-foreground">Điểm dừng/Tuyến</div>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="text-2xl font-bold">
                          {tier2Result.stats.averageStudentsPerRoute}
                        </div>
                        <div className="text-sm text-muted-foreground">HS/Tuyến</div>
                      </div>
                    </div>

                    <div className="h-[500px] rounded-lg overflow-hidden border relative">
                      <SSBMap
                        center={params.school_location}
                        zoom={13}
                        stops={getStopsForMap()}
                        routes={
                          allRoutePolylines.length > 0
                            ? selectedRouteId !== null
                              ? allRoutePolylines
                                  .filter((r) => r.routeId === selectedRouteId)
                                  .map((r) => ({
                                    routeId: r.routeId,
                                    routeName: r.routeName,
                                    polyline: r.polyline,
                                    color: r.color,
                                  }))
                              : allRoutePolylines.map((r) => ({
                                  routeId: r.routeId,
                                  routeName: r.routeName,
                                  polyline: r.polyline,
                                  color: r.color,
                                }))
                            : undefined
                        }
                        disableDirections={false}
                        height="100%"
                      />
                      {isLoadingAllPolylines && (
                        <div className="absolute top-2 right-2 bg-white/90 px-3 py-2 rounded-md shadow-md flex items-center gap-2 z-10">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Đang tải tất cả tuyến đường...</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-semibold">Chi tiết Tuyến Xe</h3>
                      <ScrollArea className="h-[200px]">
                        {tier2Result.routes.map((route) => (
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
                                <span className="font-medium">Tuyến {route.routeId}</span>
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
                    <Route className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Chưa có kết quả. Nhấn "Chạy Tối Ưu Hóa" để bắt đầu.</p>
                  </div>
                )}
              </TabsContent>
            </CardContent>
          </Card>
        </div>
      </Tabs>

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

