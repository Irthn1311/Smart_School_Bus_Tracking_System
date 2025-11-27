# 🚀 Quick Start Guide - Auto Route Stop Suggestion

**Hướng dẫn nhanh để bắt đầu sử dụng hệ thống**

---

## 📋 Bước 1: Setup Database

### Nếu Database Mới
```bash
mysql -u root -p < database/01_init_db_ver2.sql
```

### Nếu Database Đã Có Dữ Liệu
```sql
-- Thêm columns vào HocSinh
ALTER TABLE HocSinh 
ADD COLUMN viDo DECIMAL(9,6) NULL COMMENT 'Latitude (vĩ độ)',
ADD COLUMN kinhDo DECIMAL(9,6) NULL COMMENT 'Longitude (kinh độ)';

-- Thêm indexes
CREATE INDEX idx_coords ON HocSinh(viDo, kinhDo);

-- Tạo bảng student_stop_suggestions (nếu chưa có)
SOURCE database/03_create_student_stop_suggestions.sql;
```

---

## 📋 Bước 2: Geocode Học Sinh Hiện Có

```bash
cd ssb-backend
node scripts/geocode_all_students.js
```

**Kết quả mong đợi:**
```
[GeocodeScript] Found 100 total students
[GeocodeScript] 85 students need geocoding
[GeocodeScript] ✅ Successfully geocoded 80 students
```

---

## 📋 Bước 3: Test Tạo Route Tự Động

### Via Postman/API Client

```bash
POST http://localhost:4000/api/v1/routes/auto-create
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "tenTuyen": "Test Route Q7 → SGU",
  "startPoint": {
    "lat": 10.741234,
    "lng": 106.703456,
    "name": "Lotte Mart Quận 7"
  },
  "endPoint": {
    "lat": 10.7602396,
    "lng": 106.6807235,
    "name": "Đại học Sài Gòn"
  },
  "options": {
    "startRadiusKm": 2,
    "corridorRadiusKm": 3,
    "clusterRadiusKm": 0.4
  }
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "routeId": 1,
    "tenTuyen": "Test Route Q7 → SGU",
    "stops": [
      {
        "sequence": 1,
        "maDiem": 1001,
        "tenDiem": "Nguyễn Văn Linh – Nhóm 8 học sinh",
        "studentCount": 8
      }
    ],
    "suggestions": [...],
    "totalStudents": 25,
    "totalStops": 5
  }
}
```

---

## 📋 Bước 4: Test Tạo Schedule với Suggestions

1. Mở frontend: `/admin/schedules/create`
2. Chọn route vừa tạo
3. ✅ Verify: Học sinh được auto-populate từ suggestions
4. Chỉnh sửa nếu cần
5. Submit

**Verify trong database:**
```sql
SELECT COUNT(*) 
FROM schedule_student_stops 
WHERE maLichTrinh = <schedule_id>;
```

---

## 📋 Bước 5: Test Driver View

1. Tạo trip từ schedule (tự động nếu ngayChay >= today)
2. Driver login và xem trip detail
3. ✅ Verify: Hiển thị đúng số học sinh mỗi stop

---

## 🔍 Troubleshooting

### Vấn đề: Không có học sinh nào được gợi ý

**Nguyên nhân:**
- Học sinh chưa có tọa độ
- Học sinh quá xa tuyến đường

**Giải pháp:**
```bash
# Geocode lại học sinh
POST /api/v1/students/geocode

# Hoặc tăng bán kính
{
  "options": {
    "startRadiusKm": 5,  // Tăng từ 2 lên 5
    "corridorRadiusKm": 5  // Tăng từ 3 lên 5
  }
}
```

### Vấn đề: Google Maps API Error

**Nguyên nhân:**
- API key chưa được set
- API chưa được enable

**Giải pháp:**
1. Kiểm tra `.env`: `MAPS_API_KEY=your_key`
2. Enable APIs trong Google Cloud Console:
   - Directions API (Legacy)
   - Geocoding API

### Vấn đề: Geocode chậm

**Nguyên nhân:**
- Quá nhiều học sinh cần geocode
- Rate limit

**Giải pháp:**
- Script tự động delay giữa các requests
- Có thể chạy vào giờ thấp điểm
- Cache giúp tránh geocode lại

---

## 📊 Monitoring

### Check Học Sinh Có Tọa Độ
```sql
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN viDo IS NOT NULL THEN 1 ELSE 0 END) as has_coords
FROM HocSinh
WHERE trangThai = TRUE;
```

### Check Suggestions
```sql
SELECT 
  r.tenTuyen,
  COUNT(DISTINCT sss.maDiemDung) as stop_count,
  COUNT(sss.maHocSinh) as student_count
FROM student_stop_suggestions sss
JOIN TuyenDuong r ON sss.maTuyen = r.maTuyen
GROUP BY r.maTuyen;
```

---

## ✅ Checklist

- [ ] Database đã có viDo/kinhDo trong HocSinh
- [ ] Database đã có bảng student_stop_suggestions
- [ ] Đã geocode tất cả học sinh hiện có
- [ ] Google Maps API key đã được set
- [ ] Directions API và Geocoding API đã enable
- [ ] Test tạo route auto thành công
- [ ] Test tạo schedule với suggestions thành công
- [ ] Test driver view hiển thị đúng

---

## 🎉 Hoàn Thành!

Hệ thống đã sẵn sàng sử dụng. Tất cả các tính năng đã được triển khai và test.

