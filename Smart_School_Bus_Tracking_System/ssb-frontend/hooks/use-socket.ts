import { useEffect, useState, useCallback } from "react";
import { socketService } from "@/lib/socket";

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    setIsConnected(socketService.isConnected());

    // Listen for connection changes
    const socket = socketService.getSocket();
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    // Socket-level listeners (if socket exists now)
    socket?.on("connect", handleConnect);
    socket?.on("disconnect", handleDisconnect);

    // Global window bridge from socket service (works even if socket is created later)
    window.addEventListener("socketConnected", handleConnect as EventListener);
    window.addEventListener("socketDisconnected", handleDisconnect as EventListener);

    return () => {
      socket?.off("connect", handleConnect);
      socket?.off("disconnect", handleDisconnect);
      window.removeEventListener("socketConnected", handleConnect as EventListener);
      window.removeEventListener("socketDisconnected", handleDisconnect as EventListener);
    };
  }, []);

  return {
    isConnected,
    socketService,
  };
}

export function useBusTracking(busId?: number) {
  const [busLocation, setBusLocation] = useState<any>(null);
  const { isConnected } = useSocket();

  useEffect(() => {
    if (!busId || !isConnected) return;

    // Join bus tracking room
    socketService.joinBusTracking(busId);

    // Listen for bus location updates
    const handleBusLocationUpdate = (event: any) => {
      const data = event.detail;
      if (data.busId === busId) {
        setBusLocation(data.location);
      }
    };

    window.addEventListener("busLocationUpdate", handleBusLocationUpdate);

    // Get initial location
    socketService.getBusLocation(busId);

    return () => {
      socketService.leaveBusTracking(busId);
      window.removeEventListener("busLocationUpdate", handleBusLocationUpdate);
    };
  }, [busId, isConnected]);

  const updateBusLocation = useCallback(
    (locationData: {
      latitude: number;
      longitude: number;
      speed?: number;
      direction?: number;
      timestamp?: string;
    }) => {
      if (busId) {
        socketService.updateBusLocation({
          busId,
          ...locationData,
        });
      }
    },
    [busId]
  );

  return {
    busLocation,
    updateBusLocation,
  };
}

export function useTripUpdates(tripId?: number) {
  const [tripStatus, setTripStatus] = useState<any>(null);
  const { isConnected } = useSocket();

  useEffect(() => {
    if (!tripId || !isConnected) return;

    // Listen for trip status updates
    const handleTripStatusUpdate = (event: any) => {
      const data = event.detail;
      if (data.tripId === tripId) {
        setTripStatus(data);
      }
    };

    window.addEventListener("tripStatusUpdate", handleTripStatusUpdate);

    return () => {
      window.removeEventListener("tripStatusUpdate", handleTripStatusUpdate);
    };
  }, [tripId, isConnected]);

  const updateTripStatus = useCallback(
    (statusData: { status: string; note?: string; timestamp?: string }) => {
      if (tripId) {
        socketService.updateTripStatus({
          tripId,
          ...statusData,
        });
      }
    },
    [tripId]
  );

  return {
    tripStatus,
    updateTripStatus,
  };
}

export function useStudentUpdates(tripId?: number, studentId?: number) {
  const [studentStatus, setStudentStatus] = useState<any>(null);
  const { isConnected } = useSocket();

  useEffect(() => {
    if (!tripId || !isConnected) return;

    // Listen for student status updates
    const handleStudentStatusUpdate = (event: any) => {
      const data = event.detail;
      if (
        data.tripId === tripId &&
        (!studentId || data.studentId === studentId)
      ) {
        setStudentStatus(data);
      }
    };

    window.addEventListener("studentStatusUpdate", handleStudentStatusUpdate);

    return () => {
      window.removeEventListener(
        "studentStatusUpdate",
        handleStudentStatusUpdate
      );
    };
  }, [tripId, studentId, isConnected]);

  const updateStudentStatus = useCallback(
    (statusData: { status: string; note?: string; timestamp?: string }) => {
      if (tripId && studentId) {
        socketService.updateStudentStatus({
          tripId,
          studentId,
          ...statusData,
        });
      }
    },
    [tripId, studentId]
  );

  return {
    studentStatus,
    updateStudentStatus,
  };
}

export function useNotifications() {
  const [adminNotifications, setAdminNotifications] = useState<any[]>([]);
  const [parentNotifications, setParentNotifications] = useState<any[]>([]);
  const { isConnected } = useSocket();

  useEffect(() => {
    if (!isConnected) return;

    // Listen for admin notifications
    const handleAdminNotification = (event: any) => {
      setAdminNotifications((prev) => [event.detail, ...prev]);
    };

    // Listen for parent notifications
    const handleParentNotification = (event: any) => {
      setParentNotifications((prev) => [event.detail, ...prev]);
    };

    window.addEventListener("adminNotification", handleAdminNotification);
    window.addEventListener("parentNotification", handleParentNotification);

    return () => {
      window.removeEventListener("adminNotification", handleAdminNotification);
      window.removeEventListener(
        "parentNotification",
        handleParentNotification
      );
    };
  }, [isConnected]);

  const clearAdminNotifications = useCallback(() => {
    setAdminNotifications([]);
  }, []);

  const clearParentNotifications = useCallback(() => {
    setParentNotifications([]);
  }, []);

  return {
    adminNotifications,
    parentNotifications,
    clearAdminNotifications,
    clearParentNotifications,
  };
}

// Realtime bus position by trip room (listen to 'bus_position_update')
export function useTripBusPosition(tripId?: number) {
  const [busPosition, setBusPosition] = useState<{
    lat: number;
    lng: number;
    busId?: number | string;
    speed?: number;
    heading?: number;
    timestamp?: string;
  } | null>(null);
  const { isConnected } = useSocket();

  useEffect(() => {
    if (!tripId || !isConnected) return;

    const socket = socketService.getSocket();
    // join trip room to receive updates
    try {
      console.log('[useTripBusPosition] join_trip', tripId);
      socket?.emit('join_trip', tripId);
    } catch {}

    const onData = (data: any) => {
      if (!data) return;
      const tId = data.tripId ?? data.trip_id;
      if ((tId + '') !== (tripId + '')) return;
      const lat = data.lat ?? data.latitude ?? data.coords?.lat;
      const lng = data.lng ?? data.longitude ?? data.coords?.lng;
      if (typeof lat !== 'number' || typeof lng !== 'number') return;
      setBusPosition({
        lat,
        lng,
        busId: data.busId ?? data.bus_id,
        speed: data.speed,
        heading: data.heading ?? data.direction,
        timestamp: data.timestamp,
      });
    };

    // Listen to socket events directly
    const socketHandler = (payload: any) => {
      console.log('[useTripBusPosition] socket event', payload);
      onData(payload);
    };
    socket?.on('bus_position_update', socketHandler);
    socket?.on('bus_location_update', socketHandler);

    // Fallback to DOM CustomEvents (in case other parts rebroadcast)
    const domHandler = (event: Event) => {
      const d = (event as CustomEvent).detail;
      console.log('[useTripBusPosition] DOM event', d);
      onData(d);
    };
    window.addEventListener('busPositionUpdate', domHandler as EventListener);
    window.addEventListener('busLocationUpdate', domHandler as EventListener);

    return () => {
      try {
        socket?.emit('leave_trip', tripId);
      } catch {}
      socket?.off('bus_position_update', socketHandler);
      socket?.off('bus_location_update', socketHandler);
      window.removeEventListener('busPositionUpdate', domHandler as EventListener);
      window.removeEventListener('busLocationUpdate', domHandler as EventListener);
    };
  }, [tripId, isConnected]);

  return { busPosition };
}

// Day 4: Trip alerts (approach_stop, delay_alert)
// Returns latest approachStop and delayAlert payloads filtered by tripId
export function useTripAlerts(tripId?: number) {
  const [approachStop, setApproachStop] = useState<any | null>(null);
  const [delayAlert, setDelayAlert] = useState<any | null>(null);
  const { isConnected } = useSocket();

  useEffect(() => {
    if (!tripId || !isConnected) return;

    const socket = socketService.getSocket();

    const onApproach = (data: any) => {
      const tId = data?.tripId ?? data?.trip_id;
      if ((tId + "") !== (tripId + "")) return;
      setApproachStop(data);
    };
    const onDelay = (data: any) => {
      const tId = data?.tripId ?? data?.trip_id;
      if ((tId + "") !== (tripId + "")) return;
      setDelayAlert(data);
    };

    // Direct socket listeners
    socket?.on('approach_stop', onApproach);
    socket?.on('delay_alert', onDelay);

    // DOM bridge fallback
    const domApproach = (e: Event) => onApproach((e as CustomEvent).detail);
    const domDelay = (e: Event) => onDelay((e as CustomEvent).detail);
    window.addEventListener('approachStop', domApproach as EventListener);
    window.addEventListener('delayAlert', domDelay as EventListener);

    return () => {
      socket?.off('approach_stop', onApproach);
      socket?.off('delay_alert', onDelay);
      window.removeEventListener('approachStop', domApproach as EventListener);
      window.removeEventListener('delayAlert', domDelay as EventListener);
    };
  }, [tripId, isConnected]);

  return { approachStop, delayAlert };
}
