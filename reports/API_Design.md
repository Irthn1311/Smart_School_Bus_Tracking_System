# Hệ thống Theo dõi Xe bus Thông minh - Thiết kế API (Phạm vi Demo)

### Tổng quan

Tài liệu này định nghĩa các API RESTful trong phạm vi demo cho các module Bus, Driver, Schedule, cùng với các sự kiện real-time qua Socket.IO. Dữ liệu được lưu trữ trong bộ nhớ (in-memory) để phục vụ demo local; cần được thay thế bằng các model của database trong môi trường production.

**URL Gốc**: `/api`

### Xác thực

Xác thực không được áp dụng trong phạm vi demo này. Trong môi trường production, tất cả các endpoint liên quan cần được bảo vệ bằng JWT middleware và có cơ chế phân quyền theo vai trò (role-based access control).

---

## Các tài nguyên (Resources)

### Xe bus (Bus)

Một tài nguyên đại diện cho một chiếc xe bus.

**Các Endpoints:**

- `GET /api/buses`

  - Trả về danh sách tất cả xe bus.
  - **Tham số truy vấn (Query Parameters)**:
    - `q` (string): Từ khóa tìm kiếm theo mã xe (`code`) hoặc biển số (`plate`).
    - `status` (string): Lọc theo trạng thái (`active`, `maintenance`, `inactive`).

- `GET /api/buses/:id`

  - Trả về thông tin chi tiết của một xe bus cụ thể.

- `POST /api/buses`

  - Tạo một xe bus mới.
  - **Dữ liệu gửi lên (Request Body)**: `{ "code": "string", "plate": "string", "capacity": number, "status": "string" }`

- `PUT /api/buses/:id`

  - Cập nhật thông tin một xe bus đã có.
  - **Dữ liệu gửi lên (Request Body)**: Giống `POST`, các trường là tùy chọn.

- `DELETE /api/buses/:id`

  - Xóa một xe bus.

- `POST /api/buses/:id/assign-driver`

  - Phân công một tài xế cho xe bus này.
  - **Dữ liệu gửi lên (Request Body)**: `{ "driverId": "string" }`

- `POST /api/buses/:id/position`
  - Cập nhật vị trí địa lý của xe bus và phát một sự kiện real-time.
  - **Dữ liệu gửi lên (Request Body)**: `{ "lat": number, "lng": number, "ts": "ISOString" }`
  - **Phát sự kiện (Emits)**: `bus_position_update` qua Socket.IO.

**Cấu trúc đối tượng Bus:**

```json
{
  "id": "string",
  "code": "string",
  "plate": "string",
  "capacity": 50,
  "status": "active|maintenance|inactive",
  "driverId": "string|null",
  "lastPosition": { "lat": 0, "lng": 0, "ts": "ISOString" }
}
```

---

### Tài xế (Driver)

Một tài nguyên đại diện cho một tài xế.

**Các Endpoints:**

- `GET /api/drivers`
- `GET /api/drivers/:id`
- `POST /api/drivers`
  - **Dữ liệu gửi lên (Request Body)**: `{ "name": "string", "phone": "string", "licenseNo": "string", "status": "string" }`
- `PUT /api/drivers/:id`
- `DELETE /api/drivers/:id`
- `GET /api/drivers/:id/assignments`
  - Trả về danh sách các lịch trình/chuyến đi đã được phân công cho tài xế này.

**Cấu trúc đối tượng Driver:**

```json
{
  "id": "string",
  "name": "string",
  "phone": "string",
  "licenseNo": "string",
  "status": "active|inactive"
}
```

---

### Lịch trình (Schedule)

Một tài nguyên đại diện cho một chuyến đi đã được lên lịch.

**Các Endpoints:**

- `GET /api/schedules`
  - Trả về danh sách tất cả lịch trình.
  - **Tham số truy vấn (Query Parameters)**:
    - `date` (string, `YYYY-MM-DD`): Lọc theo ngày.
    - `driverId` (string): Lọc theo tài xế được phân công.
    - `busId` (string): Lọc theo xe bus được phân công.
- `GET /api/schedules/:id`
- `POST /api/schedules`
  - **Dữ liệu gửi lên (Request Body)**: `{ "date": "string", "routeName": "string", "busId": "string", "driverId": "string", "startTime": "string", "endTime": "string" }`
- `PUT /api/schedules/:id`
- `DELETE /api/schedules/:id`
- `POST /api/schedules/:id/assign`
  - Phân công xe và/hoặc tài xế cho một lịch trình. Có kiểm tra các ràng buộc để tránh trùng lặp.
  - **Dữ liệu gửi lên (Request Body)**: `{ "busId": "string", "driverId": "string" }`
- `POST /api/schedules/:id/trip-status`
  - Cập nhật trạng thái trực tiếp của chuyến đi (ví dụ: từ 'đã lên lịch' sang 'đang diễn ra').
  - **Dữ liệu gửi lên (Request Body)**: `{ "status": "string" }`
  - **Phát sự kiện (Emits)**: `trip_status_change` qua Socket.IO.

**Cấu trúc đối tượng Schedule:**

```json
{
  "id": "string",
  "date": "YYYY-MM-DD",
  "routeName": "string",
  "busId": "string|null",
  "driverId": "string|null",
  "startTime": "HH:mm",
  "endTime": "HH:mm",
  "status": "scheduled|in_progress|completed|cancelled"
}
```

---

## Sự kiện Real-time (Socket.IO)

- **Namespace**: Mặc định (`/`)
- **Phòng (Rooms)**: Client nên tham gia vào các phòng có tên `bus-:busId` để nhận các cập nhật được nhắm mục tiêu cho một xe bus cụ thể.

- **Các sự kiện do Server phát đi:**
  - `bus_position_update`
    - **Mô tả**: Được gửi khi vị trí của xe bus được cập nhật qua API.
    - **Dữ liệu (Payload)**: `{ "busId": "string", "position": { "lat": number, "lng": number, "ts": "ISOString" } }`
  - `trip_status_change`
    - **Mô tả**: Được gửi khi trạng thái trực tiếp của một lịch trình thay đổi.
    - **Dữ liệu (Payload)**: `{ "scheduleId": "string", "busId": "string", "status": "string", "ts": "ISOString" }`

---

## Cấu trúc Lỗi (Error Model)

Tất cả các lỗi từ API sẽ được trả về theo một định dạng JSON nhất quán:

```json
{
  "message": "Một thông báo lỗi có mô tả."
}
```

---

## Ghi chú

- **ID**: Trong bản demo này, ID là các chuỗi được tạo ra (ví dụ: dùng nanoid). Trong production, chúng nên là các số tự tăng hoặc UUID do database tạo ra.
- **Validation**: Việc kiểm tra dữ liệu hiện được thực hiện bằng các câu lệnh `if` cơ bản. Trong production, nên được xử lý bằng một thư viện validation chuyên dụng như Joi hoặc Zod ở tầng middleware.
