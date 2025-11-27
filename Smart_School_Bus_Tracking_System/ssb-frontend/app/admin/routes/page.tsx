"use client"

import { useEffect, useState, useMemo } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, Eye, MapPin, Clock, Search, Filter, AlertCircle, Route, Navigation, ArrowRight, MoreVertical, Sparkles } from "lucide-react"
import { RouteBuilder } from "@/components/admin/route-builder"
import { RouteSuggestionDialog } from "@/components/admin/route-suggestion-dialog"
import { StatsCard } from "@/components/admin/stats-card"
import { useRoutes, useDeleteRoute } from "@/lib/hooks/useRoutes"
import { useRouter } from "next/navigation"
import { useDebounce } from "@/lib/hooks/useDebounce"
import { useToast } from "@/hooks/use-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

type Route = { 
  id: string; 
  name: string; 
  status?: string | boolean; 
  stopsCount?: number; 
  distance?: any; 
  duration?: any; 
  assignedBus?: string; 
  raw?: any 
}

export default function RoutesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearch = useDebounce(searchQuery, 300)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [routeTypeFilter, setRouteTypeFilter] = useState<string>("all") // 'all', 'di', 've'
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isSuggestionDialogOpen, setIsSuggestionDialogOpen] = useState(false)
  const [editingRoute, setEditingRoute] = useState<Route | null>(null)
  
  const { mutate: deleteRoute } = useDeleteRoute()

  const { data: routesData, isLoading, error } = useRoutes({
    limit: 100,
    search: debouncedSearch || undefined,
    trangThai: statusFilter === 'all' ? undefined : statusFilter === 'active',
    routeType: routeTypeFilter === 'all' ? undefined : routeTypeFilter,
  })

  function mapRoute(r: any): Route {
    // Normalize trangThai: convert number (1/0) to boolean, or keep as is
    let status = r.trangThai || r.status;
    if (typeof status === 'number') {
      status = status === 1;
    }
    
    // Get stops count - prioritize soDiemDung from database, then stops array length
    const stopsCount = r.soDiemDung !== undefined && r.soDiemDung !== null 
      ? Number(r.soDiemDung) 
      : (r.stops?.length || r.diemDung?.length || 0);
    
    return {
      id: String(r.maTuyen || r.id || r._id || ''),
      name: r.tenTuyen || r.ten || r.name || 'Tuyến chưa có tên',
      status: status,
      stopsCount: stopsCount,
      distance: r.quangDuong || r.distance || r.khoangCach || r.totalDistanceKm,
      duration: r.thoiLuong || r.duration || r.thoiGianUocTinh || r.estimatedTimeMinutes,
      assignedBus: r.xeDuocGan || r.assignedBus,
      raw: r,
    }
  }

  const routes = useMemo(() => {
    if (!routesData?.data) return []
    const items = Array.isArray(routesData.data) ? routesData.data : []
    return items.map(mapRoute)
  }, [routesData])

  const stats = useMemo(() => {
    if (!routes.length) return null
    const totalRoutes = routes.length
    const activeRoutes = routes.filter((r) => {
      const status = r.status
      return status === true || status === 'hoat_dong' || status === 'active'
    }).length
    const totalStops = routes.reduce((sum, r) => sum + (r.stopsCount || 0), 0)
    const avgTime = Math.round(routes.reduce((sum, r) => sum + (r.duration || 0), 0) / routes.length) || 0
    return {
      total: totalRoutes,
      active: activeRoutes,
      inactive: totalRoutes - activeRoutes,
      totalStops,
      averageStops: Math.round(totalStops / totalRoutes) || 0,
      averageTime: avgTime,
    }
  }, [routes])

  // Group routes by pairedRouteId để hiển thị tuyến đi/về cùng nhau
  const groupedRoutes = useMemo(() => {
    const groups = new Map<string | number, Route[]>();
    const unpairedRoutes: Route[] = [];

    routes.forEach((route) => {
      const raw = route.raw;
      const pairedRouteId = raw?.pairedRouteId || raw?.paired_route_id;
      const routeId = route.id;
      const routeType = raw?.routeType || raw?.route_type || 'both';

      // Nếu có pairedRouteId, nhóm lại
      if (pairedRouteId) {
        const groupKey = String(Math.min(Number(routeId), Number(pairedRouteId)));
        if (!groups.has(groupKey)) {
          groups.set(groupKey, []);
        }
        groups.get(groupKey)!.push(route);
      } else {
        // Nếu không có pairedRouteId, kiểm tra xem có tuyến nào khác trỏ đến nó không
        const isPaired = routes.some(
          (r) => (r.raw?.pairedRouteId || r.raw?.paired_route_id) === routeId
        );
        if (!isPaired) {
          unpairedRoutes.push(route);
        }
      }
    });

    // Convert groups to array và sắp xếp
    const groupedArray = Array.from(groups.values()).map((group) => {
      // Sắp xếp trong group: tuyến đi trước, tuyến về sau
      return group.sort((a, b) => {
        const aType = a.raw?.routeType || a.raw?.route_type || 'both';
        const bType = b.raw?.routeType || b.raw?.route_type || 'both';
        if (aType === 'di' && bType === 've') return -1;
        if (aType === 've' && bType === 'di') return 1;
        return 0;
      });
    });

    return [...groupedArray, ...unpairedRoutes.map((r) => [r])];
  }, [routes]);

  // Filtering routes by status and routeType
  const filteredRoutes = useMemo(() => {
    let filtered = groupedRoutes.flat();

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((route) => {
        const status = route.status;
        if (statusFilter === 'active') {
          return status === true || status === 'hoat_dong' || status === 'active';
        }
        return status === false || status === 'ngung_hoat_dong' || status === 'inactive';
      });
    }

    // Filter by routeType (client-side filtering nếu backend chưa filter đúng)
    if (routeTypeFilter !== 'all') {
      filtered = filtered.filter((route) => {
        const routeType = route.raw?.routeType || route.raw?.route_type || 'both';
        if (routeTypeFilter === 'di') {
          return routeType === 'di' || routeType === 'both';
        }
        if (routeTypeFilter === 've') {
          return routeType === 've' || routeType === 'both';
        }
        return true;
      });
    }

    // Nhóm lại sau khi filter
    const filteredGroups = new Map<string | number, Route[]>();
    filtered.forEach((route) => {
      const raw = route.raw;
      const pairedRouteId = raw?.pairedRouteId || raw?.paired_route_id;
      const routeId = route.id;

      if (pairedRouteId) {
        const groupKey = String(Math.min(Number(routeId), Number(pairedRouteId)));
        if (!filteredGroups.has(groupKey)) {
          filteredGroups.set(groupKey, []);
        }
        filteredGroups.get(groupKey)!.push(route);
      } else {
        const isPaired = filtered.some(
          (r) => (r.raw?.pairedRouteId || r.raw?.paired_route_id) === routeId
        );
        if (!isPaired) {
          if (!filteredGroups.has(routeId)) {
            filteredGroups.set(routeId, []);
          }
          filteredGroups.get(routeId)!.push(route);
        }
      }
    });

    return Array.from(filteredGroups.values()).map((group) =>
      group.sort((a, b) => {
        const aType = a.raw?.routeType || a.raw?.route_type || 'both';
        const bType = b.raw?.routeType || b.raw?.route_type || 'both';
        if (aType === 'di' && bType === 've') return -1;
        if (aType === 've' && bType === 'di') return 1;
        return 0;
      })
    );
  }, [groupedRoutes, statusFilter, routeTypeFilter])

  // Helper to get route origin and destination
  const getRouteEndpoints = (route: Route) => {
    const raw = route.raw
    if (!raw) return { origin: null, destination: null }
    
    // Priority 1: Use diemBatDau/diemKetThuc (from database)
    let origin = raw.diemBatDau || raw.origin || null
    let destination = raw.diemKetThuc || raw.destination || null
    
    // Priority 2: If we have stops array, get first and last stop names
    const stops = raw.stops || raw.diemDung || []
    if (stops.length > 0 && Array.isArray(stops)) {
      const sortedStops = [...stops].sort((a: any, b: any) => {
        const seqA = a.sequence || a.thuTu || 0
        const seqB = b.sequence || b.thuTu || 0
        return seqA - seqB
      })
      
      if (!origin && sortedStops[0]) {
        origin = sortedStops[0].tenDiem || sortedStops[0].name || sortedStops[0].tenDiemDung || 'Điểm bắt đầu'
      }
      if (!destination && sortedStops[sortedStops.length - 1]) {
        const lastStop = sortedStops[sortedStops.length - 1]
        destination = lastStop.tenDiem || lastStop.name || lastStop.tenDiemDung || 'Điểm kết thúc'
      }
    }
    
    // Priority 3: Use origin_lat/origin_lng and dest_lat/dest_lng if available (for display)
    if (!origin && (raw.origin_lat && raw.origin_lng)) {
      origin = `Tọa độ: ${raw.origin_lat.toFixed(4)}, ${raw.origin_lng.toFixed(4)}`
    }
    if (!destination && (raw.dest_lat && raw.dest_lng)) {
      destination = `Tọa độ: ${raw.dest_lat.toFixed(4)}, ${raw.dest_lng.toFixed(4)}`
    }
    
    // Fallback
    if (!origin) origin = 'Chưa xác định'
    if (!destination) destination = 'Chưa xác định'
    
    return { origin, destination }
  }

  // Show RouteBuilder in fullscreen when creating/editing
  if (isAddDialogOpen || isEditDialogOpen) {
    return (
      <DashboardLayout sidebar={<AdminSidebar />}>
        <RouteBuilder
          mode={isEditDialogOpen ? 'edit' : 'create'}
          initialRoute={
            isEditDialogOpen && editingRoute
              ? {
                  id: editingRoute.id,
                  name: editingRoute.name,
                  diemBatDau: editingRoute.raw?.diemBatDau,
                  diemKetThuc: editingRoute.raw?.diemKetThuc,
                  stops: editingRoute.raw?.diemDung || editingRoute.raw?.stops,
                }
              : undefined
          }
          onClose={() => {
            setIsAddDialogOpen(false);
            setIsEditDialogOpen(false);
            setEditingRoute(null);
          }}
          onSaved={() => {
            setIsAddDialogOpen(false);
            setIsEditDialogOpen(false);
            setEditingRoute(null);
          }}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebar={<AdminSidebar />}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Quản lý Tuyến đường</h1>
            <p className="text-muted-foreground mt-1">Quản lý và cấu hình các tuyến đường xe buýt</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setIsSuggestionDialogOpen(true)}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Đề xuất tuyến đường
            </Button>
            <Button 
              className="bg-primary hover:bg-primary/90"
              onClick={() => setIsAddDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Thêm tuyến mới
            </Button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatsCard
              title="Tổng tuyến"
              value={String(stats.total)}
              change={`${stats.active} đang hoạt động`}
              trend="up"
              icon={Route}
              iconColor="text-primary"
            />
            <StatsCard
              title="Đang hoạt động"
              value={String(stats.active)}
              change={`${stats.inactive} tạm ngừng`}
              trend="up"
              icon={AlertCircle}
              iconColor="text-success"
            />
            <StatsCard
              title="Tổng điểm dừng"
              value={String(stats.totalStops)}
              change={`TB: ${stats.averageStops} điểm/tuyến`}
              trend="neutral"
              icon={MapPin}
              iconColor="text-warning"
            />
            <StatsCard
              title="Thời gian TB"
              value={`${stats.averageTime} phút`}
              change="Ước tính hoàn thành"
              trend="neutral"
              icon={Clock}
              iconColor="text-info"
            />
          </div>
        )}

        {/* Search and Filter Bar */}
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Top Row: Search */}
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm kiếm tuyến đường..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Bottom Row: Filters */}
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Lọc:</span>
                </div>
                
                 {/* Status Filter */}
                 <div className="flex gap-2">
                   <Button
                     variant={statusFilter === 'all' ? 'default' : 'outline'}
                     size="sm"
                     onClick={() => setStatusFilter('all')}
                   >
                     Tất cả
                   </Button>
                   <Button
                     variant={statusFilter === 'active' ? 'default' : 'outline'}
                     size="sm"
                     onClick={() => setStatusFilter('active')}
                   >
                     Hoạt động
                   </Button>
                   <Button
                     variant={statusFilter === 'inactive' ? 'default' : 'outline'}
                     size="sm"
                     onClick={() => setStatusFilter('inactive')}
                   >
                     Tạm ngừng
                   </Button>
                 </div>

                 {/* Route Type Filter */}
                 <div className="flex items-center gap-2 ml-2 pl-2 border-l">
                   <span className="text-sm font-medium text-muted-foreground">Loại:</span>
                   <div className="flex gap-2">
                     <Button
                       variant={routeTypeFilter === 'all' ? 'default' : 'outline'}
                       size="sm"
                       onClick={() => setRouteTypeFilter('all')}
                     >
                       Tất cả
                     </Button>
                     <Button
                       variant={routeTypeFilter === 'di' ? 'default' : 'outline'}
                       size="sm"
                       onClick={() => setRouteTypeFilter('di')}
                     >
                       Tuyến đi
                     </Button>
                     <Button
                       variant={routeTypeFilter === 've' ? 'default' : 'outline'}
                       size="sm"
                       onClick={() => setRouteTypeFilter('ve')}
                     >
                       Tuyến về
                     </Button>
                   </div>
                 </div>
              </div>

               {/* Active Filters Summary */}
               {(statusFilter !== 'all' || routeTypeFilter !== 'all') && (
                 <div className="flex items-center gap-2 pt-2 border-t">
                   <span className="text-xs text-muted-foreground">Đang lọc:</span>
                   {statusFilter !== 'all' && (
                     <Badge variant="secondary" className="gap-1">
                       Trạng thái: {statusFilter === 'active' ? 'Hoạt động' : 'Tạm ngừng'}
                       <button
                         className="ml-1 hover:bg-muted rounded-full p-0.5"
                         onClick={() => setStatusFilter('all')}
                       >
                         ×
                       </button>
                     </Badge>
                   )}
                   {routeTypeFilter !== 'all' && (
                     <Badge variant="secondary" className="gap-1">
                       Loại: {routeTypeFilter === 'di' ? 'Tuyến đi' : 'Tuyến về'}
                       <button
                         className="ml-1 hover:bg-muted rounded-full p-0.5"
                         onClick={() => setRouteTypeFilter('all')}
                       >
                         ×
                       </button>
                     </Badge>
                   )}
                   <Button
                     variant="ghost"
                     size="sm"
                     className="h-6 px-2 text-xs ml-auto"
                     onClick={() => {
                       setStatusFilter('all');
                       setRouteTypeFilter('all');
                     }}
                   >
                     Xóa tất cả
                   </Button>
                 </div>
               )}
            </div>
          </CardContent>
        </Card>

        {/* Routes Grid/List */}
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="pt-6">
                  <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-muted rounded w-3/4"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                    <div className="h-4 bg-muted rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-5 h-5" />
                <p>{error instanceof Error ? error.message : 'Không thể tải danh sách tuyến'}</p>
              </div>
            </CardContent>
          </Card>
        ) : routes.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="pt-12 pb-12">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                  <Route className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Không có tuyến đường</h3>
                  <p className="text-muted-foreground">Bắt đầu bằng cách thêm tuyến đường đầu tiên</p>
                </div>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Thêm tuyến mới
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : filteredRoutes.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="pt-12 pb-12">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                  <Route className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Không tìm thấy tuyến đường</h3>
                  <p className="text-muted-foreground">
                    {statusFilter !== 'all' 
                      ? "Thử thay đổi bộ lọc để xem thêm tuyến đường"
                      : "Bắt đầu bằng cách thêm tuyến đường đầu tiên"}
                  </p>
                </div>
                {statusFilter !== 'all' ? (
                  <Button 
                    variant="outline"
                    onClick={() => setStatusFilter('all')}
                  >
                    Xóa bộ lọc
                  </Button>
                ) : (
                  <Button onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Thêm tuyến mới
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
         ) : (
           <div className="space-y-3">
             {filteredRoutes.map((routeGroup, groupIndex) => {
               const isPaired = routeGroup.length > 1;
               
               return (
                 <div key={groupIndex} className={isPaired ? "space-y-2" : ""}>
                   {isPaired && (
                     <div className="flex items-center gap-2 px-2 py-1 bg-muted/30 rounded-md">
                       <Badge variant="outline" className="text-xs">
                         Cặp tuyến đi/về
                       </Badge>
                       <span className="text-xs text-muted-foreground">
                         {routeGroup.length} tuyến
                       </span>
                     </div>
                   )}
                   <div className={isPaired ? "space-y-2 pl-4 border-l-2 border-primary/20" : ""}>
                     {routeGroup.map((route) => {
              const endpoints = getRouteEndpoints(route)
              const isActive = route.status === true || route.status === "active" || route.status === "hoat_dong"
              
              return (
                <Card key={route.id} className="border-border/50 hover:border-primary/50 transition-all">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                         <div className="flex items-center gap-3 mb-2 flex-wrap">
                           <CardTitle className="text-lg line-clamp-1">{route.name}</CardTitle>
                           <div className="flex items-center gap-1">
                             <Badge
                               variant="outline"
                               className={
                                 isActive
                                   ? "border-success text-success bg-success/10"
                                   : "border-muted-foreground text-muted-foreground bg-muted/10"
                               }
                             >
                               {isActive ? "Hoạt động" : "Tạm ngừng"}
                             </Badge>
                             {(route.raw?.routeType === 'di' || route.raw?.routeType === 've') && (
                               <Badge
                                 variant="outline"
                                 className={
                                   route.raw?.routeType === 'di'
                                     ? "border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-950/20"
                                     : "border-purple-500 text-purple-600 bg-purple-50 dark:bg-purple-950/20"
                                 }
                               >
                                 {route.raw?.routeType === 'di' ? 'Đi' : 'Về'}
                               </Badge>
                             )}
                             {route.stopsCount < 2 && (
                               <Badge
                                 variant="outline"
                                 className="border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/20"
                               >
                                 ⚠️ Thiếu điểm dừng
                               </Badge>
                             )}
                           </div>
                         </div>
                        
                        {/* Route Endpoints */}
                        {(endpoints.origin || endpoints.destination) && (
                          <div className="flex items-center gap-4 mb-2 text-sm text-muted-foreground">
                            {endpoints.origin && (
                              <div className="flex items-center gap-1.5">
                                <Navigation className="w-3.5 h-3.5 text-primary" />
                                <span className="line-clamp-1">{endpoints.origin}</span>
                              </div>
                            )}
                            {endpoints.origin && endpoints.destination && (
                              <ArrowRight className="w-4 h-4 shrink-0" />
                            )}
                            {endpoints.destination && (
                              <div className="flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-destructive" />
                                <span className="line-clamp-1">{endpoints.destination}</span>
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4 shrink-0" />
                            <span>{route.stopsCount ?? 0} điểm dừng</span>
                          </div>
                          {route.duration && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4 shrink-0" />
                              <span>{typeof route.duration === 'number' ? `${route.duration} phút` : route.duration}</span>
                            </div>
                          )}
                          {route.distance && (
                            <div className="flex items-center gap-1">
                              <Navigation className="w-4 h-4 shrink-0" />
                              <span>
                                {typeof route.distance === 'number' 
                                  ? `${route.distance.toFixed(1)} km` 
                                  : route.distance}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/admin/routes/${route.id}`)}
                        >
                          <Eye className="w-4 h-4 mr-1.5" />
                          Chi tiết
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => { setEditingRoute(route); setIsEditDialogOpen(true) }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            if (!confirm(`Bạn có chắc chắn muốn xóa tuyến "${route.name}"?`)) return
                            deleteRoute(route.id, {
                              onSuccess: () => {
                                toast({ title: "Thành công", description: "Đã xóa tuyến đường." })
                              },
                              onError: (err: Error) => {
                                toast({ title: "Lỗi", description: err.message || 'Xóa thất bại', variant: "destructive" })
                              },
                            })
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                 </Card>
                     );
                   })}
                   </div>
                 </div>
               );
             })}
           </div>
         )}

      </div>

      {/* Route Suggestion Dialog */}
      <RouteSuggestionDialog
        open={isSuggestionDialogOpen}
        onOpenChange={setIsSuggestionDialogOpen}
        onRoutesCreated={() => {
          // Refresh routes list
          window.location.reload();
        }}
      />
    </DashboardLayout>
  )
}
