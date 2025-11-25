# SSB 1.0 Postman Collection - Hướng dẫn sử dụng

## Tổng quan

Collection này chứa tất cả các endpoint REST API của hệ thống Smart School Bus Tracking (SSB 1.0).

## Cài đặt

1. **Import Collection vào Postman:**
   - Mở Postman
   - Click "Import" → Chọn file `docs/postman_collection_v2.json`
   - Collection sẽ xuất hiện trong mục Collections bên trái

2. **Import Environment:**
   - Chọn file `env/local.postman_environment.json`
   - Environment sẽ xuất hiện ở góc trên bên phải

3. **Chọn Environment:**
   - Click dropdown góc trên bên phải
   - Chọn "SSB Local" environment

## Cấu trúc Collection

Collection được tổ chức theo các module:

- **Health**: Kiểm tra trạng thái API
- **Authentication**: Đăng nhập, đăng ký, refresh token
- **Buses**: Quản lý xe buýt
- **Drivers**: Quản lý tài xế
- **Students**: Quản lý học sinh
- **Routes & Stops**: Quản lý tuyến đường và điểm dừng
- **Schedules**: Quản lý lịch trình (với test 409 Conflict)
- **Trips & Attendance**: Quản lý chuyến đi và điểm danh
- **Reports**: Thống kê và báo cáo

## Quy trình Test

### Bước 1: Login lấy token
1. Chọn "Authentication → Login"
2. Body mặc định dùng tài khoản admin:
   ```json
   {
     "email": "quantri@schoolbus.vn",
     "matKhau": "password123"
   }
   ```
3. Click "Send"
4. Token sẽ tự động được lưu vào biến `{{token}}`

### Bước 2: Test các endpoint khác
1. Token đã được set tự động
2. Chạy các request khác theo thứ tự:
   - Health Check
   - Buses (CRUD)
   - Drivers
   - Students
   - Routes & Stops
   - Schedules (test cả conflict 409)
   - Trips

## Test Cases đặc biệt

### Test 409 Conflict (Schedules)
- Request "Create Schedule - Conflict (409)" trong folder Schedules
- Test này cố tình tạo schedule trùng lặp bus/driver/time
- Expect: Status 409 với message về conflict

### Test Pagination
- Tất cả list endpoints hỗ trợ query params:
  - `page=1&limit=10`
  - Response có field `pagination`

### Test Validation
- Các POST/PUT endpoints có validation
- Thiếu field bắt buộc → 400 Bad Request
- Email/Số điện thoại không đúng format → 400
- Tên tuyến/Email trùng lặp → 409 Conflict

## Dữ liệu mẫu

### Tài khoản mặc định (từ sample_data.sql):
- **Admin:** quantri@schoolbus.vn / password123
- **Driver:** taixe1@schoolbus.vn / password123
- **Phụ huynh:** phuhuynh1@schoolbus.vn / password123

### Biển số xe:
- Format: `51A-12345`, `51B-67890` (theo chuẩn VN)
- Sức chứa: 28-35 người
- Trạng thái: `hoat_dong`, `bao_tri`, `ngung_hoat_dong`

### Số bằng lái:
- Format: `B2-123456789`
- Ngày hết hạn: >= hôm nay
- Số năm kinh nghiệm: 3-10 năm

## Troubleshooting

### Lỗi 401 Unauthorized
- Kiểm tra token đã được set chưa
- Chạy lại request Login để lấy token mới

### Lỗi 404 Not Found
- Kiểm tra `baseUrl` trong environment
- Mặc định: `http://localhost:4000/api/v1`

### Lỗi 500 Internal Server Error
- Kiểm tra database đã chạy và có dữ liệu chưa
- Chạy `database/init_db.sql` và `database/sample_data.sql`

## Biến môi trường

| Biến | Mặc định | Mô tả |
|------|----------|-------|
| `baseUrl` | http://localhost:4000/api/v1 | Base URL của API |
| `token` | (auto) | JWT token từ login |

## Response Format

Tất cả response theo format chuẩn:

**Success:**
```json
{
  "success": true,
  "data": {...},
  "message": "..."
}
```

**Error:**
```json
{
  "success": false,
  "message": "...",
  "error": "Error details"
}
```

## Notes

- Tất cả endpoint cần authentication (trừ Health và Login)
- Token hết hạn sau 15 phút (cần refresh)
- Collection có auto-test scripts (Tests tab)
- Một số endpoint cần quyền Admin (requiredAdmin middleware)

## Support

Nếu gặp vấn đề, kiểm tra:
1. Backend server đang chạy ở port 4000
2. Database MySQL đã start và có dữ liệu
3. Environment "SSB Local" đã được chọn

---

**Phiên bản:** 1.0.0  
**Ngày tạo:** 2025-10-25  
**Hệ thống:** Smart School Bus Tracking System (SSB 1.0)
