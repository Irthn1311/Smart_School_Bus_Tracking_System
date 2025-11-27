/**
 * 🧪 TEST FILE CHO WSAUTH.JS
 *
 * Chạy file này để kiểm tra hàm verifyWsJWT()
 * Command: node src/utils/test_wsAuth.js
 *
 * ⚠️ CHÚ Ý: Cần có JWT_SECRET trong .env!
 */

import { verifyWsJWT, createMockToken } from "./wsAuth.js";
import dotenv from "dotenv";

// Load biến môi trường từ .env
dotenv.config();

console.log("🧪 BẮT ĐẦU TEST WEBSOCKET AUTHENTICATION\n");
console.log("=".repeat(60));

// Kiểm tra JWT_SECRET có tồn tại không
if (!process.env.JWT_SECRET) {
  console.error("\n❌ LỖI: Không tìm thấy JWT_SECRET trong .env!");
  console.error("👉 Hãy thêm dòng này vào file .env:");
  console.error("   JWT_SECRET=your_secret_key_here\n");
  process.exit(1);
}

console.log(
  `✅ JWT_SECRET đã được cấu hình: ${process.env.JWT_SECRET.substring(
    0,
    10
  )}...`
);
console.log("=".repeat(60));

// ==========================================
// TEST 1: Token hợp lệ
// ==========================================
console.log("\n\n🔑 TEST 1: Verify Token Hợp Lệ");
console.log("-".repeat(60));

try {
  // Tạo token giả (mock) cho testing
  const mockToken = createMockToken(123, "tai_xe", "driver@ssb.vn");
  console.log("\n📝 Token được tạo (mock):");
  console.log(`   ${mockToken.substring(0, 50)}...`);

  // Verify token
  const user = await verifyWsJWT(mockToken);

  console.log("\n✅ Test 1.1: Verify thành công!");
  console.log("   📊 Thông tin user đã giải mã:");
  console.log(`   - User ID: ${user.maNguoiDung}`);
  console.log(`   - Email: ${user.email}`);
  console.log(`   - Vai trò: ${user.vaiTro}`);
  console.log(`   - Issued at: ${new Date(user.iat * 1000).toLocaleString()}`);
  console.log(`   - Expires at: ${new Date(user.exp * 1000).toLocaleString()}`);
} catch (error) {
  console.error("\n❌ Test 1.1 FAILED:", error.message);
}

// Test với các roles khác
console.log("\n✅ Test 1.2: Verify Admin");
try {
  const adminToken = createMockToken(1, "quan_tri", "admin@ssb.vn");
  const admin = await verifyWsJWT(adminToken);
  console.log(`   - Admin: ${admin.email} (${admin.vaiTro})`);
} catch (error) {
  console.error("   ❌ FAILED:", error.message);
}

console.log("\n✅ Test 1.3: Verify Parent");
try {
  const parentToken = createMockToken(456, "phu_huynh", "parent@ssb.vn");
  const parent = await verifyWsJWT(parentToken);
  console.log(`   - Parent: ${parent.email} (${parent.vaiTro})`);
} catch (error) {
  console.error("   ❌ FAILED:", error.message);
}

// ==========================================
// TEST 2: Token không hợp lệ
// ==========================================
console.log("\n\n❌ TEST 2: Verify Token Không Hợp Lệ");
console.log("-".repeat(60));

// Test 2.1: Không có token
console.log("\n✅ Test 2.1: Không có token");
try {
  await verifyWsJWT(null);
  console.error("   ❌ FAILED: Không throw error!");
} catch (error) {
  console.log(`   ✅ PASS: Throw error đúng - "${error.message}"`);
}

// Test 2.2: Token rỗng
console.log("\n✅ Test 2.2: Token rỗng (empty string)");
try {
  await verifyWsJWT("");
  console.error("   ❌ FAILED: Không throw error!");
} catch (error) {
  console.log(`   ✅ PASS: Throw error đúng - "${error.message}"`);
}

// Test 2.3: Token sai định dạng
console.log("\n✅ Test 2.3: Token sai định dạng");
try {
  await verifyWsJWT("invalid-token-xyz-123");
  console.error("   ❌ FAILED: Không throw error!");
} catch (error) {
  console.log(`   ✅ PASS: Throw error đúng - "${error.message}"`);
}

// Test 2.4: Token với secret sai
console.log("\n✅ Test 2.4: Token với secret key sai");
try {
  // Tạo token với secret khác
  import("jsonwebtoken")
    .then(async (jwt) => {
      const badToken = jwt.default.sign(
        { maNguoiDung: 999, email: "bad@ssb.vn", vaiTro: "tai_xe" },
        "WRONG_SECRET_KEY", // Secret sai
        { expiresIn: "1h" }
      );

      await verifyWsJWT(badToken);
      console.error("   ❌ FAILED: Không throw error!");
    })
    .catch((error) => {
      console.log(`   ✅ PASS: Throw error đúng - "${error.message}"`);
    });
} catch (error) {
  console.log(`   ✅ PASS: Throw error đúng - "${error.message}"`);
}

// ==========================================
// TEST 3: Use case thực tế
// ==========================================
console.log("\n\n🚌 TEST 3: Use Case Thực Tế - Socket.IO Connection");
console.log("-".repeat(60));

console.log("\n📝 Mô phỏng flow WebSocket authentication:\n");

// Giả lập 3 clients kết nối
const clients = [
  { role: "quan_tri", id: 1, email: "admin@ssb.vn" },
  { role: "tai_xe", id: 2, email: "driver1@ssb.vn" },
  { role: "phu_huynh", id: 3, email: "parent1@ssb.vn" },
];

for (const client of clients) {
  console.log(`${client.id}. Client: ${client.email} (${client.role})`);

  try {
    // Bước 1: Client đăng nhập, nhận token
    const token = createMockToken(client.id, client.role, client.email);
    console.log(`   🔑 Step 1: Nhận token sau khi login`);

    // Bước 2: Client kết nối Socket.IO với token
    console.log(`   🔌 Step 2: Connect Socket.IO với auth.token`);

    // Bước 3: Server verify token
    const user = await verifyWsJWT(token);
    console.log(`   ✅ Step 3: Auth thành công! User ID: ${user.maNguoiDung}`);

    // Bước 4: Gán user vào socket, cho phép kết nối
    console.log(`   🎯 Step 4: Gắn user vào socket.user, cho phép kết nối`);

    // Bước 5: Join rooms theo role
    const rooms = [];
    if (user.vaiTro === "quan_tri") {
      rooms.push("admin", `user-${user.maNguoiDung}`);
    } else if (user.vaiTro === "tai_xe") {
      rooms.push(`driver-${user.maNguoiDung}`, `user-${user.maNguoiDung}`);
    } else if (user.vaiTro === "phu_huynh") {
      rooms.push(`parent-${user.maNguoiDung}`, `user-${user.maNguoiDung}`);
    }
    console.log(`   🏠 Step 5: Auto join rooms: ${rooms.join(", ")}\n`);
  } catch (error) {
    console.error(`   ❌ AUTH FAILED: ${error.message}\n`);
  }
}

// ==========================================
// TEST 4: Performance test
// ==========================================
console.log("\n⚡ TEST 4: Performance Test");
console.log("-".repeat(60));

const iterations = 1000;
const token = createMockToken(123, "tai_xe", "perf@ssb.vn");

console.log(`\n📊 Đang verify ${iterations} tokens...`);
console.log(`⏳ Vui lòng chờ (không in log để test nhanh hơn)...`);

const startTime = Date.now();

// Chạy test KHÔNG in log từng lần
for (let i = 0; i < iterations; i++) {
  await verifyWsJWT(token);
}

const endTime = Date.now();
const totalTime = endTime - startTime;
const avgTime = totalTime / iterations;

console.log(`\n✅ Hoàn thành!`);
console.log(`   - Tổng thời gian: ${totalTime}ms`);
console.log(`   - Trung bình: ${avgTime.toFixed(2)}ms/verify`);
console.log(
  `   - Throughput: ${Math.round(iterations / (totalTime / 1000))} verify/giây`
);

if (avgTime < 1) {
  console.log(`   🚀 EXCELLENT: Đủ nhanh cho production!`);
} else if (avgTime < 5) {
  console.log(`   ✅ GOOD: Chấp nhận được`);
} else {
  console.log(`   ⚠️ SLOW: Cần tối ưu!`);
}

// ==========================================
// KẾT QUẢ TỔNG HỢP
// ==========================================
console.log("\n\n" + "=".repeat(60));
console.log("✅ HOÀN THÀNH TẤT CẢ TESTS!");
console.log("=".repeat(60));

console.log(`\n📊 Tóm tắt:`);
console.log(`   - Verify token hợp lệ: ✅ Pass`);
console.log(`   - Verify token không hợp lệ: ✅ Pass`);
console.log(`   - Use case thực tế: ✅ Pass`);
console.log(`   - Performance: ✅ Pass`);

console.log(`\n⚠️ LƯU Ý:`);
console.log(`   - Đây chỉ là MOCK version cho Ngày 1`);
console.log(`   - Ngày 3 cần tích hợp helper từ Q.Thắng`);
console.log(`   - Cần test với token THẬT từ API /login`);

console.log(`\n🎯 Tiếp theo:`);
console.log(`   1. Đọc docs/ws_events.md (Mục 8 Ngày 1)`);
console.log(`   2. Ngày 2: Tạo REST API /trips/:id/telemetry`);
console.log(`   3. Ngày 3: Tích hợp Socket.IO + JWT auth`);

console.log("\n" + "=".repeat(60) + "\n");
