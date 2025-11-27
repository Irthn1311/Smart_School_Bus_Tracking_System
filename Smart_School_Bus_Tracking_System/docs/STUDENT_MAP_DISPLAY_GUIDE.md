# Hướng Dẫn Hiển Thị Học Sinh Trên Bản Đồ Khi Tạo Tuyến Đường

## 📋 Tổng Quan

Tính năng mới này cho phép người dùng xem vị trí của tất cả học sinh trên bản đồ khi tạo hoặc chỉnh sửa tuyến đường. Điều này giúp:

- ✅ **Dễ dàng xác định vị trí học sinh** khi thiết kế tuyến
- ✅ **Tạo điểm dừng chính xác** dựa trên nơi ở của học sinh
- ✅ **Tối ưu hóa tuyến đường** để phục vụ nhiều học sinh nhất
- ✅ **Tránh bỏ sót học sinh** khi lập kế hoạch

## 🎯 Cách Sử Dụng

### 1. Truy cập trang Quản lý Tuyến Đường

Đi đến: **Admin Panel** → **Quản lý Tuyến đường** → **Thêm tuyến mới** hoặc **Chỉnh sửa tuyến**

### 2. Bật hiển thị học sinh

Trong sidebar bên trái, bạn sẽ thấy phần **"Vị trí học sinh"**:

```
┌─────────────────────────────────────┐
│ 👥 Vị trí học sinh          [150]   │
│                  [Hiện học sinh]    │
└─────────────────────────────────────┘
```

- Click nút **"Hiện học sinh"** để hiển thị tất cả học sinh trên bản đồ
- Hệ thống sẽ tự động tải danh sách học sinh có địa chỉ hợp lệ
- Số lượng học sinh được hiển thị trong badge

### 3. Xem thông tin học sinh

Trên bản đồ, bạn sẽ thấy:

- 🟢 **Markers màu xanh lá**: Vị trí của học sinh
  - Click vào marker để xem thông tin chi tiết:
    - Họ tên học sinh
    - Lớp
    - Địa chỉ

### 4. Tạo điểm dừng dựa trên vị trí học sinh

1. Quan sát các clusters (cụm) học sinh trên bản đồ
2. Click **"Thêm điểm dừng"**
3. Chọn vị trí gần cụm học sinh
4. Hoặc sử dụng chức năng **"Đề xuất"** để hệ thống tự động gợi ý các điểm dừng tối ưu

### 5. Tắt hiển thị học sinh

- Click nút **"Ẩn học sinh"** để ẩn các markers
- Markers điểm dừng vẫn hiển thị bình thường

## 🎨 Giao Diện

### Màu sắc markers:

| Màu | Ý nghĩa |
|-----|---------|
| 🟢 Xanh lá | Học sinh |
| 🔵 Xanh dương | Điểm dừng đã xác nhận |
| 🟡 Vàng | Điểm dừng đang chờ (pending) |
| 🔴 Đỏ | Điểm bắt đầu/kết thúc |

### Thông tin hiển thị:

```
┌─────────────────────────────────────┐
│ 🟢 Đang hiển thị 150 học sinh       │
│    trên bản đồ                      │
│                                     │
│ 💡 Click vào marker xanh để xem    │
│    thông tin học sinh               │
└─────────────────────────────────────┘
```

## 🔧 Tính Năng Kỹ Thuật

### API Endpoint

```
GET /api/v1/students?limit=1000
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "maHocSinh": 1,
      "hoTen": "Nguyễn Văn A",
      "lop": "10A1",
      "diaChi": "123 Nguyễn Huệ, Q.1, TP.HCM",
      "viDo": 10.7769,
      "kinhDo": 106.7009
    }
  ]
}
```

### Lọc học sinh

Hệ thống chỉ hiển thị học sinh:
- ✅ Có tọa độ `viDo` và `kinhDo`
- ✅ Tọa độ hợp lệ (không phải `null`, `0`, hoặc `NaN`)
- ✅ Đang hoạt động (`trangThai = true`)

### Hiệu năng

- Markers được cache trong `allStudentMarkersRef`
- Chỉ load dữ liệu một lần khi bật lần đầu
- Sử dụng `limit=1000` để lấy đủ dữ liệu (có thể tăng nếu cần)

## 🐛 Xử Lý Lỗi

### Học sinh không hiển thị trên bản đồ?

**Nguyên nhân có thể:**

1. **Học sinh chưa có địa chỉ/tọa độ**
   - Kiểm tra: Vào **Quản lý Học sinh** → Chi tiết học sinh
   - Giải pháp: Cập nhật địa chỉ và chạy geocoding

2. **Tọa độ không hợp lệ**
   - Tọa độ = `0`, `null`, hoặc `NaN`
   - Giải pháp: Chạy lại geocoding cho học sinh

3. **Học sinh ở xa quá**
   - Zoom out bản đồ để xem toàn bộ
   - Hoặc pan (kéo) bản đồ đến khu vực khác

### Lỗi khi load dữ liệu?

```
"Không thể tải danh sách học sinh"
```

**Kiểm tra:**
- Kết nối internet
- Server backend đang chạy
- Token xác thực còn hạn

## 📊 Ví Dụ Use Case

### Case 1: Tạo tuyến mới cho khu vực mới

1. Click **"Thêm tuyến mới"**
2. Bật **"Hiện học sinh"**
3. Quan sát bản đồ → Thấy có cluster 20 học sinh ở Quận 7
4. Thêm điểm dừng gần cluster đó
5. Tiếp tục với các cluster khác

### Case 2: Tối ưu tuyến hiện có

1. Chỉnh sửa tuyến đang có
2. Bật **"Hiện học sinh"**
3. Phát hiện có 10 học sinh ở giữa 2 điểm dừng
4. Thêm điểm dừng trung gian để phục vụ họ
5. Lưu tuyến

### Case 3: Kiểm tra coverage

1. Mở tuyến để xem
2. Bật **"Hiện học sinh"**
3. Kiểm tra xem có học sinh nào bị bỏ sót không
4. Điều chỉnh điểm dừng nếu cần

## 🚀 Cải Tiến Trong Tương Lai

- [ ] Filter học sinh theo lớp/khối
- [ ] Hiển thị số lượng học sinh trong mỗi cluster
- [ ] Auto-suggest điểm dừng dựa trên vị trí học sinh
- [ ] Highlight học sinh đã được assign vào tuyến
- [ ] Tính khoảng cách từ học sinh đến điểm dừng gần nhất

## 💡 Tips

1. **Sử dụng chức năng Đề xuất**: Sau khi bật hiển thị học sinh, click "Đề xuất" để hệ thống tự động tạo điểm dừng tối ưu

2. **Zoom phù hợp**: Zoom level 13-15 thường là tốt nhất để thấy tổng quan và chi tiết

3. **Kết hợp với Search**: Tìm kiếm địa điểm cụ thể rồi xem có học sinh nào gần đó không

4. **Kiểm tra trước khi lưu**: Luôn bật hiển thị học sinh để kiểm tra coverage trước khi lưu tuyến

## 📞 Hỗ Trợ

Nếu gặp vấn đề, vui lòng liên hệ:
- Email: support@schoolbus.vn
- Hotline: 1900-xxxx

---

**Phiên bản**: 1.0.0  
**Cập nhật**: 26/11/2025
