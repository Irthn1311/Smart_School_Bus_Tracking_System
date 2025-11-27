'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Plus, 
  Trash2, 
  MapPin, 
  Clock, 
  Save, 
  X, 
  GripVertical,
  Navigation,
  Route as RouteIcon,
  Search,
  Route,
  Timer,
  CheckCircle2,
  XCircle,
  Zap,
  Sparkles,
  Users
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import apiClient from '@/lib/api-client';
import { loadGoogleMaps } from '@/lib/maps/googleLoader';
import PlacePicker from '@/lib/maps/PlacePicker';
import { useQueryClient } from '@tanstack/react-query';
import { routeKeys } from '@/lib/hooks/useRoutes';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Stop {
  id: string;
  name: string;
  address: string;
  lat?: number;
  lng?: number;
  estimatedTime: string;
  sequence: number;
}

interface RouteBuilderProps {
  mode?: 'create' | 'edit';
  initialRoute?: {
    id?: string | number;
    name?: string;
    diemBatDau?: string;
    diemKetThuc?: string;
    stops?: any[];
  };
  onClose: () => void;
  onSaved?: (route?: any) => void;
}

export function RouteBuilder({ 
  mode = 'create', 
  initialRoute,
  onClose,
  onSaved 
}: RouteBuilderProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const studentMarkersRef = useRef<Map<number, google.maps.Marker>>(new Map());
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const clickListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  
  const [routeName, setRouteName] = useState(initialRoute?.name || '');
  // Điểm bắt đầu và điểm kết thúc cũng là các điểm dừng
  const [originStop, setOriginStop] = useState<Stop | null>(() => {
    if (initialRoute?.stops && initialRoute.stops.length > 0) {
      const firstStop = initialRoute.stops[0];
      if (firstStop && (firstStop.viDo || firstStop.latitude)) {
        return {
          id: 'origin',
          name: initialRoute.diemBatDau || firstStop.tenDiem || firstStop.name || 'Điểm bắt đầu',
          address: firstStop.diaChi || firstStop.address || '',
          lat: firstStop.viDo || firstStop.latitude,
          lng: firstStop.kinhDo || firstStop.longitude,
          estimatedTime: '',
          sequence: 1,
        };
      }
    }
    return null;
  });
  const [destinationStop, setDestinationStop] = useState<Stop | null>(() => {
    if (initialRoute?.stops && initialRoute.stops.length > 0) {
      const lastStop = initialRoute.stops[initialRoute.stops.length - 1];
      if (lastStop && (lastStop.viDo || lastStop.latitude)) {
        return {
          id: 'destination',
          name: initialRoute.diemKetThuc || lastStop.tenDiem || lastStop.name || 'Điểm kết thúc',
          address: lastStop.diaChi || lastStop.address || '',
          lat: lastStop.viDo || lastStop.latitude,
          lng: lastStop.kinhDo || lastStop.longitude,
          estimatedTime: '',
          sequence: 999, // Sẽ được cập nhật khi lưu
        };
      }
    }
    return null;
  });
  // Các điểm dừng trung gian (không bao gồm điểm bắt đầu và điểm kết thúc)
  const [stops, setStops] = useState<Stop[]>(() => {
    if (initialRoute?.stops && initialRoute.stops.length > 2) {
      // Bỏ qua điểm đầu và điểm cuối
      return initialRoute.stops.slice(1, -1).map((s: any, idx: number) => ({
        id: String(s.maDiem || s.id || idx + 2),
        name: s.tenDiem || s.name || '',
        address: s.diaChi || s.address || '',
        lat: s.viDo || s.latitude,
        lng: s.kinhDo || s.longitude,
        estimatedTime: s.thoiGianDung || s.estimatedTime || '',
        sequence: s.thuTu || s.sequence || idx + 2,
      }));
    }
    return [];
  });
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [polyline, setPolyline] = useState<string | null>(null);
  const [routeSegments, setRouteSegments] = useState<Array<{ polyline: string; from: number; to: number }>>([]);
  const [routeInfo, setRouteInfo] = useState<{ distance?: string; duration?: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mapMode, setMapMode] = useState<'view' | 'add'>('view');
  const [draggedMarkerId, setDraggedMarkerId] = useState<string | null>(null);
  const [pendingStop, setPendingStop] = useState<Stop | null>(null);
  const pendingMarkerRef = useRef<google.maps.Marker | null>(null);
  const [allSuggestions, setAllSuggestions] = useState<Array<{
    id: string;
    name: string;
    address: string;
    lat?: number;
    lng?: number;
    studentCount: number;
    students: Array<{ maHocSinh: number; hoTen: string; diaChi: string }>;
    suggestedSequence: number;
  }>>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // State cho học sinh gần điểm dừng
  const [nearbyStudents, setNearbyStudents] = useState<Array<{
    maHocSinh: number;
    hoTen: string;
    lop: string;
    diaChi: string;
    viDo: number;
    kinhDo: number;
    anhDaiDien?: string | null;
    distanceMeters: number;
    distanceKm: number;
  }>>([]);
  const [loadingNearbyStudents, setLoadingNearbyStudents] = useState(false);
  const [selectedStopForStudents, setSelectedStopForStudents] = useState<{ lat: number; lng: number; name: string; stopId?: string } | null>(null);
  
  // State để lưu học sinh đã chọn cho mỗi điểm dừng (khi chưa có route ID)
  // Key: stop ID (pending stop ID hoặc confirmed stop ID), Value: array of student IDs
  const [selectedStudentsByStop, setSelectedStudentsByStop] = useState<Map<string, number[]>>(new Map());
  
  // State cho việc hiển thị TẤT CẢ học sinh trên bản đồ
  const [showAllStudents, setShowAllStudents] = useState(false);
  const [allStudents, setAllStudents] = useState<Array<{
    maHocSinh: number;
    hoTen: string;
    lop: string;
    diaChi: string;
    viDo: number;
    kinhDo: number;
    anhDaiDien?: string;
  }>>([]);
  const [loadingAllStudents, setLoadingAllStudents] = useState(false);
  const allStudentMarkersRef = useRef<Map<number, google.maps.Marker>>(new Map());
  const studentToStopPolylinesRef = useRef<Map<number, google.maps.Polyline>>(new Map());
  const [showStudentRoutes, setShowStudentRoutes] = useState(false);

  // Tính thời gian dừng dựa trên số học sinh (1 phút/3 học sinh, tối đa 5 phút)
  const calculateEstimatedTime = (studentCount: number): string => {
    const minutes = Math.min(Math.ceil(studentCount / 3), 5);
    return String(minutes);
  };

  // Lọc suggestions để chỉ hiển thị những điểm chưa được thêm vào stops
  const filteredSuggestions = allSuggestions.filter((suggestion) => {
    if (!suggestion.lat || !suggestion.lng) return true; // Giữ lại những điểm chưa có tọa độ
    
    // Kiểm tra xem điểm này đã có trong stops chưa (so sánh theo lat/lng với tolerance 0.0001)
    const tolerance = 0.0001;
    return !stops.some((stop) => {
      if (!stop.lat || !stop.lng) return false;
      const latDiff = Math.abs(stop.lat - suggestion.lat!);
      const lngDiff = Math.abs(stop.lng - suggestion.lng!);
      return latDiff < tolerance && lngDiff < tolerance;
    });
  });

  // Clear pending stop when map mode changes to view
  useEffect(() => {
    if (mapMode === 'view' && pendingStop) {
      setPendingStop(null);
      // Remove pending marker from map
      if (pendingMarkerRef.current) {
        pendingMarkerRef.current.setMap(null);
        pendingMarkerRef.current = null;
      }
    }
  }, [mapMode, pendingStop]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Initialize map
  useEffect(() => {
    let mounted = true;

    const initMap = async () => {
      try {
        // Wait for Google Maps to load
        const google = await loadGoogleMaps();
        if (!mounted || !mapRef.current) return;

        // Wait a bit more to ensure all constructors are available
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Double check that Map constructor is available
        if (!window.google?.maps?.Map) {
          // Try waiting a bit more
          await new Promise((resolve) => setTimeout(resolve, 500));
          if (!window.google?.maps?.Map) {
            throw new Error('Google Maps Map constructor is not available. Please check your API key and network connection.');
          }
        }

        const googleMaps = window.google.maps;
        if (!googleMaps || !googleMaps.Map) {
          throw new Error('Google Maps Map constructor is not available');
        }

        const map = new googleMaps.Map(mapRef.current, {
          center: { lat: 10.77653, lng: 106.700981 },
          zoom: 13,
          minZoom: 10, // Không cho zoom out quá mức để tránh clustering
          maxZoom: 20, // Cho phép zoom in để thấy rõ từng marker
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
          // Tắt clustering tự động
          gestureHandling: 'greedy',
        });

        mapInstanceRef.current = map;
        setIsMapReady(true);
      } catch (error) {
        console.error('Failed to initialize map:', error);
        toast({
          title: 'Lỗi',
          description: error instanceof Error ? error.message : 'Không thể khởi tạo bản đồ',
          variant: 'destructive',
        });
      }
    };

    initMap();

    return () => {
      mounted = false;
      if (clickListenerRef.current && mapInstanceRef.current && window.google?.maps) {
        window.google.maps.event.removeListener(clickListenerRef.current);
      }
    };
  }, [toast]);

  // Update click listener when mapMode changes
  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current) return;

    // Remove old listener
    if (clickListenerRef.current && window.google?.maps) {
      window.google.maps.event.removeListener(clickListenerRef.current);
      clickListenerRef.current = null;
    }

    // Add new listener if in add mode
    if (mapMode === 'add' && window.google?.maps) {
      const listener = mapInstanceRef.current.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          handleMapClick(e.latLng.lat(), e.latLng.lng());
        }
      });
      clickListenerRef.current = listener;
    }

    return () => {
      if (clickListenerRef.current && mapInstanceRef.current && window.google?.maps) {
        window.google.maps.event.removeListener(clickListenerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapMode, isMapReady]);

  // Load initial route data when in edit mode and initialRoute changes
  useEffect(() => {
    if (mode === 'edit' && initialRoute) {
      // Update route name
      if (initialRoute.name && !routeName) {
        setRouteName(initialRoute.name);
      }
      
      // Update origin and destination if not already set
      if (initialRoute.stops && initialRoute.stops.length > 0) {
        const firstStop = initialRoute.stops[0];
        if (firstStop && (firstStop.viDo || firstStop.latitude) && !originStop) {
          setOriginStop({
            id: 'origin',
            name: initialRoute.diemBatDau || firstStop.tenDiem || firstStop.name || 'Điểm bắt đầu',
            address: firstStop.diaChi || firstStop.address || '',
            lat: firstStop.viDo || firstStop.latitude,
            lng: firstStop.kinhDo || firstStop.longitude,
            estimatedTime: '',
            sequence: 1,
          });
        }
        
        const lastStop = initialRoute.stops[initialRoute.stops.length - 1];
        if (lastStop && (lastStop.viDo || lastStop.latitude) && !destinationStop) {
          setDestinationStop({
            id: 'destination',
            name: initialRoute.diemKetThuc || lastStop.tenDiem || lastStop.name || 'Điểm kết thúc',
            address: lastStop.diaChi || lastStop.address || '',
            lat: lastStop.viDo || lastStop.latitude,
            lng: lastStop.kinhDo || lastStop.longitude,
            estimatedTime: '',
            sequence: 999,
          });
        }
        
        // Update intermediate stops if not already set
        if (initialRoute.stops.length > 2 && stops.length === 0) {
          const intermediateStops = initialRoute.stops.slice(1, -1).map((s: any, idx: number) => ({
            id: String(s.maDiem || s.id || idx + 2),
            name: s.tenDiem || s.name || '',
            address: s.diaChi || s.address || '',
            lat: s.viDo || s.latitude,
            lng: s.kinhDo || s.longitude,
            estimatedTime: s.thoiGianDung || s.estimatedTime || '',
            sequence: s.thuTu || s.sequence || idx + 2,
          }));
          setStops(intermediateStops);
        }
      }
    }
  }, [mode, initialRoute, routeName, originStop, destinationStop, stops.length]);

  // KHÔNG tự động quét học sinh - chỉ quét khi người dùng yêu cầu
  // useEffect này đã được bỏ để tránh tự động quét tốn tài nguyên

  // Update markers when stops, origin, or destination change
  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current) return;
    updateMarkers();
  }, [stops, originStop, destinationStop, isMapReady]);

  // Update route when stops, origin, or destination change (với debounce để tránh gọi quá nhiều)
  useEffect(() => {
    // Chỉ cập nhật khi có đủ thông tin và không đang drag marker
    if (draggedMarkerId) {
      console.log('⏸️ Skipping route update - marker is being dragged');
      return;
    }

    console.log('🔄 useEffect [stops, origin, destination] triggered', {
      stopsCount: stops.length,
      hasOrigin: !!originStop,
      hasDestination: !!destinationStop,
    });
    
    const timeoutId = setTimeout(() => {
      // Cần có ít nhất origin và destination để tính polyline
      if (originStop && destinationStop && originStop.lat && originStop.lng && destinationStop.lat && destinationStop.lng) {
        // Chỉ cập nhật nếu có ít nhất 1 điểm dừng hoặc đủ origin + destination
        const validStops = stops.filter(s => s.lat && s.lng);
        if (validStops.length > 0 || (originStop && destinationStop)) {
          console.log('✅ Calling updateRoute from useEffect');
          updateRoute();
        }
      } else {
        console.log('⚠️ Not enough valid points, clearing');
        setPolyline(null);
        setRouteSegments([]);
        // Remove polylines from map
        polylinesRef.current.forEach((polyline) => {
          polyline.setMap(null);
        });
        polylinesRef.current = [];
      }
    }, 500); // Tăng debounce lên 500ms để tránh cập nhật quá nhiều

    return () => {
      console.log('🧹 Cleaning up useEffect [stops, origin, destination] timeout');
      clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stops, originStop, destinationStop, draggedMarkerId]);

  // Update polyline on map when route segments change
  useEffect(() => {
    console.log('🔄 useEffect [routeSegments] triggered:', {
      routeSegmentsCount: routeSegments.length,
      isMapReady,
      hasMap: !!mapInstanceRef.current,
      selectedStopId
    });
    
    if (!isMapReady || !mapInstanceRef.current) {
      console.log('⚠️ Map not ready, skipping updatePolylinesOnMap');
      return;
    }
    
    console.log('✅ Calling updatePolylinesOnMap from useEffect');
    updatePolylinesOnMap();
  }, [routeSegments, selectedStopId, isMapReady]);

  const updateMarkers = () => {
    if (!mapInstanceRef.current || !isMapReady) return;

    if (!window.google?.maps) {
      console.warn('Google Maps not loaded yet');
      return;
    }
    const google: typeof window.google = window.google;
    
    // Remove old markers
    markersRef.current.forEach((marker) => {
      marker.setMap(null);
    });
    markersRef.current.clear();

    // Tạo danh sách tất cả các điểm (origin + stops + destination)
    const allPoints: Array<{ stop: Stop; type: 'origin' | 'stop' | 'destination'; index: number }> = [];
    
    if (originStop && originStop.lat && originStop.lng) {
      allPoints.push({ stop: originStop, type: 'origin', index: 0 });
    }
    stops.forEach((stop, idx) => {
      if (stop.lat && stop.lng) {
        allPoints.push({ stop, type: 'stop', index: idx + 1 });
      }
    });
    if (destinationStop && destinationStop.lat && destinationStop.lng) {
      allPoints.push({ stop: destinationStop, type: 'destination', index: allPoints.length });
    }

    // Add markers for all points
    allPoints.forEach(({ stop, type, index }) => {
      if (!stop.lat || !stop.lng) return;

      // Label: S (Start), 1, 2, 3... (stops), E (End)
      let label = '';
      if (type === 'origin') {
        label = 'S';
      } else if (type === 'destination') {
        label = 'E';
      } else {
        label = String(index);
      }
      
      const marker = new google.maps.Marker({
        position: { lat: stop.lat, lng: stop.lng },
        map: mapInstanceRef.current!,
        label: {
          text: label,
          color: 'white',
          fontWeight: 'bold',
          fontSize: '12px',
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: type === 'origin' || type === 'destination' ? 10 : 8,
          fillColor: type === 'origin' ? '#4285F4' : type === 'destination' ? '#EA4335' : '#34A853',
          fillOpacity: 1,
          strokeColor: 'white',
          strokeWeight: 2,
        },
        title: stop.name || (type === 'origin' ? 'Điểm bắt đầu' : type === 'destination' ? 'Điểm kết thúc' : `Điểm dừng ${index}`),
        zIndex: type === 'origin' ? 1000 : type === 'destination' ? 999 : 100 + index,
      });

      marker.addListener('click', async () => {
        setSelectedStopId(stop.id);
        // Tìm học sinh gần điểm dừng khi click
        if (stop.lat && stop.lng) {
          // Tìm học sinh gần điểm dừng
          try {
            const response = await apiClient.findStudentsNearby({
              lat: stop.lat,
              lng: stop.lng,
              radiusMeters: 500,
            });
            
            if (response.success && response.data) {
              const students = (response.data as any).students || [];
              
              if (students.length > 0) {
                setNearbyStudents(students);
                
                // Nếu có học sinh, tự động chỉnh lại đường đi
                const google = window.google?.maps;
                if (google && mapInstanceRef.current) {
                  // Tìm trạm xe bus gần nhất từ điểm dừng
                  const nearestBusStop = await findNearestBusStop(stop.lat, stop.lng);
                  
                  if (nearestBusStop) {
                    // Cập nhật vị trí điểm dừng về trạm xe bus nếu cần
                    const distanceToBusStop = google.geometry.spherical.computeDistanceBetween(
                      new google.LatLng(stop.lat, stop.lng),
                      new google.LatLng(nearestBusStop.lat, nearestBusStop.lng)
                    );
                    
                    // Nếu trạm xe bus gần hơn 200m, tự động điều chỉnh
                    if (distanceToBusStop <= 200) {
                      // Cập nhật stop với vị trí trạm xe bus
                      setStops(stops.map(s => 
                        s.id === stop.id 
                          ? { ...s, lat: nearestBusStop.lat, lng: nearestBusStop.lng, name: nearestBusStop.name || s.name, address: nearestBusStop.address || s.address }
                          : s
                      ));
                      
                      // Vẽ lại đường đi từ nhà học sinh tới trạm xe bus
                      for (const student of students) {
                        if (!student.viDo || !student.kinhDo) continue;
                        
                        // Xóa polyline cũ
                        const oldPolyline = studentToStopPolylinesRef.current.get(student.maHocSinh);
                        if (oldPolyline) {
                          oldPolyline.setMap(null);
                          studentToStopPolylinesRef.current.delete(student.maHocSinh);
                        }
                        
                        // Vẽ polyline mới
                        try {
                          const routeResponse = await apiClient.getDirections({
                            origin: `${student.viDo},${student.kinhDo}`,
                            destination: `${nearestBusStop.lat},${nearestBusStop.lng}`,
                            mode: 'walking',
                          });
                          
                          if (routeResponse.success && (routeResponse.data as any)?.polyline) {
                            const polyline = (routeResponse.data as any).polyline;
                            const decodedPath = google.geometry.encoding.decodePath(polyline);
                            
                            const routePolyline = new google.Polyline({
                              path: decodedPath,
                              geodesic: true,
                              strokeColor: '#10B981',
                              strokeOpacity: 0.7,
                              strokeWeight: 3,
                              map: mapInstanceRef.current,
                              zIndex: 300,
                            });
                            
                            studentToStopPolylinesRef.current.set(student.maHocSinh, routePolyline);
                          }
                        } catch (error) {
                          console.warn(`Failed to get route for student ${student.maHocSinh}:`, error);
                        }
                      }
                      
                      // Cập nhật lại route
                      setTimeout(() => {
                        updateRoute();
                      }, 100);
                      
                      toast({
                        title: 'Đã điều chỉnh điểm dừng',
                        description: `Điểm dừng đã được điều chỉnh về trạm xe bus gần nhất. Đã vẽ đường đi từ nhà ${students.length} học sinh tới trạm`,
                      });
                    } else {
                      // Vẫn vẽ đường đi từ nhà học sinh tới điểm dừng hiện tại
                      for (const student of students) {
                        if (!student.viDo || !student.kinhDo) continue;
                        
                        try {
                          const routeResponse = await apiClient.getDirections({
                            origin: `${student.viDo},${student.kinhDo}`,
                            destination: `${stop.lat},${stop.lng}`,
                            mode: 'walking',
                          });
                          
                          if (routeResponse.success && (routeResponse.data as any)?.polyline) {
                            const polyline = (routeResponse.data as any).polyline;
                            const decodedPath = google.geometry.encoding.decodePath(polyline);
                            
                            const routePolyline = new google.Polyline({
                              path: decodedPath,
                              geodesic: true,
                              strokeColor: '#10B981',
                              strokeOpacity: 0.7,
                              strokeWeight: 3,
                              map: mapInstanceRef.current,
                              zIndex: 300,
                            });
                            
                            studentToStopPolylinesRef.current.set(student.maHocSinh, routePolyline);
                          }
                        } catch (error) {
                          console.warn(`Failed to get route for student ${student.maHocSinh}:`, error);
                        }
                      }
                    }
                  }
                }
              }
            }
          } catch (error) {
            console.error('Failed to find nearby students:', error);
          }
          
          // Gọi hàm hiển thị học sinh
          await findNearbyStudents(stop.lat, stop.lng, stop.name);
        }
      });

      // Add drag listener for marker
      marker.setDraggable(true);
      marker.addListener('dragstart', () => {
        setDraggedMarkerId(stop.id);
      });
      marker.addListener('dragend', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          handleMarkerDrag(stop.id, e.latLng.lat(), e.latLng.lng());
        }
        setDraggedMarkerId(null);
      });

      markersRef.current.set(stop.id, marker);
    });

    if (allPoints.length > 0) {
      fitBounds();
    }
  };

  const fitBounds = () => {
    if (!mapInstanceRef.current) return;
    if (!window.google?.maps) return;

    const google: typeof window.google = window.google;
    const bounds = new google.maps.LatLngBounds();

    // Add origin
    if (originStop && originStop.lat && originStop.lng) {
      bounds.extend({ lat: originStop.lat, lng: originStop.lng });
    }
    
    // Add stops
    stops.forEach((stop) => {
      if (stop.lat && stop.lng) {
        bounds.extend({ lat: stop.lat, lng: stop.lng });
      }
    });
    
    // Add destination
    if (destinationStop && destinationStop.lat && destinationStop.lng) {
      bounds.extend({ lat: destinationStop.lat, lng: destinationStop.lng });
    }

    if (bounds.isEmpty()) return;

    mapInstanceRef.current.fitBounds(bounds);
    // Add padding
    const padding = 50;
    mapInstanceRef.current.setOptions({
      zoom: Math.min(mapInstanceRef.current.getZoom() || 13, 15),
    });
  };

  const updateRoute = async () => {
    // Cần có origin và destination để tính polyline
    if (!originStop || !destinationStop || !originStop.lat || !originStop.lng || !destinationStop.lat || !destinationStop.lng) {
      console.log('⚠️ Missing origin or destination, clearing polyline');
      setPolyline(null);
      setRouteSegments([]);
      setRouteInfo(null);
      return;
    }

    // Tạo danh sách tất cả các điểm: origin -> stops -> destination
    const allPoints: Stop[] = [originStop];
    const validStops = stops.filter((s) => s.lat && s.lng);
    allPoints.push(...validStops);
    allPoints.push(destinationStop);

    console.log('🔄 updateRoute called:', { 
      totalPoints: allPoints.length,
      origin: originStop.name,
      destination: destinationStop.name,
      intermediateStops: validStops.length,
    });
    
    if (allPoints.length < 2) {
      console.log('⚠️ Not enough valid points, clearing polyline');
      setPolyline(null);
      setRouteSegments([]);
      setRouteInfo(null);
      return;
    }

    try {
      console.log('📡 Fetching directions for', allPoints.length - 1, 'segments');
      // Lấy directions cho từng đoạn đường
      const segments: Array<{ polyline: string; from: number; to: number }> = [];
      let totalDistance = 0;
      let totalDuration = 0;

      for (let i = 0; i < allPoints.length - 1; i++) {
        const from = allPoints[i];
        const to = allPoints[i + 1];

        try {
          console.log(`📡 Fetching directions segment ${i + 1}/${allPoints.length - 1}: ${from.name} → ${to.name}`);
          const response = await apiClient.getDirections({
            origin: `${from.lat},${from.lng}`,
            destination: `${to.lat},${to.lng}`,
            mode: 'driving', // Mode driving phù hợp với xe buýt
            vehicleType: 'bus', // Chỉ định loại xe là buýt
          });

          console.log(`📥 Directions response for segment ${i + 1}:`, {
            success: response.success,
            hasPolyline: !!(response.data as any)?.polyline,
            data: response.data
          });

          if (response.success && (response.data as any)?.polyline) {
            const polyline = (response.data as any).polyline;
            segments.push({
              polyline,
              from: i,
              to: i + 1,
            });
            console.log(`✅ Added segment ${i + 1} with polyline length: ${polyline.length}`);

            // Cộng dồn distance và duration
            const data = response.data as any;
            if (data.distance) {
              // Parse distance (có thể là "5.2 km" hoặc "5200 m")
              const distanceStr = String(data.distance).toLowerCase();
              if (distanceStr.includes('km')) {
                totalDistance += parseFloat(distanceStr.replace('km', '').trim()) * 1000;
              } else if (distanceStr.includes('m')) {
                totalDistance += parseFloat(distanceStr.replace('m', '').trim());
              }
            }
            if (data.duration) {
              // Parse duration (có thể là "15 phút" hoặc "900 giây")
              const durationStr = String(data.duration).toLowerCase();
              if (durationStr.includes('phút') || durationStr.includes('minute')) {
                totalDuration += parseFloat(durationStr.replace(/phút|minute/g, '').trim()) * 60;
              } else if (durationStr.includes('giây') || durationStr.includes('second')) {
                totalDuration += parseFloat(durationStr.replace(/giây|second/g, '').trim());
              }
            }
          } else {
            console.warn(`⚠️ No polyline in response for segment ${i + 1}:`, response);
          }
        } catch (error) {
          console.error(`❌ Failed to get directions for segment ${i} to ${i + 1}:`, error);
        }
      }

      console.log(`📊 Total segments fetched: ${segments.length}/${allPoints.length - 1}`);
      console.log('📊 Segments data:', segments.map(s => ({ from: s.from, to: s.to, polylineLength: s.polyline.length })));
      
      setRouteSegments(segments);
      
      // Set route info
      if (totalDistance > 0 || totalDuration > 0) {
        const distanceText = totalDistance >= 1000 
          ? `${(totalDistance / 1000).toFixed(1)} km` 
          : `${Math.round(totalDistance)} m`;
        const durationText = totalDuration >= 60 
          ? `${Math.round(totalDuration / 60)} phút` 
          : `${Math.round(totalDuration)} giây`;
        
        setRouteInfo({
          distance: distanceText,
          duration: durationText,
        });
      }

      // Giữ polyline cũ để backward compatibility (nếu cần)
      if (segments.length > 0) {
        setPolyline(segments[0].polyline);
        console.log('✅ Set polyline and routeSegments');
      } else {
        console.warn('⚠️ No segments to set');
      }
    } catch (error) {
      console.error('❌ Failed to update route:', error);
    }
  };

  const updatePolylinesOnMap = async () => {
    console.log('🔄 updatePolylinesOnMap called:', {
      hasMap: !!mapInstanceRef.current,
      isMapReady,
      routeSegmentsCount: routeSegments.length,
      hasGoogleMaps: !!window.google?.maps,
      hasGeometry: !!window.google?.maps?.geometry,
      hasEncoding: !!window.google?.maps?.geometry?.encoding
    });

    if (!mapInstanceRef.current || !isMapReady) {
      console.log('⚠️ Map not ready:', { isMapReady, hasMap: !!mapInstanceRef.current });
      return;
    }
    if (!window.google?.maps) {
      console.warn('⚠️ Google Maps not loaded');
      return;
    }

    const google: typeof window.google = window.google;
    
    // Remove old polylines
    console.log(`🗑️ Removing ${polylinesRef.current.length} old polylines`);
    polylinesRef.current.forEach((polyline) => {
      polyline.setMap(null);
    });
    polylinesRef.current = [];

    if (routeSegments.length === 0) {
      console.log('⚠️ No route segments to display');
      return;
    }

    console.log(`🗺️ Rendering ${routeSegments.length} route segments`);

    try {
      // Check if geometry library is loaded - with retry
      let geometryReady = false;
      if (google.maps.geometry && google.maps.geometry.encoding && typeof google.maps.geometry.encoding.decodePath === 'function') {
        geometryReady = true;
      } else {
        // Try to import geometry library if available
        if (typeof (google.maps as any).importLibrary === 'function') {
          try {
            await (google.maps as any).importLibrary('geometry');
            if (google.maps.geometry && google.maps.geometry.encoding && typeof google.maps.geometry.encoding.decodePath === 'function') {
              geometryReady = true;
              console.log('✅ Geometry library imported successfully');
            }
          } catch (e) {
            console.warn('⚠️ Failed to import geometry library:', e);
          }
        }
      }

      if (!geometryReady) {
        console.error('❌ Google Maps Geometry library not loaded!', {
          hasGeometry: !!google.maps.geometry,
          hasEncoding: !!google.maps.geometry?.encoding,
          hasDecodePath: typeof google.maps.geometry?.encoding?.decodePath,
          googleMapsKeys: Object.keys(google.maps || {})
        });
        return;
      }

      // Tạo danh sách tất cả các điểm để tìm index
      const allPointsForHighlight: Stop[] = [];
      if (originStop) allPointsForHighlight.push(originStop);
      allPointsForHighlight.push(...stops);
      if (destinationStop) allPointsForHighlight.push(destinationStop);
      
      // Tìm index của điểm dừng được chọn
      const selectedIndex = selectedStopId 
        ? allPointsForHighlight.findIndex((s) => s.id === selectedStopId)
        : -1;

      // Tạo polyline cho từng đoạn đường
      routeSegments.forEach((segment, index) => {
        try {
          if (!segment.polyline) {
            console.warn(`⚠️ Segment ${index} has no polyline`);
            return;
          }

          console.log(`🔍 Decoding segment ${index} (${segment.from} → ${segment.to}), polyline length: ${segment.polyline.length}`);
          
          // Validate polyline string
          if (!segment.polyline || typeof segment.polyline !== 'string' || segment.polyline.trim().length === 0) {
            console.warn(`⚠️ Segment ${index} has invalid polyline string`);
            return;
          }
          
          // Decode polyline
          let path: google.maps.LatLng[];
          try {
            path = google.maps.geometry.encoding.decodePath(segment.polyline);
          } catch (decodeError) {
            console.error(`❌ Failed to decode polyline for segment ${index}:`, decodeError, {
              polylinePreview: segment.polyline.substring(0, 50)
            });
            return;
          }
          
          console.log(`📍 Decoded path for segment ${index}:`, {
            pathLength: path?.length,
            firstPoint: path?.[0] ? { lat: path[0].lat(), lng: path[0].lng() } : null,
            lastPoint: path?.[path.length - 1] ? { lat: path[path.length - 1].lat(), lng: path[path.length - 1].lng() } : null
          });
          
          if (!path || path.length === 0) {
            console.warn(`⚠️ Segment ${index} decoded to empty path`);
            return;
          }
          
          // Xác định màu và opacity dựa trên vị trí và điểm được chọn
          let strokeColor = '#4285F4'; // Màu xanh Google Maps
          let strokeOpacity = 1.0;
          let strokeWeight = 5;
          let zIndex = 100 - index;

          // Nếu có điểm được chọn, highlight đoạn đường liên quan
          if (selectedIndex >= 0) {
            const isHighlighted = 
              (segment.from === selectedIndex && segment.to === selectedIndex + 1) ||
              (segment.from === selectedIndex - 1 && segment.to === selectedIndex);
            
            if (isHighlighted) {
              // Đoạn được highlight: màu xanh đậm, đậm hơn
              strokeColor = '#1a73e8';
              strokeOpacity = 1.0;
              strokeWeight = 6;
              zIndex = 1000; // Đoạn được highlight ở trên cùng
            } else {
              // Đoạn không được highlight: màu xanh mờ hơn
              strokeOpacity = 0.4;
              strokeWeight = 4;
              zIndex = 100 - index;
            }
          } else {
            // Không có điểm được chọn: đoạn đầu màu đậm, các đoạn sau mờ hơn
            if (index === 0) {
              strokeColor = '#4285F4';
              strokeOpacity = 1.0;
              strokeWeight = 5;
              zIndex = 100;
            } else {
              strokeColor = '#4285F4';
              strokeOpacity = 0.5;
              strokeWeight = 4;
              zIndex = 100 - index;
            }
          }
          
          // Create new polyline with improved styling (like Google Maps/Grab)
          const newPolyline = new google.maps.Polyline({
            path,
            geodesic: true,
            strokeColor,
            strokeOpacity,
            strokeWeight,
            map: mapInstanceRef.current,
            zIndex,
            icons: [{
              icon: {
                path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                scale: 4,
                strokeColor: strokeColor,
                fillColor: strokeColor,
                fillOpacity: strokeOpacity,
              },
              offset: '100%',
              repeat: '100px',
            }],
          });

          polylinesRef.current.push(newPolyline);
          console.log(`✅ Rendered polyline segment ${index} (${segment.from} → ${segment.to})`);
        } catch (error) {
          console.error(`❌ Failed to render polyline segment ${index}:`, error);
        }
      });
      
      console.log(`✅ Total polylines rendered: ${polylinesRef.current.length}`);
    } catch (error) {
      console.error('Failed to render polylines:', error);
    }
  };

  const handleMapClick = async (lat: number, lng: number) => {
    if (mapMode !== 'add') return;
    // Don't allow adding new pending stop if there's already one
    if (pendingStop) {
      toast({
        title: 'Đang xử lý điểm dừng',
        description: 'Vui lòng xác nhận hoặc hủy điểm dừng hiện tại trước khi thêm điểm mới',
        variant: 'default',
      });
      return;
    }
    
    try {
      // Reverse geocode to get address
      const response = await apiClient.reverseGeocode({
        latlng: `${lat},${lng}`,
      });

      let address = '';
      if (response.success && response.data) {
        const results = (response.data as any)?.results;
        if (results && results.length > 0) {
          address = results[0].formatted_address || '';
        }
      }

      if (!address) {
        address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      }

      // Tìm trạm xe bus gần nhất (nếu có)
      const nearestBusStop = await findNearestBusStop(lat, lng);
      let finalLat = lat;
      let finalLng = lng;
      let finalName = `Điểm dừng ${stops.length + 1}`;
      let finalAddress = address;

      if (nearestBusStop && window.google?.maps) {
        const google = window.google.maps;
        const distanceToBusStop = google.geometry.spherical.computeDistanceBetween(
          new google.LatLng(lat, lng),
          new google.LatLng(nearestBusStop.lat, nearestBusStop.lng)
        );

        // Nếu trạm xe bus gần hơn 200m, tự động điều chỉnh
        if (distanceToBusStop <= 200) {
          finalLat = nearestBusStop.lat;
          finalLng = nearestBusStop.lng;
          finalName = nearestBusStop.name || finalName;
          finalAddress = nearestBusStop.address || address;
        }
      }

      // Tạo pending stop
      const newPendingStop: Stop = {
        id: `pending-${Date.now()}`,
        name: finalName,
        address: finalAddress,
        lat: finalLat,
        lng: finalLng,
        estimatedTime: '',
        sequence: stops.length + 1,
      };

      setPendingStop(newPendingStop);
      
      // Tự động tìm học sinh trong 500m (chỉ khi người dùng muốn)
      // Không tự động tìm để tránh lag - người dùng có thể click vào điểm dừng để xem học sinh
      // findNearbyStudents(finalLat, finalLng, newPendingStop.name);
      
      // Show pending marker on map
      if (mapInstanceRef.current && window.google?.maps) {
        const google: typeof window.google = window.google;
        
        // Remove old pending marker
        if (pendingMarkerRef.current) {
          pendingMarkerRef.current.setMap(null);
        }
        
        // Create new pending marker
        const marker = new google.maps.Marker({
          position: { lat: finalLat, lng: finalLng },
          map: mapInstanceRef.current,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#FF9800', // Orange color for pending
            fillOpacity: 0.8,
            strokeColor: 'white',
            strokeWeight: 3,
          },
          title: `Điểm dừng tạm thời - ${finalName}`,
          zIndex: 2000,
          animation: google.maps.Animation.DROP,
        });
        
        pendingMarkerRef.current = marker;
      }

      toast({
        title: 'Đã tạo điểm dừng tạm thời',
        description: 'Vui lòng điền thông tin và xác nhận để thêm vào tuyến đường',
        variant: 'default',
      });
    } catch (error) {
      console.error('Failed to create stop:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tạo điểm dừng. Vui lòng thử lại.',
        variant: 'destructive',
      });
    }
  };

  const addStopFromSearch = async (place: { name: string; lat: number; lng: number; address: string }) => {
    if (mapMode !== 'add') return;
    // Don't allow adding new pending stop if there's already one
    if (pendingStop) {
      toast({
        title: 'Đang xử lý điểm dừng',
        description: 'Vui lòng xác nhận hoặc hủy điểm dừng hiện tại trước khi thêm điểm mới',
        variant: 'default',
      });
      return;
    }
    
    try {
      // Tìm trạm xe bus gần nhất (nếu có)
      const nearestBusStop = await findNearestBusStop(place.lat, place.lng);
      let finalLat = place.lat;
      let finalLng = place.lng;
      let finalName = place.name || `Điểm ${stops.length + 1}`;
      let finalAddress = place.address || '';

      if (nearestBusStop && window.google?.maps) {
        const google = window.google.maps;
        const distanceToBusStop = google.geometry.spherical.computeDistanceBetween(
          new google.LatLng(place.lat, place.lng),
          new google.LatLng(nearestBusStop.lat, nearestBusStop.lng)
        );

        // Nếu trạm xe bus gần hơn 200m, tự động điều chỉnh
        if (distanceToBusStop <= 200) {
          finalLat = nearestBusStop.lat;
          finalLng = nearestBusStop.lng;
          finalName = nearestBusStop.name || finalName;
          finalAddress = nearestBusStop.address || place.address || '';
        }
      }

      // Tạo pending stop
      const newPendingStop: Stop = {
        id: `pending-${Date.now()}`,
        name: finalName,
        address: finalAddress,
        lat: finalLat,
        lng: finalLng,
        estimatedTime: '',
        sequence: stops.length + 1,
      };

      setPendingStop(newPendingStop);
      
      // Không tự động tìm học sinh - người dùng có thể click vào điểm dừng để xem
      // findNearbyStudents(finalLat, finalLng, newPendingStop.name);
      
      // Show pending marker on map
      if (mapInstanceRef.current && window.google?.maps) {
        const googleMaps = window.google.maps;
        
        // Remove old pending marker
        if (pendingMarkerRef.current) {
          pendingMarkerRef.current.setMap(null);
        }
        
        // Create new pending marker
        const marker = new googleMaps.Marker({
          position: { lat: finalLat, lng: finalLng },
          map: mapInstanceRef.current,
          icon: {
            path: googleMaps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#FF9800',
            fillOpacity: 0.8,
            strokeColor: 'white',
            strokeWeight: 3,
          },
          title: `Điểm dừng tạm thời - ${finalName}`,
          zIndex: 2000,
          animation: googleMaps.Animation.DROP,
        });
        
        pendingMarkerRef.current = marker;
      }

      toast({
        title: 'Đã tạo điểm dừng tạm thời',
        description: 'Vui lòng điền thông tin và xác nhận để thêm vào tuyến đường',
        variant: 'default',
      });
    } catch (error) {
      console.error('Failed to create stop from search:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tạo điểm dừng. Vui lòng thử lại.',
        variant: 'destructive',
      });
    }
  };

  // Tìm trạm xe buýt gần nhất từ điểm trung tâm của học sinh
  const findNearestBusStop = async (centerLat: number, centerLng: number): Promise<{ lat: number; lng: number; name: string; address: string } | null> => {
    if (!window.google?.maps || !mapInstanceRef.current) return null;
    
    const google = window.google.maps;
    
    try {
      // Kiểm tra Places API có sẵn không
      if (!google.places || !google.places.PlacesService) {
        console.warn('⚠️ Google Places API not loaded, using center point instead');
        // Fallback: sử dụng điểm trung tâm của học sinh
        try {
          const response = await apiClient.reverseGeocode({
            latlng: `${centerLat},${centerLng}`,
          });
          let address = '';
          if (response.success && response.data) {
            const results = (response.data as any)?.results;
            if (results && results.length > 0) {
              address = results[0].formatted_address || '';
            }
          }
          return {
            lat: centerLat,
            lng: centerLng,
            name: 'Điểm dừng tối ưu',
            address: address || `${centerLat.toFixed(6)}, ${centerLng.toFixed(6)}`,
          };
        } catch (error) {
          return {
            lat: centerLat,
            lng: centerLng,
            name: 'Điểm dừng tối ưu',
            address: `${centerLat.toFixed(6)}, ${centerLng.toFixed(6)}`,
          };
        }
      }
      
      // Sử dụng Places API để tìm trạm xe buýt gần nhất
      const service = new google.places.PlacesService(mapInstanceRef.current);
      
      return new Promise((resolve) => {
        service.nearbySearch(
          {
            location: new google.LatLng(centerLat, centerLng),
            radius: 500, // 500m
            type: 'bus_station', // Tìm trạm xe buýt
          },
          (results, status) => {
            if (status === google.places.PlacesServiceStatus.OK && results && results.length > 0) {
              // Lấy trạm gần nhất
              const nearest = results[0];
              if (nearest.geometry?.location) {
                resolve({
                  lat: nearest.geometry.location.lat(),
                  lng: nearest.geometry.location.lng(),
                  name: nearest.name || 'Trạm xe buýt',
                  address: nearest.vicinity || nearest.formatted_address || '',
                });
                return;
              }
            }
            
            // Fallback: nếu không tìm thấy trạm xe buýt, tìm transit_station
            service.nearbySearch(
              {
                location: new google.LatLng(centerLat, centerLng),
                radius: 500,
                type: 'transit_station',
              },
              (results2, status2) => {
                if (status2 === google.places.PlacesServiceStatus.OK && results2 && results2.length > 0) {
                  const nearest = results2[0];
                  if (nearest.geometry?.location) {
                    resolve({
                      lat: nearest.geometry.location.lat(),
                      lng: nearest.geometry.location.lng(),
                      name: nearest.name || 'Trạm giao thông',
                      address: nearest.vicinity || nearest.formatted_address || '',
                    });
                    return;
                  }
                }
                
                // Fallback cuối cùng: sử dụng điểm trung tâm
                resolve({
                  lat: centerLat,
                  lng: centerLng,
                  name: 'Điểm dừng tối ưu',
                  address: `${centerLat.toFixed(6)}, ${centerLng.toFixed(6)}`,
                });
              }
            );
          }
        );
      });
    } catch (error) {
      console.error('Failed to find nearest bus stop:', error);
      // Fallback: sử dụng điểm trung tâm
      return {
        lat: centerLat,
        lng: centerLng,
        name: 'Điểm dừng tối ưu',
        address: `${centerLat.toFixed(6)}, ${centerLng.toFixed(6)}`,
      };
    }
  };

  // Tìm học sinh trong 500m từ trạm xe bus (lat, lng là tọa độ trạm xe bus)
  const findNearbyStudents = async (lat: number, lng: number, stopName: string) => {
    try {
      setLoadingNearbyStudents(true);
      setSelectedStopForStudents({ lat, lng, name: stopName });
      
      // Tìm học sinh trong 500m từ TRẠM XE BUS
      const response = await apiClient.findStudentsNearby({
        lat, // Tọa độ trạm xe bus
        lng, // Tọa độ trạm xe bus
        radiusMeters: 500, // 500 mét từ trạm xe bus
      });
      
      if (response.success && response.data) {
        const students = (response.data as any).students || [];
        
        if (students.length > 0) {
          const google = window.google?.maps;
          
          setNearbyStudents(students);
          
          // Hiển thị học sinh trên bản đồ - MỖI HỌC SINH Ở ĐÚNG TỌA ĐỘ NHÀ TỪ DATABASE
          displayStudentMarkers(students, lat, lng);
          
          // Tự động vẽ đường đi từ NHÀ học sinh (địa chỉ thực tế từ database) tới trạm xe bus
          if (students.length > 0 && google && mapInstanceRef.current && google.geometry) {
            const finalStopLat = lat; // Tọa độ trạm xe bus
            const finalStopLng = lng; // Tọa độ trạm xe bus
            
            // Xóa các polyline cũ của các học sinh này nếu có
            students.forEach((student: typeof nearbyStudents[0]) => {
              const oldPolyline = studentToStopPolylinesRef.current.get(student.maHocSinh);
              if (oldPolyline) {
                oldPolyline.setMap(null);
                studentToStopPolylinesRef.current.delete(student.maHocSinh);
              }
            });
            
            // Vẽ đường đi cho mỗi học sinh từ địa chỉ nhà thực tế (từ database)
            const drawRoutesPromises = students.map(async (student: typeof nearbyStudents[0]) => {
              // QUAN TRỌNG: Đảm bảo dùng ĐÚNG tọa độ nhà của học sinh từ database (viDo, kinhDo)
              // Không dùng tọa độ tính toán hay điểm trung tâm, chỉ dùng địa chỉ nhà thực tế
              const studentHomeLat = Number(student.viDo);
              const studentHomeLng = Number(student.kinhDo);
              
              if (!studentHomeLat || !studentHomeLng || isNaN(studentHomeLat) || isNaN(studentHomeLng)) {
                console.warn(`⚠️ Student ${student.maHocSinh} (${student.hoTen}) has invalid coordinates:`, {
                  viDo: student.viDo,
                  kinhDo: student.kinhDo,
                  diaChi: student.diaChi
                });
                return;
              }
              
              // Log để debug - đảm bảo dùng đúng địa chỉ nhà
              console.log(`📍 Vẽ đường đi từ nhà học sinh ${student.hoTen}:`, {
                maHocSinh: student.maHocSinh,
                diaChi: student.diaChi,
                homeLat: studentHomeLat,
                homeLng: studentHomeLng,
                toStop: { lat: finalStopLat, lng: finalStopLng }
              });
              
              try {
                // Lấy đường đi NGẮN NHẤT từ nhà học sinh (địa chỉ thực tế từ database) tới trạm xe bus
                // Sử dụng mode 'walking' để tính đường đi bộ ngắn nhất
                const response = await apiClient.getDirections({
                  origin: `${studentHomeLat},${studentHomeLng}`, // Tọa độ nhà thực tế từ database (viDo, kinhDo)
                  destination: `${finalStopLat},${finalStopLng}`, // Điểm dừng/trạm xe bus
                  mode: 'walking', // Đi bộ từ nhà tới trạm - Google Maps sẽ tự động tính đường ngắn nhất
                });
                
                if (response.success && response.data) {
                  const data = response.data as any;
                  let decodedPath: google.maps.LatLng[] = [];
                  
                  // Xử lý nhiều định dạng polyline có thể có
                  if (data.polyline) {
                    // Nếu có polyline string, decode nó
                    if (typeof data.polyline === 'string') {
                      if (google.geometry?.encoding) {
                        decodedPath = google.geometry.encoding.decodePath(data.polyline);
                      } else {
                        // Fallback nếu không có encoding library
                        console.warn('Google Maps encoding library not available, using direct path');
                        decodedPath = [
                          new google.LatLng(studentHomeLat, studentHomeLng),
                          new google.LatLng(finalStopLat, finalStopLng)
                        ];
                      }
                    } else if (Array.isArray(data.polyline)) {
                      // Nếu polyline là array of coordinates
                      decodedPath = data.polyline.map((coord: any) => 
                        new google.LatLng(coord.lat || coord[0], coord.lng || coord[1])
                      );
                    }
                  } else if (data.routes && data.routes[0] && data.routes[0].overview_polyline) {
                    // Nếu có routes với overview_polyline
                    const polylineStr = data.routes[0].overview_polyline.points;
                    if (google.geometry?.encoding) {
                      decodedPath = google.geometry.encoding.decodePath(polylineStr);
                    }
                  }
                  
                  // Nếu không có decoded path, tạo đường thẳng
                  if (decodedPath.length === 0) {
                    decodedPath = [
                      new google.LatLng(studentHomeLat, studentHomeLng),
                      new google.LatLng(finalStopLat, finalStopLng)
                    ];
                  }
                  
                  // Vẽ polyline trên bản đồ
                  const routePolyline = new google.Polyline({
                    path: decodedPath,
                    geodesic: true,
                    strokeColor: '#3B82F6',
                    strokeOpacity: 0.7,
                    strokeWeight: 3,
                    map: mapInstanceRef.current,
                    zIndex: 300,
                  });
                  
                  // Lưu polyline vào ref để có thể xóa sau
                  studentToStopPolylinesRef.current.set(student.maHocSinh, routePolyline);
                  console.log(`✅ Đã vẽ đường đi NGẮN NHẤT từ nhà học sinh ${student.hoTen} (${student.diaChi || 'N/A'}) tới điểm dừng`, {
                    from: { lat: studentHomeLat, lng: studentHomeLng },
                    to: { lat: finalStopLat, lng: finalStopLng },
                    pathLength: decodedPath.length
                  });
                } else {
                  throw new Error('Invalid response from directions API');
                }
              } catch (error: any) {
                console.warn(`⚠️ Failed to get route for student ${student.maHocSinh} (${student.hoTen}):`, error);
                // Fallback: vẽ đường thẳng từ nhà tới trạm
                try {
                  const directPath = [
                    new google.LatLng(studentHomeLat, studentHomeLng),
                    new google.LatLng(finalStopLat, finalStopLng),
                  ];
                  
                  const routePolyline = new google.Polyline({
                    path: directPath,
                    geodesic: true,
                    strokeColor: '#3B82F6',
                    strokeOpacity: 0.4,
                    strokeWeight: 2,
                    map: mapInstanceRef.current,
                    zIndex: 300,
                  });
                  
                  studentToStopPolylinesRef.current.set(student.maHocSinh, routePolyline);
                  console.log(`⚠️ Fallback: Vẽ đường thẳng từ nhà học sinh ${student.hoTen} (${student.diaChi || 'N/A'}) tới điểm dừng`);
                } catch (fallbackError) {
                  console.error(`❌ Failed to draw fallback route for student ${student.maHocSinh}:`, fallbackError);
                }
              }
            });
            
            // Chờ tất cả routes được vẽ
            await Promise.allSettled(drawRoutesPromises);
            console.log(`✅ Đã hoàn thành vẽ ${students.length} đường đi từ nhà học sinh tới trạm xe bus`);
          }
          
          toast({
            title: 'Tìm thấy học sinh',
            description: `Có ${students.length} học sinh trong bán kính 500m. Đã vẽ đường đi NGẮN NHẤT từ nhà (địa chỉ thực tế) tới trạm xe bus`,
          });
        } else {
          setNearbyStudents([]);
          toast({
            title: 'Không tìm thấy học sinh',
            description: 'Không có học sinh nào trong bán kính 500m',
            variant: 'default',
          });
        }
      }
    } catch (error: any) {
      console.error('Failed to find nearby students:', error);
      toast({
        title: 'Lỗi',
        description: error?.message || 'Không thể tìm học sinh gần đây',
        variant: 'destructive',
      });
    } finally {
      setLoadingNearbyStudents(false);
    }
  };

  // Hiển thị markers cho học sinh trên bản đồ
  const displayStudentMarkers = (students: typeof nearbyStudents, centerLat: number, centerLng: number) => {
    if (!mapInstanceRef.current || !isMapReady || !window.google?.maps) return;
    
    const google: typeof window.google = window.google;
    
    // Xóa markers cũ
    studentMarkersRef.current.forEach((marker) => {
      marker.setMap(null);
    });
    studentMarkersRef.current.clear();
    
    // Tạo marker cho mỗi học sinh - ĐẢM BẢO DÙNG ĐÚNG TỌA ĐỘ TỪ DATABASE
    // Track các tọa độ đã dùng để tránh trùng lặp
    const usedPositions = new Map<string, number>();
    
    students.forEach((student, index) => {
      // Kiểm tra và log tọa độ để debug
      if (!student.viDo || !student.kinhDo || isNaN(student.viDo) || isNaN(student.kinhDo)) {
        console.warn(`⚠️ Student ${student.hoTen} (${student.maHocSinh}) has invalid coordinates:`, {
          viDo: student.viDo,
          kinhDo: student.kinhDo,
          diaChi: student.diaChi,
        });
        return; // Bỏ qua học sinh không có tọa độ hợp lệ
      }
      
      // ĐẢM BẢO MỖI HỌC SINH HIỂN THỊ Ở ĐÚNG ĐỊA CHỈ NHÀ - KHÔNG GOM LẠI
      // SỬ DỤNG TỌA ĐỘ CHÍNH XÁC TỪ DATABASE, KHÔNG ĐIỀU CHỈNH
      let studentLat = Number(student.viDo);
      let studentLng = Number(student.kinhDo);
      
      // CHỈ offset khi thực sự trùng lặp (tolerance rất nhỏ ~0.1m, chỉ khi cùng địa chỉ)
      // Dùng tolerance nhỏ hơn để không gom các học sinh ở địa chỉ khác nhau
      const positionKey = `${studentLat.toFixed(6)},${studentLng.toFixed(6)}`; // Tăng độ chính xác lên 6 số thập phân
      const existingCount = usedPositions.get(positionKey) || 0;
      
      // CHỈ offset khi thực sự trùng lặp (cùng địa chỉ, tolerance ~0.1m)
      if (existingCount > 0) {
        const offset = 0.00001 * existingCount; // ~1m mỗi lần offset (giảm từ 5m xuống 1m)
        studentLat += offset;
        studentLng += offset;
        console.log(`⚠️ Student ${student.hoTen} có tọa độ TRÙNG LẶP với học sinh khác (cùng địa chỉ), đã thêm offset nhỏ:`, {
          original: { lat: Number(student.viDo), lng: Number(student.kinhDo) },
          adjusted: { lat: studentLat, lng: studentLng },
          offset: `${offset * 111000}m` // Convert sang mét
        });
      }
      
      usedPositions.set(positionKey, existingCount + 1);
      
      // Log để debug - đảm bảo mỗi học sinh có tọa độ riêng
      console.log(`📍 Nearby Student ${student.hoTen} (${student.maHocSinh}):`, {
        diaChi: student.diaChi,
        viDo: studentLat,
        kinhDo: studentLng,
        originalViDo: Number(student.viDo),
        originalKinhDo: Number(student.kinhDo),
        distanceMeters: student.distanceMeters,
        index: index
      });
      
      // Tạo marker cho từng học sinh - KHÔNG CLUSTER, hiển thị đúng tọa độ nhà từ database
      // Đảm bảo mỗi học sinh có marker riêng ở đúng tọa độ nhà
      const marker = new google.maps.Marker({
        position: { lat: studentLat, lng: studentLng }, // Dùng ĐÚNG tọa độ nhà từ database (viDo, kinhDo)
        map: mapInstanceRef.current!,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 14, // Tăng kích thước để không bị cluster và dễ thấy
          fillColor: '#FF6B6B',
          fillOpacity: 1.0,
          strokeColor: 'white',
          strokeWeight: 3,
        },
        title: `${student.hoTen} - ${student.lop}\n${student.diaChi || 'Chưa có địa chỉ'}\nKhoảng cách: ${student.distanceMeters}m\nTọa độ: ${studentLat.toFixed(6)}, ${studentLng.toFixed(6)}`,
        zIndex: 500 + index, // Mỗi marker có zIndex khác nhau
        optimized: false, // QUAN TRỌNG: Tắt tối ưu hóa để không bị cluster
        collisionBehavior: google.maps.CollisionBehavior.OPTIONAL_AND_HIDES_LOWER_PRIORITY, // Cho phép overlap thay vì cluster
        animation: null, // Không animation để tránh clustering
        label: {
          text: student.hoTen?.charAt(0) || 'H',
          color: 'white',
          fontSize: '14px',
          fontWeight: 'bold',
        },
        // Thêm các thuộc tính để đảm bảo không bị cluster
        visible: true,
        clickable: true,
        draggable: false,
      });
      
      // QUAN TRỌNG: Đảm bảo marker không bị Google Maps tự động cluster
      // Set lại position để đảm bảo marker hiển thị đúng vị trí
      marker.setPosition({ lat: studentLat, lng: studentLng });
      
      // Log để debug - đảm bảo mỗi marker có tọa độ riêng
      console.log(`✅ Marker created for ${student.hoTen}:`, {
        maHocSinh: student.maHocSinh,
        position: { lat: studentLat, lng: studentLng },
        diaChi: student.diaChi,
        markerId: student.maHocSinh,
        zIndex: 500 + index
      });
      
      // Info window khi click
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; min-width: 200px;">
            <h3 style="margin: 0 0 4px 0; font-size: 14px; font-weight: bold;">${student.hoTen}</h3>
            <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">Lớp: ${student.lop}</p>
            <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">${student.diaChi || 'Chưa có địa chỉ'}</p>
            <p style="margin: 0; font-size: 11px; color: #999;">Khoảng cách: ${student.distanceMeters}m</p>
          </div>
        `,
      });
      
      marker.addListener('click', () => {
        // Đóng tất cả info windows khác
        studentMarkersRef.current.forEach((m) => {
          const iw = (m as any).infoWindow;
          if (iw) iw.close();
        });
        
        infoWindow.open(mapInstanceRef.current!, marker);
        (marker as any).infoWindow = infoWindow;
      });
      
      studentMarkersRef.current.set(student.maHocSinh, marker);
    });
    
    // Vẽ circle để hiển thị bán kính 500m
    const circle = new google.maps.Circle({
      strokeColor: '#FF6B6B',
      strokeOpacity: 0.5,
      strokeWeight: 2,
      fillColor: '#FF6B6B',
      fillOpacity: 0.1,
      map: mapInstanceRef.current!,
      center: { lat: centerLat, lng: centerLng },
      radius: 500, // 500 mét
      zIndex: 1,
    });
    
    // Lưu circle vào marker để có thể xóa sau
    (circle as any).isRadiusCircle = true;
  };

  // HÀM NÀY ĐÃ BỊ XÓA - KHÔNG TẠO CỤM HỌC SINH NỮA
  // Logic mới: Mỗi học sinh hiển thị ở đúng địa chỉ nhà từ database
  // Khi tạo điểm dừng, chỉ quét 500m từ trạm xe bus và vẽ đường đi từ nhà học sinh tới trạm
  // Hàm này đã được thay thế bằng logic trong findNearbyStudents và displayStudentMarkers

  // Extract quận/huyện từ địa chỉ
  const extractDistrict = (address: string): string | null => {
    if (!address) return null;
    
    const addressLower = address.toLowerCase();
    
    // Danh sách các quận/huyện TP.HCM
    const districts = [
      'quận 1', 'quận 2', 'quận 3', 'quận 4', 'quận 5', 'quận 6', 'quận 7', 'quận 8',
      'quận 9', 'quận 10', 'quận 11', 'quận 12', 'quận bình tân', 'quận bình thạnh',
      'quận gò vấp', 'quận phú nhuận', 'quận tân bình', 'quận tân phú', 'quận thủ đức',
      'huyện bình chánh', 'huyện cần giờ', 'huyện củ chi', 'huyện hóc môn',
      'huyện nhà bè'
    ];
    
    for (const district of districts) {
      if (addressLower.includes(district)) {
        // Chuẩn hóa tên quận - trả về số quận hoặc tên huyện
        if (district.includes('quận')) {
          const match = district.match(/quận\s*(\d+|[^,]+)/);
          if (match && match[1]) {
            return match[1].trim();
          }
        } else if (district.includes('huyện')) {
          return district.replace('huyện', '').trim();
        }
        return district;
      }
    }
    
    return null;
  };

  // Xác định các quận dọc tuyến đường
  const getDistrictsAlongRoute = (origin: Stop, destination: Stop): string[] => {
    const districts: string[] = [];
    
    // Lấy quận từ origin
    if (origin.address) {
      const originDistrict = extractDistrict(origin.address);
      if (originDistrict && !districts.includes(originDistrict)) {
        districts.push(originDistrict);
      }
    }
    
    // Lấy quận từ destination
    if (destination.address) {
      const destDistrict = extractDistrict(destination.address);
      if (destDistrict && !districts.includes(destDistrict)) {
        districts.push(destDistrict);
      }
    }
    
    // Nếu origin và destination khác quận, thêm các quận trung gian
    // (Có thể mở rộng sau để tính toán chính xác hơn dựa trên route)
    if (districts.length === 2 && districts[0] !== districts[1]) {
      // Thêm các quận có thể nằm giữa (ví dụ: Q7 -> Q5 có thể qua Q8)
      // Logic đơn giản: nếu là số quận, thêm các quận giữa
      const originNum = parseInt(districts[0]);
      const destNum = parseInt(districts[1]);
      
      if (!isNaN(originNum) && !isNaN(destNum)) {
        const min = Math.min(originNum, destNum);
        const max = Math.max(originNum, destNum);
        for (let i = min + 1; i < max; i++) {
          const intermediateDistrict = i.toString();
          if (!districts.includes(intermediateDistrict)) {
            districts.push(intermediateDistrict);
          }
        }
      }
    }
    
    return districts;
  };

  // Tạo bounding box từ origin và destination với buffer
  const createBoundingBox = (origin: Stop, destination: Stop, bufferKm: number = 5) => {
    if (!origin.lat || !origin.lng || !destination.lat || !destination.lng) {
      return null;
    }

    const google = window.google?.maps;
    if (!google) return null;

    // Tính khoảng cách giữa origin và destination
    const originLatLng = new google.LatLng(origin.lat, origin.lng);
    const destLatLng = new google.LatLng(destination.lat, destination.lng);
    const distance = google.geometry.spherical.computeDistanceBetween(originLatLng, destLatLng);
    
    // Tạo bounds từ origin và destination
    const bounds = new google.LatLngBounds();
    bounds.extend(originLatLng);
    bounds.extend(destLatLng);
    
    // Mở rộng bounds với buffer (chuyển từ km sang mét)
    const bufferMeters = bufferKm * 1000;
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    
    // Tính toán buffer cho lat/lng (xấp xỉ)
    const latBuffer = bufferMeters / 111000; // ~111km per degree latitude
    const lngBuffer = bufferMeters / (111000 * Math.cos((origin.lat + destination.lat) / 2 * Math.PI / 180));
    
    return {
      north: ne.lat() + latBuffer,
      south: sw.lat() - latBuffer,
      east: ne.lng() + lngBuffer,
      west: sw.lng() - lngBuffer,
      center: bounds.getCenter(),
      distance: distance / 1000, // km
    };
  };

  // Kiểm tra xem điểm có nằm trong bounding box không
  const isPointInBounds = (lat: number, lng: number, bounds: { north: number; south: number; east: number; west: number }) => {
    return lat >= bounds.south && lat <= bounds.north && lng >= bounds.west && lng <= bounds.east;
  };

  // Tính khoảng cách từ điểm đến đoạn thẳng (Haversine)
  const distancePointToSegment = (pointLat: number, pointLng: number, segStartLat: number, segStartLng: number, segEndLat: number, segEndLng: number): number => {
    if (!window.google?.maps?.geometry) return Infinity;
    
    const google = window.google.maps;
    const point = new google.LatLng(pointLat, pointLng);
    const segStart = new google.LatLng(segStartLat, segStartLng);
    const segEnd = new google.LatLng(segEndLat, segEndLng);
    
    // Tính khoảng cách từ điểm đến 2 đầu đoạn
    const distToStart = google.geometry.spherical.computeDistanceBetween(point, segStart);
    const distToEnd = google.geometry.spherical.computeDistanceBetween(point, segEnd);
    
    // Tính khoảng cách giữa 2 đầu đoạn
    const segLength = google.geometry.spherical.computeDistanceBetween(segStart, segEnd);
    
    if (segLength === 0) return distToStart;
    
    // Tính góc giữa vector từ start đến point và từ start đến end
    const bearing1 = google.geometry.spherical.computeHeading(segStart, point);
    const bearing2 = google.geometry.spherical.computeHeading(segStart, segEnd);
    
    // Tính khoảng cách vuông góc từ point đến đoạn thẳng
    const angle = Math.abs(bearing1 - bearing2) * Math.PI / 180;
    const perpendicularDist = distToStart * Math.sin(angle);
    
    // Kiểm tra xem điểm có nằm trong đoạn không (projection)
    const projectionDist = distToStart * Math.cos(angle);
    if (projectionDist < 0 || projectionDist > segLength) {
      // Nếu không, trả về khoảng cách đến điểm gần nhất
      return Math.min(distToStart, distToEnd);
    }
    
    return perpendicularDist;
  };

  // Tính khoảng cách tối thiểu từ điểm đến polyline
  const minDistancePointToPolyline = (pointLat: number, pointLng: number, polylinePoints: Array<{ lat: number; lng: number }>): number => {
    if (polylinePoints.length < 2) return Infinity;
    
    let minDist = Infinity;
    for (let i = 0; i < polylinePoints.length - 1; i++) {
      const segStart = polylinePoints[i];
      const segEnd = polylinePoints[i + 1];
      const dist = distancePointToSegment(pointLat, pointLng, segStart.lat, segStart.lng, segEnd.lat, segEnd.lng);
      minDist = Math.min(minDist, dist);
    }
    
    return minDist;
  };

  // Quét học sinh trong phạm vi 3km dọc theo đường đi
  const scanStudentsAlongRoute = async () => {
    if (!isMapReady || !originStop || !destinationStop || !originStop.lat || !originStop.lng || !destinationStop.lat || !destinationStop.lng) {
      return;
    }

    if (routeSegments.length === 0) {
      console.log('⚠️ No route segments yet, waiting...');
      return;
    }

    setLoadingAllStudents(true);
    try {
      console.log('🔄 Scanning students along route corridor (3km)...');
      
      // Decode tất cả polylines thành các điểm
      if (!window.google?.maps?.geometry?.encoding) {
        console.error('❌ Google Maps Geometry library not loaded');
        return;
      }

      const google = window.google.maps;
      const allPolylinePoints: Array<{ lat: number; lng: number }> = [];
      
      // Decode tất cả segments và gộp lại
      for (const segment of routeSegments) {
        try {
          const decodedPath = google.geometry.encoding.decodePath(segment.polyline);
          decodedPath.forEach(point => {
            allPolylinePoints.push({ lat: point.lat(), lng: point.lng() });
          });
        } catch (error) {
          console.error('❌ Failed to decode polyline segment:', error);
        }
      }

      if (allPolylinePoints.length === 0) {
        console.warn('⚠️ No polyline points decoded');
        return;
      }

      console.log(`📍 Decoded ${allPolylinePoints.length} points from route polyline`);

      // Load tất cả học sinh
      let allStudentsData: any[] = [];
      let currentPage = 1;
      let hasMore = true;
      const pageSize = 200;

      while (hasMore) {
        try {
          const response: any = await apiClient.request({
            method: 'get',
            url: '/students',
            params: { limit: pageSize, page: currentPage },
          });

          let pageStudents: any[] = [];
          if (response && typeof response === 'object') {
            const resp = response as any;
            if (Array.isArray(resp.data)) {
              pageStudents = resp.data;
            } else if (Array.isArray(resp)) {
              pageStudents = resp;
            }
          } else if (Array.isArray(response)) {
            pageStudents = response;
          }

          if (pageStudents.length > 0) {
            allStudentsData = [...allStudentsData, ...pageStudents];
          }

          const resp = response as any;
          const meta = resp?.meta || resp?.pagination || {};
          const totalPages = meta.totalPages || 1;
          const total = meta.total || meta.totalItems || 0;

          if (pageStudents.length === 0 || currentPage >= totalPages || (total > 0 && allStudentsData.length >= total)) {
            hasMore = false;
          } else {
            currentPage++;
          }
        } catch (error: any) {
          console.error(`❌ Page ${currentPage} failed:`, error);
          hasMore = false;
        }
      }

      console.log(`👥 Loaded ${allStudentsData.length} students from database`);

      // Chỉ quét học sinh dọc theo đường đi (polyline) với bán kính 3km
      const corridorRadiusKm = 3; // 3km dọc theo đường đi
      const corridorRadiusMeters = corridorRadiusKm * 1000; // Convert to meters

      // Filter học sinh trong phạm vi 3km DỌC THEO ĐƯỜNG ĐI (polyline)
      const studentsInCorridor = allStudentsData
        .filter((s: any) => {
          // Parse tọa độ từ database - đảm bảo đúng kiểu và giá trị
          let viDo: number | null = null;
          let kinhDo: number | null = null;
          
          // Xử lý nhiều định dạng có thể có từ database
          if (s.viDo != null && s.viDo !== '') {
            viDo = typeof s.viDo === 'string' ? parseFloat(s.viDo) : Number(s.viDo);
          }
          if (s.kinhDo != null && s.kinhDo !== '') {
            kinhDo = typeof s.kinhDo === 'string' ? parseFloat(s.kinhDo) : Number(s.kinhDo);
          }

          // Validate tọa độ hợp lệ
          if (!viDo || !kinhDo || 
              isNaN(viDo) || isNaN(kinhDo) || 
              !isFinite(viDo) || !isFinite(kinhDo) ||
              viDo === 0 || kinhDo === 0 ||
              Math.abs(viDo) > 90 || Math.abs(kinhDo) > 180) {
            return false;
          }

          // CHỈ tính khoảng cách đến polyline (đường đi màu xanh), KHÔNG quét quanh điểm bắt đầu
          const distToCorridor = minDistancePointToPolyline(viDo, kinhDo, allPolylinePoints); // Distance in meters

          // Nếu trong phạm vi 3km dọc theo đường đi
          return distToCorridor <= corridorRadiusMeters;
        })
        .map((s: any) => {
          // Parse lại tọa độ để đảm bảo đúng
          let viDo = s.viDo;
          let kinhDo = s.kinhDo;
          
          if (typeof viDo === 'string') viDo = parseFloat(viDo);
          if (typeof kinhDo === 'string') kinhDo = parseFloat(kinhDo);
          
          viDo = Number(viDo);
          kinhDo = Number(kinhDo);
          
          // Validate lại trước khi map
          if (isNaN(viDo) || isNaN(kinhDo) || !isFinite(viDo) || !isFinite(kinhDo)) {
            console.warn(`Student ${s.maHocSinh} has invalid coordinates after parsing:`, {
              original: { viDo: s.viDo, kinhDo: s.kinhDo },
              parsed: { viDo, kinhDo }
            });
            return null;
          }
          
          return {
            maHocSinh: s.maHocSinh,
            hoTen: s.hoTen,
            lop: s.lop,
            diaChi: s.diaChi, // Giữ nguyên địa chỉ từ database
            viDo: viDo, // Đảm bảo là number hợp lệ
            kinhDo: kinhDo, // Đảm bảo là number hợp lệ
            anhDaiDien: s.anhDaiDien,
          };
        })
        .filter((s): s is NonNullable<typeof s> => s !== null); // Filter out null values

      console.log(`✅ Found ${studentsInCorridor.length} students in 3km corridor along route`);

      setAllStudents(studentsInCorridor);
      setShowAllStudents(true);

      // Hiển thị học sinh trên map
      displayAllStudentMarkers();

      toast({
        title: 'Thành công',
        description: `Đã quét ${studentsInCorridor.length} học sinh trong phạm vi 3km dọc theo đường đi`,
        variant: 'default',
      });
    } catch (error: any) {
      console.error('❌ Failed to scan students along route:', error);
      toast({
        title: 'Lỗi',
        description: error?.message || 'Không thể quét học sinh dọc theo đường đi',
        variant: 'destructive',
      });
    } finally {
      setLoadingAllStudents(false);
    }
  };

  // Load tất cả học sinh có tọa độ, lọc theo quận dọc tuyến đường
  const loadAllStudents = async () => {
    if (!isMapReady) return;
    
    // Kiểm tra có origin và destination không
    if (!originStop || !destinationStop || !originStop.lat || !originStop.lng || !destinationStop.lat || !destinationStop.lng) {
      toast({
        title: 'Thông báo',
        description: 'Vui lòng nhập điểm bắt đầu và điểm kết thúc trước khi hiển thị học sinh',
        variant: 'default',
      });
      return;
    }
    
    setLoadingAllStudents(true);
    try {
      console.log('🔄 Loading students filtered by districts along route...');
      
      // Xác định các quận dọc tuyến đường
      const routeDistricts = getDistrictsAlongRoute(originStop, destinationStop);
      console.log('📍 Districts along route:', routeDistricts);
      
      if (routeDistricts.length === 0) {
        toast({
          title: 'Cảnh báo',
          description: 'Không thể xác định quận từ địa chỉ. Vui lòng kiểm tra lại địa chỉ.',
          variant: 'default',
        });
        setLoadingAllStudents(false);
        return;
      }
      
      // Backend có limit tối đa 200, cần load nhiều trang nếu có nhiều học sinh
      let allStudents: any[] = [];
      let currentPage = 1;
      let hasMore = true;
      const pageSize = 200; // Backend limit tối đa
      
      while (hasMore) {
        let response: any;
        try {
          response = await apiClient.request({
            method: 'get',
            url: '/students',
            params: {
              limit: pageSize,
              page: currentPage,
            },
          });
        } catch (error: any) {
          console.error(`❌ Page ${currentPage} request failed:`, error?.message || error);
          console.error(`❌ Error details:`, {
            status: error?.response?.status,
            statusText: error?.response?.statusText,
            data: error?.response?.data,
          });
          // Dừng pagination nếu có lỗi
          hasMore = false;
          break;
        }
        
        // Backend trả về: { success: true, data: [...], meta: {...} }
        // apiClient.request() trả về response.data (đã unwrap), nên response là { success, data, meta }
        let pageStudents: any[] = [];
        
        // Log response để debug
        console.log(`📥 Page ${currentPage} response type:`, typeof response);
        console.log(`📥 Page ${currentPage} response isArray:`, Array.isArray(response));
        if (response && typeof response === 'object') {
          console.log(`📥 Page ${currentPage} response keys:`, Object.keys(response));
          console.log(`📥 Page ${currentPage} response.data type:`, typeof (response as any).data);
          console.log(`📥 Page ${currentPage} response.data isArray:`, Array.isArray((response as any).data));
          if ((response as any).data && Array.isArray((response as any).data)) {
            console.log(`📥 Page ${currentPage} response.data length:`, (response as any).data.length);
            if ((response as any).data.length > 0) {
              console.log(`📥 Page ${currentPage} first student sample:`, {
                id: (response as any).data[0].maHocSinh,
                name: (response as any).data[0].hoTen,
                viDo: (response as any).data[0].viDo,
                kinhDo: (response as any).data[0].kinhDo,
              });
            }
          }
        }
        
        // Kiểm tra response có lỗi không
        if (response && typeof response === 'object') {
          const resp = response as any;
          
          // // Kiểm tra nếu có lỗi
          // if (resp.success === false || resp.error) {
          //   console.error(`❌ Page ${currentPage}: API returned error:`, {
          //     success: resp.success,
          //     error: resp.error,
          //     message: resp.message,
          //   });
          //   hasMore = false;
          //   break;
          // }
          
          // Format chuẩn: { success: true, data: [...], meta: {...} }
          if (Array.isArray(resp.data)) {
            pageStudents = resp.data;
            console.log(`✅ Page ${currentPage}: Parsed ${pageStudents.length} students from resp.data`);
          } 
          // Fallback: nếu response là array trực tiếp
          else if (Array.isArray(resp)) {
            pageStudents = resp;
            console.log(`✅ Page ${currentPage}: Parsed ${pageStudents.length} students from resp (direct array)`);
          }
          // Fallback: nếu data là object chứa array
          else if (resp.data && typeof resp.data === 'object' && Array.isArray(resp.data.data)) {
            pageStudents = resp.data.data;
            console.log(`✅ Page ${currentPage}: Parsed ${pageStudents.length} students from resp.data.data (nested)`);
          } else {
            console.warn(`⚠️ Page ${currentPage}: Could not parse students. Response structure:`, {
              success: resp.success,
              hasData: 'data' in resp,
              dataType: typeof resp.data,
              isDataArray: Array.isArray(resp.data),
              responseKeys: Object.keys(resp),
              responseSample: JSON.stringify(resp).substring(0, 500),
            });
          }
        } else if (Array.isArray(response)) {
          // Nếu response là array trực tiếp
          pageStudents = response;
          console.log(`✅ Page ${currentPage}: Parsed ${pageStudents.length} students from response (direct array)`);
        } else {
          console.error(`❌ Page ${currentPage}: Invalid response type:`, typeof response, response);
        }
        
        console.log(`📦 Page ${currentPage}: Parsed ${pageStudents.length} students`);
        
        // Accumulate students
        if (pageStudents.length > 0) {
          allStudents = [...allStudents, ...pageStudents];
          console.log(`✅ Page ${currentPage}: Added ${pageStudents.length} students. Total: ${allStudents.length}`);
        }
        
        // Kiểm tra pagination
        const resp = response as any;
        const meta = resp?.meta || resp?.pagination || {};
        const totalPages = meta.totalPages || 1;
        const total = meta.total || meta.totalItems || 0;
        
        console.log(`📊 Page ${currentPage}/${totalPages}, Total in DB: ${total}, Loaded: ${allStudents.length}`);
        
        // Dừng pagination nếu:
        // 1. Không còn students trong trang này
        // 2. Đã load hết tất cả trang
        // 3. Đã load đủ số lượng
        if (pageStudents.length === 0 || currentPage >= totalPages || (total > 0 && allStudents.length >= total)) {
          hasMore = false;
          console.log(`🛑 Stopping pagination at page ${currentPage}`);
        } else {
          currentPage++;
        }
      }
      
      console.log('👥 Total students loaded:', allStudents.length);
      
      // Nếu không load được gì từ pagination, thử lại với single request
      if (allStudents.length === 0) {
        console.warn('⚠️ No students loaded from pagination. Trying alternative methods...');
        
        // Thử method 1: Direct request với limit nhỏ hơn
        try {
          console.log('🔍 Trying method 1: Direct request with limit 100...');
          const method1Response = await apiClient.request({
            method: 'get',
            url: '/students',
            params: { limit: 100, page: 1 },
          });
          
          console.log('🔍 Method 1 response:', method1Response);
          const resp1 = method1Response as any;
          
          if (resp1 && resp1.success !== false) {
            if (Array.isArray(resp1.data)) {
              allStudents = resp1.data;
              console.log(`✅ Method 1 success: Loaded ${allStudents.length} students`);
            } else if (Array.isArray(resp1)) {
              allStudents = resp1;
              console.log(`✅ Method 1 success: Loaded ${allStudents.length} students (direct array)`);
            }
          }
        } catch (err1: any) {
          console.error('❌ Method 1 failed:', err1?.message || err1);
          console.error('❌ Method 1 error details:', {
            status: err1?.response?.status,
            statusText: err1?.response?.statusText,
            data: err1?.response?.data,
          });
        }
        
        // Nếu method 1 vẫn không được, thử method 2: Không có params
        if (allStudents.length === 0) {
          try {
            console.log('🔍 Trying method 2: Request without params...');
            const method2Response = await apiClient.request({
              method: 'get',
              url: '/students',
            });
            
            console.log('🔍 Method 2 response:', method2Response);
            const resp2 = method2Response as any;
            
            if (resp2 && resp2.success !== false) {
              if (Array.isArray(resp2.data)) {
                allStudents = resp2.data;
                console.log(`✅ Method 2 success: Loaded ${allStudents.length} students`);
              } else if (Array.isArray(resp2)) {
                allStudents = resp2;
                console.log(`✅ Method 2 success: Loaded ${allStudents.length} students (direct array)`);
              }
            }
          } catch (err2: any) {
            console.error('❌ Method 2 failed:', err2?.message || err2);
            console.error('❌ Method 2 error details:', {
              status: err2?.response?.status,
              statusText: err2?.response?.statusText,
              data: err2?.response?.data,
            });
          }
        }
        
        if (allStudents.length === 0) {
          console.error('❌ All methods failed. Please check:');
          console.error('  1. Backend server is running');
          console.error('  2. API endpoint /students is accessible');
          console.error('  3. Authentication token is valid');
          console.error('  4. Network connection');
        }
      }
      
      // Lọc chỉ lấy học sinh có tọa độ VÀ trong các quận dọc tuyến (KHÔNG dùng bounding box)
      const studentsWithCoords = allStudents.filter((s: any) => {
        if (!s) {
          console.warn('⚠️ Null student object found');
          return false;
        }
        
        // Kiểm tra tọa độ - cho phép cả số và chuỗi số
        const viDo = s.viDo != null ? Number(s.viDo) : null;
        const kinhDo = s.kinhDo != null ? Number(s.kinhDo) : null;
        
        const hasCoords = viDo != null && kinhDo != null && 
          !isNaN(viDo) && !isNaN(kinhDo) &&
          viDo !== 0 && kinhDo !== 0 &&
          Math.abs(viDo) <= 90 && Math.abs(kinhDo) <= 180; // Validate lat/lng range
        
        if (!hasCoords) {
          return false;
        }
        
        // CHỈ lọc theo quận - không dùng bounding box
        if (routeDistricts.length > 0 && s.diaChi) {
          const studentDistrict = extractDistrict(s.diaChi);
          if (!studentDistrict || !routeDistricts.some(d => 
            d.toLowerCase() === studentDistrict.toLowerCase() ||
            studentDistrict.toLowerCase().includes(d.toLowerCase()) ||
            d.toLowerCase().includes(studentDistrict.toLowerCase())
          )) {
            return false;
          }
        } else if (routeDistricts.length === 0) {
          // Nếu không xác định được quận, không lọc gì cả (hiển thị tất cả)
          console.warn('⚠️ Could not determine districts, showing all students');
        }
        
        return true;
      }).map((s: any) => ({
        maHocSinh: s.maHocSinh,
        hoTen: s.hoTen,
        lop: s.lop,
        diaChi: s.diaChi,
        viDo: Number(s.viDo),
        kinhDo: Number(s.kinhDo),
        anhDaiDien: s.anhDaiDien, // Thêm anhDaiDien vào state
      }));
      
      console.log('✅ Students filtered by districts:', studentsWithCoords.length);
      console.log('📍 Route districts:', routeDistricts);
      console.log('❌ Students filtered out:', allStudents.length - studentsWithCoords.length);
      
      if (studentsWithCoords.length > 0) {
        console.log('📍 Sample student with coords:', studentsWithCoords[0]);
      } else if (allStudents.length > 0) {
        console.warn('⚠️ All students lack coordinates. Sample student:', allStudents[0]);
        // Log thêm thông tin để debug
        console.warn('⚠️ First 3 students details:', allStudents.slice(0, 3).map(s => ({
          id: s.maHocSinh,
          name: s.hoTen,
          viDo: s.viDo,
          kinhDo: s.kinhDo,
          viDoType: typeof s.viDo,
          kinhDoType: typeof s.kinhDo,
        })));
      }
      
      setAllStudents(studentsWithCoords);
      
      // KHÔNG tự động điều chỉnh route ở đây - chỉ hiển thị học sinh
      // Route sẽ được điều chỉnh khi thêm điểm dừng
      
      const districtText = routeDistricts.length > 0 
        ? ` (${routeDistricts.map(d => `Q${d}`).join(', ')})`
        : '';
      
      toast({
        title: 'Thành công',
        description: `Đã tải ${studentsWithCoords.length} học sinh${districtText}`,
        variant: 'default',
      });
    } catch (error: any) {
      console.error('❌ Failed to load all students:', error);
      toast({
        title: 'Lỗi',
        description: error?.message || 'Không thể tải danh sách học sinh',
        variant: 'destructive',
      });
    } finally {
      setLoadingAllStudents(false);
    }
  };
  
  // Hiển thị tất cả markers cho học sinh
  const displayAllStudentMarkers = () => {
    if (!mapInstanceRef.current || !isMapReady || !window.google?.maps) return;
    
    const google: typeof window.google = window.google;
    
    // Xóa markers cũ
    allStudentMarkersRef.current.forEach((marker) => {
      marker.setMap(null);
    });
    allStudentMarkersRef.current.clear();
    
    if (!showAllStudents || allStudents.length === 0) return;
    
    // Tạo marker cho mỗi học sinh - ĐẢM BẢO DÙNG ĐÚNG TỌA ĐỘ TỪ DATABASE
    // Track các tọa độ đã dùng để tránh trùng lặp
    const usedPositions = new Map<string, number>();
    
    allStudents.forEach((student, index) => {
      // Kiểm tra tọa độ hợp lệ
      if (!student.viDo || !student.kinhDo || isNaN(student.viDo) || isNaN(student.kinhDo)) {
        console.warn(`⚠️ Student ${student.hoTen} (${student.maHocSinh}) has invalid coordinates:`, {
          viDo: student.viDo,
          kinhDo: student.kinhDo,
          diaChi: student.diaChi,
        });
        return; // Bỏ qua học sinh không có tọa độ hợp lệ
      }
      
      // ĐẢM BẢO MỖI HỌC SINH HIỂN THỊ Ở ĐÚNG ĐỊA CHỈ NHÀ - KHÔNG GOM LẠI
      // SỬ DỤNG TỌA ĐỘ CHÍNH XÁC TỪ DATABASE, KHÔNG ĐIỀU CHỈNH
      let studentLat = Number(student.viDo);
      let studentLng = Number(student.kinhDo);
      
      // CHỈ offset khi thực sự trùng lặp (tolerance rất nhỏ ~0.1m, chỉ khi cùng địa chỉ)
      // Dùng tolerance nhỏ hơn để không gom các học sinh ở địa chỉ khác nhau
      const positionKey = `${studentLat.toFixed(6)},${studentLng.toFixed(6)}`; // Tăng độ chính xác lên 6 số thập phân
      const existingCount = usedPositions.get(positionKey) || 0;
      
      // CHỈ offset khi thực sự trùng lặp (cùng địa chỉ, tolerance ~0.1m)
      if (existingCount > 0) {
        const offset = 0.00001 * existingCount; // ~1m mỗi lần offset (giảm từ 5m xuống 1m)
        studentLat += offset;
        studentLng += offset;
        console.log(`⚠️ Student ${student.hoTen} có tọa độ TRÙNG LẶP với học sinh khác (cùng địa chỉ), đã thêm offset nhỏ:`, {
          original: { lat: Number(student.viDo), lng: Number(student.kinhDo) },
          adjusted: { lat: studentLat, lng: studentLng },
          offset: `${offset * 111000}m` // Convert sang mét
        });
      }
      
      usedPositions.set(positionKey, existingCount + 1);
      
      // Log để debug - đảm bảo mỗi học sinh có tọa độ riêng
      console.log(`📍 Student ${student.hoTen} (${student.maHocSinh}):`, {
        diaChi: student.diaChi,
        viDo: studentLat,
        kinhDo: studentLng,
        originalViDo: Number(student.viDo),
        originalKinhDo: Number(student.kinhDo),
        index: index
      });
      
      // Tạo marker cho từng học sinh - KHÔNG CLUSTER, hiển thị đúng tọa độ nhà từ database
      // Đảm bảo mỗi học sinh có marker riêng ở đúng tọa độ nhà
      const marker = new google.maps.Marker({
        position: { lat: studentLat, lng: studentLng }, // Dùng ĐÚNG tọa độ nhà từ database (viDo, kinhDo)
        map: mapInstanceRef.current!,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 14, // Tăng kích thước để không bị cluster và dễ thấy
          fillColor: '#10B981', // Màu xanh lá để phân biệt với điểm dừng
          fillOpacity: 1.0,
          strokeColor: 'white',
          strokeWeight: 3,
        },
        title: `${student.hoTen} - ${student.lop}\n${student.diaChi || 'Chưa có địa chỉ'}\nTọa độ: ${studentLat.toFixed(6)}, ${studentLng.toFixed(6)}`,
        zIndex: 400 + index, // Mỗi marker có zIndex khác nhau
        optimized: false, // QUAN TRỌNG: Tắt tối ưu hóa để không bị cluster
        collisionBehavior: google.maps.CollisionBehavior.OPTIONAL_AND_HIDES_LOWER_PRIORITY, // Cho phép overlap thay vì cluster
        animation: null, // Không animation để tránh clustering
        label: {
          text: student.hoTen?.charAt(0) || 'H',
          color: 'white',
          fontSize: '14px',
          fontWeight: 'bold',
        },
        // Thêm các thuộc tính để đảm bảo không bị cluster
        visible: true,
        clickable: true,
        draggable: false,
      });
      
      // QUAN TRỌNG: Đảm bảo marker không bị Google Maps tự động cluster
      // Set lại position để đảm bảo marker hiển thị đúng vị trí
      marker.setPosition({ lat: studentLat, lng: studentLng });
      
      // Log để debug - đảm bảo mỗi marker có tọa độ riêng
      console.log(`✅ Marker created for ${student.hoTen}:`, {
        maHocSinh: student.maHocSinh,
        position: { lat: studentLat, lng: studentLng },
        diaChi: student.diaChi,
        markerId: student.maHocSinh,
        zIndex: 400 + index
      });
      
      // Tìm trạm gần nhất
      const findNearestStop = (studentLat: number, studentLng: number): { stop: Stop | null; distance: number } => {
        let nearestStop: Stop | null = null;
        let minDistance = Infinity;
        
        const allStops: Stop[] = [];
        if (originStop) allStops.push(originStop);
        if (destinationStop) allStops.push(destinationStop);
        allStops.push(...stops);
        
        allStops.forEach((stop) => {
          if (stop.lat && stop.lng) {
            const distance = google.maps.geometry.spherical.computeDistanceBetween(
              new google.maps.LatLng(studentLat, studentLng),
              new google.maps.LatLng(stop.lat, stop.lng)
            );
            if (distance < minDistance) {
              minDistance = distance;
              nearestStop = stop;
            }
          }
        });
        
        return { stop: nearestStop, distance: minDistance };
      };
      
      const nearestStopInfo = findNearestStop(student.viDo, student.kinhDo);
      const distanceKm = (nearestStopInfo.distance / 1000).toFixed(2);
      
      // Info window khi click - cải thiện hiển thị đẹp và rõ ràng
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 16px; min-width: 320px; max-width: 400px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
            <!-- Header với avatar -->
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #E5E7EB;">
              <div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #10B981 0%, #059669 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                ${student.hoTen?.charAt(0)?.toUpperCase() || 'H'}
              </div>
              <div style="flex: 1;">
                <h3 style="margin: 0 0 4px 0; font-size: 18px; font-weight: 700; color: #111827; line-height: 1.2;">${student.hoTen || 'Chưa có tên'}</h3>
                <p style="margin: 0; font-size: 14px; color: #6B7280;">
                  <span style="background: #EFF6FF; color: #1E40AF; padding: 2px 8px; border-radius: 4px; font-weight: 600;">Lớp ${student.lop || 'N/A'}</span>
                </p>
              </div>
            </div>
            
            <!-- Địa chỉ - hiển thị đẹp và rõ ràng -->
            <div style="margin-bottom: 12px;">
              <div style="display: flex; align-items: start; gap: 10px; padding: 12px; background: #F9FAFB; border-radius: 8px; border-left: 3px solid #10B981;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" style="margin-top: 2px; flex-shrink: 0;">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                <div style="flex: 1; min-width: 0;">
                  <p style="margin: 0 0 6px 0; font-size: 11px; color: #6B7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Địa chỉ nhà</p>
                  <p style="margin: 0; font-size: 14px; color: #111827; line-height: 1.6; word-wrap: break-word; white-space: normal;">
                    ${student.diaChi ? `<span style="font-weight: 500;">${student.diaChi}</span>` : '<span style="color: #9CA3AF; font-style: italic;">Chưa có địa chỉ</span>'}
                  </p>
                  ${student.viDo && student.kinhDo ? `
                    <p style="margin: 4px 0 0 0; font-size: 11px; color: #9CA3AF; font-family: monospace;">
                      📍 ${Number(student.viDo).toFixed(6)}, ${Number(student.kinhDo).toFixed(6)}
                    </p>
                  ` : ''}
                </div>
              </div>
            </div>
            
            <!-- Trạm gần nhất và khoảng cách -->
            ${nearestStopInfo.stop ? `
            <div style="display: flex; align-items: start; gap: 10px; padding: 12px; background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%); border-radius: 8px; border-left: 3px solid #10B981; margin-top: 8px;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" style="margin-top: 2px; flex-shrink: 0;">
                <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                <path d="M2 17l10 5 10-5"></path>
                <path d="M2 12l10 5 10-5"></path>
              </svg>
              <div style="flex: 1;">
                <p style="margin: 0 0 6px 0; font-size: 11px; color: #059669; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Trạm gần nhất</p>
                <p style="margin: 0 0 4px 0; font-size: 15px; color: #111827; font-weight: 700;">${nearestStopInfo.stop.name}</p>
                <div style="display: flex; align-items: center; gap: 6px; margin-top: 6px;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2">
                    <path d="M5 12h14M12 5l7 7-7 7"></path>
                  </svg>
                  <p style="margin: 0; font-size: 13px; color: #059669; font-weight: 600;">
                    Khoảng cách: <span style="background: white; padding: 2px 6px; border-radius: 4px; font-weight: 700;">${distanceKm} km</span>
                  </p>
                </div>
              </div>
            </div>
            ` : `
            <div style="padding: 12px; background: #FEF3C7; border-radius: 8px; border-left: 3px solid #F59E0B; margin-top: 8px;">
              <p style="margin: 0; font-size: 13px; color: #92400E;">
                ⚠️ Chưa có điểm dừng nào được thiết lập
              </p>
            </div>
            `}
          </div>
        `,
      });
      
      marker.addListener('click', async () => {
        // Đóng tất cả info windows khác
        allStudentMarkersRef.current.forEach((m) => {
          const iw = (m as any).infoWindow;
          if (iw) iw.close();
        });
        
        // Xóa polyline cũ của học sinh này
        const oldPolyline = studentToStopPolylinesRef.current.get(student.maHocSinh);
        if (oldPolyline) {
          oldPolyline.setMap(null);
          studentToStopPolylinesRef.current.delete(student.maHocSinh);
        }
        
        // Tự động vẽ đường từ nhà học sinh tới trạm gần nhất khi click
        if (nearestStopInfo.stop && nearestStopInfo.stop.lat && nearestStopInfo.stop.lng) {
          try {
            const response = await apiClient.getDirections({
              origin: `${student.viDo},${student.kinhDo}`,
              destination: `${nearestStopInfo.stop.lat},${nearestStopInfo.stop.lng}`,
              mode: 'driving',
            });
            
            if (response.success && (response.data as any)?.polyline) {
              const polyline = (response.data as any).polyline;
              const decodedPath = google.maps.geometry.encoding.decodePath(polyline);
              
              const routePolyline = new google.maps.Polyline({
                path: decodedPath,
                geodesic: true,
                strokeColor: '#3B82F6',
                strokeOpacity: 0.8,
                strokeWeight: 3,
                map: mapInstanceRef.current,
                zIndex: 300,
              });
              
              studentToStopPolylinesRef.current.set(student.maHocSinh, routePolyline);
            }
          } catch (error) {
            console.warn(`Failed to get route for student ${student.maHocSinh}:`, error);
            // Fallback: vẽ đường thẳng
            const fallbackLat = nearestStopInfo.stop?.lat;
            const fallbackLng = nearestStopInfo.stop?.lng;
            if (fallbackLat != null && fallbackLng != null && typeof fallbackLat === 'number' && typeof fallbackLng === 'number') {
              const directPath = [
                { lat: student.viDo, lng: student.kinhDo },
                { lat: fallbackLat, lng: fallbackLng },
              ];
              
              const routePolyline = new google.maps.Polyline({
                path: directPath,
                geodesic: true,
                strokeColor: '#3B82F6',
                strokeOpacity: 0.5,
                strokeWeight: 2,
                map: mapInstanceRef.current,
                zIndex: 300,
              });
              
              studentToStopPolylinesRef.current.set(student.maHocSinh, routePolyline);
            }
          }
        }
        
        infoWindow.open(mapInstanceRef.current!, marker);
        (marker as any).infoWindow = infoWindow;
      });
      
      allStudentMarkersRef.current.set(student.maHocSinh, marker);
    });
    
    // Vẽ đường đi từ học sinh tới trạm gần nhất nếu bật
    if (showStudentRoutes) {
      drawStudentRoutes();
    }
  };
  
  // Vẽ đường đi từ học sinh tới trạm gần nhất
  const drawStudentRoutes = async () => {
    if (!mapInstanceRef.current || !isMapReady || !window.google?.maps || allStudents.length === 0) return;
    
    const google: typeof window.google = window.google;
    
    // Xóa polylines cũ
    studentToStopPolylinesRef.current.forEach((polyline) => {
      polyline.setMap(null);
    });
    studentToStopPolylinesRef.current.clear();
    
    // Lấy tất cả các điểm dừng
    const allStops: Stop[] = [];
    if (originStop) allStops.push(originStop);
    if (destinationStop) allStops.push(destinationStop);
    allStops.push(...stops);
    
    if (allStops.length === 0) return;
    
    // Vẽ đường đi cho mỗi học sinh
    for (const student of allStudents) {
      // Tìm trạm gần nhất
      let nearestStop: Stop | null = null;
      let minDistance = Infinity;
      
      allStops.forEach((stop) => {
        const stopLat = stop.lat;
        const stopLng = stop.lng;
        if (stopLat != null && stopLng != null && typeof stopLat === 'number' && typeof stopLng === 'number') {
          const distance = google.maps.geometry.spherical.computeDistanceBetween(
            new google.maps.LatLng(student.viDo, student.kinhDo),
            new google.maps.LatLng(stopLat, stopLng)
          );
          if (distance < minDistance) {
            minDistance = distance;
            nearestStop = stop;
          }
        }
      });
      
      if (!nearestStop) continue;
      
      // Type assertion để TypeScript hiểu rằng nearestStop không null
      const validStop = nearestStop as Stop & { lat: number; lng: number };
      const stopLatValue = validStop.lat;
      const stopLngValue = validStop.lng;
      if (stopLatValue == null || stopLngValue == null || typeof stopLatValue !== 'number' || typeof stopLngValue !== 'number') continue;
      
      try {
        // Lấy directions từ Google Maps API
        const response = await apiClient.getDirections({
          origin: `${student.viDo},${student.kinhDo}`,
          destination: `${stopLatValue},${stopLngValue}`,
          mode: 'driving',
        });
        
        if (response.success && (response.data as any)?.polyline) {
          const polyline = (response.data as any).polyline;
          const decodedPath = google.maps.geometry.encoding.decodePath(polyline);
          
          const routePolyline = new google.maps.Polyline({
            path: decodedPath,
            geodesic: true,
            strokeColor: '#3B82F6',
            strokeOpacity: 0.6,
            strokeWeight: 2,
            map: mapInstanceRef.current,
            zIndex: 300,
          });
          
          studentToStopPolylinesRef.current.set(student.maHocSinh, routePolyline);
        }
      } catch (error) {
        console.warn(`Failed to get route for student ${student.maHocSinh}:`, error);
        // Fallback: vẽ đường thẳng nếu API fail
        const directPath = [
          { lat: student.viDo, lng: student.kinhDo },
          { lat: stopLatValue, lng: stopLngValue },
        ];
        
        const routePolyline = new google.maps.Polyline({
          path: directPath,
          geodesic: true,
          strokeColor: '#3B82F6',
          strokeOpacity: 0.4,
          strokeWeight: 1,
          map: mapInstanceRef.current,
          zIndex: 300,
        });
        
        studentToStopPolylinesRef.current.set(student.maHocSinh, routePolyline);
      }
    }
  };
  
  // Effect để load học sinh khi toggle bật lần đầu
  useEffect(() => {
    if (showAllStudents && allStudents.length === 0 && isMapReady) {
      loadAllStudents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAllStudents, isMapReady]);
  
  // Effect để hiển thị/ẩn markers khi data hoặc toggle thay đổi
  useEffect(() => {
    if (!isMapReady) return;
    
    if (showAllStudents && allStudents.length > 0) {
      displayAllStudentMarkers();
    } else {
      // Xóa markers khi tắt
      allStudentMarkersRef.current.forEach((marker) => {
        marker.setMap(null);
      });
      allStudentMarkersRef.current.clear();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAllStudents, allStudents.length, isMapReady]);

  // Confirm pending stop - add it to stops (đơn giản hóa)
  const confirmPendingStop = async () => {
    if (!pendingStop) return;
    
    // Validation: Tên điểm dừng không được để trống
    if (!pendingStop.name.trim()) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng nhập tên điểm dừng',
        variant: 'destructive',
      });
      return;
    }
    
    // Tạo confirmed stop
    const confirmedStop: Stop = {
      ...pendingStop,
      id: Date.now().toString(),
      sequence: stops.length + 1,
      name: pendingStop.name.trim(),
    };
    
    const updatedStops = [...stops, confirmedStop];
    setStops(updatedStops);
    setSelectedStopId(confirmedStop.id);
    
    // Clear pending state
    setPendingStop(null);
    setSelectedStopForStudents(null);
    setNearbyStudents([]);
    
    // Remove pending marker
    if (pendingMarkerRef.current) {
      pendingMarkerRef.current.setMap(null);
      pendingMarkerRef.current = null;
    }
    
    // Xóa student markers
    studentMarkersRef.current.forEach((marker) => {
      marker.setMap(null);
    });
    studentMarkersRef.current.clear();
    
    // Update markers to show the new confirmed stop
    updateMarkers();
    
    // Trigger update route - route sẽ tự động đi qua điểm dừng mới
    if (updatedStops.filter((s) => s.lat && s.lng).length >= 1 && originStop && destinationStop) {
      setTimeout(() => {
        updateRoute();
      }, 100);
    }
    
    toast({
      title: 'Đã thêm điểm dừng',
      description: `${confirmedStop.name} đã được thêm vào tuyến đường`,
    });
  };

  // Cancel pending stop - remove it but keep add mode
  const cancelPendingStop = () => {
    setPendingStop(null);
    setSelectedStopForStudents(null);
    setNearbyStudents([]);
    
    // Remove pending marker
    if (pendingMarkerRef.current) {
      pendingMarkerRef.current.setMap(null);
      pendingMarkerRef.current = null;
    }
    
    // Xóa student markers
    studentMarkersRef.current.forEach((marker) => {
      marker.setMap(null);
    });
    studentMarkersRef.current.clear();
    
    toast({
      title: 'Đã hủy',
      description: 'Điểm dừng tạm thời đã được hủy',
    });
  };

  const removeStop = (id: string) => {
    if (stops.length <= 1) {
      toast({
        title: 'Không thể xóa',
        description: 'Tuyến đường cần ít nhất một điểm dừng',
        variant: 'destructive',
      });
      return;
    }

    // Tìm stop bị xóa để kiểm tra xem có trong suggestions không
    const removedStop = stops.find(s => s.id === id);
    
    const newStops = stops
      .filter((s) => s.id !== id)
      .map((s, idx) => ({ ...s, sequence: idx + 1 }));
    setStops(newStops);
    
    // Nếu stop bị xóa có trong allSuggestions (match theo lat/lng), hiển thị lại suggestions
    if (removedStop && removedStop.lat && removedStop.lng && allSuggestions.length > 0) {
      const tolerance = 0.0001;
      const hasMatch = allSuggestions.some((suggestion) => {
        if (!suggestion.lat || !suggestion.lng) return false;
        const latDiff = Math.abs(removedStop.lat! - suggestion.lat);
        const lngDiff = Math.abs(removedStop.lng! - suggestion.lng);
        return latDiff < tolerance && lngDiff < tolerance;
      });
      
      if (hasMatch && !showSuggestions) {
        setShowSuggestions(true);
      }
    }
    
    if (selectedStopId === id) {
      setSelectedStopId(null);
    }
  };

  const updateStop = (id: string, field: keyof Stop, value: string | number) => {
    setStops(
      stops.map((stop) =>
        stop.id === id ? { ...stop, [field]: value } : stop
      )
    );
  };

  const handleMarkerDrag = async (stopId: string, lat: number, lng: number) => {
    try {
      // Reverse geocode to get new address
      const response = await apiClient.reverseGeocode({
        latlng: `${lat},${lng}`,
      });

      let address = '';
      if (response.success && response.data) {
        const results = (response.data as any)?.results;
        if (results && results.length > 0) {
          address = results[0].formatted_address || '';
        }
      }

      if (!address) {
        address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      }

      // Update origin, destination, or stop coordinates and address
      if (stopId === 'origin' && originStop) {
        setOriginStop({ ...originStop, lat, lng, address });
      } else if (stopId === 'destination' && destinationStop) {
        setDestinationStop({ ...destinationStop, lat, lng, address });
      } else {
        // Update stop coordinates and address
        const updatedStops = stops.map((stop) =>
          stop.id === stopId
            ? { ...stop, lat, lng, address }
            : stop
        );
        setStops(updatedStops);
      }

      // Trigger update route để cập nhật polyline
      setTimeout(() => {
        updateRoute();
      }, 100);

      toast({
        title: 'Đã di chuyển điểm',
        description: 'Địa chỉ đã được cập nhật tự động',
      });
    } catch (error) {
      console.error('Failed to reverse geocode:', error);
      // Update coordinates anyway
      if (stopId === 'origin' && originStop) {
        setOriginStop({ ...originStop, lat, lng, address: `${lat.toFixed(6)}, ${lng.toFixed(6)}` });
      } else if (stopId === 'destination' && destinationStop) {
        setDestinationStop({ ...destinationStop, lat, lng, address: `${lat.toFixed(6)}, ${lng.toFixed(6)}` });
      } else {
        setStops(
          stops.map((stop) =>
            stop.id === stopId
              ? { ...stop, lat, lng, address: `${lat.toFixed(6)}, ${lng.toFixed(6)}` }
              : stop
          )
        );
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = stops.findIndex((s) => s.id === active.id);
    const newIndex = stops.findIndex((s) => s.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newStops = arrayMove(stops, oldIndex, newIndex).map((stop, idx) => ({
      ...stop,
      sequence: idx + 1,
    }));

    setStops(newStops);
  };

  // Đề xuất điểm dừng dựa trên học sinh - CHỈ dùng điểm bắt đầu và điểm kết thúc
  const handleSuggestStops = async () => {
    try {
      // 🔥 Validation: Phải có origin và destination
      if (!originStop?.lat || !originStop?.lng) {
        toast({
          title: "Thiếu thông tin",
          description: "Vui lòng chọn điểm bắt đầu trước khi đề xuất điểm dừng",
          variant: "destructive",
        });
        return;
      }

      if (!destinationStop?.lat || !destinationStop?.lng) {
        toast({
          title: "Thiếu thông tin",
          description: "Vui lòng chọn điểm kết thúc trước khi đề xuất điểm dừng",
          variant: "destructive",
        });
        return;
      }

      setLoadingSuggestions(true);
      setShowSuggestions(true);

      // 🔥 CHỈ dùng origin và destination, không dùng area hay các tham số khác
      const originParam = `${originStop.lat},${originStop.lng}`;
      const destinationParam = `${destinationStop.lat},${destinationStop.lng}`;

      const response = await apiClient.suggestStops({
        // Không dùng area - chỉ dựa vào origin và destination
        maxDistanceKm: 2.0,
        minStudentsPerStop: 1, // Giảm xuống 1 để có thể đề xuất ngay cả khi chỉ có 1 học sinh
        maxStops: 20,
        origin: originParam, // 🔥 Bắt buộc: điểm bắt đầu
        destination: destinationParam, // 🔥 Bắt buộc: điểm kết thúc
        optimizeRoute: true, // Tối ưu lộ trình dựa trên origin và destination
      });

      const data = (response as any).data || {};
      const suggestionsList = data.suggestions || [];

      if (suggestionsList.length === 0) {
        toast({
          title: "Không có đề xuất",
          description: "Không tìm thấy học sinh để đề xuất điểm dừng",
          variant: "default",
        });
        setShowSuggestions(false);
        return;
      }

      setAllSuggestions(suggestionsList);

      toast({
        title: "Đề xuất thành công",
        description: `Đã tìm thấy ${suggestionsList.length} điểm dừng đề xuất`,
      });
    } catch (error: any) {
      console.error("Failed to get stop suggestions:", error);
      toast({
        title: "Lỗi",
        description: error?.message || "Không thể lấy đề xuất điểm dừng",
        variant: "destructive",
      });
      setShowSuggestions(false);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Chọn một đề xuất và thêm vào stops
  const handleSelectSuggestion = (suggestion: typeof allSuggestions[0]) => {
    if (!suggestion.lat || !suggestion.lng) {
      toast({
        title: "Lỗi",
        description: "Điểm dừng này chưa có tọa độ. Vui lòng geocode địa chỉ trước.",
        variant: "destructive",
      });
      return;
    }

    // Tính thời gian dừng dựa trên số học sinh
    const estimatedTime = calculateEstimatedTime(suggestion.studentCount);

    const newStop: Stop = {
      id: Date.now().toString(),
      name: suggestion.name,
      address: suggestion.address,
      lat: suggestion.lat,
      lng: suggestion.lng,
      estimatedTime: estimatedTime,
      sequence: stops.length + 1,
    };

    setStops([...stops, newStop]);
    setSelectedStopId(newStop.id);
    setShowSuggestions(false);

    toast({
      title: "Đã thêm điểm dừng",
      description: `${suggestion.name} đã được thêm (${suggestion.studentCount} học sinh)`,
    });

    // Update map markers
    setTimeout(() => {
      updateMarkers();
      const updatedStops = [...stops, newStop];
      if (updatedStops.length >= 1) {
        updateRoute();
      }
    }, 100);
  };

  // Chọn tất cả đề xuất
  const handleSelectAllSuggestions = () => {
    const validSuggestions = filteredSuggestions.filter((s) => s.lat && s.lng);
    if (validSuggestions.length === 0) {
      toast({
        title: "Lỗi",
        description: "Không có đề xuất hợp lệ để thêm",
        variant: "destructive",
      });
      return;
    }

    const newStops: Stop[] = validSuggestions.map((suggestion, idx) => ({
      id: `suggestion_${Date.now()}_${idx}`,
      name: suggestion.name,
      address: suggestion.address,
      lat: suggestion.lat!,
      lng: suggestion.lng!,
      estimatedTime: calculateEstimatedTime(suggestion.studentCount),
      sequence: stops.length + idx + 1,
    }));

    setStops([...stops, ...newStops]);
    setShowSuggestions(false);

    toast({
      title: "Đã thêm tất cả",
      description: `Đã thêm ${newStops.length} điểm dừng từ đề xuất`,
    });

    // Update map markers
    setTimeout(() => {
      updateMarkers();
      if (stops.length + newStops.length >= 2) {
        updateRoute();
      }
    }, 100);
  };

  const handleSubmit = async () => {
    if (!routeName.trim()) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng nhập tên tuyến',
        variant: 'destructive',
      });
      return;
    }

    const validStops = stops.filter((s) => s.name.trim() && s.lat && s.lng);

    try {
      setIsSubmitting(true);

      // Đảm bảo tên tuyến hợp lệ (theo validation: min 2, max 255 ký tự)
      const trimmedRouteName = routeName.trim();
      if (trimmedRouteName.length < 2) {
        toast({
          title: 'Lỗi',
          description: 'Tên tuyến phải có ít nhất 2 ký tự',
          variant: 'destructive',
        });
        return;
      }
      if (trimmedRouteName.length > 255) {
        toast({
          title: 'Lỗi',
          description: 'Tên tuyến không được quá 255 ký tự',
          variant: 'destructive',
        });
        return;
      }

      // Validation: Cần có origin và destination
      if (!originStop || !originStop.lat || !originStop.lng) {
        toast({
          title: 'Lỗi',
          description: 'Vui lòng chọn điểm bắt đầu',
          variant: 'destructive',
        });
        return;
      }
      if (!destinationStop || !destinationStop.lat || !destinationStop.lng) {
        toast({
          title: 'Lỗi',
          description: 'Vui lòng chọn điểm kết thúc',
          variant: 'destructive',
        });
        return;
      }

      // Chuẩn bị diemBatDau và diemKetThuc từ origin và destination
      // Chuẩn bị danh sách stops để gửi cùng payload (bao gồm origin và destination)
      const allStops = [
        {
          stop_id: null,
          tenDiem: originStop.name.trim(),
          address: originStop.address.trim() || undefined,
          viDo: Number(originStop.lat),
          kinhDo: Number(originStop.lng),
          sequence: 1,
        },
        ...stops.map((stop, idx) => ({
          stop_id: null,
          tenDiem: stop.name.trim(),
          address: stop.address.trim() || undefined,
          viDo: Number(stop.lat),
          kinhDo: Number(stop.lng),
          sequence: idx + 2,
        })),
        {
          stop_id: null,
          tenDiem: destinationStop.name.trim(),
          address: destinationStop.address.trim() || undefined,
          viDo: Number(destinationStop.lat),
          kinhDo: Number(destinationStop.lng),
          sequence: stops.length + 2,
        },
      ];

      const routePayload: any = {
        tenTuyen: trimmedRouteName,
        diemBatDau: originStop.name.trim().substring(0, 255),
        diemKetThuc: destinationStop.name.trim().substring(0, 255),
        origin_lat: originStop.lat,
        origin_lng: originStop.lng,
        dest_lat: destinationStop.lat,
        dest_lng: destinationStop.lng,
        routeType: 'di', // Mặc định là tuyến đi
        createReturnRoute: true, // Tự động tạo tuyến về
        stops: allStops, // Gửi danh sách stops để backend tự động tạo tuyến về với stops đảo ngược
      };

      if (mode === 'edit' && initialRoute?.id) {
        const updateResult = await apiClient.updateRoute(initialRoute.id, routePayload);
        const updatedRouteData = (updateResult.data as any) || { ...routePayload, id: initialRoute.id, maTuyen: initialRoute.id };
        
        // Lưu student_stop_suggestions nếu có học sinh đã chọn (khi edit route)
        if (selectedStudentsByStop.size > 0 && initialRoute?.id) {
          try {
            const routeId = Number(initialRoute.id);
            // Lấy danh sách stops từ route
            const routeStopsResponse = await apiClient.getRouteStops(routeId);
            if (routeStopsResponse.success && routeStopsResponse.data) {
              const routeStops = (routeStopsResponse.data as any).stops || [];
              
              // Map selected students với stop IDs thực tế
              for (const [stopId, studentIds] of selectedStudentsByStop.entries()) {
                // Tìm stop tương ứng
                let matchedStop: any = null;
                
                // Tìm trong stops hiện tại
                const currentStop = stops.find(s => s.id === stopId);
                if (currentStop && currentStop.lat && currentStop.lng) {
                  matchedStop = routeStops.find((rs: any) => {
                    if (!rs.viDo || !rs.kinhDo) return false;
                    const latDiff = Math.abs(rs.viDo - currentStop.lat!);
                    const lngDiff = Math.abs(rs.kinhDo - currentStop.lng!);
                    return latDiff < 0.0001 && lngDiff < 0.0001;
                  });
                }
                
                if (matchedStop && studentIds.length > 0) {
                  await apiClient.bulkAddStudentsToStop(routeId, matchedStop.maDiem, studentIds);
                  console.log(`✅ Đã lưu ${studentIds.length} học sinh vào điểm dừng ${matchedStop.maDiem}`);
                }
              }
            }
          } catch (suggestionError: any) {
            console.warn('⚠️ Không thể lưu suggestions:', suggestionError);
            // Không throw error, chỉ log warning
          }
        }
        
        // Invalidate routes cache để refresh danh sách
        queryClient.invalidateQueries({ queryKey: routeKeys.all });
        queryClient.invalidateQueries({ queryKey: routeKeys.detail(initialRoute.id) });
        
        toast({
          title: 'Thành công',
          description: 'Đã cập nhật tuyến đường',
        });
        onSaved?.(updatedRouteData);
        onClose();
      } else {
        // Log payload trước khi gửi
        console.log('📤 Payload gửi đi:', routePayload);
        
        const result = await apiClient.createRoute(routePayload);
        
        // Log response để debug
        console.log('📥 Response từ createRoute:', result);
        
        // Kiểm tra response có success không
        if (!result.success) {
          // Hiển thị errors từ validation nếu có
          const errorMessages = (result as any).errors || [];
          const errorMessage = result.error?.message || 'Không thể tạo tuyến đường';
          const fullMessage = errorMessages.length > 0 
            ? `${errorMessage}\n${errorMessages.join('\n')}`
            : errorMessage;
          
          console.error('❌ Lỗi validation:', errorMessages);
          console.error('❌ Error object:', result.error);
          
          toast({
            title: 'Lỗi validation',
            description: fullMessage,
            variant: 'destructive',
          });
          
          throw new Error(fullMessage);
        }
        
        // Lấy ID từ nhiều vị trí có thể
        const routeData = (result.data as any) || {};
        const newRouteId = Number(
          routeData.maTuyen || 
          routeData.id || 
          (result as any).maTuyen || 
          (result as any).id ||
          (result as any).data?.maTuyen ||
          (result as any).data?.id
        );

        console.log('🔍 Tìm thấy route ID:', newRouteId, 'từ data:', routeData);

        if (!newRouteId || isNaN(newRouteId)) {
          console.error('❌ Không thể lấy ID tuyến đường. Response:', result);
          console.error('❌ Route data:', routeData);
          throw new Error(`Không thể lấy ID tuyến đường sau khi tạo. Response: ${JSON.stringify(result)}`);
        }

        // Nếu đã gửi stops trong payload, backend sẽ tự động thêm stops vào cả tuyến đi và tuyến về
        // Chỉ thêm stops thủ công nếu không có trong payload (fallback)
        if (!routePayload.stops || routePayload.stops.length === 0) {
          console.log('⚠️ Không có stops trong payload, thêm stops thủ công...');
          
          // Thêm origin và destination vào route_stops trước
          // Thêm origin (sequence = 1)
          try {
            const originPayload: any = {
              tenDiem: originStop.name.trim(),
              address: originStop.address.trim() || undefined,
              sequence: 1,
              dwell_seconds: 30,
              viDo: Number(originStop.lat),
              kinhDo: Number(originStop.lng),
            };
            await apiClient.addRouteStop(newRouteId, originPayload);
            console.log('✅ Đã thêm điểm bắt đầu');
          } catch (err: any) {
            console.error('❌ Lỗi khi thêm điểm bắt đầu:', err);
            toast({
              title: 'Lỗi',
              description: `Không thể thêm điểm bắt đầu. ${err?.message || 'Lỗi không xác định'}`,
              variant: 'destructive',
            });
          }

          // Thêm các điểm dừng trung gian
          const addedStops: any[] = [];
          if (validStops.length > 0) {
            for (let i = 0; i < validStops.length; i++) {
              const stop = validStops[i];
              try {
              const stopPayload: any = {
                tenDiem: stop.name.trim(),
                address: stop.address.trim() || undefined,
                sequence: i + 2, // +2 vì đã có origin ở sequence 1
                dwell_seconds: stop.estimatedTime ? parseInt(stop.estimatedTime) * 60 : 30, // Mặc định 30 giây
              };

              // Đảm bảo có coordinates trước khi thêm stop
              if (stop.lat && stop.lng) {
                stopPayload.viDo = Number(stop.lat);
                stopPayload.kinhDo = Number(stop.lng);
              } else if (stop.address.trim()) {
                // Geocode if no coordinates
                try {
                  const geocodeResponse = await apiClient.geocode({ address: stop.address.trim() });
                  if (geocodeResponse.success && geocodeResponse.data) {
                    const location = (geocodeResponse.data as any)?.results?.[0]?.geometry?.location;
                    if (location) {
                      stopPayload.viDo = Number(location.lat);
                      stopPayload.kinhDo = Number(location.lng);
                    } else {
                      console.warn('Geocode không trả về location cho:', stop.address);
                      toast({
                        title: 'Cảnh báo',
                        description: `Không thể lấy tọa độ cho "${stop.name || stop.address}". Điểm dừng này sẽ bị bỏ qua.`,
                        variant: 'default',
                      });
                      continue;
                    }
                  } else {
                    console.warn('Geocode thất bại cho:', stop.address);
                    toast({
                      title: 'Cảnh báo',
                      description: `Không thể lấy tọa độ cho "${stop.name || stop.address}". Điểm dừng này sẽ bị bỏ qua.`,
                      variant: 'default',
                    });
                    continue;
                  }
                } catch (geocodeErr) {
                  console.warn('Failed to geocode address:', geocodeErr);
                  toast({
                    title: 'Cảnh báo',
                    description: `Không thể lấy tọa độ cho "${stop.name || stop.address}". Điểm dừng này sẽ bị bỏ qua.`,
                    variant: 'default',
                  });
                  continue;
                }
              } else {
                // Skip stop nếu không có coordinates và address
                console.warn('Skipping stop without coordinates or address:', stop);
                toast({
                  title: 'Cảnh báo',
                  description: `Điểm dừng "${stop.name || 'chưa đặt tên'}" thiếu địa chỉ. Điểm dừng này sẽ bị bỏ qua.`,
                  variant: 'default',
                });
                continue;
              }

              // Đảm bảo viDo và kinhDo đã có và là số hợp lệ trước khi gửi request
              if (stopPayload.viDo === undefined || stopPayload.kinhDo === undefined || 
                  isNaN(stopPayload.viDo) || isNaN(stopPayload.kinhDo)) {
                console.warn('Skipping stop without valid coordinates:', stop, stopPayload);
                toast({
                  title: 'Cảnh báo',
                  description: `Điểm dừng "${stop.name || 'chưa đặt tên'}" không có tọa độ hợp lệ. Điểm dừng này sẽ bị bỏ qua.`,
                  variant: 'default',
                });
                continue;
              }

              // Validate tọa độ hợp lệ (latitude: -90 to 90, longitude: -180 to 180)
              if (stopPayload.viDo < -90 || stopPayload.viDo > 90) {
                console.warn('Invalid latitude:', stopPayload.viDo);
                toast({
                  title: 'Lỗi',
                  description: `Vĩ độ không hợp lệ cho điểm "${stop.name}". Vĩ độ phải từ -90 đến 90.`,
                  variant: 'destructive',
                });
                continue;
              }
              if (stopPayload.kinhDo < -180 || stopPayload.kinhDo > 180) {
                console.warn('Invalid longitude:', stopPayload.kinhDo);
                toast({
                  title: 'Lỗi',
                  description: `Kinh độ không hợp lệ cho điểm "${stop.name}". Kinh độ phải từ -180 đến 180.`,
                  variant: 'destructive',
                });
                continue;
              }

              // Log payload để debug
              console.log(`📤 Gửi điểm dừng ${i + 1}:`, {
                routeId: newRouteId,
                payload: stopPayload,
                viDo: stopPayload.viDo,
                kinhDo: stopPayload.kinhDo,
                viDoType: typeof stopPayload.viDo,
                kinhDoType: typeof stopPayload.kinhDo,
              });

              const addResult = await apiClient.addRouteStop(newRouteId, stopPayload);
              if (addResult.success) {
                addedStops.push(stop);
                console.log(`✅ Đã thêm điểm dừng ${i + 1}: ${stop.name}`);
              } else {
                console.error(`❌ Không thể thêm điểm dừng ${i + 1}:`, addResult);
                console.error(`Payload đã gửi:`, stopPayload);
                
                // Hiển thị error message chi tiết
                const errorMsg = addResult.error?.message || 
                                addResult.error?.code || 
                                (addResult as any).message ||
                                'Lỗi không xác định';
                
                toast({
                  title: 'Lỗi',
                  description: `Không thể thêm điểm dừng "${stop.name}". ${errorMsg}`,
                  variant: 'destructive',
                });
                
                // Không throw error, tiếp tục với điểm dừng tiếp theo
              }
            } catch (err: any) {
              console.error(`❌ Lỗi khi thêm điểm dừng ${i + 1}:`, err);
              
              // Hiển thị error message chi tiết
              const errorMsg = err?.message || 
                              err?.error?.message || 
                              err?.response?.data?.error?.message ||
                              err?.response?.data?.message ||
                              'Lỗi không xác định';
              
              toast({
                title: 'Lỗi',
                description: `Không thể thêm điểm dừng "${stop.name}". ${errorMsg}`,
                variant: 'destructive',
              });
              
              // Không throw error, tiếp tục với điểm dừng tiếp theo
            }
            }
            
            console.log(`📊 Tổng số điểm dừng trung gian đã thêm: ${addedStops.length}/${validStops.length}`);
          }

          // Thêm destination (sequence = cuối cùng, ngay cả khi không có điểm dừng trung gian)
          try {
            const destinationSequence = validStops.length > 0 ? (validStops.length + 2) : 2; // +2 vì đã có origin ở sequence 1
            const destinationPayload: any = {
              tenDiem: destinationStop.name.trim(),
              address: destinationStop.address.trim() || undefined,
              sequence: destinationSequence,
              dwell_seconds: 60, // Điểm kết thúc dừng lâu hơn
              viDo: Number(destinationStop.lat),
              kinhDo: Number(destinationStop.lng),
            };
            await apiClient.addRouteStop(newRouteId, destinationPayload);
            console.log('✅ Đã thêm điểm kết thúc');
          } catch (err: any) {
            console.error('❌ Lỗi khi thêm điểm kết thúc:', err);
            toast({
              title: 'Lỗi',
              description: `Không thể thêm điểm kết thúc. ${err?.message || 'Lỗi không xác định'}`,
              variant: 'destructive',
            });
          }

          // Chỉ rebuild polyline nếu có ít nhất origin và destination
          // Lưu ý: Rebuild polyline là optional, không bắt buộc
          if (originStop && destinationStop) {
            try {
              // Đợi một chút để đảm bảo tất cả stops đã được lưu vào DB
              await new Promise((resolve) => setTimeout(resolve, 1000));
              
              // Gọi rebuild polyline với timeout ngắn hơn
              const rebuildPromise = apiClient.rebuildPolyline(newRouteId);
              const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), 10000) // 10 giây timeout
              );
              
              await Promise.race([rebuildPromise, timeoutPromise]);
              console.log('✅ Đã rebuild polyline cho route:', newRouteId);
            } catch (err: any) {
              console.warn('⚠️ Không thể rebuild polyline tự động:', err);
              // Không throw error, chỉ log warning - polyline có thể được rebuild sau
              // Frontend đã có polyline từ updateRoute() nên không cần thiết phải rebuild
              if (err?.error?.code !== 'MAPS_API_ERROR') {
                toast({
                  title: 'Cảnh báo',
                  description: 'Không thể tạo polyline tự động. Bạn có thể tạo lại sau từ trang chi tiết tuyến.',
                  variant: 'default',
                });
              }
            }
          }
        } else {
          // Nếu đã gửi stops trong payload, backend đã tự động thêm stops vào cả tuyến đi và tuyến về
          console.log('✅ Backend đã tự động thêm stops vào tuyến đi và tuyến về');
        }

        // Lưu student_stop_suggestions: Ưu tiên học sinh đã chọn thủ công, nếu không có thì tự động scan
        try {
          // Lấy danh sách stops từ route vừa tạo
          const routeStopsResponse = await apiClient.getRouteStops(newRouteId);
          if (routeStopsResponse.success && routeStopsResponse.data) {
            const routeStops = (routeStopsResponse.data as any).stops || [];
            const assignedStudentIds = new Set<number>(); // Track học sinh đã được gán để tránh trùng
            
            // BƯỚC 1: Lưu học sinh đã chọn thủ công (nếu có)
            if (selectedStudentsByStop.size > 0) {
              for (const [pendingStopId, studentIds] of selectedStudentsByStop.entries()) {
                // Tìm stop tương ứng trong pending stop hoặc confirmed stops
                let matchedStop: any = null;
                
                // Tìm trong pending stop
                if (pendingStop && pendingStop.id === pendingStopId && pendingStop.lat && pendingStop.lng) {
                  matchedStop = routeStops.find((rs: any) => {
                    if (!rs.viDo || !rs.kinhDo) return false;
                    const latDiff = Math.abs(rs.viDo - pendingStop.lat!);
                    const lngDiff = Math.abs(rs.kinhDo - pendingStop.lng!);
                    return latDiff < 0.0001 && lngDiff < 0.0001;
                  });
                }
                
                // Tìm trong confirmed stops
                if (!matchedStop) {
                  const confirmedStop = stops.find(s => s.id === pendingStopId);
                  if (confirmedStop && confirmedStop.lat && confirmedStop.lng) {
                    matchedStop = routeStops.find((rs: any) => {
                      if (!rs.viDo || !rs.kinhDo) return false;
                      const latDiff = Math.abs(rs.viDo - confirmedStop.lat!);
                      const lngDiff = Math.abs(rs.kinhDo - confirmedStop.lng!);
                      return latDiff < 0.0001 && lngDiff < 0.0001;
                    });
                  }
                }
                
                if (matchedStop && studentIds.length > 0) {
                  await apiClient.bulkAddStudentsToStop(newRouteId, matchedStop.maDiem, studentIds);
                  studentIds.forEach(id => assignedStudentIds.add(id));
                  console.log(`✅ Đã lưu ${studentIds.length} học sinh (thủ công) vào điểm dừng ${matchedStop.maDiem}`);
                }
              }
            }
            
            // BƯỚC 2: Tự động scan và gán học sinh gần các điểm dừng (nếu chưa có học sinh nào được gán)
            if (assignedStudentIds.size === 0 && routeStops.length > 0) {
              console.log(`🔄 Tự động scan học sinh gần các điểm dừng...`);
              const MAX_DISTANCE_METERS = 3000; // 3km
              let totalAutoAssigned = 0;
              
              for (const stop of routeStops) {
                if (!stop.viDo || !stop.kinhDo) continue;
                
                try {
                  // Tìm học sinh trong bán kính 3km từ điểm dừng
                  const nearbyResponse = await apiClient.findStudentsNearby({
                    lat: stop.viDo,
                    lng: stop.kinhDo,
                    radiusMeters: MAX_DISTANCE_METERS,
                  });
                  
                  if (nearbyResponse.success && nearbyResponse.data) {
                    const nearbyStudents = Array.isArray(nearbyResponse.data) 
                      ? nearbyResponse.data 
                      : (nearbyResponse.data as any).students || [];
                    
                    // Lọc học sinh chưa được gán
                    const unassignedStudents = nearbyStudents
                      .filter((s: any) => !assignedStudentIds.has(s.maHocSinh || s.id))
                      .map((s: any) => s.maHocSinh || s.id);
                    
                    if (unassignedStudents.length > 0) {
                      await apiClient.bulkAddStudentsToStop(newRouteId, stop.maDiem, unassignedStudents);
                      unassignedStudents.forEach((id: number) => assignedStudentIds.add(id));
                      totalAutoAssigned += unassignedStudents.length;
                      console.log(`✅ Đã tự động gán ${unassignedStudents.length} học sinh vào điểm dừng ${stop.maDiem} (${stop.tenDiem})`);
                    }
                  }
                } catch (error: any) {
                  console.warn(`⚠️ Không thể scan học sinh cho điểm dừng ${stop.maDiem}:`, error);
                  // Tiếp tục với điểm dừng tiếp theo
                }
              }
              
              if (totalAutoAssigned > 0) {
                console.log(`✅ Tổng cộng đã tự động gán ${totalAutoAssigned} học sinh vào ${routeStops.length} điểm dừng`);
                toast({
                  title: 'Đã tự động gán học sinh',
                  description: `Đã tự động gán ${totalAutoAssigned} học sinh vào các điểm dừng (trong bán kính 3km)`,
                  variant: 'default',
                });
              } else {
                console.log(`ℹ️ Không tìm thấy học sinh nào trong bán kính 3km từ các điểm dừng`);
              }
            }
          }
        } catch (suggestionError: any) {
          console.warn('⚠️ Không thể lưu suggestions:', suggestionError);
          // Không throw error, chỉ log warning
        }
        
        // Invalidate routes cache để refresh danh sách
        queryClient.invalidateQueries({ queryKey: routeKeys.all });
        
        toast({
          title: 'Thành công',
          description: routePayload.createReturnRoute ? 'Đã tạo tuyến đi và tuyến về' : 'Đã tạo tuyến đường mới',
        });
        onSaved?.(routeData);
        onClose();
      }
    } catch (err: any) {
      console.error('Lỗi:', err);
      toast({
        title: 'Không thành công',
        description: err?.message || 'Có lỗi xảy ra',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedStop = stops.find((s) => s.id === selectedStopId);

  // Sortable Stop Item Component
  const SortableStopItem = React.memo(({ 
    stop, 
    index, 
    onUpdateStop, 
    onRemoveStop, 
    isSelected,
    onSelect 
  }: { 
    stop: Stop; 
    index: number;
    onUpdateStop: (id: string, field: keyof Stop, value: string | number) => void;
    onRemoveStop: (id: string) => void;
    isSelected: boolean;
    onSelect: (id: string) => void;
  }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: stop.id,
    });

    // Local state for estimatedTime input to prevent auto-update while typing
    const [localEstimatedTime, setLocalEstimatedTime] = useState(stop.estimatedTime);
    
    // Update local state when stop.estimatedTime changes from outside
    useEffect(() => {
      setLocalEstimatedTime(stop.estimatedTime);
    }, [stop.estimatedTime]);

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    const handleEstimatedTimeBlur = () => {
      onUpdateStop(stop.id, 'estimatedTime', localEstimatedTime);
    };

    const handleEstimatedTimeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.currentTarget.blur();
      }
    };

    return (
      <Card
        ref={setNodeRef}
        style={style}
        className={`p-3 cursor-pointer transition-colors ${
          isSelected
            ? 'border-primary bg-primary/5'
            : 'hover:border-primary/50'
        } ${isDragging ? 'z-50' : ''}`}
        onClick={() => onSelect(stop.id)}
      >
        <div className="flex items-start gap-2 relative pr-9 pb-1">
          <div
            {...attributes}
            {...listeners}
            className="flex-shrink-0 cursor-grab active:cursor-grabbing pt-1"
          >
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
            {index + 1}
          </div>
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="pr-8">
              <Input
                value={stop.name}
                onChange={(e) => onUpdateStop(stop.id, 'name', e.target.value)}
                placeholder="Tên điểm dừng"
                className="text-sm mb-1"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <p 
              className="text-xs text-muted-foreground mb-2 line-clamp-2 break-words leading-relaxed pr-8"
              title={stop.address}
            >
              {stop.address || 'Chưa có địa chỉ'}
            </p>
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              <Input
                type="number"
                min="0"
                step="1"
                value={localEstimatedTime}
                onChange={(e) => setLocalEstimatedTime(e.target.value)}
                onBlur={handleEstimatedTimeBlur}
                onKeyDown={handleEstimatedTimeKeyDown}
                placeholder="Phút"
                className="text-xs w-20 h-7 flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
              />
              <span className="text-xs text-muted-foreground flex-shrink-0 whitespace-nowrap">phút</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-1 right-1 h-7 w-7 flex-shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10 z-20 bg-background/95 backdrop-blur-sm border border-destructive/20 shadow-sm hover:border-destructive/40 rounded-md"
            onClick={(e) => {
              e.stopPropagation();
              onRemoveStop(stop.id);
            }}
            title="Xóa điểm dừng"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </Card>
    );
  });

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4 overflow-hidden">
      {/* Sidebar */}
      <div className="w-96 flex-shrink-0 flex flex-col border-r bg-background overflow-hidden">
        {/* Header - Fixed */}
        <div className="p-4 border-b bg-background flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">
              {mode === 'edit' ? 'Chỉnh sửa tuyến' : 'Tạo tuyến mới'}
            </h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-3">
            <div>
              <Label>Tên tuyến *</Label>
              <Input
                value={routeName}
                onChange={(e) => setRouteName(e.target.value)}
                placeholder="VD: Tuyến 1 - Quận 1 → Quận 7"
              />
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-xs flex items-center gap-1">
                  <Navigation className="w-3 h-3 text-primary" />
                  Điểm bắt đầu *
                </Label>
                <PlacePicker
                  onPlaceSelected={(place) => {
                    setOriginStop({
                      id: 'origin',
                      name: place.name || 'Điểm bắt đầu',
                      address: place.address || '',
                      lat: place.lat,
                      lng: place.lng,
                      estimatedTime: '',
                      sequence: 1,
                    });
                  }}
                  placeholder="Tìm kiếm điểm bắt đầu..."
                />
                {originStop && (
                  <div className="mt-1 p-2 bg-primary/5 rounded text-xs">
                    <p className="font-medium">{originStop.name}</p>
                    <p className="text-muted-foreground line-clamp-1">{originStop.address}</p>
                  </div>
                )}
              </div>
              <div>
                <Label className="text-xs flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-destructive" />
                  Điểm kết thúc *
                </Label>
                <PlacePicker
                  onPlaceSelected={(place) => {
                    setDestinationStop({
                      id: 'destination',
                      name: place.name || 'Điểm kết thúc',
                      address: place.address || '',
                      lat: place.lat,
                      lng: place.lng,
                      estimatedTime: '',
                      sequence: 999,
                    });
                  }}
                  placeholder="Tìm kiếm điểm kết thúc..."
                />
                {destinationStop && (
                  <div className="mt-1 p-2 bg-destructive/5 rounded text-xs">
                    <p className="font-medium">{destinationStop.name}</p>
                    <p className="text-muted-foreground line-clamp-1">{destinationStop.address}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Student Section - Collapsible, Clean Design */}
        <div className="border-b bg-gradient-to-b from-green-50/30 to-transparent dark:from-green-950/10 flex-shrink-0">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <Users className="w-4 h-4 text-green-700 dark:text-green-400" />
                </div>
                <div>
                  <Label className="text-sm font-semibold text-foreground">Học sinh</Label>
                  {allStudents.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {allStudents.length} học sinh
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {allStudents.length === 0 && originStop && destinationStop && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      console.log('🔍 Scan button clicked - originStop:', originStop, 'destinationStop:', destinationStop);
                      if (originStop && destinationStop && originStop.lat && originStop.lng && destinationStop.lat && destinationStop.lng) {
                        await scanStudentsAlongRoute();
                      } else {
                        toast({
                          title: 'Thông báo',
                          description: 'Vui lòng nhập điểm bắt đầu và điểm kết thúc trước',
                          variant: 'default',
                        });
                      }
                    }}
                    disabled={loadingAllStudents}
                    className="border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-950/30"
                  >
                    {loadingAllStudents ? (
                      <>
                        <Users className="w-3 h-3 mr-1.5 animate-pulse" />
                        Đang quét...
                      </>
                    ) : (
                      <>
                        <Search className="w-3 h-3 mr-1.5" />
                        Quét học sinh
                      </>
                    )}
                  </Button>
                )}
                {allStudents.length > 0 && (
                  <Button
                    variant={showAllStudents ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowAllStudents(!showAllStudents)}
                    className={showAllStudents ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                  >
                    <Users className="w-3 h-3 mr-1.5" />
                    {showAllStudents ? 'Ẩn' : 'Hiện'} ({allStudents.length})
                  </Button>
                )}
              </div>
            </div>
            {showAllStudents && allStudents.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-3 py-2 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="w-2 h-2 rounded-full bg-green-600 animate-pulse"></div>
                  <span className="font-medium">Đang hiển thị {allStudents.length} học sinh trên bản đồ</span>
                </div>
                <Button
                  variant={showStudentRoutes ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setShowStudentRoutes(!showStudentRoutes);
                    if (!showStudentRoutes) {
                      drawStudentRoutes();
                    } else {
                      studentToStopPolylinesRef.current.forEach((polyline) => {
                        polyline.setMap(null);
                      });
                      studentToStopPolylinesRef.current.clear();
                    }
                  }}
                  className="w-full border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-950/30"
                >
                  <Route className="w-3 h-3 mr-1.5" />
                  {showStudentRoutes ? 'Ẩn đường đi' : 'Hiện đường đi'}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Stops Section - Scrollable */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-background relative z-30">
          <div className="p-4 border-b bg-gradient-to-b from-blue-50/30 to-transparent dark:from-blue-950/10 flex-shrink-0 relative z-30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <MapPin className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                </div>
                <div>
                  <Label className="text-sm font-semibold text-foreground">Điểm dừng</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {stops.length} điểm dừng
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-2 relative z-30">
              {mapMode === 'add' ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Cancel pending stop if exists
                      if (pendingStop) {
                        cancelPendingStop();
                      }
                      setMapMode('view');
                    }}
                  >
                    <X className="w-3 h-3 mr-1" />
                    Hủy
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSuggestStops}
                    disabled={loadingSuggestions}
                  >
                    {loadingSuggestions ? (
                      <>
                        <Sparkles className="w-3 h-3 mr-1 animate-spin" />
                        Đang tải...
                      </>
                    ) : (
                      <>
                        <Zap className="w-3 h-3 mr-1" />
                        Đề xuất
                      </>
                    )}
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setMapMode('add')}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Thêm điểm dừng
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Add Stop Mode Indicator */}
          {mapMode === 'add' && !pendingStop && (
            <div className="px-4 pb-3 border-b bg-blue-50/30 dark:bg-blue-950/10">
              <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border-2 border-blue-300 dark:border-blue-700 shadow-sm">
                <PlacePicker
                  onPlaceSelected={(place) => {
                    addStopFromSearch(place);
                  }}
                  placeholder="Tìm kiếm địa điểm..."
                />
                <div className="flex items-center gap-2 mt-2 text-xs text-blue-700 dark:text-blue-400">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Hoặc click trên bản đồ để thêm điểm dừng</span>
                </div>
              </div>
            </div>
          )}

          {/* Pending Stop Preview - Fixed layout with sticky buttons */}
          {pendingStop && (
            <div className="flex-shrink-0 border-b bg-amber-50/50 dark:bg-amber-950/10 flex flex-col relative z-20 max-h-[60vh]">
              <div className="flex-1 overflow-y-auto">
                <div className="p-4">
                  <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg border-2 border-amber-300 dark:border-amber-700 shadow-sm">
                    <div className="flex items-center gap-2 p-3 border-b border-amber-200 dark:border-amber-800">
                      <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
                        <MapPin className="w-3 h-3 text-white" />
                      </div>
                      <Label className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                        Điểm dừng tạm thời
                      </Label>
                    </div>
                    
                    <div className="p-3 space-y-3">
                      <div>
                        <Label className="text-xs text-amber-900 dark:text-amber-100">Tên điểm dừng</Label>
                        <Input
                          value={pendingStop.name}
                          onChange={(e) => setPendingStop({ ...pendingStop, name: e.target.value })}
                          placeholder="VD: Trường TH ABC"
                          className="text-sm mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label className="text-xs text-amber-900 dark:text-amber-100">Địa chỉ</Label>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 break-words" title={pendingStop.address}>
                          {pendingStop.address || 'Chưa có địa chỉ'}
                        </p>
                      </div>
                      
                      <div>
                        <Label className="text-xs text-amber-900 dark:text-amber-100">Thời gian dừng (phút)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={pendingStop.estimatedTime}
                          onChange={(e) => setPendingStop({ ...pendingStop, estimatedTime: e.target.value })}
                          placeholder="VD: 2"
                          className="text-sm mt-1 w-full"
                        />
                      </div>
                      
                      {/* Nút để tìm học sinh gần điểm dừng */}
                      {!selectedStopForStudents && (
                        <div className="mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (pendingStop?.lat && pendingStop?.lng) {
                                findNearbyStudents(pendingStop.lat, pendingStop.lng, pendingStop.name);
                              }
                            }}
                            disabled={loadingNearbyStudents || !pendingStop?.lat || !pendingStop?.lng}
                            className="w-full border-amber-300 text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-100 dark:hover:bg-amber-900/30"
                          >
                            {loadingNearbyStudents ? (
                              <>
                                <Users className="w-3 h-3 mr-1.5 animate-pulse" />
                                Đang tìm...
                              </>
                            ) : (
                              <>
                                <Users className="w-3 h-3 mr-1.5" />
                                Tìm học sinh gần đây (500m)
                              </>
                            )}
                          </Button>
                        </div>
                      )}

                      {/* Hiển thị học sinh gần điểm dừng */}
                      {loadingNearbyStudents ? (
                        <div className="mt-3 p-2 text-center text-xs text-muted-foreground">
                          Đang tìm học sinh...
                        </div>
                      ) : nearbyStudents.length > 0 ? (
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-amber-600" />
                            <Label className="text-xs font-semibold text-amber-900 dark:text-amber-100">
                              {nearbyStudents.length} học sinh trong bán kính 500m
                            </Label>
                          </div>
                          <ScrollArea className="max-h-[200px] border border-amber-200 dark:border-amber-800 rounded-md">
                            <div className="p-2 space-y-2">
                              {nearbyStudents.map((student) => {
                                const stopId = pendingStop?.id || '';
                                const isSelected = selectedStudentsByStop.get(stopId)?.includes(student.maHocSinh) || false;
                                
                                return (
                                  <div
                                    key={student.maHocSinh}
                                    className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                                      isSelected 
                                        ? 'bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-700 shadow-sm' 
                                        : 'bg-white dark:bg-gray-800 border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:border-amber-300 dark:hover:border-amber-700'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-start gap-2 flex-1 min-w-0">
                                        <Avatar className="w-8 h-8 shrink-0">
                                          <AvatarImage 
                                            src={(() => {
                                              const imagePath = student.anhDaiDien;
                                              if (!imagePath) return undefined;
                                              if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
                                                return imagePath;
                                              }
                                              const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:4000';
                                              const normalizedPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
                                              return `${apiBase}${normalizedPath}`;
                                            })()}
                                          />
                                          <AvatarFallback className="bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 text-xs">
                                            {student.hoTen?.charAt(0) || 'H'}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-medium text-amber-900 dark:text-amber-100">
                                            {student.hoTen}
                                          </p>
                                          <p className="text-xs text-muted-foreground mt-0.5">
                                            Lớp: {student.lop || 'N/A'}
                                          </p>
                                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5" title={student.diaChi || ''}>
                                            📍 {student.diaChi || 'Chưa có địa chỉ'}
                                          </p>
                                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                            Khoảng cách: {student.distanceMeters || 0}m
                                          </p>
                                        </div>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 shrink-0 text-amber-600 hover:text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-md"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          if (!pendingStop) return;
                                          
                                          const stopId = pendingStop.id;
                                          const currentSelected = selectedStudentsByStop.get(stopId) || [];
                                          
                                          // Kiểm tra đã thêm chưa
                                          if (currentSelected.includes(student.maHocSinh)) {
                                            toast({
                                              title: 'Đã thêm rồi',
                                              description: `${student.hoTen} đã được thêm vào điểm dừng này`,
                                              variant: 'default',
                                            });
                                            return;
                                          }
                                          
                                          // Nếu đang edit route (có route ID), lưu ngay vào database
                                          if (mode === 'edit' && initialRoute?.id) {
                                            try {
                                              // Cần stop ID thực tế từ database, nhưng khi pending chưa có
                                              // Tạm thời lưu vào state, sẽ lưu sau khi confirm stop
                                              const newSelected = [...currentSelected, student.maHocSinh];
                                              setSelectedStudentsByStop(new Map(selectedStudentsByStop.set(stopId, newSelected)));
                                              
                                              toast({
                                                title: 'Đã thêm học sinh',
                                                description: `${student.hoTen} sẽ được lưu khi xác nhận điểm dừng`,
                                              });
                                            } catch (error: any) {
                                              toast({
                                                title: 'Lỗi',
                                                description: error?.message || 'Không thể thêm học sinh',
                                                variant: 'destructive',
                                              });
                                            }
                                          } else {
                                            // Khi tạo route mới, chỉ lưu vào state
                                            const newSelected = [...currentSelected, student.maHocSinh];
                                            setSelectedStudentsByStop(new Map(selectedStudentsByStop.set(stopId, newSelected)));
                                            
                                            toast({
                                              title: 'Đã thêm học sinh',
                                              description: `${student.hoTen} sẽ được lưu khi tạo tuyến đường`,
                                            });
                                          }
                                        }}
                                        title="Thêm học sinh vào điểm dừng"
                                        disabled={selectedStudentsByStop.get(pendingStop.id)?.includes(student.maHocSinh)}
                                      >
                                        {selectedStudentsByStop.get(pendingStop.id)?.includes(student.maHocSinh) ? (
                                          <CheckCircle2 className="w-3 h-3 text-green-600" />
                                        ) : (
                                          <Plus className="w-3 h-3" />
                                        )}
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </ScrollArea>
                        </div>
                      ) : selectedStopForStudents ? (
                        <div className="mt-3 p-2 text-center text-xs text-muted-foreground">
                          Không có học sinh trong bán kính 500m
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Sticky buttons at bottom - always visible */}
              <div className="flex-shrink-0 p-4 pt-2 border-t border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/10">
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={confirmPendingStop}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    Xác nhận
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={cancelPendingStop}
                    className="flex-1 border-amber-300 text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-100 dark:hover:bg-amber-900/30"
                  >
                    <XCircle className="w-4 h-4 mr-1.5" />
                    Hủy
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Stop Suggestions - Fixed */}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="px-4 pb-3 border-b bg-purple-50/50 dark:bg-purple-950/10 flex-shrink-0">
              <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border-2 border-purple-300 dark:border-purple-700 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <Label className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                    Đề xuất điểm dừng ({filteredSuggestions.length}/{allSuggestions.length})
                  </Label>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllSuggestions}
                    className="text-xs h-7"
                    disabled={filteredSuggestions.length === 0}
                  >
                    Chọn tất cả ({filteredSuggestions.length})
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => {
                      setShowSuggestions(false);
                    }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-2">
                  {filteredSuggestions.map((suggestion) => (
                    <Card
                      key={suggestion.id}
                      className="p-2 border-purple-200 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-600 cursor-pointer transition-colors"
                      onClick={() => handleSelectSuggestion(suggestion)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-purple-900 dark:text-purple-100 line-clamp-1">
                            {suggestion.name}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-1" title={suggestion.address}>
                            {suggestion.address}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              <Users className="w-3 h-3 mr-1" />
                              {suggestion.studentCount} học sinh
                            </Badge>
                            {suggestion.lat && suggestion.lng ? (
                              <Badge variant="outline" className="text-xs text-green-600">
                                <MapPin className="w-3 h-3 mr-1" />
                                Có tọa độ
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs text-yellow-600">
                                <MapPin className="w-3 h-3 mr-1" />
                                Cần geocode
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectSuggestion(suggestion);
                          }}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
              </div>
            </div>
          )}

          {/* Stops List - Scrollable */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4">
                {stops.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground p-8 border border-dashed rounded-lg">
                    <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Chưa có điểm dừng</p>
                    <p className="text-xs mt-1">
                      {mapMode === 'add'
                        ? 'Click trên bản đồ hoặc tìm kiếm để thêm'
                        : 'Bật chế độ thêm để bắt đầu'}
                    </p>
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={stops.map((s) => s.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {stops.map((stop, index) => (
                          <SortableStopItem 
                            key={stop.id} 
                            stop={stop} 
                            index={index}
                            onUpdateStop={updateStop}
                            onRemoveStop={removeStop}
                            isSelected={selectedStopId === stop.id}
                            onSelect={setSelectedStopId}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Route Summary */}
        {routeInfo && stops.length >= 2 && (
          <div className="p-4 border-t bg-muted/30">
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <RouteIcon className="w-4 h-4 text-primary" />
                <Label className="text-sm font-semibold">Thông tin lộ trình</Label>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {routeInfo.distance && (
                  <div className="flex items-center gap-2">
                    <Route className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Khoảng cách:</span>
                    <span className="font-medium">{routeInfo.distance}</span>
                  </div>
                )}
                {routeInfo.duration && (
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Thời gian:</span>
                    <span className="font-medium">{routeInfo.duration}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                <MapPin className="w-3 h-3" />
                <span>{stops.length + (originStop ? 1 : 0) + (destinationStop ? 1 : 0)} điểm dừng</span>
              </div>
            </div>
          </div>
        )}

        <div className="p-4 border-t bg-background flex-shrink-0 sticky bottom-0 z-10">
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={isSubmitting || !routeName.trim() || !originStop || !destinationStop}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting
              ? 'Đang lưu...'
              : mode === 'edit'
              ? 'Cập nhật tuyến'
              : 'Tạo tuyến đường'}
          </Button>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <div ref={mapRef} className="w-full h-full rounded-lg border" />
        {mapMode === 'add' && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
            <Card className="p-3 bg-primary/90 text-primary-foreground border-primary shadow-lg">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4" />
                <p className="text-sm font-medium">
                  Click trên bản đồ để thêm điểm dừng
                </p>
              </div>
            </Card>
          </div>
        )}
        {polyline && (
          <div className="absolute bottom-4 right-4 z-10">
            <Card className="p-2 bg-background/90 backdrop-blur-sm border shadow-lg">
              <div className="flex items-center gap-2 text-xs">
                <RouteIcon className="w-4 h-4 text-primary" />
                <span>Lộ trình đã được tính toán</span>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

