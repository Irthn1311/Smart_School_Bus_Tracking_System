/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🚌 GPS SIMULATOR - Giả lập GPS của xe bus cho dev/testing
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 🎯 MỤC ĐÍCH:
 * - Giả lập xe bus chạy theo route với polyline thực tế
 * - Test realtime tracking mà không cần xe thật
 * - Demo cho khách hàng/stakeholders
 * - QA testing cho approach_stop, delay_alert events
 *
 * 🚀 CÁCH DÙNG:
 * ```bash
 * # Default: Trip ID 16, speed 40 km/h, interval 3s
 * node scripts/gps_simulator.js
 *
 * # Custom trip ID
 * node scripts/gps_simulator.js --tripId=22
 *
 * # Custom speed (km/h)
 * node scripts/gps_simulator.js --speed=60
 *
 * # Custom interval (seconds)
 * node scripts/gps_simulator.js --interval=5
 *
 * # All custom
 * node scripts/gps_simulator.js --tripId=16 --speed=40 --interval=3
 * ```
 *
 * 📊 EVENTS ĐƯỢC TEST:
 * - ✅ bus_position_update (mỗi 3s)
 * - ✅ approach_stop (khi gần stop ≤60m)
 * - ✅ delay_alert (nếu xe chậm ≥5 phút)
 * - ✅ trip_started (khi bắt đầu simulator)
 * - ✅ trip_completed (khi xe đến điểm cuối)
 *
 * @author Nguyễn Tuấn Tài - P1 Enhancement
 * @date 2025-11-13
 */

import { io } from "socket.io-client";
import polyline from "@mapbox/polyline";
import fetch from "node-fetch";

// ═══════════════════════════════════════════════════════════════════════════

// 🔧 CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:4000";
const WS_URL = process.env.WS_URL || "http://localhost:4000";

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.split("=");
  if (key.startsWith("--")) {
    acc[key.slice(2)] = value;
  }
  return acc;
}, {});

const CONFIG = {
  tripId: parseInt(args.tripId) || 16, // Trip ID to simulate
  speed: parseFloat(args.speed) || 60, // km/h (mặc định 60, có thể tăng lên 400)
  interval: parseFloat(args.interval) || 3, // seconds between GPS updates
  username: args.username || process.env.DRIVER_EMAIL || "driver@ssb.vn", // Driver username
  password: args.password || process.env.DRIVER_PASSWORD || "driver123", // Driver password
};

console.log("🚌 GPS SIMULATOR CONFIGURATION:");
console.log(`   Trip ID: ${CONFIG.tripId}`);
console.log(`   Speed: ${CONFIG.speed} km/h`);
console.log(`   Update Interval: ${CONFIG.interval}s`);
console.log(`   Driver: ${CONFIG.username}`);
console.log(`   Password: ${CONFIG.password ? "***" : "NOT SET"}`);
console.log("");
console.log("💡 Tip: Bạn có thể override credentials:");
console.log(`   npm run ws:demo -- --tripId=24 --username=your@email.com --password=yourpass`);
console.log("");

// ═══════════════════════════════════════════════════════════════════════════
// 🔑 AUTHENTICATION
// ═══════════════════════════════════════════════════════════════════════════

async function login() {
  console.log("🔐 Logging in...");

  const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: CONFIG.username,
      matKhau: CONFIG.password,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    console.error(`❌ Login failed with status ${response.status}`);
    console.error(`   Email: ${CONFIG.username}`);
    console.error(`   Error: ${error.message || response.statusText}`);
    console.error("");
    console.error("💡 Có thể thử:");
    console.error(`   1. Kiểm tra email/password trong database`);
    console.error(`   2. Override credentials: --username=your@email.com --password=yourpass`);
    console.error(`   3. Hoặc set env vars: DRIVER_EMAIL=your@email.com DRIVER_PASSWORD=yourpass`);
    throw new Error(`Login failed: ${error.message || response.statusText}`);
  }

  const data = await response.json();
  console.log("✅ Login successful");
  console.log("   Full login response:", JSON.stringify(data, null, 2));
  if (!data.data || !data.data.token) {
    throw new Error(
      "Login response missing token! Please check backend API response."
    );
  }
  console.log(`   User: ${data.data.user.hoTen} (${data.data.user.email})`);
  console.log(`   Role: ${data.data.user.vaiTro}`);
  console.log("");
  return data.data.token;
}

// ═══════════════════════════════════════════════════════════════════════════
// 📍 FETCH ROUTE DATA
// ═══════════════════════════════════════════════════════════════════════════

async function fetchTripData(token, tripId) {
  console.log(`📡 Fetching trip ${tripId} data...`);
  console.log(`   URL: ${API_BASE_URL}/api/v1/trips/${tripId}`);
  if (!token) {
    console.error(
      "❌ Token is undefined! Login may have failed or accessToken is missing."
    );
    throw new Error(
      "Token is undefined! Please check login credentials and backend response."
    );
  }
  console.log(
    `   Token: ${
      typeof token === "string"
        ? token.substring(0, 20) + "..."
        : "[invalid token]"
    }`
  );
  console.log("   Token đầy đủ:", token);

  const response = await fetch(`${API_BASE_URL}/api/v1/trips/${tripId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  console.log(`   Response status: ${response.status}`);

  if (!response.ok) {
    const error = await response.json();
    console.log(`   Error response:`, error);
    throw new Error(
      `Fetch trip failed: ${error.message || response.statusText}`
    );
  }

  const data = await response.json();
  const trip = data.data;

  console.log("✅ Trip data fetched");
  console.log(`   Trip: ${trip.maChuyen}`);
  console.log(`   Route: ${trip.tenTuyen} (${trip.maTuyen})`);
  console.log(`   Bus: ${trip.bienSoXe} (${trip.maXe})`);
  console.log(`   Status: ${trip.trangThai}`);
  console.log("");

  return trip;
}

async function fetchRoutePolyline(token, routeId) {
  console.log(`📍 Fetching route ${routeId} polyline...`);

  const response = await fetch(`${API_BASE_URL}/api/v1/routes/${routeId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Fetch route failed: ${error.message || response.statusText}`
    );
  }

  const data = await response.json();
  const route = data.data;

  if (!route.polyline) {
    throw new Error("Route has no polyline. Please rebuild polyline first.");
  }

  console.log("✅ Route polyline fetched");
  console.log(`   Polyline length: ${route.polyline.length} chars`);
  console.log("");

  return route.polyline;
}

async function fetchRouteStops(token, routeId) {
  console.log(`🚏 Fetching route ${routeId} stops...`);

  const response = await fetch(
    `${API_BASE_URL}/api/v1/routes/${routeId}/stops`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Fetch stops failed: ${error.message || response.statusText}`
    );
  }

  const data = await response.json();
  const stops = data.data;

  console.log("✅ Route stops fetched");
  console.log(`   Total stops: ${stops.length}`);
  stops.forEach((stop, i) => {
    console.log(`   ${i + 1}. ${stop.tenDiem} (${stop.viDo}, ${stop.kinhDo})`);
  });
  console.log("");

  return stops;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🗺️ POLYLINE PROCESSING
// ═══════════════════════════════════════════════════════════════════════════

function decodePolyline(encoded) {
  console.log("🗺️  Decoding polyline...");

  try {
    const decoded = polyline.decode(encoded);
    console.log(`✅ Decoded ${decoded.length} points`);
    console.log(`   First point: [${decoded[0][0]}, ${decoded[0][1]}]`);
    console.log(
      `   Last point: [${decoded[decoded.length - 1][0]}, ${
        decoded[decoded.length - 1][1]
      }]`
    );
    console.log("");
    return decoded.map(([lat, lng]) => ({ lat, lng }));
  } catch (error) {
    console.error("❌ Failed to decode polyline:", error.message);
    throw error;
  }
}

function interpolatePoints(points, targetSpeed, intervalSeconds) {
  console.log("🔄 Interpolating points for smooth movement...");

  // Calculate distance per interval (meters)
  // speed (km/h) → m/s = speed * 1000 / 3600
  // distance = speed (m/s) × time (s)
  const speedMps = (targetSpeed * 1000) / 3600;
  const distancePerInterval = speedMps * intervalSeconds;

  console.log(`   Speed: ${targetSpeed} km/h = ${speedMps.toFixed(2)} m/s`);
  console.log(`   Interval: ${intervalSeconds}s`);
  console.log(`   Distance per update: ${distancePerInterval.toFixed(0)}m`);

  const interpolated = [];

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];

    // Calculate distance between p1 and p2 (Haversine)
    const distance = haversine(p1.lat, p1.lng, p2.lat, p2.lng);

    // Calculate number of interpolation steps
    const steps = Math.max(1, Math.ceil(distance / distancePerInterval));

    // Interpolate
    for (let j = 0; j < steps; j++) {
      const ratio = j / steps;
      const lat = p1.lat + (p2.lat - p1.lat) * ratio;
      const lng = p1.lng + (p2.lng - p1.lng) * ratio;

      // Calculate heading (bearing) from p1 to p2
      const heading = calculateBearing(p1.lat, p1.lng, p2.lat, p2.lng);

      interpolated.push({ lat, lng, speed: targetSpeed, heading });
    }
  }

  // Add last point
  const last = points[points.length - 1];
  interpolated.push({ ...last, speed: 0, heading: 0 }); // Stop at last point

  console.log(`✅ Interpolated to ${interpolated.length} points`);
  console.log("");

  return interpolated;
}

// Haversine distance (meters)
function haversine(lat1, lng1, lat2, lng2) {
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
}

// Calculate bearing (0-360 degrees)
function calculateBearing(lat1, lng1, lat2, lng2) {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);

  return ((θ * 180) / Math.PI + 360) % 360; // Normalize to 0-360
}

// ═══════════════════════════════════════════════════════════════════════════
// 📡 WEBSOCKET CLIENT
// ═══════════════════════════════════════════════════════════════════════════

function connectWebSocket(token, tripId) {
  console.log("🔌 Connecting to WebSocket...");

  const socket = io(WS_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
  });

  return new Promise((resolve, reject) => {
    socket.on("connect", () => {
      console.log("✅ WebSocket connected");
      console.log(`   Socket ID: ${socket.id}`);
      console.log("");

      // Join trip room
      socket.emit("join_trip", tripId);

      resolve(socket);
    });

    socket.on("connect_error", (error) => {
      console.error("❌ WebSocket connection error:", error.message);
      reject(error);
    });

    socket.on("trip_joined", (data) => {
      console.log("📍 Joined trip room:", data);
    });

    socket.on("bus_position_update", (data) => {
      console.log("📡 [RECEIVED] bus_position_update:", {
        lat: data.lat.toFixed(6),
        lng: data.lng.toFixed(6),
        speed: data.speed,
        emaSpeed: data.emaSpeed,
      });
    });

    socket.on("approach_stop", (data) => {
      console.log("🚏 [RECEIVED] approach_stop:", {
        stop: data.stopName,
        distance: data.distance_m + "m",
        eta: data.eta
          ? `${data.eta.etaMinutes}min (${data.eta.confidence})`
          : "N/A",
      });
    });

    socket.on("delay_alert", (data) => {
      console.log("⚠️  [RECEIVED] delay_alert:", {
        delay: data.delay_min + "min",
        severity: data.severity,
      });
    });

    socket.on("gps_ack", (data) => {
      if (!data.success) {
        console.error("❌ GPS ACK Error:", data.error);
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("🔴 WebSocket disconnected:", reason);
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 🚀 MAIN SIMULATOR
// ═══════════════════════════════════════════════════════════════════════════

async function startSimulation() {
  console.log(
    "═══════════════════════════════════════════════════════════════"
  );
  console.log("🚌 GPS SIMULATOR STARTING");
  console.log(
    "═══════════════════════════════════════════════════════════════"
  );
  console.log("");

  try {
    // 1. Login
    const token = await login();

    // 2. Fetch trip data
    const trip = await fetchTripData(token, CONFIG.tripId);
    console.log("   Trip object fields:", Object.keys(trip));
    // Try to find the correct route ID field (support new backend format)
    let routeId =
      trip.routeInfo?.maTuyen ||
      trip.maTuyen ||
      trip.tuyenId ||
      trip.routeId ||
      trip.idTuyen;

    if (!routeId) {
      console.error("Trip data:", trip);
      throw new Error(
        "Không tìm thấy mã tuyến trong dữ liệu chuyến! Expected routeInfo.maTuyen."
      );
    }
    // 3. Fetch route polyline
    const encodedPolyline = await fetchRoutePolyline(token, routeId);

    // 4. Fetch route stops
    const stops = await fetchRouteStops(token, routeId);

    // 5. Decode polyline
    const points = decodePolyline(encodedPolyline);
    console.log("   Polyline points (first 5):", points.slice(0, 5));
    if (points.length <= 1) {
      throw new Error(
        "Polyline chỉ có 1 điểm! Tuyến này chưa có dữ liệu di chuyển. Hãy kiểm tra hoặc tạo lại polyline cho tuyến."
      );
    }

    // 6. Interpolate points for smooth movement
    const path = interpolatePoints(points, CONFIG.speed, CONFIG.interval);

    // 7. Connect WebSocket
    const socket = await connectWebSocket(token, CONFIG.tripId);

    // 8. Start GPS simulation
    console.log(
      "═══════════════════════════════════════════════════════════════"
    );
    console.log("🚀 SIMULATION STARTED");
    console.log(
      "═══════════════════════════════════════════════════════════════"
    );
    console.log(`   Total points: ${path.length}`);
    console.log(
      `   Estimated duration: ${Math.ceil(
        (path.length * CONFIG.interval) / 60
      )} minutes`
    );
    console.log("");
    console.log("📡 Sending GPS updates every ${CONFIG.interval}s...");
    console.log("   Press Ctrl+C to stop");
    console.log("");

    let index = 0;
    const startTime = Date.now();

    const interval = setInterval(() => {
      if (index >= path.length) {
        console.log("");
        console.log(
          "═══════════════════════════════════════════════════════════════"
        );
        console.log("🏁 SIMULATION COMPLETED");
        console.log(
          "═══════════════════════════════════════════════════════════════"
        );
        console.log(
          `   Total time: ${Math.ceil((Date.now() - startTime) / 1000)}s`
        );
        console.log(`   Points sent: ${index}`);
        console.log("");

        clearInterval(interval);
        socket.disconnect();
        process.exit(0);
        return;
      }

      const point = path[index];

      // Send GPS update via WebSocket
      socket.emit("gps:update", {
        tripId: CONFIG.tripId,
        lat: point.lat,
        lng: point.lng,
        speed: point.speed,
        heading: point.heading,
        tsClient: new Date().toISOString(),
      });

      // Progress indicator
      const progress = ((index / path.length) * 100).toFixed(1);
      const elapsed = Math.ceil((Date.now() - startTime) / 1000);
      const remaining = Math.ceil((path.length - index) * CONFIG.interval);

      process.stdout.write(
        `\r📍 Point ${index + 1}/${path.length} (${progress}%) | ` +
          `Elapsed: ${elapsed}s | Remaining: ~${remaining}s | ` +
          `Lat: ${point.lat.toFixed(6)}, Lng: ${point.lng.toFixed(6)}, ` +
          `Speed: ${point.speed} km/h, Heading: ${Math.round(point.heading)}°`
      );

      index++;
    }, CONFIG.interval * 1000);

    // Handle Ctrl+C
    process.on("SIGINT", () => {
      console.log("");
      console.log("");
      console.log("⏹️  Simulation stopped by user");
      clearInterval(interval);
      socket.disconnect();
      process.exit(0);
    });
  } catch (error) {
    console.error("");
    console.error(
      "═══════════════════════════════════════════════════════════════"
    );
    console.error("❌ SIMULATION FAILED");
    console.error(
      "═══════════════════════════════════════════════════════════════"
    );
    console.error(error);
    console.error("");
    process.exit(1);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTO-RUN SIMULATOR
// ═══════════════════════════════════════════════════════════════════════════

(async () => {
  console.log("[DEBUG] Bắt đầu chạy startSimulation...");
  await startSimulation();
})();
