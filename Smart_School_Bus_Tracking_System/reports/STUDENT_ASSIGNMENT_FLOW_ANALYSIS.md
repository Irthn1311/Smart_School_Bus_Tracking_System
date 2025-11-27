# Phân Tích Luồng Phân Công Học Sinh - Tình Trạng Hiện Tại

**Ngày tạo:** 2025-11-18  
**Vấn đề:** Không thể lấy được học sinh ở trang driver (hiển thị 0 học sinh)

---

## 📋 Tóm Tắt Tình Trạng

### Vấn Đề Chính
- **Trang driver hiển thị:** "0 học sinh" mặc dù đã có tuyến đường và lịch trình
- **Mục tiêu:** Hiển thị đúng số học sinh cần đón tại mỗi điểm dừng

### Phạm Vi Phân Tích
1. **Tạo tuyến đường** (Route Creation)
2. **Tạo lịch trình** (Schedule Creation)
3. **Phân công học sinh** (Student Assignment)
4. **Hiển thị trên driver** (Driver View)

---

## 🗄️ Schema Database Liên Quan

### 1. Bảng `TuyenDuong` (Routes)
```sql
CREATE TABLE TuyenDuong (
    maTuyen INT AUTO_INCREMENT PRIMARY KEY,
    tenTuyen VARCHAR(255) NOT NULL,
    -- ... các field khác
    routeType ENUM('di', 've') DEFAULT NULL
)
```
**Lưu ý:** Route KHÔNG lưu thông tin học sinh, chỉ lưu stops.

### 2. Bảng `route_stops` (Route-Stop Mapping)
```sql
CREATE TABLE route_stops (
    route_id INT NOT NULL,
    stop_id INT NOT NULL,
    sequence INT NOT NULL,  -- Thứ tự điểm dừng (1,2,3,...)
    dwell_seconds INT DEFAULT 30,
    PRIMARY KEY (route_id, sequence),
    UNIQUE KEY uniq_route_stop (route_id, stop_id)
)
```
**Lưu ý:** Chỉ lưu mapping route → stops, KHÔNG có thông tin học sinh.

### 3. Bảng `DiemDung` (Stops)
```sql
CREATE TABLE DiemDung (
    maDiem INT AUTO_INCREMENT PRIMARY KEY,
    tenDiem VARCHAR(255) NOT NULL,
    viDo DECIMAL(9,6) NOT NULL,      -- latitude
    kinhDo DECIMAL(9,6) NOT NULL,    -- longitude
    address VARCHAR(255) NULL
)
```

### 4. Bảng `LichTrinh` (Schedules)
```sql
CREATE TABLE LichTrinh (
    maLichTrinh INT AUTO_INCREMENT PRIMARY KEY,
    maTuyen INT NOT NULL,
    maXe INT NOT NULL,
    maTaiXe INT NOT NULL,
    loaiChuyen ENUM('don_sang', 'tra_chieu') NOT NULL,
    gioKhoiHanh TIME NOT NULL,
    ngayChay DATE NOT NULL,
    -- ...
)
```

### 5. Bảng `schedule_student_stops` ⭐ (QUAN TRỌNG)
```sql
CREATE TABLE schedule_student_stops (
    id INT AUTO_INCREMENT PRIMARY KEY,
    maLichTrinh INT NOT NULL,
    maHocSinh INT NOT NULL,
    thuTuDiem INT NOT NULL,              -- Thứ tự điểm dừng (sequence) trong route_stops
    maDiem INT NOT NULL,                 -- Mã điểm dừng cụ thể
    UNIQUE KEY uniq_schedule_student (maLichTrinh, maHocSinh),
    -- Foreign keys...
)
```
**Đây là bảng QUAN TRỌNG NHẤT** - lưu mapping học sinh → điểm dừng trong lịch trình.

### 6. Bảng `ChuyenDi` (Trips)
```sql
CREATE TABLE ChuyenDi (
    maChuyen INT AUTO_INCREMENT PRIMARY KEY,
    maLichTrinh INT NOT NULL,
    ngayChay DATE NOT NULL,
    trangThai ENUM('chua_khoi_hanh', 'dang_chay', 'hoan_thanh', 'huy') DEFAULT 'chua_khoi_hanh',
    -- ...
)
```

### 7. Bảng `TrangThaiHocSinh` ⭐ (QUAN TRỌNG)
```sql
CREATE TABLE TrangThaiHocSinh (
    maTrangThai INT AUTO_INCREMENT PRIMARY KEY,
    maChuyen INT NOT NULL,
    maHocSinh INT NOT NULL,
    thuTuDiemDon INT,                    -- Thứ tự điểm dừng (sequence) - phải khớp với route_stops.sequence
    trangThai ENUM('cho_don', 'da_don', 'da_tra', 'vang') DEFAULT 'cho_don',
    -- ...
    UNIQUE KEY unique_chuyen_hoc_sinh (maChuyen, maHocSinh)
)
```
**Đây là bảng driver sử dụng** - lưu trạng thái học sinh trong chuyến đi.

---

## 🔄 Luồng Xử Lý Chi Tiết

### BƯỚC 1: Tạo Tuyến Đường (Route Creation)

#### 1.1. Auto Route Suggestion (`RouteSuggestionService.suggestRoutes`)

**File:** `ssb-backend/src/services/RouteSuggestionService.js`

**Quy trình:**
1. Nhận danh sách học sinh đầu vào
2. Clustering học sinh thành các điểm dừng (`StopSuggestionService.clusterStudents`)
3. Tạo routes từ stops (`createRouteFromStops`)
4. **QUAN TRỌNG:** Mỗi stop có `studentCount` và `students` array trong response

**Code:**
```javascript
// RouteSuggestionService.js:626-634
stops: finalStops.map((stop, index) => ({
  sequence: index + 1,
  lat: stop.lat,
  lng: stop.lng,
  address: stop.address,
  tenDiem: stop.tenDiem || stop.address || `Điểm dừng ${index + 1}`,
  studentCount: stop.studentCount || 0,  // ⚠️ Có thông tin học sinh
  students: stop.students || [],          // ⚠️ Có danh sách học sinh
}))
```

**⚠️ VẤN ĐỀ:** Thông tin `studentCount` và `students` chỉ có trong response API, **KHÔNG được lưu vào database**.

#### 1.2. Lưu Route vào Database (`RouteService.createRoutesBatch`)

**File:** `ssb-backend/src/services/RouteService.js`

**Quy trình:**
1. Tạo bản ghi `TuyenDuong`
2. Tạo/tìm `DiemDung` từ stops
3. Tạo mapping `route_stops` với `sequence`

**Code:**
```javascript
// RouteService.js:283-288
await connection.query(
  `INSERT INTO route_stops (route_id, stop_id, sequence, dwell_seconds)
   VALUES (?, ?, ?, ?)
   ON DUPLICATE KEY UPDATE sequence = VALUES(sequence)`,
  [routeId, stopId, sequence, stop.dwell_seconds || 30]
);
```

**⚠️ VẤN ĐỀ:** 
- **KHÔNG lưu thông tin học sinh** vào route
- Route chỉ có stops, không biết học sinh nào ở stop nào
- Thông tin `studentCount` và `students` từ suggestion **BỊ MẤT**

**Kết luận Bước 1:**
- ✅ Route được tạo thành công với stops
- ❌ Thông tin học sinh KHÔNG được lưu vào route
- ⚠️ Cần lưu thông tin học sinh ở bước sau (Schedule)

---

### BƯỚC 2: Tạo Lịch Trình (Schedule Creation)

#### 2.1. Frontend: Schedule Form (`schedule-form.tsx`)

**File:** `ssb-frontend/components/admin/schedule-form.tsx`

**Quy trình:**
1. User chọn route → Load route stops (`apiClient.getRouteStops`)
2. Load available students (`apiClient.getStudents`)
3. User gán học sinh vào stops (thủ công hoặc "Tự động gán")
4. Submit với payload có `students` array

**Code:**
```typescript
// schedule-form.tsx:307-325
const studentsArray = Object.values(selectedStudents)

const payload = {
  maTuyen: parseInt(route),
  maXe: parseInt(bus),
  maTaiXe: parseInt(driver),
  loaiChuyen: tripType,
  gioKhoiHanh: startTime,
  ngayChay: ngayChay,
  dangApDung: true,
  ...(studentsArray.length > 0 && { students: studentsArray }),  // ⚠️ Chỉ gửi nếu có
}
```

**Format `students` array:**
```typescript
{
  maHocSinh: number,
  thuTuDiem: number,  // sequence của stop trong route
  maDiem: number      // maDiem của DiemDung
}
```

**⚠️ VẤN ĐỀ:**
- Nếu user không chọn học sinh, `students` **KHÔNG được gửi** trong payload
- Frontend không tự động gán học sinh khi submit (chỉ có button "Tự động gán")

#### 2.2. Backend: Schedule Controller (`ScheduleController.create`)

**File:** `ssb-backend/src/controllers/ScheduleController.js`

**Quy trình:**
1. Validate input
2. Gọi `ScheduleService.create` với `students: students || []`

**Code:**
```javascript
// ScheduleController.js:272-281
const newSchedule = await ScheduleService.create({
  maTuyen,
  maXe,
  maTaiXe,
  loaiChuyen,
  gioKhoiHanh,
  ngayChay,
  dangApDung: dangApDung !== false,
  students: students || [],  // ⚠️ Có thể là [] nếu không gửi
});
```

#### 2.3. Backend: Schedule Service (`ScheduleService.create`)

**File:** `ssb-backend/src/services/ScheduleService.js`

**Quy trình:**
1. Tạo bản ghi `LichTrinh`
2. **Nếu có `students`:** Lưu vào `schedule_student_stops` (dòng 185-195)
3. **Nếu KHÔNG có `students`:** Tự động gán học sinh từ route stops (dòng 126-217)

**Code Auto-Assign:**
```javascript
// ScheduleService.js:126-217
if ((!students || students.length === 0)) {
  // Lấy route stops
  const routeStops = await RouteService.getStops(maTuyen);
  
  // Lấy tất cả học sinh có tọa độ
  let allStudents = await HocSinhModel.getAll();
  allStudents = allStudents.filter(s => s.viDo && s.kinhDo && ...);
  
  // Tính khoảng cách và gán học sinh vào stop gần nhất (< 2km)
  for (const student of allStudents) {
    // Tìm stop gần nhất
    // Gán vào autoAssignedStudents
  }
  
  finalStudents = autoAssignedStudents;
}
```

**⚠️ VẤN ĐỀ TIỀM ẨN:**
1. **Route stops không có tọa độ:** Auto-assign sẽ không tìm thấy học sinh
2. **Học sinh không có tọa độ:** Sẽ bị filter bỏ
3. **Học sinh quá xa stops (> 2km):** Sẽ không được gán
4. **Logic chỉ chạy khi `students.length === 0`:** Nếu frontend gửi `students: []`, auto-assign sẽ KHÔNG chạy

**Code Lưu vào DB:**
```javascript
// ScheduleService.js:219-243
if (finalStudents && Array.isArray(finalStudents) && finalStudents.length > 0) {
  await ScheduleStudentStopModel.bulkCreate(id, finalStudents);
  // Verify: Query lại để kiểm tra
  const verifyStudents = await ScheduleStudentStopModel.getByScheduleId(id);
}
```

**Kết luận Bước 2:**
- ✅ Nếu có `students` từ frontend → Lưu vào `schedule_student_stops`
- ⚠️ Nếu không có `students` → Auto-assign có thể không hoạt động nếu:
  - Route stops không có tọa độ
  - Học sinh không có tọa độ
  - Học sinh quá xa stops

---

### BƯỚC 3: Tạo Chuyến Đi (Trip Creation)

#### 3.1. Tự Động Tạo Trip từ Schedule

**File:** `ssb-backend/src/services/ScheduleService.js`

**Quy trình:**
1. Sau khi tạo schedule, nếu `ngayChay >= hôm nay`
2. Tạo `ChuyenDi` (Trip)
3. **Copy students từ `schedule_student_stops` → `TrangThaiHocSinh`**

**Code:**
```javascript
// ScheduleService.js:245-270
if (scheduleDate >= today) {
  const tripId = await ChuyenDiModel.create({
    maLichTrinh: id,
    ngayChay,
    trangThai: 'chua_khoi_hanh',
  });
  
  // Copy students từ schedule_student_stops sang TrangThaiHocSinh
  const copiedCount = await ScheduleStudentStopModel.copyToTrip(id, tripId);
}
```

#### 3.2. Copy Students (`ScheduleStudentStopModel.copyToTrip`)

**File:** `ssb-backend/src/models/ScheduleStudentStopModel.js`

**Quy trình:**
1. Lấy students từ `schedule_student_stops` (join với `route_stops` để lấy `sequence`)
2. Insert vào `TrangThaiHocSinh` với `thuTuDiemDon = sequence`

**Code:**
```javascript
// ScheduleStudentStopModel.js:123-150
async copyToTrip(maLichTrinh, maChuyen) {
  const scheduleStudents = await this.getByScheduleId(maLichTrinh);
  
  // Ưu tiên dùng sequence từ route_stops nếu có
  const values = scheduleStudents.map((s) => {
    const thuTuDiemDon = s.sequence !== null ? s.sequence : s.thuTuDiem;
    return `(${maChuyen}, ${s.maHocSinh}, ${thuTuDiemDon}, 'cho_don', NULL, NULL)`;
  });
  
  // INSERT INTO TrangThaiHocSinh ...
}
```

**⚠️ VẤN ĐỀ:**
- Nếu `schedule_student_stops` không có dữ liệu → `TrangThaiHocSinh` sẽ rỗng
- Nếu `thuTuDiem` không khớp với `sequence` của `route_stops` → Students sẽ không match đúng với stops

**Kết luận Bước 3:**
- ✅ Trip được tạo tự động từ schedule
- ⚠️ Students chỉ được copy nếu `schedule_student_stops` có dữ liệu
- ⚠️ Nếu schedule không có students → Trip sẽ không có students

---

### BƯỚC 4: Hiển Thị Trên Driver (Driver View)

#### 4.1. API Get Trip Detail (`TripController.getById`)

**File:** `ssb-backend/src/controllers/TripController.js`

**Quy trình:**
1. Lấy trip, schedule, route info
2. Lấy route stops từ `route_stops`
3. Lấy students từ `TrangThaiHocSinh`
4. **Nếu không có students:** Tự động copy từ schedule (dòng 307-325)
5. Match students với stops theo `thuTuDiemDon === sequence`

**Code:**
```javascript
// TripController.js:304-323
let students = await TrangThaiHocSinhModel.getByTripId(id);

// Nếu trip không có students nhưng có schedule, tự động copy từ schedule
if (students.length === 0 && schedule && schedule.maLichTrinh) {
  const scheduleStudents = await ScheduleStudentStopModel.getByScheduleId(schedule.maLichTrinh);
  if (scheduleStudents.length > 0) {
    const copiedCount = await ScheduleStudentStopModel.copyToTrip(schedule.maLichTrinh, id);
    students = await TrangThaiHocSinhModel.getByTripId(id);
  }
}

// Match students với stops
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

**⚠️ VẤN ĐỀ:**
- Nếu `TrangThaiHocSinh` rỗng → `studentCount = 0`
- Nếu `thuTuDiemDon` không khớp với `sequence` → Students không match với stops
- Auto-copy chỉ chạy khi `students.length === 0`, nhưng nếu schedule cũng không có students → Vẫn 0

#### 4.2. Frontend Driver View (`trip/[id]/page.tsx`)

**File:** `ssb-frontend/app/driver/trip/[id]/page.tsx`

**Quy trình:**
1. Load trip detail từ API
2. Map route stops từ `data?.routeInfo?.diemDung`
3. Map students vào stops (ưu tiên `stop.students` từ backend)

**Code:**
```typescript
// trip/[id]/page.tsx:532-570
if (stop.students && Array.isArray(stop.students) && stop.students.length > 0) {
  // Sử dụng students từ stop (backend đã match đúng)
  stopStudents = stop.students.map(...);
} else {
  // Fallback: Match từ data?.students
  stopStudents = (data?.students || [])
    .filter((student: any) => student.thuTuDiemDon === stopSequence)
    .map(...);
}
```

**Kết luận Bước 4:**
- ✅ Frontend đã có logic hiển thị students
- ❌ Nếu backend trả về `studentCount = 0` → Frontend sẽ hiển thị 0 học sinh

---

## 🔍 Điểm Nghẽn (Bottlenecks) & Vấn Đề

### 1. **Route KHÔNG lưu thông tin học sinh**
- **Vấn đề:** Route suggestion có `studentCount` và `students`, nhưng khi lưu route, thông tin này BỊ MẤT
- **Ảnh hưởng:** Không thể biết học sinh nào ở stop nào chỉ từ route
- **Giải pháp:** Cần lưu thông tin học sinh ở bước Schedule

### 2. **Schedule có thể không có students**
- **Vấn đề:** 
  - Frontend chỉ gửi `students` nếu user chọn thủ công
  - Auto-assign có thể không hoạt động nếu:
    - Route stops không có tọa độ
    - Học sinh không có tọa độ
    - Học sinh quá xa stops (> 2km)
- **Ảnh hưởng:** `schedule_student_stops` rỗng → Trip không có students
- **Giải pháp:** 
  - Đảm bảo route stops có tọa độ
  - Đảm bảo học sinh có tọa độ
  - Tăng ngưỡng khoảng cách hoặc bỏ ngưỡng

### 3. **Trip không tự động copy students**
- **Vấn đề:** 
  - Trip chỉ copy students khi được tạo tự động từ schedule
  - Nếu schedule được tạo trước khi có logic auto-assign → Trip sẽ không có students
- **Ảnh hưởng:** Driver view hiển thị 0 học sinh
- **Giải pháp:** 
  - Đã có logic auto-copy trong `TripController.getById` (dòng 307-325)
  - Nhưng nếu schedule cũng không có students → Vẫn 0

### 4. **Mismatch `thuTuDiem` và `sequence`**
- **Vấn đề:** 
  - `schedule_student_stops.thuTuDiem` có thể không khớp với `route_stops.sequence`
  - `TrangThaiHocSinh.thuTuDiemDon` phải khớp với `route_stops.sequence` để match đúng
- **Ảnh hưởng:** Students không match với stops đúng
- **Giải pháp:** 
  - Đã có logic ưu tiên `sequence` từ `route_stops` trong `copyToTrip`
  - Cần đảm bảo `thuTuDiem` trong `schedule_student_stops` luôn = `sequence`

---

## 📊 Sơ Đồ Luồng Dữ Liệu

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. TẠO TUYẾN ĐƯỜNG (Route Creation)                            │
├─────────────────────────────────────────────────────────────────┤
│ RouteSuggestionService.suggestRoutes()                          │
│   ↓                                                             │
│   - Clustering học sinh → Stops                                │
│   - Mỗi stop có: studentCount, students[]                       │
│   ↓                                                             │
│ RouteService.createRoutesBatch()                               │
│   ↓                                                             │
│   - Tạo TuyenDuong                                             │
│   - Tạo DiemDung                                               │
│   - Tạo route_stops (route_id, stop_id, sequence)              │
│   ⚠️ KHÔNG lưu thông tin học sinh                              │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. TẠO LỊCH TRÌNH (Schedule Creation)                          │
├─────────────────────────────────────────────────────────────────┤
│ Frontend: schedule-form.tsx                                    │
│   ↓                                                             │
│   - User chọn route → Load route stops                         │
│   - User chọn học sinh → Gán vào stops                         │
│   - Submit với students: [{maHocSinh, thuTuDiem, maDiem}]     │
│   ↓                                                             │
│ Backend: ScheduleService.create()                              │
│   ↓                                                             │
│   IF students.length > 0:                                      │
│     → Lưu vào schedule_student_stops                          │
│   ELSE:                                                        │
│     → Auto-assign học sinh từ route stops                     │
│     → Lưu vào schedule_student_stops                          │
│   ↓                                                             │
│   IF ngayChay >= today:                                        │
│     → Tạo ChuyenDi (Trip)                                     │
│     → Copy từ schedule_student_stops → TrangThaiHocSinh       │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. HIỂN THỊ TRÊN DRIVER (Driver View)                          │
├─────────────────────────────────────────────────────────────────┤
│ TripController.getById()                                      │
│   ↓                                                             │
│   - Lấy route stops từ route_stops                            │
│   - Lấy students từ TrangThaiHocSinh                           │
│   ↓                                                             │
│   IF students.length === 0:                                    │
│     → Auto-copy từ schedule_student_stops                     │
│   ↓                                                             │
│   - Match students với stops (thuTuDiemDon === sequence)       │
│   - Trả về stops với studentCount và students[]               │
│   ↓                                                             │
│ Frontend: trip/[id]/page.tsx                                  │
│   ↓                                                             │
│   - Hiển thị stops với số học sinh                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Các Điểm Cần Kiểm Tra

### 1. Kiểm Tra Database
```sql
-- Kiểm tra schedule có students không
SELECT COUNT(*) FROM schedule_student_stops WHERE maLichTrinh = [scheduleId];

-- Kiểm tra trip có students không
SELECT COUNT(*) FROM TrangThaiHocSinh WHERE maChuyen = [tripId];

-- Kiểm tra route stops có tọa độ không
SELECT rs.sequence, d.tenDiem, d.viDo, d.kinhDo
FROM route_stops rs
JOIN DiemDung d ON rs.stop_id = d.maDiem
WHERE rs.route_id = [routeId];

-- Kiểm tra học sinh có tọa độ không
SELECT COUNT(*) FROM HocSinh WHERE viDo IS NOT NULL AND kinhDo IS NOT NULL AND trangThai = TRUE;
```

### 2. Kiểm Tra Backend Logs
- `[ScheduleService] No students provided, auto-assigning...`
- `[ScheduleService] ✅ Auto-assigned X students to schedule Y`
- `[ScheduleStudentStopModel] bulkCreate: ✅ Inserted X rows`
- `[TripController.getById] Trip X has no students, copying from schedule Y...`

### 3. Kiểm Tra Frontend Logs
- `[ScheduleForm] Submitting schedule with students:`
- `[Driver Trip] Route stops from API:`
- `[Driver Trip] Stop X (Y): Z students`

---

## 💡 Gợi Ý Giải Pháp

### Giải Pháp 1: Đảm Bảo Schedule Luôn Có Students
- **Khi tạo schedule:** Luôn tự động gán học sinh (không cần user chọn)
- **Tăng ngưỡng khoảng cách:** Từ 2km lên 5km hoặc bỏ ngưỡng
- **Fallback:** Nếu không tìm thấy học sinh gần, gán vào stop đầu tiên

### Giải Pháp 2: Lưu Thông Tin Học Sinh Vào Route
- **Tạo bảng mới:** `route_student_stops (route_id, stop_id, student_id)`
- **Khi tạo route từ suggestion:** Lưu mapping học sinh → stops
- **Khi tạo schedule:** Copy từ route → schedule

### Giải Pháp 3: Cải Thiện Auto-Assign
- **Kiểm tra tọa độ:** Đảm bảo route stops và học sinh có tọa độ
- **Geocoding tự động:** Nếu thiếu tọa độ, tự động geocoding
- **Logging chi tiết:** Log từng bước để debug

---

## 📝 Kết Luận

**Vấn đề chính:** Học sinh không được lưu vào `schedule_student_stops` hoặc không được copy vào `TrangThaiHocSinh`, dẫn đến driver view hiển thị 0 học sinh.

**Nguyên nhân có thể:**
1. Frontend không gửi `students` khi tạo schedule
2. Auto-assign không hoạt động (thiếu tọa độ, quá xa)
3. Schedule được tạo trước khi có logic auto-assign
4. Trip không copy students từ schedule

**Hành động tiếp theo:**
1. Kiểm tra database: `schedule_student_stops` và `TrangThaiHocSinh` có dữ liệu không
2. Kiểm tra logs: Xem auto-assign có chạy không
3. Kiểm tra tọa độ: Route stops và học sinh có tọa độ không
4. Tạo schedule mới: Test với logging chi tiết

---

**File này được tạo để hỗ trợ phân tích và debug vấn đề không lấy được học sinh.**

