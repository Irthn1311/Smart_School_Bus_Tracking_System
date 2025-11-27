/**
 * M0: E2E Test Script - Auth Flow
 * 
 * Tests:
 * 1. POST /auth/login → expect 200, có accessToken, refreshToken
 * 2. GET /auth/profile với access → 200
 * 3. POST /auth/refresh → access mới khác cũ
 * 4. GET /auth/profile với access mới → 200
 */

import fetch from "node-fetch";

const API_BASE = process.env.API_BASE || "http://localhost:4000/api/v1";
const TEST_EMAIL = process.env.TEST_EMAIL || "admin@school.edu.vn";
const TEST_PASSWORD = process.env.TEST_PASSWORD || "admin123";

let accessToken = null;
let refreshToken = null;

function log(step, status, message, data = null) {
  const icon = status === "PASS" ? "✅" : status === "FAIL" ? "❌" : "⏳";
  console.log(`${icon} [${step}] ${message}`);
  if (data && process.env.DEBUG) {
    console.log("   Data:", JSON.stringify(data, null, 2));
  }
}

async function testLogin() {
  log("1", "LOADING", "Testing POST /auth/login...");
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      }),
    });

    const data = await res.json();

    if (res.status === 200 && data.success && data.data?.token && data.data?.refreshToken) {
      accessToken = data.data.token;
      refreshToken = data.data.refreshToken;
      log("1", "PASS", `Login successful. Got tokens.`);
      return true;
    } else {
      log("1", "FAIL", `Login failed: ${data.message || res.statusText}`);
      return false;
    }
  } catch (error) {
    log("1", "FAIL", `Login error: ${error.message}`);
    return false;
  }
}

async function testProfile() {
  log("2", "LOADING", "Testing GET /auth/profile with access token...");
  try {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await res.json();

    if (res.status === 200 && data.success && data.data?.user) {
      log("2", "PASS", `Profile retrieved. User: ${data.data.user.email}`);
      return true;
    } else {
      log("2", "FAIL", `Profile failed: ${data.message || res.statusText}`);
      return false;
    }
  } catch (error) {
    log("2", "FAIL", `Profile error: ${error.message}`);
    return false;
  }
}

async function testRefresh() {
  log("3", "LOADING", "Testing POST /auth/refresh...");
  try {
    const oldToken = accessToken;

    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${refreshToken}`,
      },
    });

    const data = await res.json();

    if (res.status === 200 && data.success && data.data?.token) {
      const newToken = data.data.token;
      if (newToken !== oldToken) {
        accessToken = newToken;
        log("3", "PASS", `Refresh successful. New token is different from old.`);
        return true;
      } else {
        log("3", "FAIL", `Refresh returned same token!`);
        return false;
      }
    } else {
      log("3", "FAIL", `Refresh failed: ${data.message || res.statusText}`);
      return false;
    }
  } catch (error) {
    log("3", "FAIL", `Refresh error: ${error.message}`);
    return false;
  }
}

async function testProfileWithNewToken() {
  log("4", "LOADING", "Testing GET /auth/profile with new access token...");
  try {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await res.json();

    if (res.status === 200 && data.success && data.data?.user) {
      log("4", "PASS", `Profile with new token retrieved. User: ${data.data.user.email}`);
      return true;
    } else {
      log("4", "FAIL", `Profile failed: ${data.message || res.statusText}`);
      return false;
    }
  } catch (error) {
    log("4", "FAIL", `Profile error: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log("🧪 M0 Auth Flow E2E Tests\n");
  console.log(`API Base: ${API_BASE}`);
  console.log(`Test Email: ${TEST_EMAIL}\n`);

  const results = [];

  results.push(await testLogin());
  if (!results[0]) {
    console.log("\n❌ Login failed. Stopping tests.");
    process.exit(1);
  }

  results.push(await testProfile());
  results.push(await testRefresh());
  results.push(await testProfileWithNewToken());

  const passed = results.filter((r) => r).length;
  const total = results.length;

  console.log(`\n📊 Results: ${passed}/${total} tests passed`);

  if (passed === total) {
    console.log("✅ All tests PASSED!");
    process.exit(0);
  } else {
    console.log("❌ Some tests FAILED!");
    process.exit(1);
  }
}

runAllTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

