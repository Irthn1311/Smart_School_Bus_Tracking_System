# Smart School Bus Tracking System - API Documentation

## Tổng quan

API của hệ thống Smart School Bus Tracking System cung cấp các endpoint để quản lý xe buýt, tài xế, học sinh, tuyến đường, lịch trình và theo dõi real-time.

## Base URL

```
http://localhost:3001/api
```

## Authentication

Tất cả các API endpoint (trừ `/auth`) đều yêu cầu authentication token.

### Headers

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

## Endpoints

### Authentication

#### POST /auth/register

Đăng ký tài khoản mới

**Request Body:**

```json
{
  "hoTen": "Nguyễn Văn A",
  "email": "nguyenvana@example.com",
  "matKhau": "password123",
  "soDienThoai": "0901234567",
  "vaiTro": "phu_huynh",
  "anhDaiDien": "https://example.com/avatar.jpg"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "maNguoiDung": 1,
      "hoTen": "Nguyễn Văn A",
      "email": "nguyenvana@example.com",
      "vaiTro": "phu_huynh",
      "trangThai": true
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Đăng ký tài khoản thành công"
}
```

#### POST /auth/login

Đăng nhập

**Request Body:**

```json
{
  "email": "nguyenvana@example.com",
  "matKhau": "password123"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "maNguoiDung": 1,
      "hoTen": "Nguyễn Văn A",
      "email": "nguyenvana@example.com",
      "vaiTro": "phu_huynh"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Đăng nhập thành công"
}
```

### Bus Management

#### GET /buses

Lấy danh sách xe buýt

**Query Parameters:**

- `page` (number): Số trang (default: 1)
- `limit` (number): Số lượng bản ghi (default: 10, max: 100)
- `search` (string): Tìm kiếm theo biển số hoặc dòng xe
- `trangThai` (string): Lọc theo trạng thái (hoat_dong, bao_tri, ngung_hoat_dong)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "maXe": 1,
      "bienSoXe": "29A-12345",
      "dongXe": "Hyundai County",
      "sucChua": 29,
      "trangThai": "hoat_dong",
      "ngayTao": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalItems": 1,
    "itemsPerPage": 10
  },
  "message": "Lấy danh sách xe buýt thành công"
}
```

#### GET /buses/:id

Lấy thông tin chi tiết xe buýt

**Response:**

```json
{
  "success": true,
  "data": {
    "maXe": 1,
    "bienSoXe": "29A-12345",
    "dongXe": "Hyundai County",
    "sucChua": 29,
    "trangThai": "hoat_dong",
    "schedules": [...],
    "currentDriver": {...},
    "recentTrips": [...]
  },
  "message": "Lấy thông tin xe buýt thành công"
}
```

#### POST /buses

Tạo xe buýt mới (chỉ admin)

**Request Body:**

```json
{
  "bienSoXe": "29A-12345",
  "dongXe": "Hyundai County",
  "sucChua": 29,
  "trangThai": "hoat_dong"
}
```

#### PUT /buses/:id

Cập nhật thông tin xe buýt

#### DELETE /buses/:id

Xóa xe buýt (chỉ admin)

#### POST /buses/:id/position

Cập nhật vị trí xe buýt (real-time)

**Request Body:**

```json
{
  "viDo": 10.7409,
  "kinhDo": 106.7208,
  "tocDo": 50,
  "huongDi": 180,
  "timestamp": "2024-01-01T10:30:00.000Z"
}
```

### Driver Management

#### GET /drivers

Lấy danh sách tài xế

**Query Parameters:**

- `page`, `limit`: Phân trang
- `status`: Lọc theo trạng thái
- `search`: Tìm kiếm theo tên, email, số điện thoại

#### GET /drivers/:id

Lấy thông tin chi tiết tài xế

#### POST /drivers

Tạo tài xế mới

**Request Body:**

```json
{
  "hoTen": "Trần Văn Tài Xế",
  "email": "driver@example.com",
  "matKhau": "password123",
  "soDienThoai": "0901234568",
  "vaiTro": "tai_xe",
  "soBangLai": "A1234567",
  "ngayHetHanBangLai": "2026-12-31",
  "soNamKinhNghiem": 5
}
```

### Student Management

#### GET /students

Lấy danh sách học sinh

**Query Parameters:**

- `page`, `limit`: Phân trang
- `lop`: Lọc theo lớp
- `search`: Tìm kiếm theo tên, lớp

#### GET /students/:id

Lấy thông tin chi tiết học sinh

#### POST /students

Tạo học sinh mới

**Request Body:**

```json
{
  "hoTen": "Nguyễn Minh Anh",
  "ngaySinh": "2015-03-15",
  "lop": "3A",
  "maPhuHuynh": 3,
  "diaChi": "123 Nguyễn Văn Linh, Quận 7, TP.HCM"
}
```

### Route Management

#### GET /routes

Lấy danh sách tuyến đường

#### GET /routes/:id

Lấy thông tin chi tiết tuyến đường

#### POST /routes

Tạo tuyến đường mới

**Request Body:**

```json
{
  "tenTuyen": "Tuyến Quận 7 - Nhà Bè",
  "diemBatDau": "Trường Tiểu học Nguyễn Văn Linh",
  "diemKetThuc": "Nhà Bè",
  "thoiGianUocTinh": 45
}
```

#### GET /routes/:id/stops

Lấy danh sách điểm dừng của tuyến

#### POST /routes/:id/stops

Thêm điểm dừng mới

**Request Body:**

```json
{
  "tenDiem": "Ngã tư Nguyễn Văn Linh - Huỳnh Tấn Phát",
  "kinhDo": 106.7208,
  "viDo": 10.7409,
  "thuTu": 1
}
```

### Schedule Management

#### GET /schedules

Lấy danh sách lịch trình

**Query Parameters:**

- `maTuyen`: Lọc theo tuyến
- `maXe`: Lọc theo xe
- `maTaiXe`: Lọc theo tài xế
- `loaiChuyen`: Lọc theo loại chuyến (don_sang, tra_chieu)

#### POST /schedules

Tạo lịch trình mới

**Request Body:**

```json
{
  "maTuyen": 1,
  "maXe": 1,
  "maTaiXe": 2,
  "loaiChuyen": "don_sang",
  "gioKhoiHanh": "06:30:00",
  "dangApDung": true
}
```

### Trip Management

#### GET /trips

Lấy danh sách chuyến đi

**Query Parameters:**

- `page`, `limit`: Phân trang
- `ngayChay`: Lọc theo ngày
- `trangThai`: Lọc theo trạng thái
- `maXe`: Lọc theo xe
- `maTaiXe`: Lọc theo tài xế

#### POST /trips

Tạo chuyến đi mới

**Request Body:**

```json
{
  "maLichTrinh": 1,
  "ngayChay": "2024-01-01",
  "trangThai": "chua_khoi_hanh"
}
```

#### PUT /trips/:id/status

Cập nhật trạng thái chuyến đi

**Request Body:**

```json
{
  "trangThai": "dang_chay",
  "ghiChu": "Bắt đầu chuyến đi"
}
```

#### GET /trips/:id/students

Lấy danh sách học sinh trong chuyến đi

#### PUT /trips/:id/students/:studentId/status

Cập nhật trạng thái học sinh trong chuyến đi

**Request Body:**

```json
{
  "trangThai": "da_don",
  "ghiChu": "Học sinh đã lên xe"
}
```

## Real-time Events (Socket.IO)

### Connection

```javascript
const socket = io("http://localhost:3001", {
  auth: {
    token: "your_jwt_token",
  },
});
```

### Events

#### update_bus_location

Cập nhật vị trí xe buýt (chỉ tài xế)

```javascript
socket.emit("update_bus_location", {
  busId: 1,
  latitude: 10.7409,
  longitude: 106.7208,
  speed: 50,
  direction: 180,
  timestamp: new Date().toISOString(),
});
```

#### join_bus_tracking

Tham gia theo dõi xe buýt

```javascript
socket.emit("join_bus_tracking", { busId: 1 });
```

#### bus_location_update

Nhận cập nhật vị trí xe buýt

```javascript
socket.on("bus_location_update", (data) => {
  console.log("Bus location updated:", data);
});
```

#### update_trip_status

Cập nhật trạng thái chuyến đi (chỉ tài xế)

```javascript
socket.emit("update_trip_status", {
  tripId: 1,
  status: "dang_chay",
  note: "Bắt đầu chuyến đi",
});
```

#### update_student_status

Cập nhật trạng thái học sinh (chỉ tài xế)

```javascript
socket.emit("update_student_status", {
  tripId: 1,
  studentId: 1,
  status: "da_don",
  note: "Học sinh đã lên xe",
});
```

## Error Responses

### Validation Error (400)

```json
{
  "success": false,
  "message": "Dữ liệu không hợp lệ",
  "errors": [
    "Biển số xe không hợp lệ (VD: 29A-12345)",
    "Sức chứa phải từ 10 đến 100 người"
  ]
}
```

### Authentication Error (401)

```json
{
  "success": false,
  "message": "Token không hợp lệ hoặc đã hết hạn"
}
```

### Authorization Error (403)

```json
{
  "success": false,
  "message": "Bạn không có quyền truy cập tài nguyên này"
}
```

### Not Found Error (404)

```json
{
  "success": false,
  "message": "Không tìm thấy tài nguyên"
}
```

### Conflict Error (409)

```json
{
  "success": false,
  "message": "Biển số xe đã tồn tại trong hệ thống"
}
```

### Server Error (500)

```json
{
  "success": false,
  "message": "Lỗi server khi xử lý yêu cầu",
  "error": "Detailed error message in development"
}
```

## Health Check

### GET /health

Kiểm tra tình trạng hệ thống

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T10:30:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "environment": "development",
  "checks": {
    "database": {
      "status": "healthy",
      "message": "Database connection successful",
      "details": {
        "currentDatabase": "school_bus_system",
        "tableCount": 10,
        "responseTime": "5ms"
      }
    },
    "memory": {
      "status": "healthy",
      "message": "Memory usage: 45.2%",
      "details": {
        "heapUsed": "45.2 MB",
        "heapTotal": "100.0 MB",
        "usagePercentage": "45.2"
      }
    }
  }
}
```

### GET /health/detailed

Kiểm tra tình trạng chi tiết

### GET /health/history

Lịch sử health check

## Rate Limiting

API có rate limiting để bảo vệ khỏi abuse:

- 100 requests per minute per IP
- 1000 requests per hour per user

## CORS

API hỗ trợ CORS cho các domain được cấu hình trong `FRONTEND_URL`.

## Examples

### JavaScript (Fetch API)

```javascript
// Đăng nhập
const loginResponse = await fetch("http://localhost:3001/api/auth/login", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email: "admin@example.com",
    matKhau: "password123",
  }),
});

const loginData = await loginResponse.json();
const token = loginData.data.token;

// Lấy danh sách xe buýt
const busesResponse = await fetch("http://localhost:3001/api/buses", {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

const busesData = await busesResponse.json();
console.log(busesData);
```

### JavaScript (Axios)

```javascript
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3001/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Thêm token vào header
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Sử dụng API
const buses = await api.get("/buses");
const newBus = await api.post("/buses", {
  bienSoXe: "29A-12345",
  dongXe: "Hyundai County",
  sucChua: 29,
});
```

### Python (Requests)

```python
import requests

# Đăng nhập
login_response = requests.post('http://localhost:3001/api/auth/login', json={
    'email': 'admin@example.com',
    'matKhau': 'password123'
})

token = login_response.json()['data']['token']

# Lấy danh sách xe buýt
buses_response = requests.get(
    'http://localhost:3001/api/buses',
    headers={'Authorization': f'Bearer {token}'}
)

buses_data = buses_response.json()
print(buses_data)
```

## Testing

### Unit Tests

```bash
npm test
npm run test:watch
npm run test:coverage
```

### Database Tests

```bash
npm run test-db
```

### Initialize Database

```bash
npm run init-db
```

## Support

Nếu gặp vấn đề, hãy:

1. Kiểm tra logs trong thư mục `logs/`
2. Chạy health check: `GET /health`
3. Xem lại tài liệu này
4. Liên hệ team phát triển
