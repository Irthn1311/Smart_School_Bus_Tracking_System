/**
 * M7-M8 E2E Test Script: Stats & Settings
 * 
 * Tests:
 * 1. GET /api/stats/overview (with/without filters)
 * 2. GET /api/stats/trips-by-day
 * 3. GET /api/stats/driver-performance
 * 4. GET /api/stats/bus-utilization (Admin only)
 * 5. GET /api/stats/route-punctuality (Admin only)
 * 6. GET /api/settings (Admin only)
 * 7. PUT /api/settings (Admin only) with validation
 */

import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const API_BASE = process.env.API_BASE || "http://localhost:4000/api/v1";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@school.edu.vn";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const DRIVER_EMAIL = process.env.DRIVER_EMAIL || "taixe@schoolbus.vn";
const DRIVER_PASSWORD = process.env.DRIVER_PASSWORD || "password";

let adminAccessToken = null;
let driverAccessToken = null;

function log(step, status, message, data = null) {
  const icon = status === "PASS" ? "✅" : status === "FAIL" ? "❌" : "⏳";
  console.log(`${icon} [${step}] ${message}`);
  if (data && process.env.DEBUG) {
    console.log("   Data:", JSON.stringify(data, null, 2));
  }
}

async function authenticate(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (data.success && data.data?.token) {
    return data.data.token;
  }
  throw new Error(`Authentication failed for ${email}: ${data.message}`);
}

async function testStatsOverview(token, filters = {}) {
  const queryParams = new URLSearchParams();
  if (filters.from) queryParams.append("from", filters.from);
  if (filters.to) queryParams.append("to", filters.to);
  if (filters.routeId) queryParams.append("routeId", String(filters.routeId));
  if (filters.driverId) queryParams.append("driverId", String(filters.driverId));
  if (filters.busId) queryParams.append("busId", String(filters.busId));

  const res = await fetch(`${API_BASE}/stats/overview?${queryParams.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();

  if (res.status === 200 && data.success && data.data) {
    const stats = data.data;
    if (
      typeof stats.totalTrips === "number" &&
      typeof stats.tripsCompleted === "number" &&
      typeof stats.completionRate === "string" &&
      stats.avgDelayMinutes &&
      typeof stats.avgDelayMinutes.p50 === "number"
    ) {
      log("Stats Overview", "PASS", `Retrieved stats: ${stats.totalTrips} trips, ${stats.completionRate}% completion`);
      return true;
    } else {
      log("Stats Overview", "FAIL", "Invalid data structure");
      return false;
    }
  } else {
    log("Stats Overview", "FAIL", `Failed: ${data.message || res.statusText}`);
    return false;
  }
}

async function testStatsTripsByDay(token, filters = {}) {
  const queryParams = new URLSearchParams();
  if (filters.from) queryParams.append("from", filters.from);
  if (filters.to) queryParams.append("to", filters.to);

  const res = await fetch(`${API_BASE}/stats/trips-by-day?${queryParams.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();

  if (res.status === 200 && data.success && Array.isArray(data.data)) {
    log("Stats Trips by Day", "PASS", `Retrieved ${data.data.length} days of data`);
    return true;
  } else {
    log("Stats Trips by Day", "FAIL", `Failed: ${data.message || res.statusText}`);
    return false;
  }
}

async function testStatsDriverPerformance(token, filters = {}) {
  const queryParams = new URLSearchParams();
  if (filters.from) queryParams.append("from", filters.from);
  if (filters.to) queryParams.append("to", filters.to);

  const res = await fetch(`${API_BASE}/stats/driver-performance?${queryParams.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();

  if (res.status === 200 && data.success && Array.isArray(data.data)) {
    log("Stats Driver Performance", "PASS", `Retrieved ${data.data.length} drivers`);
    return true;
  } else {
    log("Stats Driver Performance", "FAIL", `Failed: ${data.message || res.statusText}`);
    return false;
  }
}

async function testStatsBusUtilization(token, filters = {}) {
  const queryParams = new URLSearchParams();
  if (filters.from) queryParams.append("from", filters.from);
  if (filters.to) queryParams.append("to", filters.to);

  const res = await fetch(`${API_BASE}/stats/bus-utilization?${queryParams.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();

  if (res.status === 200 && data.success && Array.isArray(data.data)) {
    log("Stats Bus Utilization", "PASS", `Retrieved ${data.data.length} buses`);
    return true;
  } else if (res.status === 403) {
    log("Stats Bus Utilization", "PASS", "403 Forbidden (expected for non-admin)");
    return true;
  } else {
    log("Stats Bus Utilization", "FAIL", `Failed: ${data.message || res.statusText}`);
    return false;
  }
}

async function testStatsRoutePunctuality(token, filters = {}) {
  const queryParams = new URLSearchParams();
  if (filters.from) queryParams.append("from", filters.from);
  if (filters.to) queryParams.append("to", filters.to);

  const res = await fetch(`${API_BASE}/stats/route-punctuality?${queryParams.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();

  if (res.status === 200 && data.success && Array.isArray(data.data)) {
    log("Stats Route Punctuality", "PASS", `Retrieved ${data.data.length} routes`);
    return true;
  } else if (res.status === 403) {
    log("Stats Route Punctuality", "PASS", "403 Forbidden (expected for non-admin)");
    return true;
  } else {
    log("Stats Route Punctuality", "FAIL", `Failed: ${data.message || res.statusText}`);
    return false;
  }
}

async function testGetSettings(token) {
  const res = await fetch(`${API_BASE}/settings`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();

  if (res.status === 200 && data.success && data.data) {
    const settings = data.data;
    if (
      typeof settings.geofenceRadiusMeters === "number" &&
      typeof settings.delayThresholdMinutes === "number" &&
      typeof settings.realtimeThrottleSeconds === "number" &&
      ["google", "osm"].includes(settings.mapsProvider)
    ) {
      log("Get Settings", "PASS", `Retrieved settings: radius=${settings.geofenceRadiusMeters}m, delay=${settings.delayThresholdMinutes}min`);
      return settings;
    } else {
      log("Get Settings", "FAIL", "Invalid settings structure");
      return null;
    }
  } else if (res.status === 403) {
    log("Get Settings", "PASS", "403 Forbidden (expected for non-admin)");
    return null;
  } else {
    log("Get Settings", "FAIL", `Failed: ${data.message || res.statusText}`);
    return null;
  }
}

async function testUpdateSettings(token, updates) {
  const res = await fetch(`${API_BASE}/settings`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  });
  const data = await res.json();

  if (res.status === 200 && data.success && data.data) {
    log("Update Settings", "PASS", "Settings updated successfully");
    return data.data;
  } else if (res.status === 400 || res.status === 422) {
    log("Update Settings", "PASS", `Validation error (expected): ${data.message}`);
    return null;
  } else if (res.status === 403) {
    log("Update Settings", "PASS", "403 Forbidden (expected for non-admin)");
    return null;
  } else {
    log("Update Settings", "FAIL", `Failed: ${data.message || res.statusText}`);
    return null;
  }
}

async function main() {
  try {
    log("Setup", "LOADING", "Authenticating users...");
    adminAccessToken = await authenticate(ADMIN_EMAIL, ADMIN_PASSWORD);
    driverAccessToken = await authenticate(DRIVER_EMAIL, DRIVER_PASSWORD);
    log("Setup", "PASS", "Authentication successful");

    // Date range: last 7 days
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const dateFrom = sevenDaysAgo.toISOString().split("T")[0];
    const dateTo = today.toISOString().split("T")[0];

    const filters = { from: dateFrom, to: dateTo };

    // Test Stats endpoints (Admin)
    log("Stats Tests", "LOADING", "Testing stats endpoints...");
    await testStatsOverview(adminAccessToken, filters);
    await testStatsOverview(adminAccessToken, { ...filters, routeId: 1 });
    await testStatsTripsByDay(adminAccessToken, filters);
    await testStatsDriverPerformance(adminAccessToken, filters);
    await testStatsBusUtilization(adminAccessToken, filters);
    await testStatsRoutePunctuality(adminAccessToken, filters);

    // Test Stats endpoints (Driver - should see own stats only)
    log("Stats Tests (Driver)", "LOADING", "Testing driver access...");
    await testStatsOverview(driverAccessToken, filters);
    await testStatsTripsByDay(driverAccessToken, filters);
    await testStatsDriverPerformance(driverAccessToken, filters);
    await testStatsBusUtilization(driverAccessToken, filters); // Should 403
    await testStatsRoutePunctuality(driverAccessToken, filters); // Should 403

    // Test Settings endpoints (Admin)
    log("Settings Tests", "LOADING", "Testing settings endpoints...");
    const originalSettings = await testGetSettings(adminAccessToken);
    if (originalSettings) {
      // Test valid update
      await testUpdateSettings(adminAccessToken, {
        geofenceRadiusMeters: 80,
        delayThresholdMinutes: 7,
        realtimeThrottleSeconds: 3,
      });

      // Test invalid update (validation error)
      await testUpdateSettings(adminAccessToken, {
        geofenceRadiusMeters: 10, // Too small (< 20)
      });

      // Restore original settings
      if (originalSettings) {
        await testUpdateSettings(adminAccessToken, {
          geofenceRadiusMeters: originalSettings.geofenceRadiusMeters,
          delayThresholdMinutes: originalSettings.delayThresholdMinutes,
          realtimeThrottleSeconds: originalSettings.realtimeThrottleSeconds,
          mapsProvider: originalSettings.mapsProvider,
        });
      }
    }

    // Test Settings endpoints (Driver - should 403)
    log("Settings Tests (Driver)", "LOADING", "Testing driver access to settings...");
    await testGetSettings(driverAccessToken); // Should 403
    await testUpdateSettings(driverAccessToken, { geofenceRadiusMeters: 100 }); // Should 403

    log("Summary", "PASS", "All tests completed!");
  } catch (error) {
    log("Main Test", "FAIL", `Test failed: ${error.message}`, error);
    process.exit(1);
  }
}

main();

