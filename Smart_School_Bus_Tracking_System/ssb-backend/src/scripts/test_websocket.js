import { io } from "socket.io-client";
import { createMockToken } from "../utils/wsAuth.js";

const SERVER_URL = "http://localhost:4000";

async function testWebSocket() {
  console.log("=".repeat(60));
  console.log("🧪 BẮT ĐẦU TEST WEBSOCKET");
  console.log("=".repeat(60));

  const mockToken = createMockToken(1, "tai_xe", "driver01@ssb.vn");
  console.log("\n📝 Token giả đã tạo (để test)");

  console.log("\n🔌 Đang kết nối Socket.IO...");
  const socket = io(SERVER_URL, {
    auth: { token: mockToken },
    transports: ["websocket"],
  });

  socket.on("connect", () => {
    console.log("✅ Kết nối thành công!");
    console.log(`   Socket ID: ${socket.id}`); // socket.id là ID kết nối duy nhất của client
  });

  socket.on("welcome", (data) => { 
    console.log("\n👋 Nhận được tin nhắn chào mừng:");
    console.log(`   ${data.message}`);
    console.log(`   User ID: ${data.userId}`);
    console.log(`   Vai trò: ${data.role}`);
    console.log(`   Phòng đã join: ${data.rooms.join(", ")}`);

    console.log("\n🏓 Test 1: Ping/Pong");
    socket.emit("ping");
  });

  socket.on("pong", (data) => {
    console.log(`✅ Nhận pong! Timestamp: ${data.timestamp}`);

    console.log("\n🚪 Test 2: Join trip room");
    socket.emit("join_trip", 42);
  });

  socket.on("trip_joined", (data) => {
    console.log(`✅ Đã join trip ${data.tripId} (room: ${data.room})`);

    console.log("\n🚪 Test 3: Leave trip room");
    socket.emit("leave_trip", 42);
  });

  socket.on("trip_left", (data) => {
    console.log(`✅ Đã rời trip ${data.tripId}`);

    console.log("\n✅ TẤT CẢ TEST ĐÃ PASS!");
    console.log("\n🔌 Đang ngắt kết nối...");
    socket.disconnect();
  });

  socket.on("disconnect", (reason) => {
    console.log(`❌ Đã ngắt kết nối: ${reason}`);
    console.log("\n" + "=".repeat(60));
    console.log("🎉 TEST HOÀN TẤT!");
    console.log("=".repeat(60));
    process.exit(0);
  });

  socket.on("connect_error", (error) => {
    console.error(`\n❌ LỖI KẾT NỐI: ${error.message}`);
    console.log("\n💡 Có thể do:");
    console.log("   - Server chưa chạy (npm run dev)");
    console.log("   - Token không hợp lệ");
    console.log("   - Database chưa có user ID 1");
    process.exit(1);
  });

  setTimeout(() => {
    console.log("\n⏱️  TIMEOUT: Test chạy quá 10 giây, dừng lại");
    process.exit(1);
  }, 10000);
}

testWebSocket();

/**
 * 📚 HƯỚNG DẪN SỬ DỤNG
 *
 * Cách chạy test này:
 * 1. Mở terminal, chạy server: npm run dev
 * 2. Mở terminal khác, chạy test: node src/scripts/test_websocket.js
 *
 * Test này sẽ kiểm tra:
 * - Kết nối Socket.IO với JWT token
 * - Nhận welcome message từ server
 * - Gửi ping, nhận pong (kiểm tra connection)
 * - Join vào trip room
 * - Leave khỏi trip room
 * - Ngắt kết nối
 *
 * Nếu thành công, bạn sẽ thấy:
 * ✅ Kết nối thành công!
 * ✅ Nhận pong!
 * ✅ Đã join trip 42
 * ✅ Đã rời trip 42
 * 🎉 TEST HOÀN TẤT!
 *
 * Nếu thất bại:
 * ❌ LỖI KẾT NỐI: ...
 *
 * Lưu ý:
 * - Test dùng token GIẢ (createMockToken)
 * - Database phải có user ID = 1
 * - Server phải chạy ở localhost:4000
 * - Chỉ dùng trong development (không dùng production)
 */
