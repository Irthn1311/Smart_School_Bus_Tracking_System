import { Server } from "socket.io";
import { verifyWsJWT } from "../utils/wsAuth.js";
import TelemetryService from "../services/telemetryService.js";
import ChuyenDiModel from "../models/ChuyenDiModel.js";
import LichTrinhModel from "../models/LichTrinhModel.js";
import config from "../config/env.js";

export function initSocketIO(httpServer) {
  console.log("🚀 Initializing Socket.IO server...");

  // Get allowed origins from config (supports multiple origins)
  const allowedOrigins = Array.isArray(config.frontend.origin) 
    ? config.frontend.origin 
    : [config.frontend.origin];

  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps)
        if (!origin) {
          return callback(null, true);
        }
        
        // Check if origin is in allowed list
        const isAllowed = allowedOrigins.some(allowed => {
          if (typeof allowed === 'string') {
            // Support wildcard patterns
            const pattern = allowed.replace(/\*/g, '.*');
            const regex = new RegExp(`^${pattern}$`);
            return regex.test(origin) || allowed === origin;
          }
          return false;
        });
        
        if (isAllowed) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    },
    transports: ["websocket", "polling"],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  console.log("✅ Socket.IO server created");

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      const user = await verifyWsJWT(token);
      socket.data.user = user;

      if (process.env.NODE_ENV === "development") {
        console.log(
          `🔐 Auth OK: ${user.email} (${user.vaiTro}) - Socket ID: ${socket.id}`
        );
      }

      next();
    } catch (error) {
      console.error(`🚫 Auth failed: ${error.message}`);
      next(new Error(`Authentication failed: ${error.message}`));
    }
  });

  console.log("✅ Authentication middleware registered");

  io.on("connection", (socket) => {
    const user = socket.data.user;

    console.log(
      `\n🟢 Client connected: ${user.email} (${user.vaiTro}) - Socket ID: ${socket.id}`
    );

    const userRoom = `user-${user.userId}`;
    socket.join(userRoom);
    console.log(`  ✅ Joined room: ${userRoom}`);

    // M0: Auto join role-based room
    const roleRoom = `role-${user.vaiTro}`;
    socket.join(roleRoom);
    console.log(`  ✅ Joined role room: ${roleRoom}`);

    socket.on("ping", () => {
      socket.emit("pong", { timestamp: Date.now() });
      console.log(`  🏓 Ping/pong with ${user.email}`);
    });

    socket.on("join_trip", (tripId) => {
      const tripRoom = `trip-${tripId}`;
      socket.join(tripRoom);
      console.log(`  ✅ ${user.email} joined ${tripRoom}`);
      socket.emit("trip_joined", { tripId, room: tripRoom });
    });

    socket.on("leave_trip", (tripId) => {
      const tripRoom = `trip-${tripId}`;
      socket.leave(tripRoom);
      console.log(`  ❌ ${user.email} left ${tripRoom}`);
      socket.emit("trip_left", { tripId, room: tripRoom });
    });

    // P2 Fix: Join/Leave route room for route_updated events
    socket.on("join_route", (routeId) => {
      const routeRoom = `route:${routeId}`;
      socket.join(routeRoom);
      console.log(`  ✅ ${user.email} joined ${routeRoom}`);
      socket.emit("route_joined", { routeId, room: routeRoom });
    });

    socket.on("leave_route", (routeId) => {
      const routeRoom = `route:${routeId}`;
      socket.leave(routeRoom);
      console.log(`  ❌ ${user.email} left ${routeRoom}`);
      socket.emit("route_left", { routeId, room: routeRoom });
    });

    // ═══════════════════════════════════════════════════════════════════════
    // 🚌 SỰ KIỆN: bus_position_update (Nhiệm vụ Ngày 3)
    // ═══════════════════════════════════════════════════════════════════════
    // Tài xế gửi vị trí GPS của xe bus → Server broadcast cho phụ huynh
    socket.on("bus_position_update", (data) => {
      console.log(
        `  📍 GPS update từ ${user.email}: Trip ${data.tripId}, Bus ${data.busId}`
      );
      console.log(
        `     Tọa độ: ${data.lat}, ${data.lng} | Tốc độ: ${data.speed} km/h`
      );

      // Broadcast vị trí đến tất cả người trong room trip-{tripId}
      // (bao gồm cả phụ huynh và admin đang theo dõi)
      io.to(`trip-${data.tripId}`).emit("bus_position_update", {
        ...data,
        driverEmail: user.email,
        driverName: user.hoTen || user.email,
      });
    });

    // ═══════════════════════════════════════════════════════════════════════
    // 📡 SỰ KIỆN: driver_gps & gps:update (M4-M6: Standardized event name)
    // ═══════════════════════════════════════════════════════════════════════
    // Tài xế gửi vị trí GPS → Server xử lý geofence & delay → Emit events
    // M4-M6: Support both "driver_gps" (legacy) and "gps:update" (standard)
    const handleGPSUpdate = async (data) => {
      try {
        const { tripId, lat, lng, speed, speedKph, heading, tsClient } = data;

        // M4-M6: Normalize field names (support both formats)
        const normalizedSpeed = speedKph || speed || 0;
        const normalizedHeading = heading || 0;
        const clientTimestamp = tsClient || new Date().toISOString();

        // M4-M6: Verify driver owns this trip
        const trip = await ChuyenDiModel.getById(tripId);
        if (!trip) {
          throw new Error("Trip not found");
        }

        const schedule = await LichTrinhModel.getById(trip.maLichTrinh);
        if (!schedule) {
          throw new Error("Schedule not found");
        }

        // M4-M6: Only driver assigned to trip can send GPS
        if (user.vaiTro !== "tai_xe" || schedule.maTaiXe !== user.userId) {
          throw new Error("Only assigned driver can send GPS updates");
        }

        console.log(
          `  📡 [gps:update] ${user.email}: Trip ${tripId} @ (${lat}, ${lng}) Speed: ${normalizedSpeed} km/h`
        );

        // Gọi TelemetryService để xử lý
        const result = await TelemetryService.updatePosition(
          tripId,
          { lat, lng, speed: normalizedSpeed, heading: normalizedHeading },
          io
        );

        // M4-M6: Broadcast to bus-{busId} room as well
        if (schedule.maXe) {
          io.to(`bus-${schedule.maXe}`).emit("bus_position_update", {
            busId: schedule.maXe,
            tripId,
            lat,
            lng,
            speed: normalizedSpeed,
            heading: normalizedHeading,
            timestamp: result.position.timestamp,
          });
        }

        // Gửi ACK về driver
        socket.emit("gps_ack", {
          success: true,
          timestamp: result.position.timestamp,
          events: result.events,
        });
      } catch (error) {
        console.error(`  ❌ [gps:update] Error:`, error.message);
        socket.emit("gps_ack", {
          success: false,
          error: error.message,
        });
      }
    };

    // Support both event names
    socket.on("driver_gps", handleGPSUpdate); // Legacy
    socket.on("gps:update", handleGPSUpdate); // M4-M6: Standardized

    socket.on("disconnect", (reason) => {
      console.log(
        `\n🔴 Client disconnected: ${user.email} - Reason: ${reason}`
      );
    });

    socket.emit("welcome", {
      message: `Xin chào ${user.email}! Bạn đã kết nối thành công.`,
      userId: user.userId,
      role: user.vaiTro,
      rooms: Array.from(socket.rooms),
      timestamp: new Date().toISOString(),
    });

    // M0: auth/hello event để test ACL
    socket.on("auth/hello", () => {
      const helloData = {
        userId: user.userId,
        email: user.email,
        role: user.vaiTro,
        timestamp: new Date().toISOString(),
        message: `Hello from server! You are authenticated as ${user.email}`,
      };
      // Emit về user room và current socket
      io.to(`user-${user.userId}`).emit("auth/hello", helloData);
      socket.emit("auth/hello", helloData);
      console.log(`  👋 [auth/hello] Sent to user-${user.userId}`);
    });
  });

  console.log("✅ Connection handler registered\n");

  return io;
}

let ioInstance = null;

export function getIO() {
  if (!ioInstance) {
    throw new Error("Socket.IO chưa được khởi tạo! Gọi initSocketIO() trước.");
  }
  return ioInstance;
}

export function initSocketIOWithGlobal(httpServer) {
  ioInstance = initSocketIO(httpServer);
  return ioInstance;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📚 HƯỚNG DẪN SỬ DỤNG FILE NÀY
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 🎯 MỤC ĐÍCH:
 * File này tạo server Socket.IO để app có thể chat/gửi dữ liệu theo thời gian thực.
 * Giống như Zalo/Facebook Messenger, khi người khác gửi tin, bạn nhận ngay lập tức.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * 🔧 CÁC THÀNH PHẦN CHÍNH
 * ───────────────────────────────────────────────────────────────────────────
 *
 * 1️⃣ initSocketIO(httpServer)
 *    └─ Hàm tạo server Socket.IO
 *    └─ Nhận vào: HTTP server từ Express
 *    └─ Trả về: Socket.IO instance để dùng ở file khác
 *
 * 2️⃣ io.use() - Kiểm tra token
 *    └─ Chạy TRƯỚC KHI cho phép client kết nối
 *    └─ Client gửi token → Server kiểm tra token → Cho phép/Từ chối
 *    └─ Giống như bảo vệ kiểm tra thẻ trước khi vào cửa
 *
 * 3️⃣ io.on("connection") - Khi có người kết nối
 *    └─ Chạy MỖI KHI có client kết nối thành công
 *    └─ Tự động cho user vào phòng riêng (user-123)
 *    └─ Đăng ký các sự kiện: ping, join_trip, leave_trip
 *    └─ Gửi tin nhắn chào mừng
 *
 * ───────────────────────────────────────────────────────────────────────────
 * 🏠 ROOMS LÀ GÌ? (KHÁI NIỆM QUAN TRỌNG)
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Room = Phòng/Kênh chat
 * - Giống như group chat trong Zalo
 * - Khi gửi tin vào room, CHỈ người trong room đó nhận được
 * - 1 người có thể vào nhiều room
 *
 * Ví dụ:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ Room "user-123"     → Phòng riêng của user 123                  │
 * │ Room "bus-5"        → Phòng của xe buýt số 5                    │
 * │ Room "trip-42"      → Phòng của chuyến đi số 42                 │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * Cách gửi tin:
 * io.to("bus-5").emit("bus_moved", data)
 * └─ Gửi event "bus_moved" vào room "bus-5"
 * └─ CHỈ người trong room bus-5 nhận được
 * └─ Những người khác KHÔNG nhận được
 *
 * ───────────────────────────────────────────────────────────────────────────
 * 🎪 CÁC SỰ KIỆN (EVENTS)
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Client → Server (Client gửi):
 * ┌────────────────┬─────────────────────────────────────────────────┐
 * │ Event          │ Mô tả                                           │
 * ├────────────────┼─────────────────────────────────────────────────┤
 * │ ping           │ Client hỏi: "Server còn sống không?"            │
 * │ join_trip      │ Client xin vào phòng chuyến đi                  │
 * │ leave_trip     │ Client xin rời phòng chuyến đi                  │
 * └────────────────┴─────────────────────────────────────────────────┘
 *
 * Server → Client (Server gửi):
 * ┌────────────────┬─────────────────────────────────────────────────┐
 * │ Event          │ Mô tả                                           │
 * ├────────────────┼─────────────────────────────────────────────────┤
 * │ pong           │ Server trả lời: "Tôi vẫn sống!"                 │
 * │ trip_joined    │ Server thông báo: "Bạn đã vào phòng trip"       │
 * │ trip_left      │ Server thông báo: "Bạn đã rời phòng trip"       │
 * │ welcome        │ Server chào mừng khi kết nối                    │
 * └────────────────┴─────────────────────────────────────────────────┘
 *
 * ───────────────────────────────────────────────────────────────────────────
 * 💻 CODE MẪU CHO CLIENT (FRONTEND)
 * ───────────────────────────────────────────────────────────────────────────
 *
 * import { io } from "socket.io-client";
 *
 * // Lấy token từ localStorage (đã login trước đó)
 * const token = localStorage.getItem("token");
 *
 * // Kết nối đến server
 * const socket = io("http://localhost:4000", {
 *   auth: { token }
 * });
 *
 * // Lắng nghe sự kiện kết nối thành công
 * socket.on("connect", () => {
 *   console.log("✅ Đã kết nối Socket.IO");
 * });
 *
 * // Lắng nghe tin nhắn chào mừng
 * socket.on("welcome", (data) => {
 *   console.log(data.message); // "Xin chào driver@ssb.vn! ..."
 * });
 *
 * // Gửi ping để test
 * socket.emit("ping");
 *
 * // Nhận pong
 * socket.on("pong", (data) => {
 *   console.log("Nhận pong!", data.timestamp);
 * });
 *
 * // Xin vào phòng chuyến đi 42
 * socket.emit("join_trip", 42);
 *
 * // Nhận thông báo đã vào phòng
 * socket.on("trip_joined", (data) => {
 *   console.log(`Đã vào ${data.room}`);
 * });
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ⚙️ CẤU HÌNH QUAN TRỌNG
 * ───────────────────────────────────────────────────────────────────────────
 *
 * cors.origin: "http://localhost:3000"
 * └─ Cho phép frontend từ địa chỉ này kết nối
 * └─ Giống như whitelist trong bảo vệ
 *
 * cors.credentials: true
 * └─ Cho phép gửi cookie và token
 * └─ Cần thiết để xác thực người dùng
 *
 * transports: ["websocket", "polling"]
 * └─ Ưu tiên dùng WebSocket (nhanh)
 * └─ Nếu WebSocket bị chặn → dùng polling (chậm hơn)
 *
 * pingTimeout: 60000 (60 giây)
 * └─ Nếu client không trả lời trong 60s → coi như mất kết nối
 * └─ Server sẽ tự ngắt kết nối
 *
 * pingInterval: 25000 (25 giây)
 * └─ Server gửi tin "ping" mỗi 25s để kiểm tra client còn sống không
 * └─ Client phải trả lời "pong"
 *
 * ───────────────────────────────────────────────────────────────────────────
 * 🔐 BẢO MẬT
 * ───────────────────────────────────────────────────────────────────────────
 *
 * 1. Token bắt buộc
 *    └─ Client PHẢI gửi token mới được kết nối
 *    └─ Token sai/hết hạn → bị từ chối
 *
 * 2. Kiểm tra user trong database
 *    └─ Token hợp lệ nhưng user bị xóa → từ chối
 *    └─ Account bị khóa → từ chối
 *
 * 3. Thông tin user được lưu trong socket.data.user
 *    └─ Mỗi event có thể kiểm tra user là ai
 *    └─ Tránh user giả mạo
 *
 * ───────────────────────────────────────────────────────────────────────────
 * 📖 CÁCH DÙNG TRONG SERVER.TS
 * ───────────────────────────────────────────────────────────────────────────
 *
 * import { initSocketIO } from './ws/index.js';
 * import { createServer } from 'http';
 * import express from 'express';
 *
 * const app = express();
 * const httpServer = createServer(app);
 *
 * // Khởi tạo Socket.IO
 * const io = initSocketIO(httpServer);
 *
 * // Lưu io để dùng ở file khác
 * app.set('io', io);
 *
 * // Chạy server
 * httpServer.listen(4000, () => {
 *   console.log('Server chạy ở port 4000');
 * });
 *
 * ───────────────────────────────────────────────────────────────────────────
 * 🎯 DÙNG IO Ở FILE KHÁC (VD: CONTROLLER)
 * ───────────────────────────────────────────────────────────────────────────
 *
 * // src/controllers/tripController.js
 *
 * export async function startTrip(req, res) {
 *   const tripId = req.params.id;
 *
 *   // Logic khởi hành chuyến xe...
 *
 *   // Lấy io instance
 *   const io = req.app.get("io");
 *
 *   // Gửi thông báo đến tất cả người trong phòng trip-42
 *   io.to(`trip-${tripId}`).emit("trip_started", {
 *     tripId,
 *     timestamp: new Date()
 *   });
 *
 *   res.json({ success: true });
 * }
 *
 * ───────────────────────────────────────────────────────────────────────────
 * 🔜 CÔNG VIỆC TIẾP THEO (NGÀY 4)
 * ───────────────────────────────────────────────────────────────────────────
 *
 * 1. Tách event handlers ra file events.js
 *    └─ Code gọn hơn, dễ quản lý
 *
 * 2. Event driver_gps
 *    └─ Tài xế gửi vị trí GPS mỗi 3 giây
 *    └─ Server gửi vị trí đến phụ huynh
 *
 * 3. Auto join bus-* và trip-* rooms
 *    └─ Query DB: Tài xế đang lái xe nào?
 *    └─ Query DB: Phụ huynh có con trên xe nào?
 *    └─ Tự động cho vào room tương ứng
 *
 * 4. Emit trip_started từ REST API
 *    └─ Khi POST /trips/:id/start thành công
 *    └─ Gửi event realtime cho phụ huynh
 *
 * 5. Thông báo approaching_stop
 *    └─ Khi xe gần điểm đón (< 500m)
 *    └─ Gửi notification cho phụ huynh
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */
