# 🔌 WebSocket Events Documentation

> **Smart School Bus Tracking System - Realtime Events**  
> **Version**: 1.0  
> **Author**: Nguyễn Tuấn Tài  
> **Date**: 2025-10-29

---

## 📡 Connection Setup

### Server URL

```
ws://localhost:4000
```

### Authentication

Tất cả kết nối WebSocket **BẮT BUỘC** phải có JWT token:

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:4000", {
  auth: {
    token: "eyJhbGciOiJIUzI1NiIsInR5...", // JWT token
  },
  transports: ["websocket"],
});
```

### Token Payload

```json
{
  "id": 123,
  "role": "tai_xe",
  "email": "driver01@ssb.vn"
}
```

**Supported Roles**:

- `tai_xe` (Driver)
- `phu_huynh` (Parent)
- `quan_tri` (Admin)

---

## 🎯 Room Architecture

Mỗi kết nối sẽ tự động join các rooms sau:

| Room Pattern    | Description         | Example    |
| --------------- | ------------------- | ---------- |
| `user-{id}`     | Room cá nhân        | `user-123` |
| `trip-{tripId}` | Room theo chuyến đi | `trip-42`  |
| `bus-{busId}`   | Room theo xe bus    | `bus-5`    |

---

## 📤 Client → Server Events

### 1. `join_trip`

**Mô tả**: Join vào room của một chuyến đi cụ thể

**Payload**:

```javascript
socket.emit("join_trip", 42); // tripId
```

**Response**: `trip_joined`

```json
{
  "room": "trip-42"
}
```

---

### 2. `leave_trip`

**Mô tả**: Rời khỏi room chuyến đi

**Payload**:

```javascript
socket.emit("leave_trip", 42); // tripId
```

**Response**: `trip_left`

```json
{
  "room": "trip-42"
}
```

---

### 3. `driver_gps` 🚗

**Mô tả**: Tài xế gửi GPS realtime (Day 4)

**Quyền**: Chỉ `tai_xe`

**Payload**:

```javascript
socket.emit("driver_gps", {
  tripId: 42,
  lat: 21.0285,
  lng: 105.8542,
  speed: 35, // km/h (optional)
  heading: 90, // degrees (optional)
});
```

**Response**: `gps_ack`

```json
{
  "success": true,
  "events": ["bus_position_update", "approach_stop"],
  "timestamp": "2025-10-29T10:30:45.123Z"
}
```

**Error Response**:

```json
{
  "success": false,
  "error": "Forbidden: Only drivers can send GPS"
}
```

---

### 4. `ping`

**Mô tả**: Kiểm tra kết nối

**Payload**:

```javascript
socket.emit("ping");
```

**Response**: `pong`

```json
{
  "timestamp": "2025-10-29T10:30:45.123Z"
}
```

---

## 📥 Server → Client Events

### 1. `welcome`

**Mô tả**: Gửi khi client kết nối thành công

**Payload**:

```json
{
  "message": "Welcome to SSB Realtime!",
  "userId": 123,
  "role": "tai_xe"
}
```

**Cách subscribe**:

```javascript
socket.on("welcome", (data) => {
  console.log(data.message);
});
```

---

### 2. `trip_started` 🚀

**Mô tả**: Chuyến đi bắt đầu

**Target Rooms**: `trip-{tripId}`, `bus-{busId}`

**Payload**:

```json
{
  "tripId": 42,
  "busId": 5,
  "routeId": 10,
  "driverId": 3,
  "status": "dang_chay",
  "started_at": "2025-10-29T07:00:00Z"
}
```

**Cách subscribe**:

```javascript
socket.on("trip_started", (data) => {
  console.log(`Chuyến ${data.tripId} đã khởi hành!`);
  // Update UI: Hiển thị "Xe đang đến"
});
```

---

### 3. `bus_position_update` 📍

**Mô tả**: Vị trí xe cập nhật (realtime)

**Frequency**: Mỗi 2-3 giây

**Target Rooms**: `trip-{tripId}`, `bus-{busId}`

**Payload**:

```json
{
  "tripId": 42,
  "busId": 5,
  "lat": 21.0285,
  "lng": 105.8542,
  "speed": 35,
  "heading": 90,
  "timestamp": "2025-10-29T10:30:45.123Z"
}
```

**Cách subscribe**:

```javascript
socket.on("bus_position_update", (data) => {
  // Cập nhật marker trên Google Maps
  updateBusMarker(data.lat, data.lng);

  // Hiển thị tốc độ
  speedElement.textContent = `${data.speed} km/h`;
});
```

---

### 4. `approach_stop` 🎯

**Mô tả**: Xe gần đến điểm dừng (< 60m)

**Target Rooms**: `trip-{tripId}`, parents của học sinh tại điểm dừng

**Payload**:

```json
{
  "tripId": 42,
  "stopId": 8,
  "stopName": "Trường THCS Kim Liên",
  "distance_m": 45,
  "eta_seconds": 120,
  "students": [15, 23, 31],
  "lat": 21.032,
  "lng": 105.8578
}
```

**Cách subscribe**:

```javascript
socket.on("approach_stop", (data) => {
  // Hiển thị thông báo
  showNotification(
    `Xe sắp đến ${data.stopName}`,
    `Còn ${data.distance_m}m (~${Math.round(data.eta_seconds / 60)} phút)`
  );

  // Play sound alert
  playSound("approaching.mp3");
});
```

---

### 5. `delay_alert` ⏰

**Mô tả**: Xe bị trễ > 5 phút so với lịch

**Target Rooms**: `trip-{tripId}`, admins

**Payload**:

```json
{
  "tripId": 42,
  "stopId": 8,
  "stopName": "Trường THCS Kim Liên",
  "scheduled_time": "07:15:00",
  "actual_time": "07:22:00",
  "delay_min": 7
}
```

**Cách subscribe**:

```javascript
socket.on("delay_alert", (data) => {
  // Hiển thị cảnh báo
  showWarning(
    `⚠️ Chuyến ${data.tripId} bị trễ ${data.delay_min} phút tại ${data.stopName}`
  );
});
```

---

### 6. `trip_completed` 🏁

**Mô tả**: Chuyến đi kết thúc

**Target Rooms**: `trip-{tripId}`, `bus-{busId}`

**Payload**:

```json
{
  "tripId": 42,
  "busId": 5,
  "status": "hoan_thanh",
  "completed_at": "2025-10-29T08:30:00Z",
  "total_students": 25,
  "total_stops": 8
}
```

**Cách subscribe**:

```javascript
socket.on("trip_completed", (data) => {
  console.log(`Chuyến ${data.tripId} đã hoàn thành!`);
  // Update UI: Hiển thị "Xe đã về"
});
```

---

## 🔧 Error Events

### 1. `error`

**Mô tả**: Lỗi chung từ server

**Payload**:

```json
{
  "message": "Unauthorized",
  "code": "AUTH_ERROR"
}
```

---

### 2. `connect_error`

**Mô tả**: Lỗi kết nối (JWT invalid, network...)

**Payload**:

```javascript
socket.on("connect_error", (error) => {
  console.error("Connection failed:", error.message);
  // Thử reconnect hoặc yêu cầu login lại
});
```

---

## 📖 Complete Example

### Parent Subscribe Pattern

```javascript
import { io } from "socket.io-client";

// 1. Kết nối với JWT
const socket = io("http://localhost:4000", {
  auth: { token: parentToken },
  transports: ["websocket"],
});

// 2. Listen welcome
socket.on("welcome", (data) => {
  console.log(`Connected as ${data.role}`);

  // 3. Join trip của con
  socket.emit("join_trip", 42);
});

// 4. Subscribe các events
socket.on("bus_position_update", (data) => {
  updateMapMarker(data.lat, data.lng);
});

socket.on("approach_stop", (data) => {
  if (data.students.includes(myChildId)) {
    showAlert(`Xe sắp đến ${data.stopName}!`);
  }
});

socket.on("trip_completed", (data) => {
  showNotification("Con đã về đến trường an toàn!");
});

// 5. Handle errors
socket.on("connect_error", (err) => {
  console.error("Connection error:", err.message);
});
```

---

### Driver Send GPS Pattern

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:4000", {
  auth: { token: driverToken },
  transports: ["websocket"],
});

socket.on("welcome", () => {
  socket.emit("join_trip", currentTripId);

  // Gửi GPS mỗi 3 giây
  setInterval(() => {
    navigator.geolocation.getCurrentPosition((pos) => {
      socket.emit("driver_gps", {
        tripId: currentTripId,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        speed: pos.coords.speed || 0,
        heading: pos.coords.heading || 0,
      });
    });
  }, 3000);
});

// Nhận ACK
socket.on("gps_ack", (data) => {
  console.log("GPS sent:", data.events);
});
```

---

## 🧪 Testing

### 1. Manual Test with Browser Console

```javascript
// Tạo kết nối test
const socket = io("http://localhost:4000", {
  auth: { token: "your-jwt-token" },
  transports: ["websocket"],
});

// Log mọi events
socket.onAny((event, ...args) => {
  console.log(`[${event}]`, args);
});

// Test ping
socket.emit("ping");
```

### 2. Automated Test

```bash
# Chạy demo tool
node src/scripts/ws-demo.js

# Hoặc test cơ bản
node src/scripts/test_websocket.js
```

---

## 📊 Event Flow Diagram

```
Driver App                    Server                      Parent App
    |                           |                              |
    |------ connect (JWT) ----->|                              |
    |<----- welcome ------------|                              |
    |                           |<------ connect (JWT) --------|
    |                           |------- welcome ------------->|
    |                           |                              |
    |--- driver_gps ----------->|                              |
    |                           |--- bus_position_update ----->|
    |<-- gps_ack ---------------|                              |
    |                           |                              |
    |--- driver_gps ----------->|                              |
    |    (near stop)            |                              |
    |                           |--- approach_stop ----------->|
    |<-- gps_ack ---------------|                              |
    |    [approach_stop]        |                              |
    |                           |                              |
    |--- driver_gps ----------->|                              |
    |    (delayed)              |                              |
    |                           |--- delay_alert ------------->|
    |<-- gps_ack ---------------|                              |
    |    [delay_alert]          |                              |
```

---

## 🔐 Security Notes

1. **JWT Required**: Mọi kết nối phải có token hợp lệ
2. **Role-Based Access**: `driver_gps` chỉ cho tài xế
3. **Room Isolation**: Mỗi user chỉ nhận events của trips họ tham gia
4. **Rate Limiting**: GPS updates tối thiểu 2 giây/lần

---

## 🚀 Performance Tips

1. **Use Rooms**: Đừng broadcast toàn server, dùng `to(room)`
2. **Throttle GPS**: Client nên gửi tối đa 1 GPS/3 giây
3. **Reconnection**: Enable auto-reconnect với backoff
4. **Binary Transport**: Dùng `transports: ["websocket"]` thay vì polling

---

## 📞 Support

**Team Backend Realtime**: Nguyễn Tuấn Tài  
**Email**: tai.nt@ssb.vn  
**Slack**: #backend-realtime
