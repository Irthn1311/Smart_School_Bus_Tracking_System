# 📍 API Routes Documentation

Tài liệu tổng hợp tất cả **API Routes** của hệ thống Smart School Bus Tracking System.

## 📋 Tổng Quan

| Module        | Base URL            | Route File      | Controller           | Endpoints |
| ------------- | ------------------- | --------------- | -------------------- | --------- |
| **Auth**      | `/api/v1/auth`      | `auth.route.js` | `AuthController`     | 5         |
| **Buses**     | `/api/v1/buses`     | `bus.js`        | `BusController`      | 7         |
| **Drivers**   | `/api/v1/drivers`   | `driver.js`     | `DriverController`   | 7         |
| **Students**  | `/api/v1/students`  | `student.js`    | `StudentController`  | 7         |
| **Routes**    | `/api/v1/routes`    | `route.js`      | `RouteController`    | 11        |
| **Schedules** | `/api/v1/schedules` | `schedule.js`   | `ScheduleController` | 8         |
| **Trips**     | `/api/v1/trips`     | `trip.js`       | `TripController`     | 11        |
| **Total**     | -                   | -               | -                    | **56**    |

---

## 🔐 1. Auth Routes (`/api/v1/auth`)

### Endpoints

| Method | Endpoint    | Description           | Auth | Role   |
| ------ | ----------- | --------------------- | ---- | ------ |
| `POST` | `/register` | Đăng ký tài khoản mới | ❌   | Public |
| `POST` | `/login`    | Đăng nhập             | ❌   | Public |
| `POST` | `/logout`   | Đăng xuất             | ✅   | All    |
| `GET`  | `/profile`  | Xem profile           | ✅   | All    |
| `PUT`  | `/profile`  | Cập nhật profile      | ✅   | All    |

### Validation Middleware

- `validateRegister` - Validate dữ liệu đăng ký
- `validateLogin` - Validate dữ liệu đăng nhập

---

## 🚌 2. Bus Routes (`/api/v1/buses`)

### CRUD Endpoints

| Method   | Endpoint | Description       | Auth | Role          |
| -------- | -------- | ----------------- | ---- | ------------- |
| `GET`    | `/`      | Danh sách xe buýt | ✅   | Admin, Driver |
| `GET`    | `/:id`   | Chi tiết xe buýt  | ✅   | Admin, Driver |
| `POST`   | `/`      | Tạo xe buýt mới   | ✅   | Admin         |
| `PUT`    | `/:id`   | Cập nhật xe buýt  | ✅   | Admin         |
| `DELETE` | `/:id`   | Xóa xe buýt       | ✅   | Admin         |

### Business Logic Endpoints

| Method | Endpoint             | Description         | Auth | Role   |
| ------ | -------------------- | ------------------- | ---- | ------ |
| `POST` | `/:id/assign-driver` | Phân công tài xế    | ✅   | Admin  |
| `POST` | `/:id/position`      | Cập nhật vị trí GPS | ✅   | Driver |

### Query Parameters

- `page` (number) - Trang hiện tại (default: 1)
- `limit` (number) - Số item/trang (default: 10)
- `search` (string) - Tìm kiếm theo biển số xe
- `status` (enum) - Lọc theo trạng thái: `hoat_dong`, `bao_tri`, `ngung_hoat_dong`
- `sortBy` (string) - Sắp xếp theo field
- `sortDir` (enum) - Hướng sắp xếp: `asc`, `desc`

### Validation Middleware

- `validateId` - Validate ID format
- `validateBus` - Validate bus data (bienSoXe, sucChua, dongXe)
- `validateAssignDriver` - Validate driver assignment
- `validatePosition` - Validate GPS coordinates (lat, lng, speed, heading)

### Real-time Features

- ✅ Socket.IO events khi cập nhật vị trí GPS
- ✅ Broadcast location updates đến clients đang theo dõi

---

## 👨‍✈️ 3. Driver Routes (`/api/v1/drivers`)

### CRUD Endpoints

| Method   | Endpoint | Description      | Auth | Role                |
| -------- | -------- | ---------------- | ---- | ------------------- |
| `GET`    | `/`      | Danh sách tài xế | ✅   | Admin               |
| `GET`    | `/:id`   | Chi tiết tài xế  | ✅   | Admin, Driver (own) |
| `POST`   | `/`      | Tạo tài xế mới   | ✅   | Admin               |
| `PUT`    | `/:id`   | Cập nhật tài xế  | ✅   | Admin               |
| `DELETE` | `/:id`   | Xóa tài xế       | ✅   | Admin               |

### Business Logic Endpoints

| Method | Endpoint         | Description               | Auth | Role                |
| ------ | ---------------- | ------------------------- | ---- | ------------------- |
| `GET`  | `/:id/schedules` | Lịch trình được phân công | ✅   | Admin, Driver (own) |
| `GET`  | `/stats`         | Thống kê tài xế           | ✅   | Admin               |

### Query Parameters

- `page` (number) - Trang hiện tại
- `limit` (number) - Số item/trang
- `search` (string) - Tìm kiếm theo tên, email, SĐT
- `status` (enum) - Lọc theo trạng thái: `hoat_dong`, `nghi_phep`, `ngung_hoat_dong`

### Validation Middleware

- `validateId` - Validate ID format
- `validateDriver` - Validate driver data (hoTen, email, soBangLai, ngayHetHanBangLai)

### Validation Rules

- Email: Unique, format chuẩn
- Phone: 10-11 digits
- License Number: Unique
- License Expiry: Must be future date
- Experience: 0-50 years

---

## 🎓 4. Student Routes (`/api/v1/students`)

### CRUD Endpoints

| Method   | Endpoint | Description        | Auth | Role                         |
| -------- | -------- | ------------------ | ---- | ---------------------------- |
| `GET`    | `/`      | Danh sách học sinh | ✅   | Admin, Parent                |
| `GET`    | `/:id`   | Chi tiết học sinh  | ✅   | Admin, Parent (own children) |
| `POST`   | `/`      | Tạo học sinh mới   | ✅   | Admin                        |
| `PUT`    | `/:id`   | Cập nhật học sinh  | ✅   | Admin, Parent (own children) |
| `DELETE` | `/:id`   | Xóa học sinh       | ✅   | Admin                        |

### Business Logic Endpoints

| Method | Endpoint      | Description       | Auth | Role          |
| ------ | ------------- | ----------------- | ---- | ------------- |
| `GET`  | `/class/:lop` | Học sinh theo lớp | ✅   | Admin, Parent |
| `GET`  | `/stats`      | Thống kê học sinh | ✅   | Admin         |

### Query Parameters

- `page` (number) - Trang hiện tại
- `limit` (number) - Số item/trang
- `search` (string) - Tìm kiếm theo tên, mã HS
- `lop` (string) - Lọc theo lớp

### Validation Middleware

- `validateId` - Validate ID format
- `validateStudent` - Validate student data (hoTen, ngaySinh, lop)
- `validatePagination` - Validate pagination params

### Access Control

- `checkStudentAccess` - Kiểm tra quyền truy cập (Admin hoặc parent của HS đó)

### Validation Rules

- Age: 3-18 years old
- Parent: Must exist and have role `phu_huynh`

---

## 🛣️ 5. Route Routes (`/api/v1/routes`)

### CRUD Endpoints for Routes

| Method   | Endpoint | Description           | Auth | Role          |
| -------- | -------- | --------------------- | ---- | ------------- |
| `GET`    | `/`      | Danh sách tuyến đường | ✅   | Admin, Driver |
| `GET`    | `/:id`   | Chi tiết tuyến đường  | ✅   | Admin, Driver |
| `POST`   | `/`      | Tạo tuyến đường mới   | ✅   | Admin         |
| `PUT`    | `/:id`   | Cập nhật tuyến đường  | ✅   | Admin         |
| `DELETE` | `/:id`   | Xóa tuyến đường       | ✅   | Admin         |

### Stop Management Endpoints

| Method   | Endpoint             | Description         | Auth | Role          |
| -------- | -------------------- | ------------------- | ---- | ------------- |
| `GET`    | `/:id/stops`         | Danh sách điểm dừng | ✅   | Admin, Driver |
| `POST`   | `/:id/stops`         | Thêm điểm dừng      | ✅   | Admin         |
| `PUT`    | `/:id/stops/:stopId` | Cập nhật điểm dừng  | ✅   | Admin         |
| `DELETE` | `/:id/stops/:stopId` | Xóa điểm dừng       | ✅   | Admin         |

### Business Logic Endpoints

| Method | Endpoint | Description          | Auth | Role  |
| ------ | -------- | -------------------- | ---- | ----- |
| `GET`  | `/stats` | Thống kê tuyến đường | ✅   | Admin |

### Query Parameters

- `page` (number) - Trang hiện tại
- `limit` (number) - Số item/trang
- `search` (string) - Tìm kiếm theo tên tuyến
- `trangThai` (enum) - Lọc theo trạng thái: `hoat_dong`, `ngung_hoat_dong`
- `sortBy` (string) - Sắp xếp điểm dừng: `thuTu`, `tenDiem`

### Validation Middleware

- `validateId` - Validate ID format
- `validateRoute` - Validate route data (tenTuyen, diemBatDau, diemKetThuc)
- `validateStop` - Validate stop data (tenDiem, viDo, kinhDo, thuTu)
- `validatePagination` - Validate pagination params

### Validation Rules for Routes

- Distance: 0-1000 km
- Estimated Time: 0-480 minutes (8 hours)
- Route Name: Unique

### Validation Rules for Stops

- Latitude: -90 to 90
- Longitude: -180 to 180
- Order: >= 1, unique per route
- Stop Time: >= 0 minutes

---

## 📅 6. Schedule Routes (`/api/v1/schedules`)

### CRUD Endpoints

| Method   | Endpoint | Description          | Auth | Role          |
| -------- | -------- | -------------------- | ---- | ------------- |
| `GET`    | `/`      | Danh sách lịch trình | ✅   | Admin, Driver |
| `GET`    | `/:id`   | Chi tiết lịch trình  | ✅   | Admin, Driver |
| `POST`   | `/`      | Tạo lịch trình mới   | ✅   | Admin         |
| `PUT`    | `/:id`   | Cập nhật lịch trình  | ✅   | Admin         |
| `DELETE` | `/:id`   | Xóa lịch trình       | ✅   | Admin         |

### Business Logic Endpoints

| Method | Endpoint      | Description                     | Auth | Role          |
| ------ | ------------- | ------------------------------- | ---- | ------------- |
| `GET`  | `/date/:date` | Lịch trình theo ngày            | ✅   | Admin, Driver |
| `POST` | `/:id/status` | Cập nhật trạng thái + real-time | ✅   | Admin, Driver |
| `GET`  | `/stats`      | Thống kê lịch trình             | ✅   | Admin         |

### Query Parameters

- `page` (number) - Trang hiện tại
- `limit` (number) - Số item/trang
- `maTuyen` (string) - Lọc theo tuyến đường
- `maXe` (string) - Lọc theo xe buýt
- `maTaiXe` (string) - Lọc theo tài xế
- `loaiChuyen` (enum) - Lọc theo loại: `don_sang`, `tra_chieu`
- `dangApDung` (boolean) - Lọc theo trạng thái áp dụng

### Validation Middleware

- `validateId` - Validate ID format
- `validateSchedule` - Validate schedule data
- `validatePagination` - Validate pagination params

### Validation Rules

- Start Time: Format HH:MM
- Trip Type: `di` or `ve`
- Route, Bus, Driver: Must exist and active
- Conflict Check: Prevents double-booking same bus/driver at same time

### Real-time Features

- ✅ Socket.IO events khi cập nhật trạng thái
- ✅ Event: `schedule_status_update`
- ✅ Room: `bus-{busId}`

---

## 🚌 7. Trip Routes (`/api/v1/trips`)

### CRUD Endpoints

| Method   | Endpoint | Description         | Auth | Role                  |
| -------- | -------- | ------------------- | ---- | --------------------- |
| `GET`    | `/`      | Danh sách chuyến đi | ✅   | Admin, Driver, Parent |
| `GET`    | `/:id`   | Chi tiết chuyến đi  | ✅   | Access-controlled     |
| `POST`   | `/`      | Tạo chuyến đi mới   | ✅   | Admin                 |
| `PUT`    | `/:id`   | Cập nhật chuyến đi  | ✅   | Access-controlled     |
| `DELETE` | `/:id`   | Xóa chuyến đi       | ✅   | Admin                 |

### Trip State Management

| Method | Endpoint      | Description        | Auth | Role              |
| ------ | ------------- | ------------------ | ---- | ----------------- |
| `POST` | `/:id/start`  | Bắt đầu chuyến đi  | ✅   | Access-controlled |
| `POST` | `/:id/end`    | Kết thúc chuyến đi | ✅   | Access-controlled |
| `POST` | `/:id/cancel` | Hủy chuyến đi      | ✅   | Access-controlled |

### Student Management

| Method | Endpoint                   | Description              | Auth | Role          |
| ------ | -------------------------- | ------------------------ | ---- | ------------- |
| `POST` | `/:id/students`            | Thêm học sinh vào chuyến | ✅   | Admin, Driver |
| `PUT`  | `/:id/students/:studentId` | Cập nhật trạng thái HS   | ✅   | Admin, Driver |

### Business Logic Endpoints

| Method | Endpoint | Description        | Auth | Role  |
| ------ | -------- | ------------------ | ---- | ----- |
| `GET`  | `/stats` | Thống kê chuyến đi | ✅   | Admin |

### Query Parameters

- `page` (number) - Trang hiện tại
- `limit` (number) - Số item/trang
- `ngayChay` (date) - Lọc theo ngày (YYYY-MM-DD)
- `trangThai` (enum) - Lọc theo trạng thái
- `maTuyen` (string) - Lọc theo tuyến đường
- `maXe` (string) - Lọc theo xe buýt
- `maTaiXe` (string) - Lọc theo tài xế
- `from` (date) - Thống kê từ ngày
- `to` (date) - Thống kê đến ngày

### Validation Middleware

- `validateId` - Validate ID format
- `validateTrip` - Validate trip data
- `validatePagination` - Validate pagination params

### Access Control

- `checkTripAccess` - Kiểm tra quyền truy cập chuyến đi

### Trip State Machine

```
chua_khoi_hanh → dang_chay → hoan_thanh
                      ↓
                     huy
```

### Student Status in Trip

- `dang_cho` - Đang chờ lên xe
- `da_len_xe` - Đã lên xe
- `da_xuong_xe` - Đã xuống xe
- `vang_mat` - Vắng mặt

### Validation Rules

- Date Format: YYYY-MM-DD
- Schedule: Must exist and active
- Bus & Driver: Must be active
- Cannot delete running trips
- Cannot cancel completed trips
- Unique: (scheduleId + date) combination

### Real-time Features

- ✅ Socket.IO events khi start/complete/cancel trip
- ✅ Events: `trip_started`, `trip_completed`, `trip_cancelled`
- ✅ Room: `bus-{busId}`

---

## 🔒 Authentication & Authorization

### Authentication Methods

1. **JWT Token** - Bearer token trong header
2. **Middleware**: `AuthMiddleware.authenticate` hoặc `AuthMiddleware.verifyToken` (alias)

### Authorization Roles

- `quan_tri` - **Admin** - Full access
- `tai_xe` - **Driver** - Limited access to assigned resources
- `phu_huynh` - **Parent** - Access to own children's data

### Authorization Methods

- `AuthMiddleware.authorize(...roles)` - Kiểm tra role
- `AuthMiddleware.checkStudentAccess` - Kiểm tra quyền truy cập học sinh
- `AuthMiddleware.checkTripAccess` - Kiểm tra quyền truy cập chuyến đi

---

## 📊 Validation Middleware Summary

| Middleware             | Purpose                    | Fields Validated                        |
| ---------------------- | -------------------------- | --------------------------------------- |
| `validateId`           | Validate ID format         | `id` param                              |
| `validatePagination`   | Validate pagination        | `page`, `limit`                         |
| `validateBus`          | Validate bus data          | `bienSoXe`, `sucChua`, `dongXe`         |
| `validateDriver`       | Validate driver data       | `hoTen`, `email`, `soBangLai`           |
| `validateStudent`      | Validate student data      | `hoTen`, `ngaySinh`, `lop`              |
| `validateRoute`        | Validate route data        | `tenTuyen`, `diemBatDau`, `diemKetThuc` |
| `validateStop`         | Validate stop data         | `tenDiem`, `viDo`, `kinhDo`, `thuTu`    |
| `validateSchedule`     | Validate schedule data     | `maTuyen`, `maXe`, `gioKhoiHanh`        |
| `validateTrip`         | Validate trip data         | `maLichTrinh`, `ngayChay`               |
| `validatePosition`     | Validate GPS data          | `lat`, `lng`, `speed`, `heading`        |
| `validateAssignDriver` | Validate driver assignment | `driverId`                              |
| `validateRegister`     | Validate registration      | `email`, `password`, `hoTen`            |
| `validateLogin`        | Validate login             | `email`, `password`                     |

---

## 🚀 Real-time Events (Socket.IO)

### Bus Position Updates

- **Event**: `bus_location_update`
- **Room**: `bus-{busId}`
- **Trigger**: `POST /api/v1/buses/:id/position`
- **Data**: `{ busId, lat, lng, speed, heading, timestamp }`

### Schedule Status Updates

- **Event**: `schedule_status_update`
- **Room**: `bus-{busId}`
- **Trigger**: `POST /api/v1/schedules/:id/status`
- **Data**: `{ scheduleId, busId, driverId, status, timestamp }`

### Trip State Changes

- **Event**: `trip_started`, `trip_completed`, `trip_cancelled`
- **Room**: `bus-{busId}`
- **Trigger**: Trip state management endpoints
- **Data**: `{ tripId, busId, driverId, timestamp, ... }`

---

## 📝 Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Action thành công",
  "pagination": {
    "currentPage": 1,
    "totalPages": 10,
    "totalItems": 100,
    "itemsPerPage": 10
  }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error (dev mode only)"
}
```

### Stats Response

```json
{
  "success": true,
  "data": {
    "total": 100,
    "active": 80,
    "inactive": 20,
    ...
  },
  "meta": {
    "queryRange": { "from": "2025-10-01", "to": "2025-10-27" }
  }
}
```

---

## 🔧 Module System

Tất cả routes sử dụng **ESM (ECMAScript Modules)**:

```javascript
import express from "express";
import Controller from "../../controllers/Controller.js";
// ...
export default router;
```

---

## 📦 Route Registration in `app.js`

```javascript
// Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/buses", busRoutes);
app.use("/api/v1/drivers", driverRoutes);
app.use("/api/v1/students", studentRoutes);
app.use("/api/v1/routes", routeRoutes);
app.use("/api/v1/schedules", scheduleRoutes);
app.use("/api/v1/trips", tripRoutes);
```

---

## ✅ Status Summary

| Feature                  | Status | Notes                       |
| ------------------------ | ------ | --------------------------- |
| **All Routes Created**   | ✅     | 7 route files, 56 endpoints |
| **ESM Modules**          | ✅     | All using import/export     |
| **Authentication**       | ✅     | JWT-based                   |
| **Authorization**        | ✅     | Role-based access control   |
| **Validation**           | ✅     | 13 validation middlewares   |
| **Real-time**            | ✅     | Socket.IO integrated        |
| **Registered in app.js** | ✅     | All 7 modules registered    |
| **Documentation**        | ✅     | This file                   |

---

## 🎯 Next Steps

1. ✅ **Routes** - Hoàn thành
2. ⏭️ **Testing** - Test tất cả endpoints với Postman
3. ⏭️ **Validation** - Kiểm tra tất cả validation rules
4. ⏭️ **Real-time** - Test Socket.IO events
5. ⏭️ **Documentation** - Update OpenAPI spec
6. ⏭️ **Error Handling** - Implement global error handler

---

**Last Updated**: October 27, 2025  
**Total Endpoints**: 56  
**Total Routes Files**: 7  
**Module System**: ESM
