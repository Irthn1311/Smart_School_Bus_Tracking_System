# Triển Khai Geocode Địa Chỉ Học Sinh

**Ngày:** 2025-11-20  
**Mục tiêu:** Tự động lấy tọa độ (viDo, kinhDo) từ địa chỉ học sinh

---

## ✅ Đã Triển Khai

### 1. Database Schema
- ✅ **File:** `database/01_init_db_ver2.sql`
- ✅ **Thêm fields:** `viDo DECIMAL(9,6)`, `kinhDo DECIMAL(9,6)` vào bảng `HocSinh`
- ✅ **Indexes:** 
  - `idx_coords (viDo, kinhDo)` - để query nhanh
  - `idx_has_coords` - để filter học sinh có tọa độ

### 2. Script Geocode Tất Cả Học Sinh
- ✅ **File:** `ssb-backend/scripts/geocode_all_students.js`
- ✅ **Chức năng:**
  - Geocode tất cả học sinh chưa có tọa độ
  - Batch processing (50 học sinh/batch) để tránh rate limit
  - Retry mechanism (3 lần)
  - Delay giữa các requests (100ms)
  - Logging chi tiết

**Cách chạy:**
```bash
cd ssb-backend
node scripts/geocode_all_students.js
```

### 3. Auto-Geocode Khi Tạo/Cập Nhật Học Sinh
- ✅ **File:** `ssb-backend/src/controllers/StudentController.js`
- ✅ **Tự động geocode khi:**
  - Tạo học sinh mới có địa chỉ
  - Cập nhật học sinh có địa chỉ mới và chưa có tọa độ
- ✅ **Non-blocking:** Nếu geocode fail, học sinh vẫn được tạo/cập nhật thành công

### 4. API Endpoint Geocode
- ✅ **Endpoint:** `POST /api/v1/students/geocode`
- ✅ **Payload:**
  ```json
  {
    "studentIds": [1, 2, 3]  // Optional: geocode các học sinh cụ thể
  }
  ```
- ✅ **Nếu không có `studentIds`:** Geocode tất cả học sinh chưa có tọa độ

---

## 🔄 Flow Hoạt Động

### Flow 1: Tạo Học Sinh Mới
```
1. Admin tạo học sinh với địa chỉ
   → POST /api/v1/students
   → StudentController.create()

2. Học sinh được lưu vào DB

3. Nếu có địa chỉ:
   → Tự động gọi StopSuggestionService.enrichStudentCoordinates()
   → Geocode địa chỉ qua Google Geocoding API
   → Update viDo, kinhDo vào DB
   → Log kết quả
```

### Flow 2: Cập Nhật Học Sinh
```
1. Admin cập nhật địa chỉ học sinh
   → PUT /api/v1/students/:id
   → StudentController.update()

2. Học sinh được cập nhật

3. Nếu địa chỉ thay đổi và chưa có tọa độ:
   → Tự động geocode
   → Update viDo, kinhDo
```

### Flow 3: Geocode Batch (Manual)
```
1. Admin gọi API geocode
   → POST /api/v1/students/geocode
   → StudentController.geocodeStudents()

2. Hệ thống:
   - Lấy danh sách học sinh cần geocode
   - Geocode từng batch
   - Update vào DB
   - Trả về kết quả
```

---

## 📋 Cách Sử Dụng

### Bước 1: Chạy Migration (Nếu Database Mới)
```sql
-- Nếu database đã có, chỉ cần thêm columns:
ALTER TABLE HocSinh 
ADD COLUMN viDo DECIMAL(9,6) NULL COMMENT 'Latitude (vĩ độ)',
ADD COLUMN kinhDo DECIMAL(9,6) NULL COMMENT 'Longitude (kinh độ)';

CREATE INDEX idx_coords ON HocSinh(viDo, kinhDo);
```

### Bước 2: Geocode Tất Cả Học Sinh Hiện Có
```bash
cd ssb-backend
node scripts/geocode_all_students.js
```

**Output:**
```
[GeocodeScript] Found 100 total students
[GeocodeScript] 85 students need geocoding
[GeocodeScript] Processing batch 1/2 (50 students)...
[GeocodeScript] ✅ Geocoded 10 students so far...
[GeocodeScript] ✅ Successfully geocoded 80 students
[GeocodeScript] ⚠️ Failed to geocode 5 students
```

### Bước 3: Từ Giờ Tự Động
- Khi tạo học sinh mới → Tự động geocode
- Khi cập nhật địa chỉ → Tự động geocode nếu chưa có tọa độ

### Bước 4: Geocode Lại (Nếu Cần)
```bash
# Via API
POST http://localhost:4000/api/v1/students/geocode
Authorization: Bearer <admin_token>

# Geocode tất cả
{}

# Geocode học sinh cụ thể
{
  "studentIds": [1, 2, 3]
}
```

---

## ⚙️ Cấu Hình

### Google Maps API
- **Cần enable:** Geocoding API
- **Rate limit:** ~50 requests/second
- **Cache:** 24 giờ (trong MapsService)

### Script Settings
- **Batch size:** 50 học sinh/batch
- **Delay:** 100ms giữa các requests
- **Retry:** 3 lần cho mỗi địa chỉ

---

## 🧪 Test Cases

### Test 1: Tạo Học Sinh Mới
```bash
POST /api/v1/students
{
  "hoTen": "Nguyễn Văn A",
  "ngaySinh": "2010-01-01",
  "lop": "5A",
  "diaChi": "123 Nguyễn Văn Linh, Quận 7, TP.HCM"
}
```

**Expected:**
- Học sinh được tạo
- Tự động geocode địa chỉ
- `viDo` và `kinhDo` được lưu vào DB

### Test 2: Cập Nhật Địa Chỉ
```bash
PUT /api/v1/students/1
{
  "diaChi": "456 Lê Văn Việt, Quận 7, TP.HCM"
}
```

**Expected:**
- Nếu chưa có tọa độ → Tự động geocode
- Nếu đã có tọa độ → Không geocode lại (giữ nguyên)

### Test 3: Geocode Batch
```bash
POST /api/v1/students/geocode
{}
```

**Expected:**
- Geocode tất cả học sinh chưa có tọa độ
- Trả về số lượng thành công/thất bại

---

## 📊 Monitoring

### Logs
- `[StudentController] ✅ Auto-geocoded student X: (lat, lng)`
- `[StudentController] ⚠️ Failed to auto-geocode student X`
- `[GeocodeScript] ✅ Successfully geocoded X students`

### Database Query
```sql
-- Kiểm tra số học sinh có tọa độ
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN viDo IS NOT NULL AND kinhDo IS NOT NULL THEN 1 ELSE 0 END) as has_coords,
  SUM(CASE WHEN viDo IS NULL OR kinhDo IS NULL THEN 1 ELSE 0 END) as missing_coords
FROM HocSinh
WHERE trangThai = TRUE;

-- Xem học sinh chưa có tọa độ
SELECT maHocSinh, hoTen, diaChi
FROM HocSinh
WHERE trangThai = TRUE 
  AND (viDo IS NULL OR kinhDo IS NULL)
  AND diaChi IS NOT NULL
  AND diaChi != '';
```

---

## ⚠️ Lưu Ý

1. **Rate Limit:** Google Geocoding API có giới hạn, script tự động delay
2. **Địa chỉ không hợp lệ:** Một số địa chỉ có thể không geocode được → Log warning
3. **Non-blocking:** Geocode fail không ảnh hưởng đến việc tạo/cập nhật học sinh
4. **Cache:** Kết quả geocode được cache 24h để tránh gọi API nhiều lần

---

## 🎯 Kết Luận

✅ **Hoàn thành:**
- Database schema đã có viDo/kinhDo
- Auto-geocode khi tạo/cập nhật
- Script geocode batch
- API endpoint để geocode lại

✅ **Sẵn sàng sử dụng!**

