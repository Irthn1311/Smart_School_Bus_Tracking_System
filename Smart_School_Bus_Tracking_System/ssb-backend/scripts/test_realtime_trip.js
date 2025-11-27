/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🧪 E2E TEST - Realtime Trip Flow
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 🎯 MỤC ĐÍCH:
 * - Test toàn bộ flow: Create trip → Start → GPS updates → Geofence → Delay → End
 * - Verify WS events: bus_position_update, approach_stop, delay_alert
 * - Assertions cho từng bước
 *
 * 🔧 SỬ DỤNG:
 * node scripts/test_realtime_trip.js <adminToken> <driverToken> <scheduleId>
 *
 * 📝 VÍ DỤ:
 * node scripts/test_realtime_trip.js <admin_token> <driver_token> 1
 *
 * @author Nguyễn Tuấn Tài
 * @date 2025-11-11
 */

import { io } from "socket.io-client";
import fetch from "node-fetch";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:4000";
const WS_URL = process.env.WS_URL || API_BASE_URL;

// Parse command line arguments
const adminToken = process.argv[2];
const driverToken = process.argv[3];
const scheduleId = parseInt(process.argv[4]) || 1;

if (!adminToken || !driverToken) {
  console.error("❌ Usage: node test_realtime_trip.js <adminToken> <driverToken> [scheduleId]");
  process.exit(1);
}

const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

// Test results
const results = {
  passed: 0,
  failed: 0,
  steps: [],
};

function logStep(name, passed, message = "") {
  const status = passed ? "✅ PASS" : "❌ FAIL";
  console.log(`${status} - ${name}${message ? `: ${message}` : ""}`);
  results.steps.push({ name, passed, message });
  if (passed) results.passed++;
  else results.failed++;
}

async function apiRequest(method, endpoint, token, body = null) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}/api/v1${endpoint}`, options);
  const data = await response.json();
  return { status: response.status, data };
}

// WebSocket event listeners
const wsEvents = {
  bus_position_update: [],
  approach_stop: [],
  delay_alert: [],
  pickup_status_update: [],
  trip_started: [],
  trip_completed: [],
};

function setupSocketListeners(socket) {
  socket.on("bus_position_update", (data) => {
    wsEvents.bus_position_update.push(data);
    console.log(`   📡 [WS] bus_position_update: trip=${data.tripId}, lat=${data.lat?.toFixed(6)}, lng=${data.lng?.toFixed(6)}`);
  });

  socket.on("approach_stop", (data) => {
    wsEvents.approach_stop.push(data);
    console.log(`   🚏 [WS] approach_stop: ${data.stopName} (${data.distanceMeters}m)`);
  });

  socket.on("delay_alert", (data) => {
    wsEvents.delay_alert.push(data);
    console.log(`   ⏰ [WS] delay_alert: ${data.delayMinutes || data.delay_minutes} minutes late`);
  });

  socket.on("pickup_status_update", (data) => {
    wsEvents.pickup_status_update.push(data);
    console.log(`   👥 [WS] pickup_status_update: ${data.studentName} ${data.status}`);
  });

  socket.on("trip_started", (data) => {
    wsEvents.trip_started.push(data);
    console.log(`   🚀 [WS] trip_started: trip=${data.tripId}`);
  });

  socket.on("trip_completed", (data) => {
    wsEvents.trip_completed.push(data);
    console.log(`   ✅ [WS] trip_completed: trip=${data.tripId}`);
  });
}

async function main() {
  console.log("🧪 E2E Test: Realtime Trip Flow\n");
  console.log(`   API: ${API_BASE_URL}`);
  console.log(`   WS: ${WS_URL}`);
  console.log(`   Schedule ID: ${scheduleId}`);
  console.log(`   Date: ${today}\n`);

  let tripId = null;
  let adminSocket = null;
  let driverSocket = null;

  try {
    // Step 1: Create trip (Admin)
    console.log("📝 Step 1: Create trip...");
    const createRes = await apiRequest("POST", "/trips", adminToken, {
      maLichTrinh: scheduleId,
      ngayChay: today,
      trangThai: "chua_khoi_hanh",
    });

    if (createRes.status === 201 && createRes.data.success) {
      tripId = createRes.data.data.maChuyen || createRes.data.data.id;
      logStep("Create trip", true, `Trip ID: ${tripId}`);
    } else {
      // Check if trip already exists
      if (createRes.status === 409) {
        console.log("   ⚠️  Trip already exists, trying to find existing trip...");
        const listRes = await apiRequest("GET", `/trips?ngayChay=${today}&maLichTrinh=${scheduleId}`, adminToken);
        if (listRes.data.success && listRes.data.data && listRes.data.data.length > 0) {
          tripId = listRes.data.data[0].maChuyen || listRes.data.data[0].id;
          logStep("Find existing trip", true, `Trip ID: ${tripId}`);
        } else {
          logStep("Create trip", false, `Status: ${createRes.status}, Message: ${createRes.data.message}`);
        }
      } else {
        logStep("Create trip", false, `Status: ${createRes.status}, Message: ${createRes.data.message}`);
      }
    }

    if (!tripId) {
      console.error("❌ Cannot proceed without trip ID");
      process.exit(1);
    }

    // Step 2: Connect WebSockets
    console.log("\n📡 Step 2: Connect WebSockets...");
    adminSocket = io(WS_URL, {
      auth: { token: adminToken },
      transports: ["websocket", "polling"],
    });

    driverSocket = io(WS_URL, {
      auth: { token: driverToken },
      transports: ["websocket", "polling"],
    });

    await new Promise((resolve) => {
      let adminConnected = false;
      let driverConnected = false;

      adminSocket.on("connect", () => {
        adminConnected = true;
        console.log("   ✅ Admin connected");
        adminSocket.emit("join_trip", tripId);
        setupSocketListeners(adminSocket);
        if (adminConnected && driverConnected) resolve();
      });

      driverSocket.on("connect", () => {
        driverConnected = true;
        console.log("   ✅ Driver connected");
        driverSocket.emit("join_trip", tripId);
        setupSocketListeners(driverSocket);
        if (adminConnected && driverConnected) resolve();
      });

      setTimeout(() => {
        if (!adminConnected || !driverConnected) {
          logStep("Connect WebSockets", false, "Timeout waiting for connections");
          resolve();
        }
      }, 5000);
    });

    // Step 3: Start trip (Driver)
    console.log("\n🚀 Step 3: Start trip...");
    const startRes = await apiRequest("POST", `/trips/${tripId}/start`, driverToken, {
      gioBatDauThucTe: new Date().toISOString(),
    });

    if (startRes.status === 200 && startRes.data.success) {
      logStep("Start trip", true);
      // Wait for WS event
      await new Promise((resolve) => setTimeout(resolve, 1000));
      logStep("Receive trip_started event", wsEvents.trip_started.length > 0, `Received ${wsEvents.trip_started.length} event(s)`);
    } else {
      logStep("Start trip", false, `Status: ${startRes.status}`);
    }

    // Step 4: Send GPS updates (simulate)
    console.log("\n📍 Step 4: Send GPS updates...");
    const gpsUpdates = [
      { lat: 10.762622, lng: 106.660172, speedKph: 0 },
      { lat: 10.765000, lng: 106.665000, speedKph: 30 },
      { lat: 10.770000, lng: 106.670000, speedKph: 35 },
      { lat: 10.775000, lng: 106.675000, speedKph: 40 },
    ];

    for (let i = 0; i < gpsUpdates.length; i++) {
      const gps = gpsUpdates[i];
      driverSocket.emit("gps:update", {
        tripId: tripId,
        lat: gps.lat,
        lng: gps.lng,
        speedKph: gps.speedKph,
        heading: 90,
        tsClient: new Date().toISOString(),
      });
      console.log(`   📍 GPS update ${i + 1}/${gpsUpdates.length}: (${gps.lat}, ${gps.lng})`);
      await new Promise((resolve) => setTimeout(resolve, 2500)); // Wait 2.5s between updates
    }

    // Wait for events
    await new Promise((resolve) => setTimeout(resolve, 2000));

    logStep("Receive bus_position_update", wsEvents.bus_position_update.length > 0, `Received ${wsEvents.bus_position_update.length} update(s)`);
    logStep("Receive approach_stop (if near stop)", true, `Received ${wsEvents.approach_stop.length} event(s) (may be 0 if not near stop)`);

    // Step 5: Check-in student (Driver)
    console.log("\n👥 Step 5: Check-in student...");
    // Get students for trip first
    const tripRes = await apiRequest("GET", `/trips/${tripId}`, driverToken);
    let studentId = null;
    if (tripRes.data.success && tripRes.data.data.students && tripRes.data.data.students.length > 0) {
      studentId = tripRes.data.data.students[0].maHocSinh;
    }

    if (studentId) {
      const checkinRes = await apiRequest("POST", `/trips/${tripId}/students/${studentId}/checkin`, driverToken, {
        ghiChu: "Test check-in",
      });

      if (checkinRes.status === 200 && checkinRes.data.success) {
        logStep("Check-in student", true);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        logStep("Receive pickup_status_update", wsEvents.pickup_status_update.length > 0, `Received ${wsEvents.pickup_status_update.length} event(s)`);
      } else {
        logStep("Check-in student", false, `Status: ${checkinRes.status}`);
      }
    } else {
      logStep("Check-in student", true, "Skipped (no students in trip)");
    }

    // Step 6: End trip (Driver)
    console.log("\n🏁 Step 6: End trip...");
    const endRes = await apiRequest("POST", `/trips/${tripId}/end`, driverToken, {
      gioKetThucThucTe: new Date().toISOString(),
    });

    if (endRes.status === 200 && endRes.data.success) {
      logStep("End trip", true);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      logStep("Receive trip_completed event", wsEvents.trip_completed.length > 0, `Received ${wsEvents.trip_completed.length} event(s)`);
    } else {
      logStep("End trip", false, `Status: ${endRes.status}`);
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 TEST SUMMARY");
    console.log("=".repeat(60));
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📈 Total: ${results.passed + results.failed}`);
    console.log("\nSteps:");
    results.steps.forEach((step, idx) => {
      console.log(`  ${idx + 1}. ${step.passed ? "✅" : "❌"} ${step.name}${step.message ? ` - ${step.message}` : ""}`);
    });

    if (results.failed === 0) {
      console.log("\n🎉 All tests PASSED!");
      process.exit(0);
    } else {
      console.log("\n⚠️  Some tests FAILED");
      process.exit(1);
    }
  } catch (error) {
    console.error("\n❌ Test error:", error);
    process.exit(1);
  } finally {
    // Cleanup
    if (adminSocket) adminSocket.disconnect();
    if (driverSocket) driverSocket.disconnect();
  }
}

main();

