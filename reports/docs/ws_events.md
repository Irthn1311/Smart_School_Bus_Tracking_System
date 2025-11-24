# Tài liệu Socket.IO Events - SSB 1.0

## Tổng quan

/\*\*

- 📖 MỤC ĐÍCH FILE NÀY:
- - Định nghĩa TẤT CẢ các sự kiện (events) realtime trong hệ thống
- - Là "hợp đồng" giữa Backend và Frontend về cách giao tiếp qua WebSocket
- - Mọi người đều phải follow theo cấu trúc này
-
- 🎯 DÀNH CHO AI:
- - Backend Developer : Implement phát (emit) các events này
- - Frontend Developer: Subscribe (lắng nghe) các events này
-
- ⚡ SOCKET.IO LÀ GÌ:
- - Công nghệ WebSocket cho phép server GỬI dữ liệu cho client NGAY LẬP TỨC
- - Không cần client phải "hỏi" (như REST API), server tự "báo" khi có gì mới
- - VD: Xe bus di chuyển → Server emit event → FE nhận được → Cập nhật bản đồ ngay
    \*/

Tài liệu này mô tả các sự kiện Socket.IO được sử dụng trong Hệ thống Theo dõi Xe Bus Trường học Thông minh để giao tiếp thời gian thực giữa backend và frontend.

## Xác thực

/\*\*

- 🔐 TẠI SAO CẦN XÁC THỰC:
- - Chỉ người dùng đã đăng nhập mới được kết nối WebSocket
- - Tránh người lạ vào nghe trộm vị trí xe bus
-
- 🎫 JWT TOKEN LÀ GÌ:
- - Giống như "vé vào cửa" khi user đăng nhập
- - FE lấy token từ API /login, rồi gửi kèm khi kết nối Socket
- - BE kiểm tra token → Hợp lệ thì cho vào, không thì đuổi ra
    \*/

### Xác thực Handshake

/\*\*

- 📝 HANDSHAKE = "BẮT TAY":
- - Là bước ĐẦU TIÊN khi client kết nối Socket.IO
- - Client phải gửi JWT token trong phần "auth"
- - Server kiểm tra token → OK thì kết nối, FAIL thì reject
    \*/

Tất cả các kết nối Socket.IO yêu cầu xác thực JWT thông qua handshake:

```javascript
// 🎯 CODE MẪU CHO FRONTEND:
const socket = io("http://localhost:4000", {
  auth: {
    token: "your-jwt-token-here", // ⚠️ THAY BẰNG TOKEN THẬT từ /login
  },
});

// ⚡ Giải thích:
// - "http://localhost:4000" = Địa chỉ backend WebSocket server
// - auth.token = JWT token người dùng nhận được khi đăng nhập
// - Nếu token SAI hoặc HẾT HẠN → Kết nối bị TỪ CHỐI
```

**Bắt buộc**: `handshake.auth.token` (JWT) là bắt buộc cho tất cả các kết nối.

**Ví dụ kết nối từ Client**:

```javascript
// Kết nối Frontend với JWT
const socket = io(WS_URL, {
  auth: { token: "<JWT>" },
});
```

**Xác thực từ Server**:

- Token JWT được xác thực khi kết nối
- Token không hợp lệ/hết hạn sẽ bị từ chối kết nối
- Vai trò người dùng được trích xuất từ JWT để kiểm soát quyền truy cập phòng

## Phòng (Rooms)

/\*\*

- 🏠 ROOM LÀ GÌ:
- - Giống như "phòng chat" trong Discord/Zalo
- - Mỗi room là một KÊNH RIÊNG để nhận tin nhắn
- - VD: Phụ huynh chỉ vào room của XE ĐƯA ĐÓN CON MÌNH, không nghe xe khác
-
- 🎯 TẠI SAO CẦN ROOMS:
- - Tránh gửi TẤT CẢ thông tin cho TẤT CẢ người (lãng phí, chậm)
- - Chỉ gửi thông tin CHO ĐÚNG NGƯỜI CẦN
- - VD: Xe 123 di chuyển → Chỉ emit cho room "bus-123", không phải toàn server
-
- 🔒 BẢO MẬT:
- - Admin có thể vào MỌI room (để quản lý)
- - Driver chỉ vào room XE MÌNH LÁI
- - Parent chỉ vào room XE ĐƯA ĐÓN CON MÌNH
    \*/

### Cấu trúc Phòng

/\*\*

- 📋 DANH SÁCH CÁC ROOM CHUẨN:
- Mỗi room có một MỤC ĐÍCH CỤ THỂ, đặt tên theo quy ước
  \*/

* `bus-{busId}` - **Phòng theo dõi xe bus cụ thể**
  - VD: `bus-123` = Room của xe bus có ID = 123
  - Ai vào: Admin, Driver của xe này, Parent có con đi xe này
  - Nhận gì: Vị trí xe, trạng thái xe, sự cố
* `trip-{tripId}` - **Phòng theo dõi chuyến đi cụ thể**
  - VD: `trip-789` = Room của chuyến đi ID = 789
  - Ai vào: Driver đang chạy chuyến, Parent có con trong chuyến
  - Nhận gì: Bắt đầu chuyến, kết thúc, đón/trả học sinh
* `user-{userId}` - **Phòng riêng của từng user**
  - VD: `user-456` = Room riêng của user ID = 456
  - Ai vào: Chỉ user đó thôi (+ Admin)
  - Nhận gì: Thông báo CÁ NHÂN
* `driver-{driverId}` - **Phòng riêng của tài xế**
  - VD: `driver-10` = Room riêng của tài xế ID = 10
  - Nhận gì: Lịch trình, phân công xe, cảnh báo thời tiết
* `parent-{parentId}` - **Phòng riêng của phụ huynh**
  - VD: `parent-20` = Room riêng của phụ huynh ID = 20
  - Nhận gì: Thông báo về con em, xe đến gần
* `admin` - **Phòng dành cho admin**
  - Ai vào: Chỉ admin
  - Nhận gì: Cảnh báo hệ thống, báo cáo khẩn cấp
* `notifications-{userId}` - **Phòng thông báo của user**
  - Tương tự `user-{userId}` nhưng chỉ cho thông báo

### Kiểm soát quyền truy cập Phòng

- **Admin**: Có thể tham gia bất kỳ phòng nào
- **Tài xế**: Có thể tham gia `bus-{busId}`, `trip-{tripId}`, `driver-{driverId}`, `user-{userId}`
- **Phụ huynh**: Có thể tham gia `parent-{parentId}`, `user-{userId}`, `notifications-{userId}`

### Quyền tham gia Phòng theo RBAC

- **Admin**: Tất cả các phòng (bus-_, trip-_, user-_, driver-_, parent-_, admin, notifications-_)
- **Tài xế**:
  - `bus-{busId}` (chỉ xe bus được phân công)
  - `trip-{tripId}` (chỉ chuyến đi được phân công)
  - `driver-{driverId}` (phòng tài xế của chính mình)
  - `user-{userId}` (phòng người dùng của chính mình)
- **Phụ huynh**:
  - `parent-{parentId}` (phòng phụ huynh của chính mình)
  - `user-{userId}` (phòng người dùng của chính mình)
  - `notifications-{userId}` (thông báo của chính mình)
  - `trip-{tripId}` (chuyến đi có con em tham gia)
  - `bus-{busId}` (xe bus đưa đón con em)

## Các sự kiện

### Sự kiện Kết nối

#### `connection`

**Kích hoạt**: Khi client kết nối
**Payload**: Không có
**Response**: Không có

#### `disconnect`

**Kích hoạt**: Khi client ngắt kết nối
**Payload**: Không có
**Response**: Không có

#### `error`

**Kích hoạt**: Khi có lỗi xảy ra
**Payload**:

```javascript
{
  message: "Error description",
  code: "ERROR_CODE"
}
```

### Authentication Events

#### `authenticate`

**Triggered**: Client to server
**Payload**:

```javascript
{
  token: "jwt-token";
}
```

#### `authenticated`

**Triggered**: Server to client
**Payload**:

```javascript
{
  success: true,
  user: {
    id: 1,
    email: "user@example.com",
    role: "driver"
  }
}
```

#### `unauthorized`

**Triggered**: Server to client
**Payload**:

```javascript
{
  success: false,
  message: "Authentication failed"
}
```

### Room Events

#### `join-room`

**Triggered**: Client to server
**Payload**:

```javascript
{
  room: "bus-123";
}
```

#### `leave-room`

**Triggered**: Client to server
**Payload**:

```javascript
{
  room: "bus-123";
}
```

#### `joined-room`

**Triggered**: Server to client
**Payload**:

```javascript
{
  room: "bus-123",
  status: "joined"
}
```

#### `left-room`

**Triggered**: Server to client
**Payload**:

```javascript
{
  room: "bus-123",
  status: "left"
}
```

### Bus Events

/\*\*

- 🚌 NHÓM SỰ KIỆN VỀ XE BUS:
- Các event liên quan đến XE BUS (vị trí, trạng thái, phân công tài xế)
  \*/

#### `bus_position_update`

/\*\*

- 📍 SỰ KIỆN QUAN TRỌNG NHẤT - CẬP NHẬT VỊ TRÍ XE:
-
- 🎯 MỤC ĐÍCH:
- - Gửi vị trí GPS của xe bus REALTIME cho frontend
- - FE nhận được → Cập nhật điểm trên bản đồ NGAY LẬP TỨC
-
- ⏱️ TẦN SUẤT:
- - Mỗi 2-3 giây GỬI 1 LẦN (không gửi quá nhanh để tránh quá tải)
- - Driver app gửi GPS → BE nhận → BE emit event này
-
- 🏠 GỬI CHO AI:
- - Room: `bus-{busId}` (chỉ người theo dõi xe này nhận được)
- - VD: Xe 123 di chuyển → Emit vào room "bus-123"
-
- 📦 DỮ LIỆU GỬI ĐI:
- - busId: ID của xe bus
- - position.lat: Vĩ độ (latitude) - VD: 10.762622
- - position.lng: Kinh độ (longitude) - VD: 106.660172
- - position.speed: Tốc độ (km/h) - VD: 45.5
- - position.heading: Hướng đi (độ, 0-360) - VD: 180 = hướng Nam
- - timestamp: Thời gian cập nhật
-
- 💻 CODE MẪU BACKEND ():
- ```javascript

  ```

- io.to(`bus-${busId}`).emit('bus_position_update', {
- busId: 123,
- position: { lat: 10.762622, lng: 106.660172, speed: 45.5, heading: 180 },
- timestamp: new Date().toISOString()
- });
- ```

  ```

-
- 💻 CODE MẪU FRONTEND (FE team sẽ làm):
- ```javascript

  ```

- socket.on('bus_position_update', (data) => {
- console.log('Xe', data.busId, 'đang ở', data.position.lat, data.position.lng);
- updateMapMarker(data.busId, data.position); // Cập nhật điểm trên map
- });
- ```
  */
  ```

**Kích hoạt**: Server gửi cho client
**Room**: `bus-{busId}`
**Tần suất**: ≤ 1 lần mỗi 2-3 giây cho mỗi xe bus
**Payload**:

```javascript
{
  busId: 123,                    // ID xe bus
  position: {
    lat: 10.762622,             // Vĩ độ
    lng: 106.660172,            // Kinh độ
    speed: 45.5,                // Tốc độ (km/h)
    heading: 180                // Hướng đi (0=Bắc, 90=Đông, 180=Nam, 270=Tây)
  },
  timestamp: "2025-10-25T10:30:00Z",  // Thời gian cập nhật
  updatedBy: 1                        // ID của driver đang lái
}
```

#### `bus_status_change`

**Triggered**: Server to client
**Room**: `bus-{busId}`
**Payload**:

```javascript
{
  busId: 123,
  status: "hoat_dong", // hoat_dong, bao_tri, ngung_hoat_dong
  previousStatus: "bao_tri",
  timestamp: "2025-10-25T10:30:00Z",
  reason: "Maintenance completed"
}
```

#### `bus_assigned`

**Triggered**: Server to client
**Room**: `bus-{busId}`, `driver-{driverId}`
**Payload**:

```javascript
{
  busId: 123,
  driverId: 456,
  driverName: "Nguyễn Văn A",
  assignmentDate: "2025-10-25T10:30:00Z"
}
```

#### `bus_unassigned`

**Triggered**: Server to client
**Room**: `bus-{busId}`, `driver-{driverId}`
**Payload**:

```javascript
{
  busId: 123,
  driverId: 456,
  driverName: "Nguyễn Văn A",
  unassignmentDate: "2025-10-25T10:30:00Z",
  reason: "Driver change"
}
```

### Trip Events

/\*\*

- 🛣️ NHÓM SỰ KIỆN VỀ CHUYẾN ĐI:
- Các event liên quan đến CHUYẾN ĐI (bắt đầu, kết thúc, trễ, hủy)
-
- 💡 TRIP LÀ GÌ:
- - Một chuyến xe bus cụ thể trong một ngày cụ thể
- - VD: "Xe 123 chạy tuyến A sáng 26/10/2025" = 1 trip
-
- 🔄 VÒNG ĐỜI TRIP (Trip Lifecycle):
- 1.  scheduled (đã lên lịch) → Tạo từ trước
- 2.  started (bắt đầu) → Driver nhấn "Bắt đầu chuyến"
- 3.  in_progress (đang chạy) → Xe đang đón/trả học sinh
- 4.  completed (hoàn thành) hoặc cancelled (hủy) → Kết thúc
      \*/

#### `trip_started`

/\*\*

- 🚦 SỰ KIỆN: BẮT ĐẦU CHUYẾN ĐI
-
- 🎯 KHI NÀO XẢY RA:
- - Driver mở app → Nhấn nút "Bắt đầu chuyến"
- - FE gọi API: POST /api/v1/trips/:id/start
- - BE xử lý → Emit event này
-
- 📣 GỬI CHO AI:
- - Room: `trip-{tripId}`, `bus-{busId}`, `driver-{driverId}`
- - Tất cả người liên quan (parent, admin) đều biết chuyến bắt đầu
-
- 📦 DỮ LIỆU:
- - tripId: ID chuyến đi
- - busId: Xe nào chạy
- - driverId: Ai lái
- - startTime: Giờ bắt đầu THỰC TẾ (có thể khác giờ dự kiến)
- - route: Thông tin tuyến đường (tên, các điểm dừng)
-
- 💻 CODE BACKEND ():
- ```javascript

  ```

- // Trong TripController.startTrip()
- io.to(`trip-${tripId}`).emit('trip_started', {
- tripId, busId, driverId, startTime: new Date(),
- route: { id: 1, name: "Tuyến A", stops: [...] }
- });
- ```

  ```

-
- 💻 CODE FRONTEND:
- ```javascript

  ```

- socket.on('trip_started', (data) => {
- showNotification(`Chuyến ${data.tripId} đã bắt đầu!`);
- updateTripStatus(data.tripId, 'in_progress');
- });
- ```
  */
  ```

**Kích hoạt**: Server gửi cho client
**Room**: `trip-{tripId}`, `bus-{busId}`, `driver-{driverId}`
**Payload**:

```javascript
{
  tripId: 789,                         // ID chuyến đi
  busId: 123,                          // Xe nào
  driverId: 456,                       // Ai lái
  startTime: "2025-10-25T10:30:00Z",   // Giờ bắt đầu THỰC TẾ
  route: {
    id: 1,
    name: "Tuyến Quận 7 - Nhà Bè",
    stops: [
      { id: 1, name: "Ngã tư Nguyễn Văn Linh", lat: 10.762622, lng: 106.660172 },
      { id: 2, name: "Chung cư Sunrise City", lat: 10.7408, lng: 106.7075 }
    ]
  }
}
```

#### `trip_completed`

/\*\*

- 🏁 SỰ KIỆN: KẾT THÚC CHUYẾN ĐI
-
- 🎯 KHI NÀO:
- - Driver nhấn "Kết thúc chuyến" sau khi trả hết học sinh
- - API: POST /api/v1/trips/:id/end
-
- 📊 DỮ LIỆU THỐNG KÊ:
- - duration: Tổng thời gian chạy (giây)
- - totalStudents: Tổng số học sinh trong danh sách
- - completedStudents: Số học sinh đã đón/trả thành công
- - absentStudents: Số học sinh vắng mặt
    \*/

**Kích hoạt**: Server gửi cho client
**Room**: `trip-{tripId}`, `bus-{busId}`, `driver-{driverId}`
**Payload**:

```javascript
{
  tripId: 789,
  busId: 123,
  driverId: 456,
  endTime: "2025-10-25T11:30:00Z",    // Giờ kết thúc
  duration: 3600,                      // 3600 giây = 1 giờ
  totalStudents: 25,                   // Tổng 25 học sinh
  completedStudents: 24,               // 24 em đã đón/trả
  absentStudents: 1                    // 1 em vắng
}
```

#### `trip_cancelled`

**Triggered**: Server to client
**Room**: `trip-{tripId}`, `bus-{busId}`, `driver-{driverId}`
**Payload**:

```javascript
{
  tripId: 789,
  busId: 123,
  driverId: 456,
  cancelTime: "2025-10-25T10:30:00Z",
  reason: "Vehicle breakdown",
  affectedStudents: 25
}
```

#### `trip_delayed`

**Triggered**: Server to client
**Room**: `trip-{tripId}`, `bus-{busId}`, `driver-{driverId}`
**Payload**:

```javascript
{
  tripId: 789,
  busId: 123,
  driverId: 456,
  delayMinutes: 15,
  reason: "Traffic jam",
  estimatedArrival: "2025-10-25T10:45:00Z"
}
```

#### `trip_status_change`

**Triggered**: Server to client
**Room**: `trip-{tripId}`, `bus-{busId}`
**Payload**:

```javascript
{
  tripId: 789,
  status: "dang_chay", // chua_khoi_hanh, dang_chay, hoan_thanh, huy
  previousStatus: "chua_khoi_hanh",
  timestamp: "2025-10-25T10:30:00Z"
}
```

### Student Events

#### `student_picked_up`

**Triggered**: Server to client
**Room**: `trip-{tripId}`, `parent-{parentId}`
**Payload**:

```javascript
{
  tripId: 789,
  studentId: 101,
  studentName: "Nguyễn Văn B",
  parentId: 201,
  pickupTime: "2025-10-25T10:35:00Z",
  stopName: "Ngã tư Nguyễn Văn Linh",
  busId: 123
}
```

#### `student_dropped_off`

**Triggered**: Server to client
**Room**: `trip-{tripId}`, `parent-{parentId}`
**Payload**:

```javascript
{
  tripId: 789,
  studentId: 101,
  studentName: "Nguyễn Văn B",
  parentId: 201,
  dropoffTime: "2025-10-25T11:25:00Z",
  stopName: "Trường Tiểu học ABC",
  busId: 123
}
```

#### `student_absent`

**Triggered**: Server to client
**Room**: `trip-{tripId}`, `parent-{parentId}`
**Payload**:

```javascript
{
  tripId: 789,
  studentId: 101,
  studentName: "Nguyễn Văn B",
  parentId: 201,
  absentTime: "2025-10-25T10:35:00Z",
  stopName: "Ngã tư Nguyễn Văn Linh",
  reason: "Not at pickup point"
}
```

#### `student_status_change`

**Triggered**: Server to client
**Room**: `trip-{tripId}`, `parent-{parentId}`
**Payload**:

```javascript
{
  tripId: 789,
  studentId: 101,
  studentName: "Nguyễn Văn B",
  parentId: 201,
  status: "da_don", // cho_don, da_don, da_tra, vang
  previousStatus: "cho_don",
  timestamp: "2025-10-25T10:35:00Z"
}
```

### Stop Events

/\*\*

- 🚏 NHÓM SỰ KIỆN VỀ ĐIỂM DỪNG:
- Các event khi xe BUS TỚI GẦN, TỚI, RỜI điểm đón/trả học sinh
-
- 🎯 MỤC ĐÍCH:
- - Thông báo cho phụ huynh: "Xe sắp tới!", "Xe đã tới!", "Xe đã đi!"
- - Giúp phụ huynh chuẩn bị đưa con ra đón xe đúng giờ
    \*/

#### `approaching_stop`

/\*\*

- 📍 SỰ KIỆN QUAN TRỌNG: XE SẮP TỚI ĐIỂM DỪNG
-
- 🎯 KHI NÀO XẢY RA:
- - Xe bus đang di chuyển → BE nhận GPS từ driver
- - BE tính khoảng cách đến điểm dừng tiếp theo
- - Nếu khoảng cách ≤ 60m (geofence) → EMIT EVENT NÀY
-
- 🔢 LOGIC ():
- ```javascript

  ```

- const distance = calculateDistance(busPosition, nextStop); // Haversine
- if (distance <= 60) { // 60 mét
- io.to(`trip-${tripId}`).emit('approaching_stop', {
-     distance: distance,
-     etaMinutes: 2, // Dự kiến 2 phút nữa tới
-     students: [...] // Học sinh cần đón tại điểm này
- });
- }
- ```

  ```

-
- 📲 FRONTEND SẼ LÀM GÌ:
- - Hiện popup: "Xe sắp tới trong 2 phút!"
- - Gửi push notification cho phụ huynh
- - Phát âm thanh cảnh báo
-
- 📦 DỮ LIỆU:
- - distance: Khoảng cách còn lại (mét)
- - etaMinutes: Thời gian dự kiến tới (phút)
- - students: Danh sách học sinh tại điểm này
    \*/

**Kích hoạt**: Server gửi cho client
**Room**: `bus-{busId}`, `trip-{tripId}`
**Payload**:

```javascript
{
  busId: 123,
  tripId: 789,
  stopId: 1,
  stopName: "Ngã tư Nguyễn Văn Linh",
  distance: 100,                       // Còn 100 mét nữa tới
  etaMinutes: 2,                       // Dự kiến 2 phút nữa
  students: [
    { id: 101, name: "Nguyễn Văn B", parentId: 201 }  // Học sinh cần đón
  ]
}
```

#### `arrived_at_stop`

/\*\*

- ✅ SỰ KIỆN: XE ĐÃ TỚI ĐIỂM DỪNG
-
- 🎯 KHI NÀO:
- - Xe đã vào vùng điểm dừng (≤ 20m) VÀ dừng lại (speed = 0)
- - Hoặc driver nhấn nút "Đã tới điểm X"
-
- 💡 Ý NGHĨA:
- - Xác nhận xe ĐÃ DỪNG tại điểm
- - Driver bắt đầu đón/trả học sinh
    \*/

**Kích hoạt**: Server gửi cho client
**Room**: `bus-{busId}`, `trip-{tripId}`
**Payload**:

```javascript
{
  busId: 123,
  tripId: 789,
  stopId: 1,
  stopName: "Ngã tư Nguyễn Văn Linh",
  arrivalTime: "2025-10-25T10:35:00Z",  // Giờ tới THỰC TẾ
  students: [
    { id: 101, name: "Nguyễn Văn B", parentId: 201 }
  ]
}
```

#### `left_stop`

/\*\*

- 🚦 SỰ KIỆN: XE ĐÃ RỜI ĐIỂM DỪNG
-
- 🎯 KHI NÀO:
- - Sau khi đón/trả học sinh xong
- - Driver nhấn "Tiếp tục hành trình"
- - Xe bắt đầu di chuyển (speed > 0)
-
- 📊 THÔNG TIN:
- - departureTime: Giờ rời điểm
- - nextStop: Điểm dừng tiếp theo (để parent biết)
    \*/

**Kích hoạt**: Server gửi cho client
**Room**: `bus-{busId}`, `trip-{tripId}`
**Payload**:

```javascript
{
  busId: 123,
  tripId: 789,
  stopId: 1,
  stopName: "Ngã tư Nguyễn Văn Linh",
  departureTime: "2025-10-25T10:40:00Z",  // Giờ rời đi
  nextStop: {
    id: 2,
    name: "Chung cư Sunrise City",
    etaMinutes: 5                         // Dự kiến 5 phút tới điểm tiếp
  }
}
```

### Alert Events

/\*\*

- 🚨 NHÓM SỰ KIỆN CẢNH BÁO:
- Các event BẤT THƯỜNG, CẦN THÔNG BÁO NGAY
-
- 🎯 MỤC ĐÍCH:
- - Cảnh báo khi có vấn đề: Trễ giờ, sự cố, bảo trì...
- - Giúp admin/parent phản ứng kịp thời
    \*/

#### `delay_alert`

/\*\*

- ⏰ CẢNH BÁO: XE BỊ TRỄ GIỜ
-
- 🎯 KHI NÀO XẢY RA:
- - BE tính ETA (Estimated Time of Arrival) = Giờ dự kiến tới
- - So sánh với giờ THỰC TẾ hiện tại
- - Nếu trễ > 10 phút → EMIT event này
-
- 🔢 LOGIC ():
- ```javascript

  ```

- const scheduledTime = trip.schedule.arrivalTime; // VD: 10:30
- const actualETA = calculateETA(busPosition, nextStop); // VD: 10:45
- const delay = actualETA - scheduledTime; // 15 phút
-
- if (delay > 10) { // Trễ hơn 10 phút
- io.to(`trip-${tripId}`).emit('delay_alert', {
-     delayMinutes: 15,
-     reason: "Kẹt xe trên đường Nguyễn Văn Linh",
-     alertLevel: 'medium' // low/medium/high
- });
- }
- ```

  ```

-
- 📲 FRONTEND:
- - Hiện banner đỏ: "Xe trễ 15 phút do kẹt xe"
- - Gửi push notification cho parent
- - Cập nhật ETA mới trên bản đồ
-
- 📊 MỨC ĐỘ CẢNH BÁO:
- - low: Trễ 10-15 phút (màu vàng)
- - medium: Trễ 15-30 phút (màu cam)
- - high: Trễ >30 phút (màu đỏ)
    \*/

**Kích hoạt**: Server gửi cho client
**Room**: `trip-{tripId}`, `bus-{busId}`, `parent-{parentId}`
**Payload**:

```javascript
{
  tripId: 789,
  busId: 123,
  delayMinutes: 15,                    // Trễ 15 phút
  reason: "Traffic jam",               // Lý do: Kẹt xe
  affectedStudents: 25,                // Ảnh hưởng 25 học sinh
  estimatedArrival: "2025-10-25T10:45:00Z",  // Giờ TỚI MỚI dự kiến
  alertLevel: "medium"                 // Mức độ: Vừa
}
```

#### `emergency_alert`

/\*\*

- 🆘 CẢNH BÁO KHẨN CẤP
-
- 🎯 KHI NÀO:
- - Driver nhấn nút SOS (khẩn cấp)
- - Phát hiện tai nạn, hỏng xe, vấn đề y tế...
-
- 🚨 ĐỘ ƯU TIÊN CAO NHẤT:
- - Gửi đến: Admin + Tất cả parent trong chuyến
- - Yêu cầu xử lý NGAY LẬP TỨC
-
- 📦 LOẠI KHẨN CẤP:
- - accident: Tai nạn
- - breakdown: Hỏng xe
- - medical: Vấn đề y tế (học sinh ốm, bị thương...)
- - security: An ninh (nghi ngờ, đe dọa...)
    \*/

**Kích hoạt**: Server gửi cho client
**Room**: `bus-{busId}`, `trip-{tripId}`, `admin`
**Payload**:

```javascript
{
  busId: 123,
  tripId: 789,
  alertType: "accident",               // Loại: Tai nạn
  severity: "high",                    // Mức độ nghiêm trọng: Cao
  location: {
    lat: 10.762622,
    lng: 106.660172,
    address: "Ngã tư Nguyễn Văn Linh"
  },
  description: "Vehicle breakdown on route",  // Mô tả
  timestamp: "2025-10-25T10:30:00Z",
  affectedStudents: 25                 // Số học sinh bị ảnh hưởng
}
```

#### `maintenance_alert`

**Triggered**: Server to client
**Room**: `bus-{busId}`, `admin`
**Payload**:

```javascript
{
  busId: 123,
  alertType: "scheduled_maintenance",
  maintenanceDate: "2025-10-26T08:00:00Z",
  duration: 4, // hours
  description: "Regular maintenance scheduled",
  affectedTrips: [789, 790]
}
```

#### `weather_alert`

**Triggered**: Server to client
**Room**: `admin`, `driver-{driverId}`
**Payload**:

```javascript
{
  alertType: "weather_warning",
  severity: "high",
  weatherCondition: "heavy_rain",
  affectedArea: "Quận 7",
  description: "Heavy rain expected, drive carefully",
  validUntil: "2025-10-25T18:00:00Z"
}
```

### Notification Events

#### `notification`

**Triggered**: Server to client
**Room**: `notifications-{userId}`, `user-{userId}`
**Payload**:

```javascript
{
  id: 1001,
  title: "Xe sắp tới điểm đón",
  message: "Xe 51A-12345 sắp tới Ngã tư Nguyễn Văn Linh trong 5 phút",
  type: "trip_update", // trip_update, delay_alert, emergency, system
  priority: "medium", // low, medium, high, urgent
  timestamp: "2025-10-25T10:30:00Z",
  data: {
    tripId: 789,
    busId: 123,
    stopId: 1
  }
}
```

#### `notification_read`

**Triggered**: Server to client
**Room**: `notifications-{userId}`
**Payload**:

```javascript
{
  notificationId: 1001,
  readTime: "2025-10-25T10:35:00Z"
}
```

#### `notification_deleted`

**Triggered**: Server to client
**Room**: `notifications-{userId}`
**Payload**:

```javascript
{
  notificationId: 1001,
  deletedTime: "2025-10-25T10:35:00Z"
}
```

### System Events

#### `system_maintenance`

**Triggered**: Server to client
**Room**: `admin`, `user-{userId}`
**Payload**:

```javascript
{
  maintenanceType: "scheduled",
  startTime: "2025-10-26T02:00:00Z",
  endTime: "2025-10-26T04:00:00Z",
  description: "Database maintenance",
  affectedServices: ["api", "socket", "database"]
}
```

#### `system_update`

**Triggered**: Server to client
**Room**: `admin`
**Payload**:

```javascript
{
  version: "1.1.0",
  updateType: "minor",
  releaseNotes: "Bug fixes and performance improvements",
  updateTime: "2025-10-25T10:30:00Z"
}
```

#### `system_error`

**Triggered**: Server to client
**Room**: `admin`
**Payload**:

```javascript
{
  errorType: "database_connection",
  severity: "high",
  message: "Database connection lost",
  timestamp: "2025-10-25T10:30:00Z",
  affectedServices: ["api", "socket"]
}
```

## Error Handling

### Connection Errors

- **Authentication failed**: Client receives `unauthorized` event
- **Room access denied**: Client receives `error` event with access denied message
- **Rate limit exceeded**: Client receives `error` event with rate limit message

### Event Errors

- **Invalid payload**: Server logs error and sends `error` event
- **Permission denied**: Server sends `error` event with permission message
- **Room not found**: Server sends `error` event with room not found message

## Best Practices

### Client Implementation

1. Always authenticate before joining rooms
2. Handle connection errors gracefully
3. Implement reconnection logic
4. Validate event payloads
5. Use appropriate room subscriptions based on user role

### Server Implementation

1. Validate JWT tokens on connection
2. Check room access permissions
3. Rate limit event emissions
4. Log all events for debugging
5. Handle disconnections gracefully

### Performance Considerations

1. Use room-based broadcasting instead of global events
2. Implement event throttling for high-frequency updates
3. Use compression for large payloads
4. Monitor connection counts and memory usage
5. Implement event queuing for offline clients

## Testing

/\*\*

- 🧪 KIỂM THỬ HỆ THỐNG REALTIME:
- Cách test các event Socket.IO trước khi deploy
  \*/

### Unit Tests

/\*\*

- 📝 TEST TỪNG PHẦN NHỎ:
- - Test event handlers: Hàm xử lý event có đúng không?
- - Test room management: Join/leave room có hoạt động?
- - Test authentication: JWT có được kiểm tra đúng?
- - Test error handling: Xử lý lỗi có ổn không?
-
- 💻 VÍ DỤ (Jest):
- ```javascript

  ```

- test('should emit bus_position_update', () => {
- const mockSocket = { emit: jest.fn() };
- emitBusPosition(mockSocket, { busId: 123, lat: 10.7, lng: 106.6 });
- expect(mockSocket.emit).toHaveBeenCalledWith('bus_position_update', ...);
- });
- ```
  */
  ```

* Test event handlers
* Test room management
* Test authentication
* Test error handling

### Integration Tests

/\*\*

- 🔗 TEST KẾT NỐI THẬT:
- - Test client-server communication: FE kết nối BE được không?
- - Test room subscriptions: Join room thành công chưa?
- - Test event broadcasting: Emit có gửi đúng người?
- - Test reconnection logic: Mất kết nối có tự động kết nối lại?
-
- 💻 VÍ DỤ (Socket.IO Client):
- ```javascript

  ```

- const socket = io('http://localhost:4000', { auth: { token: testToken } });
- socket.on('connect', () => {
- socket.emit('join-room', 'bus-123');
- socket.on('bus_position_update', (data) => {
-     assert(data.busId === 123);
- });
- });
- ```
  */
  ```

* Test client-server communication
* Test room subscriptions
* Test event broadcasting
* Test reconnection logic

### Load Tests

/\*\*

- 💪 TEST TẢI NẶNG:
- Kiểm tra hệ thống có chịu được tải cao không?
-
- 🎯 CÁC TRƯỜNG HỢP CẦN TEST:
- - 300 xe bus đồng thời online
- - Mỗi xe gửi GPS mỗi 2 giây
- - 1000+ phụ huynh cùng theo dõi
- - Có bao nhiêu RAM? CPU bao nhiêu %?
-
- 🔧 CÔNG CỤ:
- - Artillery.io
- - k6.io
- - Socket.IO Load Tester
    \*/

* Test with multiple concurrent connections
* Test event broadcasting performance
* Test memory usage under load
* Test connection stability
