# Smart School Bus Tracking System - Backend API

## 🚌 Tổng quan

Backend API cho hệ thống theo dõi xe buýt trường học thông minh, sử dụng Node.js + Express.js + MySQL + Firebase + Socket.IO.

## 🛠️ Công nghệ sử dụng

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MySQL** - Database chính
- **Firebase Realtime Database** - Lưu trữ dữ liệu GPS realtime
- **Socket.IO** - WebSocket cho tracking realtime
- **JWT** - Xác thực và phân quyền
- **CORS** - Cross-origin resource sharing

## 📁 Cấu trúc thư mục

```
ssb-backend/
├── docs/                # 📚 Documentation
│   ├── DAY2_COMPLETE_GUIDE.md  # Hướng dẫn đầy đủ Day 2 (Routes, Controller, Service)
│   ├── API_Design.md           # Thiết kế API
│   └── postman_collection.json # Postman test collection
├── src/
│   ├── config/          # Cấu hình hệ thống
│   ├── controllers/     # Logic xử lý API
│   ├── models/          # Mô hình dữ liệu MySQL
│   ├── routes/          # Định nghĩa endpoints
│   ├── middlewares/     # Middleware xử lý
│   ├── services/        # Business logic layer (NEW Day 2)
│   ├── scripts/         # 🛠️ Test & utility scripts
│   │   ├── README.md           # Hướng dẫn scripts
│   │   ├── test_db.js          # Test DB connection
│   │   ├── check_db.js         # Debug DB data
│   │   └── reset_trip.js       # Reset trip for testing
│   ├── utils/           # Hàm tiện ích
│   ├── test/            # Unit tests
│   ├── app.js           # Khởi tạo Express app
│   └── server.js        # Entry point + Socket.IO
├── sql/                 # SQL scripts
│   ├── init_db.sql             # Database schema
│   └── insert_sample_data.sql  # Sample data
├── .env                 # Biến môi trường
├── package.json         # Dependencies
├── TEST_SCENARIOS.md    # 🧪 Test cases cho Start Trip API
├── FILE_REORGANIZATION_SUMMARY.md  # Tóm tắt tổng hợp files
└── README.md            # Tài liệu này
```

## 🚀 Cài đặt và chạy

### 1. Cài đặt dependencies

```bash
npm install
```

### 2. Cấu hình biến môi trường

Copy file `src/config/env.example` thành `.env` và cập nhật các giá trị:

```bash
cp src/config/env.example .env
```

**Quan trọng:** Cập nhật các giá trị sau trong `.env`:
- `MAPS_API_KEY`: Google Maps API key (bắt buộc cho Maps API endpoints)
- `REDIS_URL`: Redis connection URL (mặc định: `redis://localhost:6379`)
- `CACHE_DRIVER`: Cache driver (`redis` hoặc `memory`, mặc định: `memory`)

### 3. Setup Redis (Khuyến nghị)

**Windows:**
```bash
# Download Redis từ https://redis.io/download
# Hoặc dùng Docker:
docker run -d -p 6379:6379 redis:7-alpine
```

**macOS:**
```bash
brew install redis
brew services start redis
```

**Linux:**
```bash
sudo apt-get install redis-server
sudo systemctl start redis
```

**Hoặc dùng Docker Compose:**
```bash
docker-compose -f docker-compose.dev.yml up redis -d
```

### 4. Khởi tạo database

```bash
# Tạo database MySQL
mysql -u root -p
CREATE DATABASE school_bus_system;

# Import database schema và sample data (ver2)
mysql -u root -p school_bus_system < ../database/01_init_db_ver2.sql
mysql -u root -p school_bus_system < ../database/02_sample_data.sql

# Hoặc dùng npm scripts
npm run db:init
npm run db:seed
```

### 5. Chạy server

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

### 6. Rebuild Polylines (Optional)

Sau khi có routes và stops, rebuild polylines cho routes:

```bash
# Rebuild tất cả routes
npm run rebuild:polyline

# Rebuild route cụ thể
npm run rebuild:polyline 1
```

### 7. Export Postman Collection

```bash
npm run export-postman
```

Collection sẽ được lưu tại `docs/postman_collection.json`

### 5. Test API
```bash
# Health check
curl http://localhost:4000/api/v1/health

# Login test
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"quantri@schoolbus.vn","password":"password"}'
```

## 📡 API Endpoints

### OpenAPI Documentation

API documentation được tạo bằng OpenAPI 3.0 và có sẵn tại:
- **File:** `docs/openapi.yaml`
- **View online:** Copy nội dung vào https://editor.swagger.io để xem
- **Postman Collection:** `docs/postman_collection.json` (export từ OpenAPI)

**Cách sử dụng:**
1. Mở `docs/openapi.yaml` trong Swagger Editor (https://editor.swagger.io)
2. Import Postman collection: File → Import → Chọn `docs/postman_collection.json`
3. Set environment variables trong Postman:
   - `baseUrl`: `http://localhost:4000/api/v1`
   - `token`: JWT token (lấy từ login endpoint)

### Routes Endpoints

- `GET /api/v1/routes` - List routes
- `GET /api/v1/routes/:id` - Get route with stops (RouteDetail)
- `POST /api/v1/routes` - Create route
- `PUT /api/v1/routes/:id` - Update route
- `DELETE /api/v1/routes/:id` - Delete route
- `GET /api/v1/routes/:id/stops` - Get route stops
- `POST /api/v1/routes/:id/stops` - Add stop to route
- `PATCH /api/v1/routes/:id/stops/reorder` - Reorder stops
- `DELETE /api/v1/routes/:id/stops/:stopId` - Remove stop from route
- `POST /api/v1/routes/:id/rebuild-polyline` - Rebuild polyline

### Stops Endpoints

- `GET /api/v1/stops` - List stops
- `GET /api/v1/stops/:id` - Get stop
- `POST /api/v1/stops` - Create stop
- `PUT /api/v1/stops/:id` - Update stop
- `DELETE /api/v1/stops/:id` - Delete stop

### Maps API Endpoints

- `POST /api/v1/maps/directions` - Get directions
- `POST /api/v1/maps/distance-matrix` - Get distance matrix
- `POST /api/v1/maps/geocode` - Geocode address
- `POST /api/v1/maps/reverse-geocode` - Reverse geocode
- `POST /api/v1/maps/roads/snap` - Snap to roads

**Lưu ý:** Maps API endpoints có rate limiting và caching. Response có field `cached: true|false` để biết dữ liệu từ cache hay API.

## 📡 API Endpoints (Legacy)

### Authentication

- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/forgot-password` - Quên mật khẩu

### Admin

- `GET /api/admin/dashboard` - Dashboard admin
- `GET /api/admin/buses` - Danh sách xe buýt
- `POST /api/admin/buses` - Thêm xe buýt mới
- `GET /api/admin/drivers` - Danh sách tài xế
- `GET /api/admin/students` - Danh sách học sinh
- `GET /api/admin/routes` - Danh sách tuyến đường

### Driver

- `GET /api/driver/schedule` - Lịch trình tài xế
- `POST /api/driver/start-trip` - Bắt đầu chuyến
- `POST /api/driver/end-trip` - Kết thúc chuyến
- `POST /api/driver/report-incident` - Báo cáo sự cố

### Parent

- `GET /api/parent/children` - Danh sách con
- `GET /api/parent/tracking/:busId` - Theo dõi xe buýt
- `GET /api/parent/notifications` - Thông báo

### Tracking

- `GET /api/tracking/live/:busId` - Vị trí realtime
- `POST /api/tracking/update` - Cập nhật vị trí
- `GET /api/tracking/history/:busId` - Lịch sử di chuyển

## 🔌 Socket.IO Events

### Client → Server

- `join-bus-tracking` - Tham gia theo dõi xe buýt
- `leave-bus-tracking` - Rời khỏi theo dõi xe buýt

### Server → Client

- `location-update` - Cập nhật vị trí xe buýt
- `incident-alert` - Cảnh báo sự cố
- `trip-status` - Trạng thái chuyến đi

## 🔐 Xác thực

API sử dụng JWT token để xác thực. Gửi token trong header:

```
Authorization: Bearer <your_jwt_token>
```

## 📊 Database Schema

Database schema đã được chuẩn hóa (ver2):
- **NguoiDung** - Người dùng (admin, driver, parent)
- **TaiXe** - Tài xế
- **XeBuyt** - Xe buýt
- **HocSinh** - Học sinh
- **TuyenDuong** - Tuyến đường (có origin/dest/polyline)
- **DiemDung** - Điểm dừng (độc lập, không có maTuyen/thuTu)
- **route_stops** - Junction table cho route-stop relationships
- **LichTrinh** - Lịch trình
- **ChuyenDi** - Chuyến đi
- **TrangThaiHocSinh** - Trạng thái học sinh trong chuyến
- **ThongBao** - Thông báo
- **SuCo** - Sự cố

**Schema files:**
- `database/01_init_db_ver2.sql` - Database schema (ver2)
- `database/02_sample_data.sql` - Sample data (ver2)

## 📈 Development Progress

### ✅ Day 1 - Setup & Authentication (COMPLETED)

- ✅ Project structure setup
- ✅ MySQL database connection
- ✅ JWT authentication
- ✅ User login/register APIs
- ✅ Basic middleware (auth, error handling)

### ✅ Day 2 - Trip Lifecycle Start API (COMPLETED)

**Endpoint:** `POST /api/v1/trips/:id/start`

**Implemented:**

- ✅ Route: `src/routes/api/trip.js`
- ✅ Controller: `src/controllers/tripController.js`
- ✅ Service: `src/services/tripService.js` (NEW - Business logic layer)
- ✅ Model: Dynamic UPDATE in `ChuyenDiModel.js`
- ✅ Authentication: JWT middleware
- ✅ Test scenarios: 7 test cases (see `TEST_SCENARIOS.md`)

**Bug Fixes:**

- ✅ Foreign key constraint error → Dynamic UPDATE
- ✅ `gioBatDauThucTe` always NULL → Use ISO timestamp for TIMESTAMP column

**Documentation:**

- 📚 `docs/DAY2_COMPLETE_GUIDE.md` - Full guide (routes, controller, service, testing, bug fixes)
- 🧪 `TEST_SCENARIOS.md` - All test cases
- 🛠️ `src/scripts/` - Test utilities (reset_trip.js, check_db.js, test_db.js)

**Test Command:**

```bash
# Test DB connection
node src/scripts/test_db.js

# Reset trip for testing
node src/scripts/reset_trip.js

# Debug DB data
node src/scripts/check_db.js
```

### ✅ Day 3 - Backend v1.1 Refactor (COMPLETED)

**Refactored:**
- ✅ Normalized stops and route_stops junction table
- ✅ Created RouteStopModel for route-stop relationships
- ✅ Refactored RouteService and RouteController
- ✅ Created StopService and StopController (independent stops)
- ✅ Created MapsService with Redis caching and memory fallback
- ✅ Created MapsController for Google Maps API proxy
- ✅ Added rate limiting for Maps API endpoints
- ✅ Created OpenAPI specification v1.1
- ✅ Created Postman collection export script
- ✅ Added integration tests
- ✅ Created CI/CD workflow
- ✅ Created Docker Compose setup

**New Features:**
- ✅ Cache provider abstraction (Redis + Memory fallback)
- ✅ Rate limiting middleware for Maps API
- ✅ Rebuild polyline script
- ✅ OpenAPI documentation
- ✅ Postman collection export

### ✅ M0 - Auth & Guard (COMPLETED)

**Implemented:**
- ✅ JWT Access + Refresh tokens
- ✅ RBAC middleware (admin, driver, parent)
- ✅ Response envelope chuẩn hóa
- ✅ Socket.IO JWT handshake
- ✅ Frontend auth flow & route guards
- ✅ OpenAPI + Postman cho M0

**Documentation:**
- 📚 `docs/reports/M0_survey.md`
- 📚 `docs/reports/M0_status.md`
- 📚 `docs/reports/M0_done.md`

### ✅ M1-M3 - CRUD & Scheduler (COMPLETED)

**M1 - User/Asset CRUD:**
- ✅ Buses: Full CRUD với pagination/search/sort
- ✅ Drivers: Full CRUD với pagination/search/sort
- ✅ Students: Full CRUD với pagination/search/sort

**M2 - Routes & Stops:**
- ✅ Routes: Full CRUD với pagination/search/sort
- ✅ Stops: Full CRUD với pagination/search/sort
- ✅ Stops Reorder: `PATCH /routes/:id/stops/reorder` (atomic transaction)

**M3 - Scheduler:**
- ✅ Schedules: Full CRUD với pagination/search/sort/filters
- ✅ Conflict Detection: 409 với chi tiết (bus/driver/schedule/time/date)
- ✅ Database Indexes: Migration script cho performance

**Features:**
- ✅ Response envelope chuẩn: `{ success, data, meta }`
- ✅ Pagination meta: `{ page, pageSize, total, sortBy, sortOrder, q }`
- ✅ Query params: `page`, `pageSize`, `q`, `sortBy`, `sortOrder` (asc/desc)
- ✅ Frontend conflict UI: Banner hiển thị chi tiết conflict
- ✅ E2E test script: `scripts/test_crud_scheduler.js`

**Documentation:**
- 📚 `docs/reports/M1-M3_survey.md`
- 📚 `docs/reports/M1-M3_progress.md`
- 📚 `docs/reports/M1-M3_done.md`
- 📚 `database/04_add_m1m3_indexes.sql`

**Test:**
```bash
# Run E2E test
node scripts/test_crud_scheduler.js

# Apply database indexes
mysql -u root -p school_bus_system < ../database/04_add_m1m3_indexes.sql
```

### ✅ M4-M6 - Trip Lifecycle & Realtime (COMPLETED)

**M4 - Trip Lifecycle:**
- ✅ Trip CRUD: Create/Start/End/Cancel với status management
- ✅ WS Events: `trip_created`, `trip_started`, `trip_completed`, `trip_cancelled`

**M5 - Realtime GPS & Geofence:**
- ✅ GPS Ingest: `gps:update` handler với throttle (≥2s)
- ✅ Broadcast: `bus_position_update` đến `trip-{tripId}`, `bus-{busId}`, `role-quan_tri`
- ✅ Geofence: `approach_stop` event khi ≤60m (configurable)
- ✅ Delay Alert: `delay_alert` event khi trễ ≥5 phút (configurable)

**M6 - Attendance:**
- ✅ Check-in/Check-out API: `POST /trips/:id/students/:studentId/checkin|checkout`
- ✅ WS Event: `pickup_status_update` với status `onboard|dropped`

**Documentation:**
- 📚 `docs/reports/M4-M6_survey.md`
- 📚 `docs/reports/M4-M6_done.md`

**Test:**
```bash
# GPS Simulator
node scripts/ws_gps_simulator.js <tripId>

# E2E Realtime Trip Test
node scripts/test_realtime_trip.js
```

### ✅ M7 - Reporting & Analytics (COMPLETED)

**Stats Endpoints:**
- ✅ `GET /api/stats/overview` - Overall statistics với filters
- ✅ `GET /api/stats/trips-by-day` - Daily trip statistics
- ✅ `GET /api/stats/driver-performance` - Driver performance metrics
- ✅ `GET /api/stats/bus-utilization` - Bus utilization (Admin only)
- ✅ `GET /api/stats/route-punctuality` - Route punctuality (Admin only)

**Features:**
- ✅ Filters: `from`, `to`, `routeId`, `driverId`, `busId`
- ✅ RBAC: Admin full access; Driver chỉ xem bản thân; Parent 403
- ✅ Percentiles: P50, P95 cho delay statistics
- ✅ Frontend Dashboard: `/admin/dashboard` với KPIs + charts + filters

**Documentation:**
- 📚 `docs/reports/M7-M8_survey.md`
- 📚 `docs/reports/M7-M8_done.md`

**Test:**
```bash
# E2E Stats & Settings Test
node scripts/test_stats_settings.js
```

### ✅ M8 - Admin Settings & Hardening (COMPLETED)

**Settings Endpoints:**
- ✅ `GET /api/settings` - Get system settings (Admin only)
- ✅ `PUT /api/settings` - Update settings với validation (Admin only)

**Settings:**
- ✅ `geofenceRadiusMeters` (20-200m, default 60m)
- ✅ `delayThresholdMinutes` (1-30min, default 5min)
- ✅ `realtimeThrottleSeconds` (≥1s, default 2s)
- ✅ `mapsProvider` ("google" | "osm", default "google")

**Hardening:**
- ✅ Structured logging với requestId
- ✅ Error handler: ẩn stack ở production
- ✅ Rate-limit cho `/trips` POST (burst protection)
- ✅ CORS chỉ FE_ORIGIN
- ✅ Helmet security headers

**Frontend:**
- ✅ Settings page: `/admin/settings` với form + validation
- ✅ Runtime apply: Settings áp dụng ngay cho geofence/delay/throttle

**Documentation:**
- 📚 `docs/reports/M7-M8_survey.md`
- 📚 `docs/reports/M7-M8_done.md`

### 🔜 Day 4 - Socket.IO Realtime (TODO)

- [ ] WebSocket authentication (✅ Done in M0)
- [ ] Emit `trip_started` event
- [ ] Realtime GPS tracking
- [ ] Room management (bus rooms)

---

## 🧪 Testing

### Postman Collection
1. Export Postman collection từ OpenAPI:
   ```bash
   npm run export-postman
   ```
2. Import file `docs/postman_collection.json` vào Postman
3. Set environment variables:
   - `baseUrl`: `http://localhost:4000/api/v1`
   - `token`: JWT token (lấy từ login endpoint)
4. Test các endpoints theo OpenAPI spec

### Unit Tests
```bash
# Chạy tất cả tests
npm test

# Chạy tests với coverage
npm run test:coverage
```

### Integration Tests
Tests được viết bằng Jest và Supertest:
- `tests/routes.test.js` - Tests cho routes endpoints
- Tests verify: route stops ordering, reorder functionality, polyline rebuilding, caching

### Manual Testing
1. Start server: `npm run dev`
2. Test với Postman collection
3. Verify caching: Gọi cùng endpoint 2 lần, lần 2 phải có `cached: true`
4. Verify rate limiting: Spam endpoint, phải nhận 429

### Manual Testing
```bash
# Test login endpoint
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"quantri@schoolbus.vn","password":"password"}'

# Test buses endpoint (cần token)
curl -X GET http://localhost:4000/api/v1/buses \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 📝 Logs

Logs được lưu trong thư mục `logs/` với format:

- `access.log` - HTTP requests
- `error.log` - Lỗi hệ thống
- `tracking.log` - GPS tracking data

## 🚨 Monitoring

- Health check: `GET /health`
- Metrics: `GET /metrics`
- Status: `GET /status`

## 🤝 Contributing

1. Fork repository
2. Tạo feature branch
3. Commit changes
4. Push to branch
5. Tạo Pull Request

## 📄 License

MIT License - Xem file LICENSE để biết thêm chi tiết.
