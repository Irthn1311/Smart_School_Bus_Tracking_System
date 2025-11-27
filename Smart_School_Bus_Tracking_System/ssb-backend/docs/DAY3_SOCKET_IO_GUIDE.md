# 🚀 NGÀY 3 - SOCKET.IO REALTIME GUIDE

## ✅ CÁC FILE ĐÃ TẠO/SỬA

### 1. `src/utils/wsAuth.js` (ĐÃ NÂNG CẤP)

- **Trước:** Version mock, chỉ verify JWT cơ bản
- **Sau:** Version production với logic từ Q.Thắng
- **Thêm mới:**
  - Check user tồn tại trong database (NguoiDungModel.getById)
  - Check account status (user.trangThai)
  - Error handling đầy đủ (TokenExpiredError, JsonWebTokenError)
  - Return format chuẩn: `{ userId, email, vaiTro, userInfo }`

### 2. `src/ws/index.js` (MỚI TẠO)

- **Chức năng:** Khởi tạo Socket.IO server với authentication
- **Bao gồm:**
  - CORS config cho Next.js frontend
  - Ping/pong để giữ connection alive
  - Authentication middleware với verifyWsJWT()
  - Auto join room user-{userId}
  - Event handlers: ping, join_trip, leave_trip
  - Disconnect handler
  - Welcome message khi connect

### 3. `src/server.ts` (ĐÃ SỬA)

- **Thay đổi:**
  - Xóa code Socket.IO cũ (mock version)
  - Import `initSocketIO` từ `src/ws/index.js`
  - Gọi `initSocketIO(server)` để khởi tạo Socket.IO
  - Lưu io instance vào `app.set('io', io)` để dùng ở routes

### 4. `src/scripts/test_websocket.js` (MỚI TẠO)

- **Chức năng:** Test script để kiểm tra WebSocket connection
- **Test cases:**
  - Connect với JWT token
  - Nhận welcome message
  - Ping/pong test
  - Join/leave trip room

---

## 📖 HƯỚNG DẪN CHẠY SERVER

### Bước 1: Khởi động server

```cmd
cd ssb-backend
npm run dev
```

Bạn sẽ thấy:

```
🚀 Initializing Socket.IO server...
✅ Socket.IO server created
✅ Authentication middleware registered
✅ Connection handler registered

🚀 SSB Backend Server running on port 4000
📡 Socket.IO: http://localhost:4000
```

### Bước 2: Chạy test WebSocket (terminal mới)

```cmd
cd ssb-backend
node src/scripts/test_websocket.js
```

Nếu thành công, bạn sẽ thấy:

```
🧪 BẮT ĐẦU TEST WEBSOCKET
✅ Kết nối thành công!
👋 Nhận được tin nhắn chào mừng
🏓 Test 1: Ping/Pong
✅ Nhận pong!
🚪 Test 2: Join trip room
✅ Đã join trip 42
🚪 Test 3: Leave trip room
✅ Đã rời trip 42
🎉 TEST HOÀN TẤT!
```

---

## 🏠 ROOMS - GIẢI THÍCH ĐƠN GIẢN

### Rooms là gì?

- Rooms giống như **phòng chat** trong Socket.IO
- Mỗi user có thể join nhiều rooms
- Khi gửi message đến room, **chỉ người trong room đó nhận được**

### Tại sao cần rooms?

Không dùng rooms:

```javascript
io.emit("bus_moved", data); // ❌ GỬI CHO TẤT CẢ (lãng phí)
```

Dùng rooms:

```javascript
io.to("bus-5").emit("bus_moved", data); // ✅ CHỈ GỬI CHO NGƯỜI TRONG BUS 5
```

### Các loại rooms trong hệ thống

#### 1. `user-{userId}` - Phòng cá nhân

```javascript
// Mỗi user tự động join phòng riêng
socket.join("user-123");

// Gửi notification riêng cho user 123
io.to("user-123").emit("notification", {
  message: "Con bạn đã lên xe",
});
```

#### 2. `bus-{busId}` - Phòng xe buýt

```javascript
// Tài xế + phụ huynh có con trên xe sẽ join
socket.join("bus-5");

// Gửi vị trí xe cho mọi người trong bus 5
io.to("bus-5").emit("bus_position_update", {
  lat: 10.762622,
  lng: 106.660172,
  speed: 35,
});
```

#### 3. `trip-{tripId}` - Phòng chuyến đi

```javascript
// Tất cả người liên quan chuyến đi join
socket.join("trip-42");

// Thông báo chuyến 42 bắt đầu
io.to("trip-42").emit("trip_started", {
  tripId: 42,
  timestamp: "2025-10-28T07:00:00Z",
});
```

---

## 🎯 EVENTS - DANH SÁCH SỰ KIỆN

### Server → Client (Server gửi)

#### 1. `welcome` - Chào mừng khi kết nối

```javascript
{
  message: "Xin chào driver@ssb.vn! Bạn đã kết nối thành công.",
  userId: 123,
  role: "tai_xe",
  rooms: ["user-123"],
  timestamp: "2025-10-28T..."
}
```

#### 2. `pong` - Trả lời ping

```javascript
{
  timestamp: 1730091234567;
}
```

#### 3. `trip_joined` - Đã join trip

```javascript
{
  tripId: 42,
  room: "trip-42"
}
```

#### 4. `trip_left` - Đã rời trip

```javascript
{
  tripId: 42;
}
```

### Client → Server (Client gửi)

#### 1. `ping` - Kiểm tra kết nối

```javascript
socket.emit("ping");
// Server trả về: pong
```

#### 2. `join_trip` - Xin join vào trip

```javascript
socket.emit("join_trip", 42);
// Server trả về: trip_joined
```

#### 3. `leave_trip` - Rời khỏi trip

```javascript
socket.emit("leave_trip", 42);
// Server trả về: trip_left
```

---

## 🔐 AUTHENTICATION - XÁC THỰC

### Flow xác thực

```
Client                          Server
  |                               |
  | 1. Kết nối với token          |
  | io({ auth: { token } })       |
  |------------------------------>|
  |                               | 2. verifyWsJWT(token)
  |                               | - Verify JWT signature
  |                               | - Check user tồn tại
  |                               | - Check account active
  |                               |
  | <-------- 3a. connect ✅ -----|  (Nếu OK)
  | <--- 3b. connect_error ❌ ----|  (Nếu lỗi)
```

### Code mẫu Client (Frontend)

```javascript
import { io } from "socket.io-client";

// Lấy token từ localStorage (đã login trước đó)
const token = localStorage.getItem("token");

// Kết nối với token
const socket = io("http://localhost:4000", {
  auth: { token }, // Gửi token ở đây
});

// Kết nối thành công
socket.on("connect", () => {
  console.log("✅ Đã kết nối Socket.IO");
});

// Kết nối thất bại
socket.on("connect_error", (error) => {
  console.log("❌ Lỗi:", error.message);
  // Có thể do: token hết hạn, account bị khóa, user không tồn tại
});

// Nhận welcome message
socket.on("welcome", (data) => {
  console.log(data.message);
});
```

### Các lỗi có thể gặp

| Lỗi                           | Nguyên nhân                               | Cách fix                           |
| ----------------------------- | ----------------------------------------- | ---------------------------------- |
| `Missing token`               | Không gửi token                           | Thêm `auth: { token }` khi connect |
| `Token xác thực đã hết hạn`   | Token quá 15 phút                         | Đăng nhập lại để lấy token mới     |
| `Token xác thực không hợp lệ` | Token sai format hoặc sai secret          | Kiểm tra token từ API login        |
| `Người dùng không tồn tại`    | User đã bị xóa khỏi DB                    | Đăng nhập lại                      |
| `Tài khoản đã bị khóa...`     | Account bị admin khóa (trangThai = false) | Liên hệ admin                      |

---

## 🛠️ SỬ DỤNG IO INSTANCE Ở ROUTES

Khi muốn emit event từ REST API (VD: khi start trip, gửi event trip_started):

```javascript
// src/controllers/tripController.js

export async function startTrip(req, res) {
  const tripId = req.params.id;

  // Logic start trip...
  await tripService.startTrip(tripId);

  // Lấy io instance
  const io = req.app.get("io");

  // Gửi event đến room trip-{tripId}
  io.to(`trip-${tripId}`).emit("trip_started", {
    tripId,
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true });
}
```

---

## 📊 KIẾN TRÚC TỔNG QUAN

```
┌─────────────────┐
│   Frontend      │ (Next.js - localhost:3000)
│   socket.io-    │
│   client        │
└────────┬────────┘
         │ WebSocket connection
         │ (with JWT token)
         ▼
┌─────────────────────────────┐
│   src/ws/index.js           │
│   - CORS config             │
│   - Ping/pong               │
│   - Auth middleware         │
│   - Event handlers          │
└────────┬────────────────────┘
         │ verifyWsJWT()
         ▼
┌─────────────────────────────┐
│   src/utils/wsAuth.js       │
│   - JWT verify              │
│   - Check user exists       │
│   - Check account active    │
└────────┬────────────────────┘
         │ NguoiDungModel.getById()
         ▼
┌─────────────────────────────┐
│   Database (MySQL)          │
│   - NguoiDung table         │
│   - Check trangThai         │
└─────────────────────────────┘
```

---

## 🔜 CÔNG VIỆC TIẾP THEO (NGÀY 4)

### 1. Tách event handlers ra file riêng

- Tạo `src/ws/events.js`
- Move logic xử lý events vào đó
- Code gọn hơn, dễ maintain

### 2. Implement event `driver_gps`

- Tài xế gửi GPS mỗi 5 giây
- Server broadcast đến room `bus-{busId}`
- Phụ huynh nhận realtime vị trí xe

### 3. Auto join rooms bus-_ và trip-_

- Query DB: Tài xế đang lái xe nào?
- Query DB: Phụ huynh có con trên xe nào?
- Auto join vào rooms tương ứng

### 4. Emit trip_started từ tripController

- Khi POST /trips/:id/start thành công
- Lấy `io` instance từ `req.app.get("io")`
- Emit event `trip_started` đến room `trip-{id}`

### 5. Implement approaching_stop notification

- Dùng hàm `haversineDistance()` từ `geo.js`
- Khi xe gần điểm đón (< 500m)
- Gửi notification cho phụ huynh

---

## 📚 TÀI LIỆU THAM KHẢO

- Socket.IO docs: https://socket.io/docs/v4/
- JWT authentication: https://socket.io/how-to/use-with-jwt
- Rooms: https://socket.io/docs/v4/rooms/
- Events: https://socket.io/docs/v4/emitting-events/

---

## 🎉 KẾT LUẬN

**ĐÃ HOÀN THÀNH NGÀY 3:**

- ✅ Nâng cấp `wsAuth.js` với logic production
- ✅ Tạo Socket.IO server với authentication
- ✅ Implement rooms: user-_, trip-_
- ✅ Event handlers cơ bản: ping, join_trip, leave_trip
- ✅ Integrate vào Express server
- ✅ Test script để kiểm tra connection

**READY CHO NGÀY 4:**

- Socket.IO đã hoạt động
- Authentication đã đầy đủ
- Có thể emit events từ REST API
- Có thể test với script

🚀 **Hệ thống realtime đã sẵn sàng!**
