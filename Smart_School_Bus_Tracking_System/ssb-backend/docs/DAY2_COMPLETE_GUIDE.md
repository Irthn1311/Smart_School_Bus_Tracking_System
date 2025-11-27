# 📚 DAY 2 COMPLETE GUIDE - START TRIP API

**Ngày hoàn thành:** 27/10/2025  
**Người thực hiện:** Nguyễn Tuấn Tài  
**Module:** M4/M5/M6 - Backend Realtime & Trip Lifecycle  
**Mục tiêu:** Xây dựng API để tài xế bắt đầu chuyến đi

---

## 📑 MỤC LỤC

1. [Tổng quan](#tổng-quan)
2. [Nhiệm vụ 1: Tạo Routes](#nhiệm-vụ-1-tạo-routes)
3. [Nhiệm vụ 2: Controller & Service](#nhiệm-vụ-2-controller--service)
4. [Cách test API](#cách-test-api)
5. [Bug fixes & Lessons learned](#bug-fixes--lessons-learned)
6. [Kết luận & Next steps](#kết-luận--next-steps)

---

## 🎯 TỔNG QUAN

### **API Endpoint:**

```
POST /api/v1/trips/:id/start
```

### **Mục đích:**

- Tài xế bắt đầu chuyến đi từ mobile app
- Cập nhật trạng thái chuyến từ `chua_khoi_hanh` → `dang_chay`
- Ghi nhận thời gian bắt đầu thực tế vào database
- Emit Socket.IO event để thông báo realtime (Day 3)

### **Kiến trúc layered:**

```
Driver App (Mobile)
    ↓ POST /api/v1/trips/3/start + JWT token
Route (trip.route.js)
    ↓ Verify JWT → Gọi controller
Controller (TripController.startTrip)
    ↓ Parse request → Gọi service
Service (tripService.startTrip)
    ↓ Business logic → Gọi model
Model (ChuyenDiModel.update)
    ↓ Execute SQL UPDATE
Database (MySQL - ChuyenDi table)
```

### **3 files core đã tạo/sửa:**

1. ✅ `src/routes/api/trip.js` - Route definitions
2. ✅ `src/controllers/tripController.js` - HTTP handlers
3. ✅ `src/services/tripService.js` - Business logic (NEW)

---

## 📝 NHIỆM VỤ 1: TẠO ROUTES

### **1.1. Tại sao cần Route?**

Route giống như **"bảng chỉ đường"** trong hệ thống API. Khi driver app gửi request `POST /api/trips/123/start`, Express cần biết:

- ✅ URL này có tồn tại không?
- ✅ Ai được phép truy cập? (Authentication)
- ✅ Gọi hàm nào để xử lý? (Controller)

**Flow:**

```
Driver nhấn "Bắt đầu" → App gửi POST /api/trips/123/start
    → Express tìm route
    → router.post("/:id/start", ...)
    → TripController.startTrip()
    → Response: { success: true }
```

### **1.2. Code đã thêm vào `trip.route.js`:**

```javascript
import { Router } from "express";
import TripController from "../../controllers/TripController.js";
import AuthMiddleware from "../../middlewares/AuthMiddleware.js";

const router = Router();

// POST /api/v1/trips/:id/start
router.post(
  "/:id/start", // ← URL pattern
  AuthMiddleware.authenticate, // ← Verify JWT
  TripController.startTrip // ← Handler
);

export default router;
```

**Giải thích từng dòng:**

| Dòng                          | Ý nghĩa                                                            |
| ----------------------------- | ------------------------------------------------------------------ |
| `"/:id/start"`                | Route parameter động. `/trips/123/start` → `req.params.id = "123"` |
| `AuthMiddleware.authenticate` | Middleware chạy TRƯỚC controller. Check JWT token hợp lệ.          |
| `TripController.startTrip`    | Controller function xử lý logic chính.                             |

### **1.3. Mount route vào Express app:**

**File `src/server.ts`:**

```typescript
import tripRoutes from "./routes/api/trip.js";

app.use(`${API_PREFIX}/trips`, tripRoutes);
// Kết quả: /api/v1/trips + /:id/start = /api/v1/trips/:id/start
```

### **1.4. Middleware Authentication:**

```javascript
// AuthMiddleware.authenticate kiểm tra:
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    ↓
jwt.verify(token, JWT_SECRET)
    ↓
Nếu OK: req.user = decoded → next()
Nếu FAIL: res.status(401).json({ error: "Unauthorized" })
```

---

## 🏗️ NHIỆM VỤ 2: CONTROLLER & SERVICE

### **2.1. Tại sao cần tách Service layer?**

**Vấn đề khi KHÔNG có Service:**

```javascript
// Controller chứa TẤT CẢ logic (BAD ❌)
static async startTrip(req, res) {
  try {
    // 100+ dòng code:
    // - Validate trip tồn tại
    // - Check trạng thái
    // - Tính thời gian
    // - Update DB
    // - Emit Socket.IO
    // 😱 Rất khó đọc, test, maintain!
  } catch (error) { ... }
}
```

**Giải pháp với Service layer (GOOD ✅):**

```javascript
// Controller: Chỉ xử lý HTTP ,
static async startTrip(req, res) {
  const trip = await tripService.startTrip(req.params.id); // ← Gọn!
  res.json({ success: true, trip });
}

// Service: Chứa TOÀN BỘ logic nghiệp vụ
static async startTrip(tripId) {
  // Validate, calculate, update DB
  return updatedTrip;
}
```

**Lợi ích:**

- ✅ **Tái sử dụng**: Service dùng được cho REST API, WebSocket, Cronjob
- ✅ **Dễ test**: Test service không cần HTTP request
- ✅ **Rõ ràng**: Mỗi layer làm 1 việc duy nhất
- ✅ **Maintain**: Sửa logic không ảnh hưởng HTTP code

### **2.2. Service Layer - tripService.js (NEW)**

**File hoàn chỉnh:**

```javascript
import ChuyenDiModel from "../models/ChuyenDiModel.js";

class TripService {
  static async startTrip(tripId) {
    // Step 1: Kiểm tra trip tồn tại
    const trip = await ChuyenDiModel.getById(tripId);
    if (!trip) {
      throw new Error("Không tìm thấy chuyến đi");
    }

    // Step 2: Kiểm tra trạng thái hợp lệ
    if (trip.trangThai !== "chua_khoi_hanh") {
      throw new Error("Chỉ có thể bắt đầu chuyến đi chưa khởi hành");
    }

    // Step 3: Tính thời gian bắt đầu (ISO format cho TIMESTAMP)
    const startTime = new Date().toISOString();
    // VD: "2025-10-27T07:30:15.123Z"

    // Step 4: Update database (DYNAMIC UPDATE)
    const isUpdated = await ChuyenDiModel.update(tripId, {
      trangThai: "dang_chay",
      gioBatDauThucTe: startTime,
    });

    if (!isUpdated) {
      throw new Error("Không thể bắt đầu chuyến đi");
    }

    // Step 5: Lấy data mới và trả về
    const updatedTrip = await ChuyenDiModel.getById(tripId);

    console.log("[WS-Event] trip_started", {
      tripId,
      startTs: startTime,
    });

    return updatedTrip;
  }
}

export default TripService;
```

**Giải thích từng bước:**

| Bước | Code                                       | Mục đích                                                                                |
| ---- | ------------------------------------------ | --------------------------------------------------------------------------------------- |
| 1    | `ChuyenDiModel.getById(tripId)`            | Kiểm tra trip có tồn tại không. Tránh update trip không có.                             |
| 2    | `if (trip.trangThai !== "chua_khoi_hanh")` | Business rule: Chỉ start trip chưa khởi hành. Từ chối "dang_chay", "hoan_thanh", "huy". |
| 3    | `new Date().toISOString()`                 | Lấy timestamp hiện tại. Format: ISO 8601 để lưu vào MySQL TIMESTAMP.                    |
| 4    | `ChuyenDiModel.update(tripId, {...})`      | Cập nhật database với dynamic UPDATE. Chỉ set các field có trong object.                |
| 5    | `ChuyenDiModel.getById(tripId)`            | Query lại DB để lấy data đã update (MySQL UPDATE không return data).                    |

### **2.3. Controller Layer - TripController.js**

**Hàm `startTrip()` đã cập nhật:**

```javascript
import tripService from "../services/tripService.js";
import LichTrinhModel from "../models/LichTrinhModel.js";

class TripController {
  static async startTrip(req, res) {
    try {
      const { id } = req.params; // Trip ID từ URL

      // Gọi service để xử lý logic
      const trip = await tripService.startTrip(id);

      // Emit Socket.IO event (Day 3)
      const io = req.app.get("io");
      if (io) {
        const schedule = await LichTrinhModel.getById(trip.maLichTrinh);
        io.to(`bus-${schedule.maXe}`).emit("trip_started", {
          tripId: trip.maChuyen,
          busId: schedule.maXe,
          startTime: trip.gioBatDauThucTe,
        });
      }

      // Trả response
      res.status(200).json({
        success: true,
        data: trip,
        message: "Bắt đầu chuyến đi thành công",
      });
    } catch (error) {
      console.error("❌ Error in startTrip:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi server khi bắt đầu chuyến đi",
        error: error.message,
      });
    }
  }
}

export default TripController;
```

**Nhiệm vụ của Controller:**

1. ✅ Nhận request (lấy `id` từ `req.params`)
2. ✅ Gọi service (delegate toàn bộ logic)
3. ✅ Emit Socket.IO event (realtime notification)
4. ✅ Trả response (format JSON chuẩn)
5. ✅ Handle errors (catch & return 500)

---

## 🧪 CÁCH TEST API

### **3.1. Chuẩn bị môi trường:**

**1. Start MySQL:**

```powershell
net start MySQL80
```

**2. Start Backend Server:**

```powershell
cd ssb-backend
npm run dev
# Hoặc: node --watch src/server.js
```

**3. Login để lấy JWT token:**

```http
POST http://localhost:4000/api/v1/auth/login
Content-Type: application/json

{
  "email": "taixe1@schoolbus.vn",
  "matKhau": "password"
}
```

**Response:**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

**Lưu token này để dùng cho các test sau!**

### **3.2. Test Cases:**

#### ✅ **CASE 1: Thành công**

**Điều kiện:**

- Trip có `trangThai = "chua_khoi_hanh"`
- Token hợp lệ

**Request (Postman/Thunder Client):**

```http
POST http://localhost:4000/api/v1/trips/3/start
Authorization: Bearer <YOUR_TOKEN>
Content-Type: application/json

{}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "maChuyen": 3,
    "trangThai": "dang_chay",
    "gioBatDauThucTe": "2025-10-27T07:46:22.000Z",
    "ngayCapNhat": "2025-10-27T07:46:22.000Z",
    ...
  },
  "message": "Bắt đầu chuyến đi thành công"
}
```

**Kiểm tra DB:**

```sql
SELECT maChuyen, trangThai, gioBatDauThucTe
FROM ChuyenDi WHERE maChuyen = 3;

-- Kết quả:
-- maChuyen | trangThai | gioBatDauThucTe
-- 3        | dang_chay | 2025-10-27 07:46:22
```

#### ❌ **CASE 2: Start 2 lần (Duplicate)**

**Điều kiện:**

- Trip đã có `trangThai = "dang_chay"`

**Request:**

```http
POST http://localhost:4000/api/v1/trips/3/start
Authorization: Bearer <TOKEN>
```

**Response (500):**

```json
{
  "success": false,
  "message": "Lỗi server khi bắt đầu chuyến đi",
  "error": "Chỉ có thể bắt đầu chuyến đi chưa khởi hành"
}
```

**Lý do:** Service check `trangThai !== "chua_khoi_hanh"` → throw error

#### ❌ **CASE 3: Trip không tồn tại**

**Request:**

```http
POST http://localhost:4000/api/v1/trips/999/start
Authorization: Bearer <TOKEN>
```

**Response (500):**

```json
{
  "success": false,
  "error": "Không tìm thấy chuyến đi"
}
```

#### ❌ **CASE 4: Không có token**

**Request:**

```http
POST http://localhost:4000/api/v1/trips/3/start
(KHÔNG có header Authorization)
```

**Response (401):**

```json
{
  "success": false,
  "message": "Token không hợp lệ hoặc đã hết hạn"
}
```

### **3.3. Reset trip để test lại:**

**Tạo file `src/scripts/reset_trip.js`:**

```javascript
import pool from "../config/db.js";

(async () => {
  const [result] = await pool.query(`
    UPDATE ChuyenDi 
    SET trangThai = 'chua_khoi_hanh',
        gioBatDauThucTe = NULL
    WHERE maChuyen = 3
  `);

  console.log(`✅ Reset trip 3 thành công (${result.affectedRows} rows)`);
  pool.end();
})();
```

**Chạy:**

```bash
node src/scripts/reset_trip.js
```

### **3.4. Tools để test:**

**Option 1: Thunder Client (VS Code Extension)**

- Cài extension "Thunder Client"
- New Request → POST → Paste URL
- Headers: Authorization: Bearer <token>
- Send

**Option 2: Postman**

- Import collection từ `docs/postman_collection.json`
- Set environment variable `token`
- Run collection

**Option 3: cURL (PowerShell)**

```powershell
$token = "eyJhbGci..."
Invoke-WebRequest `
  -Uri "http://localhost:4000/api/v1/trips/3/start" `
  -Method POST `
  -Headers @{"Authorization"="Bearer $token"}
```

---

## 🐛 BUG FIXES & LESSONS LEARNED

### **Bug 1: Foreign Key Constraint Error**

**Lỗi:**

```
Cannot add or update a child row:
a foreign key constraint fails (`ChuyenDi`,
CONSTRAINT `ChuyenDi_ibfk_1` FOREIGN KEY (`maLichTrinh`)
REFERENCES `LichTrinh` (`maLichTrinh`))
```

**Nguyên nhân:**

- `ChuyenDiModel.update()` gửi **TẤT CẢ** fields vào UPDATE
- Các field undefined → NULL trong SQL
- `maLichTrinh = NULL` → Violate foreign key!

**Code lỗi (OLD):**

```javascript
static async update(id, data) {
  const [result] = await pool.query(
    `UPDATE ChuyenDi SET
      maLichTrinh = ?,
      ngayChay = ?,
      trangThai = ?,
      gioBatDauThucTe = ?,
      gioKetThucThucTe = ?,
      ghiChu = ?
    WHERE maChuyen = ?`,
    [
      data.maLichTrinh,    // ← undefined → NULL!
      data.ngayChay,
      data.trangThai,
      data.gioBatDauThucTe,
      data.gioKetThucThucTe,
      data.ghiChu,
      id,
    ]
  );
}
```

**Fix: Dynamic UPDATE (NEW):**

```javascript
static async update(id, data) {
  const fields = [];
  const values = [];

  // Chỉ thêm field có giá trị
  if (data.trangThai !== undefined) {
    fields.push("trangThai = ?");
    values.push(data.trangThai);
  }
  if (data.gioBatDauThucTe !== undefined) {
    fields.push("gioBatDauThucTe = ?");
    values.push(data.gioBatDauThucTe);
  }
  // ... tương tự cho các field khác

  const sql = `UPDATE ChuyenDi SET ${fields.join(", ")} WHERE maChuyen = ?`;
  values.push(id);

  const [result] = await pool.query(sql, values);
  return result.affectedRows > 0;
}
```

**Bài học:**
✅ Không nên UPDATE tất cả columns mỗi lần  
✅ Chỉ UPDATE những field thực sự thay đổi  
✅ Dynamic query builder an toàn hơn

### **Bug 2: gioBatDauThucTe Always NULL**

**Triệu chứng:**

- API trả về `success: true`
- Database UPDATED
- Nhưng `gioBatDauThucTe` luôn = `NULL`! 😱

**Debug process:**

**Bước 1: Thêm console.log trong service**

```javascript
const startTime = new Date().toISOString().slice(11, 19);
console.log("🕐 startTime:", startTime); // Output: "14:42:09"
```

**Bước 2: Check DB trực tiếp**

```javascript
// check_db.js
const [rows] = await pool.query("SELECT * FROM ChuyenDi WHERE maChuyen = 3");
console.log("gioBatDauThucTe:", rows[0].gioBatDauThucTe);
// Output: Invalid Date ❌
```

**Bước 3: Phát hiện root cause**

- Database column type: **TIMESTAMP** (not TIME!)
- Code đang gửi: `"14:42:09"` (TIME string)
- MySQL nhận: `"14:42:09"` → Parse failed → Store `Invalid Date`
- JavaScript đọc: `Invalid Date` → Convert to `null`

**Nguyên nhân:**

```
Column: gioBatDauThucTe TIMESTAMP
Code gửi: "14:42:09" (chỉ có time, không có date)
MySQL parse: FAILED → Invalid Date
JS read: Invalid Date object → null
```

**Fix: Dùng full ISO timestamp**

```javascript
// OLD (BAD):
const startTime = new Date().toISOString().slice(11, 19);
// "14:42:09" ← Chỉ có time!

// NEW (GOOD):
const startTime = new Date().toISOString();
// "2025-10-27T14:42:09.123Z" ← Full timestamp!
```

**Bài học:**
✅ **Luôn check database schema** trước khi code  
✅ TIMESTAMP cần full datetime, không phải chỉ time  
✅ `.toISOString()` là cách tốt nhất để lưu timestamp  
✅ Dùng console.log debug từng bước trong flow

### **Lesson 3: Server Auto-reload vs Manual Restart**

**Vấn đề:**

- Dùng `tsx watch` để auto-reload
- Sửa code → Server auto-restart
- Nhưng console.log cũ vẫn hiển thị! 😵

**Nguyên nhân:**

- `tsx watch` không clear console
- Logs từ nhiều lần restart chồng lên nhau

**Giải pháp:**

```bash
# Thay vì tsx watch
npm run dev

# Restart thủ công khi cần debug
Ctrl+C → npm run dev
```

**Bài học:**
✅ Auto-reload tốt cho development nhanh  
✅ Manual restart tốt hơn khi debug chi tiết  
✅ Clear console trước mỗi lần debug

---

## 📊 TÓM TẮT

### **Files đã tạo/sửa:**

| File                                | Loại    | Mô tả                        |
| ----------------------------------- | ------- | ---------------------------- |
| `src/routes/api/trip.js`            | Sửa     | Thêm route `POST /:id/start` |
| `src/controllers/tripController.js` | Sửa     | Update `startTrip()` method  |
| `src/services/tripService.js`       | **MỚI** | Business logic layer         |
| `src/models/ChuyenDiModel.js`       | Sửa     | Dynamic `update()` method    |
| `src/scripts/reset_trip.js`         | **MỚI** | Test helper script           |
| `src/scripts/check_db.js`           | **MỚI** | Debug script                 |

### **Công nghệ sử dụng:**

- **Backend:** Node.js, Express.js
- **Database:** MySQL với connection pool
- **Authentication:** JWT Bearer token
- **Realtime:** Socket.IO (準備 Day 3)
- **Testing:** Thunder Client, Postman, cURL

### **Test Results:**

| Test Case             | Status  | HTTP Code | Note                            |
| --------------------- | ------- | --------- | ------------------------------- |
| Start trip thành công | ✅ PASS | 200       | gioBatDauThucTe saved correctly |
| Start trip 2 lần      | ✅ PASS | 500       | Rejected with error message     |
| Trip không tồn tại    | ✅ PASS | 500       | "Không tìm thấy chuyến đi"      |
| Không có token        | ✅ PASS | 401       | Unauthorized                    |
| Token hết hạn         | ✅ PASS | 401       | "Token đã hết hạn"              |

---

## ✅ KẾT LUẬN & NEXT STEPS

### **Đã hoàn thành:**

- ✅ Route: `POST /api/v1/trips/:id/start`
- ✅ Controller: HTTP request/response handling
- ✅ Service: Business logic layer
- ✅ Model: Dynamic UPDATE query
- ✅ Bug fixes: Foreign key & TIMESTAMP issues
- ✅ Test scenarios: All 7 cases passed

### **Chuẩn bị Day 3:**

- [ ] Socket.IO realtime events
- [ ] Authorization: Check driver ownership
- [ ] Error handling: Custom error classes (NotFoundError, ValidationError)
- [ ] HTTP status codes: 404 thay vì 500 cho "not found"
- [ ] Logging: Winston/Morgan structured logs
- [ ] Rate limiting: Tránh spam API

### **Kiến thức thu được:**

1. **Layered Architecture:** Tách rõ Route → Controller → Service → Model
2. **Dynamic SQL:** Build query based on provided fields
3. **MySQL Types:** TIMESTAMP vs TIME, ISO format importance
4. **Debugging:** Console.log, direct DB query, step-by-step tracing
5. **Testing:** Multiple tools (Postman, cURL, Thunder Client)

---

**📅 Hoàn thành:** 27/10/2025 14:00  
**⏱️ Thời gian:** ~4 giờ (bao gồm debug)  
**🏆 Kết quả:** API hoạt động hoàn hảo!  
**🎯 Tiếp theo:** Day 3 - Socket.IO Realtime Events

---

**💡 Tips cho người đọc:**

- Đọc từ trên xuống theo thứ tự để hiểu flow
- Chạy thử các test cases để verify
- Dùng `reset_trip.js` để test lại nhiều lần
- Check console.log để hiểu data flow
- Đọc phần Bug Fixes để tránh mắc lỗi tương tự

**🔗 References:**

- API Design: `/docs/API_Design.md`
- Test Scenarios: `/TEST_SCENARIOS.md`
- Postman Collection: `/docs/postman_collection.json`
