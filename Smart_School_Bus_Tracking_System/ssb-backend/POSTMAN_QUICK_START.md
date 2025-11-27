# 🚀 Hướng dẫn test API trong Postman

## ✅ Đã fix tất cả endpoints!

Server đang chạy: **http://localhost:4000**

---

## 📦 Import vào Postman

### Bước 1: Import Collection

1. Mở Postman
2. Click **Import** (góc trên bên trái)
3. Chọn file: `ssb-backend/postman/SSB_API_Collection.postman_collection.json`
4. Click **Import**

### Bước 2: Import Environment

1. Click **Import** lần nữa
2. Chọn file: `ssb-backend/postman/SSB_Local_Environment.postman_environment.json`
3. Click **Import**
4. Chọn environment **"SSB - Local Development"** ở góc phải trên

---

## 🔐 Bước 1: Đăng nhập để lấy Token

### Request: Login

```
POST http://localhost:4000/api/v1/auth/login
```

### Body (JSON):

```json
{
  "email": "admin@ssb.com",
  "matKhau": "admin123"
}
```

### Response sẽ trả về:

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "maNguoiDung": 1,
      "email": "admin@ssb.com",
      "vaiTro": "quan_tri"
    }
  }
}
```

**👉 Copy token từ response** (collection sẽ tự động save vào environment variable)

---

## 📋 Bước 2: Test các endpoints

### ✅ Buses (Xe buýt)

```
GET    /api/v1/buses              - Danh sách xe
GET    /api/v1/buses/:id          - Chi tiết xe
POST   /api/v1/buses              - Tạo xe mới
PUT    /api/v1/buses/:id          - Cập nhật xe
DELETE /api/v1/buses/:id          - Xóa xe
POST   /api/v1/buses/:id/assign-driver - Phân công tài xế
POST   /api/v1/buses/:id/position - Cập nhật vị trí
```

**Tạo xe mới:**

```json
{
  "bienSoXe": "30A-12345",
  "dongXe": "Hyundai Universe",
  "sucChua": 45,
  "trangThai": "hoat_dong"
}
```

---

### ✅ Drivers (Tài xế)

```
GET    /api/v1/drivers            - Danh sách tài xế
GET    /api/v1/drivers/:id        - Chi tiết tài xế
POST   /api/v1/drivers            - Tạo tài xế mới
PUT    /api/v1/drivers/:id        - Cập nhật tài xế
DELETE /api/v1/drivers/:id        - Xóa tài xế
GET    /api/v1/drivers/:id/schedules - Lịch trình của tài xế
GET    /api/v1/drivers/stats      - Thống kê tài xế
```

**Tạo tài xế mới:**

```json
{
  "hoTen": "Nguyễn Văn A",
  "email": "driver1@ssb.com",
  "soDienThoai": "0912345678",
  "matKhau": "password123",
  "vaiTro": "tai_xe",
  "soBangLai": "B2-12345",
  "ngayHetHanBangLai": "2026-12-31",
  "soNamKinhNghiem": 5
}
```

---

### ✅ Students (Học sinh)

```
GET    /api/v1/students           - Danh sách học sinh
GET    /api/v1/students/:id       - Chi tiết học sinh
POST   /api/v1/students           - Tạo học sinh mới
PUT    /api/v1/students/:id       - Cập nhật học sinh
DELETE /api/v1/students/:id       - Xóa học sinh
GET    /api/v1/students/class/:lop - Học sinh theo lớp
GET    /api/v1/students/stats     - Thống kê học sinh
```

**Tạo học sinh mới:**

```json
{
  "hoTen": "Trần Thị B",
  "ngaySinh": "2015-05-15",
  "lop": "Lớp 3A",
  "maPhuHuynh": 2,
  "diaChi": "123 Đường ABC, Quận 1, TP.HCM"
}
```

---

### ✅ Routes (Tuyến đường)

```
GET    /api/v1/routes             - Danh sách tuyến đường
GET    /api/v1/routes/:id         - Chi tiết tuyến
POST   /api/v1/routes             - Tạo tuyến mới
PUT    /api/v1/routes/:id         - Cập nhật tuyến
DELETE /api/v1/routes/:id         - Xóa tuyến
GET    /api/v1/routes/:id/stops   - Điểm dừng của tuyến
POST   /api/v1/routes/:id/stops   - Thêm điểm dừng
PUT    /api/v1/routes/:id/stops/:stopId - Cập nhật điểm dừng
DELETE /api/v1/routes/:id/stops/:stopId - Xóa điểm dừng
GET    /api/v1/routes/stats       - Thống kê tuyến
```

**Tạo tuyến mới:**

```json
{
  "tenTuyen": "Tuyến 1 - Quận 1 - Bình Thạnh",
  "diemBatDau": "123 Lê Lợi, Q1",
  "diemKetThuc": "456 Xô Viết Nghệ Tĩnh, Bình Thạnh",
  "thoiGianUocTinh": 45,
  "trangThai": "hoat_dong"
}
```

**Thêm điểm dừng:**

```json
{
  "tenDiem": "Điểm dừng trường ABC",
  "diaChi": "789 Điện Biên Phủ, Q3",
  "viDo": 10.7756,
  "kinhDo": 106.7019,
  "thuTu": 1,
  "thoiGianDungChan": 5
}
```

---

### ✅ Schedules (Lịch trình)

```
GET    /api/v1/schedules          - Danh sách lịch trình
GET    /api/v1/schedules/:id      - Chi tiết lịch trình
POST   /api/v1/schedules          - Tạo lịch trình mới
PUT    /api/v1/schedules/:id      - Cập nhật lịch trình
DELETE /api/v1/schedules/:id      - Xóa lịch trình
PUT    /api/v1/schedules/:id/status - Cập nhật trạng thái
GET    /api/v1/schedules/by-date/:date - Lịch trình theo ngày
GET    /api/v1/schedules/stats    - Thống kê lịch trình
```

**Tạo lịch trình:**

```json
{
  "maTuyen": 1,
  "maXe": 1,
  "maTaiXe": 2,
  "loaiChuyen": "don_sang",
  "gioKhoiHanh": "06:30",
  "dangApDung": true
}
```

---

### ✅ Trips (Chuyến đi)

```
GET    /api/v1/trips              - Danh sách chuyến đi
GET    /api/v1/trips/:id          - Chi tiết chuyến đi
POST   /api/v1/trips              - Tạo chuyến đi mới
PUT    /api/v1/trips/:id          - Cập nhật chuyến đi
DELETE /api/v1/trips/:id          - Xóa chuyến đi
POST   /api/v1/trips/:id/start    - Bắt đầu chuyến đi
POST   /api/v1/trips/:id/end      - Kết thúc chuyến đi
POST   /api/v1/trips/:id/cancel   - Hủy chuyến đi
POST   /api/v1/trips/:id/students - Thêm học sinh vào chuyến
PUT    /api/v1/trips/:id/students/:studentId - Cập nhật trạng thái học sinh
GET    /api/v1/trips/stats        - Thống kê chuyến đi
```

**Tạo chuyến đi:**

```json
{
  "maLichTrinh": 1,
  "ngayChay": "2025-10-28",
  "trangThai": "chua_khoi_hanh",
  "ghiChu": "Chuyến đi buổi sáng"
}
```

**Bắt đầu chuyến đi:**

```json
{
  "lat": 10.7756,
  "lng": 106.7019
}
```

**Thêm học sinh vào chuyến:**

```json
{
  "maHocSinh": 1,
  "maDiemDon": 1
}
```

---

## 🎯 Tips

### Auto-save IDs

Collection đã được setup để tự động lưu các IDs vào environment variables:

- `token` - Auth token
- `busId` - ID xe buýt vừa tạo
- `driverId` - ID tài xế vừa tạo
- `studentId` - ID học sinh vừa tạo
- `routeId` - ID tuyến đường vừa tạo
- `scheduleId` - ID lịch trình vừa tạo
- `tripId` - ID chuyến đi vừa tạo

### Authorization Header

Tất cả requests (trừ login) đều cần token:

```
Authorization: Bearer {{token}}
```

Collection đã setup sẵn, bạn chỉ cần login là token sẽ tự động được thêm vào tất cả requests.

---

## 🐛 Troubleshooting

### 401 Unauthorized

- Chưa login hoặc token hết hạn
- → Thực hiện lại bước đăng nhập

### 403 Forbidden

- Tài khoản không có quyền truy cập
- → Sử dụng tài khoản admin

### 404 Not Found

- ID không tồn tại
- Kiểm tra lại ID trong URL

### 500 Internal Server Error

- Lỗi server
- Check terminal logs để xem chi tiết lỗi

---

## 📝 Database Sample Data

Nếu database chưa có data, import file:

```
database/sample_data.sql
```

Tài khoản mặc định:

- **Admin**: `admin@ssb.com` / `admin123`
- **Driver**: `driver@ssb.com` / `driver123`
- **Parent**: `parent@ssb.com` / `parent123`

---

## ✅ Tất cả routes đã hoạt động!

- ✅ Authentication
- ✅ Buses (Xe buýt)
- ✅ Drivers (Tài xế)
- ✅ Students (Học sinh)
- ✅ Routes (Tuyến đường)
- ✅ Schedules (Lịch trình)
- ✅ Trips (Chuyến đi)

Bây giờ bạn có thể test đầy đủ CRUD operations trong Postman! 🎉
