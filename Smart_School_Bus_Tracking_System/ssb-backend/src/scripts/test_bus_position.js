import { io } from "socket.io-client";
import { createMockToken } from "../utils/wsAuth.js";

const SERVER_URL = "http://localhost:4000";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🧪 TEST SỰ KIỆN BUS_POSITION_UPDATE (Nhiệm vụ Ngày 3)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * MỤC ĐÍCH:
 * Test sự kiện tài xế gửi vị trí GPS của xe bus theo thời gian thực
 *
 * KỊCH BẢN TEST:
 * 1. Tài xế kết nối Socket.IO với token
 * 2. Tài xế join vào room "trip-42" (chuyến đi số 42)
 * 3. Phụ huynh cũng join room "trip-42"
 * 4. Tài xế gửi vị trí GPS mỗi 3 giây (giả lập xe đang chạy)
 * 5. Phụ huynh nhận vị trí realtime và hiển thị
 */

async function testBusPosition() {
  console.log("\n" + "═".repeat(70));
  console.log("🚌 TEST SỰ KIỆN BUS_POSITION_UPDATE");
  console.log("═".repeat(70));

  // ─────────────────────────────────────────────────────────────────────────
  // 1️⃣ TẠO KẾT NỐI TÀI XẾ (Driver)
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n👨‍✈️ Tạo kết nối tài xế...");
  const driverToken = createMockToken(1, "tai_xe", "driver01@ssb.vn");
  const driverSocket = io(SERVER_URL, {
    auth: { token: driverToken },
    transports: ["websocket"],
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 2️⃣ TẠO KẾT NỐI PHỤ HUYNH (Parent) - để test nhận được vị trí
  // ─────────────────────────────────────────────────────────────────────────
  console.log("👨‍👩‍👧 Tạo kết nối phụ huynh...");
  const parentToken = createMockToken(2, "phu_huynh", "parent01@ssb.vn");
  const parentSocket = io(SERVER_URL, {
    auth: { token: parentToken },
    transports: ["websocket"],
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 3️⃣ VỊ TRÍ GIẢ (giả lập xe đang chạy từ điểm A đến điểm B)
  // ─────────────────────────────────────────────────────────────────────────
  const fakePositions = [
    { lat: 21.0285, lng: 105.8542, speed: 30, heading: 90 }, // Hoàn Kiếm
    { lat: 21.0295, lng: 105.8552, speed: 35, heading: 95 }, // Đang di chuyển
    { lat: 21.0305, lng: 105.8562, speed: 40, heading: 92 }, // Tiếp tục
    { lat: 21.0315, lng: 105.8572, speed: 25, heading: 88 }, // Giảm tốc
    { lat: 21.0325, lng: 105.8582, speed: 0, heading: 90 }, // Dừng lại
  ];

  let positionIndex = 0;
  let intervalId = null;

  // ─────────────────────────────────────────────────────────────────────────
  // 4️⃣ XỬ LÝ SỰ KIỆN TÀI XẾ
  // ─────────────────────────────────────────────────────────────────────────
  driverSocket.on("connect", () => {
    console.log("✅ Tài xế đã kết nối (Socket ID: " + driverSocket.id + ")");
  });

  driverSocket.on("welcome", (data) => {
    console.log(`✅ Tài xế nhận welcome: ${data.message}`);
    console.log(`   Rooms: ${data.rooms.join(", ")}`);

    // Join vào trip-42
    console.log("\n🚪 Tài xế join trip-42...");
    driverSocket.emit("join_trip", 42);
  });

  driverSocket.on("trip_joined", (data) => {
    console.log(`✅ Tài xế đã join ${data.room}`);

    // Bắt đầu gửi vị trí mỗi 3 giây
    console.log("\n📍 Bắt đầu gửi vị trí GPS mỗi 3 giây...\n");

    intervalId = setInterval(() => {
      if (positionIndex >= fakePositions.length) {
        console.log("\n🏁 Đã gửi hết vị trí giả, dừng test");
        clearInterval(intervalId);

        // Ngắt kết nối sau 2 giây
        setTimeout(() => {
          console.log("\n🔌 Ngắt kết nối tài xế và phụ huynh...");
          driverSocket.disconnect();
          parentSocket.disconnect();
        }, 2000);

        return;
      }

      const position = fakePositions[positionIndex];
      const payload = {
        tripId: 42,
        busId: 5,
        lat: position.lat,
        lng: position.lng,
        speed: position.speed,
        heading: position.heading,
        timestamp: new Date().toISOString(),
      };

      console.log(`📤 [Tài xế] Gửi vị trí #${positionIndex + 1}:`);
      console.log(`   GPS: ${position.lat}, ${position.lng}`);
      console.log(`   Tốc độ: ${position.speed} km/h`);

      driverSocket.emit("bus_position_update", payload);
      positionIndex++;
    }, 3000);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 5️⃣ XỬ LÝ SỰ KIỆN PHỤ HUYNH
  // ─────────────────────────────────────────────────────────────────────────
  parentSocket.on("connect", () => {
    console.log("✅ Phụ huynh đã kết nối (Socket ID: " + parentSocket.id + ")");
  });

  parentSocket.on("welcome", (data) => {
    console.log(`✅ Phụ huynh nhận welcome: ${data.message}`);

    // Phụ huynh cũng join trip-42 để nhận vị trí
    console.log("🚪 Phụ huynh join trip-42...");
    parentSocket.emit("join_trip", 42);
  });

  parentSocket.on("trip_joined", (data) => {
    console.log(`✅ Phụ huynh đã join ${data.room}`);
  });

  // QUAN TRỌNG: Phụ huynh lắng nghe sự kiện bus_position_update
  parentSocket.on("bus_position_update", (data) => {
    console.log(`\n📥 [Phụ huynh] Nhận vị trí xe bus:`);
    console.log(`   Trip ID: ${data.tripId}, Bus ID: ${data.busId}`);
    console.log(`   GPS: ${data.lat}, ${data.lng}`);
    console.log(`   Tốc độ: ${data.speed} km/h, Hướng: ${data.heading}°`);
    console.log(`   Thời gian: ${data.timestamp}`);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 6️⃣ XỬ LÝ LỖI
  // ─────────────────────────────────────────────────────────────────────────
  driverSocket.on("connect_error", (error) => {
    console.error(`\n❌ [Tài xế] Lỗi kết nối: ${error.message}`);
    process.exit(1);
  });

  parentSocket.on("connect_error", (error) => {
    console.error(`\n❌ [Phụ huynh] Lỗi kết nối: ${error.message}`);
    process.exit(1);
  });

  driverSocket.on("disconnect", (reason) => {
    console.log(`\n🔴 Tài xế ngắt kết nối: ${reason}`);
  });

  parentSocket.on("disconnect", (reason) => {
    console.log(`🔴 Phụ huynh ngắt kết nối: ${reason}`);

    console.log("\n" + "═".repeat(70));
    console.log("🎉 TEST HOÀN TẤT!");
    console.log("═".repeat(70));
    console.log("\n✅ Nhiệm vụ Ngày 3 - Mục (3) ĐÃ XONG:");
    console.log("   → Phát sự kiện bus_position_update với data giả");
    console.log("   → Phụ huynh nhận được vị trí realtime");
    console.log("\n");
    process.exit(0);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 7️⃣ TIMEOUT (tránh test chạy mãi)
  // ─────────────────────────────────────────────────────────────────────────
  setTimeout(() => {
    console.log("\n⏱️  TIMEOUT: Test chạy quá 30 giây, dừng lại");
    if (intervalId) clearInterval(intervalId);
    driverSocket.disconnect();
    parentSocket.disconnect();
    process.exit(1);
  }, 30000);
}

// ═══════════════════════════════════════════════════════════════════════════
// CHẠY TEST
// ═══════════════════════════════════════════════════════════════════════════
testBusPosition();

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📖 HƯỚNG DẪN SỬ DỤNG
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * CÁCH CHẠY:
 * 1. Mở terminal #1, chạy server:
 *    cd ssb-backend
 *    npm run dev
 *
 * 2. Mở terminal #2, chạy test:
 *    node src/scripts/test_bus_position.js
 *
 * ───────────────────────────────────────────────────────────────────────────
 * KẾT QUẢ MONG ĐỢI:
 * ───────────────────────────────────────────────────────────────────────────
 *
 * ✅ Tài xế đã kết nối
 * ✅ Phụ huynh đã kết nối
 * ✅ Tài xế join trip-42
 * ✅ Phụ huynh join trip-42
 * 📤 [Tài xế] Gửi vị trí #1: 21.0285, 105.8542
 * 📥 [Phụ huynh] Nhận vị trí xe bus: 21.0285, 105.8542
 * (lặp lại cho 5 vị trí)
 * 🎉 TEST HOÀN TẤT!
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */
