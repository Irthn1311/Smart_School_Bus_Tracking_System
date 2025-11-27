# 📋 TÓM TẮT HIỆN TRẠNG - Smart School Bus Tracking System

**Ngày khảo sát:** 2025-11-20  
**Mục tiêu:** Hoàn thiện luồng Route → Schedule → Trip với phân công học sinh theo điểm dừng

---

## 🗄️ SCHEMA DATABASE

### Bảng quan trọng:

1. **`TuyenDuong` + `route_stops`**
   - Lưu tuyến đường và danh sách điểm dừng với `sequence`
   - KHÔNG lưu thông tin học sinh

2. **`LichTrinh` (Schedule)**
   - Lưu thông tin lịch trình: maTuyen, maXe, maTaiXe, loaiChuyen, gioKhoiHanh, ngayChay

3. **`schedule_student_stops` ⭐ QUAN TRỌNG**
   - Mapping học sinh → điểm dừng trong lịch trình
   - Fields: `maLichTrinh`, `maHocSinh`, `thuTuDiem` (sequence), `maDiem`
   - UNIQUE KEY: (maLichTrinh, maHocSinh) - mỗi học sinh chỉ có 1 điểm dừng trong 1 schedule

4. **`ChuyenDi` (Trip)**
   - Bản "runtime" của lịch trình
   - Fields: `maChuyen`, `maLichTrinh`, `ngayChay`, `trangThai`

5. **`TrangThaiHocSinh` ⭐ QUAN TRỌNG**
   - Trạng thái học sinh trong chuyến đi
   - Fields: `maChuyen`, `maHocSinh`, `thuTuDiemDon` (sequence), `trangThai` ('cho_don', 'da_don', 'da_tra', 'vang')
   - UNIQUE KEY: (maChuyen, maHocSinh)

---

## 🔄 LUỒNG HIỆN TẠI

### 1. TẠO LỊCH TRÌNH (Schedule Creation)

**Backend: `ScheduleService.create()`**
- ✅ Nhận `students[]` từ payload (optional)
- ✅ Nếu có `students[]`: Lưu vào `schedule_student_stops` qua `ScheduleStudentStopModel.bulkCreate()`
- ✅ Nếu KHÔNG có `students[]`: Tự động gán học sinh từ route stops (auto-assign)
  - Lấy route stops từ `RouteService.getStops(maTuyen)`
  - Lấy tất cả học sinh có tọa độ
  - Tính khoảng cách và gán vào stop gần nhất (< 2km)
  - Lưu vào `schedule_student_stops`
- ✅ Sau khi tạo schedule, nếu `ngayChay >= hôm nay`:
  - Tự động tạo `ChuyenDi`
  - Copy students từ `schedule_student_stops` → `TrangThaiHocSinh` qua `ScheduleStudentStopModel.copyToTrip()`

**Frontend: `schedule-form.tsx`**
- ✅ Load route stops khi chọn route
- ✅ Load available students
- ✅ UI cho phép gán học sinh vào stops (checkbox + dropdown)
- ✅ Có nút "Tự động gán" (handleAutoAssign)
- ✅ Submit với payload có `students: [{maHocSinh, thuTuDiem, maDiem}]`
- ⚠️ **VẤN ĐỀ:** Nếu user không chọn học sinh, `students` không được gửi → Backend sẽ auto-assign

**Controller: `ScheduleController.create()`**
- ✅ Validate `students[]` format nếu có
- ✅ Gọi `ScheduleService.create()` với `students: students || []`

### 2. TẠO TRIP TỪ SCHEDULE

**Backend: `ScheduleStudentStopModel.copyToTrip()`**
- ✅ Lấy students từ `schedule_student_stops` cho `maLichTrinh`
- ✅ Insert vào `TrangThaiHocSinh` với:
  - `maChuyen` = trip ID
  - `maHocSinh` = từ schedule
  - `thuTuDiemDon` = `sequence` từ `route_stops` (ưu tiên) hoặc `thuTuDiem` từ schedule
  - `trangThai` = 'cho_don'
- ✅ Sử dụng `ON DUPLICATE KEY UPDATE` để tránh lỗi nếu đã có

**Khi nào được gọi:**
1. Tự động khi tạo schedule (nếu `ngayChay >= hôm nay`)
2. Trong `TripController.getById()` nếu trip không có students (auto-copy)
3. Trong `TripController.getAll()` nếu trip không có students (auto-copy)

### 3. API GET TRIP DETAIL (Driver View)

**Backend: `TripController.getById()`**
- ✅ Lấy trip, schedule, route info
- ✅ Lấy route stops từ `RouteStopModel.getByRouteId()`
- ✅ Lấy students từ `TrangThaiHocSinhModel.getByTripId()`
- ✅ **Auto-copy fallback:** Nếu trip không có students nhưng có schedule:
  - Copy từ `schedule_student_stops` → `TrangThaiHocSinh`
  - Reload students
- ✅ **Group students theo stop:**
  ```javascript
  const stopsWithStudentCount = routeStops.map((stop) => {
    const stopStudents = students.filter(
      (student) => student.thuTuDiemDon === stop.sequence
    );
    return {
      ...stop,
      studentCount: stopStudents.length,
      students: stopStudents.map(...)
    };
  });
  ```
- ✅ Response trả về:
  ```json
  {
    trip: {...},
    schedule: {...},
    routeInfo: {
      ...routeInfo,
      diemDung: stopsWithStudentCount  // Stops với studentCount và students[]
    },
    students: [...]  // Flat list (legacy)
  }
  ```

**Frontend: `driver/trip/[id]/page.tsx`**
- ✅ Load trip detail từ API
- ✅ Map route stops từ `data?.routeInfo?.diemDung`
- ✅ Map students vào stops (ưu tiên `stop.students` từ backend)
- ⚠️ **VẤN ĐỀ:** UI hiện tại có thể chưa hiển thị đầy đủ nếu `studentCount = 0`

### 4. API UPDATE TRẠNG THÁI HỌC SINH

**Backend: `TripController.updateStudentStatus()` (Legacy)**
- ✅ PATCH `/api/v1/trips/:id/students/:studentId`
- ✅ Body: `{ trangThai: 'da_don' | 'vang' | 'da_tra' }`
- ✅ Validate status transitions
- ✅ Update `TrangThaiHocSinh`
- ✅ Send notification to parent (nếu `trangThai === 'da_don'` hoặc `'vang'`)

**Backend: `TripController.checkinStudent()` (M4-M6)**
- ✅ POST `/api/v1/trips/:id/students/:studentId/checkin`
- ✅ Update `trangThai = 'da_don'`
- ✅ Emit WebSocket event
- ✅ Send notification to parent

**Backend: `TripController.markStudentAbsent()` (M5)**
- ✅ POST `/api/v1/trips/:id/students/:studentId/absent`
- ✅ Update `trangThai = 'vang'`
- ✅ Emit WebSocket event
- ✅ Send notification to parent

---

## ⚠️ VẤN ĐỀ HIỆN TẠI

### 1. **Schedule có thể không có students**
- **Nguyên nhân:**
  - Frontend chỉ gửi `students` nếu user chọn thủ công
  - Auto-assign có thể fail nếu:
    - Route stops không có tọa độ
    - Học sinh không có tọa độ
    - Học sinh quá xa stops (> 2km)
- **Ảnh hưởng:** `schedule_student_stops` rỗng → Trip không có students → Driver view hiển thị 0 học sinh

### 2. **Mismatch `thuTuDiem` và `sequence`**
- **Vấn đề:** `schedule_student_stops.thuTuDiem` có thể không khớp với `route_stops.sequence`
- **Giải pháp hiện tại:** `copyToTrip()` ưu tiên dùng `sequence` từ `route_stops` nếu có
- **Cần đảm bảo:** `thuTuDiem` trong `schedule_student_stops` luôn = `sequence` của `route_stops`

### 3. **API response chưa chuẩn**
- **Vấn đề:** `TripController.getById()` trả về `routeInfo.diemDung` với students, nhưng format có thể chưa đầy đủ
- **Cần:** Response rõ ràng với `stops[]` mỗi stop có `studentCount` và `students[]`

### 4. **Frontend chưa hiển thị đầy đủ**
- **Vấn đề:** Driver page có thể chưa hiển thị đúng số học sinh nếu backend trả về `studentCount = 0`
- **Cần:** UI rõ ràng với nút "Đã đón / Vắng / Đã trả" cho từng học sinh

---

## ✅ ĐIỂM MẠNH HIỆN TẠI

1. ✅ Schema database đã đúng: `schedule_student_stops` và `TrangThaiHocSinh` đã có sẵn
2. ✅ Backend đã có logic auto-assign và auto-copy
3. ✅ `copyToTrip()` đã xử lý mapping `sequence` đúng
4. ✅ `TripController.getById()` đã group students theo stops
5. ✅ Frontend đã có UI để gán học sinh vào stops
6. ✅ Đã có API update trạng thái học sinh

---

## 🎯 CẦN HOÀN THIỆN

### Backend:
1. ✅ **Validate students[] khi tạo schedule:**
   - Đảm bảo `thuTuDiem` khớp với `route_stops.sequence`
   - Đảm bảo `maDiem` khớp với `route_stops.stop_id` có `sequence = thuTuDiem`
2. ✅ **Chuẩn hóa response `TripController.getById()`:**
   - Trả về `stops[]` với format rõ ràng
   - Mỗi stop có `studentCount` và `students[]` đầy đủ
3. ✅ **API PATCH trạng thái học sinh:**
   - Đảm bảo endpoint hoạt động đúng
   - Validate status transitions

### Frontend:
1. ✅ **Form tạo schedule:**
   - Đảm bảo gửi `students[]` đúng format
   - Validate trước khi submit
2. ✅ **Driver trip detail page:**
   - Hiển thị stops với số học sinh rõ ràng
   - Nút "Đã đón / Vắng / Đã trả" cho từng học sinh
   - Update UI realtime khi thay đổi trạng thái

---

## 📝 KẾT LUẬN

**Hiện trạng:** Hệ thống đã có cơ sở tốt với schema và logic cơ bản. Cần hoàn thiện:
1. Validation và đảm bảo data consistency
2. Chuẩn hóa API response
3. Hoàn thiện UI cho driver

**Ưu tiên:** 
1. Backend validation và response format
2. Frontend driver UI
3. Testing end-to-end

