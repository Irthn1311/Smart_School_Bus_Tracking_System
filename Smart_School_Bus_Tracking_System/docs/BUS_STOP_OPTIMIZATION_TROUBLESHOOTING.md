# Hướng Dẫn Xử Lý Sự Cố - Bus Stop Optimization

## Vấn Đề: Kết Quả 0 Điểm Dừng, 0 Tuyến Xe

Nếu bạn gặp kết quả "0 điểm dừng, 0 tuyến xe" khi chạy tối ưu hóa, hãy kiểm tra các điểm sau:

---

## 🔍 Kiểm Tra 1: Có Học Sinh Trong Database Không?

### SQL Query để kiểm tra:
```sql
SELECT COUNT(*) as total_students FROM HocSinh;
```

**Nếu kết quả = 0:**
- Chạy file `database/02_sample_data.sql` để import dữ liệu mẫu
- Hoặc thêm học sinh thủ công qua UI Admin

---

## 🔍 Kiểm Tra 2: Học Sinh Có Tọa Độ (viDo, kinhDo) Không?

### SQL Query để kiểm tra:
```sql
-- Tổng số học sinh
SELECT COUNT(*) as total FROM HocSinh;

-- Học sinh có tọa độ
SELECT COUNT(*) as with_coords 
FROM HocSinh 
WHERE viDo IS NOT NULL 
  AND kinhDo IS NOT NULL 
  AND !ISNULL(viDo) 
  AND !ISNULL(kinhDo);

-- Học sinh KHÔNG có tọa độ
SELECT COUNT(*) as without_coords 
FROM HocSinh 
WHERE viDo IS NULL 
   OR kinhDo IS NULL 
   OR ISNULL(viDo) 
   OR ISNULL(kinhDo);
```

**Nếu có học sinh không có tọa độ:**

### Giải pháp 1: Geocode tự động (nếu có địa chỉ)
```sql
-- Kiểm tra học sinh có địa chỉ nhưng không có tọa độ
SELECT maHocSinh, hoTen, diaChi 
FROM HocSinh 
WHERE (viDo IS NULL OR kinhDo IS NULL) 
  AND diaChi IS NOT NULL 
  AND diaChi != '';
```

Sau đó sử dụng API Geocoding để geocode địa chỉ:
- Frontend: Component geocode tự động
- Backend: Service `StopSuggestionService.enrichStudentCoordinates()`

### Giải pháp 2: Thêm tọa độ thủ công
```sql
UPDATE HocSinh 
SET viDo = 10.77653, kinhDo = 106.700981 
WHERE maHocSinh = ?;
```

---

## 🔍 Kiểm Tra 3: Học Sinh Có Active (trangThai = TRUE) Không?

### SQL Query để kiểm tra:
```sql
-- Học sinh active
SELECT COUNT(*) as active_students 
FROM HocSinh 
WHERE trangThai = TRUE;

-- Học sinh inactive
SELECT COUNT(*) as inactive_students 
FROM HocSinh 
WHERE trangThai = FALSE OR trangThai IS NULL;
```

**Nếu có học sinh inactive:**
```sql
-- Kích hoạt tất cả học sinh
UPDATE HocSinh SET trangThai = TRUE WHERE trangThai = FALSE OR trangThai IS NULL;
```

---

## 🔍 Kiểm Tra 4: Logs Backend

Kiểm tra console logs của backend khi chạy optimization:

```
[BusStopOptimization] Total students from DB: X
[BusStopOptimization] Students with valid coordinates: Y
[BusStopOptimization] Processing Y students
```

**Nếu `Y = 0`:**
- Kiểm tra lại các bước 1-3 ở trên
- Đảm bảo học sinh có `viDo`, `kinhDo` hợp lệ và `trangThai = TRUE`

---

## 🔍 Kiểm Tra 5: Bảng HocSinh_DiemDung

Nếu Tầng 1 chạy thành công nhưng Tầng 2 trả về 0 tuyến:

### SQL Query để kiểm tra:
```sql
-- Kiểm tra assignments trong HocSinh_DiemDung
SELECT COUNT(*) as total_assignments FROM HocSinh_DiemDung;

-- Kiểm tra số điểm dừng có học sinh
SELECT 
  dd.maDiem,
  dd.tenDiem,
  COUNT(hsd.maHocSinh) as student_count
FROM DiemDung dd
LEFT JOIN HocSinh_DiemDung hsd ON dd.maDiem = hsd.maDiemDung
GROUP BY dd.maDiem, dd.tenDiem
HAVING student_count > 0
ORDER BY student_count DESC;
```

**Nếu không có assignments:**
- Chạy lại Tầng 1 (Tối ưu điểm dừng) trước
- Kiểm tra logs để xem có lỗi gì không

---

## 🛠️ Giải Pháp Nhanh

### Bước 1: Import Dữ Liệu Mẫu
```bash
# Chạy trong MySQL
mysql -u root -p school_bus_system < database/01_init_db_ver2.sql
mysql -u root -p school_bus_system < database/02_sample_data.sql
```

### Bước 2: Kiểm Tra Học Sinh
```sql
-- Xem danh sách học sinh có tọa độ
SELECT 
  maHocSinh, 
  hoTen, 
  viDo, 
  kinhDo, 
  trangThai,
  diaChi
FROM HocSinh 
WHERE viDo IS NOT NULL 
  AND kinhDo IS NOT NULL 
  AND trangThai = TRUE
LIMIT 10;
```

### Bước 3: Chạy Tối Ưu Hóa
1. Vào `/admin/bus-stop-optimization`
2. Chọn tab "Tối Ưu Hoàn Chỉnh"
3. Nhấn "Chạy Tối Ưu Hóa"
4. Kiểm tra logs backend để xem chi tiết

---

## 📊 Kiểm Tra Thống Kê

Sử dụng endpoint GET `/api/v1/bus-stops/stats` để xem thống kê:

```bash
curl -X GET http://localhost:4000/api/v1/bus-stops/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response sẽ cho biết:
- Tổng số điểm dừng
- Tổng số học sinh đã gán
- Khoảng cách đi bộ trung bình/tối đa

---

## ⚠️ Lưu Ý Quan Trọng

1. **Tầng 1 phải chạy trước Tầng 2:**
   - Tầng 1 tạo điểm dừng và gán học sinh
   - Tầng 2 sử dụng kết quả từ Tầng 1 để tối ưu tuyến xe

2. **Học sinh phải có tọa độ:**
   - Nếu học sinh không có tọa độ, sẽ bị bỏ qua
   - Sử dụng Geocoding API để geocode địa chỉ

3. **Tham số R_walk:**
   - Nếu R_walk quá nhỏ (ví dụ: 100m), có thể không tìm được điểm dừng phù hợp
   - Khuyến nghị: 300-500m cho TP.HCM

---

## 🐛 Debug Mode

Để xem chi tiết logs, kiểm tra console backend:

```bash
# Backend logs sẽ hiển thị:
[BusStopOptimization] Total students from DB: X
[BusStopOptimization] Students with valid coordinates: Y
[BusStopOptimization] ⚠️ Z students without coordinates
[BusStopOptimization] ⚠️ W inactive students
[BusStopOptimization] Processing Y students
[BusStopOptimization] Iteration 1: Y unassigned students, 0 stops created
...
```

Nếu thấy `Y = 0`, kiểm tra lại các bước trên.

---

**Last Updated:** 2025-01-XX

