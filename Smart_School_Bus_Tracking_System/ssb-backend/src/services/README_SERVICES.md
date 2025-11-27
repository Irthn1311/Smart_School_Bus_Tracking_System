# 🎯 Services Layer - Smart School Bus System

## ✅ Tất cả Services đã hoàn thành

Mỗi service đều có **đầy đủ tính năng**:

- ✅ **CRUD đầy đủ** - Create, Read, Update, Delete
- ✅ **Pagination** - Phân trang với page, limit, total
- ✅ **Search & Filter** - Tìm kiếm và lọc dữ liệu
- ✅ **Validation** - Kiểm tra dữ liệu đầu vào
- ✅ **Error Handling** - Throw lỗi rõ ràng
- ✅ **Business Logic** - Logic nghiệp vụ phức tạp

---

## 📦 Danh sách Services:

### 1️⃣ **BusService.js** ✅

**Mục đích:** Quản lý xe buýt

**Methods:**

- `list(options)` - Danh sách xe (pagination, search, filter)
- `getById(id)` - Chi tiết xe
- `create(data)` - Tạo xe mới
- `update(id, data)` - Cập nhật xe
- `remove(id)` - Xóa xe
- `assignDriver(busId, driverId)` - Phân công tài xế
- `updatePosition(busId, positionData)` - Cập nhật GPS (real-time)

**Validation:**

- Biển số xe unique
- Số ghế >= 8
- Trạng thái: hoat_dong, bao_tri, ngung_hoat_dong

---

### 2️⃣ **DriverService.js** ✅

**Mục đích:** Quản lý tài xế

**Methods:**

- `list(options)` - Danh sách tài xế (pagination, search, filter)
- `getById(id)` - Chi tiết tài xế
- `create(data)` - Tạo tài xế (tạo NguoiDung + TaiXe)
- `update(id, data)` - Cập nhật tài xế
- `remove(id)` - Xóa tài xế
- `getSchedules(id)` - Lấy lịch trình
- `getStats()` - Thống kê tài xế
- `checkAvailability(maTaiXe, gioKhoiHanh, loaiChuyen)` - Kiểm tra khả dụng

**Validation:**

- Email unique
- SĐT unique
- Số bằng lái unique
- Trạng thái: hoat_dong, tam_nghi, nghi_huu
- Hash password với bcrypt

---

### 3️⃣ **StudentService.js** ✅

**Mục đích:** Quản lý học sinh

**Methods:**

- `list(options)` - Danh sách học sinh (pagination, search, filter lớp/phụ huynh)
- `getById(id)` - Chi tiết học sinh
- `getByClass(lop)` - Lấy học sinh theo lớp
- `getByParent(maPhuHuynh)` - Lấy con của phụ huynh
- `create(data)` - Tạo học sinh
- `update(id, data)` - Cập nhật học sinh
- `remove(id)` - Xóa học sinh (soft delete)
- `assignParent(maHocSinh, maPhuHuynh)` - Gán phụ huynh
- `getStats()` - Thống kê học sinh

**Validation:**

- Phụ huynh phải tồn tại và có vaiTro='phu_huynh'
- Required: hoTen, lop

---

### 4️⃣ **RouteService.js** ✅

**Mục đích:** Quản lý tuyến đường và điểm dừng

**Methods:**

- `list(options)` - Danh sách tuyến (pagination, search)
- `getById(id)` - Chi tiết tuyến (bao gồm điểm dừng)
- `create(data)` - Tạo tuyến (có thể tạo điểm dừng cùng lúc)
- `update(id, data)` - Cập nhật tuyến
- `remove(id)` - Xóa tuyến (soft delete)
- `getStats()` - Thống kê tuyến
- `getStops(routeId)` - Lấy điểm dừng của tuyến
- `addStop(routeId, stopData)` - Thêm điểm dừng
- `updateStop(stopId, stopData)` - Cập nhật điểm dừng
- `removeStop(stopId)` - Xóa điểm dừng
- `reorderStops(routeId, stopIds)` - Sắp xếp lại thứ tự điểm dừng

**Validation:**

- Required: tenTuyen, diemBatDau, diemKetThuc
- thoiGianUocTinh >= 0

---

### 5️⃣ **ScheduleService.js** ✅

**Mục đích:** Quản lý lịch trình

**Methods:**

- `list(options)` - Danh sách lịch trình (pagination, filter)
- `getById(id)` - Chi tiết lịch trình
- `create(data)` - Tạo lịch trình
- `update(id, data)` - Cập nhật lịch trình
- `remove(id)` - Xóa lịch trình (soft delete)
- `getByRoute(maTuyen)` - Lịch trình của tuyến
- `getByBus(maXe)` - Lịch trình của xe
- `getByDriver(maTaiXe)` - Lịch trình của tài xế
- `getStats()` - Thống kê lịch trình

**Validation:**

- Kiểm tra tuyến, xe, tài xế tồn tại
- loaiChuyen: don_sang, tra_chieu
- **Kiểm tra xung đột lịch trình** - Xe/tài xế không thể có 2 lịch cùng giờ

---

### 6️⃣ **TripService.js** ✅

**Mục đích:** Quản lý chuyến đi

**Methods:**

- `list(options)` - Danh sách chuyến (pagination, filter)
- `getById(id)` - Chi tiết chuyến
- `create(data)` - Tạo chuyến (unique: maLichTrinh + ngayChay)
- `update(id, data)` - Cập nhật chuyến
- `start(id)` - Bắt đầu chuyến (chua_khoi_hanh → dang_chay)
- `complete(id)` - Kết thúc chuyến (dang_chay → hoan_thanh)
- `cancel(id, ghiChu)` - Hủy chuyến (→ huy)
- `remove(id)` - Xóa chuyến
- `getStudents(id)` - Lấy danh sách học sinh trong chuyến
- `getByDriverAndDate(maTaiXe, ngayChay)` - Chuyến của tài xế trong ngày
- `getStats(filters)` - Thống kê chuyến đi

**Validation:**

- Kiểm tra lịch trình tồn tại
- trangThai: chua_khoi_hanh, dang_chay, hoan_thanh, huy
- Không cho phép:
  - Bắt đầu chuyến đã bắt đầu
  - Kết thúc chuyến chưa chạy
  - Hủy chuyến đã hoàn thành
  - Xóa chuyến đang chạy

**Real-time:**

- Phát sự kiện Socket.IO khi thay đổi trạng thái

---

## 🎨 Pattern chung cho tất cả Services:

### 1. **List với Pagination**

```javascript
static async list(options = {}) {
  const { page = 1, limit = 10, search, filter } = options;

  // Build query with filters
  // Execute with pagination

  return {
    data: rows,
    pagination: { page, limit, total, totalPages }
  };
}
```

### 2. **Create với Validation**

```javascript
static async create(data) {
  // Validate required fields
  if (!field) throw new Error("MISSING_REQUIRED_FIELDS");

  // Check uniqueness
  if (exists) throw new Error("ALREADY_EXISTS");

  // Create record
  const id = await Model.create(data);

  return await Model.getById(id);
}
```

### 3. **Update với Partial Data**

```javascript
static async update(id, data) {
  // Check exists
  const existing = await Model.getById(id);
  if (!existing) return null;

  // Validate changes
  // Build updateData object

  const success = await Model.update(id, updateData);
  return await Model.getById(id);
}
```

### 4. **Error Handling**

```javascript
// Throw specific errors
throw new Error("EMAIL_EXISTS");
throw new Error("ROUTE_NOT_FOUND");
throw new Error("SCHEDULE_CONFLICT");

// Controller sẽ catch và trả về HTTP status code phù hợp
```

---

## 📊 Thống kê Services:

| Service         | Methods | Pagination | Validation | Real-time | Stats |
| --------------- | ------- | ---------- | ---------- | --------- | ----- |
| BusService      | 7       | ✅         | ✅         | ✅        | ❌    |
| DriverService   | 8       | ✅         | ✅         | ❌        | ✅    |
| StudentService  | 9       | ✅         | ✅         | ❌        | ✅    |
| RouteService    | 11      | ✅         | ✅         | ❌        | ✅    |
| ScheduleService | 9       | ✅         | ✅         | ❌        | ✅    |
| TripService     | 10      | ✅         | ✅         | ✅        | ✅    |

**Tổng: 6 Services - 54 Methods** ✅

---

## 🔄 Workflow ví dụ:

### **Tạo lịch trình mới:**

```javascript
// 1. Admin tạo tuyến đường
const route = await RouteService.create({
  tenTuyen: "Tuyến 1",
  diemBatDau: "Trường ABC",
  diemKetThuc: "Khu dân cư XYZ",
  thoiGianUocTinh: 45,
  diemDung: [
    { tenDiem: "Ngã tư A", kinhDo: 106.1, viDo: 10.1, thuTu: 1 },
    { tenDiem: "Ngã tư B", kinhDo: 106.2, viDo: 10.2, thuTu: 2 },
  ],
});

// 2. Tạo lịch trình
const schedule = await ScheduleService.create({
  maTuyen: route.maTuyen,
  maXe: 1,
  maTaiXe: 2,
  loaiChuyen: "don_sang",
  gioKhoiHanh: "07:00:00",
});
// ✅ Service tự động kiểm tra:
// - Tuyến, xe, tài xế tồn tại
// - Không xung đột lịch trình

// 3. Tạo chuyến đi cho ngày mai
const trip = await TripService.create({
  maLichTrinh: schedule.maLichTrinh,
  ngayChay: "2025-10-28",
});

// 4. Sáng mai, tài xế bắt đầu chuyến
await TripService.start(trip.maChuyen);
// → Socket.IO broadcast: "Chuyến đi đã bắt đầu"

// 5. Tài xế cập nhật vị trí real-time
await BusService.updatePosition(1, {
  lat: 10.762622,
  lng: 106.660172,
  speed: 40,
  heading: 90,
});
// → Socket.IO broadcast vị trí mới cho phụ huynh

// 6. Kết thúc chuyến
await TripService.complete(trip.maChuyen);
// → Socket.IO broadcast: "Chuyến đi hoàn thành"
```

---

## 🚀 Next Steps:

1. ✅ **Models** - Hoàn thành 8 models
2. ✅ **Services** - Hoàn thành 6 services
3. 🔄 **Controllers** - Cần tạo các controllers
4. ⏳ **Routes** - Cần register routes
5. ⏳ **Middleware** - ValidationMiddleware cho từng module
6. ⏳ **Testing** - Test API endpoints

---

**Updated:** 2025-10-27  
**Author:** GitHub Copilot
