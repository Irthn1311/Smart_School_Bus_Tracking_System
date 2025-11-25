# Smart School Bus Tracking System - Backend API

## Tổng quan

Đây là backend API cho hệ thống theo dõi xe buýt trường học thông minh. API được xây dựng bằng Node.js, Express.js và Socket.IO để hỗ trợ real-time tracking.

## Cấu trúc thư mục

```
ssb-backend/
├── src/
│   ├── app.js              # Cấu hình Express app chính
│   ├── server.js           # Khởi tạo server và Socket.IO
│   ├── config/
│   │   ├── db.config.js    # Cấu hình database MySQL
│   │   └── env.example     # File mẫu cho biến môi trường
│   ├── controllers/        # Logic xử lý business
│   ├── models/            # Định nghĩa cấu trúc dữ liệu
│   ├── routes/
│   │   └── api/           # Các API endpoints
│   │       ├── bus.js     # API quản lý xe bus
│   │       ├── driver.js  # API quản lý tài xế
│   │       └── schedule.js # API quản lý lịch trình
│   ├── services/
│   │   └── inMemoryStore.js # Kho dữ liệu trong bộ nhớ (demo)
│   └── middlewares/       # Middleware xử lý request
├── package.json
└── README.md
```

## Cài đặt và chạy

### 1. Cài đặt dependencies

```bash
cd ssb-backend
npm install
```

### 2. Cấu hình biến môi trường

Tạo file `.env` từ file mẫu:

```bash
cp src/config/env.example .env
```

Cập nhật các giá trị trong file `.env`:

```env
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=smart_school_bus
JWT_SECRET=your_secret_key
```

### 3. Chạy server

```bash
# Development mode (với nodemon)
npm run dev

# Production mode
npm start
```

Server sẽ chạy tại: `http://localhost:3001`

## API Endpoints

### Health Check

- **GET** `/health` - Kiểm tra trạng thái server

### Xe Bus (Buses)

- **GET** `/api/buses` - Lấy danh sách xe bus
  - Query params: `q` (tìm kiếm), `status` (lọc theo trạng thái)
- **GET** `/api/buses/:id` - Lấy thông tin chi tiết xe bus
- **POST** `/api/buses` - Tạo xe bus mới
- **PUT** `/api/buses/:id` - Cập nhật thông tin xe bus
- **DELETE** `/api/buses/:id` - Xóa xe bus
- **POST** `/api/buses/:id/assign-driver` - Phân công tài xế
- **POST** `/api/buses/:id/position` - Cập nhật vị trí xe bus (real-time)

### Tài Xế (Drivers)

- **GET** `/api/drivers` - Lấy danh sách tài xế
- **GET** `/api/drivers/:id` - Lấy thông tin chi tiết tài xế
- **POST** `/api/drivers` - Tạo tài xế mới
- **PUT** `/api/drivers/:id` - Cập nhật thông tin tài xế
- **DELETE** `/api/drivers/:id` - Xóa tài xế
- **GET** `/api/drivers/:id/assignments` - Lấy danh sách chuyến đi được phân công

### Lịch Trình (Schedules)

- **GET** `/api/schedules` - Lấy danh sách lịch trình
  - Query params: `date`, `busId`, `driverId`
- **GET** `/api/schedules/:id` - Lấy thông tin chi tiết lịch trình
- **POST** `/api/schedules` - Tạo lịch trình mới
- **PUT** `/api/schedules/:id` - Cập nhật lịch trình
- **DELETE** `/api/schedules/:id` - Xóa lịch trình
- **POST** `/api/schedules/:id/assign` - Phân công xe/tài xế
- **POST** `/api/schedules/:id/trip-status` - Cập nhật trạng thái chuyến đi (real-time)

## Real-time Features với Socket.IO

### Kết nối Socket.IO

```javascript
const socket = io("http://localhost:3001");

// Tham gia phòng theo dõi một xe bus cụ thể
socket.emit("join-bus-room", "bus_001");

// Lắng nghe sự kiện cập nhật vị trí xe bus
socket.on("bus_position_update", (data) => {
  console.log("Vị trí xe bus:", data);
  // data = { busId: 'bus_001', position: { lat: 21.0285, lng: 105.8542, ts: '...' } }
});

// Lắng nghe sự kiện thay đổi trạng thái chuyến đi
socket.on("trip_status_change", (data) => {
  console.log("Trạng thái chuyến đi:", data);
  // data = { scheduleId: 'sch_001', busId: 'bus_001', status: 'in_progress', ts: '...' }
});
```

### Sự kiện Socket.IO

- `join-bus-room` - Client tham gia phòng theo dõi xe bus
- `bus_position_update` - Cập nhật vị trí xe bus real-time
- `trip_status_change` - Thay đổi trạng thái chuyến đi real-time

## Ví dụ sử dụng API

### 1. Lấy danh sách xe bus

```bash
curl -X GET "http://localhost:3001/api/buses"
```

### 2. Tạo xe bus mới

```bash
curl -X POST "http://localhost:3001/api/buses" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "BUS005",
    "plate": "29E-33333",
    "capacity": 40,
    "status": "active"
  }'
```

### 3. Cập nhật vị trí xe bus (phát sự kiện real-time)

```bash
curl -X POST "http://localhost:3001/api/buses/bus_001/position" \
  -H "Content-Type: application/json" \
  -d '{
    "lat": 21.0300,
    "lng": 105.8600
  }'
```

### 4. Phân công tài xế cho xe bus

```bash
curl -X POST "http://localhost:3001/api/buses/bus_001/assign-driver" \
  -H "Content-Type: application/json" \
  -d '{
    "driverId": "drv_001"
  }'
```

## Dữ liệu mẫu

API đã được cấu hình với dữ liệu mẫu để test:

- 3 xe bus (2 active, 1 maintenance)
- 3 tài xế (2 active, 1 inactive)
- 3 lịch trình (1 đang thực hiện, 2 đã lên lịch)

## Middleware và Bảo mật

- **Helmet**: Bảo mật HTTP headers
- **CORS**: Cho phép frontend kết nối
- **Morgan**: Logging HTTP requests
- **Express.json()**: Parse JSON requests
- **Express.urlencoded()**: Parse form data

## Cấu trúc dữ liệu

### Xe Bus (Bus)

```javascript
{
  id: "bus_001",
  code: "BUS001",
  plate: "29A-12345",
  capacity: 50,
  status: "active", // active, maintenance, inactive
  driverId: "drv_001",
  lastPosition: {
    lat: 21.0285,
    lng: 105.8542,
    ts: "2024-01-15T07:30:00.000Z"
  }
}
```

### Tài Xế (Driver)

```javascript
{
  id: "drv_001",
  name: "Nguyễn Văn An",
  phone: "0901234567",
  licenseNo: "A123456789",
  status: "active" // active, inactive
}
```

### Lịch Trình (Schedule)

```javascript
{
  id: "sch_001",
  date: "2024-01-15",
  routeName: "Tuyến A - Trường Tiểu học ABC",
  busId: "bus_001",
  driverId: "drv_001",
  startTime: "07:00",
  endTime: "08:30",
  status: "scheduled" // scheduled, in_progress, completed, cancelled
}
```

## Lưu ý quan trọng

- API hiện tại sử dụng in-memory storage (dữ liệu sẽ mất khi restart server)
- Để sử dụng trong production, cần kết nối với database MySQL thực
- Socket.IO chỉ hoạt động khi có client kết nối
- Cần cấu hình CORS phù hợp với domain frontend

## Troubleshooting

1. **Port đã được sử dụng**: Thay đổi PORT trong file .env
2. **CORS errors**: Kiểm tra FRONTEND_URL trong .env
3. **Socket.IO không kết nối**: Đảm bảo frontend đang chạy và có thể truy cập backend
4. **API trả về 404**: Kiểm tra đường dẫn endpoint và method HTTP
