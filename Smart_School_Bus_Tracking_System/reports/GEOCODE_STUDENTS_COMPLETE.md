# ✅ Hoàn Thành: Geocode Địa Chỉ Học Sinh

**Ngày:** 2025-11-20  
**Trạng thái:** ✅ **HOÀN THÀNH**

---

## 📋 Tổng Kết

### ✅ Đã Triển Khai

1. **Database Schema**
   - ✅ Thêm `viDo DECIMAL(9,6)` và `kinhDo DECIMAL(9,6)` vào bảng `HocSinh`
   - ✅ Thêm indexes: `idx_coords`, `idx_has_coords`
   - ✅ File: `database/01_init_db_ver2.sql`

2. **Script Geocode Batch**
   - ✅ File: `ssb-backend/scripts/geocode_all_students.js`
   - ✅ Geocode tất cả học sinh chưa có tọa độ
   - ✅ Batch processing (50/batch) với delay
   - ✅ Retry mechanism (3 lần)

3. **Auto-Geocode Khi Tạo/Cập Nhật**
   - ✅ File: `ssb-backend/src/controllers/StudentController.js`
   - ✅ Tự động geocode khi tạo học sinh mới có địa chỉ
   - ✅ Tự động geocode khi cập nhật địa chỉ (nếu chưa có tọa độ)
   - ✅ Non-blocking: Geocode fail không ảnh hưởng đến tạo/cập nhật

4. **API Endpoint Geocode**
   - ✅ Endpoint: `POST /api/v1/students/geocode`
   - ✅ Geocode học sinh cụ thể hoặc tất cả
   - ✅ File: `ssb-backend/src/routes/api/student.js`

5. **Model Update**
   - ✅ File: `ssb-backend/src/models/HocSinhModel.js`
   - ✅ Method `update()` hỗ trợ `viDo` và `kinhDo`

---

## 🚀 Cách Sử Dụng

### 1. Chạy Migration (Nếu Database Đã Có Dữ Liệu)

```sql
-- Thêm columns vào HocSinh
ALTER TABLE HocSinh 
ADD COLUMN viDo DECIMAL(9,6) NULL COMMENT 'Latitude (vĩ độ)',
ADD COLUMN kinhDo DECIMAL(9,6) NULL COMMENT 'Longitude (kinh độ)';

-- Thêm indexes
CREATE INDEX idx_coords ON HocSinh(viDo, kinhDo);
```

### 2. Geocode Tất Cả Học Sinh Hiện Có

```bash
cd ssb-backend
node scripts/geocode_all_students.js
```

**Output mẫu:**
```
[GeocodeScript] ========================================
[GeocodeScript] Starting to geocode all students...
[GeocodeScript] ========================================
[GeocodeScript] Found 100 total students
[GeocodeScript] 85 students need geocoding
[GeocodeScript] Processing batch 1/2 (50 students)...
[GeocodeScript] ✅ Geocoded 10 students so far...
[GeocodeScript] ✅ Successfully geocoded 80 students
[GeocodeScript] ⚠️ Failed to geocode 5 students
[GeocodeScript] ========================================
```

### 3. Từ Giờ Tự Động

- ✅ **Tạo học sinh mới** → Tự động geocode
- ✅ **Cập nhật địa chỉ** → Tự động geocode (nếu chưa có tọa độ)

### 4. Geocode Lại (Nếu Cần)

```bash
# Via API - Geocode tất cả
POST http://localhost:4000/api/v1/students/geocode
Authorization: Bearer <admin_token>
Content-Type: application/json

{}

# Geocode học sinh cụ thể
{
  "studentIds": [1, 2, 3, 4, 5]
}
```

---

## 📊 Kiểm Tra

### Query Database
```sql
-- Tổng số học sinh có/không có tọa độ
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
  AND diaChi != ''
LIMIT 10;
```

---

## ⚙️ Cấu Hình

### Google Maps API
- ✅ **Cần enable:** Geocoding API
- ✅ **Rate limit:** ~50 requests/second
- ✅ **Cache:** 24 giờ (trong MapsService)

### Script Settings
- ✅ **Batch size:** 50 học sinh/batch
- ✅ **Delay:** 100ms giữa các requests
- ✅ **Retry:** 3 lần cho mỗi địa chỉ

---

## 🧪 Test

### Test 1: Tạo Học Sinh Mới
```bash
POST /api/v1/students
{
  "hoTen": "Nguyễn Văn A",
  "ngaySinh": "2010-01-01",
  "lop": "5A",
  "diaChi": "123 Nguyễn Văn Linh, Phường Tân Phong, Quận 7, TP.HCM"
}
```

**Expected:**
- ✅ Học sinh được tạo
- ✅ Tự động geocode địa chỉ
- ✅ `viDo` và `kinhDo` được lưu vào DB
- ✅ Log: `[StudentController] ✅ Auto-geocoded student X: (lat, lng)`

### Test 2: Cập Nhật Địa Chỉ
```bash
PUT /api/v1/students/1
{
  "diaChi": "456 Lê Văn Việt, Quận 7, TP.HCM"
}
```

**Expected:**
- ✅ Nếu chưa có tọa độ → Tự động geocode
- ✅ Nếu đã có tọa độ → Không geocode lại (giữ nguyên)

### Test 3: Geocode Batch API
```bash
POST /api/v1/students/geocode
{}
```

**Expected:**
- ✅ Geocode tất cả học sinh chưa có tọa độ
- ✅ Response: `{ geocoded: X, failed: Y, total: Z }`

---

## 📁 Files Đã Tạo/Sửa

### Database
- ✅ `database/01_init_db_ver2.sql` (UPDATE - thêm viDo, kinhDo vào HocSinh)

### Backend
- ✅ `ssb-backend/scripts/geocode_all_students.js` (NEW)
- ✅ `ssb-backend/src/controllers/StudentController.js` (UPDATE - auto-geocode)
- ✅ `ssb-backend/src/models/HocSinhModel.js` (UPDATE - hỗ trợ viDo/kinhDo)
- ✅ `ssb-backend/src/routes/api/student.js` (UPDATE - thêm route geocode)

---

## ⚠️ Lưu Ý

1. **Rate Limit:** Google Geocoding API có giới hạn, script tự động delay
2. **Địa chỉ không hợp lệ:** Một số địa chỉ có thể không geocode được → Log warning
3. **Non-blocking:** Geocode fail không ảnh hưởng đến việc tạo/cập nhật học sinh
4. **Cache:** Kết quả geocode được cache 24h để tránh gọi API nhiều lần

---

## 🎯 Kết Luận

✅ **Hoàn thành 100%:**
- Database schema
- Auto-geocode khi tạo/cập nhật
- Script geocode batch
- API endpoint geocode

✅ **Sẵn sàng sử dụng!**

**Next Steps:**
1. Chạy migration (nếu database đã có)
2. Chạy script geocode tất cả học sinh hiện có
3. Test với học sinh mới
4. Verify tọa độ được lưu đúng

