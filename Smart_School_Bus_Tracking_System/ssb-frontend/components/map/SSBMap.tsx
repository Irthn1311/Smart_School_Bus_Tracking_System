"use client";

import React, {
  useEffect,
  useRef,
  useMemo,
  useCallback,
  useState,
} from "react";
import { loadGoogleMaps, getGoogle } from "@/lib/maps/googleLoader";
import apiClient from "@/lib/api-client";

// Extend window type for temp marker
declare global {
  interface Window {
    tempBusLocationMarker?: any;
  }
}

export interface StopDTO {
  maDiem: number;
  tenDiem: string;
  viDo: number;
  kinhDo: number;
  address?: string | null;
  sequence: number;
  dwell_seconds?: number;
  routeIndex?: number;    // dùng để phân biệt tuyến

}

export interface BusMarker {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  status?: "running" | "idle" | "late" | "incident";
  heading?: number; // Direction in degrees (0-360, 0=North, 90=East)
}

export interface RouteInfo {
  routeId: number;
  routeName: string;
  polyline: string | null;
  color: string;
}

interface SSBMapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  polyline?: string | null; // Encoded polyline string from backend (single route - legacy)
  routes?: RouteInfo[]; // Multiple routes with polylines
  stops?: StopDTO[];
  buses?: BusMarker[];
  height?: string;
  onStopClick?: (stop: StopDTO) => void;
  onBusClick?: (bus: BusMarker) => void;
  disableDirections?: boolean;  // true => không vẽ đường, không decode polyline

  className?: string;
  autoFitOnUpdate?: boolean; // Auto fit bounds when markers update
  followFirstMarker?: boolean; // Pan to first marker when it moves
  showMyLocation?: boolean; // Show "My Location" button (default: true)
  customLocationLabel?: string; // Custom label for location button
  customLocationTarget?: { lat: number; lng: number }; // Custom target instead of user location
}

function SSBMap({
  center = { lat: 10.77653, lng: 106.700981 },
  zoom = 13,
  polyline,
  routes = [],
  stops = [],
  buses = [],
  height = "400px",
  onStopClick,
  onBusClick,
  className = "",
  autoFitOnUpdate = false,
  disableDirections = false, 
  followFirstMarker = false,
  showMyLocation = true,
  customLocationLabel,
  customLocationTarget,
}: SSBMapProps) {
  // Validate and normalize center coordinates
  const validCenter = useMemo(() => {
    const lat = Number(center?.lat);
    const lng = Number(center?.lng);

    // Check if coordinates are valid numbers
    if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) {
      console.warn(
        "[SSBMap] Invalid center coordinates, using default:",
        center
      );
      return { lat: 10.77653, lng: 106.700981 };
    }

    // Check if coordinates are within valid range
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      console.warn(
        "[SSBMap] Center coordinates out of range, using default:",
        center
      );
      return { lat: 10.77653, lng: 106.700981 };
    }

    return { lat, lng };
  }, [center?.lat, center?.lng]);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const polylineInstanceRef = useRef<google.maps.Polyline | null>(null);
  const routePolylinesRef = useRef<Map<number, google.maps.Polyline>>(
    new Map()
  ); // Multiple route polylines
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(
    null
  );
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const accuracyCircleRef = useRef<google.maps.Circle | null>(null);
  const customLocationTargetRef = useRef<
    { lat: number; lng: number } | undefined
  >(customLocationTarget);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [geometryReady, setGeometryReady] = useState(false);
  const [fetchedPolyline, setFetchedPolyline] = useState<string | null>(null);
  const [isFetchingDirections, setIsFetchingDirections] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);

  // Update ref when customLocationTarget changes
  useEffect(() => {
    customLocationTargetRef.current = customLocationTarget;
  }, [customLocationTarget]);

  // Check if Geometry library is ready
  const checkGeometryReady = useCallback(() => {
    try {
      const g = getGoogle();
      if (
        g?.maps?.geometry?.encoding &&
        typeof g.maps.geometry.encoding.decodePath === "function"
      ) {
        setGeometryReady(true);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  // Decode polyline using Google Maps Geometry library
  const decodePolyline = useCallback(
    (encoded: string): google.maps.LatLng[] => {
      if (!encoded || !encoded.trim()) {
        console.warn("[SSBMap] Empty polyline string");
        return [];
      }

      try {
        const g = getGoogle();

        // Ensure geometry library is loaded
        if (!g?.maps?.geometry?.encoding) {
          console.error("[SSBMap] Geometry library not loaded");
          return [];
        }

        if (typeof g.maps.geometry.encoding.decodePath !== "function") {
          console.error("[SSBMap] decodePath function not available");
          return [];
        }

        const decoded = g.maps.geometry.encoding.decodePath(encoded);

        if (!decoded || decoded.length === 0) {
          console.warn("[SSBMap] Decoded polyline is empty");
          return [];
        }

        console.log("[SSBMap] Successfully decoded polyline:", {
          encodedLength: encoded.length,
          decodedPoints: decoded.length,
          firstPoint: decoded[0],
          lastPoint: decoded[decoded.length - 1],
        });

        return decoded;
      } catch (err) {
        console.error("[SSBMap] Failed to decode polyline:", err, {
          polylineLength: encoded.length,
          polylinePreview: encoded.substring(0, 50),
        });
        return [];
      }
    },
    []
  );

  // Track if we've already attempted to fetch for this set of stops
  const stopsHashRef = useRef<string>("");
  const fetchAttemptedRef = useRef<boolean>(false);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-fetch directions if no polyline but has stops
  // Only fetch if we don't have routes with polylines (for tracking page)
  useEffect(() => {

    if (disableDirections) {
      console.log("[SSBMap] Directions disabled, skip auto-fetching");
      return;
    }

    // Clear any pending fetch
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = null;
    }

    // Only fetch if:
    // 1. No polyline from backend
    // 2. No routes with polylines (for tracking page)
    // 3. Has stops (at least 2)
    // 4. Not already fetching
    // 5. Not already fetched
    // Note: Don't require mapInstanceRef to be ready, as we can fetch directions before map is ready
    const hasRoutePolylines =
      routes &&
      routes.length > 0 &&
      routes.some((r) => r.polyline && r.polyline.trim());

    // Create a hash of stops to detect changes
    const stopsHash = JSON.stringify(
      stops
        .map((s) => ({ lat: s.viDo, lng: s.kinhDo, seq: s.sequence }))
        .sort((a, b) => (a.seq || 0) - (b.seq || 0))
    );

    // Reset fetch attempt if stops changed
    if (stopsHash !== stopsHashRef.current) {
      stopsHashRef.current = stopsHash;
      fetchAttemptedRef.current = false;
    }

    if (
      !polyline &&
      !fetchedPolyline &&
      !hasRoutePolylines &&
      stops.length >= 2 &&
      !isFetchingDirections &&
      !fetchAttemptedRef.current
    ) {
      // Mark as attempted immediately to prevent duplicate calls
      fetchAttemptedRef.current = true;

      // Debounce: Wait 500ms before actually fetching to avoid rapid-fire requests
      fetchTimeoutRef.current = setTimeout(() => {
        const sortedStops = [...stops].sort(
          (a, b) => (a.sequence || 0) - (b.sequence || 0)
        );
        const validStops = sortedStops.filter(
          (stop) =>
            stop.viDo != null &&
            stop.kinhDo != null &&
            !isNaN(Number(stop.viDo)) &&
            !isNaN(Number(stop.kinhDo)) &&
            isFinite(Number(stop.viDo)) &&
            isFinite(Number(stop.kinhDo))
        );

        if (validStops.length < 2) {
          setIsFetchingDirections(false);
          return;
        }

        // Validate coordinates before making request
        const originLat = Number(validStops[0].viDo);
        const originLng = Number(validStops[0].kinhDo);
        const destLat = Number(validStops[validStops.length - 1].viDo);
        const destLng = Number(validStops[validStops.length - 1].kinhDo);

        if (
          isNaN(originLat) ||
          isNaN(originLng) ||
          !isFinite(originLat) ||
          !isFinite(originLng) ||
          isNaN(destLat) ||
          isNaN(destLng) ||
          !isFinite(destLat) ||
          !isFinite(destLng)
        ) {
          console.error(
            "[SSBMap] Invalid coordinates for directions request:",
            {
              origin: { lat: originLat, lng: originLng },
              destination: { lat: destLat, lng: destLng },
            }
          );
          setIsFetchingDirections(false);
          return;
        }

        setIsFetchingDirections(true);
        console.log(
          "[SSBMap] Auto-fetching directions from frontend (no polyline from backend)"
        );

        // Validate coordinate ranges (latitude: -90 to 90, longitude: -180 to 180)
        if (
          originLat < -90 ||
          originLat > 90 ||
          originLng < -180 ||
          originLng > 180 ||
          destLat < -90 ||
          destLat > 90 ||
          destLng < -180 ||
          destLng > 180
        ) {
          console.error("[SSBMap] Coordinates out of valid range:", {
            origin: { lat: originLat, lng: originLng },
            destination: { lat: destLat, lng: destLng },
          });
          setIsFetchingDirections(false);
          return;
        }

        // Additional validation: Check if coordinates are in Vietnam (rough bounds)
        // Vietnam: lat ~8.5-23.5, lng ~102-110
        const isInVietnam = (lat: number, lng: number) => {
          return lat >= 8.0 && lat <= 24.0 && lng >= 102.0 && lng <= 110.0;
        };

        if (
          !isInVietnam(originLat, originLng) ||
          !isInVietnam(destLat, destLng)
        ) {
          console.warn(
            "[SSBMap] Coordinates outside Vietnam bounds, may cause ZERO_RESULTS:",
            {
              origin: { lat: originLat, lng: originLng },
              destination: { lat: destLat, lng: destLng },
            }
          );
          // Still try, but log warning
        }

        const origin = `${originLat},${originLng}`;
        const destination = `${destLat},${destLng}`;

        // Validate origin and destination strings
        if (
          !origin ||
          origin.includes("NaN") ||
          !destination ||
          destination.includes("NaN")
        ) {
          console.error(
            "[SSBMap] Invalid coordinates for directions request:",
            {
              origin,
              destination,
              originLat,
              originLng,
              destLat,
              destLng,
            }
          );
          setIsFetchingDirections(false);
          return;
        }

        // Limit waypoints to 23 (Google Maps allows max 25, but we use 2 for origin/dest)
        // If too many stops, only use first and last few waypoints
        const maxWaypoints = 23;
        let waypoints: Array<{ location: string }> = [];

        if (validStops.length > 2) {
          const middleStops = validStops.slice(1, -1);

          if (middleStops.length <= maxWaypoints) {
            // Use all waypoints if within limit
            waypoints = middleStops
              .map((stop) => {
                const lat = Number(stop.viDo);
                const lng = Number(stop.kinhDo);
                if (
                  isNaN(lat) ||
                  isNaN(lng) ||
                  !isFinite(lat) ||
                  !isFinite(lng)
                ) {
                  return null;
                }
                // Validate coordinate ranges
                if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                  return null;
                }
                return { location: `${lat},${lng}` };
              })
              .filter((wp): wp is { location: string } => wp !== null);
          } else {
            // Too many waypoints - sample evenly
            const step = Math.ceil(middleStops.length / maxWaypoints);
            const sampledStops = [];
            for (let i = 0; i < middleStops.length; i += step) {
              sampledStops.push(middleStops[i]);
            }
            // Ensure we don't exceed limit
            const finalStops = sampledStops.slice(0, maxWaypoints);

            waypoints = finalStops
              .map((stop) => {
                const lat = Number(stop.viDo);
                const lng = Number(stop.kinhDo);
                if (
                  isNaN(lat) ||
                  isNaN(lng) ||
                  !isFinite(lat) ||
                  !isFinite(lng)
                ) {
                  return null;
                }
                if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                  return null;
                }
                return { location: `${lat},${lng}` };
              })
              .filter((wp): wp is { location: string } => wp !== null);

            console.warn(
              `[SSBMap] Too many stops (${middleStops.length}), sampling to ${waypoints.length} waypoints`
            );
          }
        }

        console.log("[SSBMap] Calling Directions API with:", {
          origin,
          destination,
          waypointsCount: waypoints.length,
          mode: "driving",
        });

        // Build request payload - only include waypoints if we have them
        const requestPayload: {
          origin: string;
          destination: string;
          waypoints?: Array<{ location: string }>;
          mode: string;
          vehicleType?: string;
        } = {
          origin,
          destination,
          mode: "driving", // Mode driving phù hợp với xe buýt
          vehicleType: "bus", // Chỉ định loại xe là buýt
        };

        if (waypoints.length > 0) {
          requestPayload.waypoints = waypoints;
        }

        apiClient
          .getDirections(requestPayload)
          .then((response) => {
            console.log("[SSBMap] Directions API response:", {
              success: response.success,
              hasData: !!response.data,
              dataKeys: response.data ? Object.keys(response.data) : [],
              fullResponse: response,
            });

            // Backend returns: { success: true, data: { polyline: "...", legs: [...], ... } }
            if (response.success && response.data) {
              const data = response.data as any;

              // Check for polyline in various possible locations
              const newPolyline =
                data.polyline || data.overview_polyline?.points || null;

              if (
                newPolyline &&
                typeof newPolyline === "string" &&
                newPolyline.trim()
              ) {
                console.log(
                  "[SSBMap] Successfully fetched directions, got polyline:",
                  newPolyline.length,
                  "chars"
                );
                setFetchedPolyline(newPolyline);
              } else {
                console.warn(
                  "[SSBMap] Directions API did not return valid polyline:",
                  {
                    hasPolyline: !!data.polyline,
                    hasOverviewPolyline: !!data.overview_polyline,
                    polylineType: typeof data.polyline,
                    dataStructure: data,
                  }
                );
              }
            } else {
              console.warn(
                "[SSBMap] Directions API response not successful or missing data:",
                response
              );
            }
          })
          .catch((err: any) => {
            // Handle rate limiting (429) - don't retry immediately
            if (err?.response?.status === 429) {
              console.warn(
                "[SSBMap] Rate limited (429) - too many requests. Will not retry for this set of stops."
              );
              fetchAttemptedRef.current = true; // Mark as attempted to prevent retry
              setIsFetchingDirections(false);
              return;
            }

            // Handle ZERO_RESULTS error gracefully
            if (
              err?.code === "MAPS_API_ERROR" ||
              err?.message?.includes("ZERO_RESULTS")
            ) {
              console.warn(
                "[SSBMap] Directions API returned ZERO_RESULTS - no route found between points:",
                {
                  origin,
                  destination,
                  waypointsCount: waypoints.length,
                }
              );
              console.warn(
                "[SSBMap] This may happen if coordinates are invalid or no route exists. Will not retry."
              );
              setIsFetchingDirections(false);
              return; // Don't retry, just fail silently
            }

            console.error("[SSBMap] Error fetching directions:", {
              message: err?.message,
              response: err?.response?.data,
              status: err?.response?.status,
              error: err?.response?.data?.error,
            });

            // Log the request that failed for debugging
            console.error("[SSBMap] Failed request details:", {
              origin,
              destination,
              waypointsCount: waypoints.length,
            });

            // Check for connection errors and provide helpful message
            if (
              err?.message === "Network Error" ||
              err?.code === "ERR_NETWORK" ||
              err?.code === "ERR_CONNECTION_REFUSED"
            ) {
              console.error(
                "[SSBMap] ⚠️ Backend server không chạy hoặc không thể kết nối!"
              );
              console.error("[SSBMap] 💡 Hãy kiểm tra:");
              console.error(
                "[SSBMap]   1. Backend server có đang chạy không? (cd ssb-backend && npm run dev)"
              );
              console.error(
                "[SSBMap]   2. Backend có chạy trên port 4000 không?"
              );
              console.error(
                "[SSBMap]   3. Thử truy cập: http://localhost:4000/api/v1/health"
              );
            }

            setIsFetchingDirections(false);
          })
          .finally(() => {
            setIsFetchingDirections(false);
          });
      }, 500); // 500ms debounce
    }

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = null;
      }
    };
  }, [polyline, fetchedPolyline, stops, isFetchingDirections, routes, disableDirections]);

  // Fallback: Create simple polyline from stops if Directions API fails
  const createSimplePolylineFromStops = useCallback(
    (stops: StopDTO[]): google.maps.LatLng[] | null => {
      if (!stops || stops.length < 2) return null;

      // Check if Google Maps is loaded before calling getGoogle()
      try {
        const g = getGoogle();
        if (!g?.maps?.LatLng) {
          console.warn(
            "[SSBMap] Google Maps not loaded yet, cannot create simple polyline"
          );
          return null;
        }

        const sortedStops = [...stops].sort(
          (a, b) => (a.sequence || 0) - (b.sequence || 0)
        );
        const validStops = sortedStops.filter(
          (stop) =>
            stop.viDo != null &&
            stop.kinhDo != null &&
            !isNaN(Number(stop.viDo)) &&
            !isNaN(Number(stop.kinhDo)) &&
            isFinite(Number(stop.viDo)) &&
            isFinite(Number(stop.kinhDo)) &&
            Number(stop.viDo) >= -90 &&
            Number(stop.viDo) <= 90 &&
            Number(stop.kinhDo) >= -180 &&
            Number(stop.kinhDo) <= 180
        );

        if (validStops.length < 2) return null;

        // Create simple straight-line polyline between stops
        const path = validStops.map((stop) => {
          const lat = Number(stop.viDo);
          const lng = Number(stop.kinhDo);
          return new g.maps.LatLng(lat, lng);
        });

        console.log(
          "[SSBMap] Created simple polyline from stops (fallback):",
          path.length,
          "points"
        );
        return path;
      } catch (error: any) {
        // Handle case where Google Maps is not loaded yet
        if (error?.message?.includes("Google Maps API is not loaded")) {
          console.warn(
            "[SSBMap] Google Maps API not loaded yet, will retry later"
          );
          return null;
        }
        console.error("[SSBMap] Error creating simple polyline:", error);
        return null;
      }
    },
    []
  );

  // Memoized polyline path - Ưu tiên polyline từ backend, sau đó từ fetched directions, cuối cùng là fallback
  const polylinePath = useMemo(() => {

    if (disableDirections) return null;
    // Use polyline from backend first, then fetched polyline
    const activePolyline = polyline || fetchedPolyline;

    // Only log in debug mode to reduce console noise
    if (process.env.NODE_ENV === "development") {
      console.log("[SSBMap] Computing polylinePath:", {
        hasBackendPolyline: !!polyline,
        hasFetchedPolyline: !!fetchedPolyline,
        activePolylineLength: activePolyline?.length || 0,
        stopsCount: stops?.length || 0,
        geometryReady,
        isFetchingDirections,
      });
    }

    // CHỈ dùng polyline từ backend hoặc fetched (đường đi thực tế từ Directions API)
    if (activePolyline && activePolyline.trim()) {
      // Check if geometry is ready before decoding
      if (!geometryReady) {
        console.warn(
          "[SSBMap] Geometry library not ready, cannot decode polyline yet"
        );
        // Return null for now, will retry when geometry is ready
        return null;
      }

      const decoded = decodePolyline(activePolyline);
      if (decoded.length > 0) {
        console.log(
          "[SSBMap] Decoded polyline successfully (real route from Directions API):",
          decoded.length,
          "points"
        );
        return decoded;
      } else {
        console.error("[SSBMap] Failed to decode polyline");
        // Fallback to simple polyline from stops (only if Google Maps is ready)
        if (stops && stops.length >= 2 && geometryReady) {
          return createSimplePolylineFromStops(stops);
        }
        return null;
      }
    }

    // Nếu đang fetch directions, đợi
    if (stops && stops.length >= 2 && isFetchingDirections) {
      console.log("[SSBMap] Fetching directions from API, please wait...");
      return null;
    }

    // Fallback: Tạo polyline đơn giản từ stops nếu không có polyline và không đang fetch
    // CHỈ tạo fallback khi KHÔNG có routes với polylines (để tránh vẽ đường chim bay khi đã có đường đi thực tế)
    const hasRoutePolylines = routes && routes.length > 0 && routes.some((r) => r.polyline && r.polyline.trim());
    
    if (stops && stops.length >= 2 && !isFetchingDirections && geometryReady && !hasRoutePolylines) {
      const simplePath = createSimplePolylineFromStops(stops);
      if (simplePath) {
        console.log(
          "[SSBMap] Using simple polyline from stops (no backend polyline available, no routes with polylines)"
        );
        return simplePath;
      }
    }

    return null;
  }, [
    polyline,
    fetchedPolyline,
    stops,
    decodePolyline,
    geometryReady,
    isFetchingDirections,
    createSimplePolylineFromStops,
    routes, // Add routes to dependencies to prevent fallback when routes have polylines
  ]);

  // Initialize map
  useEffect(() => {
    let mounted = true;

    let attempts = 0;
    const maxAttempts = 180; // ~3s with rAF

    const init = () => {
      console.log("[SSBMap] init called. hasRef=", !!mapRef.current);
      if (!mounted) return;
      if (!mapRef.current) {
        attempts += 1;
        if (attempts > maxAttempts) {
          console.error(
            "[SSBMap] Map container ref not attached after retries. Aborting."
          );
          setError("Không khởi tạo được vùng hiển thị bản đồ.");
          setIsLoading(false);
          return;
        }
        requestAnimationFrame(init);
        return;
      }

      console.log("[SSBMap] loading Google Maps...");
      loadGoogleMaps()
        .then(async () => {
          if (!mounted || !mapRef.current) return;

          const g = getGoogle();
          console.log("[SSBMap] Google Maps loaded, creating map instance");

          // Ensure core 'maps' library is initialized
          try {
            if (typeof (g.maps as any).importLibrary === "function") {
              console.log("[SSBMap] importing maps library...");
              await (g.maps as any).importLibrary("maps");

              // Also import geometry library explicitly
              console.log("[SSBMap] importing geometry library...");
              await (g.maps as any).importLibrary("geometry");
            }
          } catch (e) {
            console.warn("[SSBMap] importLibrary failed or unavailable:", e);
          }

          // Check geometry library
          if (checkGeometryReady()) {
            console.log("[SSBMap] Geometry library is ready");
          } else {
            console.warn("[SSBMap] Geometry library not ready, will retry");
            // Retry after a short delay
            setTimeout(() => {
              if (checkGeometryReady()) {
                console.log("[SSBMap] Geometry library ready after retry");
              }
            }, 500);
          }

          // Warn if container has zero size
          try {
            const el = mapRef.current as HTMLDivElement;
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) {
              console.warn(
                "[SSBMap] Map container has zero size. width=",
                rect.width,
                "height=",
                rect.height
              );
            }
          } catch {}

          const gm = (window as any).google?.maps;
          console.log(
            "[SSBMap] typeof maps.Map =",
            typeof gm?.Map,
            "version=",
            gm?.version
          );
          if (!gm || typeof gm.Map !== "function") {
            throw new Error(
              "Google Maps API loaded but Map constructor is unavailable."
            );
          }

          const map = new gm.Map(mapRef.current, {
            center: validCenter,
            zoom,
            mapTypeControl: true,
            streetViewControl: false,
            fullscreenControl: true,
            zoomControl: true,
          });

          mapInstanceRef.current = map;
          setIsMapReady(true); // Mark map as ready

          // Add "Locate me" control (only if showMyLocation is true)
          if (showMyLocation) {
            try {
              const controlDiv = document.createElement("div");
              controlDiv.style.margin = "8px";
              controlDiv.style.display = "flex";
              controlDiv.style.flexDirection = "column";
              controlDiv.style.alignItems = "center";

              const btn = document.createElement("button");
              btn.type = "button";
              btn.title = customLocationLabel || "Vị trí của tôi";
              btn.style.background = "#fff";
              btn.style.border = "1px solid #e5e7eb";
              btn.style.borderRadius = "9999px";
              btn.style.width = "40px";
              btn.style.height = "40px";
              btn.style.boxShadow = "0 1px 2px rgba(0,0,0,0.1)";
              btn.style.cursor = "pointer";
              btn.style.display = "flex";
              btn.style.alignItems = "center";
              btn.style.justifyContent = "center";
              btn.style.padding = "0";

              // Use bus icon if customLocationTarget is provided, otherwise use location icon
              btn.innerHTML = customLocationTarget
                ? '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111827" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/></svg>'
                : '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111827" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m19 19-1.5-1.5"></path><path d="M6.5 6.5 5 5"></path><path d="m19 5-1.5 1.5"></path><path d="M6.5 17.5 5 19"></path></svg>';

              const loadingSpan = document.createElement("span");
              loadingSpan.style.fontSize = "10px";
              loadingSpan.style.color = "#6b7280";
              loadingSpan.style.marginTop = "4px";
              loadingSpan.style.display = "none";
              loadingSpan.textContent = "Đang định vị...";

              controlDiv.appendChild(btn);
              controlDiv.appendChild(loadingSpan);

              map.controls[g.maps.ControlPosition.RIGHT_BOTTOM].push(
                controlDiv
              );

              let isLocating = false; // Prevent multiple simultaneous requests
              let locationSuccess = false; // Track if location was successfully obtained
              let cachedPosition: GeolocationPosition | null = null; // Cache last GPS position

              // Listen to geolocation updates to cache position
              if (navigator.geolocation) {
                navigator.geolocation.watchPosition(
                  (pos) => {
                    cachedPosition = pos;
                    console.log("[SSBMap] Cached GPS position updated:", {
                      lat: pos.coords.latitude,
                      lng: pos.coords.longitude,
                      accuracy: pos.coords.accuracy,
                    });
                  },
                  (err) => {
                    console.warn("[SSBMap] GPS watch error:", err.message);
                  },
                  {
                    enableHighAccuracy: true,
                    maximumAge: 0,
                    timeout: 15000,
                  }
                );
              }

              const locate = () => {
                // If customLocationTarget is provided, use it instead of geolocation
                // Use the LATEST value from ref (not closure) to avoid stale values
                const currentTarget = customLocationTargetRef.current;

                console.log(
                  "[SSBMap] locate() called, currentTarget from ref:",
                  currentTarget
                );

                if (currentTarget && currentTarget.lat && currentTarget.lng) {
                  console.log(
                    "[SSBMap] Panning to custom location (bus position):",
                    currentTarget
                  );

                  loadingSpan.style.display = "block";
                  btn.style.opacity = "0.7";

                  const targetLatLng = new g.maps.LatLng(
                    currentTarget.lat,
                    currentTarget.lng
                  );

                  // Pan to bus location with smooth animation
                  map.panTo(targetLatLng);
                  map.setZoom(16);

                  // Add a temporary marker
                  if (window.tempBusLocationMarker) {
                    window.tempBusLocationMarker.setMap(null);
                  }

                  window.tempBusLocationMarker = new g.maps.Marker({
                    position: targetLatLng,
                    map: map,
                    title: customLocationLabel || "Vị trí xe buýt",
                    icon: {
                      path: g.maps.SymbolPath.CIRCLE,
                      scale: 10,
                      fillColor: "#3b82f6",
                      fillOpacity: 0.3,
                      strokeColor: "#3b82f6",
                      strokeWeight: 2,
                    },
                  });

                  // Remove marker after 3 seconds
                  setTimeout(() => {
                    if (window.tempBusLocationMarker) {
                      window.tempBusLocationMarker.setMap(null);
                      window.tempBusLocationMarker = null;
                    }
                  }, 3000);

                  loadingSpan.style.display = "none";
                  btn.style.opacity = "1";
                  return;
                }

                // Original geolocation logic
                if (!navigator.geolocation) {
                  console.warn("Geolocation is not supported by this browser.");
                  setError("Trình duyệt không hỗ trợ định vị.");
                  return;
                }

                if (isLocating) {
                  console.log(
                    "[SSBMap] Already locating, ignoring duplicate request"
                  );
                  return;
                }

                // If we have cached position, use it immediately
                if (cachedPosition) {
                  console.log(
                    "[SSBMap] Using cached GPS position (from watchPosition)"
                  );
                  const pos = cachedPosition;
                  const {
                    latitude,
                    longitude,
                    accuracy,
                    altitude,
                    heading,
                    speed,
                  } = pos.coords;

                  loadingSpan.style.display = "block";
                  btn.style.opacity = "0.7";

                  console.log("[SSBMap] Current position:", {
                    latitude,
                    longitude,
                    accuracy,
                    altitude,
                    heading,
                    speed,
                    timestamp: new Date(pos.timestamp).toISOString(),
                  });

                  // Cảnh báo nếu độ chính xác kém (>50m là kém)
                  if (accuracy > 50) {
                    console.warn(
                      `[SSBMap] ⚠️ LOW ACCURACY: ±${accuracy.toFixed(
                        0
                      )}m - GPS might be inaccurate!`
                    );
                  } else if (accuracy > 20) {
                    console.log(
                      `[SSBMap] ℹ️ MEDIUM ACCURACY: ±${accuracy.toFixed(0)}m`
                    );
                  } else {
                    console.log(
                      `[SSBMap] ✅ HIGH ACCURACY: ±${accuracy.toFixed(0)}m`
                    );
                  }

                  // Validate coordinates (Vietnam bounds: lat 8-24, lng 102-110)
                  if (
                    latitude < 8 ||
                    latitude > 24 ||
                    longitude < 102 ||
                    longitude > 110
                  ) {
                    console.warn(
                      "[SSBMap] Invalid coordinates, using fallback (Saigon center)"
                    );
                    // Fallback to Saigon city center
                    const position = new g.maps.LatLng(10.762622, 106.660172);
                    map.panTo(position);
                    map.setZoom(12);
                    loadingSpan.style.display = "none";
                    btn.style.opacity = "1";
                    setError("Vị trí GPS không chính xác. Hiển thị TP.HCM.");
                    return;
                  }

                  const position = new g.maps.LatLng(latitude, longitude);

                  if (!userMarkerRef.current) {
                    userMarkerRef.current = new g.maps.Marker({
                      position,
                      map,
                      title: `Vị trí của tôi (±${accuracy.toFixed(0)}m)`,
                      icon: {
                        path: g.maps.SymbolPath.CIRCLE,
                        scale: 10,
                        fillColor: "#2563EB",
                        fillOpacity: 1,
                        strokeColor: "#ffffff",
                        strokeWeight: 3,
                      },
                      zIndex: 10000, // Hiển thị trên cùng
                    });

                    // Add info window với thông tin chi tiết
                    const accuracyLevel =
                      accuracy > 50
                        ? "Thấp"
                        : accuracy > 20
                        ? "Trung bình"
                        : "Cao";
                    const accuracyColor =
                      accuracy > 50
                        ? "#f59e0b"
                        : accuracy > 20
                        ? "#3b82f6"
                        : "#10b981";

                    const infoWindow = new g.maps.InfoWindow({
                      content: `
                        <div style="padding: 12px; font-family: sans-serif; min-width: 220px;">
                          <div style="font-weight: bold; margin-bottom: 8px; font-size: 14px;">📍 Vị trí hiện tại của bạn</div>
                          <div style="font-size: 12px; color: #666; line-height: 1.6;">
                            <strong>Tọa độ:</strong><br/>
                            ${latitude.toFixed(7)}, ${longitude.toFixed(7)}<br/>
                            <br/>
                            <strong>Độ chính xác:</strong><br/>
                            <span style="color: ${accuracyColor}; font-weight: bold;">±${accuracy.toFixed(
                        0
                      )}m (${accuracyLevel})</span><br/>
                            <br/>
                            <strong>Thời gian:</strong><br/>
                            ${new Date(pos.timestamp).toLocaleString("vi-VN")}
                          </div>
                          ${
                            accuracy > 50
                              ? `
                            <div style="margin-top: 8px; padding: 8px; background: #fef3c7; border-left: 3px solid #f59e0b; font-size: 11px; color: #92400e; border-radius: 4px;">
                              ⚠️ <strong>Độ chính xác thấp!</strong><br/>
                              • Di chuyển ra ngoài trời<br/>
                              • Tránh xa tòa nhà cao tầng<br/>
                              • Đợi GPS lock tốt hơn
                            </div>
                          `
                              : ""
                          }
                        </div>
                      `,
                    });

                    userMarkerRef.current.addListener("click", () => {
                      infoWindow.open(map, userMarkerRef.current);
                    });

                    // Auto show info nếu accuracy thấp
                    if (accuracy > 50) {
                      setTimeout(() => {
                        infoWindow.open(map, userMarkerRef.current);
                      }, 500);
                    }
                  } else {
                    userMarkerRef.current.setPosition(position);
                    userMarkerRef.current.setMap(map);
                    userMarkerRef.current.setTitle(
                      `Vị trí của tôi (±${accuracy.toFixed(0)}m)`
                    );
                  }

                  // Vẽ vòng tròn độ chính xác (càng lớn càng kém chính xác)
                  if (!accuracyCircleRef.current) {
                    accuracyCircleRef.current = new g.maps.Circle({
                      strokeColor: accuracy > 50 ? "#f59e0b" : "#3B82F6",
                      strokeOpacity: 0.5,
                      strokeWeight: 2,
                      fillColor: accuracy > 50 ? "#fef3c7" : "#93C5FD",
                      fillOpacity: 0.2,
                      map,
                      center: position,
                      radius: Math.max(accuracy || 0, 10), // Min 10m
                      zIndex: 9999,
                    });
                  } else {
                    accuracyCircleRef.current.setCenter(position);
                    accuracyCircleRef.current.setRadius(
                      Math.max(accuracy || 0, 10)
                    );
                    accuracyCircleRef.current.setOptions({
                      strokeColor: accuracy > 50 ? "#f59e0b" : "#3B82F6",
                      fillColor: accuracy > 50 ? "#fef3c7" : "#93C5FD",
                    });
                    accuracyCircleRef.current.setMap(map);
                  }

                  map.panTo(position);
                  // Zoom level tùy theo độ chính xác
                  if (map.getZoom()! < 17) {
                    map.setZoom(accuracy > 50 ? 15 : 17); // Zoom thấp hơn nếu accuracy kém
                  }

                  loadingSpan.style.display = "none";
                  btn.style.opacity = "1";
                  setError(null); // Clear any previous errors
                  locationSuccess = true;
                  return; // Done with cached position
                }

                // Fallback: No cached position, use getCurrentPosition (may trigger permission prompt)
                isLocating = true;
                locationSuccess = false;
                loadingSpan.style.display = "block";
                btn.style.opacity = "0.7";

                console.log("[SSBMap] No cached position, requesting GPS...");

                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    cachedPosition = pos; // Cache this position
                    const {
                      latitude,
                      longitude,
                      accuracy,
                      altitude,
                      heading,
                      speed,
                    } = pos.coords;
                    console.log("[SSBMap] Current position:", {
                      latitude,
                      longitude,
                      accuracy,
                      altitude,
                      heading,
                      speed,
                      timestamp: new Date(pos.timestamp).toISOString(),
                    });

                    // Cảnh báo nếu độ chính xác kém (>50m là kém)
                    if (accuracy > 50) {
                      console.warn(
                        `[SSBMap] ⚠️ LOW ACCURACY: ±${accuracy.toFixed(
                          0
                        )}m - GPS might be inaccurate!`
                      );
                    } else if (accuracy > 20) {
                      console.log(
                        `[SSBMap] ℹ️ MEDIUM ACCURACY: ±${accuracy.toFixed(0)}m`
                      );
                    } else {
                      console.log(
                        `[SSBMap] ✅ HIGH ACCURACY: ±${accuracy.toFixed(0)}m`
                      );
                    }

                    // Validate coordinates (Vietnam bounds: lat 8-24, lng 102-110)
                    if (
                      latitude < 8 ||
                      latitude > 24 ||
                      longitude < 102 ||
                      longitude > 110
                    ) {
                      console.warn(
                        "[SSBMap] Invalid coordinates, using fallback (Saigon center)"
                      );
                      // Fallback to Saigon city center
                      const position = new g.maps.LatLng(10.762622, 106.660172);
                      map.panTo(position);
                      map.setZoom(12);
                      loadingSpan.style.display = "none";
                      btn.style.opacity = "1";
                      setError("Vị trí GPS không chính xác. Hiển thị TP.HCM.");
                      isLocating = false;
                      return;
                    }

                    const position = new g.maps.LatLng(latitude, longitude);

                    if (!userMarkerRef.current) {
                      userMarkerRef.current = new g.maps.Marker({
                        position,
                        map,
                        title: `Vị trí của tôi (±${accuracy.toFixed(0)}m)`,
                        icon: {
                          path: g.maps.SymbolPath.CIRCLE,
                          scale: 10,
                          fillColor: "#2563EB",
                          fillOpacity: 1,
                          strokeColor: "#ffffff",
                          strokeWeight: 3,
                        },
                        zIndex: 10000, // Hiển thị trên cùng
                      });

                      // Add info window với thông tin chi tiết
                      const accuracyLevel =
                        accuracy > 50
                          ? "Thấp"
                          : accuracy > 20
                          ? "Trung bình"
                          : "Cao";
                      const accuracyColor =
                        accuracy > 50
                          ? "#f59e0b"
                          : accuracy > 20
                          ? "#3b82f6"
                          : "#10b981";

                      const infoWindow = new g.maps.InfoWindow({
                        content: `
                        <div style="padding: 12px; font-family: sans-serif; min-width: 220px;">
                          <div style="font-weight: bold; margin-bottom: 8px; font-size: 14px;">📍 Vị trí hiện tại của bạn</div>
                          <div style="font-size: 12px; color: #666; line-height: 1.6;">
                            <strong>Tọa độ:</strong><br/>
                            ${latitude.toFixed(7)}, ${longitude.toFixed(7)}<br/>
                            <br/>
                            <strong>Độ chính xác:</strong><br/>
                            <span style="color: ${accuracyColor}; font-weight: bold;">±${accuracy.toFixed(
                          0
                        )}m (${accuracyLevel})</span><br/>
                            <br/>
                            <strong>Thời gian:</strong><br/>
                            ${new Date(pos.timestamp).toLocaleString("vi-VN")}
                          </div>
                          ${
                            accuracy > 50
                              ? `
                            <div style="margin-top: 8px; padding: 8px; background: #fef3c7; border-left: 3px solid #f59e0b; font-size: 11px; color: #92400e; border-radius: 4px;">
                              ⚠️ <strong>Độ chính xác thấp!</strong><br/>
                              • Di chuyển ra ngoài trời<br/>
                              • Tránh xa tòa nhà cao tầng<br/>
                              • Đợi GPS lock tốt hơn
                            </div>
                          `
                              : ""
                          }
                        </div>
                      `,
                      });

                      userMarkerRef.current.addListener("click", () => {
                        infoWindow.open(map, userMarkerRef.current);
                      });

                      // Auto show info nếu accuracy thấp
                      if (accuracy > 50) {
                        setTimeout(() => {
                          infoWindow.open(map, userMarkerRef.current);
                        }, 500);
                      }
                    } else {
                      userMarkerRef.current.setPosition(position);
                      userMarkerRef.current.setMap(map);
                      userMarkerRef.current.setTitle(
                        `Vị trí của tôi (±${accuracy.toFixed(0)}m)`
                      );
                    }

                    // Vẽ vòng tròn độ chính xác (càng lớn càng kém chính xác)
                    if (!accuracyCircleRef.current) {
                      accuracyCircleRef.current = new g.maps.Circle({
                        strokeColor: accuracy > 50 ? "#f59e0b" : "#3B82F6",
                        strokeOpacity: 0.5,
                        strokeWeight: 2,
                        fillColor: accuracy > 50 ? "#fef3c7" : "#93C5FD",
                        fillOpacity: 0.2,
                        map,
                        center: position,
                        radius: Math.max(accuracy || 0, 10), // Min 10m
                        zIndex: 9999,
                      });
                    } else {
                      accuracyCircleRef.current.setCenter(position);
                      accuracyCircleRef.current.setRadius(
                        Math.max(accuracy || 0, 10)
                      );
                      accuracyCircleRef.current.setOptions({
                        strokeColor: accuracy > 50 ? "#f59e0b" : "#3B82F6",
                        fillColor: accuracy > 50 ? "#fef3c7" : "#93C5FD",
                      });
                      accuracyCircleRef.current.setMap(map);
                    }

                    map.panTo(position);
                    // Zoom level tùy theo độ chính xác
                    if (map.getZoom()! < 17) {
                      map.setZoom(accuracy > 50 ? 15 : 17); // Zoom thấp hơn nếu accuracy kém
                    }

                    loadingSpan.style.display = "none";
                    btn.style.opacity = "1";
                    setError(null); // Clear any previous errors
                    locationSuccess = true;
                    isLocating = false;
                  },
                  (err) => {
                    // Only show error if location wasn't successfully obtained
                    if (!locationSuccess) {
                      // Log error safely without triggering Next.js error handler
                      const errorInfo = {
                        code: err?.code,
                        message: err?.message || "Unknown geolocation error",
                        PERMISSION_DENIED: err?.code === 1,
                        POSITION_UNAVAILABLE: err?.code === 2,
                        TIMEOUT: err?.code === 3,
                      };
                      console.warn("[SSBMap] Geolocation error:", JSON.stringify(errorInfo));
                      
                      let errorMsg = "Không thể lấy vị trí hiện tại.";
                      if (err.code === 1) {
                        errorMsg =
                          "Quyền truy cập vị trí bị từ chối. Vui lòng cấp quyền trong cài đặt trình duyệt.";
                      } else if (err.code === 2) {
                        errorMsg =
                          "Không có tín hiệu GPS. Vui lòng kiểm tra kết nối mạng và GPS.";
                      } else if (err.code === 3) {
                        errorMsg = "Hết thời gian chờ GPS. Vui lòng thử lại.";
                      }
                      setError(errorMsg);
                    }
                    loadingSpan.style.display = "none";
                    btn.style.opacity = "1";
                    isLocating = false;
                  },
                  {
                    enableHighAccuracy: true, // Bắt buộc dùng GPS (không dùng WiFi/Cell tower)
                    timeout: 15000, // Tăng lên 15s để GPS có thời gian lock tốt hơn
                    maximumAge: 0, // KHÔNG dùng cache, luôn lấy vị trí mới nhất
                  }
                );
              };

              btn.addEventListener("click", locate);
            } catch (error) {
              console.error("[SSBMap] Failed to add locate button:", error);
            }
          } // End showMyLocation check

          setIsLoading(false);
        })
        .catch((err) => {
          console.error("Failed to load Google Maps:", err);
          setError(err.message || "Failed to load Google Maps");
          setIsLoading(false);
        });
    };

    console.log("[SSBMap] effect mounted");
    init();

    return () => {
      mounted = false;
    };
  }, []);

  // Update map center/zoom
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setCenter(validCenter);
    mapInstanceRef.current.setZoom(zoom);
  }, [validCenter.lat, validCenter.lng, zoom]);

  // Draw polyline - IMPROVED VERSION
  useEffect(() => {
    // Check if we have routes with polylines - if so, don't render single polyline (routes will be rendered separately)
    const hasRoutePolylines = routes && routes.length > 0 && routes.some((r) => r.polyline && r.polyline.trim());
    
    console.log("[SSBMap] Polyline effect triggered:", {
      hasMap: !!mapInstanceRef.current,
      hasPolylinePath: !!polylinePath,
      polylinePathLength: Array.isArray(polylinePath) ? polylinePath.length : 0,
      geometryReady,
      hasRoutePolylines,
    });

    if (!mapInstanceRef.current) {
      console.warn("[SSBMap] Map instance not ready");
      return;
    }

    const g = getGoogle();
    if (!g?.maps?.Polyline) {
      console.warn("[SSBMap] Google Maps Polyline not available yet");
      return;
    }

    // Remove old polyline and directions renderer
    if (polylineInstanceRef.current) {
      polylineInstanceRef.current.setMap(null);
      polylineInstanceRef.current = null;
    }
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
      directionsRendererRef.current = null;
    }

    // If we have routes with polylines, don't render single polyline (routes will be rendered separately)
    if (hasRoutePolylines) {
      console.log("[SSBMap] Routes with polylines detected, skipping single polyline render");
      return;
    }

    // If no polyline path, return early
    if (
      !polylinePath ||
      (Array.isArray(polylinePath) && polylinePath.length === 0)
    ) {
      console.log("[SSBMap] No polyline path to render");
      return;
    }

    try {
      // Convert path to LatLng objects
      let path: google.maps.LatLng[] = [];

      if (Array.isArray(polylinePath) && polylinePath.length > 0) {
        const first = polylinePath[0] as any;

        // Check if first element is already LatLng
        if (first instanceof g.maps.LatLng) {
          // Already LatLng objects
          path = polylinePath as google.maps.LatLng[];
        } else if (
          typeof first.lat === "number" &&
          typeof first.lng === "number"
        ) {
          // It's an array of {lat, lng} objects - convert to LatLng
          path = (
            polylinePath as unknown as Array<{ lat: number; lng: number }>
          ).map((p) => new g.maps.LatLng(p.lat, p.lng));
        } else if (typeof first.lat === "function") {
          // It's already LatLng objects (lat() and lng() are methods)
          path = polylinePath as google.maps.LatLng[];
        } else {
          console.warn("[SSBMap] Unknown polyline path format:", first);
          return;
        }
      } else {
        console.warn("[SSBMap] Invalid polyline path");
        return;
      }

      if (path.length === 0) {
        console.warn("[SSBMap] Empty path after conversion");
        return;
      }

      // Create new polyline with better styling (like Google Maps/Grab)
      const polylineInstance = new g.maps.Polyline({
        path: path,
        geodesic: true,
        strokeColor: "#4285F4", // Google Maps blue
        strokeOpacity: 1.0,
        strokeWeight: 5,
        zIndex: 100,
        icons: [
          {
            icon: {
              path: g.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              scale: 4,
              strokeColor: "#4285F4",
              fillColor: "#4285F4",
              fillOpacity: 1,
            },
            offset: "100%",
            repeat: "100px",
          },
        ],
      });

      polylineInstance.setMap(mapInstanceRef.current);
      polylineInstanceRef.current = polylineInstance;

      console.log("[SSBMap] Polyline rendered successfully (real route):", {
        pathLength: path.length,
        firstPoint: { lat: path[0].lat(), lng: path[0].lng() },
        lastPoint: {
          lat: path[path.length - 1].lat(),
          lng: path[path.length - 1].lng(),
        },
      });

      // Fit bounds to polyline
      if (path.length > 0) {
        const bounds = new g.maps.LatLngBounds();
        path.forEach((latlng) => {
          bounds.extend(latlng);
        });

        // Add padding to bounds
        mapInstanceRef.current.fitBounds(bounds, {
          top: 50,
          right: 50,
          bottom: 50,
          left: 50,
        });
      }
    } catch (error) {
      console.error("[SSBMap] Error rendering polyline:", error);
    }
  }, [polylinePath, routes, disableDirections]); // Add routes to dependencies

  // Render multiple route polylines
  useEffect(() => {

    // Nếu tắt directions: xoá polyline cũ và không vẽ lại
  if (disableDirections) {
    routePolylinesRef.current.forEach((polyline) => {
      polyline.setMap(null);
    });
    routePolylinesRef.current.clear();
    return;
  }


    if (!mapInstanceRef.current || !geometryReady || routes.length === 0) {
      return;
    }

    const g = getGoogle();
    if (!g?.maps?.Polyline || !g?.maps?.geometry?.encoding) {
      return;
    }

    // Remove old route polylines
    routePolylinesRef.current.forEach((polyline) => {
      polyline.setMap(null);
    });
    routePolylinesRef.current.clear();

    // Render each route polyline
    routes.forEach((route) => {
      if (!route.polyline || !route.polyline.trim()) {
        return;
      }

      try {
        const decoded = decodePolyline(route.polyline);
        if (decoded.length === 0) {
          return;
        }

        // Convert to LatLng array
        const path = decoded
          .map((p: any) => {
            if (p instanceof g.maps.LatLng) {
              return p;
            }
            if (typeof p.lat === "number" && typeof p.lng === "number") {
              return new g.maps.LatLng(p.lat, p.lng);
            }
            if (typeof p.lat === "function") {
              return p as google.maps.LatLng;
            }
            return null;
          })
          .filter((p): p is google.maps.LatLng => p !== null);

        if (path.length === 0) {
          return;
        }

        // Create polyline with route color (distinct color for each route)
        const routePolyline = new g.maps.Polyline({
          path: path,
          geodesic: true,
          strokeColor: route.color || "#4285F4",
          strokeOpacity: 0.8, // More visible
          strokeWeight: 5, // Thicker line for better visibility
          zIndex: 50, // Lower than single polyline but visible
          icons: [
            {
              icon: {
                path: g.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                scale: 3,
                strokeColor: route.color || "#4285F4",
                fillColor: route.color || "#4285F4",
                fillOpacity: 1,
              },
              offset: "100%", // Arrow at the end of the line
              repeat: "200px", // Repeat arrow every 200px
            },
          ],
        });

        routePolyline.setMap(mapInstanceRef.current);
        routePolylinesRef.current.set(route.routeId, routePolyline);

        console.log(
          `[SSBMap] Rendered route polyline: ${route.routeName} (${route.routeId})`,
          {
            color: route.color,
            pathLength: path.length,
          }
        );
      } catch (error) {
        console.error(
          `[SSBMap] Error rendering route polyline ${route.routeId}:`,
          error
        );
      }
    });

    // Fit bounds to all routes if needed
    if (autoFitOnUpdate && routes.length > 0) {
      const bounds = new g.maps.LatLngBounds();
      routes.forEach((route) => {
        if (route.polyline) {
          try {
            const decoded = decodePolyline(route.polyline);
            decoded.forEach((p: any) => {
              if (p instanceof g.maps.LatLng) {
                bounds.extend(p);
              } else if (
                typeof p.lat === "number" &&
                typeof p.lng === "number"
              ) {
                bounds.extend(new g.maps.LatLng(p.lat, p.lng));
              }
            });
          } catch (e) {
            // Ignore errors
          }
        }
      });

      if (!bounds.isEmpty()) {
        mapInstanceRef.current?.fitBounds(bounds, {
          top: 50,
          right: 50,
          bottom: 50,
          left: 50,
        });
      }
    }
  }, [routes, geometryReady, autoFitOnUpdate, decodePolyline, disableDirections]);

  // Render stop markers
  useEffect(() => {
    console.log("[SSBMap] Stops effect triggered:", {
      hasMap: !!mapInstanceRef.current,
      isMapReady,
      stopsCount: stops.length,
    });

    if (!mapInstanceRef.current || !isMapReady) {
      console.warn("[SSBMap] Map instance not ready for stops, will retry when map is ready");
      return;
    }

    if (stops.length === 0) {
      // Remove stop markers
      markersRef.current.forEach((marker, key) => {
        if (key.startsWith("stop-")) {
          marker.setMap(null);
          markersRef.current.delete(key);
        }
      });
      console.log("[SSBMap] No stops to render, removed all stop markers");
      return;
    }

    const g = getGoogle();
    if (!g?.maps?.Marker) {
      console.warn("[SSBMap] Google Maps Marker not available yet");
      return;
    }

    // Sort stops by sequence
    const sortedStops = [...stops].sort(
      (a, b) => (a.sequence || 0) - (b.sequence || 0)
    );
    console.log("[SSBMap] Rendering", sortedStops.length, "stops");

    let validStopsCount = 0;
    sortedStops.forEach((stop, index) => {
      const lat = Number(stop.viDo);
      const lng = Number(stop.kinhDo);

      if (
        !stop.viDo ||
        !stop.kinhDo ||
        isNaN(lat) ||
        isNaN(lng) ||
        !isFinite(lat) ||
        !isFinite(lng)
      ) {
        console.warn("[SSBMap] Invalid stop coordinates, skipping:", {
          index,
          stop: {
            maDiem: stop.maDiem,
            tenDiem: stop.tenDiem,
            viDo: stop.viDo,
            kinhDo: stop.kinhDo,
          },
        });
        return;
      }

      validStopsCount++;

      const key = `stop-${stop.maDiem}`;
      let marker = markersRef.current.get(key);

      if (!marker) {
        // ---- TẠO MÀU THEO TUYẾN (ĐẶT Ở ĐÂY – TRƯỚC KHI TẠO MARKER) ----
        const COLORS = ["#EF4444", "#3B82F6", "#10B981", "#F97316", "#8B5CF6"];

        const routeColor =
          typeof stop.routeIndex === "number"
            ? COLORS[stop.routeIndex % COLORS.length]
            : "#EF4444"; // màu mặc định cho file khác

        // ---- TẠO MARKER ----
        marker = new g.maps.Marker({
          position: { lat, lng },
          map: mapInstanceRef.current,

          icon: {
            path: g.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: routeColor,     // <<--- DÙNG Ở ĐÂY
            fillOpacity: 1,
            strokeColor: "#FFFFFF",
            strokeWeight: 2,
          },

          label: {
            text: String(stop.sequence || ""),
            color: "#FFFFFF",
            fontSize: "12px",
            fontWeight: "bold",
          },
          title: `${stop.sequence}. ${stop.tenDiem}`,
        });

        if (onStopClick) {
          marker.addListener("click", () => onStopClick(stop));
        }

        const infoWindow = new g.maps.InfoWindow({
          content: `
            <div style="padding: 8px; min-width: 200px;">
              <h3 style="margin: 0 0 4px 0; font-size: 14px; font-weight: bold;">
                ${stop.sequence}. ${stop.tenDiem}
              </h3>
              ${stop.address ? `<p style="margin: 0; font-size: 12px; color: #666;">${stop.address}</p>` : ""}
              ${stop.dwell_seconds ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: #666;">Dừng: ${stop.dwell_seconds}s</p>` : ""}
            </div>
          `,
        });

        marker.addListener("click", () => {
          infoWindow.open(mapInstanceRef.current!, marker);
        });

        markersRef.current.set(key, marker);
      }
 else {
        // Update existing marker position
        const lat = Number(stop.viDo);
        const lng = Number(stop.kinhDo);
        if (!isNaN(lat) && !isNaN(lng) && isFinite(lat) && isFinite(lng)) {
          marker.setPosition({ lat, lng });
        }
        marker.setTitle(`${stop.sequence}. ${stop.tenDiem}`);
      }
    });

    // Remove markers that are no longer in stops
    markersRef.current.forEach((marker, key) => {
      if (key.startsWith("stop-")) {
        const stopId = parseInt(key.replace("stop-", ""));
        if (!stops.find((s) => s.maDiem === stopId)) {
          marker.setMap(null);
          markersRef.current.delete(key);
        }
      }
    });

    // Fit bounds to all stops if autoFitOnUpdate is enabled
    if (autoFitOnUpdate && validStopsCount > 0) {
      const bounds = new g.maps.LatLngBounds();
      sortedStops.forEach((stop) => {
        const lat = Number(stop.viDo);
        const lng = Number(stop.kinhDo);
        if (!isNaN(lat) && !isNaN(lng) && isFinite(lat) && isFinite(lng)) {
          bounds.extend({ lat, lng });
        }
      });

      if (!bounds.isEmpty()) {
        mapInstanceRef.current.fitBounds(bounds, {
          top: 50,
          right: 50,
          bottom: 50,
          left: 50,
        });
        console.log("[SSBMap] Fitted bounds to stops");
      }
    }

    console.log(
      "[SSBMap] Finished rendering stops, total valid:",
      validStopsCount
    );
  }, [stops, onStopClick, autoFitOnUpdate, isMapReady]);

  // Render bus markers
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const g = getGoogle();

    buses.forEach((bus) => {
      const lat = Number(bus.lat);
      const lng = Number(bus.lng);

      if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) {
        console.warn("[SSBMap] Invalid bus coordinates, skipping:", bus);
        return;
      }

      const key = `bus-${bus.id}`;
      let marker = markersRef.current.get(key);

      // Status colors mapping
      const statusColors: Record<string, string> = {
        running: "#22c55e", // green-500 (đang chạy)
        idle: "#6b7280", // gray-500 (đứng yên) - FIXED: was black, now gray
        late: "#eab308", // yellow-500 (trễ)
        incident: "#ef4444", // red-500 (sự cố)
      };

      const busStatus = bus.status || "idle"
      const statusColor = statusColors[busStatus] || "#6b7280"
      const rotation = typeof bus.heading === "number" ? bus.heading : 0

      if (!marker) {
        // Create new bus marker with status-based color
        marker = new g.maps.Marker({
          position: { lat, lng },
          map: mapInstanceRef.current,
          icon: {
            path: g.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 7, // Slightly larger for better visibility
            fillColor: statusColor,
            fillOpacity: 1,
            strokeColor: "#FFFFFF",
            strokeWeight: 2.5,
            rotation: rotation,
          },
          title: bus.label || bus.id,
          zIndex: busStatus === "incident" ? 1000 : busStatus === "late" ? 500 : 100, // Higher z-index for alerts
        });

        if (onBusClick) {
          marker.addListener("click", () => onBusClick(bus));
        }

        markersRef.current.set(key, marker);
      } else {
        // Update existing marker position, rotation, and color
        const lat = Number(bus.lat);
        const lng = Number(bus.lng);
        if (!isNaN(lat) && !isNaN(lng) && isFinite(lat) && isFinite(lng)) {
          marker.setPosition({ lat, lng });

          // Update icon with new status color and rotation
          const icon = marker.getIcon() as google.maps.Symbol;
          if (icon) {
            icon.fillColor = statusColor;
            icon.rotation = rotation;
            marker.setIcon(icon);
            marker.setZIndex(busStatus === "incident" ? 1000 : busStatus === "late" ? 500 : 100);
          }
        }
      }
    });

    // Remove bus markers that are no longer in buses
    markersRef.current.forEach((marker, key) => {
      if (key.startsWith("bus-")) {
        const busId = key.replace("bus-", "");
        if (!buses.find((b) => b.id === busId)) {
          marker.setMap(null);
          markersRef.current.delete(key);
        }
      }
    });

    // Auto fit bounds or follow first marker
    if (mapInstanceRef.current) {
      const g = getGoogle();
      const allPoints: google.maps.LatLng[] = [];

      buses.forEach((bus) => {
        const lat = Number(bus.lat);
        const lng = Number(bus.lng);
        if (!isNaN(lat) && !isNaN(lng) && isFinite(lat) && isFinite(lng)) {
          allPoints.push(new g.maps.LatLng(lat, lng));
        }
      });
      stops.forEach((stop) => {
        const lat = Number(stop.viDo);
        const lng = Number(stop.kinhDo);
        if (!isNaN(lat) && !isNaN(lng) && isFinite(lat) && isFinite(lng)) {
          allPoints.push(new g.maps.LatLng(lat, lng));
        }
      });

      if (allPoints.length > 0) {
        if (autoFitOnUpdate && allPoints.length > 1) {
          const bounds = new g.maps.LatLngBounds();
          allPoints.forEach((p) => bounds.extend(p));
          mapInstanceRef.current.fitBounds(bounds, 50);
        } else if (followFirstMarker && buses.length > 0) {
          const firstBusLat = Number(buses[0].lat);
          const firstBusLng = Number(buses[0].lng);
          if (
            !isNaN(firstBusLat) &&
            !isNaN(firstBusLng) &&
            isFinite(firstBusLat) &&
            isFinite(firstBusLng)
          ) {
            mapInstanceRef.current.panTo({
              lat: firstBusLat,
              lng: firstBusLng,
            });
            // Auto-zoom when following bus (use zoom prop if provided, otherwise use default)
            if (zoom && zoom > 0) {
              mapInstanceRef.current.setZoom(zoom);
            }
          }
        }
      }
    }
  }, [buses, onBusClick, autoFitOnUpdate, followFirstMarker]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (polylineInstanceRef.current) {
        polylineInstanceRef.current.setMap(null);
      }
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
      }
      if (userMarkerRef.current) {
        userMarkerRef.current.setMap(null);
      }
      if (accuracyCircleRef.current) {
        accuracyCircleRef.current.setMap(null);
      }
      markersRef.current.forEach((marker) => {
        marker.setMap(null);
      });
      markersRef.current.clear();
      setIsMapReady(false); // Reset map ready state
    };
  }, []);

  return (
    <div
      className={`relative rounded-md overflow-hidden ${className}`}
      style={{ height, width: "100%" }}
    >
      <div ref={mapRef} style={{ height: "100%", width: "100%" }} />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/60">
          <p className="text-muted-foreground">Đang tải bản đồ...</p>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/60">
          <p className="text-destructive">{error}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Memoize SSBMap to avoid unnecessary re-renders
 */
export default React.memo(SSBMap, (prevProps, nextProps) => {
  // Check polyline
  if (prevProps.polyline !== nextProps.polyline) {
    return false;
  }

  // Check stops array length
  if (prevProps.stops?.length !== nextProps.stops?.length) {
    return false;
  }

  // Check buses array length
  if (prevProps.buses?.length !== nextProps.buses?.length) {
    return false;
  }

  // Check first bus position (for animation)
  const prevFirstBus = prevProps.buses?.[0];
  const nextFirstBus = nextProps.buses?.[0];
  if (prevFirstBus && nextFirstBus) {
    if (
      prevFirstBus.lat !== nextFirstBus.lat ||
      prevFirstBus.lng !== nextFirstBus.lng
    ) {
      return false;
    }
  }

  // Check other critical props
  if (
    prevProps.center?.lat !== nextProps.center?.lat ||
    prevProps.center?.lng !== nextProps.center?.lng
  ) {
    return false;
  }
  if (prevProps.zoom !== nextProps.zoom) {
    return false;
  }
  if (prevProps.height !== nextProps.height) {
    return false;
  }

  return true;
});
