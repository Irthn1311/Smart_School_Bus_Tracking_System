/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📡 GPS SIMULATOR - Mô phỏng GPS từ driver
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 🎯 MỤC ĐÍCH:
 * - Mô phỏng driver gửi GPS updates cho một trip
 * - Interpolate vị trí giữa các stops (đi thẳng)
 * - Gửi `gps:update` event mỗi 2 giây
 *
 * 🔧 SỬ DỤNG:
 * node scripts/ws_gps_simulator.js <tripId> <accessToken>
 *
 * 📝 VÍ DỤ:
 * node scripts/ws_gps_simulator.js 1 eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *
 * @author Nguyễn Tuấn Tài
 * @date 2025-11-11
 */

import { io } from "socket.io-client";
import readline from "readline";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:4000";
const WS_URL = process.env.WS_URL || API_BASE_URL;

// Parse command line arguments
const tripId = parseInt(process.argv[2]);
const accessToken = process.argv[3];

if (!tripId || !accessToken) {
  console.error("❌ Usage: node ws_gps_simulator.js <tripId> <accessToken>");
  console.error("   Example: node ws_gps_simulator.js 1 eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...");
  process.exit(1);
}

// Sample route stops (lấy từ DB hoặc API)
// TODO: Fetch từ API /trips/{id} để lấy route stops
const sampleStops = [
  { lat: 10.762622, lng: 106.660172, name: "Stop 1" },
  { lat: 10.770000, lng: 106.670000, name: "Stop 2" },
  { lat: 10.780000, lng: 106.680000, name: "Stop 3" },
  { lat: 10.790000, lng: 106.690000, name: "Stop 4" },
];

// Interpolate position between two points
function interpolate(start, end, progress) {
  // progress: 0.0 to 1.0
  return {
    lat: start.lat + (end.lat - start.lat) * progress,
    lng: start.lng + (end.lng - start.lng) * progress,
  };
}

// Calculate distance between two points (Haversine)
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

// Calculate speed from distance and time
function calculateSpeed(distanceMeters, timeSeconds) {
  // distance in meters, time in seconds
  const speedMps = distanceMeters / timeSeconds; // meters per second
  return speedMps * 3.6; // Convert to km/h
}

// Calculate heading (bearing) between two points
function calculateHeading(lat1, lon1, lat2, lon2) {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  const θ = Math.atan2(y, x);
  const bearing = ((θ * 180) / Math.PI + 360) % 360;

  return bearing;
}

console.log(`🚀 GPS Simulator starting...`);
console.log(`   Trip ID: ${tripId}`);
console.log(`   WS URL: ${WS_URL}`);
console.log(`   Stops: ${sampleStops.length}`);

// Connect to Socket.IO
const socket = io(WS_URL, {
  auth: {
    token: accessToken,
  },
  transports: ["websocket", "polling"],
});

let currentSegment = 0; // Current segment index (0 = between stop 0 and 1)
let segmentProgress = 0.0; // Progress within segment (0.0 to 1.0)
let lastPosition = sampleStops[0];
let lastTime = Date.now();
const UPDATE_INTERVAL_MS = 2000; // 2 seconds
const SEGMENT_DURATION_MS = 60000; // 60 seconds per segment (adjust as needed)

socket.on("connect", () => {
  console.log(`✅ Connected to Socket.IO server`);
  console.log(`   Socket ID: ${socket.id}`);

  // Join trip room
  socket.emit("join_trip", tripId);
  console.log(`   ✅ Joined trip-${tripId} room`);

  // Start GPS simulation
  console.log(`\n📍 Starting GPS simulation...`);
  console.log(`   Sending updates every ${UPDATE_INTERVAL_MS}ms\n`);

  const interval = setInterval(() => {
    // Check if we've reached the end
    if (currentSegment >= sampleStops.length - 1) {
      console.log(`\n✅ Reached final stop. Simulation complete.`);
      clearInterval(interval);
      socket.disconnect();
      process.exit(0);
      return;
    }

    // Calculate current position
    const startStop = sampleStops[currentSegment];
    const endStop = sampleStops[currentSegment + 1];
    const position = interpolate(startStop, endStop, segmentProgress);

    // Calculate speed and heading
    const now = Date.now();
    const timeDiffSeconds = (now - lastTime) / 1000;
    const distanceMeters = haversine(
      lastPosition.lat,
      lastPosition.lng,
      position.lat,
      position.lng
    );
    const speedKph = calculateSpeed(distanceMeters, timeDiffSeconds);
    const heading = calculateHeading(
      lastPosition.lat,
      lastPosition.lng,
      position.lat,
      position.lng
    );

    // Emit GPS update
    const gpsData = {
      tripId: tripId,
      lat: position.lat,
      lng: position.lng,
      speedKph: Math.round(speedKph * 10) / 10, // Round to 1 decimal
      heading: Math.round(heading),
      tsClient: new Date().toISOString(),
    };

    socket.emit("gps:update", gpsData);
    console.log(
      `📍 [${new Date().toLocaleTimeString()}] GPS: (${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}) | Speed: ${speedKph.toFixed(1)} km/h | Heading: ${heading.toFixed(0)}° | Segment: ${currentSegment + 1}/${sampleStops.length - 1} (${(segmentProgress * 100).toFixed(1)}%)`
    );

    // Update progress
    segmentProgress += UPDATE_INTERVAL_MS / SEGMENT_DURATION_MS;
    if (segmentProgress >= 1.0) {
      // Move to next segment
      segmentProgress = 0.0;
      currentSegment++;
      console.log(`   ➡️  Moving to segment ${currentSegment + 1}`);
    }

    lastPosition = position;
    lastTime = now;
  }, UPDATE_INTERVAL_MS);
});

socket.on("connect_error", (error) => {
  console.error(`❌ Connection error:`, error.message);
  process.exit(1);
});

socket.on("disconnect", (reason) => {
  console.log(`\n🔴 Disconnected: ${reason}`);
});

socket.on("gps_ack", (data) => {
  if (data.success) {
    console.log(`   ✅ Server ACK: ${data.events?.join(", ") || "OK"}`);
  } else {
    console.error(`   ❌ Server error: ${data.error}`);
  }
});

socket.on("bus_position_update", (data) => {
  console.log(`   📡 Received bus_position_update:`, {
    tripId: data.tripId,
    busId: data.busId,
    lat: data.lat?.toFixed(6),
    lng: data.lng?.toFixed(6),
    speed: data.speedKph,
  });
});

socket.on("approach_stop", (data) => {
  console.log(`   🚏 ⚠️  APPROACHING STOP: ${data.stopName} (${data.distanceMeters}m away)`);
});

socket.on("delay_alert", (data) => {
  console.log(`   ⏰ ⚠️  DELAY ALERT: ${data.delayMinutes || data.delay_minutes} minutes late`);
});

socket.on("pickup_status_update", (data) => {
  console.log(`   👥 Student ${data.studentName} ${data.status === "onboard" ? "checked in" : "checked out"}`);
});

// Handle Ctrl+C
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.on("SIGINT", () => {
  console.log(`\n\n🛑 Stopping simulator...`);
  socket.disconnect();
  rl.close();
  process.exit(0);
});

console.log(`\n💡 Press Ctrl+C to stop simulation\n`);

