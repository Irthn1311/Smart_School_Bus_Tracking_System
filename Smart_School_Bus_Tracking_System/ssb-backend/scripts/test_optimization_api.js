/**
 * Test Script cho API Endpoints (Phase 5)
 * 
 * Chạy: node scripts/test_optimization_api.js
 * 
 * Yêu cầu: Backend server phải đang chạy
 */

import fetch from "node-fetch";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:4000/api/v1";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "quantri@schoolbus.vn";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "password123";

let authToken = null;

/**
 * Helper function để gọi API
 */
async function apiCall(method, endpoint, body = null, headers = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.json();
  return { response, data };
}

/**
 * Đăng nhập để lấy token
 */
async function login() {
  try {
    console.log("🔐 Đang đăng nhập...");
    const { response, data } = await apiCall("POST", "/auth/login", {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });

    if (data.success && data.data.token) {
      authToken = data.data.token;
      console.log("✓ Đăng nhập thành công\n");
      return true;
    } else {
      console.error("✗ Đăng nhập thất bại:", data);
      return false;
    }
  } catch (error) {
    console.error("✗ Lỗi đăng nhập:", error.message);
    return false;
  }
}

/**
 * Test 1: GET /api/v1/bus-stops/stats
 */
async function testGetStats() {
  console.log("=== TEST 1: GET /api/v1/bus-stops/stats ===");
  
  try {
    const startTime = Date.now();
    const { response, data } = await apiCall("GET", "/bus-stops/stats", null, {
      Authorization: `Bearer ${authToken}`,
    });
    const duration = Date.now() - startTime;

    if (data.success) {
      console.log("✓ Request thành công");
      console.log(`✓ Response time: ${duration}ms`);
      console.log("✓ Data:", JSON.stringify(data.data, null, 2));
      return { success: true, duration };
    } else {
      console.error("✗ Request thất bại:", data);
      return { success: false };
    }
  } catch (error) {
    console.error("✗ Lỗi:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test 2: GET /api/v1/bus-stops/assignments
 */
async function testGetAssignments() {
  console.log("\n=== TEST 2: GET /api/v1/bus-stops/assignments ===");
  
  try {
    const startTime = Date.now();
    const { response, data } = await apiCall("GET", "/bus-stops/assignments", null, {
      Authorization: `Bearer ${authToken}`,
    });
    const duration = Date.now() - startTime;

    if (data.success) {
      console.log("✓ Request thành công");
      console.log(`✓ Response time: ${duration}ms`);
      console.log(`✓ Số lượng assignments: ${data.data?.length || 0}`);
      
      if (data.data && data.data.length > 0) {
        console.log("✓ Sample assignment:", JSON.stringify(data.data[0], null, 2));
      }
      return { success: true, duration, count: data.data?.length || 0 };
    } else {
      console.error("✗ Request thất bại:", data);
      return { success: false };
    }
  } catch (error) {
    console.error("✗ Lỗi:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test 3: POST /api/v1/bus-stops/optimize (Tầng 1)
 */
async function testOptimizeTier1() {
  console.log("\n=== TEST 3: POST /api/v1/bus-stops/optimize (Tầng 1) ===");
  
  try {
    const payload = {
      r_walk: 500,
      s_max: 25,
      max_stops: null,
      use_roads_api: true,
      use_places_api: true,
    };

    console.log("📤 Request payload:", JSON.stringify(payload, null, 2));
    console.log("⏳ Đang chạy optimization (có thể mất vài phút)...");

    const startTime = Date.now();
    const { response, data } = await apiCall(
      "POST",
      "/bus-stops/optimize",
      payload,
      {
        Authorization: `Bearer ${authToken}`,
      }
    );
    const duration = Date.now() - startTime;

    if (data.success) {
      console.log("✓ Optimization thành công");
      console.log(`✓ Thời gian chạy: ${(duration / 1000).toFixed(2)}s`);
      console.log("✓ Stats:", JSON.stringify(data.data.stats, null, 2));
      return { success: true, duration, stats: data.data.stats };
    } else {
      console.error("✗ Optimization thất bại:", data);
      return { success: false };
    }
  } catch (error) {
    console.error("✗ Lỗi:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test 4: POST /api/v1/routes/optimize-vrp (Tầng 2)
 */
async function testOptimizeVRP() {
  console.log("\n=== TEST 4: POST /api/v1/routes/optimize-vrp (Tầng 2) ===");
  
  try {
    const payload = {
      depot: {
        lat: 10.77653,
        lng: 106.700981,
      },
      capacity: 40,
      split_virtual_nodes: true,
    };

    console.log("📤 Request payload:", JSON.stringify(payload, null, 2));
    console.log("⏳ Đang chạy VRP optimization (có thể mất vài phút)...");

    const startTime = Date.now();
    const { response, data } = await apiCall(
      "POST",
      "/routes/optimize-vrp",
      payload,
      {
        Authorization: `Bearer ${authToken}`,
      }
    );
    const duration = Date.now() - startTime;

    if (data.success) {
      console.log("✓ VRP Optimization thành công");
      console.log(`✓ Thời gian chạy: ${(duration / 1000).toFixed(2)}s`);
      console.log("✓ Stats:", JSON.stringify(data.data.stats, null, 2));
      
      if (data.data.routes) {
        console.log(`✓ Số tuyến: ${data.data.routes.length}`);
        data.data.routes.slice(0, 3).forEach((route, idx) => {
          console.log(`  Tuyến ${idx + 1}: ${route.stopCount} điểm dừng, ${route.totalDemand} học sinh`);
        });
      }
      return { success: true, duration, stats: data.data.stats };
    } else {
      console.error("✗ VRP Optimization thất bại:", data);
      return { success: false };
    }
  } catch (error) {
    console.error("✗ Lỗi:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test 5: POST /api/v1/bus-stops/optimize-full (Cả 2 tầng)
 */
async function testOptimizeFull() {
  console.log("\n=== TEST 5: POST /api/v1/bus-stops/optimize-full (Cả 2 tầng) ===");
  
  try {
    const payload = {
      school_location: {
        lat: 10.77653,
        lng: 106.700981,
      },
      r_walk: 500,
      s_max: 25,
      c_bus: 40,
      max_stops: null,
      use_roads_api: true,
      use_places_api: true,
      split_virtual_nodes: true,
    };

    console.log("📤 Request payload:", JSON.stringify(payload, null, 2));
    console.log("⏳ Đang chạy full optimization (có thể mất vài phút)...");

    const startTime = Date.now();
    const { response, data } = await apiCall(
      "POST",
      "/bus-stops/optimize-full",
      payload,
      {
        Authorization: `Bearer ${authToken}`,
      }
    );
    const duration = Date.now() - startTime;

    if (data.success) {
      console.log("✓ Full Optimization thành công");
      console.log(`✓ Thời gian chạy: ${(duration / 1000).toFixed(2)}s`);
      console.log("✓ Summary:", JSON.stringify(data.data.summary, null, 2));
      return { success: true, duration, summary: data.data.summary };
    } else {
      console.error("✗ Full Optimization thất bại:", data);
      return { success: false };
    }
  } catch (error) {
    console.error("✗ Lỗi:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Main function
 */
async function main() {
  console.log("=".repeat(60));
  console.log("API ENDPOINTS TEST SUITE (Phase 5)");
  console.log("=".repeat(60));

  // Đăng nhập
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.error("Không thể đăng nhập. Dừng tests.");
    process.exit(1);
  }

  // Chạy tests
  const results = {
    test1: await testGetStats(),
    test2: await testGetAssignments(),
    // test3: await testOptimizeTier1(), // Comment out để không chạy mỗi lần
    // test4: await testOptimizeVRP(), // Comment out để không chạy mỗi lần
    // test5: await testOptimizeFull(), // Comment out để không chạy mỗi lần
  };

  console.log("\n" + "=".repeat(60));
  console.log("TỔNG KẾT");
  console.log("=".repeat(60));

  const allPassed = Object.values(results).every((r) => r.success);
  if (allPassed) {
    console.log("✓ TẤT CẢ TESTS ĐỀU PASSED!");
  } else {
    console.log("⚠ MỘT SỐ TESTS CÓ VẤN ĐỀ:");
    Object.entries(results).forEach(([testName, result]) => {
      if (!result.success) {
        console.log(`  - ${testName}: ${result.error || "Failed"}`);
      }
    });
  }

  console.log("\n💡 Lưu ý: Các test optimization (test3, test4, test5) đã được comment out.");
  console.log("   Uncomment để chạy khi cần test optimization (có thể mất vài phút).");

  process.exit(allPassed ? 0 : 1);
}

// Chạy tests
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

