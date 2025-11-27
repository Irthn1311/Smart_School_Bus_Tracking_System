import { io } from "socket.io-client";
import { createMockToken } from "../utils/wsAuth.js";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🎮 GPS DEMO TOOL - Mô phỏng xe bus chạy trên tuyến
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 🎯 MỤC ĐÍCH:
 * - Demo cho FE mà không cần GPS thật
 * - Test geofence (approach_stop)
 * - Test delay alert
 * - Test trip lifecycle
 *
 * 🚀 CÁCH CHẠY:
 * node src/scripts/ws-demo.js
 *
 * @author Nguyễn Tuấn Tài
 * @date 2025-10-29
 */

const SERVER_URL = "http://localhost:4000";

// ═══════════════════════════════════════════════════════════════════════════
// 🗺️ POLYLINE - Danh sách tọa độ mô phỏng tuyến đường
// ═══════════════════════════════════════════════════════════════════════════
// Đây là tuyến từ Hoàn Kiếm → Đống Đa (Hà Nội)
const ROUTE_POLYLINE = [
  { lat: 21.0285, lng: 105.8542, speed: 0, heading: 90 }, // Điểm xuất phát
  { lat: 21.029, lng: 105.8548, speed: 20, heading: 92 }, // Tăng tốc
  { lat: 21.0295, lng: 105.8552, speed: 30, heading: 95 }, // Tốc độ ổn định
  { lat: 21.03, lng: 105.8557, speed: 35, heading: 93 }, // Tốc độ cao
  { lat: 21.0305, lng: 105.8562, speed: 40, heading: 92 }, // Đường thẳng
  { lat: 21.031, lng: 105.8567, speed: 35, heading: 88 }, // Giảm tốc
  { lat: 21.0315, lng: 105.8572, speed: 25, heading: 90 }, // Gần điểm dừng 1
  { lat: 21.0318, lng: 105.8575, speed: 15, heading: 85 }, // Đang dừng
  { lat: 21.032, lng: 105.8578, speed: 0, heading: 90 }, // ĐIỂM DỪNG 1
  { lat: 21.0322, lng: 105.858, speed: 10, heading: 92 }, // Khởi động lại
  { lat: 21.0325, lng: 105.8582, speed: 25, heading: 95 }, // Tăng tốc
  { lat: 21.033, lng: 105.8587, speed: 35, heading: 93 }, // Tốc độ cao
  { lat: 21.0335, lng: 105.8592, speed: 30, heading: 88 }, // Giảm tốc
  { lat: 21.034, lng: 105.8597, speed: 20, heading: 90 }, // Gần điểm dừng 2
  { lat: 21.0343, lng: 105.86, speed: 10, heading: 85 }, // Đang dừng
  { lat: 21.0345, lng: 105.8602, speed: 0, heading: 90 }, // ĐIỂM DỪNG 2
  { lat: 21.0348, lng: 105.8605, speed: 15, heading: 92 }, // Khởi động
  { lat: 21.035, lng: 105.8608, speed: 30, heading: 90 }, // Về điểm cuối
  { lat: 21.0355, lng: 105.8612, speed: 20, heading: 88 }, // Giảm tốc
  { lat: 21.0358, lng: 105.8615, speed: 10, heading: 85 }, // Sắp đến
  { lat: 21.036, lng: 105.8617, speed: 0, heading: 90 }, // ĐIỂM CUỐI
];

// ═══════════════════════════════════════════════════════════════════════════
// 🎬 MAIN DEMO FUNCTION
// ═══════════════════════════════════════════════════════════════════════════
async function runDemo() {
  console.log("\n" + "═".repeat(70));
  console.log("🎮 GPS DEMO TOOL - Mô phỏng xe bus chạy");
  console.log("═".repeat(70));

  // ─────────────────────────────────────────────────────────────────────────
  // 1️⃣ TẠO KẾT NỐI TÀI XẾ
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n👨‍✈️ Đang kết nối tài xế...");
  const driverToken = createMockToken(1, "tai_xe", "driver01@ssb.vn");
  const driverSocket = io(SERVER_URL, {
    auth: { token: driverToken },
    transports: ["websocket"],
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 2️⃣ TẠO KẾT NỐI PHỤ HUYNH (để xem events)
  // ─────────────────────────────────────────────────────────────────────────
  console.log("👨‍👩‍👧 Đang kết nối phụ huynh...");
  const parentToken = createMockToken(2, "phu_huynh", "parent01@ssb.vn");
  const parentSocket = io(SERVER_URL, {
    auth: { token: parentToken },
    transports: ["websocket"],
  });

  let intervalId = null;
  let currentIndex = 0;
  const TRIP_ID = 2; // ID chuyến đi demo (trip "dang_chay" trong DB)

  // ─────────────────────────────────────────────────────────────────────────
  // 3️⃣ XỬ LÝ SỰ KIỆN TÀI XẾ
  // ─────────────────────────────────────────────────────────────────────────
  driverSocket.on("connect", () => {
    console.log("✅ Tài xế đã kết nối (Socket ID: " + driverSocket.id + ")");
  });

  driverSocket.on("welcome", (data) => {
    console.log(`✅ Tài xế nhận welcome: ${data.message}`);
    console.log("\n🚪 Tài xế join trip-2...");
    driverSocket.emit("join_trip", TRIP_ID);
  });

  driverSocket.on("trip_joined", (data) => {
    console.log(`✅ Tài xế đã join ${data.room}`);
    startGPSStream();
  });

  // Nhận ACK từ server
  driverSocket.on("gps_ack", (data) => {
    if (data.success) {
      console.log(`  ✅ GPS ACK: ${data.events.join(", ")}`);
    } else {
      console.error(`  ❌ GPS Error: ${data.error}`);
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 4️⃣ XỬ LÝ SỰ KIỆN PHỤ HUYNH
  // ─────────────────────────────────────────────────────────────────────────
  parentSocket.on("connect", () => {
    console.log("✅ Phụ huynh đã kết nối (Socket ID: " + parentSocket.id + ")");
  });

  parentSocket.on("welcome", (data) => {
    console.log(`✅ Phụ huynh nhận welcome: ${data.message}`);
    console.log("🚪 Phụ huynh join trip-2...");
    parentSocket.emit("join_trip", TRIP_ID);
  });

  parentSocket.on("trip_joined", (data) => {
    console.log(`✅ Phụ huynh đã join ${data.room}\n`);
  });

  // Nhận vị trí xe
  parentSocket.on("bus_position_update", (data) => {
    console.log(
      `\n📍 [Parent] Nhận vị trí: (${data.lat}, ${data.lng}) @ ${data.speed} km/h`
    );
  });

  // Nhận cảnh báo đến gần điểm dừng
  parentSocket.on("approach_stop", (data) => {
    console.log(
      `\n🎯 [Parent] ⚡ XE GẦN ĐIỂM DỪNG "${data.stopName}" (${data.distance_m}m)`
    );
  });

  // Nhận cảnh báo trễ
  parentSocket.on("delay_alert", (data) => {
    console.log(`\n⏰ [Parent] ⚠️ XE BỊ TRỄ ${data.delay_min} PHÚT`);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 5️⃣ HÀM GỬI GPS THEO POLYLINE
  // ─────────────────────────────────────────────────────────────────────────
  function startGPSStream() {
    console.log("\n" + "─".repeat(70));
    console.log("🚀 BẮT ĐẦU GỬI GPS (mỗi 3 giây)");
    console.log("─".repeat(70));

    intervalId = setInterval(() => {
      if (currentIndex >= ROUTE_POLYLINE.length) {
        console.log("\n🏁 ĐÃ ĐẾN ĐIỂM CUỐI - Dừng demo");
        stopDemo();
        return;
      }

      const point = ROUTE_POLYLINE[currentIndex];

      console.log(
        `\n📤 [Driver] Gửi GPS #${currentIndex + 1}/${ROUTE_POLYLINE.length}`
      );
      console.log(`   📍 Vị trí: (${point.lat}, ${point.lng})`);
      console.log(
        `   🚗 Tốc độ: ${point.speed} km/h, Hướng: ${point.heading}°`
      );

      // Gửi qua WebSocket event driver_gps
      driverSocket.emit("driver_gps", {
        tripId: TRIP_ID,
        lat: point.lat,
        lng: point.lng,
        speed: point.speed,
        heading: point.heading,
      });

      currentIndex++;
    }, 3000); // Mỗi 3 giây
  }

  function stopDemo() {
    if (intervalId) {
      clearInterval(intervalId);
    }

    console.log("\n🔌 Ngắt kết nối...");

    setTimeout(() => {
      driverSocket.disconnect();
      parentSocket.disconnect();

      console.log("\n" + "═".repeat(70));
      console.log("🎉 DEMO HOÀN TẤT!");
      console.log("═".repeat(70));
      console.log("\n✅ Đã test:");
      console.log("   - Gửi GPS qua WebSocket (driver_gps)");
      console.log("   - Nhận vị trí realtime (bus_position_update)");
      console.log("   - Phát hiện gần điểm dừng (approach_stop)");
      console.log("   - Cảnh báo trễ (delay_alert - nếu có)\n");

      process.exit(0);
    }, 2000);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 6️⃣ XỬ LÝ LỖI
  // ─────────────────────────────────────────────────────────────────────────
  driverSocket.on("connect_error", (error) => {
    console.error(`\n❌ [Driver] Lỗi kết nối: ${error.message}`);
    process.exit(1);
  });

  parentSocket.on("connect_error", (error) => {
    console.error(`\n❌ [Parent] Lỗi kết nối: ${error.message}`);
    process.exit(1);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 7️⃣ TIMEOUT
  // ─────────────────────────────────────────────────────────────────────────
  setTimeout(() => {
    console.log("\n⏱️  TIMEOUT: Demo chạy quá 90 giây, dừng lại");
    stopDemo();
  }, 90000);
}

// ═══════════════════════════════════════════════════════════════════════════
// 🚀 RUN DEMO
// ═══════════════════════════════════════════════════════════════════════════
runDemo();

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📖 HƯỚNG DẪN SỬ DỤNG
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * CÁCH CHẠY:
 * 1. Terminal #1: npm run dev (chạy server)
 * 2. Terminal #2: node src/scripts/ws-demo.js
 *
 * KẾT QUẢ MONG ĐỢI:
 * - Tài xế và phụ huynh kết nối thành công
 * - Gửi 21 điểm GPS (mỗi 3 giây)
 * - Phụ huynh nhận vị trí realtime
 * - Emit event "approach_stop" khi gần điểm dừng
 * - Emit event "delay_alert" nếu xe trễ
 *
 * TÙYCHỈNH:
 * - Thay đổi ROUTE_POLYLINE để test tuyến khác
 * - Thay đổi TRIP_ID để test chuyến khác
 * - Thay đổi interval (3000ms) để tăng/giảm tốc độ demo
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */
