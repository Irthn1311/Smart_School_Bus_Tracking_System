"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  MapPin,
  Users,
  Clock,
  Navigation,
  Edit,
  Check,
  X,
  Sparkles,
  Route,
  Trash2,
  Search,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ArrowLeft,
  CheckSquare,
  Square,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/api-client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SuggestedStop {
  sequence: number;
  lat: number;
  lng: number;
  address: string;
  studentCount: number;
  students?: Array<{
    maHocSinh: number;
    hoTen: string;
    diaChi?: string;
  }>;
}

interface SuggestedRoute {
  name: string;
  direction?: string;
  routeType?: 'di' | 've';
  origin: {
    lat: number;
    lng: number;
    address: string;
  };
  destination: {
    lat: number;
    lng: number;
    address: string;
  };
  stops: SuggestedStop[];
  totalStudents: number;
  estimatedTimeMinutes: number;
  totalDistanceKm: number;
  validationWarnings?: string[];
}

interface RouteSuggestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  area?: string;
  onRoutesCreated: () => void;
}

export function RouteSuggestionDialog({
  open,
  onOpenChange,
  area,
  onRoutesCreated,
}: RouteSuggestionDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [suggestedRoutes, setSuggestedRoutes] = useState<SuggestedRoute[]>([]);
  const [routes, setRoutes] = useState<SuggestedRoute[]>([]);
  const [returnRoutes, setReturnRoutes] = useState<SuggestedRoute[]>([]);
  const [editingRouteIndex, setEditingRouteIndex] = useState<number | null>(null);
  const [editingStops, setEditingStops] = useState<SuggestedStop[]>([]);
  const [routeNames, setRouteNames] = useState<Record<number, string>>({});
  const [selectedRoutes, setSelectedRoutes] = useState<Set<number>>(new Set());
  const [expandedRoutes, setExpandedRoutes] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "di" | "ve">("all");
  const [unassignedStudents, setUnassignedStudents] = useState<Array<{
    maHocSinh: number;
    hoTen: string;
    diaChi?: string;
    missingCoords: boolean;
    reason?: string;
  }>>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [assignedStudents, setAssignedStudents] = useState(0);
  const [creatingProgress, setCreatingProgress] = useState<{ current: number; total: number } | null>(null);

  // Load suggestions khi mở dialog
  useEffect(() => {
    if (open && suggestedRoutes.length === 0) {
      handleLoadSuggestions();
    }
  }, [open]);

  const handleLoadSuggestions = async () => {
    try {
      setLoading(true);
      const response = await apiClient.suggestRoutes({
        area: area || undefined,
        maxStudentsPerRoute: 35, // Mỗi tuyến 30-40 học sinh
        minStudentsPerRoute: 30,
        maxStopsPerRoute: 35, // Dưới 40 điểm dừng
        maxDistanceKm: 1.5, // Gom học sinh gần nhau hơn
        minStudentsPerStop: 1,
        createReturnRoutes: true, // Tạo tuyến về tương ứng
      } as any);

      const data = (response as any).data || {};
      const routes = data.routes || [];
      const returnRoutes = data.returnRoutes || [];
      const unassigned = data.unassignedStudents || [];
      const total = data.totalStudents || 0;
      const assigned = data.assignedStudents || 0;

      // Lưu thông tin học sinh
      setUnassignedStudents(unassigned);
      setTotalStudents(total);
      setAssignedStudents(assigned);

      if (routes.length === 0) {
        toast({
          title: "Không có đề xuất",
          description: unassigned.length > 0 
            ? `Không tìm thấy tuyến đường nào. Có ${unassigned.length} học sinh chưa có tọa độ.`
            : "Không tìm thấy tuyến đường nào để đề xuất",
          variant: "default",
        });
        return;
      }

      // Lưu riêng tuyến đi và tuyến về
      setRoutes(routes);
      setReturnRoutes(returnRoutes);
      
      // Kết hợp tuyến đi và tuyến về để hiển thị
      const allRoutes = [...routes, ...returnRoutes];
      setSuggestedRoutes(allRoutes);
      
      // Khởi tạo tên tuyến mặc định
      const names: Record<number, string> = {};
      allRoutes.forEach((route: SuggestedRoute, index: number) => {
        names[index] = route.name || `Tuyến ${index + 1}`;
      });
      setRouteNames(names);
      // Chọn tất cả tuyến mặc định
      setSelectedRoutes(new Set(allRoutes.map((_: any, i: number) => i)));
      
      toast({
        title: "Thành công",
        description: `Đã tìm thấy ${routes.length} tuyến đi và ${returnRoutes.length} tuyến về. ${assigned}/${total} học sinh đã được gán.${unassigned.length > 0 ? ` ${unassigned.length} học sinh chưa có tọa độ.` : ''}`,
        variant: "default",
      });
    } catch (error: any) {
      console.error("Failed to load route suggestions:", error);
      toast({
        title: "Lỗi",
        description: error?.message || "Không thể tải đề xuất tuyến đường",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditRoute = (index: number) => {
    setEditingRouteIndex(index);
    setEditingStops([...suggestedRoutes[index].stops]);
  };

  const handleSaveEdit = (index: number) => {
    const updatedRoutes = [...suggestedRoutes];
    updatedRoutes[index] = {
      ...updatedRoutes[index],
      stops: editingStops.map((stop, idx) => ({
        ...stop,
        sequence: idx + 1,
      })),
      totalStudents: editingStops.reduce(
        (sum, stop) => sum + (stop.studentCount || 0),
        0
      ),
    };
    setSuggestedRoutes(updatedRoutes);
    setEditingRouteIndex(null);
    setEditingStops([]);
    toast({
      title: "Đã lưu",
      description: "Đã cập nhật tuyến đường",
    });
  };

  const handleCancelEdit = () => {
    setEditingRouteIndex(null);
    setEditingStops([]);
  };

  const handleDeleteStop = (routeIndex: number, stopIndex: number) => {
    if (editingRouteIndex === routeIndex) {
      const newStops = editingStops.filter((_, idx) => idx !== stopIndex);
      setEditingStops(newStops);
    }
  };

  const handleToggleRoute = (index: number) => {
    const newSelected = new Set(selectedRoutes);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRoutes(newSelected);
  };

  const handleToggleExpand = (index: number) => {
    const newExpanded = new Set(expandedRoutes);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRoutes(newExpanded);
  };

  const handleSelectAll = () => {
    const currentRoutes = getFilteredRoutes();
    const indices = currentRoutes.map((route) => 
      suggestedRoutes.findIndex((r) => r === route)
    ).filter((idx) => idx !== -1);
    setSelectedRoutes(new Set([...selectedRoutes, ...indices]));
  };

  const handleDeselectAll = () => {
    setSelectedRoutes(new Set());
  };

  const getFilteredRoutes = () => {
    let filtered = suggestedRoutes;
    
    // Lọc theo tab
    if (activeTab === "di") {
      filtered = routes;
    } else if (activeTab === "ve") {
      filtered = returnRoutes;
    }
    
    // Lọc theo search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (route) =>
          route.name.toLowerCase().includes(query) ||
          route.origin.address.toLowerCase().includes(query) ||
          route.destination.address.toLowerCase().includes(query) ||
          route.stops.some((stop) => stop.address.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  };

  const handleCreateRoutes = async () => {
    if (selectedRoutes.size === 0) {
      toast({
        title: "Chưa chọn tuyến",
        description: "Vui lòng chọn ít nhất một tuyến đường",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      setCreatingProgress({ current: 0, total: selectedRoutes.size });
      
      const routesToCreate = Array.from(selectedRoutes)
        .map((index) => suggestedRoutes[index])
        .filter(Boolean);

      // Chuẩn bị payload cho batch API
      const selectedIndices = Array.from(selectedRoutes).sort((a, b) => a - b);
      const batchPayload = routesToCreate.map((route, i) => {
        const originalIndex = selectedIndices[i];
        const routeName = routeNames[originalIndex] || route.name;
        const sortedStops = [...route.stops].sort((a, b) => a.sequence - b.sequence);

        return {
          tenTuyen: routeName,
          diemBatDau: route.origin.address,
          diemKetThuc: route.destination.address,
          thoiGianUocTinh: route.estimatedTimeMinutes,
          origin_lat: route.origin.lat,
          origin_lng: route.origin.lng,
          dest_lat: route.destination.lat,
          dest_lng: route.destination.lng,
          routeType: route.routeType || (route.name.includes('(Về)') ? 've' : 'di'),
          stops: sortedStops.map(stop => ({
            tenDiem: stop.address || `Điểm ${stop.sequence}`,
            viDo: stop.lat,
            kinhDo: stop.lng,
            sequence: stop.sequence,
            address: stop.address,
          })),
        };
      });

      // Gọi batch API
      setCreatingProgress({ current: 0, total: batchPayload.length });
      const result = await apiClient.createRoutesBatch(batchPayload);
      const resultData = (result as any).data || result;

      if (resultData.success) {
        const successCount = resultData.created?.length || 0;
        const errorCount = resultData.errors?.length || 0;

        toast({
          title: successCount > 0 ? "Thành công" : "Có lỗi xảy ra",
          description: errorCount > 0
            ? `Đã tạo ${successCount}/${batchPayload.length} tuyến đường. ${errorCount} tuyến có lỗi.`
            : `Đã tạo thành công ${successCount} tuyến đường`,
          variant: errorCount > 0 ? "default" : "default",
        });

        // Hiển thị chi tiết lỗi nếu có
        if (errorCount > 0 && resultData.errors) {
          const errorMessages = resultData.errors.map((e: any) => 
            `${e.tenTuyen || `Tuyến ${e.routeIndex}`}: ${e.error}`
          ).join('\n');
          
          toast({
            title: "Chi tiết lỗi",
            description: errorMessages,
            variant: "destructive",
            duration: 10000,
          });
        }

        onRoutesCreated();
        onOpenChange(false);
        // Reset state
        setSuggestedRoutes([]);
        setSelectedRoutes(new Set());
        setRouteNames({});
        setUnassignedStudents([]);
      } else {
        // Transaction failed
        const errorMessages = resultData.errors?.map((e: any) => 
          `${e.tenTuyen || `Tuyến ${e.routeIndex}`}: ${e.error}`
        ).join('\n') || resultData.message || 'Không thể tạo tuyến đường';

        toast({
          title: "Lỗi",
          description: errorMessages,
          variant: "destructive",
          duration: 10000,
        });
      }
    } catch (error: any) {
      console.error("Failed to create routes:", error);
      toast({
        title: "Lỗi",
        description: error?.response?.data?.error?.message || error?.message || "Không thể tạo tuyến đường",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setCreatingProgress(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Đề xuất tuyến đường
          </DialogTitle>
          <DialogDescription>
            Hệ thống đã đề xuất các tuyến đường dựa trên địa chỉ học sinh. Bạn có thể xem xét và chỉnh sửa trước khi tạo.
            {unassignedStudents.length > 0 && (
              <span className="block mt-2 text-amber-600 dark:text-amber-400">
                ⚠️ Có {unassignedStudents.length} học sinh chưa được gán vào tuyến vì thiếu tọa độ.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0 flex-shrink">
          {loading && suggestedRoutes.length === 0 ? (
            <div className="flex items-center justify-center py-12 px-6">
              <div className="text-center">
                <Sparkles className="w-8 h-8 mx-auto mb-2 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Đang phân tích và đề xuất tuyến đường...</p>
              </div>
            </div>
          ) : suggestedRoutes.length === 0 ? (
            <div className="flex items-center justify-center py-12 px-6">
              <div className="text-center">
                <Route className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Chưa có đề xuất nào</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoadSuggestions}
                  className="mt-4"
                >
                  Tải đề xuất
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Summary và Unassigned Students */}
              {(totalStudents > 0 || unassignedStudents.length > 0) && (
                <div className="px-6 py-3 flex-shrink-0 border-b bg-muted/30">
                  <div className="flex items-center justify-between flex-wrap gap-2 text-sm">
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground">
                        Tổng: <span className="font-medium text-foreground">{totalStudents}</span> học sinh
                      </span>
                      <span className="text-green-600 dark:text-green-400">
                        Đã gán: <span className="font-medium">{assignedStudents}</span>
                      </span>
                      {unassignedStudents.length > 0 && (
                        <span className="text-amber-600 dark:text-amber-400">
                          Chưa gán: <span className="font-medium">{unassignedStudents.length}</span>
                        </span>
                      )}
                    </div>
                    {unassignedStudents.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        Vui lòng xử lý thủ công các học sinh chưa có tọa độ
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Search và Filter */}
              <div className="px-6 py-4 flex-shrink-0 space-y-3 border-b bg-background">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Tìm kiếm tuyến đường, địa chỉ..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-auto">
                    <TabsList>
                      <TabsTrigger value="all">Tất cả ({suggestedRoutes.length})</TabsTrigger>
                      <TabsTrigger value="di">Tuyến đi ({routes.length})</TabsTrigger>
                      <TabsTrigger value="ve">Tuyến về ({returnRoutes.length})</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                    >
                      <CheckSquare className="w-4 h-4 mr-1" />
                      Chọn tất cả
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeselectAll}
                    >
                      <Square className="w-4 h-4 mr-1" />
                      Bỏ chọn
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="px-6 py-4 space-y-3">
                  {getFilteredRoutes().map((route, filteredIndex) => {
                    // Tìm index thực trong suggestedRoutes
                    const actualIndex = suggestedRoutes.findIndex((r) => r === route);
                    const isEditing = editingRouteIndex === actualIndex;
                    const isSelected = selectedRoutes.has(actualIndex);
                    const isExpanded = expandedRoutes.has(actualIndex);
                    const stops = isEditing ? editingStops : route.stops;
                    const isReturnRoute = route.name.includes("(Về)");

                    return (
                      <Card
                        key={actualIndex}
                        className={`border-2 transition-all ${
                          isSelected 
                            ? isReturnRoute 
                              ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20" 
                              : "border-primary bg-primary/5" 
                            : "border-border"
                        }`}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleRoute(actualIndex)}
                                className="w-4 h-4 mt-1 flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                {isEditing ? (
                                  <Input
                                    value={routeNames[actualIndex] || route.name}
                                    onChange={(e) =>
                                      setRouteNames({
                                        ...routeNames,
                                        [actualIndex]: e.target.value,
                                      })
                                    }
                                    className="mb-2"
                                    placeholder="Tên tuyến đường"
                                  />
                                ) : (
                                  <div className="flex items-center gap-2 mb-2">
                                    <CardTitle className="text-base font-semibold truncate">
                                      {routeNames[actualIndex] || route.name}
                                    </CardTitle>
                                    {isReturnRoute ? (
                                      <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                                        <ArrowLeft className="w-3 h-3 mr-1" />
                                        Về
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                                        <ArrowRight className="w-3 h-3 mr-1" />
                                        Đi
                                      </Badge>
                                    )}
                                  </div>
                                )}
                                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Users className="w-3.5 h-3.5" />
                                    <span className="font-medium">{route.totalStudents}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5" />
                                    <span>{route.stops.length}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>~{route.estimatedTimeMinutes}p</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Navigation className="w-3.5 h-3.5" />
                                    <span>{route.totalDistanceKm.toFixed(1)}km</span>
                                  </div>
                                </div>
                                {!isExpanded && (
                                  <div className="mt-2 text-xs text-muted-foreground truncate">
                                    <span className="font-medium">Từ:</span> {route.origin.address}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {isEditing ? (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSaveEdit(actualIndex)}
                                  >
                                    <Check className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCancelEdit}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleToggleExpand(actualIndex)}
                                  >
                                    {isExpanded ? (
                                      <ChevronUp className="w-4 h-4" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditRoute(actualIndex)}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        
                        {isExpanded && (
                          <CardContent className="pt-0">
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="font-medium text-muted-foreground">Điểm xuất phát:</span>
                                  <p className="mt-0.5">{route.origin.address}</p>
                                </div>
                                <div>
                                  <span className="font-medium text-muted-foreground">Điểm đến:</span>
                                  <p className="mt-0.5">{route.destination.address}</p>
                                </div>
                              </div>
                              <Separator />
                              <div>
                                <Label className="text-xs font-medium mb-2 block">
                                  Danh sách điểm dừng ({stops.length})
                                </Label>
                                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                                  {stops.map((stop, stopIndex) => (
                                    <div
                                      key={stopIndex}
                                      className="flex items-center gap-2 p-2 bg-muted/30 rounded text-xs hover:bg-muted/50 transition-colors"
                                    >
                                      <Badge variant="outline" className="w-7 h-7 flex items-center justify-center text-xs flex-shrink-0">
                                        {stop.sequence}
                                      </Badge>
                                      <div className="flex-1 min-w-0">
                                        <div className="font-medium truncate">{stop.address}</div>
                                        <div className="text-muted-foreground text-[10px]">
                                          {stop.studentCount} học sinh
                                        </div>
                                      </div>
                                      {isEditing && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0 flex-shrink-0"
                                          onClick={() => handleDeleteStop(actualIndex, stopIndex)}
                                        >
                                          <Trash2 className="w-3 h-3 text-destructive" />
                                        </Button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 pb-4 px-6 border-t flex-shrink-0 bg-background sticky bottom-0">
                <div className="text-sm">
                  <span className="font-medium text-foreground">
                    Đã chọn {selectedRoutes.size}
                  </span>
                  <span className="text-muted-foreground">
                    /{suggestedRoutes.length} tuyến đường
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Hủy
                  </Button>
                  <Button
                    onClick={handleCreateRoutes}
                    disabled={loading || selectedRoutes.size === 0}
                  >
                    {loading ? (
                      creatingProgress ? (
                        `Đang tạo... ${creatingProgress.current}/${creatingProgress.total}`
                      ) : (
                        "Đang tạo..."
                      )
                    ) : (
                      `Tạo ${selectedRoutes.size} tuyến đường`
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

