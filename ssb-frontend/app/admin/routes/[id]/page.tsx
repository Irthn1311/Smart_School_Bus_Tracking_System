'use client';

import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useRouteDetail, useReorderStops, useRemoveStopFromRoute, useRebuildPolyline, useAddStopToRoute } from '@/lib/hooks/useRoutes';
import { useStopsList, useCreateStop } from '@/lib/hooks/useStops';
import SSBMap, { StopDTO } from '@/components/map/SSBMap';
import { GripVertical, Plus, Trash2, RefreshCw, ArrowLeft, MapPin, Clock, Edit } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
import { RouteBuilder } from '@/components/admin/route-builder';
import { useQueryClient } from '@tanstack/react-query';
import { routeKeys } from '@/lib/hooks/useRoutes';
import { useSocket } from '@/hooks/use-socket';
import socketService from '@/lib/socket';

// Dynamic import for AddStopDialog to reduce initial bundle
const AddStopDialog = dynamic(() => import('@/components/admin/AddStopDialog'), {
  loading: () => <div>Đang tải...</div>,
});

function SortableStopItem({ stop, onDelete }: { stop: StopDTO; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stop.maDiem,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 p-3 border rounded-lg bg-card">
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="w-5 h-5 text-muted-foreground" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="w-8 h-8 flex items-center justify-center">
            {stop.sequence}
          </Badge>
          <h4 className="font-semibold">{stop.tenDiem}</h4>
        </div>
        {stop.address && <p className="text-sm text-muted-foreground mt-1">{stop.address}</p>}
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          {stop.viDo != null && stop.kinhDo != null && (
            <span>📍 {Number(stop.viDo).toFixed(6)}, {Number(stop.kinhDo).toFixed(6)}</span>
          )}
          {stop.dwell_seconds && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Dừng: {stop.dwell_seconds}s
            </span>
          )}
        </div>
      </div>
      <Button variant="ghost" size="icon" onClick={onDelete} className="text-destructive hover:text-destructive">
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}

export default function RouteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const routeId = params.id as string;
  const queryClient = useQueryClient();
  const { isConnected } = useSocket();

  const { data: route, isLoading, error } = useRouteDetail(routeId);
  const reorderMutation = useReorderStops();
  const removeMutation = useRemoveStopFromRoute();
  const rebuildMutation = useRebuildPolyline();
  const addStopMutation = useAddStopToRoute();
  const createStopMutation = useCreateStop();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [deleteStopId, setDeleteStopId] = useState<number | null>(null);

  // P2 Fix: Join route room and listen for route_updated socket event (auto-refresh after rebuild polyline)
  useEffect(() => {
    if (!isConnected || !routeId) return;

    // Join route room to receive route_updated events
    socketService.joinRoute(routeId);
    console.log(`[RouteDetail] Joined route room: route:${routeId}`);

    const handleRouteUpdated = (event: Event) => {
      const data = (event as CustomEvent).detail;
      const updatedRouteId = data?.routeId || data?.route_id;
      
      // Only handle if it's this route
      if (updatedRouteId && String(updatedRouteId) === String(routeId)) {
        console.log('[RouteDetail] Received route_updated event, invalidating queries');
        // Invalidate route detail query to refetch with new polyline
        queryClient.invalidateQueries({ queryKey: routeKeys.detail(routeId) });
        toast.success('Đường đi đã được cập nhật tự động');
      }
    };

    window.addEventListener('routeUpdated', handleRouteUpdated as EventListener);
    return () => {
      window.removeEventListener('routeUpdated', handleRouteUpdated as EventListener);
      // Leave route room on unmount
      socketService.leaveRoute(routeId);
    };
  }, [isConnected, routeId, queryClient, toast]);

  // Only fetch stops list when dialog is open
  const { data: stopsListData } = useStopsList(
    isAddDialogOpen ? { limit: 100 } : undefined
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const stops = route?.stops || [];
  // Ensure viDo and kinhDo are numbers, and format matches StopDTO
  const sortedStops: StopDTO[] = [...stops]
    .map((stop: any) => {
      const viDoNum = stop.viDo != null ? Number(stop.viDo) : NaN;
      const kinhDoNum = stop.kinhDo != null ? Number(stop.kinhDo) : NaN;
      return {
        maDiem: stop.maDiem || stop.stop_id || stop.id,
        tenDiem: stop.tenDiem || stop.name || '',
        viDo: viDoNum,
        kinhDo: kinhDoNum,
        address: stop.address || null,
        sequence: stop.sequence || stop.thuTu || 0,
        dwell_seconds: stop.dwell_seconds || stop.dwellSeconds || undefined,
      } as StopDTO;
    })
    .filter((stop): stop is StopDTO => 
      !isNaN(stop.viDo) && !isNaN(stop.kinhDo) &&
      isFinite(stop.viDo) && isFinite(stop.kinhDo) &&
      stop.viDo >= -90 && stop.viDo <= 90 &&
      stop.kinhDo >= -180 && stop.kinhDo <= 180
    )
    .sort((a, b) => (a.sequence || 0) - (b.sequence || 0));

  // Debug logging
  useEffect(() => {
    if (route) {
      console.log('[RouteDetail] Route data:', {
        routeId: route.maTuyen || route.id,
        polyline: route.polyline ? `${route.polyline.substring(0, 50)}...` : 'null/undefined',
        stopsCount: stops.length,
        sortedStopsCount: sortedStops.length,
        firstStop: sortedStops[0],
      });
    }
  }, [route, stops.length, sortedStops.length]);

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sortedStops.findIndex((s) => s.maDiem === active.id);
    const newIndex = sortedStops.findIndex((s) => s.maDiem === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newStops = arrayMove(sortedStops, oldIndex, newIndex);
    const items = newStops.map((stop, index) => ({
      stop_id: stop.maDiem,
      sequence: index + 1,
    }));

    reorderMutation.mutate({ routeId, items });
  };

  const handleDeleteStop = (stopId: number) => {
    setDeleteStopId(stopId);
  };

  const confirmDelete = () => {
    if (deleteStopId) {
      removeMutation.mutate({ routeId, stopId: deleteStopId });
      setDeleteStopId(null);
    }
  };

  const handleRebuildPolyline = () => {
    rebuildMutation.mutate(routeId, {
      onSuccess: () => {
        toast.success('Đã tái tạo đường đi');
      },
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout sidebar={<AdminSidebar />}>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  // Show error message if there's an error
  if (error) {
    const errorMessage = error instanceof Error ? error.message : 'Không thể tải thông tin tuyến đường';
    const isConnectionError = errorMessage.includes('Không thể kết nối') || 
                              errorMessage.includes('server') ||
                              (error as any)?.code === 'NETWORK_ERROR' ||
                              (error as any)?.code === 'CONNECTION_REFUSED';
    
    return (
      <DashboardLayout sidebar={<AdminSidebar />}>
        <div className="space-y-6">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6">
            <h2 className="text-lg font-semibold text-destructive mb-2">
              Lỗi khi tải thông tin tuyến đường
            </h2>
            <p className="text-destructive mb-4">{errorMessage}</p>
            {isConnectionError && (
              <div className="mt-4 p-4 bg-background rounded border">
                <p className="text-sm font-medium mb-2">💡 Cách khắc phục:</p>
                <ol className="list-decimal list-inside text-sm space-y-1 text-muted-foreground">
                  <li>Mở terminal và chạy: <code className="bg-muted px-1 rounded">cd ssb-backend && npm run dev</code></li>
                  <li>Đợi backend khởi động hoàn tất (thấy log "Server is running on port 4000")</li>
                  <li>Refresh trang này hoặc click nút "Thử lại" bên dưới</li>
                </ol>
              </div>
            )}
            <div className="flex gap-2 mt-4">
              <Button 
                onClick={() => router.refresh()} 
                variant="outline"
              >
                Thử lại
              </Button>
              <Button 
                onClick={() => router.push('/admin/routes')} 
                variant="ghost"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Quay lại danh sách
              </Button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!route) {
    return (
      <DashboardLayout sidebar={<AdminSidebar />}>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">Không tìm thấy thông tin tuyến đường</p>
            <Button onClick={() => router.push('/admin/routes')} className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Quay lại
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  // Show RouteBuilder in edit mode
  if (isEditMode) {
    return (
      <DashboardLayout sidebar={<AdminSidebar />}>
        <RouteBuilder
          mode="edit"
          initialRoute={{
            id: routeId,
            name: route.tenTuyen,
            diemBatDau: route.diemBatDau,
            diemKetThuc: route.diemKetThuc,
            stops: sortedStops,
          }}
          onClose={() => setIsEditMode(false)}
          onSaved={() => {
            setIsEditMode(false);
            toast.success('Đã cập nhật tuyến đường');
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
            <Button variant="ghost" onClick={() => router.push('/admin/routes')} className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Quay lại
            </Button>
            <h1 className="text-3xl font-bold">{route.tenTuyen}</h1>
            <p className="text-muted-foreground mt-1">
              {route.diemBatDau} → {route.diemKetThuc}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsEditMode(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Chỉnh sửa
            </Button>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Thêm điểm dừng
            </Button>
            <Button
              variant="outline"
              onClick={handleRebuildPolyline}
              disabled={rebuildMutation.isPending}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${rebuildMutation.isPending ? 'animate-spin' : ''}`} />
              Tái tạo đường đi
            </Button>
          </div>
        </div>

        {/* Map */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Bản đồ tuyến đường
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SSBMap
              center={
                sortedStops.length > 0 && sortedStops[0].viDo != null && sortedStops[0].kinhDo != null
                  ? { lat: sortedStops[0].viDo, lng: sortedStops[0].kinhDo }
                  : route.origin_lat != null && route.origin_lng != null &&
                    !isNaN(Number(route.origin_lat)) && !isNaN(Number(route.origin_lng)) &&
                    isFinite(Number(route.origin_lat)) && isFinite(Number(route.origin_lng))
                  ? { lat: Number(route.origin_lat), lng: Number(route.origin_lng) }
                  : { lat: 10.760064662799088, lng: 106.6822422067464 }
              }
              zoom={sortedStops.length > 0 ? 14 : 13}
              polyline={route.polyline || null}
              stops={sortedStops}
              height="500px"
              autoFitOnUpdate={sortedStops.length > 0}
            />
          </CardContent>
        </Card>

        {/* Stops List */}
        <Card>
          <CardHeader>
            <CardTitle>Danh sách điểm dừng ({sortedStops.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {sortedStops.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Chưa có điểm dừng nào</p>
                <Button onClick={() => setIsAddDialogOpen(true)} className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Thêm điểm dừng đầu tiên
                </Button>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={sortedStops.map((s) => s.maDiem)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {sortedStops.map((stop) => (
                      <SortableStopItem
                        key={stop.maDiem}
                        stop={stop}
                        onDelete={() => handleDeleteStop(stop.maDiem)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </CardContent>
        </Card>

        {/* Add Stop Dialog */}
        {isAddDialogOpen && (
          <AddStopDialog
            routeId={routeId}
            existingStops={Array.isArray(stopsListData?.data) ? stopsListData.data : []}
            currentRouteStops={sortedStops}
            onClose={() => setIsAddDialogOpen(false)}
            onAddStop={(data) => {
              addStopMutation.mutate({ routeId, data }, { onSuccess: () => setIsAddDialogOpen(false) });
            }}
            onCreateStop={(data) => {
              createStopMutation.mutate(data, {
                onSuccess: (response) => {
                  const newStopId = (response.data as any)?.maDiem;
                  if (newStopId) {
                    addStopMutation.mutate(
                      { routeId, data: { stop_id: newStopId } },
                      { onSuccess: () => setIsAddDialogOpen(false) }
                    );
                  }
                },
              });
            }}
          />
        )}

        {/* Delete Confirmation */}
        <AlertDialog open={deleteStopId !== null} onOpenChange={(open: boolean) => !open && setDeleteStopId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
              <AlertDialogDescription>
                Bạn có chắc chắn muốn xóa điểm dừng này khỏi tuyến? Điểm dừng sẽ không bị xóa khỏi hệ thống.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Hủy</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
                Xóa
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}

