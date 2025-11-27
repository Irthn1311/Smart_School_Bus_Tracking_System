# Bước Tiếp Theo Sau Khi Tối Ưu Hóa Điểm Dừng

## ✅ Đã Hoàn Thành

1. ✅ **Tầng 1: Tối Ưu Điểm Dừng** (Greedy Maximum Coverage)
   - Tạo điểm dừng tối ưu
   - Gán học sinh vào điểm dừng
   - Lưu vào `HocSinh_DiemDung`

2. ✅ **Tầng 2: Tối Ưu Tuyến Xe** (VRP)
   - Phân chia điểm dừng vào các tuyến xe
   - Tối ưu thứ tự ghé thăm
   - Tính toán khoảng cách và thời gian

---

## 🎯 Bước Tiếp Theo: Tạo Tuyến Đường

Sau khi có kết quả optimization, bạn cần **tạo tuyến đường thực tế** trong database để có thể:
- Tạo lịch trình (schedule)
- Gán xe buýt và tài xế
- Tạo chuyến đi (trip)

---

## 📋 Các Bước Thực Hiện

### Bước 1: Chạy Optimization (Nếu chưa chạy)

**Qua UI:**
1. Vào `/admin/bus-stop-optimization`
2. Chọn tab "Tối Ưu Hoàn Chỉnh"
3. Nhập tham số và chạy

**Hoặc qua API:**
```bash
POST /api/v1/bus-stops/optimize-full
{
  "school_location": { "lat": 10.77653, "lng": 106.700981 },
  "r_walk": 500,
  "s_max": 25,
  "c_bus": 40
}
```

---

### Bước 2: Tạo Tuyến Đường Từ Kết Quả VRP

**Qua API (Khuyến nghị):**

```bash
POST /api/v1/bus-stops/create-routes
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "depot": {
    "lat": 10.77653,
    "lng": 106.700981,
    "name": "Đại học Sài Gòn"
  },
  "capacity": 40,
  "route_name_prefix": "Tuyến Tối Ưu",
  "create_return_routes": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "routes": [
      {
        "maTuyen": 1,
        "tenTuyen": "Tuyến Tối Ưu 1 - Đi",
        "diemBatDau": "Điểm dừng 1",
        "diemKetThuc": "Đại học Sài Gòn",
        "thoiGianUocTinh": 45,
        "stopCount": 5,
        "totalDemand": 35
      },
      {
        "maTuyen": 2,
        "tenTuyen": "Tuyến Tối Ưu 1 - Về",
        ...
      }
    ],
    "stats": {
      "totalRoutes": 6,
      "totalStops": 25,
      "totalStudents": 100
    }
  }
}
```

**Chức năng:**
- ✅ Tự động chạy VRP nếu chưa có kết quả
- ✅ Tạo tuyến đường đi (depot → stops → depot)
- ✅ Tạo tuyến đường về (depot → stops ngược lại → depot)
- ✅ Tạo polyline từ Google Maps API
- ✅ Gán điểm dừng vào tuyến với thứ tự đúng
- ✅ Tính toán thời gian ước tính

---

### Bước 3: Kiểm Tra Tuyến Đường Đã Tạo

**Qua UI:**
1. Vào `/admin/routes`
2. Xem danh sách tuyến đường
3. Kiểm tra chi tiết từng tuyến

**Qua API:**
```bash
GET /api/v1/routes
```

---

### Bước 4: Tạo Lịch Trình (Schedule)

Sau khi có tuyến đường, bạn cần tạo lịch trình:

**Qua UI:**
1. Vào `/admin/schedules`
2. Tạo lịch trình mới
3. Chọn tuyến đường đã tạo
4. Chọn xe buýt và tài xế
5. Đặt giờ khởi hành

**Qua API:**
```bash
POST /api/v1/schedules
{
  "maTuyen": 1,
  "maXe": 1,
  "maTaiXe": 2,
  "loaiChuyen": "don_sang",
  "gioKhoiHanh": "06:00:00"
}
```

---

## 🔄 Workflow Hoàn Chỉnh

```
1. Tối Ưu Điểm Dừng (Tầng 1)
   ↓
2. Tối Ưu Tuyến Xe (Tầng 2)
   ↓
3. Tạo Tuyến Đường ← BẠN ĐANG Ở ĐÂY
   ↓
4. Tạo Lịch Trình
   ↓
5. Tạo Chuyến Đi
   ↓
6. Theo Dõi Real-time
```

---

## 📝 Lưu Ý Quan Trọng

### 1. Thứ Tự Thực Hiện
- ✅ **Bắt buộc:** Chạy Tầng 1 trước Tầng 2
- ✅ **Bắt buộc:** Chạy Tầng 2 trước khi tạo tuyến đường
- ⚠️ **Khuyến nghị:** Tạo tuyến đường ngay sau optimization để không mất kết quả

### 2. Tuyến Đi và Tuyến Về
- Mỗi tuyến đi sẽ tự động tạo tuyến về tương ứng
- Tuyến về có `pairedRouteId` link với tuyến đi
- Có thể tắt `create_return_routes: false` nếu không cần

### 3. Polyline
- Polyline được tạo tự động từ Google Maps Directions API
- Sử dụng `vehicleType: "bus"` để tối ưu cho xe buýt
- Có thể rebuild polyline sau nếu cần

### 4. Điểm Dừng Depot
- Depot (trường học) sẽ được tạo tự động nếu chưa có
- Depot được thêm vào cuối tuyến đi và đầu tuyến về

---

## 🛠️ Troubleshooting

### Vấn Đề: Không tạo được tuyến đường

**Nguyên nhân:**
- Chưa chạy optimization Tầng 2
- Không có điểm dừng nào có học sinh được gán

**Giải pháp:**
1. Chạy lại optimization Tầng 2
2. Kiểm tra `HocSinh_DiemDung` có dữ liệu không

---

### Vấn Đề: Polyline không được tạo

**Nguyên nhân:**
- Google Maps API key không hợp lệ
- Rate limit API
- Network issues

**Giải pháp:**
1. Kiểm tra Google Maps API key
2. Kiểm tra quota API
3. Chạy lại sau vài phút

---

### Vấn Đề: Tuyến đường thiếu điểm dừng

**Nguyên nhân:**
- Điểm dừng không tồn tại trong database
- Lỗi khi gán điểm dừng vào tuyến

**Giải pháp:**
1. Kiểm tra logs backend
2. Kiểm tra điểm dừng có tồn tại không
3. Chạy lại tạo tuyến đường

---

## 📊 Kết Quả Mong Đợi

Sau khi hoàn thành, bạn sẽ có:

- ✅ **Tuyến đường đi:** N tuyến (N = số routes từ VRP)
- ✅ **Tuyến đường về:** N tuyến (nếu `create_return_routes: true`)
- ✅ **Tổng:** 2N tuyến đường
- ✅ **Mỗi tuyến có:**
  - Polyline từ Google Maps
  - Điểm dừng được gán đúng thứ tự
  - Thời gian ước tính
  - Khoảng cách ước tính

---

## 🚀 Bước Tiếp Theo Sau Khi Tạo Tuyến Đường

1. **Tạo Lịch Trình** - Gán xe và tài xế cho tuyến
2. **Tạo Chuyến Đi** - Tạo chuyến đi cụ thể cho ngày
3. **Theo Dõi Real-time** - Xem xe đang chạy ở đâu
4. **Quản Lý Học Sinh** - Xem học sinh nào đi tuyến nào

---

**Last Updated:** 2025-01-XX

