# 🧪 TEST SCENARIOS - START TRIP API

---

## � KIẾN THỨC CƠ BẢN - ĐỌC TRƯỚC KHI TEST

### 🎯 Thunder Client là gì?

**Thunder Client** là một **extension của VS Code** để test API, giống như **Postman** nhưng nhẹ hơn và tích hợp ngay trong VS Code.

**So sánh:**

- **Thunder Client / Postman**: Tool test API (giả lập client) ✅ Thay thế frontend tạm thời
- **Frontend (React/Next.js)**: Giao diện thật cho user

**Tại sao cần Thunder Client?**

```
Frontend chưa làm → Dùng Thunder Client test API
      ↓
Thunder Client = Giả lập Driver App
      ↓
Gửi request giống như app thật
```

---

### 📮 POST Request là gì?

**POST** = Phương thức HTTP để **GỬI DỮ LIỆU** lên server

**Các thành phần của 1 request:**

```
┌─────────────────────────────────────────┐
│  Method: POST  ←─ Loại request          │
├─────────────────────────────────────────┤
│  URL: http://localhost:4000/api/v1/auth/login  │
│       ↑                                 │
│       Địa chỉ server                    │
├─────────────────────────────────────────┤
│  Headers:                               │
│    Content-Type: application/json       │
│    Authorization: Bearer <token>        │
├─────────────────────────────────────────┤
│  Body (JSON):                           │
│  {                                      │
│    "email": "taixe1@schoolbus.vn",     │
│    "matKhau": "password"               │
│  }                                      │
└─────────────────────────────────────────┘
         │
         ↓ Send
    Gửi đến Server
```

---

### 🛣️ Dữ liệu đi đâu khi nhấn Send?

**Luồng dữ liệu chi tiết:**

```
Thunder Client (VS Code Extension)
    │
    │ Gửi: POST http://localhost:4000/api/v1/auth/login
    │ Body: { email: "taixe1@schoolbus.vn", matKhau: "password" }
    ↓
Express Server (PHẢI chạy npm run dev trước!)
    │
    │ Server đang lắng nghe ở port 4000
    ↓
src/server.ts
    │
    │ app.use('/api/v1/auth', authRoutes)
    │ → Nhận request tại /api/v1/auth/login
    ↓
src/routes/api/auth.js
    │
    │ router.post('/login', AuthController.login)
    │ → Route đến controller
    ↓
src/controllers/AuthController.js
    │
    │ static async login(req, res) {
    │   const { email, matKhau } = req.body ← Lấy data từ Thunder Client
    │   // Gọi service...
    │ }
    ↓
src/services/authService.js
    │
    │ static async login(email, matKhau) {
    │   // 1. Tìm user trong DB
    │   // 2. So sánh password với bcrypt
    │   // 3. Tạo JWT token
    │   return { user, token }
    │ }
    ↓
src/models/NguoiDungModel.js
    │
    │ static async findByEmail(email) {
    │   const [rows] = await pool.query(
    │     'SELECT * FROM NguoiDung WHERE email = ?',
    │     [email]
    │   )
    │   return rows[0]
    │ }
    ↓
MySQL Database
    │
    │ SELECT * FROM NguoiDung WHERE email = 'taixe1@schoolbus.vn'
    │ → Trả về user data
    ↓
Service tạo JWT token
    ↓
Controller trả response
    ↓
Thunder Client nhận response:
{
  "success": true,
  "data": {
    "user": { ... },
    "token": "eyJhbGci..."
  },
  "message": "Đăng nhập thành công"
}
```

---

### ⚙️ Tại sao phải chạy `npm run dev` trước?

**`npm run dev`** = **Khởi động server backend**

```
TRƯỚC khi npm run dev:
┌────────────────┐
│ Thunder Client │ → Send request
└────────────────┘
        │
        ↓
     ❌ KHÔNG CÓ SERVER NGHE!
     → Error: "Cannot connect to localhost:4000"


SAU khi npm run dev:
┌────────────────┐
│ Thunder Client │ → Send request
└────────────────┘
        │
        ↓
┌─────────────────────────────┐
│ ✅ Express Server đang chạy │ ← Lắng nghe port 4000
│    http://localhost:4000    │
└─────────────────────────────┘
        │
        ↓
    Nhận request & xử lý
        │
        ↓
    Trả response về Thunder Client
```

**Console khi chạy `npm run dev`:**

```bash
🚀 SSB Backend Server running on port 4000
📊 Environment: development
🔗 API Base URL: http://localhost:4000/api/v1
❤️  Health Check: http://localhost:4000/api/v1/health
📡 Socket.IO: http://localhost:4000
```

→ **Server PHẢI chạy thì mới nhận request được!**

---

### 🔄 QUY TRÌNH TEST API HOÀN CHỈNH

```
BƯỚC 1: Khởi động server
    Terminal → npm run dev
    → Server chạy ở http://localhost:4000

BƯỚC 2: Mở Thunder Client
    VS Code → Thunder Client extension
    → New Request

BƯỚC 3: Setup request
    Method: POST
    URL: http://localhost:4000/api/v1/auth/login
    Body (JSON):
    {
      "email": "taixe1@schoolbus.vn",
      "matKhau": "password"
    }

BƯỚC 4: Nhấn Send
    → Thunder Client gửi request
    → Server nhận & xử lý
    → Server trả response

BƯỚC 5: Xem kết quả
    Tab "Response" → Xem JSON response
    Copy token để dùng cho test tiếp theo
```

---

### 🚀 START TRIP API - LUỒNG CHI TIẾT

**Request cụ thể:**

```
Method: POST
URL: http://localhost:4000/api/v1/trips/3/start
Headers:
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  Content-Type: application/json
Body:
  {} (để trống - không cần gửi data)
```

**Luồng xử lý từng bước:**

```
┌─────────────────────────────────────────────────┐
│ BƯỚC 1: Thunder Client gửi request             │
└─────────────────────────────────────────────────┘
POST http://localhost:4000/api/v1/trips/3/start
Headers: { Authorization: "Bearer eyJhbGci..." }
Body: {}
                    ↓
┌─────────────────────────────────────────────────┐
│ BƯỚC 2: Express Server nhận request            │
└─────────────────────────────────────────────────┘
File: src/server.ts

app.use('/api/v1/trips', tripRoutes);
→ Match URL: /api/v1/trips/3/start
→ Forward request đến tripRoutes
                    ↓
┌─────────────────────────────────────────────────┐
│ BƯỚC 3: Route matching                          │
└─────────────────────────────────────────────────┘
File: src/routes/api/trip.js

router.post('/:id/start', AuthMiddleware.authenticate, TripController.startTrip);
→ URL pattern: /:id/start
→ Match với: /3/start
→ req.params.id = "3"
→ Chạy middleware: AuthMiddleware.authenticate
                    ↓
┌─────────────────────────────────────────────────┐
│ BƯỚC 4: Authentication Middleware              │
└─────────────────────────────────────────────────┘
File: src/middlewares/AuthMiddleware.js

static async authenticate(req, res, next) {
  // 1. Lấy token từ header
  const authHeader = req.headers.authorization;
  // → "Bearer eyJhbGci..."

  // 2. Tách token
  const token = authHeader.split(' ')[1];
  // → "eyJhbGci..."

  // 3. Verify token
  const decoded = jwt.verify(token, JWT_SECRET);
  // → { userId: 2, email: "taixe1@...", vaiTro: "tai_xe" }

  // 4. Gắn user vào req
  req.user = decoded;

  // 5. Cho phép tiếp tục
  next();
}

→ Nếu token hợp lệ: Chuyển sang controller
→ Nếu token sai: Trả về 401 Unauthorized
                    ↓
┌─────────────────────────────────────────────────┐
│ BƯỚC 5: Trip Controller                         │
└─────────────────────────────────────────────────┘
File: src/controllers/tripController.js

static async startTrip(req, res) {
  // 1. Lấy trip ID từ URL params
  const { id } = req.params;
  // → id = "3"

  // 2. User info từ middleware (nếu cần check authorization)
  const userId = req.user.userId;
  // → userId = 2

  // 3. Gọi service để xử lý logic
  const trip = await tripService.startTrip(id);

  // 4. Emit Socket.IO event (Day 3)
  const io = req.app.get("io");
  if (io) {
    io.to(`bus-${trip.maXe}`).emit("trip_started", {
      tripId: trip.maChuyen,
      startTime: trip.gioBatDauThucTe
    });
  }

  // 5. Trả response
  res.json({
    success: true,
    data: trip,
    message: "Bắt đầu chuyến đi thành công"
  });
}
                    ↓
┌─────────────────────────────────────────────────┐
│ BƯỚC 6: Trip Service (Business Logic)          │
└─────────────────────────────────────────────────┘
File: src/services/tripService.js

static async startTrip(tripId) {
  // 1. Check trip tồn tại
  const trip = await ChuyenDiModel.getById(tripId);
  // → Query: SELECT * FROM ChuyenDi WHERE maChuyen = 3

  if (!trip) {
    throw new Error("Không tìm thấy chuyến đi");
  }

  // 2. Check trạng thái hợp lệ
  if (trip.trangThai !== "chua_khoi_hanh") {
    throw new Error("Chỉ có thể bắt đầu chuyến đi chưa khởi hành");
  }

  // 3. Tính thời gian bắt đầu
  const startTime = new Date().toISOString();
  // → "2025-10-27T07:46:22.123Z"

  // 4. Update database
  await ChuyenDiModel.update(tripId, {
    trangThai: "dang_chay",
    gioBatDauThucTe: startTime
  });

  // 5. Lấy data mới
  const updatedTrip = await ChuyenDiModel.getById(tripId);

  console.log("[WS-Event] trip_started", { tripId, startTime });

  return updatedTrip;
}
                    ↓
┌─────────────────────────────────────────────────┐
│ BƯỚC 7: ChuyenDi Model (Database Query)        │
└─────────────────────────────────────────────────┘
File: src/models/ChuyenDiModel.js

// 7a. getById(3)
static async getById(id) {
  const [rows] = await pool.query(
    `SELECT cd.*, lt.loaiChuyen, lt.gioKhoiHanh, ...
     FROM ChuyenDi cd
     JOIN LichTrinh lt ON cd.maLichTrinh = lt.maLichTrinh
     WHERE cd.maChuyen = ?`,
    [id]
  );
  return rows[0];
}

// 7b. update(3, { trangThai, gioBatDauThucTe })
static async update(id, data) {
  // Dynamic UPDATE - chỉ update field có trong data
  const fields = [];
  const values = [];

  if (data.trangThai !== undefined) {
    fields.push("trangThai = ?");
    values.push(data.trangThai);
  }
  if (data.gioBatDauThucTe !== undefined) {
    fields.push("gioBatDauThucTe = ?");
    values.push(data.gioBatDauThucTe);
  }

  const sql = `UPDATE ChuyenDi SET ${fields.join(", ")} WHERE maChuyen = ?`;
  values.push(id);

  const [result] = await pool.query(sql, values);
  return result.affectedRows > 0;
}
                    ↓
┌─────────────────────────────────────────────────┐
│ BƯỚC 8: MySQL Database                          │
└─────────────────────────────────────────────────┘
Database: school_bus_system
Table: ChuyenDi

-- Query 1: SELECT (kiểm tra trip)
SELECT * FROM ChuyenDi WHERE maChuyen = 3
→ Trả về: { maChuyen: 3, trangThai: "chua_khoi_hanh", ... }

-- Query 2: UPDATE (bắt đầu trip)
UPDATE ChuyenDi
SET trangThai = 'dang_chay',
    gioBatDauThucTe = '2025-10-27T07:46:22.123Z'
WHERE maChuyen = 3
→ Affected rows: 1

-- Query 3: SELECT (lấy data mới)
SELECT * FROM ChuyenDi WHERE maChuyen = 3
→ Trả về: {
    maChuyen: 3,
    trangThai: "dang_chay",
    gioBatDauThucTe: "2025-10-27T07:46:22.000Z",
    ...
  }
                    ↓
┌─────────────────────────────────────────────────┐
│ BƯỚC 9: Response trả về Thunder Client         │
└─────────────────────────────────────────────────┘
HTTP Status: 200 OK
Body (JSON):
{
  "success": true,
  "data": {
    "maChuyen": 3,
    "maLichTrinh": 1,
    "ngayChay": "2025-10-27",
    "trangThai": "dang_chay",          ← Changed!
    "gioBatDauThucTe": "2025-10-27T07:46:22.000Z",  ← New!
    "gioKetThucThucTe": null,
    "ghiChu": null,
    "loaiChuyen": "di",
    "gioKhoiHanh": "06:30:00",
    "tenTuyen": "Tuyến 1",
    "bienSoXe": "51A-12345",
    "tenTaiXe": "Trần Văn Tài"
  },
  "message": "Bắt đầu chuyến đi thành công"
}
```

---

### 🔑 TẠI SAO CẦN AUTHORIZATION HEADER?

**Không có token:**

```
POST /api/v1/trips/3/start
Headers: (không có Authorization)
    ↓
AuthMiddleware.authenticate
    ↓
❌ Error: "Token không được cung cấp"
    ↓
Response: 401 Unauthorized
```

**Có token:**

```
POST /api/v1/trips/3/start
Headers: { Authorization: "Bearer eyJhbGci..." }
    ↓
AuthMiddleware.authenticate
    ↓
✅ jwt.verify(token, JWT_SECRET)
    ↓
req.user = { userId: 2, email: "taixe1@...", vaiTro: "tai_xe" }
    ↓
Cho phép truy cập → Gọi controller
```

**Token chứa gì?**

```javascript
// Token được tạo từ login:
const token = jwt.sign(
  {
    userId: 2,
    email: "taixe1@schoolbus.vn",
    vaiTro: "tai_xe"
  },
  JWT_SECRET,  // Mã bí mật
  { expiresIn: "15m" }  // Hết hạn sau 15 phút
);

// Token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
// Khi verify, sẽ giải mã ra:
{
  userId: 2,
  email: "taixe1@schoolbus.vn",
  vaiTro: "tai_xe",
  iat: 1761581791,  // Issued at (thời gian tạo)
  exp: 1761582691   // Expires (thời gian hết hạn)
}
```

---

### 📊 SO SÁNH LOGIN vs START TRIP

| Đặc điểm           | Login API                                 | Start Trip API                                                 |
| ------------------ | ----------------------------------------- | -------------------------------------------------------------- |
| **URL**            | `/api/v1/auth/login`                      | `/api/v1/trips/3/start`                                        |
| **Method**         | POST                                      | POST                                                           |
| **Body**           | `{ email, matKhau }`                      | `{}` (trống)                                                   |
| **Headers**        | Chỉ cần `Content-Type`                    | Cần `Authorization: Bearer <token>`                            |
| **Authentication** | Không cần (đang login)                    | **CẦN** (đã login rồi)                                         |
| **Mục đích**       | Lấy token                                 | Dùng token để xác thực                                         |
| **Response**       | Trả về `token`                            | Trả về `trip data`                                             |
| **Files xử lý**    | authRoutes → AuthController → authService | tripRoutes → **AuthMiddleware** → TripController → tripService |

---

### 💡 TÓM TẮT

**Start Trip API hoạt động thế nào:**

1. **Thunder Client gửi:** POST `/api/v1/trips/3/start` + token
2. **Server routing:** `/api/v1/trips` + `/:id/start` → `req.params.id = "3"`
3. **AuthMiddleware:** Verify token → Lấy user info
4. **TripController:** Nhận `id` từ URL → Gọi service
5. **TripService:**
   - Check trip tồn tại
   - Check trạng thái = "chua_khoi_hanh"
   - Tính thời gian: `new Date().toISOString()`
   - Update DB: `trangThai = "dang_chay"`
6. **ChuyenDiModel:** Execute SQL UPDATE
7. **MySQL:** Update bảng ChuyenDi
8. **Response:** Trả về trip đã update

**Điểm khác với Login:**

- ✅ Login: Gửi email/password → Nhận token
- ✅ Start Trip: Gửi token → Được phép start trip

---

## 📋 CHUẨN BỊ TEST

### 1. Login để lấy token

**POST** `http://localhost:4000/api/v1/auth/login`

**Body:**

```json
{
  "email": "taixe1@schoolbus.vn",
  "matKhau": "password"
}
```

**Kết quả:** Lưu lại `token` để dùng cho các test sau

---

## ✅ TEST CASE 1: Start Trip Thành Công

### Điều kiện:

- Chuyến đi có trạng thái `chua_khoi_hanh`
- User có quyền tài xế

### Request:

**POST** `http://localhost:4000/api/v1/trips/3/start`

**Headers:**

```
Authorization: Bearer <token>
```

**Body:** `{}` (để trống)

### Kết quả mong đợi:

```json
{
  "success": true,
  "data": {
    "maChuyen": 3,
    "trangThai": "dang_chay",
    "gioBatDauThucTe": "14:25:30",
    ...
  },
  "message": "Bắt đầu chuyến đi thành công"
}
```

**Status Code:** `200 OK`

**Kiểm tra:**

- ✅ `trangThai` = "dang_chay"
- ✅ `gioBatDauThucTe` có giá trị (HH:MM:SS format)
- ✅ `ngayCapNhat` được cập nhật

---

## ❌ TEST CASE 2: Start Trip 2 Lần (Duplicate)

### Điều kiện:

- Đã start trip thành công ở Test Case 1
- Trip đang có trạng thái `dang_chay`

### Request:

**POST** `http://localhost:4000/api/v1/trips/3/start`

**Headers:**

```
Authorization: Bearer <token>
```

### Kết quả mong đợi:

```json
{
  "success": false,
  "message": "Lỗi server khi bắt đầu chuyến đi",
  "error": "Chỉ có thể bắt đầu chuyến đi chưa khởi hành"
}
```

**Status Code:** `500` (có thể cải thiện thành 400)

**Kiểm tra:**

- ✅ API từ chối request
- ✅ Trạng thái DB không đổi (vẫn là "dang_chay")
- ✅ Error message rõ ràng

---

## ❌ TEST CASE 3: Start Trip Không Tồn Tại

### Điều kiện:

- Trip ID không có trong database

### Request:

**POST** `http://localhost:4000/api/v1/trips/999/start`

**Headers:**

```
Authorization: Bearer <token>
```

### Kết quả mong đợi:

```json
{
  "success": false,
  "message": "Lỗi server khi bắt đầu chuyến đi",
  "error": "Không tìm thấy chuyến đi"
}
```

**Status Code:** `500` (nên cải thiện thành 404)

---

## ❌ TEST CASE 4: Start Trip Đã Hoàn Thành

### Điều kiện:

- Trip có trạng thái `hoan_thanh`

### Chuẩn bị:

```sql
-- Chạy SQL này trong MySQL
UPDATE ChuyenDi
SET trangThai = 'hoan_thanh',
    gioBatDauThucTe = '06:30:00',
    gioKetThucThucTe = '07:15:00'
WHERE maChuyen = 3;
```

### Request:

**POST** `http://localhost:4000/api/v1/trips/3/start`

**Headers:**

```
Authorization: Bearer <token>
```

### Kết quả mong đợi:

```json
{
  "success": false,
  "message": "Lỗi server khi bắt đầu chuyến đi",
  "error": "Chỉ có thể bắt đầu chuyến đi chưa khởi hành"
}
```

**Status Code:** `500` (nên cải thiện thành 400)

---

## ❌ TEST CASE 5: Start Trip Đã Bị Hủy

### Điều kiện:

- Trip có trạng thái `huy`

### Chuẩn bị:

```sql
UPDATE ChuyenDi
SET trangThai = 'huy',
    ghiChu = 'Tài xế bận đột xuất'
WHERE maChuyen = 3;
```

### Request:

**POST** `http://localhost:4000/api/v1/trips/3/start`

### Kết quả mong đợi:

```json
{
  "success": false,
  "message": "Lỗi server khi bắt đầu chuyến đi",
  "error": "Chỉ có thể bắt đầu chuyến đi chưa khởi hành"
}
```

---

## ❌ TEST CASE 6: Không Có Token (Unauthorized)

### Request:

**POST** `http://localhost:4000/api/v1/trips/3/start`

**Headers:** (Không gửi Authorization header)

### Kết quả mong đợi:

```json
{
  "success": false,
  "message": "Token không hợp lệ hoặc đã hết hạn"
}
```

**Status Code:** `401 Unauthorized`

---

## ❌ TEST CASE 7: Token Hết Hạn

### Điều kiện:

- Dùng token đã login quá 15 phút

### Request:

**POST** `http://localhost:4000/api/v1/trips/3/start`

**Headers:**

```
Authorization: Bearer <expired_token>
```

### Kết quả mong đợi:

```json
{
  "success": false,
  "message": "Token không hợp lệ hoặc đã hết hạn"
}
```

**Status Code:** `401 Unauthorized`

---

## 🔄 Reset Script

Để test lại từ đầu, chạy:

```bash
node src/reset_trip.js
```

Script này sẽ:

- Reset `trangThai` → "chua_khoi_hanh"
- Xóa `gioBatDauThucTe` → NULL
- Xóa `gioKetThucThucTe` → NULL

---

## 📊 Checklist Tổng Hợp

### Functionality

- [ ] ✅ Start trip thành công (Case 1)
- [ ] ❌ Từ chối start 2 lần (Case 2)
- [ ] ❌ Từ chối trip không tồn tại (Case 3)
- [ ] ❌ Từ chối trip đã hoàn thành (Case 4)
- [ ] ❌ Từ chối trip đã hủy (Case 5)

### Security

- [ ] ❌ Từ chối request không có token (Case 6)
- [ ] ❌ Từ chối token hết hạn (Case 7)

### Data Validation

- [ ] ✅ `gioBatDauThucTe` được lưu đúng format HH:MM:SS
- [ ] ✅ `ngayCapNhat` tự động update
- [ ] ✅ Database transaction không bị lỗi

### Performance

- [ ] Response time < 200ms (local)
- [ ] Không có memory leak
- [ ] Connection pool hoạt động đúng

---

## 🐛 Known Issues & Improvements

### Issues:

1. **Status Code không chuẩn REST:**

   - Hiện tại: Mọi lỗi đều trả 500
   - Nên: 404 (Not Found), 400 (Bad Request), 401 (Unauthorized)

2. **Error handling chưa chi tiết:**
   - Service throw generic Error
   - Nên: Tạo custom error classes (NotFoundError, ValidationError...)

### Improvements cho Day 3:

1. Authorization: Check driver có phải chủ của chuyến đi không
2. Socket.IO: Emit event khi start trip
3. Logging: Log mọi hành động start trip
4. Rate limiting: Tránh spam API

---

## 🎯 Kết Luận

**API hoạt động:** ✅ Thành công!

**Điểm mạnh:**

- Logic nghiệp vụ đúng
- Validation trạng thái chặt chẽ
- Database update chính xác

**Cần cải thiện:**

- HTTP status codes
- Error handling
- Authorization

**Next Steps:**

- [ ] Fix status codes
- [ ] Add authorization check
- [ ] Implement Socket.IO (Day 3)
