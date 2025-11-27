import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { getCacheProvider, generateCacheKey } from "../core/cacheProvider.js";

// Use native fetch (available in Node.js 18+)
const fetch = globalThis.fetch;

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the same location as env.ts
// This ensures we load from ssb-backend/.env (not root .env)
dotenv.config({ path: path.join(__dirname, "../../.env") });

// Also try loading from root .env as fallback (for cases where .env is at project root)
const rootEnvPath = path.join(__dirname, "../../../.env");
try {
  dotenv.config({ path: rootEnvPath, override: false }); // override: false means don't overwrite existing vars
} catch (err) {
  // Ignore if root .env doesn't exist
}

const MAPS_API_KEY = process.env.MAPS_API_KEY;
const MAPS_API_BASE_URL = "https://maps.googleapis.com/maps/api";

// Debug logging to verify API key is loaded
if (!MAPS_API_KEY) {
  console.warn("[MapsService] ⚠️ MAPS_API_KEY is undefined!");
  console.warn("[MapsService] Current working directory:", process.cwd());
  console.warn(
    "[MapsService] Looking for .env at:",
    path.join(__dirname, "../../.env")
  );
  console.warn("[MapsService] Also checked:", rootEnvPath);
  console.warn(
    "[MapsService] All env vars with 'MAPS':",
    Object.keys(process.env)
      .filter((k) => k.includes("MAPS"))
      .map((k) => `${k}=${process.env[k] ? "***" : "undefined"}`)
  );
} else {
  const maskedKey =
    MAPS_API_KEY.length > 8
      ? `${MAPS_API_KEY.substring(0, 4)}...${MAPS_API_KEY.substring(
          MAPS_API_KEY.length - 4
        )}`
      : "***";
  console.log(`[MapsService] ✅ MAPS_API_KEY loaded: ${maskedKey}`);
}

// Cache TTL (seconds) - from environment or defaults
const CACHE_TTL = {
  DIRECTIONS: parseInt(process.env.CACHE_TTL_DIRECTIONS || "21600"), // 6 hours
  DISTANCE_MATRIX: parseInt(process.env.CACHE_TTL_DISTANCE_MATRIX || "120"), // 2 minutes
  GEOCODE: parseInt(process.env.CACHE_TTL_GEOCODE || "86400"), // 24 hours
  ROADS_SNAP: parseInt(process.env.CACHE_TTL_ROADS || "900"), // 15 minutes
};

/**
 * MapsService - Service để gọi Google Maps API với caching
 */
class MapsService {
  /**
   * Get cache provider instance
   */
  static async _getCache() {
    return await getCacheProvider();
  }

  /**
   * Get Directions (Directions API)
   * @param {Object} params - {origin, destination, waypoints[], mode, alternatives, avoid, language, units}
   * @returns {Promise<Object>} {polyline, legs, distance, duration, cached}
   */
  static async getDirections(params) {
    if (!MAPS_API_KEY) {
      console.error("[MapsService] MAPS_API_KEY not configured");
      throw new Error("MAPS_API_KEY not configured");
    }

    const {
      origin,
      destination,
      waypoints = [],
      mode = "driving", // "driving" là mode phù hợp nhất cho xe buýt (xe lớn)
      alternatives = false,
      avoid = [], // Có thể thêm "ferries" để tránh phà
      language = "vi",
      units = "metric",
      optimize = false, // Tối ưu thứ tự waypoints
      vehicleType = "bus", // Loại xe: "bus", "car", "motorcycle" - để tối ưu routing
    } = params;

    // Validate required params
    if (!origin || !destination) {
      throw new Error("Origin and destination are required");
    }

    // Ensure waypoints is an array and filter out invalid entries
    const validWaypoints = (Array.isArray(waypoints) ? waypoints : []).filter(
      (w) => {
        if (typeof w === "string") return w.trim() !== "";
        if (w && typeof w === "object" && w.location)
          return w.location.trim() !== "";
        return false;
      }
    );

    // Đối với xe buýt, tránh phà và đường hẹp không phù hợp
    // Google Maps Directions API không có option riêng cho xe buýt,
    // nhưng mode "driving" sẽ tự động chọn đường phù hợp với xe lớn
    const avoidList = Array.isArray(avoid) ? [...avoid] : [];
    if (vehicleType === "bus" && !avoidList.includes("ferries")) {
      avoidList.push("ferries"); // Tránh phà (xe buýt thường không đi phà)
    }

    // Generate cache key (bao gồm optimize và vehicleType để cache riêng biệt)
    const cacheKey = generateCacheKey("dir", {
      origin,
      destination,
      waypoints: validWaypoints
        .map((w) => (typeof w === "string" ? w : w.location))
        .sort(),
      mode,
      alternatives,
      avoid: avoidList.sort(), // Dùng avoidList đã được xử lý
      optimize, // Thêm optimize vào cache key
      vehicleType, // Thêm vehicleType vào cache key
    });

    // Check cache
    const cache = await this._getCache();
    const cached = await cache.get(cacheKey);
    if (cached) {
      console.log("[MapsService] Using cached directions result");
      return { ...cached, cached: true };
    }

    // Build URL
    // Nếu optimize=true, thêm optimize:waypoints vào waypointsStr
    const waypointsStr =
      validWaypoints.length > 0
        ? `&waypoints=${optimize ? "optimize:true|" : ""}${validWaypoints
            .map((w) => (typeof w === "string" ? w : (w.location || w)))
            .join("|")}`
        : "";
    const avoidStr = avoidList.length > 0 ? `&avoid=${avoidList.join("|")}` : "";
    const alternativesStr = alternatives ? "&alternatives=true" : "";

    const url = `${MAPS_API_BASE_URL}/directions/json?origin=${encodeURIComponent(
      origin
    )}&destination=${encodeURIComponent(
      destination
    )}${waypointsStr}&mode=${mode}${avoidStr}${alternativesStr}&language=${language}&units=${units}&key=${MAPS_API_KEY}`;

      console.log("[MapsService] Calling Directions API:", {
        origin,
        destination,
        waypointsCount: validWaypoints.length,
        mode,
        vehicleType,
        avoid: avoidList,
      });

    try {
      // Add timeout to fetch (30 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      let response;
      try {
        response = await fetch(url, {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
          },
        });
        clearTimeout(timeoutId);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === "AbortError") {
          throw new Error("Maps API request timeout (30s)");
        }
        throw fetchError;
      }

      if (!response.ok) {
        throw new Error(
          `Maps API HTTP error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      console.log("[MapsService] Directions API response:", {
        status: data.status,
        routesCount: data.routes?.length || 0,
        hasPolyline: !!data.routes?.[0]?.overview_polyline?.points,
      });

      if (data.status !== "OK") {
        const errorMsg = data.error_message || "Unknown error";
        console.error("[MapsService] Maps API error:", {
          status: data.status,
          message: errorMsg,
        });

        // Handle ZERO_RESULTS gracefully (no route found)
        if (data.status === "ZERO_RESULTS") {
          console.warn(
            "[MapsService] ZERO_RESULTS - No route found between origin and destination"
          );
          console.warn("[MapsService] This may happen if:");
          console.warn(
            "[MapsService]   - Coordinates are invalid or out of range"
          );
          console.warn(
            "[MapsService]   - No route exists (e.g., across water without bridge)"
          );
          console.warn("[MapsService]   - Waypoints are too far apart");
          throw new Error(
            `Maps API error: ZERO_RESULTS - No route found between points. ${errorMsg}`
          );
        }

        // Provide helpful error message for REQUEST_DENIED
        if (data.status === "REQUEST_DENIED") {
          if (
            errorMsg.includes("legacy API") ||
            errorMsg.includes("not enabled")
          ) {
            console.error(
              "[MapsService] ⚠️ Directions API (Legacy) chưa được enable!"
            );
            console.error(
              "[MapsService] 💡 Hãy enable Directions API trong Google Cloud Console:"
            );
            console.error(
              "[MapsService]   1. Vào: https://console.cloud.google.com/apis/library"
            );
            console.error(
              "[MapsService]   2. Tìm 'Directions API' (không phải Routes API)"
            );
            console.error("[MapsService]   3. Click ENABLE");
            console.error("[MapsService]   4. Đợi 1-2 phút và restart backend");
            throw new Error(
              `Directions API (Legacy) chưa được enable. Vui lòng enable trong Google Cloud Console. Chi tiết: ${errorMsg}`
            );
          }
        }

        throw new Error(`Maps API error: ${data.status} - ${errorMsg}`);
      }

      // Extract polyline from first route
      if (!data.routes || data.routes.length === 0) {
        throw new Error("Maps API returned no routes");
      }

      const route = data.routes[0];
      const polyline = route.overview_polyline?.points || null;

      if (!polyline) {
        console.warn("[MapsService] No polyline in route response");
        throw new Error("Maps API returned route without polyline");
      }

      // Extract legs (distance, duration for each segment)
      const legs =
        route.legs?.map((leg) => ({
          distance: leg.distance?.value || 0, // meters
          duration: leg.duration?.value || 0, // seconds
          start_address: leg.start_address,
          end_address: leg.end_address,
          start_location: leg.start_location,
          end_location: leg.end_location,
          steps:
            leg.steps?.map((step) => ({
              distance: step.distance?.value || 0,
              duration: step.duration?.value || 0,
              polyline: step.polyline?.points || null,
              html_instructions: step.html_instructions,
            })) || [],
        })) || [];

      // Total distance and duration
      const distance = legs.reduce((sum, leg) => sum + leg.distance, 0);
      const duration = legs.reduce((sum, leg) => sum + leg.duration, 0);

      const result = {
        polyline,
        legs,
        distance,
        duration,
        waypoint_order: route.waypoint_order || null, // Thứ tự waypoints đã được optimize
        cached: false,
      };

      console.log("[MapsService] Directions result:", {
        polylineLength: polyline.length,
        legsCount: legs.length,
        distance,
        duration,
      });

      // Cache result
      await cache.set(cacheKey, result, CACHE_TTL.DIRECTIONS);

      return result;
    } catch (error) {
      console.error("[MapsService] Directions API error:", {
        message: error.message,
        stack: error.stack,
        origin,
        destination,
        waypointsCount: waypoints.length,
      });
      throw error;
    }
  }

  /**
   * Get Distance Matrix (Distance Matrix API)
   * @param {Object} params - {origins[], destinations[], mode, avoid, language, units, departure_time, traffic_model}
   * @returns {Promise<Object>} {rows, cached}
   */
  static async getDistanceMatrix(params) {
    if (!MAPS_API_KEY) {
      throw new Error("MAPS_API_KEY not configured");
    }

    const {
      origins = [],
      destinations = [],
      mode = "driving",
      avoid = [],
      language = "vi",
      units = "metric",
      departure_time = null,
      traffic_model = null,
    } = params;

    if (origins.length === 0 || destinations.length === 0) {
      throw new Error("Origins and destinations are required");
    }

    // Generate cache key
    const cacheKey = generateCacheKey("mx", {
      origins: origins.sort(),
      destinations: destinations.sort(),
      mode,
      avoid,
      departure_time,
      traffic_model,
    });

    // Check cache
    const cache = await this._getCache();
    const cached = await cache.get(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    // Build URL
    const originsStr = origins
      .map((o) => (typeof o === "string" ? o : `${o.lat},${o.lng}`))
      .join("|");
    const destinationsStr = destinations
      .map((d) => (typeof d === "string" ? d : `${d.lat},${d.lng}`))
      .join("|");
    const avoidStr = avoid.length > 0 ? `&avoid=${avoid.join("|")}` : "";
    const departureTimeStr = departure_time
      ? `&departure_time=${departure_time}`
      : "";
    const trafficModelStr = traffic_model
      ? `&traffic_model=${traffic_model}`
      : "";

    const url = `${MAPS_API_BASE_URL}/distancematrix/json?origins=${encodeURIComponent(
      originsStr
    )}&destinations=${encodeURIComponent(
      destinationsStr
    )}&mode=${mode}${avoidStr}${departureTimeStr}${trafficModelStr}&language=${language}&units=${units}&key=${MAPS_API_KEY}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== "OK") {
        throw new Error(
          `Maps API error: ${data.status} - ${
            data.error_message || "Unknown error"
          }`
        );
      }

      // Transform response
      const rows = data.rows.map((row) =>
        row.elements.map((element) => ({
          distance: element.distance?.value || null, // meters
          duration: element.duration?.value || null, // seconds
          status: element.status,
        }))
      );

      const result = {
        rows,
        origin_addresses: data.origin_addresses,
        destination_addresses: data.destination_addresses,
        cached: false,
      };

      // Cache result
      await cache.set(cacheKey, result, CACHE_TTL.DISTANCE_MATRIX);

      return result;
    } catch (error) {
      console.error("Maps Distance Matrix API error:", error);
      throw error;
    }
  }

  /**
   * Geocode (Geocoding API)
   * @param {Object} params - {address} or {latlng}
   * @returns {Promise<Object>} {results, cached}
   */
  static async geocode(params) {
    if (!MAPS_API_KEY) {
      throw new Error("MAPS_API_KEY not configured");
    }

    const { address, latlng, language = "vi" } = params;

    if (!address && !latlng) {
      throw new Error("Address or latlng is required");
    }

    // Generate cache key
    const cacheKey = generateCacheKey("geo", { address, latlng, language });

    // Check cache
    const cache = await this._getCache();
    const cached = await cache.get(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    // Build URL
    const query = address
      ? `address=${encodeURIComponent(address)}`
      : `latlng=${encodeURIComponent(latlng)}`;
    const url = `${MAPS_API_BASE_URL}/geocode/json?${query}&language=${language}&key=${MAPS_API_KEY}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== "OK") {
        throw new Error(
          `Maps API error: ${data.status} - ${
            data.error_message || "Unknown error"
          }`
        );
      }

      // Transform response
      const results = data.results.map((result) => ({
        formatted_address: result.formatted_address,
        geometry: {
          location: result.geometry.location,
          location_type: result.geometry.location_type,
          viewport: result.geometry.viewport,
          bounds: result.geometry.bounds,
        },
        place_id: result.place_id,
        types: result.types,
      }));

      const result = {
        results,
        cached: false,
      };

      // Cache result
      await cache.set(cacheKey, result, CACHE_TTL.GEOCODE);

      return result;
    } catch (error) {
      console.error("Maps Geocode API error:", error);
      throw error;
    }
  }

  /**
   * Reverse Geocode (alias for geocode with latlng)
   */
  static async reverseGeocode(latlng, language = "vi") {
    return this.geocode({ latlng, language });
  }

  /**
   * Snap to Roads (Roads API)
   * @param {Object} params - {path[], interpolate}
   * @returns {Promise<Object>} {snappedPolyline, cached}
   */
  static async snapToRoads(params) {
    if (!MAPS_API_KEY) {
      throw new Error("MAPS_API_KEY not configured");
    }

    const { path = [], interpolate = true } = params;

    if (path.length === 0) {
      throw new Error("Path is required");
    }

    // Generate cache key
    const cacheKey = generateCacheKey("rd", {
      path: path.map((p) => `${p.lat},${p.lng}`).join("|"),
      interpolate,
    });

    // Check cache
    const cache = await this._getCache();
    const cached = await cache.get(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    // Build URL
    const pathStr = path.map((p) => `${p.lat},${p.lng}`).join("|");
    const interpolateStr = interpolate ? "&interpolate=true" : "";
    const url = `${MAPS_API_BASE_URL}/roads/snapToRoads?path=${encodeURIComponent(
      pathStr
    )}${interpolateStr}&key=${MAPS_API_KEY}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.error) {
        throw new Error(
          `Maps API error: ${data.error.message || "Unknown error"}`
        );
      }

      // Extract snapped polyline
      const snappedPoints = data.snappedPoints || [];
      const snappedPolyline = snappedPoints.map((point) => ({
        location: point.location,
        originalIndex: point.originalIndex,
        placeId: point.placeId,
      }));

      const result = {
        snappedPolyline,
        cached: false,
      };

      // Cache result
      await cache.set(cacheKey, result, CACHE_TTL.ROADS_SNAP);

      return result;
    } catch (error) {
      console.error("Maps Roads API error:", error);
      throw error;
    }
  }
}

export default MapsService;
