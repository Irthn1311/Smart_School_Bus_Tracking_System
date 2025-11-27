"use client";

import { useEffect, useRef, useState } from "react";
import { socketService } from "@/lib/socket";
const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_ORIGIN || "http://localhost:4000";

export type GpsPoint = {
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  timestamp?: number;
};

/**
 * useGPS
 * - Starts browser geolocation watch and streams GPS to backend for a given trip
 * - Prefers Socket.IO emit('driver_gps'), falls back to REST POST /api/trips/:id/telemetry
 */
export function useGPS(tripId?: number) {
  const watchIdRef = useRef<number | null>(null);
  const [lastPoint, setLastPoint] = useState<GpsPoint | null>(null);
  const [running, setRunning] = useState(false);
  const sendIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentPositionRef = useRef<GpsPoint | null>(null);

  useEffect(() => {
    return () => {
      if (sendIntervalRef.current) clearInterval(sendIntervalRef.current);
      if (watchIdRef.current !== null && typeof navigator !== "undefined") {
        try {
          navigator.geolocation.clearWatch(watchIdRef.current);
        } catch {}
      }
    };
  }, []);

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

  async function send(point: GpsPoint) {
    if (!tripId) return;

    // try socket first
    try {
      if (socketService.isConnected()) {
        socketService.sendDriverGPS({
          tripId,
          lat: point.lat,
          lng: point.lng,
          speed: point.speed,
          heading: point.heading,
        });
        console.log(
          `📤 Sent GPS: lat=${point.lat.toFixed(6)}, lng=${point.lng.toFixed(
            6
          )}`
        );
        return;
      }
    } catch {}
    // fallback to REST (use non-v1 route mounted under /api)
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      try {
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("ssb_token")
            : null;
        if (token) headers["Authorization"] = `Bearer ${token}`;
      } catch {}
      await fetch(`${API_ORIGIN}/api/trips/${tripId}/telemetry`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          lat: point.lat,
          lng: point.lng,
          speed: point.speed,
          heading: point.heading,
        }),
      });
    } catch (e) {
      console.warn("[useGPS] Telemetry send failed", e);
    }
  }

  function start() {
    if (!tripId) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    if (watchIdRef.current !== null) return;
    setRunning(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = pos.coords;
        const point: GpsPoint = {
          lat: coords.latitude,
          lng: coords.longitude,
          speed:
            typeof coords.speed === "number" ? coords.speed * 3.6 : undefined, // m/s -> km/h
          heading:
            typeof coords.heading === "number" ? coords.heading : undefined,
          timestamp: Date.now(),
        };
        setLastPoint(point);
        // Lưu vị trí mới nhất vào ref, không gửi ngay
        currentPositionRef.current = point;
      },
      (err) => {
        console.warn("[useGPS] geolocation error", err);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );

    // Gửi GPS mỗi 3 giây
    sendIntervalRef.current = setInterval(() => {
      if (currentPositionRef.current) {
        send(currentPositionRef.current);
      }
    }, 3000);
  }

  function stop() {
    if (sendIntervalRef.current) {
      clearInterval(sendIntervalRef.current);
      sendIntervalRef.current = null;
    }
    if (watchIdRef.current !== null && typeof navigator !== "undefined") {
      try {
        navigator.geolocation.clearWatch(watchIdRef.current);
      } catch {}
      watchIdRef.current = null;
      setRunning(false);
    }
  }

  return { start, stop, running, lastPoint };
}
