# API Documentation: Route Auto-Create & Stop Suggestions

## Overview

Hệ thống tự động tạo tuyến đường và gợi ý điểm dừng + học sinh dựa trên:
- Điểm bắt đầu và kết thúc
- Hành lang 3km quanh tuyến đường
- Clustering học sinh thành các điểm dừng

---

## POST /api/v1/routes/auto-create

Tự động tạo tuyến đường từ điểm bắt đầu → điểm kết thúc, bao gồm:
- Tạo route với polyline từ Google Directions API
- Quét học sinh trong hành lang
- Clustering học sinh thành điểm dừng
- Lưu suggestions vào `student_stop_suggestions`

### Request

**Endpoint:** `POST /api/v1/routes/auto-create`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "tenTuyen": "Tuyến A - Trường X → Trường Y",
  "startPoint": {
    "lat": 10.762622,
    "lng": 106.660172,
    "name": "Trường Tiểu học ABC"
  },
  "endPoint": {
    "lat": 10.775000,
    "lng": 106.670000,
    "name": "Trường THCS XYZ"
  },
  "options": {
    "startRadiusKm": 2,      // Bán kính quanh điểm bắt đầu (km)
    "corridorRadiusKm": 3,   // Bán kính hành lang quanh polyline (km)
    "clusterRadiusKm": 0.4    // Bán kính clustering học sinh (km)
  }
}
```

**Validation:**
- `tenTuyen`: Required, string
- `startPoint.lat`, `startPoint.lng`: Required, number (valid coordinates)
- `endPoint.lat`, `endPoint.lng`: Required, number (valid coordinates)
- `options.startRadiusKm`: Optional, number, range: 0 < value <= 50 (default: 2)
- `options.corridorRadiusKm`: Optional, number, range: 0 < value <= 50 (default: 3)
- `options.clusterRadiusKm`: Optional, number, range: 0 < value <= 50 (default: 0.4)

### Response

**Success (200):**
```json
{
  "success": true,
  "data": {
    "maTuyen": 1,
    "tenTuyen": "Tuyến A - Trường X → Trường Y",
    "diemBatDau": "Trường Tiểu học ABC",
    "diemKetThuc": "Trường THCS XYZ",
    "polyline": "encoded_polyline_string",
    "soDiemDung": 5,
    "soHocSinh": 25,
    "thoiGianUocTinh": 45
  },
  "message": "Tạo tuyến đường tự động thành công"
}
```

**Error (400):**
```json
{
  "success": false,
  "message": "INVALID_ROUTE_AUTO_CREATE_OPTIONS",
  "details": {
    "errors": [
      "startRadiusKm must be a number between 0 and 50, got: 100"
    ]
  }
}
```

**Error (400):**
```json
{
  "success": false,
  "message": "MISSING_REQUIRED_FIELDS"
}
```

### Flow

1. Gọi Google Directions API để lấy polyline
2. Decode polyline thành mảng points
3. Quét học sinh trong hành lang:
   - Khoảng cách đến điểm bắt đầu <= `startRadiusKm` **HOẶC**
   - Khoảng cách tối thiểu đến polyline <= `corridorRadiusKm`
4. Clustering học sinh với bán kính `clusterRadiusKm`
5. Snap cluster centroids vào polyline
6. Geocode để lấy địa chỉ
7. Tạo `DiemDung` và `route_stops`
8. Lưu suggestions vào `student_stop_suggestions`

---

## GET /api/v1/routes/:id/stop-suggestions

Lấy danh sách điểm dừng và học sinh được gợi ý cho một tuyến đường.

### Request

**Endpoint:** `GET /api/v1/routes/:id/stop-suggestions`

**Headers:**
```
Authorization: Bearer <token>
```

**Path Parameters:**
- `id`: Mã tuyến đường (number)

### Response

**Success (200):**
```json
{
  "success": true,
  "data": {
    "route": {
      "maTuyen": 1,
      "tenTuyen": "Tuyến A - Trường X → Trường Y",
      "diemBatDau": "Trường Tiểu học ABC",
      "diemKetThuc": "Trường THCS XYZ"
    },
    "stops": [
      {
        "sequence": 1,
        "maDiem": 10,
        "tenDiem": "Nguyễn Văn Linh – Nhóm 5 học sinh",
        "viDo": 10.763000,
        "kinhDo": 106.661000,
        "address": "123 Nguyễn Văn Linh, Quận 7, TP.HCM",
        "studentCount": 5,
        "students": [
          {
            "maHocSinh": 1,
            "hoTen": "Nguyễn Văn A",
            "lop": "5A",
            "viDo": 10.763100,
            "kinhDo": 106.661100
          }
        ]
      }
    ],
    "totalStudents": 25,
    "totalStops": 5
  },
  "message": "Lấy gợi ý điểm dừng thành công"
}
```

**Error (404):**
```json
{
  "success": false,
  "message": "Không tìm thấy tuyến đường"
}
```

### Notes

- Một học sinh có thể xuất hiện ở nhiều stops (nhiều suggestions) để admin chọn
- `sequence` là thứ tự điểm dừng dọc theo tuyến đường
- `studentCount` là số lượng học sinh được gợi ý cho stop đó

---

## Database Schema

### student_stop_suggestions

```sql
CREATE TABLE student_stop_suggestions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    maTuyen INT NOT NULL,
    maDiemDung INT NOT NULL,
    maHocSinh INT NOT NULL,
    ngayTao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ngayCapNhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Cho phép 1 học sinh có nhiều điểm dừng gợi ý trong 1 route
    UNIQUE KEY uniq_route_student_stop (maTuyen, maHocSinh, maDiemDung),
    
    FOREIGN KEY (maTuyen) REFERENCES TuyenDuong(maTuyen) ON DELETE CASCADE,
    FOREIGN KEY (maDiemDung) REFERENCES DiemDung(maDiem) ON DELETE CASCADE,
    FOREIGN KEY (maHocSinh) REFERENCES HocSinh(maHocSinh) ON DELETE CASCADE
);
```

**Lưu ý:** Constraint `UNIQUE (maTuyen, maHocSinh, maDiemDung)` cho phép một học sinh có nhiều suggestions (khác `maDiemDung`) trên cùng một route.

---

## Integration với Schedule

Khi tạo Schedule:

1. Frontend gọi `GET /api/v1/routes/:id/stop-suggestions` để load suggestions
2. Frontend hiển thị suggestions với badge "Gợi ý"
3. Admin có thể:
   - Giữ nguyên suggestions
   - Thêm học sinh thủ công (badge "Thêm tay")
   - Xóa học sinh khỏi suggestions
4. Frontend **luôn gửi** `students[]` khi submit (kể cả rỗng)
5. Backend `ScheduleService.create`:
   - Nếu có `students[]` → validate và lưu vào `schedule_student_stops`
   - Nếu không có `students[]` → auto-assign từ `student_stop_suggestions` (ưu tiên), fallback distance-based

---

## Error Codes

- `MISSING_REQUIRED_FIELDS`: Thiếu các trường bắt buộc
- `INVALID_COORDINATES`: Tọa độ không hợp lệ
- `INVALID_ROUTE_AUTO_CREATE_OPTIONS`: Options không hợp lệ (validation errors trong `details.errors`)
- `DIRECTIONS_API_ERROR`: Lỗi khi gọi Google Directions API
- `ROUTE_NOT_FOUND`: Không tìm thấy tuyến đường

---

## Examples

### Example 1: Tạo route với options mặc định

```bash
curl -X POST http://localhost:3000/api/v1/routes/auto-create \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "tenTuyen": "Tuyến 1",
    "startPoint": {
      "lat": 10.762622,
      "lng": 106.660172,
      "name": "Trường A"
    },
    "endPoint": {
      "lat": 10.775000,
      "lng": 106.670000,
      "name": "Trường B"
    }
  }'
```

### Example 2: Tạo route với options tùy chỉnh

```bash
curl -X POST http://localhost:3000/api/v1/routes/auto-create \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "tenTuyen": "Tuyến 2",
    "startPoint": {
      "lat": 10.762622,
      "lng": 106.660172,
      "name": "Trường A"
    },
    "endPoint": {
      "lat": 10.775000,
      "lng": 106.670000,
      "name": "Trường B"
    },
    "options": {
      "startRadiusKm": 3,
      "corridorRadiusKm": 4,
      "clusterRadiusKm": 0.5
    }
  }'
```

### Example 3: Lấy stop suggestions

```bash
curl -X GET http://localhost:3000/api/v1/routes/1/stop-suggestions \
  -H "Authorization: Bearer <token>"
```

---

**Last Updated:** 2025-01-XX  
**Author:** Smart School Bus Tracking System Team

