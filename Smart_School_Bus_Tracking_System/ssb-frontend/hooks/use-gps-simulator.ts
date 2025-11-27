"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { socketService } from "@/lib/socket";
import { apiClient } from "@/lib/api";
import polyline from "@mapbox/polyline";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

export type SimulatorPoint = {
  lat: number;
  lng: number;
  speed: number;
  heading: number;
};

type RouteStop = {
  id: string | number;
  sequence: number;
  lat: number;
  lng: number;
  name?: string;
};

interface UseGPSSimulatorOptions {
  tripId?: number;
  routeId?: number | string;
  speed?: number; // km/h, default 40
  interval?: number; // seconds, default 3
  stopDistanceThreshold?: number; // meters, default 50
  approachNotificationDistance?: number; // meters, default 60
}

/**
 * useGPSSimulator - Hook để mô phỏng GPS di chuyển theo polyline
 * 
 * Tương tự gps_simulator.js nhưng tích hợp vào frontend:
 * - Fetch trip/route data từ API
 * - Decode polyline và tính toán điểm tiếp theo dựa trên tốc độ hiện tại (real-time)
 * - Gửi GPS updates qua WebSocket
 * - Tự động dừng tại điểm dừng và đợi continueToNextStop()
 * - Kiểm tra khoảng cách đến điểm dừng để trigger notification (60m)
 */
export function useGPSSimulator(options: UseGPSSimulatorOptions = {}) {
  const {
    tripId,
    routeId,
    speed = 40,
    interval = 3,
    stopDistanceThreshold = 50,
    approachNotificationDistance = 60,
  } = options;

  const [running, setRunning] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<SimulatorPoint | null>(null);
  const [isAtStop, setIsAtStop] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSpeed, setCurrentSpeed] = useState<number>(speed);

  // Refs để lưu trữ data và state
  const polylinePointsRef = useRef<Array<{ lat: number; lng: number }>>([]); // Decoded polyline points (not interpolated)
  const stopsRef = useRef<RouteStop[]>([]);
  const currentSegmentIndexRef = useRef<number>(0); // Current segment in polyline
  const currentPositionInSegmentRef = useRef<number>(0); // Position ratio (0-1) within current segment
  const currentStopIndexRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPausedRef = useRef<boolean>(false);
  const speedRef = useRef<number>(speed);
  const notifiedStopsRef = useRef<Set<number>>(new Set()); // Track which stops have been notified (60m)

  // Haversine distance (meters)
  const haversine = useCallback((lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }, []);

  // Calculate bearing (0-360 degrees)
  const calculateBearing = useCallback((lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x =
      Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    const θ = Math.atan2(y, x);

    return ((θ * 180) / Math.PI + 360) % 360; // Normalize to 0-360
  }, []);

  // Decode polyline (no interpolation - we'll calculate dynamically)
  const decodePolyline = useCallback((encodedPolyline: string): Array<{ lat: number; lng: number }> => {
    try {
      const decoded = polyline.decode(encodedPolyline);
      if (decoded.length < 2) {
        throw new Error("Polyline must have at least 2 points");
      }
      return decoded.map(([lat, lng]: [number, number]) => ({ lat, lng }));
    } catch (err: any) {
      throw new Error(`Failed to decode polyline: ${err.message}`);
    }
  }, []);

  // Calculate next point based on current speed (dynamic calculation)
  const calculateNextPoint = useCallback((): SimulatorPoint | null => {
    const points = polylinePointsRef.current;
    const currentSegmentIndex = currentSegmentIndexRef.current;
    const currentPositionInSegment = currentPositionInSegmentRef.current;
    const currentSpeedValue = speedRef.current;

    if (points.length === 0 || currentSegmentIndex >= points.length - 1) {
      // Reached end
      return null;
    }

    // Calculate distance to travel in this interval
    const speedMps = (currentSpeedValue * 1000) / 3600; // km/h to m/s
    const distanceToTravel = speedMps * interval; // meters

    let remainingDistance = distanceToTravel;
    let segmentIndex = currentSegmentIndex;
    let positionInSegment = currentPositionInSegment;

    // Find the next point by traversing segments
    while (segmentIndex < points.length - 1 && remainingDistance > 0) {
      const p1 = points[segmentIndex];
      const p2 = points[segmentIndex + 1];
      const segmentDistance = haversine(p1.lat, p1.lng, p2.lat, p2.lng);
      const remainingInSegment = segmentDistance * (1 - positionInSegment);

      if (remainingDistance <= remainingInSegment) {
        // Next point is within this segment
        positionInSegment += remainingDistance / segmentDistance;
        break;
      } else {
        // Move to next segment
        remainingDistance -= remainingInSegment;
        segmentIndex++;
        positionInSegment = 0;
      }
    }

    // Clamp to end of polyline
    if (segmentIndex >= points.length - 1) {
      segmentIndex = points.length - 2;
      positionInSegment = 1;
    }

    // Calculate actual position
    const p1 = points[segmentIndex];
    const p2 = points[segmentIndex + 1];
    const lat = p1.lat + (p2.lat - p1.lat) * positionInSegment;
    const lng = p1.lng + (p2.lng - p1.lng) * positionInSegment;
    const heading = calculateBearing(p1.lat, p1.lng, p2.lat, p2.lng);

    // Update refs
    currentSegmentIndexRef.current = segmentIndex;
    currentPositionInSegmentRef.current = positionInSegment;

    return {
      lat,
      lng,
      speed: currentSpeedValue,
      heading,
    };
  }, [interval, haversine, calculateBearing]);

  // Fetch trip and route data
  const fetchSimulationData = useCallback(async () => {
    if (!tripId || !routeId) {
      throw new Error("Trip ID and Route ID are required");
    }

    try {
      // Fetch trip data
      const tripRes = await apiClient.getTripById(tripId);
      const tripData: any = (tripRes as any).data || tripRes;

      // Fetch route polyline
      const routeRes = await apiClient.getRouteById(Number(routeId));
      const routeData: any = (routeRes as any).data || routeRes;

      if (!routeData.polyline) {
        throw new Error("Route has no polyline. Please rebuild polyline first.");
      }

      // Fetch route stops
      const stopsRes = await apiClient.getRouteStops(Number(routeId));
      const stopsData: any = (stopsRes as any).data || stopsRes;
      const stops: RouteStop[] = (stopsData || []).map((stop: any) => ({
        id: stop.maDiem || stop.id,
        sequence: stop.thuTu || stop.sequence || 0,
        lat: Number(stop.viDo || stop.lat),
        lng: Number(stop.kinhDo || stop.lng),
        name: stop.tenDiem || stop.name,
      }));

      // Sort stops by sequence
      stops.sort((a, b) => a.sequence - b.sequence);

      // Decode polyline (no interpolation - we'll calculate dynamically)
      const points = decodePolyline(routeData.polyline);

      return { points, stops };
    } catch (err: any) {
      throw new Error(`Failed to fetch simulation data: ${err.message}`);
    }
  }, [tripId, routeId, decodePolyline]);

  // Send GPS update via WebSocket
  const sendGPSUpdate = useCallback(
    (point: SimulatorPoint) => {
      if (!tripId) return;

      try {
        const socket = socketService.getSocket();
        if (socket?.connected) {
          // Send both events for compatibility
          // Backend expects "gps:update" event which triggers checkGeofence
          socket.emit("gps:update", {
            tripId,
            lat: point.lat,
            lng: point.lng,
            speed: point.speed,
            speedKph: point.speed, // Backend uses speedKph
            heading: point.heading,
            tsClient: new Date().toISOString(),
          });

          // Also send legacy event for compatibility
          socketService.sendDriverGPS({
            tripId,
            lat: point.lat,
            lng: point.lng,
            speed: point.speed,
            heading: point.heading,
          });
        }
      } catch (err) {
        console.warn("[useGPSSimulator] Failed to send GPS update:", err);
      }
    },
    [tripId]
  );

  // Check if we're at a stop
  const checkIfAtStop = useCallback(
    (point: SimulatorPoint, stopIndex: number): boolean => {
      if (stopIndex >= stopsRef.current.length) return false;

      const stop = stopsRef.current[stopIndex];
      const distance = haversine(point.lat, point.lng, stop.lat, stop.lng);

      return distance < stopDistanceThreshold;
    },
    [haversine, stopDistanceThreshold]
  );

  // Check distance to stops and trigger notification if within 60m
  const checkApproachStop = useCallback(
    (point: SimulatorPoint) => {
      const stops = stopsRef.current;
      const currentStopIndex = currentStopIndexRef.current;
      const notifiedStops = notifiedStopsRef.current;

      // Check all upcoming stops (from currentStopIndex onwards)
      for (let i = currentStopIndex; i < stops.length; i++) {
        const stop = stops[i];
        
        // Skip if already notified for this stop
        if (notifiedStops.has(stop.sequence)) {
          continue;
        }

        const distance = haversine(point.lat, point.lng, stop.lat, stop.lng);

        // If within notification distance (60m), backend will handle notification via checkGeofence
        // We just need to ensure GPS update is sent, which happens in sendGPSUpdate
        if (distance <= approachNotificationDistance) {
          console.log(
            `[useGPSSimulator] Approaching stop ${stop.name || stop.sequence} (${Math.round(distance)}m) - GPS update will trigger backend notification`
          );
          // Mark as notified to avoid spam
          notifiedStops.add(stop.sequence);
        }
      }
    },
    [haversine, approachNotificationDistance]
  );

  // Update speed dynamically - works in real-time without restart
  const updateSpeed = useCallback((newSpeed: number) => {
    if (newSpeed < 10 || newSpeed > 120) {
      console.warn("[useGPSSimulator] Speed out of range (10-120 km/h)");
      return;
    }
    
    speedRef.current = newSpeed;
    setCurrentSpeed(newSpeed);
    
    // Speed change is applied immediately in the next interval calculation
    console.log(`[useGPSSimulator] Speed updated to ${newSpeed} km/h (applied immediately)`);
  }, []);

  // Start simulation
  const start = useCallback(async () => {
    if (!tripId || !routeId) {
      setError("Trip ID and Route ID are required");
      return;
    }

    if (running) {
      console.warn("[useGPSSimulator] Already running");
      return;
    }

    try {
      setError(null);
      setRunning(true);
      setIsAtStop(false);
      isPausedRef.current = false;
      speedRef.current = currentSpeed;
      notifiedStopsRef.current.clear(); // Reset notified stops

      // Fetch simulation data
      const { points, stops } = await fetchSimulationData();
      polylinePointsRef.current = points;
      stopsRef.current = stops;
      currentSegmentIndexRef.current = 0;
      currentPositionInSegmentRef.current = 0;
      currentStopIndexRef.current = 0;

      if (points.length === 0) {
        throw new Error("No polyline points found");
      }

      // Set initial position (first point)
      const initialPoint: SimulatorPoint = {
        lat: points[0].lat,
        lng: points[0].lng,
        speed: currentSpeed,
        heading: points.length > 1 
          ? calculateBearing(points[0].lat, points[0].lng, points[1].lat, points[1].lng)
          : 0,
      };
      setCurrentPosition(initialPoint);
      sendGPSUpdate(initialPoint);

      // Start simulation loop with dynamic calculation
      intervalRef.current = setInterval(() => {
        if (isPausedRef.current) return;

        const points = polylinePointsRef.current;
        const stops = stopsRef.current;

        // Calculate next point based on current speed (dynamic)
        const nextPoint = calculateNextPoint();

        if (!nextPoint) {
          // Reached end of polyline
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setRunning(false);
          setIsAtStop(true);
          return;
        }

        // Update position
        setCurrentPosition(nextPoint);
        sendGPSUpdate(nextPoint);

        // Check approach to stops (60m notification)
        checkApproachStop(nextPoint);

        // Check if we're at current target stop (50m threshold for stopping)
        const currentStopIndex = currentStopIndexRef.current;
        if (currentStopIndex < stops.length) {
          const atStop = checkIfAtStop(nextPoint, currentStopIndex);

          if (atStop) {
            // Pause simulation at stop
            isPausedRef.current = true;
            setIsAtStop(true);
            const stopName = stops[currentStopIndex].name || `Stop ${currentStopIndex + 1}`;
            console.log(
              `[useGPSSimulator] Arrived at stop ${currentStopIndex + 1}/${stops.length}: ${stopName}`
            );
          }
        }
      }, interval * 1000);
    } catch (err: any) {
      console.error("[useGPSSimulator] Start failed:", err);
      setError(err.message || "Failed to start simulation");
      setRunning(false);
    }
  }, [tripId, routeId, running, currentSpeed, fetchSimulationData, sendGPSUpdate, checkIfAtStop, checkApproachStop, calculateNextPoint, interval, calculateBearing]);

  // Continue to next stop
  const continueToNextStop = useCallback(() => {
    if (!isPausedRef.current) {
      console.warn("[useGPSSimulator] Not paused, cannot continue");
      return;
    }

    // Move to next stop
    currentStopIndexRef.current += 1;

    // Resume simulation
    isPausedRef.current = false;
    setIsAtStop(false);

    console.log(
      `[useGPSSimulator] Continuing to stop ${currentStopIndexRef.current + 1}`
    );
  }, []);

  // Stop simulation
  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setRunning(false);
    setIsAtStop(false);
    isPausedRef.current = false;
    currentSegmentIndexRef.current = 0;
    currentPositionInSegmentRef.current = 0;
    currentStopIndexRef.current = 0;
    polylinePointsRef.current = [];
    stopsRef.current = [];
    notifiedStopsRef.current.clear();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Update speed when options change
  useEffect(() => {
    if (speed !== currentSpeed && !running) {
      setCurrentSpeed(speed);
      speedRef.current = speed;
    }
  }, [speed, currentSpeed, running]);

  return {
    start,
    stop,
    continueToNextStop,
    updateSpeed,
    running,
    currentPosition,
    isAtStop,
    error,
    currentSpeed,
  };
}

