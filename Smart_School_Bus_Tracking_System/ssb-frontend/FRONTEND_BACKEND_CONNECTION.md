# Hướng dẫn kết nối Frontend với Backend

## Tổng quan

Frontend (Next.js) đã được cấu hình để kết nối với Backend (Express.js + Socket.IO) thông qua các API endpoints và real-time communication.

## Cấu hình

### 1. Environment Variables

Tạo file `.env.local` trong thư mục `ssb-frontend`:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001

# App Configuration
NEXT_PUBLIC_APP_NAME=Smart School Bus Tracking System
NEXT_PUBLIC_APP_VERSION=1.0.0
```

### 2. Cài đặt dependencies

```bash
cd ssb-frontend
npm install socket.io-client@^4.7.4
```

## Các file đã được tạo/cập nhật

### 1. API Client (`lib/api.ts`)

- Cung cấp các method để gọi API endpoints
- Tự động xử lý authentication token
- Hỗ trợ tất cả CRUD operations cho các entities

### 2. Socket Service (`lib/socket.ts`)

- Kết nối với Socket.IO server
- Xử lý real-time events
- Hỗ trợ bus tracking, trip updates, student status

### 3. Auth Context (`lib/auth-context.tsx`)

- Tích hợp với backend authentication
- Tự động kết nối Socket.IO khi đăng nhập
- Quản lý user session

### 4. Custom Hooks

- `hooks/use-api.ts`: Hook để gọi API với loading/error states
- `hooks/use-socket.ts`: Hook để sử dụng Socket.IO features

## Cách sử dụng

### 1. Authentication

```typescript
import { useAuth } from "@/lib/auth-context";

const { login, logout, user } = useAuth();

// Đăng nhập
await login("admin@example.com", "password123");

// Đăng xuất
logout();
```

### 2. API Calls

```typescript
import { apiClient } from "@/lib/api";

// Lấy danh sách xe buýt
const response = await apiClient.getBuses({
  page: 1,
  limit: 10,
  search: "29A",
  trangThai: "hoat_dong",
});

// Tạo xe buýt mới
const newBus = await apiClient.createBus({
  bienSoXe: "29A-12345",
  dongXe: "Hyundai County",
  sucChua: 29,
});
```

### 3. Real-time Tracking

```typescript
import { useBusTracking } from "@/hooks/use-socket";

const { busLocation, updateBusLocation } = useBusTracking(busId);

// Cập nhật vị trí xe buýt
updateBusLocation({
  latitude: 10.7409,
  longitude: 106.7208,
  speed: 50,
  direction: 180,
});
```

### 4. Pagination

```typescript
import { usePaginatedApi } from "@/hooks/use-api";

const {
  data: buses,
  pagination,
  loading,
  goToPage,
  updateFilters,
} = usePaginatedApi(
  (page, limit, filters) => apiClient.getBuses({ page, limit, ...filters }),
  1, // initial page
  10, // initial limit
  {} // initial filters
);
```

## Các endpoint đã được implement

### Authentication

- `POST /auth/login` - Đăng nhập
- `POST /auth/register` - Đăng ký

### Bus Management

- `GET /buses` - Lấy danh sách xe buýt
- `GET /buses/:id` - Lấy thông tin xe buýt
- `POST /buses` - Tạo xe buýt mới
- `PUT /buses/:id` - Cập nhật xe buýt
- `DELETE /buses/:id` - Xóa xe buýt
- `POST /buses/:id/position` - Cập nhật vị trí
- `PUT /buses/:id/status` - Cập nhật trạng thái
- `GET /buses/stats` - Thống kê xe buýt

### Driver Management

- `GET /drivers` - Lấy danh sách tài xế
- `GET /drivers/:id` - Lấy thông tin tài xế
- `POST /drivers` - Tạo tài xế mới
- `PUT /drivers/:id` - Cập nhật tài xế
- `DELETE /drivers/:id` - Xóa tài xế

### Student Management

- `GET /students` - Lấy danh sách học sinh
- `GET /students/:id` - Lấy thông tin học sinh
- `POST /students` - Tạo học sinh mới
- `PUT /students/:id` - Cập nhật học sinh
- `DELETE /students/:id` - Xóa học sinh

### Route Management

- `GET /routes` - Lấy danh sách tuyến đường
- `GET /routes/:id` - Lấy thông tin tuyến đường
- `POST /routes` - Tạo tuyến đường mới
- `PUT /routes/:id` - Cập nhật tuyến đường
- `DELETE /routes/:id` - Xóa tuyến đường

### Schedule Management

- `GET /schedules` - Lấy danh sách lịch trình
- `POST /schedules` - Tạo lịch trình mới
- `PUT /schedules/:id` - Cập nhật lịch trình
- `DELETE /schedules/:id` - Xóa lịch trình

### Trip Management

- `GET /trips` - Lấy danh sách chuyến đi
- `GET /trips/:id` - Lấy thông tin chuyến đi
- `POST /trips` - Tạo chuyến đi mới
- `PUT /trips/:id/status` - Cập nhật trạng thái chuyến đi

### Health Check

- `GET /health` - Kiểm tra tình trạng hệ thống
- `GET /health/detailed` - Kiểm tra chi tiết
- `GET /health/history` - Lịch sử health check

## Socket.IO Events

### Client to Server

- `update_bus_location` - Cập nhật vị trí xe buýt
- `join_bus_tracking` - Tham gia theo dõi xe buýt
- `leave_bus_tracking` - Rời khỏi theo dõi xe buýt
- `update_trip_status` - Cập nhật trạng thái chuyến đi
- `update_student_status` - Cập nhật trạng thái học sinh

### Server to Client

- `bus_location_update` - Cập nhật vị trí xe buýt
- `trip_status_update` - Cập nhật trạng thái chuyến đi
- `student_status_update` - Cập nhật trạng thái học sinh
- `admin_notification` - Thông báo cho admin
- `parent_notification` - Thông báo cho phụ huynh

## Chạy ứng dụng

### 1. Backend

```bash
cd ssb-backend
npm install
npm run init-db  # Khởi tạo database
npm run dev      # Chạy server
```

### 2. Frontend

```bash
cd ssb-frontend
npm install
npm run dev      # Chạy frontend
```

### 3. Truy cập

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api
- Health Check: http://localhost:3001/health

## Demo Credentials

- **Admin**: admin@school.edu.vn / admin123
- **Driver**: driver@school.edu.vn / driver123
- **Parent**: parent@school.edu.vn / parent123

## Troubleshooting

### 1. CORS Issues

Đảm bảo backend đã cấu hình CORS cho frontend URL.

### 2. Socket.IO Connection Issues

Kiểm tra:

- Backend server đang chạy
- Socket.IO server đã được khởi tạo
- Token authentication hoạt động

### 3. API Connection Issues

Kiểm tra:

- Environment variables đã được cấu hình
- Backend API endpoints đang hoạt động
- Database connection

### 4. Authentication Issues

Kiểm tra:

- JWT secret đã được cấu hình
- Token được gửi đúng trong headers
- User data được lưu trữ đúng

